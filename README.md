# Multilingual AI Narration

Hệ thống thuyết minh bảo tàng đa ngôn ngữ gồm Customer Web, Admin Web, Customer Mobile và Backend API. Người dùng tạo nội dung thuyết minh; quản trị viên quyết định những artifact được công khai cho khách tham quan.

**Mục lục:** [Giới thiệu](#overview) · [Chức năng](#features) · [Giao diện](#screenshots) · [Kiến trúc](#architecture) · [Stack](#stack) · [Thư mục](#structure) · [Workflow AI](#workflow) · [Yêu cầu](#requirements) · [Environment](#environment) · [Docker](#docker) · [Lệnh Docker](#docker-commands) · [Chạy thủ công](#manual) · [Android](#android) · [Storage](#storage) · [CI/CD](#cicd) · [Troubleshooting](#troubleshooting) · [Trạng thái](#status).

<a id="overview"></a>
## 1. Giới thiệu dự án

Dự án hỗ trợ quản lý âm thanh/video, chuyển giọng nói thành bản ghi, dịch và tạo thuyết minh AI. Kết quả được xem trong tài khoản sở hữu hoặc công khai bằng thao tác quản trị riêng. Ba client sử dụng chung Backend; Admin Web không nằm trong Customer Web hoặc Mobile.

Source implementation, mock tests, Docker synthetic acceptance và nghiệm thu trên thiết bị thật là các mức bằng chứng khác nhau.

<a id="features"></a>
## 2. Chức năng chính

| Thành phần | Chức năng đã triển khai |
| --- | --- |
| Customer Web | Đăng ký/đăng nhập, dashboard, dự án/upload, transcript và translation editor, chọn voice, theo dõi xử lý, thư viện, protected Result playback/download; public audio và generated MP4 đã công khai |
| Admin Web | Dashboard, người dùng/khóa tài khoản, dự án, ProcessingJob, ngôn ngữ/voice, nhật ký, cấu hình; duyệt AI audio, quản lý original audio và công khai từng MP4/ngôn ngữ |
| Customer Mobile | Luồng Customer và public Museum, original/AI audio, MP4 native player, nhiều Result/ngôn ngữ; **không có Admin Mobile hoặc nút duyệt nội dung** |
| Backend | Express API, JWT/RBAC/ownership, upload, STT, translation, TTS, FFmpeg, ProcessingJob, revision/provenance, Result và publication |

Catalog video biên tập độc lập với MP4 do Backend tạo. Không dùng video nguồn upload làm public video fallback.

<a id="screenshots"></a>
## 3. Ảnh minh họa giao diện

Chưa có bộ screenshot giao diện được xác minh trong repository. Ảnh bảo tàng hiện có là tài nguyên nội dung, không thay thế ảnh chụp ứng dụng.

| Ứng dụng | Screenshot cần bổ sung |
| --- | --- |
| Customer Web | Dashboard; trang thuyết minh có audio/video và player |
| Admin Web | Danh sách dự án với nút Duyệt video; modal từng Result |
| Mobile | Danh sách thuyết minh và native MP4 player trên Android |

Ảnh bổ sung cần che tài khoản, dữ liệu private và secrets. README không chứa liên kết ảnh placeholder.

<a id="architecture"></a>
## 4. Kiến trúc hệ thống

~~~mermaid
flowchart LR
  Web[Customer Web] --> API[Backend Express API]
  Admin[Admin Web] --> API
  Mobile[Customer Mobile] --> API
  API --> DB[(MongoDB: metadata, jobs, revisions)]
  API --> AI[Gemini / OpenAI adapters]
  API --> FF[FFmpeg / ffprobe]
  API --> Files[(Local media storage / mounted volume)]
  FF --> Files
~~~

AI/media hiện được xử lý trong Backend process, có ProcessingJob và theo dõi tác vụ/maintenance. Chưa có Redis/BullMQ worker hoặc microservices độc lập. Tham khảo [kiến trúc](docs/ARCHITECTURE.md) và [API](docs/API.md); đối chiếu snapshot lịch sử với source hiện tại.

<a id="stack"></a>
## 5. Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Runtime | Node.js **22.23.3**, npm | Theo .nvmrc, CI và Dockerfile |
| Backend | Express 5, TypeScript, Mongoose 9, Zod, Multer | API, validation, upload, MongoDB |
| Security | JWT, bcryptjs, Helmet, CORS, express-rate-limit | Authentication và bảo vệ HTTP |
| Customer/Admin Web | React 19, TypeScript, Vite 8, React Router | Hai ứng dụng Web độc lập |
| Mobile | Expo SDK **58**, React Native **0.88**, React **19.3**, Expo Router | Customer app; expo-audio và expo-video |
| AI | @google/genai, Gemini và OpenAI adapters | STT, translation, TTS theo cấu hình |
| Media | FFmpeg, ffprobe | Probe, chuyển mã, ghép MP4 |
| Packaging | Docker Compose, MongoDB **8.0.17**, Nginx **1.28** | Local synthetic stack và volumes |
| Automation | GitHub Actions CI V1, Docker CD V1 synthetic | Static checks, build, acceptance cô lập |

Dependency chi tiết nằm trong package.json/package-lock.json từng app. Không pin npm riêng; dùng npm đi kèm Node đã chọn và npm ci với lockfile.

<a id="structure"></a>
## 6. Cấu trúc thư mục

~~~text
multilingual-ai-narration/
├── backend/             # API, models/services, tests, Dockerfile, staging checks
├── frontend-web/        # Customer Web và public Museum
├── admin-web/           # Admin Web
├── frontend-mobile/     # Customer Mobile / Expo Router
├── design/customer/     # Design tokens, mapping Web/Mobile
├── scripts/             # Design synchronization và công cụ
├── infra/local-cd/      # Compose, packaging, guards, synthetic runner
├── infra/mongodb-*/     # Database demo/integration riêng
├── docs/                # Context, progress, API, architecture
└── .github/workflows/   # CI V1 và Docker CD V1
~~~

<a id="workflow"></a>
## 7. Quy trình xử lý AI

Upload → xác định ngôn ngữ nguồn → STT → kiểm tra/chỉnh transcript → translation/review → chọn voice và TTS → audio/MP4 Result → Admin publication → Customer playback.

GROUPS_V1 có bước review/approval. Với video nguồn, FFmpeg ghép narration thành MP4 H.264/AAC theo thời lượng nguồn; Result gắn với revision đầu vào.

| Loại media | Ý nghĩa và quyền truy cập |
| --- | --- |
| Source media | Tệp upload private, không tự xuất hiện trong public listing |
| Original audio | Artifact âm thanh riêng trích từ nguồn, có publication do Admin quản lý |
| AI narration audio | Âm thanh TTS; chỉ public khi READY, được duyệt và CURRENT |
| Generated MP4 | Result video đã xử lý, mặc định không public; Admin bật riêng và Backend xác minh file/provenance |

**Duyệt audio không tự công khai MP4.** Tắt publication chặn yêu cầu public mới, không thu hồi byte đã tải/buffer. Giữ thời lượng video không đồng nghĩa đã có alignment lời đọc theo từng cảnh. AI LIVE có thể phát sinh chi phí; mock PASS không chứng minh workflow LIVE luôn thành công.

<a id="requirements"></a>
## 8. Yêu cầu môi trường

- Git, Node.js **22.23.3** và npm. Backend khai báo engine >=20, nhưng nên dùng đúng .nvmrc để khớp toolchain CI/Web/Docker.
- MongoDB riêng có thể truy cập; các transaction cần **replica set hoặc MongoDB Atlas**. 8.0.17 là phiên bản Compose đang dùng, không phải tuyên bố minimum version cho mọi deployment.
- FFmpeg/ffprobe trên PATH hoặc đường dẫn executable hợp lệ khi chạy xử lý media local.
- Docker Desktop Windows, Linux containers và PowerShell 5.1+ cho local CD scripts. Synthetic runner yêu cầu Docker Compose **>=2.33**.
- Android Studio/SDK và emulator hoặc điện thoại; Expo Go/development build tương thích SDK 58.
- AI LIVE cần key/quota/model và voice/catalog đúng provider. CI và Docker synthetic không cần key thật.

<a id="environment"></a>
## 9. Cấu hình biến môi trường

Mỗi app có .env.example. Sao chép riêng trong thư mục app, chỉ khi chưa có .env:

~~~powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
~~~

Chỉnh cấu hình cho máy riêng; không sao chép secrets của người khác hoặc dùng Atlas chung làm database thử nghiệm.

| App | Biến cần chú ý |
| --- | --- |
| Backend, bắt buộc khi khởi động | MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET khác nhau, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN |
| Backend, local/runtime | NODE_ENV, PORT, CORS_ORIGINS, UPLOAD_DIR, MAX_UPLOAD_SIZE_MB |
| AI | STT_PROVIDER, TRANSLATION_PROVIDER, TTS_PROVIDER; GEMINI_API_KEY hoặc OPENAI_API_KEY; các biến model/voice tương ứng trong template |
| Translation opt-in | CUSTOMER_TRANSLATION_ENABLED, GROUP_TRANSLATION_ENABLED và biến phương thức/model; cấu hình UI và Backend phải nhất quán |
| Media | FFMPEG_PATH, FFPROBE_PATH, FFMPEG_TIMEOUT_MS |
| Customer Web | VITE_API_BASE_URL; các feature flags VITE_* theo template |
| Admin Web | VITE_API_BASE_URL, VITE_PUBLIC_MUSEUM_URL |
| Mobile | EXPO_PUBLIC_API_BASE_URL |

Ví dụ không chứa credentials, giả định bạn đã chuẩn bị replica set rs0:

~~~dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/narration_dev?replicaSet=rs0
PORT=8080
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
UPLOAD_DIR=uploads
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
~~~

Tự tạo hai JWT secret ngẫu nhiên khác nhau, không dùng placeholder làm secret thật. Không đưa keys/passwords vào VITE_* hoặc EXPO_PUBLIC_* vì các biến này được đóng gói vào client. Chọn provider/model/voice nhất quán; template không bảo đảm model bên ngoài vẫn có quota/khả dụng.

Docker local CD dùng cấu hình synthetic trong Compose và images.properties do build tạo, không dùng .env phát triển/Atlas/AI key thật. Tài khoản Admin và catalog phải được chuẩn bị hợp lệ trên đúng database; không tự seed/migrate database dùng chung.

<a id="docker"></a>
## 10. Docker Local Deployment

Môi trường [S42.4 acceptance](infra/local-cd/acceptance/compose.yaml) dùng để nghiệm thu packaging, startup, healthcheck và HTTP/API smoke bằng cấu hình synthetic. Đây là stack riêng, **không phải production hoặc nghiệm thu AI LIVE**. Mobile chạy ngoài Docker.

| Service | Truy cập host | Storage/network |
| --- | --- | --- |
| customer-web | [http://127.0.0.1:5280](http://127.0.0.1:5280) | Nginx static + proxy /api; isolated + frontend bridge |
| admin-web | [http://127.0.0.1:5281](http://127.0.0.1:5281) | Nginx static + proxy /api; isolated + frontend bridge |
| backend | Không publish host port; /api/health qua frontend | narration-s424-acceptance-media → /data/uploads; internal network |
| mongodb | Không publish host port | narration-s424-acceptance-database; database s424_acceptance; replica set s424rs |

Compose project: `narration-s424-acceptance`. Networks: `narration-s424-acceptance-isolated` (internal) và `narration-s424-acceptance-frontend` (bridge). Database/media tách khỏi S39.6 và MongoDB Atlas; không mount uploads thật từ host. Backend/MongoDB chỉ nối internal network. Hai frontend nối cả hai network nên không coi toàn bộ stack là air-gapped.

Acceptance không nạp .env phát triển, dùng API key rỗng và tắt các translation feature flags hiện có. Smoke tests không gọi Gemini, không seed, không ghi sentinel và không tạo media thật. Startup/index initialization và storage health probes chỉ ghi vào volumes acceptance mới.

### Build và Preflight cho môi trường mới

[Invoke-Acceptance.ps1](infra/local-cd/acceptance/Invoke-Acceptance.ps1) chỉ hỗ trợ `Build` và `Preflight`, không tự deploy, resume hoặc cleanup. Chạy từ repository root bằng PowerShell trên Windows với Docker Desktop Linux Engine.

**Các lệnh sau chỉ dành cho môi trường chưa có tài nguyên S42.4 và cổng 5280/5281 còn trống.** Stack đã nghiệm thu đang chiếm các tên tài nguyên cố định; đổi RunId không tạo một stack song song và không vượt được guard. Không chạy lại cold deployment trên stack hiện có hoặc xóa tài nguyên để vượt guard.

~~~powershell
docker.exe version
docker.exe compose version
docker.exe image inspect mongo:8.0.17 --format '{{.Id}}'

# Ví dụ RunId mới, không tái sử dụng RunId đã build:
$runId = 's424-20261116-example01'
powershell -File infra/local-cd/acceptance/Invoke-Acceptance.ps1 -Stage Build -RunId $runId
# Chỉ chạy bước tiếp theo nếu Build PASS:
powershell -File infra/local-cd/acceptance/Invoke-Acceptance.ps1 -Stage Preflight -RunId $runId
~~~

RunId phải khớp `^s424-[a-z0-9][a-z0-9-]{0,47}\z`; không chứa khoảng trắng hoặc ký tự đường dẫn. Runner yêu cầu image vendor `mongo:8.0.17` đã có local; nếu thiếu thì dừng để chuẩn bị đúng phiên bản, không tự chọn latest.

Build tạo snapshot source đã lọc và ba image tags riêng `narration-s424-backend/customer/admin:<RunId>`; từ chối ghi đè tag đã tồn tại. Runner lưu HEAD cùng SHA-256 từng file snapshot, image IDs, `manifest.json` và `images.properties` tại `infra/local-cd/.state/s424-acceptance/<RunId>/`. HEAD không đại diện toàn bộ source khi working tree có thay đổi; cần đối chiếu cả danh sách hash trong manifest.

Preflight xác minh snapshot, image IDs/labels, Compose config, environment, resource names và ports. Nó không ghi database/media và chủ động chặn khi stack/volumes/networks đã tồn tại. Không dùng Preflight này làm resume guard.

Fresh deployment chỉ được thực hiện sau khi Build và Preflight PASS, kiểm tra lại isolation và được phê duyệt riêng. Khi đó dùng đúng image map/snapshot:

~~~powershell
$runDir = Join-Path 'infra/local-cd/.state/s424-acceptance' $runId
$composeArgs = @('compose', '--env-file', (Join-Path $runDir 'images.properties'),
  '-p', 'narration-s424-acceptance',
  '-f', (Join-Path $runDir 'snapshot/infra/local-cd/acceptance/compose.yaml'))
docker.exe @composeArgs config --quiet
# Chỉ cho môi trường mới đã qua guards; không chạy với stack hiện có:
docker.exe @composeArgs up -d --no-build --pull never --no-recreate --wait --wait-timeout 300
~~~

### Resume và kết quả nghiệm thu

**Chưa có chế độ resume tự động trong runner.** S42.4G.6 là lần resume có kiểm soát: giữ exclusive lock, kiểm tra exact container IDs/images/labels/mounts/ports, truyền Mongo init đã sửa qua stdin vào đúng MongoDB container, chờ PRIMARY/healthy rồi start các container hiện có. Không sửa snapshot, manifest, images hoặc recreate. Không coi các thao tác này là quick start hay một Stage được runner hỗ trợ.

Bằng chứng local của RunId `s424-20261115t215313`:

- Build manifest: `infra/local-cd/.state/s424-acceptance/s424-20261115t215313/manifest.json`.
- Resume journal: `resume-20261115T221015782.json` trong cùng thư mục.
- Thời điểm nghiệm thu: **16/11/2026 (Asia/Bangkok)**, journal ghi UTC.
- Manifest/snapshot gốc được giữ nguyên; script Mongo init sửa được nhận diện bằng SHA-256 riêng trong journal. Snapshot của lần build này vẫn chứa Mongo init cũ, không dùng nó để lặp lại fresh deployment.

| Acceptance result | Kết quả cho RunId trên |
| --- | --- |
| Backend, Customer Web, Admin Web images built | 3/3 PASS |
| MongoDB, Backend, Customer Web, Admin Web healthy | 4/4 PASS |
| Mongo initialization regression | 26/26 PASS |
| MongoDB replica set | s424rs PRIMARY |
| HTTP/API smoke, database connectivity | PASS |
| Resource isolation, bảo toàn S39.6 | PASS |
| Snapshot SHA-256 verification | 557/557 PASS |

Root và /login của hai frontend trả 200; /api/health trả 200 JSON và database connected; API không tồn tại trả 404 JSON; Admin API chưa đăng nhập trả 401 JSON. `/local-ready` thuộc **Nginx**, trả 200; Backend không khai báo route này nên yêu cầu trực tiếp trả 404. Health Backend dùng `/api/health` và kiểm tra runtime/storage.

Kết quả gắn với RunId và thời điểm trên, không bảo đảm mọi lần chạy sau đều PASS. Chưa nghiệm thu business login/registration, Gemini translation/TTS, MP3/MP4 processing, Android runtime hoặc production deployment. Không tuyên bố production-ready từ acceptance này.

### Quản lý stack local hiện có

[Manage-Local.ps1](infra/local-cd/acceptance/Manage-Local.ps1) hỗ trợ Start, Stop, Status và Logs bằng Docker Desktop Linux containers và PowerShell 5.1+. Script chỉ quản lý project `narration-s424-acceptance`, RunId `s424-20261115t215313` đã nghiệm thu trên máy hiện tại; xác minh manifest/journal, container IDs, image IDs, volumes, networks, mounts và ports trước mỗi thao tác. Không build, recreate hoặc xóa tài nguyên.

~~~powershell
# Từ repository root; Status và Logs chỉ đọc:
powershell -File infra/local-cd/acceptance/Manage-Local.ps1 -Action Status
powershell -File infra/local-cd/acceptance/Manage-Local.ps1 -Action Logs -Service backend -Tail 50

# Chỉ dùng khi đã xác minh điều kiện vận hành an toàn:
powershell -File infra/local-cd/acceptance/Manage-Local.ps1 -Action Stop
powershell -File infra/local-cd/acceptance/Manage-Local.ps1 -Action Start
~~~

Start chờ MongoDB healthy trước Backend, rồi Customer/Admin Web. Stop dừng frontend trước, Backend tiếp theo và MongoDB cuối cùng. Logs hỗ trợ `mongodb`, `backend`, `customer-web`, `admin-web` hoặc `All`; giới hạn 1–500 dòng, không follow vô hạn và che các mẫu secrets phổ biến. Status hiển thị IDs, health và ports để đối chiếu Docker Desktop.

**Giới hạn:** manager phụ thuộc evidence local trong `.state` được Git ignore; clone repository hoặc build RunId mới không tự có bộ evidence này. Không sao chép evidence từ máy khác để vượt ownership guard. Đây không phải bộ triển khai nhiều máy hoặc công cụ chứng nhận drain. Stop có timeout và có thể làm gián đoạn tác vụ; backup/restore và Stop/Start thực tế vẫn cần nghiệm thu riêng trước khi sử dụng cho công việc quan trọng.

| Mức nghiệm thu Docker Local | Trạng thái |
| --- | --- |
| Build/runtime acceptance S42.4G, RunId nêu trên | PASS |
| Mongo init regression | PASS — 26/26, chạy bằng `node --test infra/local-cd/acceptance/mongo-init.test.mjs` |
| Management script static/mock tests | PASS — 26 ca giả lập đã chạy; Status/Logs chỉ đọc PASS |
| Backup/restore | NOT VERIFIED |
| Runtime Stop/Start | NOT VERIFIED |
| Production/multi-machine deployment | NOT VERIFIED |

<a id="docker-commands"></a>
## 11. Quan sát Docker acceptance và bảo vệ dữ liệu

Để quan sát stack đã nghiệm thu, chuẩn bị đúng image map/snapshot, không gọi Build/Preflight lại:

~~~powershell
$runId = 's424-20261115t215313'
$runDir = Join-Path 'infra/local-cd/.state/s424-acceptance' $runId
$composeArgs = @('compose', '--env-file', (Join-Path $runDir 'images.properties'),
  '-p', 'narration-s424-acceptance',
  '-f', (Join-Path $runDir 'snapshot/infra/local-cd/acceptance/compose.yaml'))
docker.exe @composeArgs ps
docker.exe @composeArgs logs --tail 50 backend mongodb
~~~

Không đưa snapshot, manifests, journals, .env, credentials, database dumps, uploads/media hoặc build outputs vào commit. `infra/local-cd/.gitignore` loại trừ `.state/`; giữ evidence local cho việc đối chiếu. Kiểm tra `git status`, `git ls-files` và `git check-ignore` trước khi stage. Ignore rules không tự loại bỏ file đã tracked.

Audit S42.4H phát hiện repository hiện có **214 file `backend/uploads/` đã tracked** và chưa có Git ignore rule cho uploads; đây là vấn đề hygiene có sẵn, không phải dữ liệu được acceptance đưa vào Git. Cần xử lý bằng task riêng có phê duyệt, không tự xóa file hoặc sửa lịch sử Git. Docker build snapshot loại trừ uploads và .env; volume dữ liệu Docker nằm ngoài source repository.

Stack `narration-s396-local` và [scripts S39.6](infra/local-cd/README.md) có resource names, ports và guards riêng. Không dùng scripts S39.6 để quản lý S42.4, không dùng smoke script cũ có ghi sentinel cho nghiệm thu chỉ đọc. Chưa có lệnh production deploy hoặc Backend replacement được xác nhận bởi S42.4.

<a id="manual"></a>
## 12. Cài đặt và chạy thủ công

Clone repository, chọn Node theo .nvmrc. Chạy mỗi app trong **terminal riêng**, từ root:

~~~powershell
# Terminal 1: chuẩn bị .env và MongoDB riêng trước npm run dev
cd backend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Điền cấu hình bắt buộc ở mục 9 trước khi chạy tiếp.
npm run dev
~~~

Backend chỉ listen sau khi kết nối MongoDB. API mặc định: http://localhost:8080/api; health: http://localhost:8080/api/health.

~~~powershell
# Terminal 2: Customer Web
cd frontend-web
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
$env:VITE_API_BASE_URL = 'http://localhost:8080/api'
npm run dev -- --port 5173 --strictPort
~~~

~~~powershell
# Terminal 3: Admin Web
cd admin-web
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
$env:VITE_API_BASE_URL = 'http://localhost:8080/api'
$env:VITE_PUBLIC_MUSEUM_URL = 'http://localhost:5173/'
npm run dev
~~~

Customer Web: http://localhost:5173. Admin Web: http://localhost:5174 (strict port). Admin cần tài khoản ADMIN được cấp hợp lệ; đăng ký Customer không cấp quyền Admin.

Build riêng từng app bằng npm run build. Backend production entry là npm start sau build; development servers không phải production hosting. [Local development](docs/LOCAL_DEVELOPMENT.md) có hướng dẫn cách ly database và ghi nhận lịch sử, cần đối chiếu trạng thái máy hiện tại.

<a id="android"></a>
## 13. Chạy Mobile Android

Từ root, trong terminal riêng:

~~~powershell
cd frontend-mobile
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Android Studio emulator mặc định: 10.0.2.2 trỏ về máy host
$env:EXPO_PUBLIC_API_BASE_URL = 'http://10.0.2.2:8080/api'
npm run android
~~~

- Khởi động emulator trước. Với điện thoại thật, thay bằng IP LAN máy Backend, ví dụ http://192.168.1.10:8080/api, rồi chạy npm start và mở bằng Expo Go/development build tương thích SDK 58.
- Thiết bị phải truy cập được Backend qua LAN/firewall; localhost trên điện thoại trỏ tới chính điện thoại. Restart Metro sau khi đổi env và kiểm tra /api/health từ thiết bị.
- Metro tunnel không tự công khai Backend. Docker 5180/5181 chỉ bind loopback, không phải Backend API LAN dành cho điện thoại.
- Các kiểm tra: npm run typecheck, npm run lint, npm test. Xuất bundle: npx expo export --platform android --output-dir .expo/android-export. Bundle không phải APK/AAB hay bằng chứng runtime PASS.

Player native có phát/dừng/tua, không autoplay và cleanup khi rời màn hình. Vẫn cần nghiệm thu mạng, decode, sound, seek và revocation trên Android thật.

<a id="storage"></a>
## 14. MongoDB và Media Storage

MongoDB lưu người dùng, project, transcript/translation, narration, Result, job và metadata publication. Binary media nằm trên filesystem theo UPLOAD_DIR, không lưu trực tiếp vào collection mặc định.

Chạy từ backend/ thì storage mặc định là backend/uploads/. Docker dùng /data/uploads trên persistent volume. Hai máy cùng Atlas **không tự chia sẻ file media local**: có thể có metadata nhưng thiếu file trên máy còn lại. Deployment cần bảo toàn cả database và storage tương ứng.

Revision thay đổi có thể làm artifact cũ STALE. Không sửa thủ công COMPLETED/public để vượt validation. Model/index initialization có thể tạo collection/index lúc Backend khởi động: xác nhận database đích trước khi chạy source mới; không tự seed/migrate/reset database chung.

<a id="cicd"></a>
## 15. CI/CD GitHub Actions

| Workflow | Trigger và phạm vi |
| --- | --- |
| [CI V1](.github/workflows/ci.yml) | PR vào main; push main/ci/first-run; manual dispatch; 4 jobs Backend, Customer Web, Admin Web, Customer Mobile |
| [Docker CD V1](.github/workflows/docker-cd-v1.yml) | Manual workflow_dispatch; Ubuntu runner; build/deploy/smoke/recovery/rollback synthetic và cleanup theo ownership guard |

CI V1 chạy install, lint, typecheck, tests; Backend/Web/Admin có build. Backend chỉ chạy mock allowlist, Customer Web loại trừ một media test có tài liệu. Admin/Mobile có network guard; Mobile job không chạy emulator/APK/AAB/EAS. Không suy ra AI LIVE hoặc Android runtime PASS từ CI.

Docker CD V1 không push registry hoặc deploy production/Vercel. [Synthetic runner](infra/local-cd/synthetic-v1/README.md) hỗ trợ chạy local, tạo tài nguyên cô lập và recovery, không phải dev stack lâu dài. Không chạy các môi trường validation/controlled-execution khi chưa hiểu phạm vi.

<a id="troubleshooting"></a>
## 16. Các lỗi thường gặp

| Vấn đề | Nguyên nhân có thể | Cách kiểm tra |
| --- | --- | --- |
| Backend không khởi động | Thiếu env/JWT hoặc MongoDB chưa kết nối | Kiểm tra tên biến, terminal, health; không in secrets |
| MongoDB transaction lỗi | Standalone hoặc nhầm database | Kiểm tra replica set/quyền trên database riêng; không tự reset |
| FFmpeg/ffprobe thiếu | Binary chưa cài, PATH cũ hoặc đường dẫn sai | ffmpeg -version, ffprobe -version; kiểm tra resolver theo PATH |
| Container unhealthy | DB readiness, binary, quyền storage/preflight | Ps, logs, health inspection, manifest; không xóa volume |
| Docker build context bất thường | Sai context, thiếu input hoặc quy tắc loại trừ không đúng | backend/.dockerignore đã hết conflict; đối chiếu snapshot/manifest, không gửi .env hoặc uploads vào context |
| Web không tới API | Sai VITE_API_BASE_URL, CORS hoặc Backend | Network tab, health; restart Vite sau khi đổi env |
| Mobile không tới API | Localhost trên điện thoại, LAN/emulator/firewall | Health từ thiết bị; phân biệt Metro với Backend URL |
| MP4 không có trong public listing | Chưa bật riêng, Result stale, file thiếu/hỏng/nằm trên máy khác | Admin → Dự án → Duyệt video; kiểm tra Result/ngôn ngữ và phản hồi Backend |
| Playback cũ trả 404 | Publication tắt hoặc artifact không CURRENT | Refresh public listing; không dùng protected/source fallback |

<a id="status"></a>
## 17. Trạng thái phát triển

- Public original audio, AI narration và generated MP4 publication đã triển khai; Admin quản lý audio và từng MP4 độc lập. Customer Web là baseline chức năng cho Mobile.
- Customer Web đã được người dùng xác nhận nghiệm thu phát/tua video; lần cập nhật README này không tái chạy browser acceptance. Snapshot runtime cũ trong tài liệu phản ánh thời điểm kiểm tra trước đó.
- Mobile public video đã STATIC PASS và có Android Hermes bundle; Android playback trên thiết bị và revocation runtime vẫn chờ bằng chứng nghiệm thu mới.
- [PR #11](https://github.com/vuvantai14/multilingual-ai-narration/pull/11) đã merge vào main ngày **15/11/2026** tại **6f613e6**. [CI V1 run 43678850327](https://github.com/vuvantai14/multilingual-ai-narration/actions/runs/43678850327) PASS **4/4 jobs**, đã kiểm tra khi cập nhật README. Không coi đây là xác nhận mọi commit tương lai hoặc production deployment.
- Docker S42.4 RunId `s424-20261115t215313` đã DOCKER RUNTIME PASS qua controlled resume, xem mục 10. Đây không phải chứng nhận fresh deployment từ snapshot cũ, AI LIVE, production hoặc Backend replacement/rollback.

Tham khảo [PROGRESS](docs/PROGRESS.md), [CONTEXT](docs/CONTEXT.md), [ARCHITECTURE](docs/ARCHITECTURE.md), [API](docs/API.md), [UI](docs/UI.md) và [Web/Mobile design sync](docs/WEB_MOBILE_DESIGN_SYNC.md). Ưu tiên source hiện tại và bằng chứng được ghi thời điểm rõ ràng khi tài liệu có nhiều snapshot lịch sử.
