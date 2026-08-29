import { createPostgresDataPlane } from "@reuben-williams/next/database/server";

import { createOutboxWorker } from "@/lib/inquiries/outbox-worker";
import { PostgresInquiryOutboxRepository } from "@/lib/inquiries/postgres-outbox-repository";
import { createResendOutboxDelivery } from "@/lib/inquiries/resend-delivery";
import { createNativeInquirySession } from "@/lib/inquiries/runtime";

type Environment = Record<string, string | undefined>;
type Diagnostic = Readonly<{
  code: "missing_configuration" | "invalid_configuration";
  component: string;
}>;

const requiredKeys = [
  "DATABASE_URL",
  "NATIVE_INQUIRY_SITE_ID",
  "NATIVE_INQUIRY_RUNTIME_MEMBER_ID",
  "NATIVE_INQUIRY_CAPABILITIES_JSON",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "INQUIRY_NOTIFICATION_EMAIL",
] as const;

export function createInquiryOutboxRuntime(
  environment: Environment,
  reportDiagnostic: (diagnostic: Diagnostic) => void = (diagnostic) =>
    console.error("Inquiry outbox runtime configuration", diagnostic),
) {
  const missing = requiredKeys.find((key) => !environment[key]?.trim());
  if (missing) {
    reportDiagnostic({ code: "missing_configuration", component: missing });
    return null;
  }
  let session;
  try {
    session = createNativeInquirySession(environment);
  } catch {
    reportDiagnostic({
      code: "invalid_configuration",
      component: "native_inquiry_session",
    });
    return null;
  }
  try {
    const database = createPostgresDataPlane({
      connectionString: environment.DATABASE_URL!,
      maximumPoolSize: 2,
    });
    return createOutboxWorker({
      repository: new PostgresInquiryOutboxRepository({ database, session }),
      delivery: createResendOutboxDelivery({
        apiKey: environment.RESEND_API_KEY!,
        from: environment.RESEND_FROM_EMAIL!,
        notificationEmail: environment.INQUIRY_NOTIFICATION_EMAIL!,
      }),
      workerId: "caleb-native-inquiry-email",
      limit: 20,
    });
  } catch {
    reportDiagnostic({
      code: "invalid_configuration",
      component: "inquiry_outbox_runtime",
    });
    return null;
  }
}
