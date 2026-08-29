import { createInquiryOutboxRuntime } from "@/lib/inquiries/outbox-runtime";
import { createInquiryWorkerHandler } from "@/lib/inquiries/worker-route-handler";

export const runtime = "nodejs";

export const GET = createInquiryWorkerHandler({
  method: "GET",
  secret: () => process.env.CRON_SECRET,
  resolveWorker: () => createInquiryOutboxRuntime(process.env),
});
