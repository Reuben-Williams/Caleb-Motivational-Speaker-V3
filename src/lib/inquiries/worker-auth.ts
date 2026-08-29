import { timingSafeEqual } from "node:crypto";

export function isAuthorizedWorkerRequest(
  request: Request,
  configuredSecret: string | undefined,
): boolean {
  const secret = configuredSecret?.trim() ?? "";
  if (secret.length < 24) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const actualBytes = Buffer.from(authorization);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}
