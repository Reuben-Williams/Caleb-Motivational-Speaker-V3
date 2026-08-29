import { createInquiryOutboxRuntime } from "@/lib/inquiries/outbox-runtime";
import { createInquiryWorkerHandler } from "@/lib/inquiries/worker-route-handler";

export const runtime = "nodejs";

export const POST = createInquiryWorkerHandler({
  method: "POST",
  secret: () => process.env.INQUIRY_OUTBOX_WORKER_SECRET,
  resolveWorker: () => createInquiryOutboxRuntime(process.env),
});
