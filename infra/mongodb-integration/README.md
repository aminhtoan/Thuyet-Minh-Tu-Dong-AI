# MongoDB replica set test cách ly

Chỉ dành cho fixture tổng hợp và kiểm thử transaction; không phải demo hoặc database ứng dụng. Không tự chạy integration GROUPS_V1.

- Image: `mongo:8.0.17`.
- Compose project: `narration-groups-test`.
- Container: `narration-groups-test-mongodb`.
- Volume dữ liệu: `narration-groups-test-data`.
- Endpoint host: `127.0.0.1:27029`.
- Replica set: `narration-test-rs`, member `localhost:27029`.
- Database duy nhất được phép cho test runner: `multilingual_ai_narration_groups_test`.

Mongod nghe cùng cổng bên trong và bên ngoài container. Node trên Windows dùng `directConnection=true`; không cần sửa hosts hoặc URI Atlas. Healthcheck chỉ initiate nếu chưa cấu hình, không reconfigure; chỉ healthy khi đúng single-node set và PRIMARY.

## Khởi động/dừng

Từ repository root:

```powershell
docker compose -f infra/mongodb-integration/compose.yaml config --quiet
docker compose -f infra/mongodb-integration/compose.yaml up -d --wait --wait-timeout 120
docker compose -f infra/mongodb-integration/compose.yaml ps
docker compose -f infra/mongodb-integration/compose.yaml stop
```

Không dùng `down -v`, `volume prune`, hoặc lệnh thao tác dự án khác. Stop giữ nguyên volume. Chạy lại `up` không tạo bản sao replica set.

## Smoke test có opt-in rõ ràng

Từ `backend/`, trong PowerShell riêng:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27029/multilingual_ai_narration_groups_test?replicaSet=narration-test-rs&directConnection=true'
$env:TEST_DATABASE_NAME='multilingual_ai_narration_groups_test'
node --import tsx tests/isolated-mongo-smoke.ts
```

Runner không load `.env` làm fallback. Nó chỉ đọc URI development để so sánh và từ chối cùng endpoint. Trước fixture write phải khớp URI/database allowlist, Docker project/container/image/volume/network/port/health, MongoDB PRIMARY/set/version và processId giữa kết nối host với `docker exec`.

Smoke chỉ dùng collection `_groups_environment_smoke`, hai ObjectId và run marker ngẫu nhiên. Nó kiểm tra commit, rollback và cleanup chính xác các ID; không drop database/collection/volume. Không gọi AI, không bật flags, không dùng project thật.

## Giới hạn bảo mật

Đây là MongoDB test **không bật authentication**, chỉ publish loopback và dùng Docker bridge network riêng. Không dùng `internal: true` vì Docker Engine hiện tại không publish host port cho network đó. Bất kỳ process local có quyền kết nối cổng này vẫn có thể đọc/ghi dữ liệu test; tuyệt đối không đặt dữ liệu cá nhân/secrets hoặc mở cổng ra LAN. Docker quyền quản trị nằm ngoài trust boundary của guard. Test runner không chứng minh an toàn trước người có quyền sửa Docker hoặc source code.

Không đưa credentials thực vào file này hoặc `test.env.example`. Không tái sử dụng container `projectweb-be-mongo-1` hoặc cấu hình `infra/mongodb-demo/`.

## GROUPS_V1 integration thật (AI-TRANSLATE-04.2)

AI-TRANSLATE-05 adds an explicit test-only admission/source profile to this opt-in suite (128 KiB source, default remains 96 KiB). It does not activate application flags or production budgets. See [admission policy](../../docs/GROUPS_V1_ADMISSION_POLICY.md) for credit assumptions, profiling samples and remaining HTTP/heap accounting blockers.

AI-TRANSLATE-05.1 additionally exercises the real authenticated HTTP + bounded MongoDB + installed Gemini SDK path with local fetch mocks at offered concurrency 1/4/16, response/waiter leases, draft GET, approve and grouped GET. The default application remains unconfigured/flags OFF. See [response lifecycle](../../docs/GROUPS_V1_RESPONSE_LIFECYCLE.md) for measured samples and deployment blockers. The separate `backend/tests/read-only-museum-source.preflight.ts` is read-only development source inspection, NOT an integration fixture writer; never use development as the integration target.

Sau khi môi trường healthy, dùng hai biến `TEST_MONGODB_URI` và `TEST_DATABASE_NAME` explicit như trên, rồi chạy từ `backend/`:

```powershell
node --import tsx --test tests/groups-mongodb.integration.ts
```

Suite gọi isolation guard trước fixture writes, sau đó kết nối Mongoose chỉ tới URI test đã xác minh. Nó dùng models/services/controllers thật, provider mock và các điểm đồng bộ/fault injection quanh thao tác Database thật. `GROUP_TRANSLATION_ENABLED=true` chỉ nằm trong process test; không sửa `.env`. HTTP ra ngoài loopback bị chặn, provider keys để trống.

Fixtures là dữ liệu tổng hợp, theo dõi bằng ID riêng từng lượt. Cleanup chỉ dùng danh sách ID của lượt đó (kể cả Translation và ActivityLog sinh ra), không drop database/collection/volume. Các collections và hai indexes nghiệp vụ cần thiết cho unique-key test được giữ lại trong DB test; không sửa indexes của development/production.

Bao phủ byte-bound Unicode/escaping, cursor close, revision change, preview không ghi Translation, approve/GET/provenance, duplicate/concurrent approve, rollback sau insert, transient transaction retry, duplicate-key conflict, approve/edit race và JWT/RBAC/ownership/deleted-user. Với source 10.001 segments, byte gate chặt hơn sẽ từ chối trước count gate; không tăng cap để ép đường count-only.
