import "server-only";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";
import { User } from "@/server/models";
import { OtpCode } from "@/server/models/session";
import { errors } from "@/server/http/errors";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { issueSession } from "@/server/auth/session";
import { sha256 } from "@/server/auth/tokens";
import { generateOtpCode, getOtpSender } from "@/server/auth/otp";
import type { GoogleProfile } from "@/server/auth/google";

type Meta = { userAgent?: string | null; ip?: string | null };

export function toPublicUser(u: {
  _id: unknown;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
}) {
  return { id: String(u._id), name: u.name, email: u.email ?? null, phone: u.phone ?? null, role: u.role, avatarUrl: u.avatarUrl ?? null };
}
export type PublicUser = ReturnType<typeof toPublicUser>;

export const authService = {
  async register(input: RegisterInput, meta: Meta = {}) {
    const exists = await User.exists({ email: input.email });
    if (exists) throw errors.conflict("An account with this email already exists");
    if (input.phone && (await User.exists({ phone: input.phone }))) {
      throw errors.conflict("An account with this phone number already exists");
    }
    const user = await User.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: input.accountType,
      lastLoginAt: new Date(),
    });
    const tokens = await issueSession(user, meta);
    return { user: toPublicUser(user), tokens };
  },

  async login(input: LoginInput, meta: Meta = {}) {
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    // Always run a hash verification so response time doesn't reveal whether the email exists.
    const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), input.password);
    if (!user || !user.passwordHash || !valid) throw errors.unauthenticated("Incorrect email or password");
    if (user.status !== "ACTIVE") throw errors.forbidden("This account is not active. Contact support.");
    user.lastLoginAt = new Date();
    await user.save();
    const tokens = await issueSession(user, meta);
    return { user: toPublicUser(user), tokens };
  },

  /** Link by googleId, else by verified email, else create a new customer. */
  async loginWithGoogle(profile: GoogleProfile, meta: Meta = {}) {
    let user = await User.findOne({ googleId: profile.googleId });
    if (!user && profile.email && profile.emailVerified) {
      user = await User.findOne({ email: profile.email });
      if (user) {
        user.googleId = profile.googleId;
        user.emailVerifiedAt ??= new Date();
      }
    }
    if (!user) {
      if (!profile.email || !profile.emailVerified) throw errors.badRequest("Google account has no verified email");
      user = new User({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        avatarUrl: profile.picture,
        emailVerifiedAt: new Date(),
        role: "CUSTOMER",
      });
    }
    if (user.status !== "ACTIVE") throw errors.forbidden("This account is not active. Contact support.");
    user.lastLoginAt = new Date();
    await user.save();
    const tokens = await issueSession(user, meta);
    return { user: toPublicUser(user), tokens };
  },

  async requestOtp(phone: string) {
    const sender = getOtpSender();
    if (!sender) throw errors.notConfigured("Phone login", ["SMS provider (see server/auth/otp.ts)"]);
    const recent = await OtpCode.countDocuments({ phone, createdAt: { $gt: new Date(Date.now() - 10 * 60_000) } });
    if (recent >= 5) throw errors.rateLimited("Too many codes requested. Try again in a few minutes.");
    const code = generateOtpCode();
    await OtpCode.create({ phone, codeHash: await sha256(`${phone}:${code}`), expiresAt: new Date(Date.now() + 5 * 60_000) });
    await sender.send(phone, code);
    return { sent: true, expiresInSeconds: 300 };
  },

  async verifyOtp(input: { phone: string; code: string; name?: string }, meta: Meta = {}) {
    const record = await OtpCode.findOne({ phone: input.phone, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!record || record.attempts >= 5) throw errors.unauthenticated("Code expired. Request a new one.");
    if (record.codeHash !== (await sha256(`${input.phone}:${input.code}`))) {
      await OtpCode.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      throw errors.unauthenticated("Incorrect code");
    }
    await OtpCode.deleteMany({ phone: input.phone });

    let user = await User.findOne({ phone: input.phone });
    if (!user) {
      user = await User.create({ name: input.name ?? "Rivya member", phone: input.phone, phoneVerifiedAt: new Date(), role: "CUSTOMER" });
    } else {
      user.phoneVerifiedAt ??= new Date();
    }
    if (user.status !== "ACTIVE") throw errors.forbidden("This account is not active. Contact support.");
    user.lastLoginAt = new Date();
    await user.save();
    const tokens = await issueSession(user, meta);
    return { user: toPublicUser(user), tokens };
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw errors.notFound("User");
    if (user.passwordHash && !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw errors.validation({ currentPassword: ["Current password is incorrect"] });
    }
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
  },
};
