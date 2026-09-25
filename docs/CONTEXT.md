# Multilingual AI Narration System

## Project

Vietnamese: Hệ thống thuyết minh tự động đa ngôn ngữ

English: Multilingual AI Narration System

Repository: `multilingual-ai-narration`

## Goal

Xây dựng hệ thống Web và Mobile cho phép:

Upload Video/Audio → Speech-to-Text → Transcript Editing → Translation → Translation Editing → Voice Selection → Text-to-Speech → Media Processing → Result Preview → Download → Project History

## Frontend Stack

Web: React, TypeScript, Vite

Mobile: React Native, TypeScript, Expo

## Architecture

```text
React Web ─────┐
               ├── REST API / SSE / WebSocket
React Native ──┘               │
                            Backend
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      Speech-to-Text      Translation           TTS
             └─────────────────┼─────────────────┘
                               ▼
                       Media Processing
                               ▼
                       Video/Audio Result
```

## Frontend Responsibilities

- UI/UX and navigation
- Authentication UI and project management
- Media upload, transcript and translation editors
- Voice selection, processing status, result preview and history
- API integration and error handling

Frontend không chứa AI processing logic.

## Development Rules

- TypeScript strict; không dùng `any` tùy tiện.
- Không hard-code API URL hoặc secrets.
- Ưu tiên reusable components.
- Xử lý loading/error/empty state khi phù hợp.
- Web và Mobile dùng chung API contract, không bắt buộc dùng chung UI components.
- Không rewrite code hoạt động nếu không cần.
- Không đánh dấu Sprint `COMPLETED` nếu validation quan trọng fail.
