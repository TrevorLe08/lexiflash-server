# 🚀 LexiFlash Server - Backend RESTful API

Hệ thống Backend RESTful API hiệu năng cao cho nền tảng học từ vựng tiếng Anh **LexiFlash**, tích hợp dịch vụ gửi mail qua **Nodemailer (Gmail SMTP)** với logo thương hiệu nhúng chuẩn CID, bộ tạo thẻ tự động **Google Gemini AI**, cơ chế bộ nhớ đệm kép **SyncedMap O(1) Cache & MongoDB Atlas**, cùng hệ thống phân quyền quản trị **RBAC Admin Control Center**.

### (DỰ ÁN PHỤC VỤ CHO VIỆC HỌC TIẾNG ANH)
---

## 📋 Mục Lục
- [1. Kiến Trúc & Công Nghệ](#1-kiến-trúc--công-nghệ)
- [2. Cấu Trúc Thư Mục](#2-cấu-trúc-thư-mục)
- [3. Cấu Hình Biến Môi Trường (.env)](#3-cấu-hình-biến-môi-trường-env)
- [4. Cài Đặt & Khởi Chạy Môi Trường Cục Bộ](#4-cài-đặt--khởi-chạy-môi-trường-cục-bộ)
- [5. Danh Sách API Endpoints Chính](#5-danh-sách-api-endpoints-chính)
- [6. Tài Khoản Mặc Định (Test Accounts)](#6-tài-khoản-mặc-định-test-accounts)
- [7. Hướng Dẫn Deploy Backend (Render & Railway)](#7-hướng-dẫn-deploy-backend-render--railway)

---

## 1. Kiến Trúc & Công Nghệ

- **Runtime & Framework:** Node.js (ES Modules), Express 5.
- **Ngôn ngữ:** TypeScript strictly-typed.
- **Database & Persistence:**
  - **MongoDB Atlas:** Lưu trữ bền vững đám mây với Mongoose ODM.
  - **SyncedMap Cache:** Lớp bộ nhớ đệm O(1) in-memory mở rộng từ JavaScript `Map`, tự động ghi dữ liệu bất đồng bộ (write-through) vào MongoDB.
- **Dịch Vụ Gửi Email (Email Service):**
  - **Nodemailer:** Tích hợp Gmail SMTP chuẩn hóa với Google App Password.
  - **Template Mail Hiện Đại:** Giao diện Light Theme, đính kèm `logo.png` dạng **CID inline attachment** (`cid:lexiflash-logo`) đảm bảo hiển thị sắc nét trên mọi trình đọc mail mà không bị chặn ảnh.
- **Bảo Mật & Xác Thực:**
  - JWT Token cặp đôi (*Access Token 15 phút, Refresh Token 7 ngày*).
  - Bcrypt mã hóa mật khẩu 10 salt rounds.
  - CORS strictly configured, Request Body Sanitization, Zod Schema Validation.
  - Role-based Access Control (RBAC): `USER`, `ADMIN`.
- **Tích Hợp AI:** Google Gemini API (`gemini-3.1-flash-lite`) tạo bộ thẻ học phần tự động theo chủ đề và giải nghĩa ngữ cảnh từ vựng.

---

## 2. Cấu Trúc Thư Mục

```
server/
├── src/
│   ├── asset/              # Tài nguyên hình ảnh tĩnh (logo.png cho email)
│   ├── config/             # Cấu hình hằng số hệ thống, enum, env
│   ├── controllers/        # Điều hướng và xử lý HTTP Request/Response
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── studySet.controller.ts
│   │   ├── card.controller.ts
│   │   ├── study.controller.ts
│   │   ├── folder.controller.ts
│   │   ├── class.controller.ts
│   │   ├── admin.controller.ts
│   │   ├── search.controller.ts
│   │   ├── match.controller.ts
│   │   ├── test.controller.ts
│   │   └── ai.controller.ts
│   ├── db/                 # SyncedMap cache, kết nối Mongo, dữ liệu mẫu seeds
│   │   ├── mockDb.ts       # Cache in-memory O(1) + Write-through Mongo sync
│   │   ├── mongo.ts        # Kết nối MongoDB Atlas
│   │   └── seeds/          # Dữ liệu khởi tạo (Users, Sets, Cards, Classes...)
│   ├── middlewares/        # Middlewares xác thực JWT, RBAC, bắt lỗi tập trung
│   ├── models/             # Mongoose Models (Schemas & Collections)
│   ├── routes/             # Định tuyến API v1
│   ├── services/           # Nghiệp vụ xử lý (Mail, AI, Search, Admin, User...)
│   │   └── mail.service.ts # Dịch vụ gửi mail khôi phục mật khẩu qua Nodemailer
│   ├── types/              # Định nghĩa TypeScript Interfaces & Types
│   ├── utils/              # Chuẩn hóa ApiResponse, ApiError, Pagination
│   ├── server.ts           # Entrypoint Express server
│   └── verify_all.ts       # Suite kiểm thử tích hợp
├── dist/                   # Output sau khi build TypeScript (tsc)
├── package.json
└── tsconfig.json
```

---

## 3. Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` tại thư mục `server/`:

```env
# Cổng chạy server & Môi trường
PORT=5000
NODE_ENV=development

# URL Frontend (CORS Policy)
CLIENT_URL=http://localhost:3000

# Khóa bí mật ký JWT Tokens
JWT_ACCESS_SECRET=lexiflash_super_secret_access_key_2026_jwt_token_secure
JWT_REFRESH_SECRET=lexiflash_super_secret_refresh_key_2026_jwt_token_secure
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Tích hợp AI (Google Gemini API Key)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-3.1-flash-lite

# Kết nối MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/lexiflash?retryWrites=true&w=majority

# Cấu hình Dịch Vụ Gửi Email (Nodemailer Gmail SMTP)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM_NAME=LexiFlash Support
EMAIL_FROM=your_email@gmail.com
```

---

## 4. Cài Đặt & Khởi Chạy Môi Trường Cục Bộ

### 4.1. Cài đặt thư viện:
```bash
cd server
npm install
```

### 4.2. Khởi chạy môi trường phát triển (Development):
```bash
npm run dev
```
> Server sẽ tự động lắng nghe tại `http://localhost:5000`, tự động reload khi sửa code qua `tsx watch`.

### 4.3. Chạy kiểm thử hệ thống:
```bash
npm test
```

### 4.4. Biên dịch & Chạy Production:
```bash
npm run build
npm start
```

---

## 5. Danh Sách API Endpoints Chính (`/api/v1`)

### 🔐 Xác Thực (Authentication - `/auth`)
- `POST /api/v1/auth/register` - Đăng ký tài khoản mới.
- `POST /api/v1/auth/login` - Đăng nhập nhận Access Token & Refresh Token.
- `POST /api/v1/auth/refresh-token` - Làm mới Access Token.
- `POST /api/v1/auth/forgot-password` - Gửi email chứa liên kết khôi phục mật khẩu.
- `POST /api/v1/auth/reset-password` - Đặt lại mật khẩu mới bằng token khôi phục.
- `GET /api/v1/auth/me` - Lấy thông tin người dùng hiện tại.

### 👤 Người Dùng (Users - `/users`)
- `PUT /api/v1/users/profile` - Cập nhật thông tin cá nhân.
- `POST /api/v1/users/change-email` - Yêu cầu đổi địa chỉ email.
- `POST /api/v1/users/change-password` - Đổi mật khẩu.

### 📚 Học Phần & Từ Vựng (`/study-sets`, `/cards`)
- `GET /api/v1/study-sets` - Lấy danh sách học phần (phân trang, lọc tag).
- `GET /api/v1/study-sets/:id` - Chi tiết học phần & danh sách thẻ.
- `POST /api/v1/study-sets` - Tạo học phần mới.
- `PUT /api/v1/study-sets/:id` - Cập nhật học phần & thẻ.
- `DELETE /api/v1/study-sets/:id` - Xóa học phần.
- `POST /api/v1/cards/bulk` - Nhập từ vựng hàng loạt từ file Excel/CSV.

### 🤖 Trí Tuệ Nhân Tạo (Google Gemini AI - `/ai`)
- `POST /api/v1/ai/generate-set` - Tự động tạo bộ thẻ từ vựng song ngữ theo chủ đề.
- `POST /api/v1/ai/explain-term` - Giải thích chi tiết từ vựng và ngữ cảnh.

### 🛡️ Quản Trị Hệ Thống (Admin Control Center - `/admin`)
- `GET /api/v1/admin/stats` - Thống kê KPI tổng quan.
- `GET /api/v1/admin/users` - Quản lý danh sách người dùng.
- `PATCH /api/v1/admin/users/:id/role` - Đổi vai trò (`ADMIN` / `USER`).
- `PATCH /api/v1/admin/users/:id/ban` - Khóa/Mở khóa tài khoản.
- `POST /api/v1/admin/users/:id/vip` - Cấp/Hủy gói VIP.

---

## 6. Tài Khoản Mặc Định (Test Accounts)

| Vai trò | Email / Username | Mật khẩu | Đặc quyền |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin@example.com` / `letranminhtriet2307@gmail.com` | `Password123!` | Toàn quyền Dashboard `/admin`, quản lý User/VIP, duyệt nội dung |
| **Người dùng VIP** | `alex@example.com` (`alex_ielts`) | `Password123!` | Không giới hạn tính năng AI Generator, tính năng nâng cao |
| **Người dùng thường** | `sarah@example.com` (`sarah_learner`) | `Password123!` | Trải nghiệm đầy đủ các chế độ học |

---

## 7. Hướng Dẫn Deploy Backend (Render & Railway)

### 🟢 Cách 1: Deploy lên Render.com (Miễn phí & Phổ biến nhất)
1. Đăng ký/Đăng nhập [Render.com](https://render.com).
2. Nhấn **New +** ➔ Chọn **Web Service**.
3. Kết nối với Repository GitHub của bạn.
4. Cấu hình dự án:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start` (hoặc `node dist/server.js`)
5. Thêm các **Environment Variables** (Biến môi trường):
   - `PORT`: `5000` (hoặc Render tự cấp)
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `https://<ten-app-frontend-cua-ban>.vercel.app`
   - `MONGODB_URI`: `<URL_MongoDB_Atlas_cua_ban>`
   - `JWT_ACCESS_SECRET`: `<Chuoi_bi_mat_access>`
   - `JWT_REFRESH_SECRET`: `<Chuoi_bi_mat_refresh>`
   - `GEMINI_API_KEY`: `<Google_Gemini_API_Key>`
   - `GMAIL_USER`: `<Gmail_gui_mail>`
   - `GMAIL_APP_PASSWORD`: `<Mat_khau_ung_dung_16_ky_tu>`
6. Nhấn **Create Web Service**. Sau khi deploy xong, bạn sẽ có Web Service URL dạng: `https://lexiflash-backend.onrender.com`.

### 🟣 Cách 2: Deploy lên Railway.app
1. Đăng nhập [Railway.app](https://railway.app).
2. Tạo **New Project** ➔ Chọn **Deploy from GitHub repo**.
3. Chọn repo `lexiflash`, cấu hình **Root Directory** là `/server`.
4. Thiết lập **Variables** đầy đủ giống như Render.
5. Railway sẽ tự động phát hiện `package.json`, chạy `npm run build` và khởi chạy `npm start`.
