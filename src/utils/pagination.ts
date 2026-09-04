export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const paginateArray = <T>(
  items: T[],
  page: number = 1,
  limit: number = 10
): PaginatedResult<T> => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / safeLimit) || 1;
  const startIndex = (safePage - 1) * safeLimit;
  const paginatedItems = items.slice(startIndex, startIndex + safeLimit);

  return {
    items: paginatedItems,
    pagination: {
      totalItems,
      currentPage: safePage,
      totalPages,
      limit: safeLimit,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
};
