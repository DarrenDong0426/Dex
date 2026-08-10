"use client";
import { useEffect, useState, type RefObject } from "react";

// tracks whether a scrollable element currently has more content below the
// fold — used to show/hide a "scroll for more" hint. Re-checks on scroll and
// on resize (e.g. content growing when a skin picker row appears).
export function useScrollOverflow(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
): boolean {
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    };
    check();
    el.addEventListener("scroll", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return hasMore;
}
