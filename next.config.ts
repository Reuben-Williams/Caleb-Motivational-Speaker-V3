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
