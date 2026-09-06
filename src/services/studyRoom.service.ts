import { mockDb } from '../db/mockDb.js';
import {
  DailyQuest,
  StudyRoomSession,
  SRSForecastDay,
  StudyRoomDashboardResponse,
  TimerMode,
} from '../types/studyRoom.types.js';
import { SrsService } from './srs.service.js';
import { StreakService } from './streak.service.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';

function toDateString(d: unknown): string {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'number') {
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toISOString();
  }
  return '';
}

export class StudyRoomService {
  /**
   * Helper to get today's calendar date in YYYY-MM-DD
   */
  static getTodayDate(): string {
    return new Date().toISOString().split('T')[0]!;
  }

  /**
   * Get the aggregate Study Room daily dashboard
   */
  static async getDailyDashboard(
    userId: string
  ): Promise<StudyRoomDashboardResponse> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const today = this.getTodayDate();

    // 1. Streak Information
    const streakStatus = StreakService.calculateStreakStatus(user);

    // 2. Aggregate Today's Sessions
    const userSessions = Array.from(mockDb.studyRoomSessions.values()).filter(
      (s) => s.userId === userId && toDateString(s.startedAt).startsWith(today)
    );

    const totalSecondsFocused = userSessions.reduce(
      (acc, s) => acc + (s.durationSeconds || 0),
      0
    );
    const focusedMinutes = Math.round(totalSecondsFocused / 60);
    const cardsReviewed = userSessions.reduce(
      (acc, s) => acc + (s.cardsReviewedCount || 0),
      0
    );
    const dailyTargetMinutes = 30; // standard daily goal

    // 3. Ensure Auto-Generated Quests for Today Exist
    let todayQuests = Array.from(mockDb.dailyQuests.values()).filter(
      (q) => q.userId === userId && q.date === today
    );

    const dueCards = await SrsService.getDueReviewCards(userId);
    const dueCount = dueCards.length;

    const tookTestToday =
      Array.from(mockDb.testHistories.values()).some(
        (th) =>
          th.userId === userId && toDateString(th.createdAt).startsWith(today)
      ) ||
      Array.from(mockDb.studySessions.values()).some(
        (ss) =>
          ss.userId === userId &&
          toDateString(ss.completedAt).startsWith(today) &&
          (ss.mode === 'TEST' || ss.mode === 'MATCH')
      );

    const perfectTestToday = Array.from(mockDb.testHistories.values()).some(
      (th) =>
        th.userId === userId &&
        toDateString(th.createdAt).startsWith(today) &&
        (th.scorePercentage === 100 ||
          (th.incorrectCount === 0 && th.correctCount > 0))
    );

    const highScoreTestToday = Array.from(mockDb.testHistories.values()).some(
      (th) =>
        th.userId === userId &&
        toDateString(th.createdAt).startsWith(today) &&
        (th.scorePercentage >= 80 ||
          (th.correctCount > 0 &&
            th.correctCount /
              Math.max(1, th.correctCount + th.incorrectCount) >=
              0.8))
    );

    const flawlessLearnToday = Array.from(mockDb.studySessions.values()).some(
      (ss) =>
        ss.userId === userId &&
        toDateString(ss.completedAt).startsWith(today) &&
        ss.mode === 'LEARN' &&
        ss.cardsTotal > 0 &&
        ss.cardsIncorrect === 0
    );

    const tookClozeToday = Array.from(mockDb.studySessions.values()).some(
      (ss) =>
        ss.userId === userId &&
        toDateString(ss.completedAt).startsWith(today) &&
        ss.mode === 'CLOZE'
    );

    const tookWriteToday = Array.from(mockDb.studySessions.values()).some(
      (ss) =>
        ss.userId === userId &&
        toDateString(ss.completedAt).startsWith(today) &&
        ss.mode === 'WRITE'
    );

