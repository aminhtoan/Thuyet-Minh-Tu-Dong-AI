# Ảnh Trang chủ Public Museum — S27.3.2.1

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

Chép ảnh bạn có quyền sử dụng vào `frontend-web/public/images/museum/`.
Không cần sửa database, route hoặc API. Không ghi đè poster/video thật hiện có.

| Slot | Tên file trong thư mục trên | Kích thước gợi ý | Tỷ lệ hiển thị |
| --- | --- | --- | --- |
| hero | `hero.jpg` | 1600 × 900 | 16:9 |
| museumIntro | `museum-intro.jpg` | 1200 × 900 | 4:3 |
| exhibitionHistory | `exhibition-history.jpg` | 800 × 600 | 4:3 |
| exhibitionPeople | `exhibition-people.jpg` | 800 × 600 | 4:3 |
| exhibitionPeace | `exhibition-peace.jpg` | 800 × 600 | 4:3 |
| featuredVideo | `featured-video.jpg` | 1280 × 720 | 16:9 |

Ví dụ: file `frontend-web/public/images/museum/hero.jpg` có URL `/images/museum/hero.jpg`.
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
  `/images/museum/`, không dùng URL bên ngoài. Nén ảnh trước khi chép, ưu tiên WebP/AVIF;
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
