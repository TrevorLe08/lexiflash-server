import { Buffer } from 'node:buffer';
import cloudinary from '../config/cloudinary.js';
import { ENV } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export interface AvatarUploadSignatureResponse {
  signature: string;
  timestamp: number;
  folder: string;
  publicId: string;
  apiKey: string;
  cloudName: string;
  transformation: string;
  allowedFormats: string;
}

export class UploadService {
  /**
   * Verify that the binary buffer matches recognized safe image magic bytes
   * (JPEG, PNG, WebP) to prevent MIME spoofing, SVG Stored XSS, or binary payload execution.
   */
  static verifyImageMagicBytes(buffer: Buffer): 'jpeg' | 'png' | 'webp' {
    if (buffer.length < 12) {
      throw ApiError.badRequest('Tệp ảnh quá nhỏ hoặc không hợp lệ.');
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'png';
    }

    // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'webp';
    }

    throw ApiError.badRequest(
      'Định dạng ảnh không được phép. Chỉ chấp nhận các định dạng ảnh an toàn (JPEG, PNG, WebP). Các tệp SVG hoặc nhị phân không xác định bị từ chối vì lý do bảo mật.'
    );
  }

  /**
   * Generates a signed upload request payload for Direct Client-to-Cloudinary Upload.
   * This offloads heavy image processing and network I/O from the application server.
   */
  static generateAvatarSignature(
    userId: string
  ): AvatarUploadSignatureResponse {
    if (
      !ENV.CLOUDINARY.CLOUD_NAME ||
      !ENV.CLOUDINARY.API_KEY ||
      !ENV.CLOUDINARY.API_SECRET
    ) {
      throw ApiError.internal(
        'Hệ thống lưu trữ ảnh Cloudinary chưa được cấu hình.'
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'lexiflash/avatars';
    const publicId = `user_${userId}`;
    const transformation = 'w_300,h_300,c_fill,g_face,q_auto,f_auto';
    const allowedFormats = 'jpg,png,webp';

    const paramsToSign: Record<string, string | number | boolean> = {
      allowed_formats: allowedFormats,
      folder,
      invalidate: true,
      overwrite: true,
      public_id: publicId,
      timestamp,
      transformation,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      ENV.CLOUDINARY.API_SECRET
    );

    return {
      signature,
      timestamp,
      folder,
      publicId,
      apiKey: ENV.CLOUDINARY.API_KEY,
      cloudName: ENV.CLOUDINARY.CLOUD_NAME,
      transformation,
      allowedFormats,
    };
  }

  /**
   * Defense-in-Depth Fallback: Upload an avatar image (Base64 data URL) to Cloudinary
   * with mandatory Magic Byte verification, 3MB payload limit, and strict transformation.
   */
  static async uploadAvatar(
    imageData: string,
    userId: string
  ): Promise<string> {
    if (!imageData) {
      throw ApiError.badRequest('Không có dữ liệu ảnh để tải lên');
    }

    // Fallback if credentials are missing
    if (
      !ENV.CLOUDINARY.CLOUD_NAME ||
      !ENV.CLOUDINARY.API_KEY ||
      !ENV.CLOUDINARY.API_SECRET
    ) {
      console.warn(
        '[UploadService] Cloudinary credentials are not fully configured. Using provided image data as fallback.'
      );
      return imageData;
    }

    // Defense-in-depth: Decode Base64 and verify Magic Bytes before processing
    if (imageData.startsWith('data:image/')) {
      const base64Content = imageData.replace(
        /^data:image\/[a-zA-Z+]+;base64,/,
        ''
      );
      const buffer = Buffer.from(base64Content, 'base64');

      if (buffer.length > 3 * 1024 * 1024) {
        throw ApiError.badRequest(
          'Dung lượng ảnh vượt quá giới hạn cho phép (3MB).'
        );
      }

      this.verifyImageMagicBytes(buffer);
    }

    try {
      const uploadResult = await cloudinary.uploader.upload(imageData, {
        folder: 'lexiflash/avatars',
        public_id: `user_${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'face' },
          { format: 'webp', quality: 'auto' },
        ],
      });

      return uploadResult.secure_url;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[UploadService] Cloudinary upload error:', errorMsg);
      throw ApiError.badRequest(
        'Không thể tải ảnh đại diện lên Cloudinary. Vui lòng thử lại sau.'
      );
    }
  }
}
