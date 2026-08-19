import { Resend } from "resend";

import {
  renderBusinessEmail,
  renderConfirmationEmail,
} from "@/lib/inquiries/email-renderer";
import type { BookingData } from "@/lib/booking-schema";

type DeliveryMessage = {
  inquiryId: string;
  data: BookingData;
  idempotencyKey: string;
};

interface LegacyInquiryDelivery {
  sendBusiness(message: DeliveryMessage): Promise<void>;
  sendConfirmation(message: DeliveryMessage): Promise<void>;
}

export class ResendInquiryDelivery implements LegacyInquiryDelivery {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly notificationEmail: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async sendBusiness(message: DeliveryMessage) {
    const rendered = renderBusinessEmail(message.inquiryId, message.data);
    const response = await this.resend.emails.send(
      {
        from: this.from,
        to: this.notificationEmail,
        replyTo: message.data.workEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
      { idempotencyKey: message.idempotencyKey },
    );
    if (response.error) {
      throw new Error(response.error.name);
    }
  }

  async sendConfirmation(message: DeliveryMessage) {
    const rendered = renderConfirmationEmail(message.inquiryId, message.data);
    const response = await this.resend.emails.send(
      {
        from: this.from,
        to: message.data.workEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
      { idempotencyKey: message.idempotencyKey },
    );
    if (response.error) {
      throw new Error(response.error.name);
    }
  }
}
