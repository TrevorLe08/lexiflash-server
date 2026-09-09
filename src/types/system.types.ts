export type BannerColor =
  'red' | 'amber' | 'emerald' | 'blue' | 'purple' | 'cyan' | 'dark';

export interface BannerNotificationConfig {
  id: string;
  isEnabled: boolean;
  message: string;
  color: BannerColor;
  linkUrl?: string;
  linkText?: string;
  updatedAt: string;
}

export const DEFAULT_BANNER_NOTIFICATION: BannerNotificationConfig = {
  id: 'banner_init',
  isEnabled: false,
  message: '',
  color: 'blue',
  linkUrl: '',
  linkText: '',
  updatedAt: new Date().toISOString(),
};

export interface MaintenanceConfig {
  isActive: boolean;
  title: string;
  message: string;
  estimatedEndTime?: string;
  updatedAt: string;
}

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  isActive: false,
  title: 'Hệ thống đang bảo trì nâng cấp',
  message:
    'LexiFlash đang thực hiện bảo trì định kỳ để tối ưu hóa hiệu năng và cập nhật tính năng mới. Xin vui lòng quay lại sau ít phút!',
  estimatedEndTime: '',
  updatedAt: new Date().toISOString(),
};
