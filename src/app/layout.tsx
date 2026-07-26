import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { CSSProperties } from "react";
import { Bebas_Neue, Inter, Source_Serif_4 } from "next/font/google";

import { MobileBookingBar } from "@/components/mobile-booking-bar";
import { MotionRuntime } from "@/components/motion-runtime";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StructuredData } from "@/components/structured-data";
import { withBasePath } from "@/lib/base-path";
import { COLOR_SCHEME_BOOTSTRAP_SCRIPT } from "@/lib/color-scheme";
import { getSiteOrigin } from "@/lib/metadata";

import "./globals.css";

const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteOrigin(),
  title: {
    default: "Caleb Jakes | Motivational Speaker & Author",
    template: "%s",
  },
  description:
    "Book Caleb Jakes for transformational keynotes, workshops, faith events, school programs, conferences, panels, and media conversations.",
  applicationName: "Caleb Jakes",
  icons: {
    icon: withBasePath("/icon.svg"),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const assetVariables = {
    "--stage-desktop-image": `url("${withBasePath("/media/backgrounds/stage-desktop.webp")}")`,
    "--stage-mobile-image": `url("${withBasePath("/media/backgrounds/stage-mobile.webp")}")`,
  } as CSSProperties;

  return (
    <html
      className={`${display.variable} ${sans.variable} ${serif.variable}`}
      data-color-scheme="cinematic"
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <body style={assetVariables}>
        <Script id="color-scheme-bootstrap" strategy="beforeInteractive">
          {COLOR_SCHEME_BOOTSTRAP_SCRIPT}
        </Script>
        <noscript>
          <style>{`.reveal-motion{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <StructuredData />
        <MotionRuntime />
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <MobileBookingBar />
      </body>
    </html>
  );
}
