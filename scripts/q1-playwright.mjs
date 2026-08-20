import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

const outputDir = "C:\\caleb-q1";
const baseUrl = "http://127.0.0.1:3000";
const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const routes = [
  "/",
  "/about",
  "/speaking",
  "/schools-colleges",
  "/faith-events",
  "/conferences-workshops",
  "/book-media",
  "/faq",
  "/book-caleb",
  "/privacy",
  "/thank-you",
  "/store",
  "/store/test",
  "/checkout/success?session_id=cs_test_browser_verification",
  "/checkout/attention",
  "/checkout/cancel",
  "/library",
  "/library/sign-in",
  "/admin/editor/commerce",
  "/admin/editor/automations",
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
});
const report = {
  routes: [],
  interactions: {},
  redirects: {},
  commerceBoundaries: {},
  reducedMotion: {},
  screenshots: [],
  console: [],
};

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      report.console.push({
        page: label,
        type: message.type(),
        text: message.text(),
      });
    }
  });
  page.on("pageerror", (error) => {
    report.console.push({
      page: label,
      type: "pageerror",
      text: error.message,
    });
  });
}

async function capture(page, name, options = {}) {
  const screenshotPath = path.join(outputDir, name);
  await page.screenshot({ path: screenshotPath, ...options });
  report.screenshots.push(screenshotPath);
}

async function revealScrollSections(page) {
  const pageHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const viewportHeight = page.viewportSize()?.height ?? 1000;

  for (
    let position = 0;
    position < pageHeight;
    position += Math.max(480, Math.round(viewportHeight * 0.72))
  ) {
    await page.evaluate((top) => window.scrollTo(0, top), position);
    await page.waitForTimeout(180);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
}

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});

for (const route of routes) {
  const page = await desktop.newPage();
  observe(page, route);
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(250);
  const details = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector("h1")?.textContent?.trim() ?? "",
    bodyTextLength: document.body.innerText.trim().length,
    horizontalOverflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
    frameworkOverlay: Boolean(
      document.querySelector(
        "[data-nextjs-dialog-overlay], vite-error-overlay",
      ),
    ),
    motionMode: document.documentElement.dataset.motionMode ?? "",
  }));
  report.routes.push({
    route,
    status: response?.status() ?? 0,
    url: page.url(),
    ...details,
  });

  if (route === "/") {
    await revealScrollSections(page);
    await capture(page, "home-1440-full.png", { fullPage: true });
    await capture(page, "home-1440-fold.png");
    for (const [selector, filename] of [
      [".home-hero", "home-section-hero.png"],
      [".story-section", "home-section-story.png"],
      [".audience-section", "home-section-audiences.png"],
      [".reel-section", "home-section-reel.png"],
      [".topics-section", "home-section-topics.png"],
      [".booking-bridge", "home-section-booking.png"],
    ]) {
      const section = page.locator(selector);
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      await section.screenshot({
        path: path.join(outputDir, filename),
      });
      report.screenshots.push(path.join(outputDir, filename));
    }

    const audienceButton = page.getByRole("button", {
      name: "Audiences",
      exact: true,
    });
    await audienceButton.click();
    const audienceOpen =
      (await audienceButton.getAttribute("aria-expanded")) === "true";
    await page.keyboard.press("Escape");
    report.interactions.audienceMenu = {
      opened: audienceOpen,
      closed:
        (await audienceButton.getAttribute("aria-expanded")) === "false",
    };

    const compact = page.getByRole("form", { name: "Speaking inquiry" });
    await compact.getByLabel("Full name").fill("Jordan Avery");
    await compact.getByLabel("Work email").fill("jordan@example.org");
    await compact
      .getByLabel("Organization or institution")
      .fill("North Star College");
    await compact
      .getByLabel("Audience type")
      .selectOption("schools-colleges");
    await compact.getByLabel("Preferred date").fill("2099-06-20");
    await compact
      .getByLabel("Event goals")
      .fill("Help students connect resilience and identity with purpose.");
    await compact.getByRole("button", { name: "Continue Inquiry" }).click();
    await page.waitForURL("**/book-caleb?draft=1");
    const restoredNotice = page.getByText(
      /homepage inquiry details were restored/i,
    );
    await restoredNotice.waitFor({ state: "visible" });
    report.interactions.draftHandoff = {
      url: page.url(),
      restored: await restoredNotice.isVisible(),
    };
  } else if (route === "/about") {
    await revealScrollSections(page);
    await capture(page, "about-1440-full.png", { fullPage: true });
  } else if (route === "/speaking") {
    await revealScrollSections(page);
    await capture(page, "speaking-1440-full.png", { fullPage: true });
  } else if (route === "/book-caleb") {
    await revealScrollSections(page);
    await capture(page, "book-caleb-1440-full.png", { fullPage: true });
  } else if (route === "/store") {
    await revealScrollSections(page);
    await capture(page, "store-1440-full.png", { fullPage: true });
  } else if (route === "/library") {
    await capture(page, "library-1440-fold.png");
  } else if (route === "/admin/editor/commerce") {
    await capture(page, "commerce-denied-1440-fold.png");
  } else if (route === "/admin/editor/automations") {
    await capture(page, "automations-denied-1440-fold.png");
  }
  await page.close();
}

const faqPage = await desktop.newPage();
observe(faqPage, "faq-interaction");
await faqPage.goto(`${baseUrl}/faq`, { waitUntil: "networkidle" });
const faqButton = faqPage.getByRole("button", {
  name: "What audiences does Caleb speak to?",
});
await faqButton.click();
report.interactions.faq = {
  expanded: (await faqButton.getAttribute("aria-expanded")) === "true",
  answerVisible: await faqPage
    .getByText(/schools and colleges, churches and faith communities/i)
    .isVisible(),
};
await faqPage.close();

