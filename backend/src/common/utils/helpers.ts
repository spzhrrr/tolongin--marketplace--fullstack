// src/common/utils/helpers.ts

/**
 * Parse JSON string field ke object/array
 * @param value - JSON string yang akan di-parse
 * @param defaultValue - Nilai default jika parsing gagal atau value null/undefined
 * @returns Hasil parsing atau defaultValue
 */
export function parseJsonField<T = any>(
  value: string | null | undefined,
  defaultValue: T,
): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Stringify object/array ke JSON string
 * @param value - Object/array yang akan di-stringify
 * @param defaultValue - Nilai default jika stringify gagal
 * @returns JSON string atau defaultValue
 */
export function stringifyJsonField(
  value: any,
  defaultValue: string = '[]',
): string {
  if (value === undefined || value === null) return defaultValue;
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Pagination helper untuk Prisma
 * @param page - Halaman saat ini (dimulai dari 1)
 * @param limit - Jumlah item per halaman
 * @returns Object { skip, take } untuk Prisma
 */
export function paginate(page: number = 1, limit: number = 10) {
  const take = limit > 100 ? 100 : limit; // Maksimal 100 per halaman
  const skip = (Math.max(1, page) - 1) * take;
  return { take, skip };
}

/**
 * Build page metadata untuk response API
 * @param total - Total jumlah data
 * @param page - Halaman saat ini
 * @param limit - Limit per halaman
 * @returns Object metadata pagination
 */
export function buildPageMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page: Math.max(1, page),
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
