"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function useInfiniteList<T>(
  items: T[],
  resetKey: string,
  pageSize = 12,
) {
  const [state, setState] = useState(() => ({
    key: resetKey,
    count: pageSize,
  }));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleCount = state.key === resetKey ? state.count : pageSize;

  useEffect(() => {
    if (!sentinelRef.current || visibleCount >= items.length) {
      return;
    }

    const element = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) {
        return;
      }

      setState((current) => {
        const currentCount = current.key === resetKey ? current.count : pageSize;

        return {
          key: resetKey,
          count: Math.min(currentCount + pageSize, items.length),
        };
      });
    }, {
      rootMargin: "180px 0px",
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [items.length, pageSize, resetKey, visibleCount]);

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  return {
    visibleItems,
    sentinelRef,
    hasMore: visibleCount < items.length,
  };
}
