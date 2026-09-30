import { beforeEach, describe, expect, it } from "vitest";
import { requestContext, call } from "./helpers";
import { authService } from "@/server/services/auth.service";
import { rotateSession } from "@/server/auth/session";
import { verifyAccessToken, signAccessToken } from "@/server/auth/tokens";
import { registerSchema } from "@/lib/validation/auth";
import { Session, User } from "@/server/models";
import { POST as registerRoute } from "@/app/api/v1/auth/register/route";
import { POST as loginRoute } from "@/app/api/v1/auth/login/route";
import { GET as meRoute } from "@/app/api/v1/auth/me/route";

const base = { name: "Asha Rao", email: "asha@example.com", password: "lovely123", accountType: "CUSTOMER" as const };

beforeEach(() => requestContext.reset());

describe("registration & login", () => {
  it("registers a customer with a hashed password and issues a session", async () => {
    const { user, tokens } = await authService.register(base);
    expect(user.role).toBe("CUSTOMER");
    const stored = await User.findById(user.id).select("+passwordHash").lean();
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored?.passwordHash).not.toContain(base.password);
    const claims = await verifyAccessToken(tokens.accessToken);
    expect(claims?.sub).toBe(user.id);
    expect(await Session.countDocuments({ userId: user.id })).toBe(1);
  });

  it("rejects duplicate emails", async () => {
    await authService.register(base);
    await expect(authService.register(base)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("does not allow self-registration as ADMIN", () => {
    expect(registerSchema.safeParse({ ...base, accountType: "ADMIN" }).success).toBe(false);
  });

  it("rejects a wrong password with a generic message", async () => {
    await authService.register(base);
    await expect(authService.login({ email: base.email, password: "wrong-pass1" })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Incorrect email or password",
    });
    await expect(authService.login({ email: "nobody@example.com", password: "wrong-pass1" })).rejects.toMatchObject({
      message: "Incorrect email or password",
    });
  });

  it("blocks suspended accounts", async () => {
    const { user } = await authService.register(base);
    await User.updateOne({ _id: user.id }, { status: "SUSPENDED" });
    await expect(authService.login({ email: base.email, password: base.password })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("tokens & sessions", () => {
  it("rejects tampered or foreign tokens", async () => {
    const good = await signAccessToken({ sub: "a".repeat(24), role: "CUSTOMER", sid: "b".repeat(24), name: "x" });
    expect(await verifyAccessToken(good)).not.toBeNull();
    expect(await verifyAccessToken(good.slice(0, -2) + "xx")).toBeNull();
    expect(await verifyAccessToken("not-a-jwt")).toBeNull();
  });

  it("rotates refresh tokens and detects reuse", async () => {
    const { user, tokens } = await authService.register(base);
    const rotated = await rotateSession(tokens.refreshToken);
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);
    // Re-using the old token revokes every session for the user.
    await expect(rotateSession(tokens.refreshToken)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(rotateSession(rotated.refreshToken)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(await Session.countDocuments({ userId: user.id, revokedAt: null })).toBe(0);
  });
});

describe("auth HTTP endpoints", () => {
  it("validates input and returns field errors", async () => {
    const res = await call(registerRoute, { body: { name: "A", email: "bad", password: "short" } });
    expect(res.status).toBe(422);
    expect(Object.keys(res.error!.details)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("strips Mongo operator injection from bodies", async () => {
    await authService.register(base);
    const res = await call(loginRoute, { body: { email: base.email, password: { $ne: "" } } });
    expect(res.status).toBe(422);
  });

  it("sets httpOnly cookies for web and never returns tokens in the body", async () => {
    const res = await call(registerRoute, { body: { ...base, email: "web@example.com" } });
    expect(res.status).toBe(201);
    expect(res.data.accessToken).toBeUndefined();
    expect(requestContext.cookieJar.get("rivya_at")).toBeTruthy();
    expect(requestContext.cookieJar.get("rivya_rt")).toBeTruthy();
  });

  it("returns the current user for a valid bearer token and null after revocation", async () => {
    const { tokens } = await authService.register(base);
    const me = await call(meRoute, { token: tokens.accessToken });
    expect(me.data.user.email).toBe(base.email);
    expect(me.data.user.sessionId).toBeUndefined();

    await Session.updateMany({}, { revokedAt: new Date() });
    const after = await call(meRoute, { token: tokens.accessToken });
    expect(after.data.user).toBeNull();
  });
});
