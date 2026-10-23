# Ảnh Trang chủ Public Museum — S27.3.2.1

## S27.3.6.1 — Thư mục chuẩn và kiểm kê SHA-256 (2026-10-23)

Đường dẫn chuẩn hiện hành là `frontend-web/public/museum/`:

```text
museum/
  images/   hero.jpg, museum-intro.jpg, exhibition-history.jpg,
            exhibition-people.jpg, exhibition-peace.jpg, featured-video.jpg
  posters/  bao-tang-chung-tich-chien-tranh.jpg, .gitkeep
  videos/   bao-tang-chung-tich-chien-tranh.mp4, .gitkeep
  captions/ .gitkeep (chưa có phụ đề thật)
```

Trước đây sáu ảnh giao diện nằm ở `public/images/museum/`, tách khỏi poster/video.
Source, allowlist và inventory nay dùng `/museum/images/`; poster/video/captions
giữ URL cũ trong `/museum/`. Homepage, Khám phá và Về bảo tàng dùng chung cấu hình
`homeImages.ts`. Featured video vẫn ưu tiên poster đúng video, không phải ảnh
featured-video.jpg nếu đã có poster hợp lệ. CSS không có URL ảnh cần thay.

**Tương thích bên ngoài:** chưa thể xác minh bookmark, cache hoặc website khác có
tham chiếu `/images/museum/` hay không. Giữ nguyên sáu ảnh và `.gitkeep` tại thư mục
cũ; đây là bản tương thích có chủ ý, không còn là nguồn cấu hình ứng dụng. Không
xóa file nào trong bước này. Chỉ gỡ các URL cũ sau một phê duyệt riêng với bằng
chứng không còn người dùng/tham chiếu; không coi tìm kiếm trong Git là bằng chứng
về toàn bộ Internet. Thay ảnh sau này tại thư mục chuẩn; đồng bộ bản tương thích
nếu vẫn cần nội dung giống nhau. Các test hash kiểm tra hiện trạng di chuyển,
cần cập nhật baseline có chủ ý khi người dùng thay ảnh hợp lệ sau này.

Kiểm kê trước di chuyển:8 media có8 SHA-256 khác nhau, **không có media trùng**.
Sau khi sao chép có6 cặp ảnh giống hệt byte ở hai vị trí. featured-video.jpg không
trùng poster thực tế. Ba `.gitkeep` trong museum có cùng nội dung1 byte, không
phải media; `.gitkeep` trong thư mục ảnh cũ rỗng. Giữ tất cả file đánh dấu này.

| File tương đối trong museum/ | Bytes | SHA-256 trước/sau (khớp) |
| --- | ---: | --- |
| images/hero.jpg | 333552 | `4909e09700a57b3b7b63c92f5a887888dce56705b31c165137dc104d6acc181b` |
| images/museum-intro.jpg | 293942 | `95fb96eb7a7c7ec4174b96284dc6f971a2c028fe1e0ac2c98c817dd1faffdfd0` |
| images/exhibition-history.jpg | 46475 | `332f75c449a9d9e9e6ba2f02b7b1fd6f410d454f3f7573b5db9cce96f6786d85` |
| images/exhibition-people.jpg | 66819 | `806dfc5ea54f22f5dcc7ea531938d46da126c3562d33023031f69d9ad00848bb` |
| images/exhibition-peace.jpg | 343262 | `186a2fc2b456619ae4e481afcb7442aa17c7fceb8dd6f585858744fb8f356558` |
| images/featured-video.jpg | 194933 | `c40f05dac8bf59d95928762ca41d467c13a959326d49a64e6c5602e30773640d` |
| posters/bao-tang-chung-tich-chien-tranh.jpg | 52655 | `c0864ca18256fa82076c73cde72d8734b9507107ca62266baaba2f740da181ef` |
| videos/bao-tang-chung-tich-chien-tranh.mp4 | 23762139 | `e2c4d40dbf7f0d4f6337655da5c2c094ac1d7955a631eadd2146447c1152ec64` |

Không sửa file ảnh, watermark, video, caption, nguồn hoặc quyền sử dụng. Các mục
cũ bên dưới là hồ sơ lịch sử; yêu cầu UI bỏ caption phát triển và badge chuyên đề
đã được ghi nhận ở các bước sau. Không khôi phục các chú thích đó. Liên kết nguồn
và điều kiện quyền video vẫn được hiển thị đầy đủ ở trang chi tiết.

Đường dẫn `/museum-media/` trong guard/test lịch sử vẫn được hỗ trợ tương thích;
không có thư mục/file thật ở đường dẫn đó trong lần kiểm kê này. Ảnh chuyên đề mới
nhận `/museum/images/`; video/poster/captions dùng đúng thư mục theo loại file.
Không tạo phụ đề, video hoặc nội dung biên tập giả.

## Cập nhật S27.3.2.4 — quyền sử dụng và hiển thị (2026-10-23)

Người dùng xác nhận đã có quyền sử dụng các ảnh hiện có và yêu cầu bỏ caption
demo/minh họa khỏi Trang chủ. Không tự gán tác giả, giấy phép cụ thể hoặc xác nhận
nội dung lịch sử. Các đường dẫn, nguồn poster và ghi nhận biên tập phía dưới được
giữ làm hồ sơ nội bộ; mô tả hiển thị ở các bước trước là lịch sử, không còn là quy
tắc UI hiện hành. Không xóa hoặc sửa file ảnh.

