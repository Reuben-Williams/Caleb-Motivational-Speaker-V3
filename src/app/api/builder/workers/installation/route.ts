import { createCalebInstallationWorkerHandler } from "@/lib/platform/installation/route-handler";
import { createCalebInstallationRuntimeFromEnvironment } from "@/lib/platform/installation/runtime-loader";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = createCalebInstallationWorkerHandler({
  secret: () => process.env.CRON_SECRET,
  reportFailure: (code) => console.error(code),
  resolveRuntime: () => createCalebInstallationRuntimeFromEnvironment(process.env),
});
