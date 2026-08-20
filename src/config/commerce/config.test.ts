import { describe, expect, it } from "vitest";

import {
  CALEB_RECIPE_KEYS,
  calebCommerceConfig,
  validateCalebCommerceConfig,
} from "./index";

describe("Caleb commerce configuration", () => {
  it("represents exactly the five verified HighLevel recipes with distinct locked source evidence", () => {
    expect(CALEB_RECIPE_KEYS).toEqual([
      "caleb.book_purchased.v1",
      "caleb.book_nurture.v1",
      "caleb.audiobook_purchased.v1",
      "caleb.course_purchased.v1",
      "caleb.workbook_purchased.v1",
    ]);
    expect(calebCommerceConfig.sourceSnapshots.map((snapshot) => snapshot.recipeKey)).toEqual(
      CALEB_RECIPE_KEYS,
    );
    expect(new Set(calebCommerceConfig.sourceSnapshots.map((snapshot) => snapshot.snapshotId))).toHaveSize(5);
    expect(new Set(calebCommerceConfig.sourceSnapshots.map((snapshot) => snapshot.contentDigest))).toHaveSize(5);
    expect(calebCommerceConfig.sourceSnapshots.every((snapshot) => snapshot.executable === false)).toBe(true);
  });

  it("preserves source ordering, delays, branches, subjects, links, status, and capture precision", () => {
    const book = calebCommerceConfig.sourceSnapshots.find(
      (snapshot) => snapshot.recipeKey === "caleb.book_purchased.v1",
    );
    const nurture = calebCommerceConfig.sourceSnapshots.find(
      (snapshot) => snapshot.recipeKey === "caleb.book_nurture.v1",
    );
    expect(book?.normalized.steps.map((step) => step.type)).toEqual([
      "tag.add",
      "email.send",
      "delay",
      "branch",
      "delay",
      "tag.add",
    ]);
    expect(book?.normalized.steps.filter((step) => step.type === "delay").map((step) => step.delayMinutes)).toEqual([
      1,
      5,
    ]);
    expect(nurture?.normalized.steps.filter((step) => step.type === "email.send")).toHaveLength(6);
    expect(nurture?.normalized.steps.filter((step) => step.type === "email.send").every(
      (step) => step.subject === "Elevate Your Brand Presence: Unleash the Power of Social Media Management",
    )).toBe(true);
    expect(nurture?.normalized.steps.some((step) => step.linkDestinationKind === "highlevel_preview_url")).toBe(true);
    expect(calebCommerceConfig.sourceSnapshots.every(
      (snapshot) => snapshot.sourceStatus === "published"
        && snapshot.observationTimePrecision === "bounded_by_design_record",
    )).toBe(true);
  });

  it("corrects Book Purchased to one fulfillment task, one message, six minutes, and an eligible nurture handoff", () => {
    const recipe = calebCommerceConfig.recipes.find(
      (candidate) => candidate.recipeKey === "caleb.book_purchased.v1",
    );
    expect(recipe?.runtime).toBe("automation_v2");
    expect(recipe?.trigger).toMatchObject({
      type: "commerce.line_item_paid",
      productKind: "physical",
      scope: "line_item",
      requiresPendingFulfillment: true,
    });
    expect(recipe?.steps.map((step) => step.type)).toEqual([
      "task.create",
      "transactional_template.send",
      "delay",
      "campaign_sequence.enter",
    ]);
    expect(recipe?.steps.find((step) => step.type === "delay")?.delayMinutes).toBe(6);
    expect(recipe?.steps.find((step) => step.type === "campaign_sequence.enter")?.condition).toBe(
      "marketing_eligible",
    );
  });

  it("owns the six-send nurture timing in Campaigns and permits only the Book Purchased handoff", () => {
    const nurture = calebCommerceConfig.recipes.find(
      (candidate) => candidate.recipeKey === "caleb.book_nurture.v1",
    );
    expect(nurture?.runtime).toBe("campaigns");
    expect(nurture?.trigger).toEqual({
      type: "campaign_sequence.entered",
      sourceRecipeKey: "caleb.book_purchased.v1",
      sourceActionKey: "enter-book-nurture",
      scope: "customer_and_order",
    });
    expect(nurture?.steps.filter((step) => step.type === "campaign_template.send")).toHaveLength(6);
    expect(nurture?.steps.filter((step) => step.type === "delay").map((step) => step.delayMinutes)).toEqual([
      360,
      1_440,
      2_880,
      1_440,
      1_440,
      1_440,
      1_440,
    ]);
  });

  it("grants one line-item entitlement for every digital product and preserves the course wait", () => {
    for (const recipeKey of [
      "caleb.audiobook_purchased.v1",
      "caleb.course_purchased.v1",
      "caleb.workbook_purchased.v1",
    ] as const) {
      const recipe = calebCommerceConfig.recipes.find((candidate) => candidate.recipeKey === recipeKey);
      expect(recipe?.trigger).toMatchObject({ type: "commerce.line_item_paid", scope: "line_item" });
      expect(recipe?.steps.filter((step) => step.type === "commerce.product_entitlement.grant")).toHaveLength(1);
      expect(recipe?.steps.filter((step) => step.type === "transactional_template.send")).toHaveLength(1);
      expect(recipe?.steps.find((step) => step.type === "transactional_template.send")?.routeKind).toBe(
        "passwordless_library",
      );
    }
    const course = calebCommerceConfig.recipes.find(
      (candidate) => candidate.recipeKey === "caleb.course_purchased.v1",
    );
    expect(course?.steps.find((step) => step.type === "delay")?.delayMinutes).toBe(1);
  });

  it("pins physical and digital product kinds and routes multi-item orders per eligible line item", () => {
    expect(Object.fromEntries(calebCommerceConfig.catalog.products.map((product) => [product.stableKey, product.kind]))).toEqual({
      "caleb-print-book": "physical",
      "caleb-audiobook": "digital_download",
      "caleb-workbook": "digital_download",
      "caleb-course": "course",
    });
    expect(calebCommerceConfig.orderRouting).toEqual({
      eventType: "commerce.line_item_paid",
      runScope: "one_run_per_eligible_line_item",
      multiItemOrdersSupported: true,
    });
  });

  it("rejects unsafe production content and public paid-asset paths", () => {
    for (const mutate of [
      (copy: typeof calebCommerceConfig) => {
        copy.templates.transactional[0]!.subject = "Elevate Your Brand Presence: Unleash the Power of Social Media Management";
      },
      (copy: typeof calebCommerceConfig) => {
        copy.templates.campaign[0]!.linkDestinations = ["https://app.gohighlevel.com/v2/preview/example"];
      },
      (copy: typeof calebCommerceConfig) => {
        copy.templates.campaign[0]!.body = "Only a few spots remain. Doors close at midnight.";
      },
      (copy: typeof calebCommerceConfig) => {
        copy.templates.transactional[0]!.body = "Open {{missing_variable}}";
      },
      (copy: typeof calebCommerceConfig) => {
        copy.assets.digital[0]!.sourceState = "verified";
        copy.assets.digital[0]!.repositoryPath = "/public/downloads/audiobook.mp3";
      },
    ]) {
      const copy = structuredClone(calebCommerceConfig);
      mutate(copy);
      expect(validateCalebCommerceConfig(copy).validForReview).toBe(false);
    }
  });

  it("makes every activation-sensitive value explicit and keeps every imported revision inactive", () => {
    expect(calebCommerceConfig.catalog.offers.every((offer) => offer.priceRevision !== undefined)).toBe(true);
    expect(calebCommerceConfig.catalog.offers.every((offer) => offer.taxMode !== undefined)).toBe(true);
    expect(calebCommerceConfig.catalog.shipping).toBeDefined();
    expect(calebCommerceConfig.policies).toBeDefined();
    expect(calebCommerceConfig.sender).toBeDefined();
    expect(calebCommerceConfig.consent).toBeDefined();
    expect(calebCommerceConfig.assets.digital).toHaveLength(3);
    expect(calebCommerceConfig.recipes.every(
      (recipe) => recipe.operationalState === "inactive"
        && recipe.reviewState === "draft"
        && recipe.approvedRevisionId === null
        && recipe.activeRevisionId === null,
    )).toBe(true);

    const result = validateCalebCommerceConfig(calebCommerceConfig);
    expect(result.validForReview).toBe(true);
    expect(result.activationReady).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "catalog.owner_approval_required",
      "assets.digital_files_missing",
      "messaging.sender_approval_required",
      "messaging.copy_approval_required",
      "policies.owner_approval_required",
      "shipping.owner_approval_required",
      "consent.owner_approval_required",
    ]));
  });

  it("contains no credential, customer, signed URL, or paid binary material", () => {
    const serialized = JSON.stringify(calebCommerceConfig);
    expect(serialized).not.toMatch(/(?:sk_live|sk_test|re_[A-Za-z0-9]|ghl_[A-Za-z0-9]|bearer\s)/i);
    expect(serialized).not.toMatch(/X-Amz-(?:Signature|Credential)|customerRecords?|executionHistory/i);
    expect(serialized).not.toMatch(/\.(?:mp3|m4a|wav|pdf|zip|epub)(?:["?]|$)/i);
  });
});
