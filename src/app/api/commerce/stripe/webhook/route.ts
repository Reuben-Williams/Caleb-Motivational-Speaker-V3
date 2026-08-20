import { createCalebStripeWebhookRoute } from "@/lib/platform/stripe-webhook-runtime";

export const runtime = "nodejs";
export const POST = createCalebStripeWebhookRoute();