    const playedMatchToday =
      Array.from(mockDb.studySessions.values()).some(
        (ss) =>
          ss.userId === userId &&
          toDateString(ss.completedAt).startsWith(today) &&
          ss.mode === 'MATCH'
      ) ||
      Array.from(mockDb.matchLeaderboards.values()).some(
        (e) =>
          e.userId === userId && toDateString(e.createdAt).startsWith(today)
      );

    const tookFlashcardsToday = Array.from(mockDb.studySessions.values()).some(
      (ss) =>
        ss.userId === userId &&
        toDateString(ss.completedAt).startsWith(today) &&
        ss.mode === 'FLASHCARDS'
    );

    const reviewedStarredToday = Array.from(
      mockDb.userCardProgress.values()
    ).some(
      (p) =>
        p.userId === userId &&
        p.isStarred &&
        !!p.lastStudiedAt &&
        toDateString(p.lastStudiedAt).startsWith(today)
    );

    const usedAiToday =
      user.aiUsageResetDate === today && (user.aiUsageToday || 0) > 0;

    const createdSetsTodayCount = Array.from(mockDb.studySets.values()).filter(
      (s) =>
        s.creatorId === userId && toDateString(s.createdAt).startsWith(today)
    ).length;

    const completedStudyModeToday =
      Array.from(mockDb.studySessions.values()).some(
        (ss) =>
          ss.userId === userId && toDateString(ss.completedAt).startsWith(today)
      ) ||
      Array.from(mockDb.testHistories.values()).some(
        (th) =>
          th.userId === userId && toDateString(th.createdAt).startsWith(today)
      );

    const unbrokenPomodoroToday = Array.from(
      mockDb.studyRoomSessions.values()
    ).some(
      (s) =>
        s.userId === userId &&
        toDateString(s.startedAt).startsWith(today) &&
        s.mode === 'POMODORO' &&
        s.durationSeconds >= 1500
    );

    const studiedAnySetToday =
      completedStudyModeToday ||
      Array.from(mockDb.studyRoomSessions.values()).some(
        (s) =>
          s.userId === userId &&
          !!s.deckId &&
          toDateString(s.startedAt).startsWith(today)
      ) ||
      Array.from(mockDb.userCardProgress.values()).some(
        (p) =>
          p.userId === userId &&
          !!p.lastStudiedAt &&
          toDateString(p.lastStudiedAt).startsWith(today)
      );

    const exploredSetToday =
      Array.from(mockDb.studySets.values()).some(
        (s) => s.creatorId !== userId && s.bookmarkedUserIds?.includes(userId)
      ) || createdSetsTodayCount > 0;

    const questFlags = {
      currentFocusedMinutes: focusedMinutes,
      dueCount,
      studiedAnySetToday,
      tookTestToday,
      perfectTestToday,
      highScoreTestToday,
      flawlessLearnToday,
      tookClozeToday,
      tookWriteToday,
      playedMatchToday,
      tookFlashcardsToday,
      reviewedStarredToday,
      usedAiToday,
      createdSetsTodayCount,
      completedStudyModeToday,
      unbrokenPomodoroToday,
      exploredSetToday,
    };

