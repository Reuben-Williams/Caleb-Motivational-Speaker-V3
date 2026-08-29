import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { staffCsrfCookieOptions } from "@/lib/staff/csrf-cookie";

export const runtime = "nodejs";

export async function GET() {
  const store = await cookies();
  const token = randomBytes(24).toString("base64url");
  store.set("builder_csrf", token, staffCsrfCookieOptions);
  return Response.json(
    { token },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
