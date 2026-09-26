import "server-only";

import { after } from "next/server";

import { createCalebRevalidationWorkerStore } from "@/lib/staff/website-runtime";
import { runCalebRevalidationJobs } from "./revalidation-worker";
import { refreshCalebPublishedPage } from "./published-page-refresh";

export function scheduleCalebContentRevalidation(): void {
  after(async () => {
    try {
      await runCalebRevalidationJobs({
        resolveStore: async () => {
          const store = createCalebRevalidationWorkerStore(process.env);
          if (!store) throw new Error("revalidation_configuration_invalid");
          return store;
        },
        refresh: refreshCalebPublishedPage,
        reportFailure: (code) => console.error(code),
      });
    } catch {
      // The publish/retry transaction has committed. An expiring lease and cron
      // recover interrupted attempts; never send a false failure for that command.
      console.error("revalidation_background_attempt_failed");
    }
  });
}

export function notifyCalebContentCommitted(callback?: () => void): void {
  try {
    // The callback only schedules work via after(); do not delay the response.
    void Promise.resolve(callback?.()).catch(() => {
      console.error("revalidation_schedule_failed");
    });
  } catch {
    console.error("revalidation_schedule_failed");
  }
}
