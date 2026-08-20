import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const githubPagesBasePath = isGitHubPages
  ? "/Caleb-Motivational-Speaker-V3"
  : "";

const serverRedirects: NonNullable<NextConfig["redirects"]> = async () => [
  {
    source: "/motivational-speaking-events",
    destination: "/speaking",
    permanent: true,
  },
  {
    source: "/contact",
    destination: "/book-caleb",
    permanent: true,
  },
  {
    source: "/media",
    destination: "/book-media",
    permanent: true,
  },
  {
    source: "/about-caleb-jakes",
    destination: "/about",
    permanent: true,
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@reuben-williams/canonical-json",
    "@reuben-williams/content",
    "@reuben-williams/core",
    "@reuben-williams/editor",
    "@reuben-williams/entitlements",
    "@reuben-williams/feature-registry",
    "@reuben-williams/forms",
    "@reuben-williams/growth-ai",
    "@reuben-williams/growth-automations",
    "@reuben-williams/growth-automations-ui",
    "@reuben-williams/growth-bookings",
    "@reuben-williams/growth-campaigns",
    "@reuben-williams/growth-commerce",
    "@reuben-williams/growth-commerce-ui",
    "@reuben-williams/growth-core",
    "@reuben-williams/growth-customers",
    "@reuben-williams/growth-dashboard",
    "@reuben-williams/growth-leads",
    "@reuben-williams/growth-messaging",
    "@reuben-williams/next",
  ],
  output: isGitHubPages ? "export" : undefined,
  basePath: githubPagesBasePath || undefined,
  trailingSlash: isGitHubPages,
  images: isGitHubPages ? { unoptimized: true } : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: githubPagesBasePath,
  },
  ...(isGitHubPages ? {} : { redirects: serverRedirects }),
};

export default nextConfig;