const bookingFailure = await desktop.newPage();
observe(bookingFailure, "booking-failure");
await bookingFailure.goto(`${baseUrl}/book-caleb`, {
  waitUntil: "networkidle",
});
const fullForm = bookingFailure.getByRole("form", { name: "Speaking inquiry" });
const fullValues = {
  "Full name": "Jordan Avery",
  "Work email": "jordan@example.org",
  "Phone number": "(404) 555-0199",
  "Organization or institution": "North Star College",
  "Role or title": "Director of Student Life",
  "Preferred date or range": "2099-06-20",
  "End date, if applicable": "2099-06-21",
  "Estimated audience size": "450",
  "Event location": "Rochester, New York",
  "Event goals":
    "Help students connect resilience, identity, and purpose with practical next steps.",
};
for (const [label, value] of Object.entries(fullValues)) {
  await fullForm.getByLabel(label).fill(value);
}
await fullForm.getByLabel("Audience type").selectOption("schools-colleges");
await fullForm.getByLabel("Event type").selectOption("keynote");
await fullForm.getByLabel("Attendance mode").selectOption("in-person");
await fullForm
  .getByLabel("Approximate program length")
  .selectOption("45-60-min");
await fullForm
  .getByLabel("How did you hear about Caleb?")
  .selectOption("search");
await fullForm.getByLabel(/I consent to Joyionaire/).check();
await fullForm.getByRole("button", { name: "Send Speaking Inquiry" }).click();
await fullForm.getByRole("alert").waitFor({ state: "visible" });
report.interactions.bookingFailure = {
  stayedOnForm: bookingFailure.url().includes("/book-caleb"),
  message: await fullForm.getByRole("alert").innerText(),
};
await capture(bookingFailure, "book-caleb-failure.png", { fullPage: false });
await bookingFailure.close();

for (const legacy of [
  ["/motivational-speaking-events", "/speaking"],
  ["/contact", "/book-caleb"],
  ["/media", "/book-media"],
  ["/about-caleb-jakes", "/about"],
]) {
  const page = await desktop.newPage();
  const response = await page.goto(`${baseUrl}${legacy[0]}`, {
    waitUntil: "networkidle",
  });
  report.redirects[legacy[0]] = {
    expected: legacy[1],
    finalPath: new URL(page.url()).pathname,
    status: response?.status() ?? 0,
  };
  await page.close();
}

const reduced = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const reducedPage = await reduced.newPage();
observe(reducedPage, "reduced-motion");
await reducedPage.goto(baseUrl, { waitUntil: "networkidle" });
await reducedPage.waitForTimeout(350);
report.reducedMotion = await reducedPage.evaluate(() => ({
  mode: document.documentElement.dataset.motionMode,
  canvasCount: document.querySelectorAll(".hero-atmosphere canvas").length,
}));
await capture(reducedPage, "home-reduced-motion.png");
await reduced.close();

for (const check of [
  {
    key: "browserAuthoredCheckoutRejected",
    url: "/api/commerce/checkout",
    options: {
      method: "POST",
      headers: { "content-type": "application/json" },
      data: { offerStableKey: "caleb-print-book-single", amount: 1 },
    },
    expected: 400,
  },
  {
    key: "customerSessionRequired",
    url: "/api/customer-auth/session",
    options: { method: "GET" },
    expected: 401,
  },
  {
    key: "workerAuthRequired",
    url: "/api/commerce/workers/automations",
    options: {
      method: "POST",
      headers: { "content-type": "application/json" },
      data: {},
    },
    expected: 401,
  },
  {
    key: "stripeRuntimeClosed",
    url: "/api/commerce/stripe/webhook",
    options: { method: "POST", data: "unsigned" },
    expected: 503,
  },
  {
    key: "privateAssetRequiresSession",
    url: "/api/commerce/assets/c5010000-0000-4000-8000-000000000003",
    options: { method: "GET" },
    expected: 401,
  },
]) {
  const response = await desktop.request.fetch(`${baseUrl}${check.url}`, check.options);
  report.commerceBoundaries[check.key] = {
    status: response.status(),
    expected: check.expected,
    passed: response.status() === check.expected,
  };
}

for (const viewport of [
  { width: 390, height: 844, name: "390" },
  { width: 320, height: 760, name: "320" },
]) {
  const mobile = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await mobile.newPage();
  observe(page, `mobile-${viewport.name}`);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  const menuButton = page.locator(".mobile-menu-button");
  await menuButton.click();
  const mobileLinkVisible = await page
    .getByRole("link", { name: "Schools & Colleges" })
    .isVisible();
  report.interactions[`mobile${viewport.name}`] = {
    overflow,
    menuExpanded:
      (await menuButton.getAttribute("aria-expanded")) === "true",
    audienceLinkVisible: mobileLinkVisible,
  };
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await capture(page, `home-${viewport.name}-fold.png`);
  await page.screenshot({
    path: path.join(outputDir, `home-${viewport.name}-full.png`),
    fullPage: true,
  });
  report.screenshots.push(
    path.join(outputDir, `home-${viewport.name}-full.png`),
  );
  await page.goto(`${baseUrl}/book-caleb`, { waitUntil: "networkidle" });
  await capture(page, `book-caleb-${viewport.name}-fold.png`);
  await page.goto(`${baseUrl}/store`, { waitUntil: "networkidle" });
  report.interactions[`storeMobile${viewport.name}`] = {
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  };
  await capture(page, `store-${viewport.name}-fold.png`);
  await mobile.close();
}

await browser.close();
await writeFile(
  path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(report, null, 2));
