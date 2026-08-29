import { describe, expect, it } from "vitest";

import { staffCsrfCookieOptions } from "@/lib/staff/csrf-cookie";

describe("staff CSRF cookie", () => {
  it("is visible to the admin page and its protected API routes", () => {
    expect(staffCsrfCookieOptions).toMatchObject({
      httpOnly: false,
      secure: true,
      path: "/",
    });
  });
});
