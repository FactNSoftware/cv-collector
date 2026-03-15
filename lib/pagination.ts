export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PageInfo = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export const getPageLimit = (value: string | null | undefined) => {
  const parsed = Number(value ?? DEFAULT_PAGE_SIZE);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
};

export const getCursorParam = (value: string | null | undefined) => {
  return value?.trim() || "";
};

export const buildPageInfo = (limit: number, nextCursor?: string) => ({
  limit,
  nextCursor: nextCursor || null,
  hasMore: Boolean(nextCursor),
});

export const encodeOffsetCursor = (offset: number) => {
  return Buffer.from(String(Math.max(0, Math.floor(offset))), "utf8").toString("base64url");
};

export const decodeOffsetCursor = (cursor?: string | null) => {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = Number(decoded);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return Math.floor(parsed);
  } catch {
    return 0;
  }
};

export const paginateItems = <T>(items: T[], limit: number, cursor?: string | null) => {
  const offset = decodeOffsetCursor(cursor);
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + limit;

  return {
    items: pageItems,
    pageInfo: buildPageInfo(
      limit,
      nextOffset < items.length ? encodeOffsetCursor(nextOffset) : undefined,
    ),
  };
};
