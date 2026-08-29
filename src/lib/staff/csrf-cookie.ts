export const staffCsrfCookieOptions = {
  httpOnly: false,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
};
