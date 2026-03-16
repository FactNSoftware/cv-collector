"use client";

import { useEffect, useRef, useState } from "react";
import type { PageInfo } from "../../lib/pagination";

type PageResponse<T> = {
  items: T[];
  pageInfo: PageInfo;
};

type UseServerInfiniteListOptions<T> = {
  initialItems: T[];
  initialPageInfo: PageInfo;
  resetKey: string;
  loadPage: (cursor?: string) => Promise<PageResponse<T>>;
};

export function useServerInfiniteList<T>({
  initialItems,
  initialPageInfo,
  resetKey,
  loadPage,
}: UseServerInfiniteListOptions<T>) {
  const [items, setItems] = useState(initialItems);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const didHydrateRef = useRef(false);

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    let cancelled = false;

    void Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setIsLoading(true);
        }
      })
      .then(() => loadPage(undefined))
      .then((page) => {
        if (cancelled) {
          return;
        }

        setItems(page.items);
        setPageInfo(page.pageInfo);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to refresh infinite list page", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadPage, resetKey]);

  useEffect(() => {
    if (!pageInfo.hasMore || !pageInfo.nextCursor || !sentinelRef.current || isLoadingMore || isLoading) {
      return;
    }

    const element = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];

      if (!first?.isIntersecting || isLoadingMore) {
        return;
      }

      setIsLoadingMore(true);
      void loadPage(pageInfo.nextCursor || undefined)
        .then((page) => {
          setItems((current) => [...current, ...page.items]);
          setPageInfo(page.pageInfo);
        })
        .catch((error) => {
          console.error("Failed to load more infinite list items", error);
        })
        .finally(() => {
          setIsLoadingMore(false);
        });
    }, {
      rootMargin: "200px 0px",
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isLoading, isLoadingMore, loadPage, pageInfo]);

  return {
    items,
    setItems,
    pageInfo,
    isLoading,
    isLoadingMore,
    sentinelRef,
  };
}
