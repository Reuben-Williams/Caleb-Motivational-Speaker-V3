import { createInquiryWorkerHandler } from "@/lib/inquiries/worker-route-handler";
import { createRetentionRuntime } from "@/lib/privacy/retention-runtime";

export const runtime = "nodejs";

export const POST = createInquiryWorkerHandler({
  method: "POST",
  secret: () => process.env.INQUIRY_RETENTION_WORKER_SECRET,
  resolveWorker: () => createRetentionRuntime(process.env),
});
