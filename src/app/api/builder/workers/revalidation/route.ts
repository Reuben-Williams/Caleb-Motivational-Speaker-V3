import { revalidatePath } from "next/cache";

import { createCalebRevalidationWorkerHandler } from "@/lib/site-editor/revalidation-worker";
import { createCalebRevalidationWorkerStore } from "@/lib/staff/website-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = createCalebRevalidationWorkerHandler({
  secret: () => process.env.CRON_SECRET,
  resolveStore: async () => {
    const store = createCalebRevalidationWorkerStore(process.env);
    if (!store) throw new Error("revalidation_configuration_invalid");
    return store;
  },
  refresh: async (path) => revalidatePath(path),
  reportFailure: (code) => console.error(code),
});

