import { fireEvent, render } from "@testing-library/react";
import { createBuilderPreviewMessage } from "@reuben-williams/core";
import { describe, expect, it, vi } from "vitest";

import {
  CalebPreviewBridge,
  isAllowedCalebPreviewMessage,
} from "./caleb-preview-bridge";

const siteId = "ce607bf6-2959-4d7e-b52a-31a8d21b1db2";

describe("CalebPreviewBridge", () => {
  it("decorates only declared regions and supports keyboard selection", () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { getByText } = render(<CalebPreviewBridge pagePath="/">
      <h1 data-builder-region-id="home.hero.title.line1" data-builder-region-kind="text">Editable title</h1>
      <p data-builder-region-id="locked.contact.email" data-builder-region-kind="text">Locked text</p>
    </CalebPreviewBridge>);
    const title = getByText("Editable title");
    expect(title).toHaveAttribute("data-caleb-editable", "true");
    expect(title).toHaveAttribute("tabindex", "0");
    expect(title).toHaveAttribute("title", expect.stringContaining("Edit"));
    expect(getByText("Locked text")).not.toHaveAttribute("data-caleb-editable");
    fireEvent.keyDown(title, { key: "Enter" });
    expect(title).toHaveAttribute("data-caleb-selected", "true");
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "builder:select-region", regionId: "home.hero.title.line1",
    }), window.location.origin);
    postMessage.mockRestore();
  });
  it("accepts only the exact origin, site, page, declared region, protocol, and version", () => {
    const message = createBuilderPreviewMessage(siteId, {
      type: "builder:select-region",
      pagePath: "/",
      regionId: "home.hero.title.line1",
      kind: "text",
    });
    expect(isAllowedCalebPreviewMessage(message, {
      origin: "https://calebjakes.com", expectedOrigin: "https://calebjakes.com", pagePath: "/",
    })).toBe(true);
    expect(isAllowedCalebPreviewMessage({ ...message, siteId: "other" }, {
      origin: "https://calebjakes.com", expectedOrigin: "https://calebjakes.com", pagePath: "/",
    })).toBe(false);
    expect(isAllowedCalebPreviewMessage({ ...message, pagePath: "/about" }, {
      origin: "https://calebjakes.com", expectedOrigin: "https://calebjakes.com", pagePath: "/",
    })).toBe(false);
    expect(isAllowedCalebPreviewMessage({ ...message, regionId: "locked.contact.email" }, {
      origin: "https://calebjakes.com", expectedOrigin: "https://calebjakes.com", pagePath: "/",
    })).toBe(false);
    expect(isAllowedCalebPreviewMessage(message, {
      origin: "https://attacker.example", expectedOrigin: "https://calebjakes.com", pagePath: "/",
    })).toBe(false);
  });

  it("emits canonical public page and selected-region messages only to the same-origin parent", () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    const { getByText } = render(
      <CalebPreviewBridge pagePath="/">
        <button
          data-builder-region-id="home.hero.title.line1"
          data-builder-region-kind="text"
          data-builder-region-value="PAIN HAS"
        >Title</button>
        <button data-builder-region-id="locked.contact.email" data-builder-region-kind="text">Locked</button>
      </CalebPreviewBridge>,
    );
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "builder:ready", pagePath: "/", siteId,
    }), window.location.origin);
    fireEvent.click(getByText("Title"));
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "builder:select-region", pagePath: "/", regionId: "home.hero.title.line1", kind: "text", value: "PAIN HAS",
    }), window.location.origin);
    const count = postMessage.mock.calls.length;
    fireEvent.click(getByText("Locked"));
    expect(postMessage).toHaveBeenCalledTimes(count);
    postMessage.mockRestore();
  });
});
