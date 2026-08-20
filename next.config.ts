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

const serverHeaders: NonNullable<NextConfig["headers"]> = async () => [
  {
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  },
  {
    source: "/(checkout|library|admin)(.*)",
    headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
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
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".js", ".ts", ".tsx"],
      ".jsx": [".jsx", ".tsx"],
    };
    return config;
  },
  output: isGitHubPages ? "export" : undefined,
  basePath: githubPagesBasePath || undefined,
  trailingSlash: isGitHubPages,
  images: isGitHubPages ? { unoptimized: true } : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: githubPagesBasePath,
  },
  ...(isGitHubPages ? {} : { redirects: serverRedirects, headers: serverHeaders }),
};

export default nextConfig;
