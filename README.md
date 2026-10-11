# Người kể chuyện AI

## Hệ thống thuyết minh đa ngôn ngữ

Dự án môn Công nghệ phần mềm hỗ trợ người dùng quản lý dự án âm thanh/video và thực hiện quy trình tạo thuyết minh đa ngôn ngữ: tải tệp → chuyển giọng nói thành văn bản → dịch → chọn giọng đọc → tạo âm thanh → xử lý phương tiện → xem kết quả.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Web khách hàng | React.js, TypeScript, Vite |
| Ứng dụng di động | React Native, Expo, Expo Router, TypeScript |
| Web quản trị | React.js, TypeScript, Vite |
| Máy chủ | Node.js, Express, TypeScript |
| Cơ sở dữ liệu | MongoDB, Mongoose; môi trường hiện tại sử dụng MongoDB Atlas |
| Xử lý âm thanh/video | Bộ tích hợp OpenAI và FFmpeg/FFprobe |

## Chức năng chính

- Đăng ký, đăng nhập và đăng xuất; xác thực JWT và phân quyền phía máy chủ.
- Bảng điều khiển, quản lý dự án, tìm kiếm, lọc và phân trang.
- Tạo thuyết minh: tạo dự án, tải âm thanh/video, xem bản ghi/bản dịch, chọn giọng đọc và theo dõi xử lý.
- Lịch sử dự án và xem kết quả khi đã có dữ liệu xử lý thực tế.
- Quản lý tài khoản: xem thông tin và chỉnh sửa họ tên trên Web khách hàng.
- Quản trị: xem tổng quan, người dùng, dự án, tác vụ, ngôn ngữ, giọng đọc, nhật ký và cấu hình an toàn; khóa/mở khóa tài khoản khách hàng.

Bản ghi và bản dịch hiện chỉ đọc. Luồng AI đã có mã tích hợp, nhưng cần cấu hình dịch vụ bên ngoài và chưa được xác minh đầy đủ từ đầu đến cuối trên mọi nền tảng. Không coi giao diện hoặc dữ liệu demo là kết quả AI thật.

## Cấu trúc thư mục

```text
multilingual-ai-narration/
├── frontend-web/       # Web khách hàng
├── frontend-mobile/    # Ứng dụng di động
├── admin-web/          # Web quản trị
├── backend/            # Máy chủ và API
├── docs/               # Tài liệu dự án
└── README.md
```

## Hướng dẫn chạy

Cần Node.js và npm; phiên bản Node.js ghi trong `.nvmrc` là `22.23.3`. Mỗi ứng dụng cài dependencies riêng. Chạy các khối lệnh dưới đây từ thư mục gốc, trong các terminal riêng.

### Cấu hình môi trường

Tạo `.env` từ `.env.example` của từng ứng dụng nếu chưa có; không ghi đè cấu hình đang sử dụng.

- Máy chủ: cấu hình `MONGODB_URI`, hai JWT secret khác nhau, thời hạn token và `CORS_ORIGINS`. Cấu hình khóa/provider AI khi cần chạy AI; cài FFmpeg và FFprobe trong PATH hoặc chỉ định đường dẫn trong `.env` nếu xử lý video.
- Web khách hàng và Web quản trị: đặt `VITE_API_BASE_URL` tới máy chủ, thông thường `http://localhost:8080/api`.
- Di động: đặt `EXPO_PUBLIC_API_BASE_URL` tới địa chỉ LAN của máy tính và giữ hậu tố `/api`. Không dùng `localhost` trên điện thoại thật.

Không commit `.env`, mật khẩu, chuỗi kết nối thật hoặc khóa API. Không đưa secrets vào biến môi trường công khai của frontend. Web quản trị cần tài khoản có vai trò `ADMIN` được cấp qua cơ chế quản trị hiện có, không qua đăng ký khách hàng.

### Máy chủ

```powershell
cd backend
npm install
npm run dev
```

API mặc định: `http://localhost:8080/api`. Máy chủ chỉ khởi động sau khi kết nối MongoDB thành công; kiểm tra tại `/api/health`.

### Web khách hàng

```powershell
cd frontend-web
npm install
npm run dev
```

Mở địa chỉ Vite in ra trong terminal, thường là `http://localhost:5173`.

### Web quản trị

```powershell
cd admin-web
npm install
npm run dev
```

Địa chỉ phát triển: `http://localhost:5174`.

### Ứng dụng di động

```powershell
cd frontend-mobile
npm install
npm start
```

Quét QR bằng Expo Go tương thích với phiên bản Expo của dự án. Điện thoại và máy tính nên cùng mạng LAN. Nếu không kết nối được qua LAN, có thể thử `npx expo start --tunnel`; API máy chủ vẫn phải truy cập được từ điện thoại.

## Trạng thái dự án

Dự án đang phát triển và kiểm thử. Ba ứng dụng đã tích hợp API; một số luồng Android đã được kiểm thử trên thiết bị thật. Các chức năng AI phụ thuộc cấu hình, dịch vụ bên ngoài và có thể phát sinh chi phí. Kiểm thử Whisper thực tế đang hoãn; các kiểm tra chưa thực hiện không được xem là đã hoàn thành.

Xem [tiến độ](docs/PROGRESS.md), [đặc tả giao diện](docs/UI.md), [API](docs/API.md) và [kiến trúc](docs/ARCHITECTURE.md) để biết chi tiết.
