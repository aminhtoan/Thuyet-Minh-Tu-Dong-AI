# Multilingual AI Narration

Hệ thống thuyết minh tự động đa ngôn ngữ.

## Overview

Ứng dụng Web và Mobile được định hướng để quản lý quy trình tạo thuyết minh đa ngôn ngữ cho video và audio. Sprint hiện tại chỉ thiết lập frontend foundation; backend và AI được lập kế hoạch riêng.

## Main Flow

Upload → Speech-to-Text → Translation → TTS → Media Processing → Result

## Tech Stack

Web: React + TypeScript + Vite

Mobile: React Native + TypeScript + Expo

Backend: Planned separately

## Repository Structure

```text
docs/
frontend-web/
frontend-mobile/
```

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
- [UI specification](docs/UI.md)
- [Proposed API contract](docs/API.md)
- [Project progress](docs/PROGRESS.md)
