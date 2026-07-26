export function CableLine({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`cable-line ${className}`.trim()}
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
    >
      <path d="M-24 54 C 160 8, 236 104, 410 58 S 742 8, 900 66 S 1112 106, 1230 34" />
      <circle cx="1180" cy="48" r="7" />
    </svg>
  );
}

