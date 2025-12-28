"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function PageTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const timeout = window.setTimeout(() => setActive(false), 720);
    return () => window.clearTimeout(timeout);
  }, [pathname, searchParams]);

  return <div className={`page-transition${active ? " is-active" : ""}`} />;
}
