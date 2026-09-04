import { randomUUID } from 'node:crypto';

export const generateId = (prefix: string = ''): string => {
  const uuid = randomUUID().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}_${uuid}` : uuid;
};
