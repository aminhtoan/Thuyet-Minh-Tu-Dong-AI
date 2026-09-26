# Multilingual AI Narration

Hệ thống thuyết minh tự động đa ngôn ngữ.

## Overview

S1–S5 đã xây dựng UI Customer Web/Mobile: đăng nhập/đăng ký mock, Dashboard, Projects và New Project với upload mô phỏng. S6 chuẩn hóa kiến trúc full-stack; S7–S10 bổ sung Transcript Editor, Translation Editor, cấu hình Voice/TTS và tiến độ Generate/Processing với dữ liệu và dịch vụ mock. Preview giọng nói và processing chỉ mô phỏng; chưa tạo âm thanh hoặc video kết quả. S12 bổ sung Admin Web foundation riêng với dữ liệu mock. Chưa có backend, database connection hay AI processing thật.

## Main Flow

Upload → Speech-to-Text → Transcript Editing → Translation Editing → Voice/TTS → Media Processing → Result

## Tech Stack

Customer Web: React + TypeScript + Vite

Customer Mobile: React Native + TypeScript + Expo SDK 57

Admin Web (S12 foundation): React + TypeScript + Vite, ứng dụng riêng

Backend (planned S17): Node.js + Express.js + TypeScript

Database (planned): MongoDB + Mongoose; JWT/RBAC sẽ được triển khai ở sprint backend/auth tương ứng.

## Repository Structure

```text
docs/
frontend-web/      # Customer Web — implemented
frontend-mobile/   # Customer Mobile — implemented
admin-web/         # Admin Web — S12 mock foundation
backend/           # planned S17; not created yet
```

Admin Web không nằm trong Customer Web. Cả ba client dự kiến dùng chung REST API `/api` của backend; các ứng dụng/thư mục được ghi “planned” chưa có lệnh chạy. Xem [kiến trúc hệ thống](docs/ARCHITECTURE.md) và [trạng thái sprint](docs/PROGRESS.md).

## Web Development

```bash
cd frontend-web
npm install
npm run dev
```

Các lệnh validation: `npm run lint`, `npm run typecheck`, `npm run build`.

## Mobile Development

```bash
cd frontend-mobile
npm install
npx expo start
```

Expo CLI sẽ hiển thị QR code. Cài Expo Go tương thích với Expo SDK 57 trên điện thoại Android, kết nối điện thoại và máy tính cùng mạng Wi-Fi, rồi dùng chức năng quét QR trong Expo Go. Ứng dụng mở vào Dashboard và có tab Projects; các route `/login` và `/register` vẫn hiện diện trong app.

Nếu điện thoại không truy cập được máy tính qua LAN, dừng server và chạy:

```bash
npx expo start --tunnel
```

Tunnel có thể cần cài `@expo/ngrok` và kết nối Internet. Expo Go trên iPhone từ App Store hiện không hỗ trợ SDK 57; để thử trên iPhone thật cần một bản Expo Go tương thích được phân phối riêng, hoặc development build. Xem [hướng dẫn Expo Go theo SDK](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/).

Các lựa chọn chạy emulator/simulator hoặc Web: `npm run android`, `npm run ios`, `npm run web`.

Các lệnh validation: `npm run lint`, `npx tsc --noEmit`.

## Documentation

- [Project context](docs/CONTEXT.md)
- [System architecture](docs/ARCHITECTURE.md)
- [UI specification](docs/UI.md)
- [Current API status and proposed contract](docs/API.md)
- [Project progress](docs/PROGRESS.md)

## Result & History (S11)

Web/Mobile đã có Result metadata và History dùng dữ liệu mock trong phiên. Hoàn tất Generate → View Result; mở lại qua Projects, Dashboard hoặc History. Reload sẽ xóa dữ liệu đã lưu trong phiên. Chưa có file audio/video kết quả hoặc download thực.

Kiểm tra service cả hai client từ `frontend-web`: `node scripts/verify-processing.mjs`.

### Web production preview

Trong thư mục `frontend-web`, chạy:

```bash
npm run build
npm run preview
```

Không cần cài Vite global hay gọi trực tiếp `vite preview` trong PowerShell. Dùng URL được in ra. Chạy phát triển bằng `npm run dev`.

Customer S11.5 và Admin S12 đã hoàn tất. Tiếp theo: **S14 Admin Customer Management**, chưa triển khai.

## Admin Web Development (S12)

```bash
cd admin-web
npm install
npm run dev
```

Admin: **http://localhost:5174** (strict port). Customer vẫn dùng **http://localhost:5173** với các lệnh Web Development phía trên. Backend tương lai: http://localhost:8080/api, chưa tồn tại.

Routes: /login, /dashboard, /users, /projects, /jobs, /languages, /voices, /logs, /settings. / chuyển đến Dashboard. Đây là preview public; login chỉ kiểm tra email/mật khẩu mô phỏng rồi chuyển trang, không xác thực, không lưu mật khẩu/token. Không nhập thông tin thật.

S13 Dashboard dùng service mock bất đồng bộ tập trung, hỗ trợ Làm mới, loading/error/retry/empty; trang quản lý vẫn là placeholder S14–S16. Không có JWT/RBAC/API. .env.example chỉ chuẩn bị URL public.

Validation: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`. Build preview: `npm run preview` sau build (cổng 4174).

Browser regression: `node scripts/verify-browser.mjs` trong admin-web; cần Vite 127.0.0.1:5174 và Chrome profile tạm riêng với remote debugging 127.0.0.1:9223. Kiểm tra login, routes/refresh, drawer, responsive, không lưu credentials và không gọi API.
