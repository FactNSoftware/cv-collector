"use client";

import { useCallback, useEffect, useState } from "react";
import type { PageInfo } from "../../lib/pagination";

type PageResponse<T> = {
  items: T[];
  pageInfo: PageInfo;
};

type UseServerPaginationOptions<T> = {
  initialItems: T[];
  initialPageInfo: PageInfo;
  resetKey: string;
  loadPage: (cursor?: string) => Promise<PageResponse<T>>;
};

export function useServerPagination<T>({
  initialItems,
  initialPageInfo,
  resetKey,
  loadPage,
}: UseServerPaginationOptions<T>) {
  const [items, setItems] = useState(initialItems);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [cursorHistory, setCursorHistory] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [didHydrate, setDidHydrate] = useState(false);

  const pageIndex = Math.max(0, cursorHistory.length - 1);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageInfo.hasMore && Boolean(pageInfo.nextCursor);

  const applyPage = useCallback(async (cursor: string | undefined, nextHistory: string[]) => {
    setIsLoading(true);

    try {
      const page = await loadPage(cursor);
      setItems(page.items);
      setPageInfo(page.pageInfo);
      setCursorHistory(nextHistory);
    } finally {
      setIsLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    if (!didHydrate) {
      setDidHydrate(true);
      return;
    }

    void applyPage(undefined, [""]);
    // `loadPage` is expected to change with the external filter state that is already folded into `resetKey`.
    // Including `applyPage` here would cause duplicate refreshes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didHydrate, resetKey]);

  return {
    items,
    setItems,
    pageInfo,
    isLoading,
    pageIndex,
    canPreviousPage,
    canNextPage,
    goToNextPage: async () => {
      if (!pageInfo.nextCursor) {
        return;
      }

      await applyPage(pageInfo.nextCursor, [...cursorHistory, pageInfo.nextCursor]);
    },
    goToPreviousPage: async () => {
      if (cursorHistory.length <= 1) {
        return;
      }

      const nextHistory = cursorHistory.slice(0, -1);
      const previousCursor = nextHistory[nextHistory.length - 1] || undefined;
      await applyPage(previousCursor, nextHistory);
    },
  };
}