    if (todayQuests.length === 0) {
      todayQuests = await this.generateDailyQuests(userId, today, questFlags);
    } else {
      // Sync dynamic stats into existing auto-quests strictly from real activity
      for (const q of todayQuests) {
        if (!q.isAutoGenerated) continue;

        if (q.type === 'FOCUS_TIME_TARGET') {
          q.currentCount = focusedMinutes;
          q.isCompleted = focusedMinutes >= q.targetCount;
        } else if (q.type === 'FOCUS_45M_TARGET') {
          q.currentCount = focusedMinutes;
          q.isCompleted = focusedMinutes >= 45;
        } else if (q.type === 'UNBROKEN_POMODORO_25M') {
          q.currentCount = unbrokenPomodoroToday ? 1 : 0;
          q.isCompleted = unbrokenPomodoroToday;
        } else if (q.type === 'REVIEW_DUE_CARDS') {
          if (dueCount === 0) {
            q.isCompleted = true;
            q.currentCount = q.targetCount;
          } else {
            q.isCompleted = false;
            q.currentCount = Math.max(0, q.targetCount - dueCount);
          }
        } else if (q.type === 'STUDY_ANY_SET') {
          q.currentCount = studiedAnySetToday ? 1 : 0;
          q.isCompleted = studiedAnySetToday;
        } else if (q.type === 'EXPLORE_COMMUNITY_SET') {
          q.currentCount = exploredSetToday ? 1 : 0;
          q.isCompleted = exploredSetToday;
        } else if (q.type === 'PERFECT_TEST_EXAM') {
          q.currentCount = perfectTestToday ? 1 : 0;
          q.isCompleted = perfectTestToday;
        } else if (q.type === 'HIGH_SCORE_TEST') {
          q.currentCount = highScoreTestToday ? 1 : 0;
          q.isCompleted = highScoreTestToday;
        } else if (q.type === 'FLAWLESS_SM2_LEARN') {
          q.currentCount = flawlessLearnToday ? 1 : 0;
          q.isCompleted = flawlessLearnToday;
        } else if (q.type === 'CREATE_STUDY_SET') {
          q.currentCount = createdSetsTodayCount;
          q.isCompleted = createdSetsTodayCount >= q.targetCount;
        } else if (q.type === 'COMPLETE_STUDY_MODE') {
          q.currentCount = completedStudyModeToday ? 1 : 0;
          q.isCompleted = completedStudyModeToday;
        } else if (q.type === 'TAKE_PRACTICE_QUIZ') {
          q.currentCount = tookTestToday ? 1 : 0;
          q.isCompleted = tookTestToday;
        } else if (q.type === 'STUDY_CLOZE_MODE') {
          q.currentCount = tookClozeToday ? 1 : 0;
          q.isCompleted = tookClozeToday;
        } else if (q.type === 'STUDY_WRITE_MODE') {
          q.currentCount = tookWriteToday ? 1 : 0;
          q.isCompleted = tookWriteToday;
        } else if (q.type === 'PLAY_MATCH_GAME') {
          q.currentCount = playedMatchToday ? 1 : 0;
          q.isCompleted = playedMatchToday;
        } else if (q.type === 'REVIEW_STARRED_CARDS') {
          q.currentCount = reviewedStarredToday ? 1 : 0;
          q.isCompleted = reviewedStarredToday;
        } else if (q.type === 'STUDY_FLASHCARDS') {
          q.currentCount = tookFlashcardsToday ? 1 : 0;
          q.isCompleted = tookFlashcardsToday;
        } else if (q.type === 'AI_GENERATE_CARDS') {
          q.currentCount = usedAiToday ? 1 : 0;
          q.isCompleted = usedAiToday;
        }
      }
    }

    // 4. Calculate 7-Day SRS Forecast
    const srsForecast = this.calculateSrsForecast(userId, today);

