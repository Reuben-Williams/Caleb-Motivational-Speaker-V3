import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const store = await cookies();
  const token = randomBytes(24).toString("base64url");
  store.set("builder_csrf", token, {
    httpOnly: false,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
  return Response.json(
    { token },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
