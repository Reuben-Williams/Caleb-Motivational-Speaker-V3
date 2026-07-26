import type { SpamVerifier } from "@/lib/inquiries/service";

export class TurnstileVerifier implements SpamVerifier {
  constructor(private readonly secret: string) {}

  async verify(token: string, trustedClientIp?: string): Promise<boolean> {
    if (!token) return false;

    const body = new URLSearchParams({
      secret: this.secret,
      response: token,
    });
    if (trustedClientIp) body.set("remoteip", trustedClientIp);

    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body,
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!response.ok) return false;
      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch {
      return false;
    }
  }
}

