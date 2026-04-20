export type SortOrder = "asc" | "desc";

export type PaginationQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function getPagination(query: PaginationQuery) {
  const page = clampInteger(query.page, DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInteger(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

export function makePaginationMeta(params: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationMeta {
  const pageCount = Math.max(Math.ceil(params.total / params.pageSize), 1);

  return {
    page: params.page,
    pageSize: params.pageSize,
    total: params.total,
    pageCount,
    hasNextPage: params.page < pageCount,
    hasPreviousPage: params.page > 1
  };
}

export function getSortOrder(sortOrder?: string): SortOrder {
  return sortOrder === "asc" ? "asc" : "desc";
}

export function getSafeSortBy<T extends string>(
  requested: string | undefined,
  allowed: readonly T[],
  fallback: T
) {
  return requested && allowed.includes(requested as T)
    ? (requested as T)
    : fallback;
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value as number), min), max);
}
