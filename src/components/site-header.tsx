"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ColorSchemeToggle } from "@/components/color-scheme-toggle";
import { audienceMenu, navigation } from "@/content/site";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="nav-chevron"
      viewBox="0 0 16 16"
      data-open={open}
    >
      <path d="m3.5 6 4.5 4 4.5-4" />
    </svg>
  );
}

export function SiteHeader() {
  const [audiencesOpen, setAudiencesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const audienceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!audiencesOpen && !mobileOpen) {
      return;
    }

    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAudiencesOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", closeMenus);
    return () => window.removeEventListener("keydown", closeMenus);
  }, [audiencesOpen, mobileOpen]);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 96);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="site-header__inner">
        <Link className="wordmark" href="/" aria-label="Caleb Jakes home">
          <span>CALEB</span>
          <span>JAKES</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.slice(0, 3).map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <div className="audience-menu" ref={audienceRef}>
            <button
              aria-expanded={audiencesOpen}
              aria-controls="audience-menu"
              className="nav-button"
              type="button"
              onClick={() => setAudiencesOpen((open) => !open)}
            >
              Audiences
              <Chevron open={audiencesOpen} />
            </button>
            <div
              className="audience-menu__panel"
              data-open={audiencesOpen}
              id="audience-menu"
            >
              {audienceMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setAudiencesOpen(false)}
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </div>
          {navigation.slice(3, 5).map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/store">Shop</Link>
        </nav>

        <ColorSchemeToggle className="color-scheme-toggle--desktop" />

        <Link className="header-booking-link" href="/book-caleb">
          Book Caleb
        </Link>

        <button
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          className="mobile-menu-button"
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="sr-only">
            {mobileOpen ? "Close navigation" : "Open navigation"}
          </span>
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="mobile-nav"
        data-lenis-prevent
        data-open={mobileOpen}
        hidden={!mobileOpen}
        id="mobile-navigation"
      >
        {navigation.slice(0, 3).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <p className="mobile-nav__label">Audiences</p>
        {audienceMenu.map((item) => (
          <Link
            className="mobile-nav__subitem"
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        {navigation.slice(3).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <Link href="/store" onClick={() => setMobileOpen(false)}>
          Shop
        </Link>
        <ColorSchemeToggle className="color-scheme-toggle--mobile" />
      </nav>
    </header>
  );
}
