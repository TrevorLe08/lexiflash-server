import { Folder } from '../../types/folder.types.js';

export const initialFoldersSeed: Folder[] = [
  {
    id: 'fld_ielts_prep_01',
    title: 'IELTS Academic Master 2026',
    description:
      'Tổng hợp tất cả các bộ từ vựng, collocation và idioms cho kì thi IELTS.',
    creatorId: 'usr_alex_001',
    studySetIds: ['set_ielts_801', 'set_idioms_803'],
    createdAt: '2026-01-16T09:00:00.000Z',
    updatedAt: '2026-01-16T09:00:00.000Z',
  },
  {
    id: 'fld_workplace_02',
    title: 'Tiếng Anh Công Sở & Giao Tiếp',
    description: 'Từ vựng & mẫu câu đàm phán, email chuyên nghiệp.',
    creatorId: 'usr_alex_001',
    studySetIds: ['set_business_802'],
    createdAt: '2026-01-22T10:00:00.000Z',
    updatedAt: '2026-01-22T10:00:00.000Z',
  },
  {
    id: 'fld_daily_english_03',
    title: 'Daily English & Travel Master Series',
    description:
      'Bộ từ vựng giao tiếp Oxford 3000 và tiếng Anh du lịch dành cho người mới bắt đầu đến trung cấp.',
    creatorId: 'usr_sarah_003',
    studySetIds: ['set_oxford_805', 'set_travel_808'],
    createdAt: '2026-02-14T10:00:00.000Z',
    updatedAt: '2026-02-14T10:00:00.000Z',
  },
];
