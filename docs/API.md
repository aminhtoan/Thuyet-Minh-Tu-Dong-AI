# Proposed API Contract

> **Warning:** Đây chỉ là proposed API. Backend contract chưa được xem là final.

## Configuration

API base URL phải đến từ environment variables. Không hard-code API URL trong component.

## Proposed Resources

- User
- Auth
- Project
- Media
- Transcript
- Translation
- Voice
- ProcessingJob
- Result

## Proposed Endpoints

```text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /projects
POST   /projects
GET    /projects/:id
DELETE /projects/:id

POST   /projects/:id/upload
POST   /projects/:id/transcribe
GET    /projects/:id/transcript
PUT    /projects/:id/transcript

POST   /projects/:id/translate
GET    /projects/:id/translations
PUT    /projects/:id/translations/:language

GET    /voices
POST   /projects/:id/voice-preview
POST   /projects/:id/generate-audio

POST   /projects/:id/generate
GET    /projects/:id/status
GET    /projects/:id/result
```

## Processing Status

```text
UPLOADED
TRANSCRIBING
TRANSCRIBED
TRANSLATING
TRANSLATED
GENERATING_AUDIO
PROCESSING_VIDEO
COMPLETED
FAILED
```
