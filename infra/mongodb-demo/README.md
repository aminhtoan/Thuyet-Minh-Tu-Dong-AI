# MongoDB Docker Demo — chưa khởi động

Compose project `narration-ui-demo`, container `narration-ui-demo-mongodb`, image cố định `mongo:8.0.17`, volume riêng `narration-ui-demo-mongodb-data`, port chỉ `127.0.0.1:27018`. Không có URI/credential Atlas; network riêng internal. Image chưa pull, runtime chưa kiểm tra.

Official image hỗ trợ root password qua file và init scripts trên volume mới: [Mongo official image](https://hub.docker.com/_/mongo). Auth bật; root chỉ bootstrap/admin Local. Init script chỉ tạo database user `demo-app` với readWrite trên `multilingual_ai_narration_ui_demo`, không seed account/project/AI artifacts. Healthcheck xác thực bằng app user rồi ping, không in secret. Init scripts không chạy lại trên volume đã có dữ liệu.

## Trước khi khởi động — cần người dùng cho phép

1. Mở Docker Desktop thủ công từ Start, chờ Linux Engine Ready. Không chạy installer. `docker version` phải có Server. Hiện Engine chưa chạy; chuẩn bị file không có nghĩa runtime PASS.
2. Tạo thư mục `secrets/` trong thư mục này (gitignored), giữ ACL chỉ người dùng hiện tại. Tạo hai file mongo-root-password.txt và mongo-app-password.txt chứa hai password ngẫu nhiên riêng tối thiểu 24 ký tự, khác nhau, không credential Atlas. Không đưa secret vào lệnh/log/repo hoặc chat. Compose secrets là file mount Local, không kho bí mật mã hóa; quyền file Windows vẫn quan trọng.
3. Sao chép `.env.example` thành `secrets/backend.env`, điền password app URL-encoded và hai JWT secrets mới riêng. Không sửa backend/.env Atlas. Không thêm OPENAI_API_KEY; launcher từ chối paid-provider key và URI không đúng Local endpoint.
4. Kiểm tra cổng 27018/8081/5175 không bị sử dụng. Volume/container trùng tên nếu đã tồn tại cần xác minh thuộc Demo trước khi up, không ghi đè/reuse dữ liệu không rõ nguồn gốc.

## Lệnh sau khi được phép

Từ repository root, chỉ quản lý Compose riêng này:

```powershell
docker compose -f infra/mongodb-demo/compose.yaml config --quiet
docker compose -f infra/mongodb-demo/compose.yaml up -d
docker compose -f infra/mongodb-demo/compose.yaml ps
```

Up có thể tải image và tạo container/volume/user Local; chưa thực hiện trong bước chuẩn bị. Không dùng config in đầy đủ môi trường bí mật. Kiểm tra port mapping bằng docker compose ps, container image/version, healthcheck authenticated và quyền account qua mongosh bằng password prompt (không password trên command line). Không coi ping/loopback là bằng chứng đủ loại trừ tunnel/proxy; đối chiếu PID Docker/port mapping/image/volume. Không kết nối Atlas.

Build backend trước bằng `npm run build` tại backend, rồi terminal **sạch** tại repository root:

```powershell
powershell -NoProfile -File infra/mongodb-demo/start-backend.ps1
```

Launcher đặt cwd riêng, đọc `secrets/backend.env` bằng Node --env-file (Node 22 hiện tại), không load backend/.env Atlas. Guard từ chối remote URI/cổng/database sai, secret placeholder/JWT giống nhau/AI key. Source guard không chứng minh server phía sau localhost; cần runtime kiểm tra thủ công. Upload storage nằm riêng dưới thư mục này, không development media hiện có. Kiểm tra GET http://localhost:8081/api/health sau khi được phép.

Customer Web terminal riêng tại frontend-web:

```powershell
$env:VITE_API_BASE_URL = 'http://localhost:8081/api'
npm run dev -- --port 5175 --strictPort
```

Origin riêng, không dùng session Atlas; chưa register account hoặc tạo project. Seed allowlist `_ui_demo` tương thích; seed/cleanup yêu cầu phép riêng theo docs/DEMO_PROJECTS.md và phải dùng app credential Local riêng.

## Dừng an toàn

```powershell
docker compose -f infra/mongodb-demo/compose.yaml stop
```

Giữ container/volume. Không chạy down -v, volume rm/prune hoặc thay container khác. Không đổi password files trên volume hiện có rồi giả định account đã đổi; rotation cần quy trình riêng, không xóa volume để sửa lỗi.

## Validation tĩnh

`docker compose ... config --quiet`, `node --check init-demo.js`, `node --check healthcheck.js`, `node --test config.test.mjs`; không cần Docker Engine/Database. Container, auth runtime, image pull, Backend/Web runtime, seed/cleanup đều NOT RUN. Không commit.
