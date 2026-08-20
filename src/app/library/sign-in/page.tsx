import type { Metadata } from "next";

import { PasswordlessSignInForm } from "@/components/commerce/passwordless-sign-in-form";

export const metadata: Metadata = {
  title: "Sign In to Your Library | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function LibrarySignInPage() {
  return <div className="commerce-page commerce-page--outcome"><div className="container">
    <section className="checkout-outcome">
      <p className="eyebrow">PASSWORDLESS CUSTOMER ACCESS</p>
      <h1>OPEN YOUR PRIVATE LIBRARY.</h1>
      <p>
        Use the email attached to your purchase. The link is time-limited and
        does not require a password.
      </p>
      <PasswordlessSignInForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />
    </section>
  </div></div>;
}
