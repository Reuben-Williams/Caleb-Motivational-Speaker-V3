const baseDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
];

function policy(frameSrc: string, frameAncestors: string) {
  return [...baseDirectives, frameSrc, frameAncestors].join("; ");
}

const sharedHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()",
  },
] as const;

export const productionSecurityHeaders: Array<{
  key: string;
  value: string;
}> = [
  { key: "Content-Security-Policy", value: policy("frame-src https://challenges.cloudflare.com", "frame-ancestors 'none'") },
  { key: "X-Frame-Options", value: "DENY" },
  ...sharedHeaders,
];

export const websiteEditorSecurityHeaders: typeof productionSecurityHeaders = [
  { key: "Content-Security-Policy", value: policy("frame-src 'self' https://challenges.cloudflare.com", "frame-ancestors 'none'") },
  { key: "X-Frame-Options", value: "DENY" },
  ...sharedHeaders,
];

export const websitePreviewSecurityHeaders: typeof productionSecurityHeaders = [
  { key: "Content-Security-Policy", value: policy("frame-src https://challenges.cloudflare.com", "frame-ancestors 'self'") },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...sharedHeaders,
];
