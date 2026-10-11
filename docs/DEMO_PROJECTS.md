# S25.7.4.7 — Dữ liệu demo an toàn

## S25.7.4.8 — Kiểm tra cách ly Development (2026-10-11)

**Chưa cho phép seed.** Database đề xuất mới: `multilingual_ai_narration_dev`. Script hiện chỉ allowlist `multilingual_ai_narration_ui_demo`; `_dev` bị từ chối. Chưa thay allowlist trong bước audit này; sau khi người dùng duyệt đích cần cập nhật constant, confirmation và regression tests đồng bộ. Các lệnh S25.7.4.7 bên dưới là cấu hình cũ, không chạy cho đích `_dev`.

### Bằng chứng hiện có

- backend/.env có MONGODB_URI; không in/ghi URI ra tài liệu. Không có DEMO_MONGODB_URI trong file này hoặc môi trường tiến trình kiểm tra.
- `.env`/`.env.*` bị gitignore, ngoại trừ `.env.example`. Chưa có bằng chứng deployment/credential Development riêng hoặc quyền không ghi Production. Không kết nối MongoDB, không tạo tài nguyên Atlas.
- NODE_ENV, database name và confirmation chỉ là guard cấu hình, không chứng minh cách ly hạ tầng/quyền. Credential có quyền rộng vẫn có thể ghi Production ở nơi khác.

### Cấu hình đề xuất, cần người dùng phê duyệt

1. Dùng deployment/Atlas project riêng cho Development; không dùng dữ liệu thật. Provision sau khi được phép. Tạo database user riêng chỉ readWrite trên `multilingual_ai_narration_dev`, không quyền toàn cluster/admin/Production; kiểm tra inherited roles và quyền truy cập thực tế qua quản trị Atlas. Giới hạn network access theo máy Development. Nếu cùng cluster, chỉ có thể coi là cách ly logic sau khi xác minh RBAC, không gọi là cách ly deployment.
2. Chạy backend demo trong bản sao/worktree và terminal riêng, giữ nguyên backend/.env đang dùng. File `.env` riêng của bản sao dùng URI Development, NODE_ENV=development, PORT=8081, CORS_ORIGINS=http://localhost:5175, JWT_ACCESS_SECRET/JWT_REFRESH_SECRET riêng và khác nhau, token lifetimes theo cấu hình hiện có, UPLOAD_DIR riêng. Không copy credential/AI key Production. Env loader hiện luôn đọc `.env` ở cwd và chỉ không ghi đè biến đã đặt: không chỉ đổi PORT rồi vô tình dùng lại URI/secret cũ.
3. Customer Web chạy terminal riêng với VITE_API_BASE_URL=http://localhost:8081/api và `npm run dev -- --port 5175 --strictPort`. URL API là cấu hình công khai, không chứa credential. Không sửa file Production; cổng/origin riêng để tránh tái sử dụng phiên Customer cũ. Đăng nhập tài khoản CUSTOMER demo của backend Development, không dùng tài khoản thật.
4. Sau phê duyệt, đồng bộ allowlist `_dev`; cấu hình DEMO_MONGODB_URI chỉ trong môi trường terminal seed riêng, không fallback MONGODB_URI; DEMO_DATABASE_CONFIRMED khớp allowlist. Seed script không load dotenv hay config/env. Chỉ khi đích, quyền và account đã được xác minh mới xin phép thực thi seed.

### Kết quả rà soát script

- Environment guard: bắt buộc development/test, confirmation và URI có database pathname chính xác trong allowlist; explicit dbName, autoCreate/autoIndex=false. Không migration/drop/global reset.
- Ownership: email demo + fullName marker + CUSTOMER + ACTIVE. Seed không tự tạo account, đổi role hoặc password. Các dấu hiệu này không thay thế xác nhận tài khoản thật sự disposable trong Database đã cách ly.
- Stable IDs/idempotence: 20 ID cố định; kiểm tra xung đột owner/marker/status; bỏ qua record đã có, không ghi đè. Đây là source review, chưa xác minh idempotence trên Database. Chạy đồng thời có thể gây duplicate-key/partial seed, không phải transaction.
- Cleanup: query giới hạn ID + owner + marker + DRAFT; quét collection tìm projectId/entityId dạng ObjectId hoặc string; từ chối nếu có liên kết trực tiếp. Không xóa user/session/tệp. Các model workflow hiện có nối về Project bằng projectId; segment nối gián tiếp qua Transcript/Translation, nên parent tồn tại sẽ chặn cleanup. Không bảo đảm phát hiện schema tương lai hoặc dữ liệu hỏng/orphan ngoài các field này.
- Rủi ro concurrency: kiểm tra liên kết và delete không atomic; phải dừng backend/workers truy cập demo trong cleanup. Không coi cleanup an toàn với writer đồng thời; muốn hỗ trợ trường hợp đó cần giải pháp atomic/concurrency riêng trước khi chạy. Nếu có liên kết, dừng và rà soát thủ công; không bypass guard.
- Logging không in driver error, token, URI hoặc đường dẫn/tệp; chỉ count và thông báo tổng quát.

