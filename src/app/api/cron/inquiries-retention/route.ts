import { createInquiryWorkerHandler } from "@/lib/inquiries/worker-route-handler";
import { createRetentionRuntime } from "@/lib/privacy/retention-runtime";

export const runtime = "nodejs";

export const GET = createInquiryWorkerHandler({
  method: "GET",
  secret: () => process.env.CRON_SECRET,
  resolveWorker: () => createRetentionRuntime(process.env),
});
