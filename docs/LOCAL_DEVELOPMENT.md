# S25.7.4.9 — MongoDB Local Development

## Kết quả kiểm tra chỉ đọc (2026-10-11)

- Không tìm thấy mongod/mongosh trong PATH, thư mục cài Community Server mặc định hoặc tiến trình mongod. MongoDB Community Server: chưa phát hiện; không khẳng định đã rà mọi vị trí cài tùy chỉnh.
- Docker Desktop và docker.exe có trên máy; CLI 28.5.2. Service com.docker.service Stopped, Docker Engine named pipe không tồn tại; Docker hiện chưa dùng được.
- netstat không thấy LISTENING trên 27017/27018. Truy vấn CIM/process executable và Get-NetTCPConnection bị Access denied, đã dùng netstat làm kiểm tra thay thế. Không mở kết nối MongoDB hoặc Atlas.
- Chưa xác minh server Local, auth/RBAC hay chống tunnel/proxy. Production isolation **NOT VERIFIED**.

## Cấu hình đề xuất — chưa triển khai

Database: `multilingual_ai_narration_ui_demo`, khớp allowlist seed hiện tại. Không cần đổi schema/API/allowlist sang `_dev` cho phương án Local này. Guard hiện vẫn chấp nhận remote URI có tên đúng; không phải guard bắt buộc Local, nên phải xác minh endpoint trước khi seed.

Sau khi người dùng duyệt: chọn Docker đang có hoặc cài Community Server theo phê duyệt riêng. Không tự kéo image/cài/khởi động container trong bước này. Nếu Docker, dùng container MongoDB riêng, volume Local riêng, publish chỉ `127.0.0.1:27018`, không bind mọi interface; bật authentication. Không sử dụng volume dữ liệu thật, không mount credential Atlas. Nếu Community Server, dùng instance/data directory/cổng riêng và bind loopback.

Tạo database user demo chỉ readWrite trên Database `_ui_demo`; không dùng tài khoản root cho backend/seed. Chưa tạo user: bước này là kế hoạch, không phải xác nhận auth PASS. Bật auth trước khi dùng; nếu chưa có auth thì chỉ loopback vẫn không ngăn tiến trình khác trên máy ghi dữ liệu.

## Backend Development riêng

Ưu tiên bản sao working directory riêng, với `.env` riêng ngoài Git; không sửa `backend/.env` Atlas hiện tại. env.ts hiện đọc `.env` từ cwd, biến process có ưu tiên nhưng biến thiếu vẫn có thể lấy từ `.env` cũ. Không chỉ đổi PORT rồi vô tình dùng lại Atlas/JWT secret.

Template cấu hình cho bản sao backend (placeholder không phải secret thực):

```dotenv
NODE_ENV=development
PORT=8081
MONGODB_URI=mongodb://<local-demo-user>:<url-encoded-password>@127.0.0.1:27018/multilingual_ai_narration_ui_demo?authSource=multilingual_ai_narration_ui_demo
CORS_ORIGINS=http://localhost:5175
UPLOAD_DIR=uploads-local-demo
JWT_ACCESS_SECRET=<new-local-only-secret>
JWT_REFRESH_SECRET=<different-new-local-only-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAX_UPLOAD_SIZE_MB=200
```

Không copy AI key/Atlas URI vào config Local. Giữ giới hạn upload theo cấu hình thực, không thay workflow. Chỉ sau khi có MongoDB Local đã xác minh mới chạy `npm run dev` trong backend riêng. Kiểm tra health trên 8081 và không sử dụng backend Atlas 8080.

## Customer Web Development riêng

Terminal riêng tại frontend-web của bản sao:

```powershell
$env:VITE_API_BASE_URL = 'http://localhost:8081/api'
npm run dev -- --port 5175 --strictPort
```

Không sửa config Web/Production. Origin riêng tránh sessionStorage cũ; đăng nhập CUSTOMER demo ở backend Local. Source hỗ trợ URL API qua VITE_API_BASE_URL; runtime chưa chạy. Chưa tạo account/demo data trong bước này.

## Checklist bắt buộc trước khi xin phép seed

1. Xác minh PID/service hoặc Docker container/image/bind mount/port mapping thực sự là MongoDB Local, không ssh/tunnel/proxy. Không coi loopback URI hoặc ping thành công là đủ.
2. Kiểm tra listener loopback 27018 và server hello/buildInfo đọc-only sau phê duyệt kết nối. Đối chiếu với deployment Local; không in URI/password/full configuration.
3. Xác minh authentication đang bật và quyền account chỉ readWrite trên Database demo; không quyền remote/Production. Không thử ghi Atlas để chứng minh.
4. Xác minh Backend Local dùng Database `_ui_demo`, port 8081, JWT/storage riêng; Web port 5175 gọi đúng backend; chưa có paid AI request.
5. Khi được phép tạo account, dùng đúng CUSTOMER demo định danh trong DEMO_PROJECTS.md. Đặt DEMO_MONGODB_URI riêng và DEMO_DATABASE_CONFIRMED theo allowlist trong terminal seed; không fallback Atlas. Xin phép riêng trước khi chạy seed/cleanup.
6. Cleanup không chạy khi backend/workers đang ghi; guard check/delete không atomic. Không xóa volume hoặc dữ liệu thật.

Seed/cleanup: **NOT RUN**. Chưa cho phép seed. Không tạo Atlas resource, không commit.
