import { after } from "next/server";

import { createInquiryOutboxRuntime } from "@/lib/inquiries/outbox-runtime";
import { createInquiryPostHandler } from "@/lib/inquiries/route-handler";
import {
  createInquiryRuntime,
  trustedClientIpFromRequest,
} from "@/lib/inquiries/runtime";

export const runtime = "nodejs";

export const POST = createInquiryPostHandler({
  resolveRuntime: () => createInquiryRuntime(process.env),
  getTrustedClientIp: (request) =>
    trustedClientIpFromRequest(
      request,
      process.env.TRUSTED_CLIENT_IP_HEADER,
    ),
  onAccepted: () => {
    after(async () => {
      const worker = createInquiryOutboxRuntime(process.env);
      if (worker) await worker.run();
    });
  },
});
