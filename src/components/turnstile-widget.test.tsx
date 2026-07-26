import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TurnstileWidget } from "@/components/turnstile-widget";

describe("TurnstileWidget", () => {
  afterEach(() => {
    delete window.turnstile;
  });

  it("writes and clears the verified token through a named hidden input", () => {
    let options:
      | {
          callback: (token: string) => void;
          "expired-callback": () => void;
        }
      | undefined;
    window.turnstile = {
      render: vi.fn((_element, receivedOptions) => {
        options = receivedOptions;
        return "widget-1";
      }),
      remove: vi.fn(),
    };

    const { container, unmount } = render(
      <TurnstileWidget siteKey="test-site-key" />,
    );
    const hidden = container.querySelector<HTMLInputElement>(
      'input[name="turnstileToken"]',
    );

    act(() => options?.callback("verified-token"));
    expect(hidden?.value).toBe("verified-token");

    act(() => options?.["expired-callback"]());
    expect(hidden?.value).toBe("");

    unmount();
    expect(window.turnstile.remove).toHaveBeenCalledWith("widget-1");
  });
});

