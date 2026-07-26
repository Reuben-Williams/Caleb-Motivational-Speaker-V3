"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function MobileBookingBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * 0.72);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="mobile-booking-bar" data-visible={visible}>
      <Link href="/book-caleb">Book Caleb</Link>
    </div>
  );
}