UI hiện không render caption phát triển hoặc thông báo minh họa chung. Alt text,
kích thước, lazy loading và fallback vẫn giữ; caption nguồn/điều kiện giấy phép riêng
không bị lọc bỏ. Poster video vẫn có chú thích nguồn như trước. Nếu có yêu cầu ghi
công bắt buộc bổ sung, phải giữ riêng theo bằng chứng, không xem là caption demo.
Ba card trưng bày và các ngôn ngữ chưa công bố vẫn Đang chuẩn bị.

Chép ảnh bạn có quyền sử dụng vào `frontend-web/public/museum/images/`.
Không cần sửa database, route hoặc API. Không ghi đè poster/video thật hiện có.

| Slot | Tên file trong thư mục trên | Kích thước gợi ý | Tỷ lệ hiển thị |
| --- | --- | --- | --- |
| hero | `hero.jpg` | 1600 × 900 | 16:9 |
| museumIntro | `museum-intro.jpg` | 1200 × 900 | 4:3 |
| exhibitionHistory | `exhibition-history.jpg` | 800 × 600 | 4:3 |
| exhibitionPeople | `exhibition-people.jpg` | 800 × 600 | 4:3 |
| exhibitionPeace | `exhibition-peace.jpg` | 800 × 600 | 4:3 |
| featuredVideo | `featured-video.jpg` | 1280 × 720 | 16:9 |

Ví dụ: file `frontend-web/public/museum/images/hero.jpg` có URL `/museum/images/hero.jpg`.
S27.3.2.2: người dùng đã thêm đủ sáu ảnh demo trong thư mục này; các file được giữ
nguyên, không được coi là tư liệu lịch sử đã xác minh. Hero hiện1960×1102;
full-width cover có thể cắt mép. Kiểm tra độ nét ở màn hình lớn/high-DPI trước khi
chọn ảnh chất lượng cao hơn; không tự thay nguồn ảnh hiện tại.

Hero dùng gradient navy, nội dung bên trái và caption ở hàng riêng bên dưới. Ba
ảnh trưng bày dùng thông báo minh họa chung dễ thấy của section thay vì lặp caption;
chú thích nguồn/điều kiện sử dụng riêng (nếu có) vẫn phải giữ dưới ảnh.

## Cấu hình và thay ảnh

- Cấu hình tập trung: `frontend-web/src/features/museum/homeImages.ts`.
- Dùng đúng tên ở bảng để không cần sửa source. Muốn dùng `.webp`, `.avif`, `.png`
  hoặc `.jpeg`, sửa `src` của slot tương ứng. Chỉ cho phép file nội bộ trong
  `/museum/images/`, không dùng URL bên ngoài. Nén ảnh trước khi chép, ưu tiên WebP/AVIF;
  không chỉ đổi phần mở rộng của một file khác định dạng.
- Sửa `alt` để mô tả đúng ảnh được đưa vào; cập nhật width/height cho đúng kích thước
  file. Khung giữ tỷ lệ theo slot; ảnh `object-fit: cover` có thể cắt mép, nên đặt
  chủ thể ở giữa. Không đặt thông tin thiết yếu hoặc chữ dài sát mép ảnh.
- Inventory tài sản được xác định khi Vite build/chạy dev. Sau khi thêm/đổi tên ảnh,
  khởi động lại dev server nếu ảnh chưa hiện; deployment cần build và deploy lại.
- Không có file thì không render `<img>` trỏ đến file thiếu. Ảnh tải lỗi sẽ thử
  nguồn dự phòng của slot, sau đó dùng khung fallback; không lặp tải lại vô hạn.
- Hero tải eager; các slot dưới màn hình đầu tải lazy. Khung có tỷ lệ cố định,
  caption tự xuống dòng, không chèn chữ lên ảnh.

## Nguồn và trạng thái biên tập

Ảnh trong sáu slot mặc định chỉ minh họa bố cục. Khi xuất hiện, luôn có chú thích
“Ảnh minh họa bố cục — không phải tư liệu lịch sử đã xác minh.” Việc chép file
không công bố chuyên đề, không xác nhận nội dung lịch sử và không đổi quyền video.
Ba card trưng bày vẫn **Đang chuẩn bị**, không trở thành chuyên đề có thể mở.

Hero ưu tiên `hero.jpg`, nếu thiếu/lỗi thì dùng poster đúng video công khai đã được
cho phép. Featured video ưu tiên poster đó trước `featured-video.jpg`:
`/museum/posters/bao-tang-chung-tich-chien-tranh.jpg` (640 × 360).
Poster chỉ được dùng khi catalog entry đúng slug, PUBLIC/PUBLISHED, quyền đã xác nhận
và file tồn tại. Caption của poster ghi rõ là khung hình từ video giới thiệu.
Không dùng poster video khác để minh họa cho video này; không thêm nút phát giả.

Để thay bằng ảnh thật sau này, dùng ảnh đã xác minh quyền và nội dung; cập nhật
alt/caption/credit theo thông tin có bằng chứng trong một thay đổi biên tập riêng.
Không tự bỏ nhãn minh họa chỉ vì file nhìn giống ảnh thật. Không tải ảnh Internet,
tạo ảnh lịch sử giả hoặc thay poster/video thật để hoàn thiện bố cục.

## Kiểm tra thủ công

Mở `/` ở 375/768/1024/1280/1440px, zoom 200%; kiểm tra đủ sáu vị trí, caption,
crop, tab qua CTA và không tràn ngang. Thử cả khi không có ảnh, có ảnh, và request
ảnh bị chặn: khung fallback phải xuất hiện. Không cần đăng nhập hoặc gọi provider.
