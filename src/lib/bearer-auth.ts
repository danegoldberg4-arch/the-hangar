import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidBearerToken(
  request: Pick<Request, "headers">,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) return false;

  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${expectedToken}`;
  const suppliedDigest = createHash("sha256").update(supplied).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  return timingSafeEqual(suppliedDigest, expectedDigest);
}
