"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  theme: "dark";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render(
        element: HTMLElement,
        options: TurnstileOptions,
      ): string;
      remove(widgetId: string): void;
    };
  }
}

export function TurnstileWidget({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState(
    "Complete the security check before sending.",
  );

  const renderWidget = useCallback(() => {
    if (
      widgetIdRef.current ||
      !containerRef.current ||
      !window.turnstile
    ) {
      return;
    }
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: (value) => {
        setToken(value);
        setMessage("Security check complete.");
      },
      "expired-callback": () => {
        setToken("");
        setMessage("The security check expired. Please complete it again.");
      },
      "error-callback": () => {
        setToken("");
        setMessage("The security check could not load. Please try again.");
      },
    });
  }, [siteKey]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return (
    <div className="turnstile-widget">
      <Script
        id="cloudflare-turnstile"
        onReady={renderWidget}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
      />
      <div ref={containerRef} />
      <input name="turnstileToken" type="hidden" value={token} readOnly />
      <p aria-live="polite">{message}</p>
    </div>
  );
}

