# Multilingual AI Narration

Hệ thống thuyết minh tự động đa ngôn ngữ.

## Overview

S1–S5 đã xây dựng UI Customer Web/Mobile: đăng nhập/đăng ký mock, Dashboard, Projects và New Project với upload mô phỏng. S6 chuẩn hóa kiến trúc full-stack; S7–S10 bổ sung Transcript Editor, Translation Editor, cấu hình Voice/TTS và tiến độ Generate/Processing với dữ liệu và dịch vụ mock. Preview giọng nói và processing chỉ mô phỏng; chưa tạo âm thanh hoặc video kết quả. Chưa có backend, Admin Web, database connection hay AI processing thật.

## Main Flow

Upload → Speech-to-Text → Transcript Editing → Translation Editing → Voice/TTS → Media Processing → Result

## Tech Stack

Customer Web: React + TypeScript + Vite

Customer Mobile: React Native + TypeScript + Expo SDK 57

Admin Web (planned S12): React + TypeScript + Vite, ứng dụng riêng

Backend (planned S17): Node.js + Express.js + TypeScript

Database (planned): MongoDB + Mongoose; JWT/RBAC sẽ được triển khai ở sprint backend/auth tương ứng.

## Repository Structure

```text
docs/
frontend-web/      # Customer Web — implemented
frontend-mobile/   # Customer Mobile — implemented
admin-web/         # planned S12; not created yet
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
