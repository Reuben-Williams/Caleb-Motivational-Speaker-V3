import { createPreviewReadinessRoute } from "@/lib/platform/preview-readiness-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createPreviewReadinessRoute(process.env);
