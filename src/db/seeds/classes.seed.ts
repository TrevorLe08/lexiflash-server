import { ClassRole } from '../../config/constants.js';
import { ClassGroup } from '../../types/class.types.js';

export const initialClassesSeed: ClassGroup[] = [
  {
    id: 'cls_eng_master_01',
    name: 'IELTS Intensive 8.0+ Class',
    description:
      'Lớp luyện thi IELTS chuyên sâu với bộ đề và từ vựng mới nhất cập nhật 2026.',
    schoolName: 'Oxford English Academy',
    creatorId: 'usr_alex_001',
    joinCode: 'IELTS80',
    allowMemberAddSets: true,
    allowMemberInvite: true,
    members: [
      {
        userId: 'usr_alex_001',
        role: ClassRole.ADMIN,
        joinedAt: '2026-01-10T08:00:00.000Z',
      },
      {
        userId: 'usr_minh_002',
        role: ClassRole.MEMBER,
        joinedAt: '2026-02-02T14:00:00.000Z',
      },
      {
        userId: 'usr_sarah_003',
        role: ClassRole.MEMBER,
        joinedAt: '2026-02-04T09:00:00.000Z',
      },
    ],
    studySetIds: ['set_ielts_801', 'set_business_802'],
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'cls_oxford_daily_02',
    name: 'Oxford 3000 & Daily Conversation Club',
    description:
      'Câu lạc bộ luyện nói và phản xạ từ vựng tiếng Anh thực tế mỗi ngày cùng cô Sarah Williams.',
    schoolName: 'Cambridge International Language Center',
    creatorId: 'usr_sarah_003',
    joinCode: 'OXFORD26',
    allowMemberAddSets: true,
    allowMemberInvite: true,
    members: [
      {
        userId: 'usr_sarah_003',
        role: ClassRole.ADMIN,
        joinedAt: '2026-01-15T08:00:00.000Z',
      },
      {
        userId: 'usr_alex_001',
        role: ClassRole.MEMBER,
        joinedAt: '2026-01-20T10:00:00.000Z',
      },
      {
        userId: 'usr_minh_002',
        role: ClassRole.MEMBER,
        joinedAt: '2026-02-05T15:00:00.000Z',
      },
    ],
    studySetIds: ['set_oxford_805', 'set_travel_808', 'set_idioms_803'],
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z',
  },
];
