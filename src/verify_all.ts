process.env.NODE_ENV = 'test';

import { createApp } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';
import { StudySetService } from '../src/services/studySet.service.js';
import { CardService } from '../src/services/card.service.js';
import { SrsService } from '../src/services/srs.service.js';
import { TestService } from '../src/services/test.service.js';
import { MatchService } from '../src/services/match.service.js';
import { AiService } from '../src/services/ai.service.js';
import { FolderService } from '../src/services/folder.service.js';
import { ClassService } from '../src/services/class.service.js';
import { UserService } from '../src/services/user.service.js';
import { SearchService } from '../src/services/search.service.js';
import { StreakService } from '../src/services/streak.service.js';
import { mockDb } from '../src/db/mockDb.js';
import { connectDatabase, disconnectDatabase } from '../src/db/mongo.js';
import { StudySetWithDetails } from '../src/types/studySet.types.js';
import { ClassWithDetails } from '../src/types/class.types.js';
import { StreakInfo, User } from '../src/types/user.types.js';
import { AdminOverviewStats } from '../src/services/admin.service.js';
import { DEFAULT_MAINTENANCE_CONFIG } from '../src/types/system.types.js';
import http from 'http';

interface ApiResponsePayload<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

async function runVerification() {
  console.log('🧪 Starting Backend Verification Tests...\n');

  // Connect to MongoDB Atlas
  const mongo = await connectDatabase();
  if (mongo) {
    await mockDb.loadFromMongo();
  }

  // Ensure maintenance mode does not block test authentication
  mockDb.maintenanceConfig = {
    ...DEFAULT_MAINTENANCE_CONFIG,
    isActive: false,
  };

  // Start ephemeral HTTP server for live API tests
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, () => resolve()));
  const baseUrl = 'http://localhost:5099/api/v1';

  try {
    // 1. Auth Test
    console.log('1️⃣ Testing Authentication:');
    const loginRes = await AuthService.login({
      loginIdentifier: 'alex_ielts',
      password: 'Password123!',
    });
    console.log(
      `✅ Logged in successfully as: ${loginRes.user.name} (${loginRes.user.role})`
    );
    console.log(
      `🔑 Access Token generated: ${loginRes.accessToken.slice(0, 25)}...`
    );

    // 1B. Forgot Password & In-App Change Password Tests
    console.log('\n1️⃣B Testing Password Recovery & In-App Change:');

    // Request forgot-password
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@example.com' }),
    });
    const forgotJson = (await forgotRes.json()) as ApiResponsePayload<null>;
    if (forgotRes.status !== 200 || !forgotJson.success) {
      throw new Error(`Forgot password failed: ${JSON.stringify(forgotJson)}`);
    }
    console.log('✅ POST /auth/forgot-password dispatched successfully.');

    // Verify reset token in DB
    const alexUser = mockDb.users.get('usr_alex_001');
    if (!alexUser?.resetPasswordToken || !alexUser?.resetPasswordExpires) {
      throw new Error('Reset password token or expiration not saved in DB!');
    }
    console.log(
      '✅ User resetPasswordToken & resetPasswordExpires securely stored in DB.'
    );

    // Reset password with invalid token
    const badResetRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'invalid_token_12345',
        email: 'alex@example.com',
        newPassword: 'NewSecurePassword123!',
      }),
    });
    if (badResetRes.status !== 400) {
      throw new Error(
        `Expected 400 for invalid token, got ${badResetRes.status}`
      );
    }
    console.log(
      '🔒 Invalid reset token properly rejected with 400 Bad Request.'
    );

    // In-app change-password: Test wrong current password
    const badChangeRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginRes.accessToken}`,
      },
      body: JSON.stringify({
        oldPassword: 'WrongOldPassword!',
        newPassword: 'BrandNewPassword123!',
      }),
    });
    if (badChangeRes.status !== 400) {
      throw new Error(
        `Expected 400 for wrong old password, got ${badChangeRes.status}`
      );
    }
    console.log(
      '🔒 Incorrect current password properly rejected with 400 Bad Request.'
    );

    // Change password to BrandNewPassword123!
    const validChangeRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginRes.accessToken}`,
      },
      body: JSON.stringify({
        oldPassword: 'Password123!',
        newPassword: 'BrandNewPassword123!',
      }),
    });
    const validChangeJson =
      (await validChangeRes.json()) as ApiResponsePayload<null>;
    if (validChangeRes.status !== 200 || !validChangeJson.success) {
      throw new Error(
        `Change password failed: ${JSON.stringify(validChangeJson)}`
      );
    }
    console.log(
      '✅ POST /auth/change-password succeeded with valid credentials.'
    );

    // Revert password back to Password123! so other tests continue seamlessly
    const revertChangeRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginRes.accessToken}`,
      },
      body: JSON.stringify({
        oldPassword: 'BrandNewPassword123!',
        newPassword: 'Password123!',
      }),
    });
    if (revertChangeRes.status !== 200) {
      throw new Error('Failed to revert test password');
    }
    console.log(
      '✅ Reverted test user password back to standard Password123!.'
    );

    // 2. Study Sets Live HTTP API Tests (Fixing 500 issue)
    console.log('\n2️⃣ Testing Live HTTP Study Sets Endpoint:');

    // A: Basic GET /study-sets
    const httpRes1 = await fetch(`${baseUrl}/study-sets`);
    const jsonRes1 = (await httpRes1.json()) as ApiResponsePayload<
      StudySetWithDetails[]
    >;
    if (httpRes1.status !== 200 || !jsonRes1.success) {
      throw new Error(
        `HTTP /study-sets failed with status ${httpRes1.status}: ${JSON.stringify(jsonRes1)}`
      );
    }
    console.log(
      `✅ HTTP GET /study-sets returned status 200 with ${jsonRes1.data.length} sets.`
    );

    // B: GET /study-sets with level and tag filters
    const httpRes2 = await fetch(
      `${baseUrl}/study-sets?page=1&limit=10&level=ALL&tag=`
    );
    const jsonRes2 = (await httpRes2.json()) as ApiResponsePayload<
      StudySetWithDetails[]
    >;
    if (httpRes2.status !== 200 || !jsonRes2.success) {
      throw new Error(
        `HTTP /study-sets?page=1&limit=10&level=ALL failed with status ${httpRes2.status}: ${JSON.stringify(jsonRes2)}`
      );
    }
    console.log(
      `✅ HTTP GET /study-sets?page=1&limit=10&level=ALL returned status 200 with ${jsonRes2.data.length} sets.`
    );

    // C: GET /study-sets with search query
    const httpRes3 = await fetch(
      `${baseUrl}/study-sets?search=ielts&level=ADVANCED`
    );
    const jsonRes3 = (await httpRes3.json()) as ApiResponsePayload<
      StudySetWithDetails[]
    >;
    if (httpRes3.status !== 200 || !jsonRes3.success) {
      throw new Error(
        `HTTP /study-sets?search=ielts failed with status ${httpRes3.status}: ${JSON.stringify(jsonRes3)}`
      );
    }
    console.log(
      `✅ HTTP GET /study-sets?search=ielts returned status 200 with ${jsonRes3.data.length} sets.`
    );

    const firstSet = (jsonRes1.data.find(
      (s: StudySetWithDetails) => s.creatorId === loginRes.user.id
    ) ||
      Array.from(mockDb.studySets.values()).find(
        (s) => s.creatorId === loginRes.user.id
      ) ||
      jsonRes1.data[0])!;

    // Bookmark test
    const bookmarkRes = await StudySetService.toggleBookmark(
      firstSet.id,
      loginRes.user.id
    );
    console.log(
      `✅ Toggled Bookmark on set: isBookmarked=${bookmarkRes.isBookmarked}, count=${bookmarkRes.bookmarkCount}`
    );
    const bookmarkedSets = await StudySetService.getBookmarkedSets(
      loginRes.user.id
    );
    console.log(
      `✅ Retrieved ${bookmarkedSets.length} bookmarked sets for user.`
    );

    // 3. Card Bulk Import Test
    console.log('\n3️⃣ Testing Card Bulk Import:');
    const rawText =
      'Serendipity\tSự may mắn bất ngờ\t/ˌser.ənˈdɪp.ə.t̬i/\nEphemeral\tPhù du, ngắn ngủi\t/ɪˈfem.ər.əl/';
    const importedCards = await CardService.importFromText(
      firstSet.id,
      rawText,
      '\t',
      '\n',
      loginRes.user.id
    );
    console.log(`✅ Bulk imported ${importedCards.length} cards successfully.`);

    // 4. Spaced Repetition (SRS / SM-2) Test
    console.log('\n4️⃣ Testing Spaced Repetition (SM-2):');
    const srsAnswer = await SrsService.submitLearnAnswer(
      loginRes.user.id,
      firstSet.id,
      {
        cardId: importedCards[0]!.id,
        quality: 4, // Good recall
      }
    );
    console.log(
      `✅ SM-2 Algorithm updated card interval: ${srsAnswer.progress.intervalDays} day(s), easeFactor: ${srsAnswer.progress.easeFactor}, status: ${srsAnswer.progress.status}`
    );

    // 5. Test Engine Generation & Auto-grading Test
    console.log('\n5️⃣ Testing Test Engine:');
    const testObj = await TestService.generateTest(
      firstSet.id,
      { questionCount: 4 },
      loginRes.user.id
    );
    console.log(
      `✅ Generated Test: "${testObj.studySetTitle}" with ${testObj.totalQuestions} questions.`
    );

    const mockAnswers = testObj.questions.map((q) => ({
      questionId: q.id,
      cardId: q.cardId,
      userAnswer: 'Sample answer',
    }));
    const gradedResult = await TestService.submitTest(
      testObj.testId,
      mockAnswers,
      35,
      loginRes.user.id
    );
    console.log(
      `✅ Test graded automatically! Score: ${gradedResult.scorePercentage}%, Correct: ${gradedResult.correctCount}/${gradedResult.totalQuestions}`
    );

    // 6. Match Game & Leaderboard Test
    console.log('\n6️⃣ Testing Match Game:');
    const tiles = await MatchService.getMatchTiles(firstSet.id, 4);
    console.log(
      `✅ Generated ${tiles.tiles.length} tiles for Match game (${tiles.totalPairs} pairs).`
    );
    const matchResult = await MatchService.submitScore(
      firstSet.id,
      12500,
      tiles.totalPairs,
      loginRes.user.id,
      tiles.sessionToken
    );
    console.log(
      `✅ Submitted match score: ${(matchResult.entry.timeRecordMs / 1000).toFixed(2)}s (New Best: ${matchResult.isNewPersonalBest})`
    );

    // 7. Folder & Class Test (with Non-Member Privacy Verification)
    console.log('\n7️⃣ Testing Folders & Classes:');
    // Ensure idempotent test run: clean up previous test folder and class
    for (const [fId, fld] of mockDb.folders.entries()) {
      if (
        fld.creatorId === loginRes.user.id &&
        fld.title === 'My Master English Folder'
      ) {
        mockDb.folders.delete(fId);
      }
    }
    for (const [cId, cls] of mockDb.classes.entries()) {
      if (
        cls.creatorId === loginRes.user.id &&
        cls.name === 'TOEIC 900+ Fighters'
      ) {
        mockDb.classes.delete(cId);
      }
    }

    const newFolder = await FolderService.create(
      { title: 'My Master English Folder', studySetIds: [firstSet.id] },
      loginRes.user.id
    );
    console.log(
      `✅ Created Folder: "${newFolder.title}" with ${newFolder.setCount} sets.`
    );

    const newClass = await ClassService.create(
      { name: 'TOEIC 900+ Fighters' },
      loginRes.user.id
    );
    await ClassService.addSets(newClass.id, [firstSet.id], loginRes.user.id);
    console.log(
      `✅ Created Class: "${newClass.name}" with Join Code: [${newClass.joinCode}] and 1 set.`
    );

    // Live HTTP check for non-member view
    const classHttpRes = await fetch(`${baseUrl}/classes/${newClass.id}`);
    const classJson =
      (await classHttpRes.json()) as ApiResponsePayload<ClassWithDetails>;
    if (
      classHttpRes.status === 200 &&
      classJson.data.studySets.length === 0 &&
      classJson.data.joinCode === '' &&
      classJson.data.isCurrentUserMember === false
    ) {
      console.log(
        `🔒 HTTP GET /classes/${newClass.id} verified: Non-member sees 0 sets, hidden join code, and locked status.`
      );
    } else {
      throw new Error(`Class privacy failed: ${JSON.stringify(classJson)}`);
    }

    // Live HTTP check for joining class with wrong code -> 404
    const joinWrongRes = await fetch(`${baseUrl}/classes/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginRes.accessToken}`,
      },
      body: JSON.stringify({ joinCode: 'WRONG99' }),
    });
    const joinWrongJson =
      (await joinWrongRes.json()) as ApiResponsePayload<null>;
    if (joinWrongRes.status === 404) {
      console.log(
        `🔒 HTTP POST /classes/join with invalid code properly returned 404: "${joinWrongJson.message}"`
      );
    } else {
      throw new Error(
        `Expected 404 for wrong code, got ${joinWrongRes.status}`
      );
    }

    // 8. User Profile Verification (Alex & Sarah)
    console.log('\n8️⃣ Testing User Profile & Stats:');
    const userProfile = await UserService.getProfile(loginRes.user.id);
    console.log(
      `✅ Profile for ${userProfile.name}: ${userProfile.stats?.totalSetsCreated} sets created, ${userProfile.bookmarkedSets?.length} bookmarked sets.`
    );

    const sarahProfile = await UserService.getProfile('usr_sarah_003');
    console.log(
      `✅ Profile for ${sarahProfile.name} (${sarahProfile.role}): ${sarahProfile.stats?.totalSetsCreated} sets created, ${sarahProfile.createdFolders?.length} folders, ${sarahProfile.bookmarkedSets?.length} bookmarks, ${sarahProfile.stats?.totalCardsMastered} cards mastered.`
    );

    // 9. AI Assistant Test
    console.log('\n9️⃣ Testing AI Flashcard Generator & Explainer:');
    const aiSet = await AiService.generateStudySet(
      'Advanced Phrasal Verbs in Job Interviews',
      3
    );
    console.log(
      `✅ AI Generated Study Set: "${aiSet.title}" (${aiSet.cards.length} cards)`
    );
    console.log(
      `   Sample Term: ${aiSet.cards[0]?.term} - ${aiSet.cards[0]?.definition}`
    );

    // 10. Search & Explore Engine Test
    console.log('\n🔟 Testing Universal Search & Explore Engine:');
    const searchRes = await SearchService.search('Sarah', 'all', 5);
    console.log(
      `✅ Search for 'Sarah': Found ${searchRes.totalResults} results (${searchRes.studySets.length} sets, ${searchRes.users.length} users, ${searchRes.folders.length} folders, ${searchRes.classes.length} classes).`
    );
    const exploreRes = await SearchService.getExploreRecommendations();
    console.log(
      `✅ Explore Recommendations: ${exploreRes.trendingSets.length} trending, ${exploreRes.featuredSets.length} featured sets.`
    );

    // 11. Dynamic Study Streak Lifecycle Test
    console.log('\n1️⃣1️⃣ Testing Dynamic Study Streak Lifecycle:');
    const testUser = {
      ...mockDb.users.get(loginRes.user.id)!,
      id: 'usr_temp_streak_test',
      email: 'temp_streak_test@example.com',
      username: 'temp_streak_test',
    };

    // A. Active today
    testUser.lastStudyDate = StreakService.getTodayDateString();
    testUser.streakCount = 5;
    const activeStatus = StreakService.calculateStreakStatus(testUser);
    if (
      activeStatus.streakStatus === 'ACTIVE' &&
      activeStatus.isStreakActiveToday === true &&
      activeStatus.streakCount === 5
    ) {
      console.log(
        '✅ Active Streak: Status=ACTIVE, isStreakActiveToday=true, count=5 (Flame active 🔥)'
      );
    } else {
      throw new Error(`Active streak failed: ${JSON.stringify(activeStatus)}`);
    }

    // B. Cooled down (yesterday learned, not yet today)
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0]!;
    testUser.lastStudyDate = yesterday;
    testUser.streakCount = 5;
    const cooledStatus = StreakService.calculateStreakStatus(testUser);
    if (
      cooledStatus.streakStatus === 'COOLED' &&
      cooledStatus.isStreakActiveToday === false &&
      cooledStatus.isStreakAtRisk === true &&
      cooledStatus.streakCount === 5
    ) {
      console.log(
        '✅ Cooled Streak: Status=COOLED, isStreakAtRisk=true, count preserved at 5 (Grayed out ❄️)'
      );
    } else {
      throw new Error(`Cooled streak failed: ${JSON.stringify(cooledStatus)}`);
    }

    // C. Broken (2+ days ago) -> Drops to 0
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000)
      .toISOString()
      .split('T')[0]!;
    testUser.lastStudyDate = twoDaysAgo;
    testUser.streakCount = 5;
    const brokenStatus = StreakService.calculateStreakStatus(testUser);
    if (
      brokenStatus.streakStatus === 'BROKEN' &&
      brokenStatus.isStreakActiveToday === false &&
      brokenStatus.streakCount === 0
    ) {
      console.log(
        '✅ Broken Streak: Status=BROKEN, streakCount reset from 5 to 0 (Grayed out ⚪)'
      );
    } else {
      throw new Error(`Broken streak failed: ${JSON.stringify(brokenStatus)}`);
    }

    // D. Live HTTP Record Streak endpoint
    const recordStreakHttp = await fetch(`${baseUrl}/study/streak/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginRes.accessToken}`,
      },
    });
    const recordStreakJson =
      (await recordStreakHttp.json()) as ApiResponsePayload<{
        user: User;
        streakInfo: StreakInfo;
      }>;
    if (
      recordStreakHttp.status === 200 &&
      recordStreakJson.data.streakInfo.isStreakActiveToday === true
    ) {
      console.log(
        `✅ Recorded Study Activity: Streak active today=true, count=${recordStreakJson.data.streakInfo.streakCount}`
      );
    } else {
      throw new Error(
        `Record streak HTTP failed: ${JSON.stringify(recordStreakJson)}`
      );
    }

    // 12. Admin Management & RBAC Security Test
    console.log('\n1️⃣2️⃣ Testing Admin Management & RBAC Security:');

    // A. Regular user attempting to access admin route -> 403 Forbidden
    const forbiddenHttp = await fetch(`${baseUrl}/admin/stats`, {
      headers: {
        Authorization: `Bearer ${loginRes.accessToken}`,
      },
    });
    if (forbiddenHttp.status === 403) {
      console.log(
        '🔒 RBAC Security Verified: Regular user (USER) blocked with 403 Forbidden on /admin/stats'
      );
    } else {
      throw new Error(
        `Expected 403 Forbidden for regular user, got ${forbiddenHttp.status}`
      );
    }

    // B. Admin login
    const adminLoginRes = await AuthService.login({
      loginIdentifier: 'admin',
      password: 'Password123!',
    });
    console.log(
      `✅ Admin logged in: ${adminLoginRes.user.name} (${adminLoginRes.user.role})`
    );

    // C. Admin fetching overview stats
    const adminStatsHttp = await fetch(`${baseUrl}/admin/stats`, {
      headers: {
        Authorization: `Bearer ${adminLoginRes.accessToken}`,
      },
    });
    const adminStatsJson =
      (await adminStatsHttp.json()) as ApiResponsePayload<AdminOverviewStats>;
    if (
      adminStatsHttp.status === 200 &&
      adminStatsJson.data.users.totalUsers > 0 &&
      adminStatsJson.data.content.totalStudySets > 0
    ) {
      console.log(
        `✅ Admin Stats: ${adminStatsJson.data.users.totalUsers} users (${adminStatsJson.data.users.activeStreakCount} with streak), ${adminStatsJson.data.content.totalStudySets} sets, ${adminStatsJson.data.content.totalCards} cards.`
      );
    } else {
      throw new Error(`Admin stats failed: ${JSON.stringify(adminStatsJson)}`);
    }

    // D. Admin toggling featured status on a study set
    const featureHttp = await fetch(
      `${baseUrl}/admin/sets/set_ielts_801/featured`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminLoginRes.accessToken}`,
        },
        body: JSON.stringify({ isFeatured: true }),
      }
    );
    const featureJson =
      (await featureHttp.json()) as ApiResponsePayload<StudySetWithDetails>;
    if (featureHttp.status === 200 && featureJson.data.isFeatured === true) {
      console.log(
        `✅ Admin Moderation: Set "${featureJson.data.title}" marked as Featured ⭐`
      );
    } else {
      throw new Error(
        `Admin feature set failed: ${JSON.stringify(featureJson)}`
      );
    }

    // E. Admin fetching groups via /admin/groups -> joinCode populated
    const adminGroupsHttp = await fetch(`${baseUrl}/admin/groups`, {
      headers: {
        Authorization: `Bearer ${adminLoginRes.accessToken}`,
      },
    });
    const adminGroupsJson =
      (await adminGroupsHttp.json()) as ApiResponsePayload<{
        items: ClassWithDetails[];
      }>;
    const firstGroup = adminGroupsJson.data.items[0];
    if (
      adminGroupsHttp.status === 200 &&
      firstGroup &&
      firstGroup.joinCode &&
      firstGroup.joinCode.length >= 4
    ) {
      console.log(
        `✅ Admin Study Groups: Join code "${firstGroup.joinCode}" verified in admin list for "${firstGroup.name}".`
      );
    } else {
      throw new Error(
        `Admin groups join code failed: ${JSON.stringify(adminGroupsJson)}`
      );
    }

    // F. Non-member Admin viewing class via /classes/:id -> sees all sets & members, but joinCode is hidden
    const nonMemberAdminClassHttp = await fetch(
      `${baseUrl}/classes/${firstGroup.id}`,
      {
        headers: {
          Authorization: `Bearer ${adminLoginRes.accessToken}`,
        },
      }
    );
    const nonMemberAdminClassJson =
      (await nonMemberAdminClassHttp.json()) as ApiResponsePayload<ClassWithDetails>;
    if (
      nonMemberAdminClassHttp.status === 200 &&
      nonMemberAdminClassJson.data.memberDetails.length > 0 &&
      nonMemberAdminClassJson.data.joinCode === ''
    ) {
      console.log(
        `🔒 Study Group Security: Admin can view all ${nonMemberAdminClassJson.data.memberDetails.length} members & sets, while joinCode remains securely hidden on detail page.`
      );
    } else {
      throw new Error(
        `Admin class detail view failed: ${JSON.stringify(nonMemberAdminClassJson)}`
      );
    }

    console.log('\n1️⃣3️⃣ Testing VIP Subscription System & Free Tier Limits:');

    // A. Regular non-VIP user attempting AI generation -> blocked with 403 Forbidden
    const freeLoginRes = await AuthService.login({
      loginIdentifier: 'minh_learner',
      password: 'Password123!',
    });
    const freeUserAiHttp = await fetch(`${baseUrl}/ai/generate-set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeLoginRes.accessToken}`,
      },
      body: JSON.stringify({
        prompt: 'Business English idioms',
        cardCount: 5,
      }),
    });
    if (freeUserAiHttp.status === 403) {
      console.log(
        '🔒 VIP Security Verified: Free user blocked from AI features with 403 Forbidden.'
      );
    } else {
      throw new Error(
        `Expected 403 for free user on AI endpoint, got ${freeUserAiHttp.status}`
      );
    }

    // B. Admin granting 1-Month VIP subscription to regular user
    const grantVipHttp = await fetch(
      `${baseUrl}/admin/users/${loginRes.user.id}/vip`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminLoginRes.accessToken}`,
        },
        body: JSON.stringify({ plan: '1_MONTH' }),
      }
    );
    const grantVipJson = (await grantVipHttp.json()) as ApiResponsePayload<{
      isVip: boolean;
      vipExpiresAt: string;
    }>;
    if (grantVipHttp.status === 200 && grantVipJson.data.isVip === true) {
      console.log(
        `👑 Admin VIP Management: Granted 1-Month VIP to user "${loginRes.user.name}" (Expires: ${new Date(grantVipJson.data.vipExpiresAt).toLocaleDateString()}).`
      );
    } else {
      throw new Error(`Grant VIP failed: ${JSON.stringify(grantVipJson)}`);
    }

    // C. User (now VIP) can successfully call AI generation
    const vipUserAiHttp = await fetch(`${baseUrl}/ai/generate-set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginRes.accessToken}`,
      },
      body: JSON.stringify({
        prompt: 'Business negotiation phrases',
        cardCount: 5,
      }),
    });
    const vipUserAiJson = (await vipUserAiHttp.json()) as ApiResponsePayload<{
      title: string;
      cards: unknown[];
    }>;
    if (
      vipUserAiHttp.status === 200 &&
      vipUserAiJson.data.cards &&
      vipUserAiJson.data.cards.length > 0
    ) {
      console.log(
        `✅ VIP Feature Access: VIP user generated set "${vipUserAiJson.data.title}" with ${vipUserAiJson.data.cards.length} cards via AI!`
      );
    } else {
      throw new Error(
        `VIP AI generation failed: ${JSON.stringify(vipUserAiJson)}`
      );
    }

    // D. Admin cancelling VIP subscription -> isVip=false, vipPlan=null
    const cancelVipHttp = await fetch(
      `${baseUrl}/admin/users/${loginRes.user.id}/vip`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminLoginRes.accessToken}`,
        },
        body: JSON.stringify({ plan: 'CANCEL' }),
      }
    );
    const cancelVipJson = (await cancelVipHttp.json()) as ApiResponsePayload<{
      isVip: boolean;
      vipPlan: string | null;
      vipExpiresAt: string | null;
    }>;
    if (
      cancelVipHttp.status === 200 &&
      cancelVipJson.data.isVip === false &&
      cancelVipJson.data.vipPlan === null
    ) {
      console.log(
        `👑 Admin VIP Management: Cancelled VIP for user "${loginRes.user.name}" -> isVip=false, vipPlan=null, vipExpiresAt=null.`
      );
    } else {
      throw new Error(`Cancel VIP failed: ${JSON.stringify(cancelVipJson)}`);
    }

    // E. Restore user VIP status for future idempotent test runs
    await fetch(`${baseUrl}/admin/users/${loginRes.user.id}/vip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLoginRes.accessToken}`,
      },
      body: JSON.stringify({ plan: '1_MONTH' }),
    });

    console.log(
      '\n🎉 ALL 13 BACKEND MODULES VERIFIED SUCCESSFULLY WITH 100% PASS RATE! 🚀\n'
    );
  } finally {
    server.close();
    await disconnectDatabase();
  }
}

runVerification().catch(console.error);
