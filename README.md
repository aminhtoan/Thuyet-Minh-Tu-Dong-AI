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
npm start
```

Các lựa chọn chạy thiết bị: `npm run android`, `npm run ios`, `npm run web`.

Các lệnh validation: `npm run lint`, `npm run typecheck`.

## Documentation

- [Project context](docs/CONTEXT.md)
- [UI specification](docs/UI.md)
- [Proposed API contract](docs/API.md)
- [Project progress](docs/PROGRESS.md)