    return {
      date: today,
      streak: {
        currentStreak: streakStatus.streakCount,
        longestStreak: Math.max(
          streakStatus.streakCount,
          user.streakCount || 0
        ),
        hasStudiedToday: streakStatus.isStreakActiveToday,
      },
      todayStats: {
        focusedMinutes,
        cardsReviewed,
        dailyTargetMinutes,
      },
      quests: todayQuests.sort((a, b) => {
        // Auto-generated quests first, then custom tasks
        if (a.isAutoGenerated && !b.isAutoGenerated) return -1;
        if (!a.isAutoGenerated && b.isAutoGenerated) return 1;
        return toDateString(a.createdAt).localeCompare(
          toDateString(b.createdAt)
        );
      }),
      srsForecast,
    };
  }

  /**
   * Auto-generate standard daily quests for a user
   */
  private static async generateDailyQuests(
    userId: string,
    date: string,
    flags: {
      currentFocusedMinutes: number;
      dueCount: number;
      studiedAnySetToday: boolean;
      tookTestToday: boolean;
      perfectTestToday: boolean;
      highScoreTestToday: boolean;
      flawlessLearnToday: boolean;
      tookClozeToday: boolean;
      tookWriteToday: boolean;
      playedMatchToday: boolean;
      tookFlashcardsToday: boolean;
      reviewedStarredToday: boolean;
      usedAiToday: boolean;
      createdSetsTodayCount: number;
      completedStudyModeToday: boolean;
      unbrokenPomodoroToday: boolean;
      exploredSetToday: boolean;
    }
  ): Promise<DailyQuest[]> {
    const generated: DailyQuest[] = [];
    const now = new Date().toISOString();

    const userSessions = Array.from(mockDb.studySessions.values())
      .filter((s) => s.userId === userId && !!s.studySetId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const recentSessionSetId = userSessions[0]?.studySetId;

    const userSets = Array.from(mockDb.studySets.values()).filter(
      (s) => s.creatorId === userId
    );
    const targetSetId = recentSessionSetId || userSets[0]?.id || '';

    // Day hash to give consistent daily variety
    const daySeed = date
      .split('-')
      .reduce((acc, part) => acc + parseInt(part, 10), 0);

    // 1. Slot 1: Due SRS Review Cards Quest (or fallback when 0 cards due)
    if (flags.dueCount > 0) {
      generated.push({
        id: `quest_due_${generateId()}`,
        userId,
        date,
        type: 'REVIEW_DUE_CARDS',
        title: `Ôn tập ${flags.dueCount} từ đến hạn (SRS Reviews)`,
        targetCount: flags.dueCount,
        currentCount: 0,
        isCompleted: false,
        actionUrl: '/reviews',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const fallbackVariant = daySeed % 3;
      if (fallbackVariant === 0) {
        generated.push({
          id: `quest_starred_${generateId()}`,
          userId,
          date,
          type: 'REVIEW_STARRED_CARDS',
          title: 'Ôn tập lại các thẻ từ vựng đã gắn sao (⭐)',
          targetCount: 1,
          currentCount: flags.reviewedStarredToday ? 1 : 0,
          isCompleted: flags.reviewedStarredToday,
          actionUrl: targetSetId
            ? `/sets/${targetSetId}/flashcards?starred=true`
            : '/reviews',
          isAutoGenerated: true,
          createdAt: now,
          updatedAt: now,
        });
      } else if (fallbackVariant === 1) {
        generated.push({
          id: `quest_flashcards_${generateId()}`,
          userId,
          date,
          type: 'STUDY_FLASHCARDS',
          title: 'Lướt và ôn tập nhanh 1 bộ Flashcards 🗂️',
          targetCount: 1,
          currentCount: flags.tookFlashcardsToday ? 1 : 0,
          isCompleted: flags.tookFlashcardsToday,
          actionUrl: targetSetId
            ? `/sets/${targetSetId}/flashcards`
            : '/reviews',
          isAutoGenerated: true,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        generated.push({
          id: `quest_explore_${generateId()}`,
          userId,
          date,
          type: 'EXPLORE_COMMUNITY_SET',
          title: 'Khám phá và lưu 1 học phần mới từ cộng đồng 🧭',
          targetCount: 1,
          currentCount: flags.exploredSetToday ? 1 : 0,
          isCompleted: flags.exploredSetToday,
          actionUrl: '/',
          isAutoGenerated: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 2. Slot 2: Focus Target (Pomodoro 25m vs 45m focus vs unbroken 25m session)
    const focusVariant = daySeed % 3;
    if (focusVariant === 0) {
      generated.push({
        id: `quest_focus_${generateId()}`,
        userId,
        date,
        type: 'FOCUS_TIME_TARGET',
        title: 'Tập trung học ít nhất 25 phút (Pomodoro) ⏱️',
        targetCount: 25,
        currentCount: flags.currentFocusedMinutes,
        isCompleted: flags.currentFocusedMinutes >= 25,
        actionUrl: '/study-room',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (focusVariant === 1) {
      generated.push({
        id: `quest_focus45_${generateId()}`,
        userId,
        date,
        type: 'FOCUS_45M_TARGET',
        title: 'Đạt tổng thời gian tập trung 45 phút trong ngày ⏳',
        targetCount: 45,
        currentCount: flags.currentFocusedMinutes,
        isCompleted: flags.currentFocusedMinutes >= 45,
        actionUrl: '/study-room',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      generated.push({
        id: `quest_unbroken_${generateId()}`,
        userId,
        date,
        type: 'UNBROKEN_POMODORO_25M',
        title:
          'Hoàn thành trọn vẹn 1 phiên Pomodoro (25 phút) không gián đoạn 🔥',
        targetCount: 1,
        currentCount: flags.unbrokenPomodoroToday ? 1 : 0,
        isCompleted: flags.unbrokenPomodoroToday,
        actionUrl: '/study-room',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Slot 3: Study Mode Mastery (Cloze vs Write vs Match vs Learn SM2 vs Any Set)
    const studyVariant = (daySeed + 1) % 5;
    if (studyVariant === 0) {
      generated.push({
        id: `quest_cloze_${generateId()}`,
        userId,
        date,
        type: 'STUDY_CLOZE_MODE',
        title: 'Luyện 1 bài điền từ vào chỗ trống (Cloze Test) ✍️',
        targetCount: 1,
        currentCount: flags.tookClozeToday ? 1 : 0,
        isCompleted: flags.tookClozeToday,
        actionUrl: targetSetId ? `/sets/${targetSetId}/cloze` : '/',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (studyVariant === 1) {
      generated.push({
        id: `quest_write_${generateId()}`,
        userId,
        date,
        type: 'STUDY_WRITE_MODE',
        title: 'Luyện 1 bài nghe và viết chính tả từ vựng (Dictation) 🎧',
        targetCount: 1,
        currentCount: flags.tookWriteToday ? 1 : 0,
        isCompleted: flags.tookWriteToday,
        actionUrl: targetSetId ? `/sets/${targetSetId}/write` : '/',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (studyVariant === 2) {
      generated.push({
        id: `quest_match_${generateId()}`,
        userId,
        date,
        type: 'PLAY_MATCH_GAME',
        title: 'Chơi 1 ván trò chơi ghép thẻ từ vựng (Match Game) 🎮',
        targetCount: 1,
        currentCount: flags.playedMatchToday ? 1 : 0,
        isCompleted: flags.playedMatchToday,
        actionUrl: targetSetId ? `/sets/${targetSetId}/match` : '/',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (studyVariant === 3) {
      generated.push({
        id: `quest_flawless_${generateId()}`,
        userId,
        date,
        type: 'FLAWLESS_SM2_LEARN',
        title: 'Học 1 bộ thẻ ở chế độ Learn SM-2 không chọn Hard hay Forgot ✨',
        targetCount: 1,
        currentCount: flags.flawlessLearnToday ? 1 : 0,
        isCompleted: flags.flawlessLearnToday,
        actionUrl: targetSetId ? `/sets/${targetSetId}/learn` : '/',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      generated.push({
        id: `quest_study_set_${generateId()}`,
        userId,
        date,
        type: 'STUDY_ANY_SET',
        title: 'Học 1 học phần bất kì qua chế độ học (Flashcards, Learn...) 📖',
        targetCount: 1,
        currentCount: flags.studiedAnySetToday ? 1 : 0,
        isCompleted: flags.studiedAnySetToday,
        actionUrl: targetSetId ? `/sets/${targetSetId}/flashcards` : '/',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Slot 4: Challenge / Creation / AI (High Score Test vs Perfect Test vs AI Generator vs Create Set vs Practice Quiz)
    const challengeVariant = (daySeed + 2) % 5;
    if (challengeVariant === 0) {
      generated.push({
        id: `quest_high_score_${generateId()}`,
        userId,
        date,
        type: 'HIGH_SCORE_TEST',
        title: 'Đạt kết quả kiểm tra từ 80% trở lên ở chế độ Test 🎯',
        targetCount: 1,
        currentCount: flags.highScoreTestToday ? 1 : 0,
        isCompleted: flags.highScoreTestToday,
        actionUrl: targetSetId ? `/sets/${targetSetId}/test` : '/reviews',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (challengeVariant === 1) {
      generated.push({
        id: `quest_perfect_test_${generateId()}`,
        userId,
        date,
        type: 'PERFECT_TEST_EXAM',
        title: 'Đạt điểm tuyệt đối 100% trong một bài kiểm tra (Test Exam) 🏆',
        targetCount: 1,
        currentCount: flags.perfectTestToday ? 1 : 0,
        isCompleted: flags.perfectTestToday,
        actionUrl: targetSetId ? `/sets/${targetSetId}/test` : '/reviews',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (challengeVariant === 2) {
      generated.push({
        id: `quest_ai_${generateId()}`,
        userId,
        date,
        type: 'AI_GENERATE_CARDS',
        title: 'Trải nghiệm tạo thẻ từ vựng thông minh bằng Trợ lý AI 🤖',
        targetCount: 1,
        currentCount: flags.usedAiToday ? 1 : 0,
        isCompleted: flags.usedAiToday,
        actionUrl: '/ai-generator',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else if (challengeVariant === 3) {
      generated.push({
        id: `quest_create_set_${generateId()}`,
        userId,
        date,
        type: 'CREATE_STUDY_SET',
        title: 'Tạo thêm 1 học phần mới (bằng AI hoặc thủ công) ➕',
        targetCount: 1,
        currentCount: flags.createdSetsTodayCount,
        isCompleted: flags.createdSetsTodayCount >= 1,
        actionUrl: '/sets/create',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      generated.push({
        id: `quest_quiz_${generateId()}`,
        userId,
        date,
        type: 'TAKE_PRACTICE_QUIZ',
        title: 'Hoàn thành 1 bài kiểm tra kiến thức bất kỳ (Quiz) 📝',
        targetCount: 1,
        currentCount: flags.tookTestToday ? 1 : 0,
        isCompleted: flags.tookTestToday,
        actionUrl: targetSetId ? `/sets/${targetSetId}/test` : '/reviews',
        isAutoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const q of generated) {
      mockDb.dailyQuests.set(q.id, q);
    }

    return generated;
  }

  /**
   * Calculate 7-day SRS projected workload forecast
   */
  private static calculateSrsForecast(
    userId: string,
    todayStr: string
  ): SRSForecastDay[] {
    const forecast: SRSForecastDay[] = [];
    const today = new Date(todayStr);

    // Prepare 7 consecutive days starting from today
    const dayDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dayDates.push(d.toISOString().split('T')[0]!);
    }

    // Get all card progress for this user
    const userProgress = Array.from(mockDb.userCardProgress.values()).filter(
      (p) => p.userId === userId
    );

    for (let i = 0; i < dayDates.length; i++) {
      const dateStr = dayDates[i]!;
      const isToday = i === 0;

      let dueCardsCount = 0;

      if (isToday) {
        // For today: cards whose nextReviewDate is <= now/end of today
        const nowMs = Date.now();
        dueCardsCount = userProgress.filter((p) => {
          if (!p.nextReviewDate) return false;
          const reviewMs = new Date(p.nextReviewDate).getTime();
          return reviewMs <= nowMs + 86400000;
        }).length;
      } else {
        // For future days: cards scheduled specifically on that date (or due that day)
        dueCardsCount = userProgress.filter((p) => {
          if (!p.nextReviewDate) return false;
          const pDate = toDateString(p.nextReviewDate).split('T')[0];
          return pDate === dateStr;
        }).length;
      }

      forecast.push({
        date: dateStr,
        dueCardsCount,
        isToday,
      });
    }

    return forecast;
  }

  /**
   * Record a completed Focus Session
   */
  static async recordSession(
    userId: string,
    data: {
      deckId?: string;
      mode: TimerMode;
      durationSeconds: number;
      startedAt: string;
      completedAt: string;
      cardsReviewedCount?: number;
    }
  ): Promise<StudyRoomSession> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const session: StudyRoomSession = {
      id: `sess_room_${generateId()}`,
      userId,
      deckId: data.deckId,
      mode: data.mode,
      durationSeconds: data.durationSeconds,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      cardsReviewedCount: data.cardsReviewedCount || 0,
      createdAt: new Date().toISOString(),
    };

    mockDb.studyRoomSessions.set(session.id, session);

    // Record activity in StreakService
    await StreakService.recordStudyActivity(userId);

    // Increment progress on today's FOCUS_TIME_TARGET quest
    const today = this.getTodayDate();
    const todayQuests = Array.from(mockDb.dailyQuests.values()).filter(
      (q) => q.userId === userId && q.date === today
    );

    const addedMinutes = Math.round(data.durationSeconds / 60);

    for (const q of todayQuests) {
      if (q.type === 'FOCUS_TIME_TARGET') {
        q.currentCount += addedMinutes;
        if (q.currentCount >= q.targetCount) {
          q.isCompleted = true;
        }
        q.updatedAt = new Date().toISOString();
        mockDb.dailyQuests.set(q.id, q);
      }
      if (data.deckId && q.type === 'STUDY_ANY_SET') {
        q.currentCount = 1;
        q.isCompleted = true;
        q.updatedAt = new Date().toISOString();
        mockDb.dailyQuests.set(q.id, q);
      }
      if (data.cardsReviewedCount && data.cardsReviewedCount > 0) {
        if (q.type === 'REVIEW_DUE_CARDS') {
          q.currentCount += data.cardsReviewedCount;
          if (q.currentCount >= q.targetCount) {
            q.isCompleted = true;
          }
          q.updatedAt = new Date().toISOString();
          mockDb.dailyQuests.set(q.id, q);
        }
      }
    }

    return session;
  }

  /**
   * Create a personalized custom quest for today
   */
  static async createCustomQuest(
    userId: string,
    data: {
      title: string;
      targetCount?: number;
    }
  ): Promise<DailyQuest> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const today = this.getTodayDate();
    const now = new Date().toISOString();

    const quest: DailyQuest = {
      id: `quest_custom_${generateId()}`,
      userId,
      date: today,
      type: 'CUSTOM_USER_TASK',
      title: data.title,
      targetCount: data.targetCount || 1,
      currentCount: 0,
      isCompleted: false,
      isAutoGenerated: false,
      createdAt: now,
      updatedAt: now,
    };

    mockDb.dailyQuests.set(quest.id, quest);
    return quest;
  }

  /**
   * Toggle completion status of a quest (custom user tasks only)
   */
  static async toggleQuest(
    userId: string,
    questId: string
  ): Promise<DailyQuest> {
    const quest = mockDb.dailyQuests.get(questId);
    if (!quest) {
      throw ApiError.notFound('Quest not found');
    }

    if (quest.userId !== userId) {
      throw ApiError.forbidden(
        'You do not have permission to modify this quest'
      );
    }

    if (quest.isAutoGenerated) {
      throw ApiError.badRequest(
        'Nhiệm vụ hệ thống được theo dõi tự động dựa trên tiến độ học tập thực tế.'
      );
    }

    quest.isCompleted = !quest.isCompleted;
    if (quest.isCompleted) {
      quest.currentCount = quest.targetCount;
    } else {
      quest.currentCount = 0;
    }
    quest.updatedAt = new Date().toISOString();
    mockDb.dailyQuests.set(quest.id, quest);

    return quest;
  }

  /**
   * Delete a custom user quest
   */
  static async deleteCustomQuest(
    userId: string,
    questId: string
  ): Promise<{ id: string }> {
    const quest = mockDb.dailyQuests.get(questId);
    if (!quest) {
      throw ApiError.notFound('Quest not found');
    }

    if (quest.userId !== userId) {
      throw ApiError.forbidden(
        'You do not have permission to delete this quest'
      );
    }

    if (quest.isAutoGenerated) {
      throw ApiError.badRequest('Không thể xóa nhiệm vụ mặc định của hệ thống');
    }

    mockDb.dailyQuests.delete(questId);
    return { id: questId };
  }
}
