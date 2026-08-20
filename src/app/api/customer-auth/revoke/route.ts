import { customerAccessError, readCustomerSessionToken } from "@/lib/platform/customer-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!readCustomerSessionToken(request.headers.get("cookie"))) {
    return customerAccessError(401, "CUSTOMER_AUTH_REQUIRED");
  }
  return customerAccessError(503, "CUSTOMER_ACCESS_NOT_READY");
}
