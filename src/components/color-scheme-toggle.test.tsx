import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ColorSchemeToggle } from "@/components/color-scheme-toggle";
import {
  COLOR_SCHEME_CHANGE_EVENT,
  COLOR_SCHEME_STORAGE_KEY,
} from "@/lib/color-scheme";

describe("ColorSchemeToggle", () => {
  beforeEach(() => {
    document.documentElement.dataset.colorScheme = "cinematic";
    window.localStorage.clear();
  });

  it("renders a hidden, disabled control until the client scheme is known", () => {
    const markup = renderToString(<ColorSchemeToggle />);

    expect(markup).toContain('data-ready="false"');
    expect(markup).toContain('disabled=""');
    expect(markup).not.toContain("aria-pressed");
  });

  it("becomes ready and switches between both schemes", async () => {
    const user = userEvent.setup();
    render(<ColorSchemeToggle />);

    const toggle = screen.getByRole("button", { name: "Original colors" });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute("data-ready", "true");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(document.documentElement.dataset.colorScheme).toBe("original");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe(
      "original",
    );

    await user.click(toggle);
    expect(document.documentElement.dataset.colorScheme).toBe("cinematic");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps both responsive controls synchronized", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ColorSchemeToggle className="desktop" />
        <ColorSchemeToggle className="mobile" />
      </>,
    );

    const toggles = screen.getAllByRole("button", {
      name: "Original colors",
    });
    await waitFor(() => {
      expect(toggles[0]).toBeEnabled();
      expect(toggles[1]).toBeEnabled();
    });

    await user.click(toggles[0]);
    expect(toggles[0]).toHaveAttribute("aria-pressed", "true");
    expect(toggles[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("removes its global scheme listener when unmounted", async () => {
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<ColorSchemeToggle />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Original colors" }),
      ).toBeEnabled(),
    );

    unmount();

    expect(removeListener).toHaveBeenCalledWith(
      COLOR_SCHEME_CHANGE_EVENT,
      expect.any(Function),
    );
    removeListener.mockRestore();
  });
});
