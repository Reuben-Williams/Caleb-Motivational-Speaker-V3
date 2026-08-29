import { isAuthorizedWorkerRequest } from "@/lib/inquiries/worker-auth";

type WorkerSummary = Readonly<{
  claimed: number;
  delivered: number;
  failedRetryable: number;
  deadLetter: number;
  reconciliationRequired: number;
}>;

type Worker = Readonly<{ run(): Promise<WorkerSummary> }>;

export function createInquiryWorkerHandler(input: Readonly<{
  method: "GET" | "POST";
  secret: () => string | undefined;
  resolveWorker: () => Worker | null;
}>) {
  return async function inquiryWorkerHandler(request: Request): Promise<Response> {
    if (
      request.method !== input.method ||
      !isAuthorizedWorkerRequest(request, input.secret())
    ) {
      return Response.json({ code: "unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    if (url.search || (await request.text()).length > 0) {
      return Response.json({ code: "parameters_not_allowed" }, { status: 400 });
    }
    const worker = input.resolveWorker();
    if (!worker) {
      return Response.json({ code: "service_unavailable" }, { status: 503 });
    }
    try {
      const summary = await worker.run();
      return Response.json({ code: "worker_complete", ...summary });
    } catch {
      return Response.json({ code: "worker_failed" }, { status: 503 });
    }
  };
}
