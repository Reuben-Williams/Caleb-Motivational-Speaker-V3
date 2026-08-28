import { deepFreeze } from "./immutability";
import type { AssetRecord, CalebCommerceConfig, OfferConfiguration, ProductConfiguration } from "./types";

export const PRODUCTS: ProductConfiguration[] = deepFreeze([
  { productId: "c2010000-0000-4000-8000-000000000001", revisionId: "c2020000-0000-4000-8000-000000000001", stableKey: "caleb-print-book", title: "Shedding Pounds, Gaining Purpose", titleApproval: "awaiting_caleb", kind: "physical", recipeKey: "caleb.book_purchased.v1", sku: null, skuApproval: "awaiting_caleb" },
  { productId: "c2010000-0000-4000-8000-000000000002", revisionId: "c2020000-0000-4000-8000-000000000002", stableKey: "caleb-audiobook", title: "Audiobook — final title pending", titleApproval: "awaiting_caleb", kind: "digital_download", recipeKey: "caleb.audiobook_purchased.v1", sku: null, skuApproval: "awaiting_caleb" },
  { productId: "c2010000-0000-4000-8000-000000000003", revisionId: "c2020000-0000-4000-8000-000000000003", stableKey: "caleb-workbook", title: "Workbook — final title pending", titleApproval: "awaiting_caleb", kind: "digital_download", recipeKey: "caleb.workbook_purchased.v1", sku: null, skuApproval: "awaiting_caleb" },
  { productId: "c2010000-0000-4000-8000-000000000004", revisionId: "c2020000-0000-4000-8000-000000000004", stableKey: "caleb-course", title: "Release The Weight Course — final title pending", titleApproval: "awaiting_caleb", kind: "course", recipeKey: "caleb.course_purchased.v1", sku: null, skuApproval: "awaiting_caleb" },
]);

const approvedUnitAmountsMinor: Readonly<Record<string, number>> = deepFreeze({
  "caleb-workbook": 999,
  "caleb-course": 19_700,
});

export const OFFERS: OfferConfiguration[] = deepFreeze(PRODUCTS.map((product, index) => {
  const approvedUnitAmountMinor = approvedUnitAmountsMinor[product.stableKey];

  return {
    offerId: `c2030000-0000-4000-8000-00000000000${index + 1}`,
    revisionId: `c2040000-0000-4000-8000-00000000000${index + 1}`,
    stableKey: `${product.stableKey}-single`,
    title: `${product.title} — individual offer`,
    productRevisionIds: [product.revisionId],
    approvalState: "awaiting_caleb",
    priceRevision: {
      revisionId: `c2050000-0000-4000-8000-00000000000${index + 1}`,
      currency: approvedUnitAmountMinor === undefined ? null : "USD",
      unitAmountMinor: approvedUnitAmountMinor ?? null,
      observedSourceAmountMinor: null,
      approvalState: approvedUnitAmountMinor === undefined ? "awaiting_caleb" : "approved",
    },
    taxMode: "pending_owner_decision",
  };
}));

export const ASSETS: CalebCommerceConfig["assets"] = deepFreeze({
  marketing: [
    {
      assetId: "c5010000-0000-4000-8000-000000000001",
      productRevisionId: "c2020000-0000-4000-8000-000000000001",
      role: "commerce_marketing_image",
      sourceLabel: "Amazon book image web derivative",
      repositoryPath: "public/media/book/caleb-book-amazon.webp",
      sizeBytes: 48_140,
      mediaType: "image/webp",
      sha256: "2de0cd6ff0ab5d202f27f4b76fdbd09adc30c2e98cc0c0c3227a6e98fa1b9f95",
      provenance: "Existing approved V3 book-media asset; final commerce assignment awaits Caleb approval.",
      sourceState: "verified",
      approvalState: "awaiting_caleb",
      destinationKey: null,
      visibility: "public_marketing",
    },
    {
      assetId: "c5010000-0000-4000-8000-000000000002",
      productRevisionId: "c2020000-0000-4000-8000-000000000001",
      role: "commerce_marketing_image",
      sourceLabel: "Front book cover web derivative",
      repositoryPath: "public/media/book/caleb-book-front.webp",
      sizeBytes: 72_396,
      mediaType: "image/webp",
      sha256: "9868b8e0b1b7dbe2e00db79bc00b5244e079ffecd4d5d4d3d18ab2d3f7634586",
      provenance: "Existing approved V3 book-media asset; final commerce assignment awaits Caleb approval.",
      sourceState: "verified",
      approvalState: "awaiting_caleb",
      destinationKey: null,
      visibility: "public_marketing",
    },
  ] satisfies AssetRecord[],
  digital: [
    {
      assetId: "c5010000-0000-4000-8000-000000000003",
      productRevisionId: "c2020000-0000-4000-8000-000000000002",
      role: "paid_customer_content",
      sourceLabel: "Audiobook source file not yet supplied",
      repositoryPath: null,
      sizeBytes: null,
      mediaType: null,
      sha256: null,
      provenance: "Awaiting Caleb-supplied original and ownership confirmation.",
      sourceState: "missing",
      approvalState: "awaiting_caleb",
      destinationKey: null,
      visibility: "private_entitled",
    },
    {
      assetId: "c5010000-0000-4000-8000-000000000004",
      productRevisionId: "c2020000-0000-4000-8000-000000000003",
      role: "paid_customer_content",
      sourceLabel: "Workbook source file not yet supplied",
      repositoryPath: null,
      sizeBytes: null,
      mediaType: null,
      sha256: null,
      provenance: "Awaiting Caleb-supplied original and ownership confirmation.",
      sourceState: "missing",
      approvalState: "awaiting_caleb",
      destinationKey: null,
      visibility: "private_entitled",
    },
    {
      assetId: "c5010000-0000-4000-8000-000000000005",
      productRevisionId: "c2020000-0000-4000-8000-000000000004",
      role: "paid_customer_content",
      sourceLabel: "Course structure and source files not yet supplied",
      repositoryPath: null,
      sizeBytes: null,
      mediaType: null,
      sha256: null,
      provenance: "Awaiting Caleb-supplied originals, course structure, and ownership confirmation.",
      sourceState: "missing",
      approvalState: "awaiting_caleb",
      destinationKey: null,
      visibility: "private_entitled",
    },
  ] satisfies AssetRecord[],
});
