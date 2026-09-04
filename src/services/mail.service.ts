import nodemailer, { Transporter } from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter | null {
    if (!this.transporter && ENV.GMAIL_USER && ENV.GMAIL_APP_PASSWORD) {
      try {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: ENV.GMAIL_USER,
            pass: ENV.GMAIL_APP_PASSWORD,
          },
        });
      } catch (err: any) {
        console.error(
          '❌ [MailService] Failed to initialize nodemailer transporter:',
          err.message
        );
      }
    }
    return this.transporter;
  }

  private static getLogoPath(): string | null {
    const candidates = [
      path.resolve(process.cwd(), 'src/asset/logo.png'),
      path.resolve(process.cwd(), 'server/src/asset/logo.png'),
      path.resolve(process.cwd(), 'dist/asset/logo.png'),
      path.resolve(process.cwd(), 'server/dist/asset/logo.png'),
      path.resolve(__dirname, '../asset/logo.png'),
      path.resolve(__dirname, '../../src/asset/logo.png'),
    ];
    return candidates.find((p) => fs.existsSync(p)) || null;
  }

  static async sendPasswordResetEmail(params: {
    to: string;
    userName: string;
    resetUrl: string;
  }): Promise<boolean> {
    const { to, userName, resetUrl } = params;
    const fromName = ENV.EMAIL_FROM_NAME || 'LexiFlash Support';

    console.log(`📧 [MailService] Preparing to send password reset email to ${to}...`);
    console.log(`🔗 [MailService] Password Reset URL: ${resetUrl}`);

    const transporter = this.getTransporter();

    if (!transporter) {
      console.warn(
        '⚠️ [MailService] GMAIL_USER or GMAIL_APP_PASSWORD is not configured in .env. Password reset email not sent via SMTP. Reset URL printed to console above.'
      );
      return false;
    }

    const logoPath = this.getLogoPath();
    const logoHeaderHtml = logoPath
      ? `<img src="cid:lexiflash-logo" alt="LexiFlash" width="200" style="display: block; margin: 0 auto; max-width: 200px; width: 100%; height: auto; border: 0;" />`
      : `
        <h1 style="margin: 0; color: #4f5fd8; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ LexiFlash</h1>
        <p style="margin: 6px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500;">Nền Tảng Luyện Tiếng Anh & Trí Nhớ Thông Minh</p>
      `;

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khôi phục mật khẩu LexiFlash</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6fb; padding: 40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
          <!-- Header (Nền tím gradient) -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f5fd8 0%, #6366f1 100%); padding: 32px 24px; text-align: center;">
              <a href="${ENV.CLIENT_URL}" target="_blank" style="text-decoration: none; display: inline-block; background-color: #ffffff; padding: 12px 28px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);">
                ${logoHeaderHtml}
              </a>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px; color: #334155;">
              <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700;">Yêu cầu đặt lại mật khẩu</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569;">
                Xin chào <strong style="color: #0f172a;">${userName || 'bạn'}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #475569;">
                Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với địa chỉ email <strong style="color: #4f5fd8;">${to}</strong>.
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #475569;">
                Vui lòng bấm vào nút bên dưới để tiến hành thiết lập mật khẩu mới:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 15px 38px; background: linear-gradient(135deg, #4f5fd8 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 14px rgba(79, 95, 216, 0.35); text-align: center;">
                      🔑 Đặt Lại Mật Khẩu Ngay
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #b45309;">
                  ⚠️ <strong>Lưu ý:</strong> Liên kết này chỉ có hiệu lực trong vòng <strong>15 phút</strong>. Nếu quá thời gian, bạn cần gửi lại yêu cầu.
                </p>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">
                Nếu bạn không gửi yêu cầu này, bạn có thể an tâm bỏ qua email này. Mật khẩu của bạn vẫn an toàn tuyệt đối.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
              © ${new Date().getFullYear()} LexiFlash Platform. Mọi quyền được bảo lưu.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const attachments = logoPath
      ? [
          {
            filename: 'logo.png',
            path: logoPath,
            cid: 'lexiflash-logo',
          },
        ]
      : [];

    try {
      const fromAddress = ENV.EMAIL_FROM || ENV.GMAIL_USER;
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        replyTo: `noreply@lexiflash.com`,
        to,
        subject: '🔑 [LexiFlash] Hướng dẫn đặt lại mật khẩu của bạn',
        html: htmlContent,
        attachments,
      });

      console.log(`✅ [MailService] Password reset email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      console.error(`❌ [MailService] Error sending email to ${to}:`, error.message);
      return false;
    }
  }
}
