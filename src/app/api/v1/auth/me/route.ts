import { api } from "@/server/http/handler";

export const GET = api({ auth: "optional" }, async ({ user }) => {
  if (!user) return { user: null };
  const { id, name, email, phone, role, avatarUrl } = user;
  return { user: { id, name, email, phone, role, avatarUrl } };
});
