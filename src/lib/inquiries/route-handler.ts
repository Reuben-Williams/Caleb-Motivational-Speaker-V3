import { randomUUID } from "node:crypto";

import type { BookingInput } from "@/lib/booking-schema";
import type { InquiryResult } from "@/lib/inquiries/service";

const MAX_BODY_BYTES = 32 * 1024;
const alternatives =
  "Please call (404) 941-5670 or email info@calebjakes.com.";

type InquiryRuntime = {
  submit(
    input: BookingInput,
    context: { trustedClientIp?: string },
  ): Promise<InquiryResult>;
};

type HandlerOptions = {
  resolveRuntime: () => InquiryRuntime | null;
  getTrustedClientIp?: (request: Request) => string | undefined;
};

function json(
  body: Record<string, unknown>,
  status: number,
  headers?: HeadersInit,
) {
  return Response.json(body, { status, headers });
}

export function createInquiryPostHandler({
  resolveRuntime,
  getTrustedClientIp = () => undefined,
}: HandlerOptions) {
  return async function postInquiry(request: Request): Promise<Response> {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return json(
        {
          code: "unsupported_content_type",
          message: "Speaking inquiries must be sent as JSON.",
        },
        415,
      );
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return json(
        {
          code: "payload_too_large",
          message: `The inquiry is too large. ${alternatives}`,
        },
        413,
      );
    }

    let input: BookingInput;
    try {
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength > MAX_BODY_BYTES) {
        return json(
          {
            code: "payload_too_large",
            message: `The inquiry is too large. ${alternatives}`,
          },
          413,
        );
      }
      input = JSON.parse(new TextDecoder().decode(bytes)) as BookingInput;
    } catch {
      return json(
        {
          code: "validation_failed",
          message: "The inquiry request is not valid JSON.",
        },
        400,
      );
    }

    const runtime = resolveRuntime();
    if (!runtime) {
      return json(
        {
          code: "service_unavailable",
          message: `Online inquiry delivery is not configured. ${alternatives}`,
        },
        503,
      );
    }

    try {
      const result = await runtime.submit(input, {
        trustedClientIp: getTrustedClientIp(request),
      });
      const headers =
        result.retryAfter === undefined
          ? undefined
          : { "Retry-After": String(result.retryAfter) };
      return json(result.body, result.status, headers);
    } catch (error) {
      const correlationId = randomUUID();
      console.error("Inquiry request failed", {
        correlationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return json(
        {
          code: "unexpected_error",
          message: `The inquiry could not be processed. ${alternatives}`,
          correlationId,
        },
        500,
      );
    }
  };
}

