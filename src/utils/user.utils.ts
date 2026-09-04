import { User } from '../types/user.types.js';
import { UserRole } from '../config/constants.js';
import { mockDb } from '../db/mockDb.js';

/**
 * Checks if a user is currently VIP or Admin.
 * - Administrators always have full VIP perks.
 * - If user has vipExpiresAt, it must be in the future.
 */
export function isUserVip(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true;
  if (user.vipExpiresAt) {
    return new Date(user.vipExpiresAt).getTime() > Date.now();
  }
  return Boolean(user.isVip);
}

/**
 * Counts total vocabulary cards owned by a user across all their study sets.
 */
export function countUserTotalCards(userId: string): number {
  let count = 0;
  for (const set of mockDb.studySets.values()) {
    if (set.creatorId === userId) {
      for (const card of mockDb.cards.values()) {
        if (card.studySetId === set.id) {
          count++;
        }
      }
    }
  }
  return count;
}

export const VIP_FREE_CARD_LIMIT = 300;

// ─── Free Tier Limits ──────────────────────────────────────────────
export const FREE_CARD_LIMIT = 300;
export const FREE_MISTAKE_BANK_LIMIT = 20;
export const FREE_MAX_GROUPS_TOTAL = 5;
export const FREE_MAX_GROUPS_CREATED = 2;

// ─── VIP Tier Limits ───────────────────────────────────────────────
export const VIP_AI_DAILY_LIMIT_MONTH = 20;
export const VIP_AI_DAILY_LIMIT_YEAR = 40;
export const VIP_AI_DAILY_LIMIT = 20; // Default for backwards compatibility

// ─── Study Groups Tier Limits ──────────────────────────────────────
export const VIP_GOLD_MAX_GROUPS_TOTAL = 30;
export const VIP_GOLD_MAX_GROUPS_CREATED = 15;
export const VIP_DIAMOND_MAX_GROUPS_TOTAL = Infinity;
export const VIP_DIAMOND_MAX_GROUPS_CREATED = Infinity;

/**
 * Resolves the maximum daily AI usage for a specific user based on their role and VIP plan.
 */
export function getVipAiDailyLimit(user?: User | null): number {
  if (!user) return 0;
  if (user.role === UserRole.ADMIN) return Infinity;
  if (user.vipPlan === '1_YEAR') return VIP_AI_DAILY_LIMIT_YEAR;
  return VIP_AI_DAILY_LIMIT_MONTH;
}

/**
 * Counts how many groups a user is a member of (including created ones).
 */
export function countUserGroups(userId: string): {
  totalGroups: number;
  createdGroups: number;
} {
  let totalGroups = 0;
  let createdGroups = 0;
  for (const cl of mockDb.classes.values()) {
    const isMember = cl.members.some((m) => m.userId === userId);
    if (isMember || cl.creatorId === userId) {
      totalGroups++;
    }
    if (cl.creatorId === userId) {
      createdGroups++;
    }
  }
  return { totalGroups, createdGroups };
}

/**
 * Checks and increments the AI daily usage counter for a VIP user.
 * Returns the remaining usage count.
 */
export function checkAndIncrementAiUsage(user: User): number {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const maxLimit = getVipAiDailyLimit(user);

  // Reset counter if it's a new day
  if (user.aiUsageResetDate !== today) {
    user.aiUsageToday = 0;
    user.aiUsageResetDate = today;
  }

  const currentUsage = user.aiUsageToday || 0;
  if (currentUsage >= maxLimit) {
    return 0; // No remaining usage
  }

  user.aiUsageToday = currentUsage + 1;
  mockDb.users.set(user.id, user);

  return maxLimit - user.aiUsageToday;
}
