import Link from "next/link";

import { contact, navigation } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Link className="footer-wordmark" href="/">
            CALEB <span>JAKES</span>
          </Link>
          <p>Turning struggles into strength and dreams into destiny.</p>
          <p className="site-footer__company">Joyionaire™ Enterprises</p>
        </div>

        <nav aria-label="Footer navigation">
          <p className="footer-label">Explore</p>
          {navigation.slice(1, 5).map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div>
          <p className="footer-label">Contact</p>
          <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
          <a href={contact.emailHref}>{contact.email}</a>
          <p>{contact.location}</p>
        </div>

        <div>
          <p className="footer-label">Connect</p>
          <a href={contact.instagram} rel="noreferrer" target="_blank">
            Instagram
          </a>
          <a href={contact.facebook} rel="noreferrer" target="_blank">
            Facebook
          </a>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <p>© {new Date().getFullYear()} Joyionaire™ Enterprises.</p>
        <p>Rochester, New York · Available for engagements worldwide</p>
      </div>
    </footer>
  );
}

