import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function applyTimeFilter<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  timeFilter?: string,
  dateColumn: string = 'createdAt',
): SelectQueryBuilder<T> {
  if (!timeFilter || timeFilter === 'All Time') return qb;

  const now = new Date();

  if (timeFilter === 'This Week') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = start
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    qb.andWhere(`${alias}.${dateColumn} >= :startDate`, { startDate: startOfWeek });
  } else if (timeFilter === 'This Month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    qb.andWhere(`${alias}.${dateColumn} >= :startDate`, { startDate: startOfMonth });
  } else if (timeFilter === 'This Quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
    qb.andWhere(`${alias}.${dateColumn} >= :startDate`, { startDate: startOfQuarter });
  } else if (timeFilter.startsWith('custom:')) {
    const parts = timeFilter.split(':');
    if (parts.length === 3) {
      const fromDate = new Date(parts[1]);
      const toDate = new Date(parts[2]);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere(`${alias}.${dateColumn} >= :fromDate AND ${alias}.${dateColumn} <= :toDate`, {
        fromDate,
        toDate,
      });
    }
  }

  return qb;
}