Validation không ghi Database: `node --import tsx --test tests/demo-projects.test.ts` **2/2 PASS** (guard và fixture schema/API validation). Seed/cleanup, kết nối/RBAC Development, UI runtime: **NOT RUN**. Chưa có thể cho phép seed; chờ duyệt Database/deployment/credential và bước đồng bộ allowlist. Không commit.

Test không kết nối Database: `cd backend` rồi `node --import tsx --test tests/demo-projects.test.ts` (2/2 PASS). Backend lint/typecheck/build PASS. Test mới chạy riêng vì npm test hiện liệt kê tường minh các suite regression cũ.

Chỉ chuẩn bị script, **chưa chạy seed/cleanup**. Atlas `multilingual_ai_narration` hiện có không được xác minh tách biệt dữ liệu thật; tuyệt đối không dùng làm đích demo.

Sau khi người dùng xác nhận và cho phép, provision Database riêng `multilingual_ai_narration_ui_demo`, tốt nhất dùng cluster riêng và database user chỉ có readWrite trên Database này. Tên Database và NODE_ENV không tự chứng minh môi trường an toàn; người quản trị phải xác minh đích thật trước khi chạy.

Backend dành riêng cho demo phải trỏ MONGODB_URI tới Database đó. Không đổi `.env` backend hiện đang dùng, không ghi URI/password vào repo/log/docs. Qua register API của backend demo, tạo CUSTOMER riêng: fullName `[S25.7.4.7 UI DEMO]`, email `ui-demo@example.invalid`, mật khẩu riêng đáp ứng validation backend. Script không tạo/nâng quyền/cập nhật tài khoản.

Trong terminal riêng tại `backend`, đặt NODE_ENV=development (hoặc test), DEMO_DATABASE_CONFIRMED=multilingual_ai_narration_ui_demo và DEMO_MONGODB_URI bằng URI bí mật của Database riêng qua môi trường an toàn; script không load backend/.env và không fallback MONGODB_URI.

Chỉ sau khi được phép:

```powershell
npx tsx src/scripts/seed-demo-projects.ts seed
```

Cleanup chỉ 20 ID xác định + owner + marker + DRAFT, từ chối nếu có tham chiếu workflow/activity; không xóa tài khoản, session, media hoặc collection:

```powershell
npx tsx src/scripts/seed-demo-projects.ts cleanup
```

20 dự án đều DRAFT, progress=0, tên có dấu/không dấu/dài/ngắn, ngày hôm nay/tuần/tháng/tháng trước. Điều chỉnh phân bổ 4/3/5/6/2 thành 20 DRAFT: UPLOADED đòi hỏi media; xử lý đòi hỏi job; COMPLETED đòi hỏi Result hợp lệ. Không giả mạo pipeline/AI. Marker nằm trong description, không thay schema. ID cố định; seed lặp bỏ qua bản ghi đã có, không ghi đè chỉnh sửa. Chạy đơn luồng; lỗi giữa chừng có thể để lại một phần demo, chạy lại tiếp tục an toàn.

Kiểm tra sau khi seed được phép: count=20, owner đúng CUSTOMER demo; search `mua`, `DA NANG`; time presets và khoảng tùy chọn; DRAFT có kết quả, COMPLETED không có; bốn sort; hai trang 10 dòng; History hiển thị draft chưa có kết quả, Dashboard tổng=20/hoàn thành=0/xử lý=0/thất bại=0 nếu chỉ có dataset này. Không gọi AI hoặc kiểm tra artifact giả. Các kiểm tra runtime này hiện NOT RUN.
