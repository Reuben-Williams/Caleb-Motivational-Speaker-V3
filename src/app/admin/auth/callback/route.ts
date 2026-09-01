import { randomBytes } from "node:crypto";

import { createBuilderServerClient } from "@reuben-williams/next/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { staffCsrfCookieOptions } from "@/lib/staff/csrf-cookie";
import { resolveStaffEditorReturnPath } from "@/lib/staff/editor-paths";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const destination = resolveStaffEditorReturnPath(
    url.searchParams.get("next"),
  );
  const authUrl = process.env.STAFF_AUTH_URL;
  const publishableKey = process.env.STAFF_AUTH_PUBLISHABLE_KEY;
  if (!code || !authUrl || !publishableKey) {
    return NextResponse.redirect(new URL("/admin/login", url.origin));
  }
  const store = await cookies();
  const client = createBuilderServerClient({
    url: authUrl,
    publishableKey,
    cookies: nextCookieAdapter(store),
  });
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/admin/login", url.origin));
  store.set(
    "builder_csrf",
    randomBytes(24).toString("base64url"),
    staffCsrfCookieOptions,
  );
  return NextResponse.redirect(new URL(destination, url.origin));
}
