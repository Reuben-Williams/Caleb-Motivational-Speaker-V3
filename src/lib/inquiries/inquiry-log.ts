type InquiryLogEvent = {
  inquiryId?: string;
  correlationId: string;
  operation: string;
  httpClass: string;
  attempt: number;
  code: string;
};

type InquiryLogSink = (event: Record<string, unknown>) => void;

export function logInquiryEvent(
  event: InquiryLogEvent,
  sink: InquiryLogSink = (value) => console.error("Inquiry event", value),
) {
  sink({
    ...(event.inquiryId ? { inquiryId: event.inquiryId } : {}),
    correlationId: event.correlationId,
    operation: event.operation,
    httpClass: event.httpClass,
    attempt: event.attempt,
    code: event.code,
  });
}
