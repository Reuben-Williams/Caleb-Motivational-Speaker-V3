import type { Metadata } from "next";

import { StaffLoginForm } from "@/components/admin/staff-login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff sign in | Caleb Jakes",
  robots: { index: false, follow: false, nocache: true },
};

export default function StaffLoginPage() {
  return (
    <section style={{ minHeight: "75vh", display: "grid", placeItems: "center", padding: "2rem", background: "#0b0d0f", color: "#f6f2e8" }}>
      <div style={{ width: "min(100%, 480px)", border: "1px solid #282c2f", borderRadius: 18, padding: "clamp(1.5rem,5vw,3rem)", background: "#111416" }}>
        <p style={{ color: "#d7a74d", textTransform: "uppercase", letterSpacing: ".12em", fontSize: ".75rem" }}>Private staff access</p>
        <h1 style={{ fontSize: "clamp(2rem,7vw,3.5rem)", margin: ".4rem 0 1rem" }}>Speaking Engagements</h1>
        <p style={{ color: "#a9afb3", lineHeight: 1.6 }}>Use the approved Caleb Jakes staff identity. Access is verified again against Caleb&apos;s current role and permissions.</p>
        <StaffLoginForm />
      </div>
    </section>
  );
}
