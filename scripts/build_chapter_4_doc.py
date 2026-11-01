import os
import sys
import docx
from PIL import Image
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

sys.stdout.reconfigure(encoding='utf-8')

def set_cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_background(cell, hex_color):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_table_borders(table, color="94A3B8", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders_xml = f'''
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
    </w:tblBorders>
    '''
    tblPr.append(parse_xml(borders_xml))

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.bold = True
    r.font.size = Pt(13.5)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    return p

def add_body_p(doc, text, bold_prefix="", italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    if bold_prefix:
        rb = p.add_run(bold_prefix)
        rb.font.name = 'Times New Roman'
        rb.font.bold = True
        rb.font.size = Pt(11)
        rb.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.italic = italic
    r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    return p

def add_bullet_p(doc, bold_title, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(3)
    rb = p.add_run(bold_title)
    rb.font.name = 'Times New Roman'
    rb.font.bold = True
    rb.font.size = Pt(10.5)
    rb.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(10.5)
    r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    return p

def add_callout_box(doc, title, text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl, color="0284C7", sz="8")
    cell = tbl.rows[0].cells[0]
    cell.width = Inches(6.5)
    set_cell_background(cell, "F0F9FF")
    set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
    
    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(2)
    r_t = p.add_run(f"📌 {title}: ")
    r_t.font.name = 'Times New Roman'
    r_t.font.bold = True
    r_t.font.size = Pt(10)
    r_t.font.color.rgb = RGBColor(0x03, 0x69, 0xA1)
    
    r_c = p.add_run(text)
    r_c.font.name = 'Times New Roman'
    r_c.font.size = Pt(9.5)
    r_c.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_diagram_image(doc, img_path, caption_num, caption_text, base_width=5.8, max_height=4.0):
    if not os.path.exists(img_path):
        return
    with Image.open(img_path) as im:
        w, h = im.size
        aspect = h / w

    if base_width * aspect > max_height:
        final_w = Inches(max_height / aspect)
        final_h = Inches(max_height)
    else:
        final_w = Inches(base_width)
        final_h = Inches(base_width * aspect)

    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(6)
    p_img.paragraph_format.space_after = Pt(2)
    p_img.add_run().add_picture(img_path, width=final_w, height=final_h)

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(8)
    rc = p_cap.add_run(f"Hình 4.{caption_num}: {caption_text}")
    rc.font.name = 'Times New Roman'
    rc.font.italic = True
    rc.font.size = Pt(9.5)
    rc.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

def build_chapter_4_document(output_docx_path, output_md_path):
    doc = docx.Document()
    diagrams_dir = r"reports/diagrams"

    # Page setup - A4
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.79)
    section.bottom_margin = Inches(0.79)
    section.left_margin = Inches(0.98)
    section.right_margin = Inches(0.79)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(0x11, 0x18, 0x27)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(3)

    # Header block
    p_header = doc.add_paragraph()
    p_header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = p_header.add_run("ỦY BAN NHÂN DÂN THÀNH PHỐ HỒ CHÍ MINH\nTRƯỜNG ĐẠI HỌC SÀI GÒN\nKHOA CÔNG NGHỆ THÔNG TIN\n")
    r1.font.bold = True
    r1.font.size = Pt(12)
    r1.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_line = p_line.add_run("--------------------***--------------------")
    r_line.font.bold = True

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(14)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("CHƯƠNG 4: CÔNG NGHỆ VÀ KỸ THUẬT SỬ DỤNG\n")
    r_title.font.bold = True
    r_title.font.size = Pt(15)
    r_title.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    r_sub = p_title.add_run("HỆ THỐNG THUYẾT MINH TỰ ĐỘNG ĐA NGÔN NGỮ TÍCH HỢP TRÍ TUỆ NHÂN TẠO\n(MULTILINGUAL AI NARRATION SYSTEM FOR MUSEUMS)")
    r_sub.font.bold = True
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    # Info table
    tbl_info = doc.add_table(rows=3, cols=2)
    tbl_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_info, color="94A3B8", sz="4")
    info_data = [
        ("Sinh viên thực hiện:", "Phạm Minh Toàn (3122411216)  –  Vũ Văn Tài (3122411181)"),
        ("Giảng viên hướng dẫn:", "TS. Nguyễn Quốc Huy"),
        ("Mã học phần & Lớp:", "DCT122C2 – Đồ án Chuyên ngành / Công nghệ Phần mềm")
    ]
    for r_idx, (lab, val) in enumerate(info_data):
        row = tbl_info.rows[r_idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        set_cell_margins(c0, 40, 40, 80, 80)
        set_cell_margins(c1, 40, 40, 80, 80)
        set_cell_background(c0, "F8FAFC")
        p0, p1 = c0.paragraphs[0], c1.paragraphs[0]
        r0 = p0.add_run(lab)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r1 = p1.add_run(val)
        r1.font.size = Pt(9.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ==================== 4.1 ====================
    add_heading_1(doc, "4.1. TỔNG QUAN KIẾN TRÚC CÔNG NGHỆ TOÀN HỆ THỐNG")
    add_body_p(doc, "Hệ thống Thuyết minh Tự động Đa ngôn ngữ (Multilingual AI Narration System) được xây dựng theo mô hình phân tán hiện đại, tách biệt hoàn toàn giữa các giao diện khách hàng (Customer Web, Mobile App), giao diện quản trị độc lập (Admin Web) và trung tâm điều phối dịch vụ xử lý nền (Backend API + AI Processing Engine). Mục tiêu cốt lõi của kiến trúc công nghệ là bảo đảm tính mở rộng linh hoạt, độ trễ thấp khi truyền phát âm thanh/video, khả năng xử lý bất đồng bộ các tác vụ tính toán nặng của trí tuệ nhân tạo, và tuân thủ các quy chuẩn bảo mật nghiêm ngặt cho môi trường bảo tàng số.")

    # Table 4.1
    p_cap1 = doc.add_paragraph()
    p_cap1.paragraph_format.space_before = Pt(8)
    p_cap1.paragraph_format.space_after = Pt(3)
    rc1 = p_cap1.add_run("Bảng 4. 1: Bảng tóm tắt các công nghệ và kỹ thuật cốt lõi sử dụng trong hệ thống")
    rc1.font.name = 'Times New Roman'
    rc1.font.bold = True
    rc1.font.size = Pt(10)

    tech_table_data = [
        ("Tầng kiến trúc", "Công nghệ / Nền tảng", "Phiên bản / Công cụ", "Lý do lựa chọn & Vai trò kỹ thuật"),
        ("Customer Web", "React, TypeScript, Vite", "React 19, Vite 5.x", "Ứng dụng web trang đơn (SPA) dành cho biên tập viên và khách tham quan (BYOD); hiệu năng kết xuất tối ưu, Hot Module Replacement cực nhanh."),
        ("Admin Web", "React, TypeScript, Vite", "React 19 (Port 5174)", "Cổng quản trị chuyên biệt độc lập; theo dõi hàng đợi tác vụ AI (Jobs), giám sát người dùng RBAC, danh mục giọng đọc và phân tích lượt nghe QR."),
        ("Mobile App", "React Native, Expo SDK", "Expo SDK 57/58, TypeScript", "Ứng dụng di động cầm tay cho khách tham quan; tích hợp expo-av phát âm thanh chất lượng cao, camera quét mã QR hiện vật tự động."),
        ("Backend API", "Node.js, Express, TypeScript", "Node.js 20 LTS, Express 4.x", "Tầng dịch vụ RESTful API bất đồng bộ theo kiến trúc phân tầng (Controller-Service-Repository); kiểm soát xác thực JWT và điều phối luồng nghiệp vụ."),
        ("Cơ sở dữ liệu", "MongoDB Atlas, Mongoose ODM", "MongoDB 7.x, Mongoose 8.x", "Hệ quản trị NoSQL hướng tài liệu lưu trữ 17 Collection; linh hoạt mô hình hóa phân đoạn lời thoại, bản dịch đa ngôn ngữ và phiên bản CAS."),
        ("Bóc băng STT", "Whisper AI / Gemini STT", "Whisper mono 16kHz", "Nhận dạng tiếng nói tự động từ âm thanh/video nguồn; trích xuất chính xác timestamp (mili-giây) từng câu thoại."),
        ("Dịch thuật AI", "Google Gemini 3.8 Flash", "GROUPS_V1 Algorithm", "Mô hình ngôn ngữ lớn tốc độ cao kết hợp thuật toán phân cụm ngữ cảnh GROUPS_V1; duy trì tính mạch lạc và chuẩn hóa thuật ngữ văn hóa, bảo tàng."),
        ("Tổng hợp TTS", "Google / OpenAI / Edge TTS", "Gemini 3.8 Flash TTS / Nova", "Tổng hợp giọng nói nhân tạo tự nhiên đa ngôn ngữ; tự động co giãn timeline (0.75x–1.5x) đồng bộ chính xác với phân đoạn video gốc."),
        ("Xử lý Media", "FFmpeg & FFprobe", "FFmpeg 6.x Static Binary", "Trích xuất âm thanh mono 16kHz, thực thi bộ lọc Audio Ducking (-12dB) thông minh khi có thuyết minh, đóng gói video chuẩn H.264/AAC."),
        ("Bảo mật & Phân quyền", "JWT, Bcrypt, Helmet, CORS", "Dual JWT + Token Rotation", "Cơ chế Access Token (15m) + Refresh Token (7d) xoay vòng; kiểm soát phân quyền RBAC và Ownership Guard chống truy cập trái phép."),
        ("Triển khai & Vận hành", "Docker, Docker Compose", "Docker Engine 25.x", "Đóng gói đồng nhất toàn bộ môi trường (Backend, Frontend, MongoDB, FFmpeg) sẵn sàng triển khai trên môi trường Cloud/On-Premise.")
    ]

    t41 = doc.add_table(rows=len(tech_table_data), cols=4)
    t41.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t41)
    col_w = [Inches(1.2), Inches(1.8), Inches(1.3), Inches(2.2)]

    for r_idx, r_vals in enumerate(tech_table_data):
        row = t41.rows[r_idx]
        for c_idx, val in enumerate(r_vals):
            c = row.cells[c_idx]
            c.width = col_w[c_idx]
            set_cell_margins(c, top=50, bottom=50, left=60, right=60)
            if r_idx == 0:
                set_cell_background(c, "E2E8F0")
            elif r_idx % 2 == 1:
                set_cell_background(c, "F8FAFC")
            p = c.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            if r_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(val)
            r.font.name = 'Times New Roman'
            r.font.size = Pt(9 if r_idx > 0 else 9.5)
            if r_idx == 0 or c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==================== 4.2 ====================
    add_heading_1(doc, "4.2. CÔNG NGHỆ TẦNG GIAO DIỆN NGƯỜI DÙNG (FRONTEND TECHNOLOGIES)")
    add_body_p(doc, "Hệ thống áp dụng chiến lược phân tách giao diện người dùng thành 3 ứng dụng chuyên biệt, hoạt động độc lập nhằm tối ưu hóa tải trọng và trải nghiệm cho từng nhóm đối tượng mục tiêu:")

    add_heading_2(doc, "4.2.1. Customer Web Portal & Trình nghe Thuyết minh Hiện vật (BYOD)")
    add_bullet_p(doc, "Nền tảng React 19 kết hợp Vite: ", "Customer Web được triển khai dưới dạng ứng dụng trang đơn (SPA) tại cổng 5173. Việc sử dụng React 19 mang lại lợi thế vượt trội về khả năng quản lý trạng thái đồng thời (Concurrent Features), loại bỏ triệt để tình trạng giật lag giao diện khi xử lý các bảng danh sách câu thoại lớn (hàng trăm câu) trong trình biên tập.")
    add_bullet_p(doc, "Kiến trúc mô-đun hóa tính năng (Feature-based Architecture): ", "Cấu trúc thư mục được tổ chức theo module độc lập (`features/transcript`, `features/translation`, `features/voice`, `features/pipeline`), giúp cô lập trạng thái và tái sử dụng logic kết nối API thông qua Custom Hooks.")
    add_bullet_p(doc, "Trình phát âm thanh/video HTTP 206 Partial Content: ", "Tích hợp Media Player tùy chỉnh hỗ trợ các tiêu chuẩn phát trực tuyến phân đoạn (Byte-Range Requests). Người dùng có thể tua tức thì đến bất kỳ thời điểm nào của tệp đa phương tiện mà không phải đợi tải xong toàn bộ tệp dung lượng lớn (hỗ trợ tệp lên đến 500MB).")
    add_bullet_p(doc, "Giao diện BYOD (Bring Your Own Device) cho Bảo tàng: ", "Khách tham quan không cần tải ứng dụng từ App Store/Google Play. Khi dùng điện thoại quét mã QR dán tại hiện vật, trình duyệt web di động sẽ tải ngay trang Audio Guide trực quan (`/thuyet-minh/:slug`), tự động phát bài thuyết minh theo ngôn ngữ mong muốn và gửi tín hiệu phân tích lượt nghe về máy chủ.")

    add_heading_2(doc, "4.2.2. Admin Management Dashboard Độc lập")
    add_bullet_p(doc, "Phân tách cổng độc lập (Port 5174): ", "Để bảo đảm nguyên tắc bảo mật 'Separation of Concerns', ứng dụng Quản trị viên (`admin-web`) được tách thành dự án độc lập, không import chéo mã nguồn với ứng dụng người dùng, ngăn chặn nguy cơ rò rỉ các thành phần quản trị nhạy cảm ra ngoài client thông thường.")
    add_bullet_p(doc, "Bảng giám sát tác vụ nền thời gian thực (Jobs Queue Monitor): ", "Sử dụng thư viện hiển thị tiến trình và huy hiệu trạng thái (Status Badges) để theo dõi các tác vụ xử lý AI nền (Bóc băng, Dịch thuật, Tổng hợp giọng đọc, Ghép video). Quản trị viên có thể xem chi tiết lỗi và kích hoạt thao tác thử lại (Retry) với một cú nhấp chuột.")
    add_bullet_p(doc, "Trực quan hóa dữ liệu với Recharts: ", "Biểu đồ hóa số liệu thống kê thời gian thực: phân bổ lượt nghe theo khung giờ, top ngôn ngữ được khách quốc tế lựa chọn nhiều nhất, và tỷ lệ tác vụ AI hoàn thành thành công.")

    add_heading_2(doc, "4.2.3. Mobile Customer Application (React Native + Expo SDK 57/58)")
    add_bullet_p(doc, "Mã nguồn di động đa nền tảng: ", "Xây dựng bằng React Native kết hợp Expo SDK mới nhất, xuất bản đồng thời cho cả hệ điều hành Android và iOS từ một cơ sở mã TypeScript duy nhất.")
    add_bullet_p(doc, "Xử lý âm thanh chất lượng cao với `expo-av`: ", "Quản lý phiên phát âm thanh nền (Background Audio Playback), hỗ trợ tạm dừng khi có cuộc gọi đến và tự động chuyển tiếp giữa các bài thuyết minh hiện vật.")
    add_bullet_p(doc, "Quét mã QR qua Camera: ", "Tích hợp mô-đun máy ảnh nhận diện QR tức thì trong điều kiện ánh sáng bảo tàng, lập tức điều hướng khách tham quan đến đúng bài giới thiệu hiện vật tương ứng.")

    # ==================== 4.3 ====================
    add_heading_1(doc, "4.3. CÔNG NGHỆ TẦNG MÁY CHỦ VÀ CƠ SỞ DỮ LIỆU (BACKEND & PERSISTENCE)")
    add_body_p(doc, "Tầng máy chủ đóng vai trò hạt nhân điều phối toàn bộ luồng dữ liệu, thực thi kiểm soát bảo mật và quản lý tiến trình tích hợp AI:")

    add_heading_2(doc, "4.3.1. Nền tảng Backend API: Node.js, Express & TypeScript")
    add_bullet_p(doc, "Kiến trúc phân tầng chuẩn hóa (Layered Architecture): ", "Mã nguồn được phân tách nghiêm ngặt thành các tầng: `Routes` (định tuyến URL), `Controllers` (tiếp nhận HTTP Request, kiểm tra tham số), `Services` (thực thi nghiệp vụ cốt lõi), `Repositories/Models` (truy xuất cơ sở dữ liệu), và `Middlewares` (xác thực, phân quyền, xử lý lỗi tập trung).")
    add_bullet_p(doc, "Chuẩn hóa định dạng phản hồi (API Envelope): ", "Mọi phản hồi từ hệ thống đều tuân thủ cấu trúc đồng nhất: `{ success: true, data: T }` đối với thao tác thành công và `{ success: false, error: { code, message } }` đối với lỗi, giúp client xử lý an toàn và tránh các biệt lệ không mong muốn.")
    add_bullet_p(doc, "TypeScript Strict Mode toàn diện: ", "Toàn bộ mã nguồn backend được định kiểu tĩnh chặt chẽ (Strict Mode), loại bỏ hoàn toàn việc sử dụng kiểu dữ liệu ngầm định `any`, đảm bảo tính an toàn dữ liệu từ lúc biên dịch.")

    add_heading_2(doc, "4.3.2. Động cơ Điều phối Tác vụ Nền Bất đồng bộ (ProcessingJob Worker Engine)")
    add_body_p(doc, "Đặc thù của các bài toán trí tuệ nhân tạo (STT trên tệp video dài, dịch thuật văn bản lớn qua LLM, tổng hợp giọng đọc TTS và render video FFmpeg) là tiêu tốn nhiều thời gian (từ vài chục giây đến vài phút). Nếu xử lý đồng bộ trong chu kỳ Request-Response của HTTP, hệ thống sẽ bị treo hoặc gặp lỗi Gateway Timeout (HTTP 504).")
    add_body_p(doc, "Nhóm phát triển đã thiết kế và triển khai động cơ xử lý tác vụ nền bất đồng bộ (`ProcessingJob Engine`):")
    add_bullet_p(doc, "Cơ chế hàng đợi tác vụ (Job Queue Model): ", "Khi người dùng yêu cầu bóc băng, dịch hoặc ghép video, máy chủ lập tức tạo một bản ghi `ProcessingJob` với trạng thái `PENDING` và trả về mã tác vụ (JobId) trong vòng 50ms.")
    add_bullet_p(doc, "Thực thi phi phong tỏa (Non-blocking Asynchronous Execution): ", "Tiến trình nền (Background Worker) tiếp nhận tác vụ, cập nhật trạng thái `PROCESSING`, theo dõi tỷ lệ phần trăm hoàn thành (`progress: 0% -> 100%`) và cập nhật kết quả vào cơ sở dữ liệu khi hoàn tất (`COMPLETED`).")
    add_bullet_p(doc, "Phục hồi sự cố và Thử lại (Retry & Failure Recovery): ", "Nếu gặp lỗi gián đoạn mạng hoặc dịch vụ AI bên thứ ba từ chối tạm thời, tác vụ được ghi nhận mã lỗi cụ thể (`error.code`, `error.message`) và cho phép thử lại với số lần quy định mà không làm mất dữ liệu các giai đoạn trước.")

    add_diagram_image(doc, os.path.join(diagrams_dir, "Figure_3_4_Pipeline_Activity_Diagram.png"), 1, "Sơ đồ luồng điều phối tác vụ xử lý nền bất đồng bộ (ProcessingJob Pipeline)")

    add_callout_box(doc, "Cơ chế Khóa Lạc quan (Optimistic Concurrency Control - CAS)", 
        "Trong nghiệp vụ biên tập lời thoại, để tránh xung đột ghi đè khi nhiều người dùng hoặc tiến trình cùng chỉnh sửa một phân đoạn câu, hệ thống áp dụng cơ chế Compare-And-Set (CAS). Mỗi bản ghi Transcript duy trì một trường 'version' số nguyên. Khi Client gửi yêu cầu cập nhật, câu truy vấn MongoDB sử dụng điều kiện: { _id: transcriptId, version: currentVersion }. Nếu phiên bản trong DB đã bị thay đổi bởi thao tác khác, câu lệnh trả về kết quả 0 bản ghi bị ảnh hưởng và hệ thống ném ra mã lỗi HTTP 409 Conflict, yêu cầu người dùng tải lại bản ghi mới nhất trước khi chỉnh sửa tiếp.")

    add_heading_2(doc, "4.3.3. Hệ Quản trị Cơ sở Dữ liệu NoSQL MongoDB & Mongoose ODM")
    add_body_p(doc, "Hệ thống sử dụng MongoDB Atlas (NoSQL) với 17 Collections chuẩn hóa:")
    add_bullet_p(doc, "Tính linh hoạt của cấu trúc Schema: ", "Các phân đoạn câu thoại (`transcriptsegments`) và phân đoạn dịch (`translationsegments`) có cấu trúc mảng động, thời lượng biến thiên và liên kết 1-N phức tạp. Mô hình Document của MongoDB cho phép lập chỉ mục (Indexing) theo `projectId`, `startTime`, `languageId` với tốc độ truy vấn mili-giây.")
    add_bullet_p(doc, "Tách biệt nhị phân và siêu dữ liệu (Binary & Metadata Separation): ", "Hệ thống tuân thủ nghiêm ngặt quy tắc: Cơ sở dữ liệu MongoDB CHỈ lưu trữ siêu dữ liệu kỹ thuật (đường dẫn tệp, kích thước, định dạng, thời lượng, mã băm), trong khi toàn bộ tệp nhị phân thực tế (video nguồn, audio mono, file thuyết minh TTS, video thành phẩm) được lưu trên hệ thống tệp đĩa cục bộ bảo mật (`backend/uploads/`).")

    # ==================== 4.4 ====================
    add_heading_1(doc, "4.4. KỸ THUẬT TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI PIPELINE INTEGRATION)")
    add_body_p(doc, "Pipeline trí tuệ nhân tạo là linh hồn của hệ thống, được tự động hóa hoàn toàn qua 3 giai đoạn kế tiếp nhau:")

    add_heading_2(doc, "4.4.1. Bóc băng Lời thoại Tự động (Speech-to-Text - STT)")
    add_bullet_p(doc, "Tiền xử lý âm thanh Mono 16kHz: ", "Trước khi gửi âm thanh sang mô hình nhận dạng, hệ thống dùng FFmpeg trích xuất luồng âm thanh thành định dạng chuẩn WAV Mono 1 kênh, tần số lấy mẫu 16,000Hz (chuẩn tối ưu nhất cho các mô hình Transformer nhận dạng giọng nói). Thao tác này giúp giảm 75% dung lượng tệp và loại bỏ tạp âm stereo.")
    add_bullet_p(doc, "Trích xuất mốc thời gian chính xác: ", "Mô hình STT (Whisper AI / Gemini STT) trả về danh sách phân đoạn câu kèm mốc `startTime` và `endTime` chính xác đến mili-giây, làm cơ sở toán học để đồng bộ hình ảnh và phụ đề về sau.")

    add_heading_2(doc, "4.4.2. Thuật toán Phân cụm Ngữ cảnh GROUPS_V1 & Dịch thuật Đa ngôn ngữ")
    add_body_p(doc, "Thách thức lớn nhất trong việc dịch bài thuyết minh bảo tàng là: Người thuyết minh thường ngắt câu ngắn để lấy hơi, khiến tệp bóc băng tạo ra các mẩu câu cụt lủn (ví dụ: 'Đây là...', 'bức tranh sơn mài...', 'vẽ năm 1940'). Nếu dịch từng câu đơn lẻ bằng các công cụ dịch máy thông thường, kết quả sẽ hoàn toàn mất ngữ cảnh, sai lệch cấu trúc ngữ pháp và thô thiển.")
    add_body_p(doc, "Để giải quyết triệt để vấn đề này, nhóm đã nghiên cứu và phát triển thuật toán phân cụm ngữ cảnh độc quyền GROUPS_V1 kết hợp cùng mô hình Google Gemini 3.8 Flash:")

    add_bullet_p(doc, "Quy tắc gom cụm thông minh (Context Clustering): ", "Thuật toán quét tuần tự timeline câu gốc. Những câu có khoảng lặng ngắt nghỉ (gap) nhỏ hơn ngưỡng cho phép (khoảng 0.5s - 1.2s) và cùng thuộc một ý trọn vẹn sẽ được gom thành một Cụm ngữ cảnh (`TranslationGroup`).")
    add_bullet_p(doc, "Dịch thuật có nhận thức ngữ cảnh (Context-Aware LLM Prompting): ", "Gemini 3.8 Flash được cung cấp toàn bộ đoạn văn bản của cụm kèm theo các chỉ dẫn chuẩn hóa (System Prompt) về văn phong lịch sử, bảo tồn thuật ngữ di sản và yêu cầu trả về cấu trúc JSON đối chiếu chính xác từng câu con.")
    add_bullet_p(doc, "Bảo toàn đối sánh 1-1: ", "Sau khi LLM dịch xong toàn bộ cụm, thuật toán tự động ánh xạ ngược kết quả dịch về từng phân đoạn thời gian gốc (`translationsegments`), bảo đảm mốc thời gian phụ đề không bị xô lệch dù ngữ pháp ngôn ngữ đích (Anh, Trung, Hàn, Nhật) có đảo trật tự từ.")

    add_diagram_image(doc, os.path.join(diagrams_dir, "Figure_3_7_Group_Translation_Sequence.png"), 2, "Quy trình phân cụm ngữ cảnh GROUPS_V1 kết hợp Google Gemini 3.8 Flash")

    # Table 4.2: So sánh thuật toán dịch
    p_cap2 = doc.add_paragraph()
    p_cap2.paragraph_format.space_before = Pt(8)
    p_cap2.paragraph_format.space_after = Pt(3)
    rc2 = p_cap2.add_run("Bảng 4. 2: So sánh giữa phương pháp dịch câu đơn lẻ và thuật toán GROUPS_V1")
    rc2.font.name = 'Times New Roman'
    rc2.font.bold = True
    rc2.font.size = Pt(10)

    cmp_data = [
        ("Tiêu chí đánh giá", "Dịch câu đơn lẻ truyền thống", "Thuật toán GROUPS_V1 (Nhóm đề xuất)"),
        ("Tính toàn vẹn ngữ nghĩa", "Dễ mất ngữ cảnh; các câu cụt bị dịch thô hoặc sai nghĩa bóng.", "Bảo toàn ngữ cảnh trọn vẹn nhờ gom nhóm câu liền kề theo đoạn ý nghĩa."),
        ("Chuẩn hóa thuật ngữ bảo tàng", "Không đồng nhất; cùng một hiện vật có thể bị dịch thành nhiều từ khác nhau.", "Tích hợp Glossary Dictionary chuyên biệt trong System Prompt của Gemini."),
        ("Độ trễ và Chi phí API", "Tốn nhiều lượt gọi API (gọi riêng cho từng câu ngắn).", "Giảm 60–75% số lượng cuộc gọi API nhờ gộp cụm câu theo đợt (batching)."),
        ("Khớp mốc thời gian phụ đề", "Dễ làm tràn câu hoặc co cụm mốc thời gian.", "Thuật toán tự động ánh xạ đối sánh 1-1 về từng timestamp gốc ban đầu.")
    ]
    t42 = doc.add_table(rows=len(cmp_data), cols=3)
    t42.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t42)
    col_w2 = [Inches(1.8), Inches(2.3), Inches(2.4)]
    for r_idx, r_vals in enumerate(cmp_data):
        row = t42.rows[r_idx]
        for c_idx, val in enumerate(r_vals):
            c = row.cells[c_idx]
            c.width = col_w2[c_idx]
            set_cell_margins(c, top=50, bottom=50, left=60, right=60)
            if r_idx == 0:
                set_cell_background(c, "E2E8F0")
            elif r_idx % 2 == 1:
                set_cell_background(c, "F8FAFC")
            p = c.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            if r_idx == 0 or c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if r_idx == 0 else WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(val)
                r.font.name = 'Times New Roman'
                r.font.bold = True
                r.font.size = Pt(9.5)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(val)
                r.font.name = 'Times New Roman'
                r.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_callout_box(doc, "Bảo tồn Thuật ngữ Di sản & Lịch sử trong GROUPS_V1", 
        "Hệ thống tích hợp bảng quy chuẩn thuật ngữ bảo tàng (Glossary Dictionary) vào luồng nhắc của Gemini. Ví dụ: 'Trống đồng Đông Sơn' được chuẩn hóa thành 'Dong Son Bronze Drum', 'Áo dài cung đình' thành 'Royal Ao Dai', ngăn chặn hiện tượng AI dịch sai nghĩa đen hoặc tạo ra từ ngữ không phù hợp với không gian bảo tàng.")

    add_heading_2(doc, "4.4.3. Tổng hợp Giọng đọc Nhân tạo (TTS) & Co giãn Timeline Tự động")
    add_bullet_p(doc, "Thư viện giọng đọc đa dạng: ", "Hỗ trợ danh mục giọng đọc AI phong phú theo từng ngôn ngữ đích, phân tách rõ giới tính (Nam/Nữ) và tông giọng (truyền cảm, trang trọng, ấm áp), phù hợp với phong cách thuyết minh bảo tàng.")
    add_bullet_p(doc, "Thuật toán co giãn tốc độ đọc (Timeline Scaling): ", "Độ dài câu dịch giữa các ngôn ngữ thường có sự chênh lệch lớn (ví dụ: tiếng Anh thường dài hơn tiếng Việt 20–30% về số âm tiết). Nếu đọc với tốc độ mặc định 1.0x, audio thuyết minh sẽ tràn qua phân đoạn câu kế tiếp. Hệ thống tính toán tỷ lệ: SpeedRatio = (Thời lượng đọc tự nhiên) / (Thời lượng khung thời gian video). Từ đó, tự động điều chỉnh tốc độ phát âm trong dải an toàn (0.75x – 1.5x) kết hợp thuật toán bảo toàn cao độ âm thanh (Pitch Preservation), giúp giọng đọc luôn tự nhiên và đồng bộ tuyệt đối với hình ảnh video.")

    add_diagram_image(doc, os.path.join(diagrams_dir, "Figure_3_9_TTS_Narration_Sequence.png"), 3, "Quy trình tổng hợp giọng đọc TTS và co giãn tốc độ timeline")

    # ==================== 4.5 ====================
    add_heading_1(doc, "4.5. KỸ THUẬT XỬ LÝ ĐA PHƯƠNG TIỆN VÀ DỰNG VIDEO (MEDIA ENGINE & FFMPEG)")
    add_body_p(doc, "Phân hệ xử lý đa phương tiện sử dụng thư viện phần mềm mã nguồn mở FFmpeg và FFprobe được biên dịch tĩnh, vận hành độc lập trên máy chủ:")

    add_heading_2(doc, "4.5.1. Bóc tách và Thẩm định Thông số Kỹ thuật (FFprobe)")
    add_body_p(doc, "Khi người dùng tải lên tệp Video hoặc Audio (hỗ trợ MP4, MKV, MOV, MP3, WAV, AAC tối đa 500MB), hệ thống thực thi FFprobe trong chế độ luồng an toàn (Spawn child process với timeout và giới hạn bộ nhớ) để đọc thông số kỹ thuật:")
    add_bullet_p(doc, "Xác minh MIME và Luồng dữ liệu (Stream Verification): ", "Kiểm tra xem tệp có chứa luồng âm thanh hợp lệ hay không, ngăn chặn các tệp giả mạo phần mở rộng để tấn công máy chủ.")
    add_bullet_p(doc, "Đo đạc chỉ số chính xác: ", "Xác định thời lượng tổng (`duration`), tốc độ bit (`bitrate`), tỷ lệ khung hình (`framerate`), độ phân giải (`width x height`), và cấu hình kênh âm thanh.")

    add_heading_2(doc, "4.5.2. Kỹ thuật Hòa trộn Âm thanh Thông minh (Audio Ducking -12dB)")
    add_body_p(doc, "Audio Ducking là kỹ thuật chuẩn truyền hình chuyên nghiệp: khi có giọng đọc thuyết minh cất lên, âm thanh môi trường hoặc âm thanh nền gốc của video phải tự động giảm âm lượng xuống để người xem nghe rõ lời bình; khi dứt câu thuyết minh, âm thanh nền phải từ từ tăng trở lại mức ban đầu.")
    add_body_p(doc, "Nhóm đã thiết lập chuỗi bộ lọc FFmpeg phức hợp (`complex_filter`) sử dụng module `sidechaincompress`:")
    add_bullet_p(doc, "Ngưỡng nén âm lượng (Threshold & Ratio): ", "Khi phát hiện biên độ tín hiệu từ luồng thuyết minh TTS, bộ lọc nén âm thanh gốc xuống chính xác -12dB, đảm bảo giọng đọc nổi bật nhưng âm thanh nền không bị tắt hẳn.")
    add_bullet_p(doc, "Độ trễ mượt mà (Attack & Release Time): ", "Thời gian hạ âm (Attack) được cấu hình 200ms để tránh cảm giác giật âm đột ngột; thời gian phục hồi (Release) được cấu hình 800ms để âm thanh nền trở lại êm ái khi câu thuyết minh vừa kết thúc.")

    # Table 4.3: FFmpeg Audio Ducking parameters
    p_cap3 = doc.add_paragraph()
    p_cap3.paragraph_format.space_before = Pt(8)
    p_cap3.paragraph_format.space_after = Pt(3)
    rc3 = p_cap3.add_run("Bảng 4. 3: Ma trận thông số kỹ thuật bộ lọc FFmpeg Audio Ducking")
    rc3.font.name = 'Times New Roman'
    rc3.font.bold = True
    rc3.font.size = Pt(10)

    duck_data = [
        ("Tham số bộ lọc", "Giá trị cấu hình", "Ý nghĩa kỹ thuật và hiệu quả âm học"),
        ("threshold", "0.08 (~ -22dB)", "Ngưỡng biên độ âm thanh thuyết minh AI kích hoạt nén nhạc nền."),
        ("ratio", "4.0 (hoặc mức giảm -12dB)", "Hệ số nén âm lượng nhạc nền gốc; giữ lại âm vang vừa đủ, không tắt nghẽn."),
        ("attack", "200 ms", "Thời gian hạ dần âm lượng nền từ 0dB xuống -12dB; chuyển tiếp mượt mà."),
        ("release", "800 ms", "Thời gian hồi phục âm lượng nền về mức gốc khi dứt câu thoại."),
        ("makeup", "1.0", "Hệ số khuếch đại bù tín hiệu đầu ra; đảm bảo chuẩn âm thanh phát sóng.")
    ]
    t43 = doc.add_table(rows=len(duck_data), cols=3)
    t43.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t43)
    col_w3 = [Inches(1.8), Inches(1.8), Inches(2.9)]
    for r_idx, r_vals in enumerate(duck_data):
        row = t43.rows[r_idx]
        for c_idx, val in enumerate(r_vals):
            c = row.cells[c_idx]
            c.width = col_w3[c_idx]
            set_cell_margins(c, top=50, bottom=50, left=60, right=60)
            if r_idx == 0:
                set_cell_background(c, "E2E8F0")
            elif r_idx % 2 == 1:
                set_cell_background(c, "F8FAFC")
            p = c.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            if r_idx == 0 or c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if r_idx == 0 else WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(val)
                r.font.name = 'Times New Roman'
                r.font.bold = True
                r.font.size = Pt(9.5)
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(val)
                r.font.name = 'Times New Roman'
                r.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_diagram_image(doc, os.path.join(diagrams_dir, "Figure_3_8_FFmpeg_Streaming_Sequence.png"), 4, "Kỹ thuật hòa trộn Audio Ducking (-12dB) và truyền phát phân đoạn HTTP 206")

    add_heading_2(doc, "4.5.3. Xuất bản Video & Phân phối Truyền thông (HTTP 206 Partial Content)")
    add_bullet_p(doc, "Đóng gói đa phương tiện tiêu chuẩn cao: ", "Video đầu ra được mã hóa chuẩn H.264 (AVC) cho luồng hình ảnh và AAC-LC 128kbps cho luồng âm thanh đã hòa trộn, đóng gói trong định dạng chứa MP4 với cờ `+faststart` (di chuyển khối siêu dữ liệu `moov atom` lên đầu tệp để trình duyệt có thể bắt đầu phát ngay lập tức khi vừa nhận những byte đầu tiên).")
    add_bullet_p(doc, "Phân đoạn truyền phát HTTP 206 Partial Content: ", "Máy chủ backend triển khai bộ xử lý tiêu đề `Range: bytes=start-end`. Khi người dùng tua video trên trình phát web, trình duyệt gửi yêu cầu nhận dải byte cụ thể, máy chủ phản hồi với mã HTTP 206 và chỉ trả về đúng phân đoạn dữ liệu được yêu cầu, tiết kiệm tối đa băng thông mạng và mang lại trải nghiệm tua mượt mà không độ trễ.")

    # ==================== 4.6 ====================
    add_heading_1(doc, "4.6. KỸ THUẬT BẢO MẬT, PHÂN QUYỀN VÀ GIÁM SÁT VẬN HÀNH")

    add_heading_2(doc, "4.6.1. Xác thực Phân tán Kép & Xoay vòng Token (Token Rotation)")
    add_bullet_p(doc, "Cơ chế Dual JWT (Access Token + Refresh Token): ", "Access Token mang thời gian sống ngắn (15 phút) dùng để xác thực nhanh các yêu cầu API thông qua tiêu đề `Authorization: Bearer <token>`. Refresh Token mang thời gian sống 7 ngày dùng để xin cấp phát lại Access Token mới mà người dùng không phải nhập lại mật khẩu.")
    add_bullet_p(doc, "Cơ chế xoay vòng Refresh Token (Token Rotation): ", "Mỗi khi Refresh Token được sử dụng để lấy Access Token mới, hệ thống lập tức hủy bỏ Refresh Token cũ trong Collection `authsessions` và cấp phát một cặp mã mới. Nếu một Refresh Token cũ bị kẻ xấu cố tình sử dụng lại, hệ thống sẽ phát hiện hành vi tấn công và lập tức vô hiệu hóa toàn bộ phiên đăng nhập của tài khoản đó.")

    add_diagram_image(doc, os.path.join(diagrams_dir, "Figure_3_5_Auth_Sequence.png"), 5, "Cơ chế xác thực phân tán Dual JWT kết hợp xoay vòng Refresh Token")

    add_heading_2(doc, "4.6.2. Kiểm soát Phân quyền RBAC & Bộ bảo vệ Quyền sở hữu (Ownership Guard)")
    add_bullet_p(doc, "Phân quyền dựa trên vai trò (Role-Based Access Control): ", "Hệ thống phân tách rạch ròi 2 cấp độ quyền hạn: `CUSTOMER` (chỉ thao tác trên các dự án do chính mình tạo ra) và `ADMIN` (có toàn quyền giám sát hệ thống, quản lý danh mục ngôn ngữ, giọng đọc và người dùng).")
    add_bullet_p(doc, "Bộ bảo vệ quyền sở hữu (Ownership Guard): ", "Trước khi thực hiện bất kỳ thao tác xem, sửa, xóa dự án hoặc tải tệp kết quả nào, tầng Middleware kiểm tra điều kiện sở hữu: `project.userId.toString() === req.user.id`. Kỹ thuật này triệt tiêu hoàn toàn lỗ hổng bảo mật nghiêm trọng IDOR (Insecure Direct Object Reference).")

    add_heading_2(doc, "4.6.3. Phòng thủ Đa tầng & Đóng gói Môi trường Docker")
    add_bullet_p(doc, "Mã hóa mật khẩu an toàn: ", "Mật khẩu người dùng được băm (hash) bằng thuật ngữ Bcrypt với Salt Rounds = 10, không bao giờ lưu trữ mật khẩu dạng văn bản thô (plain-text) và không bao giờ serialize trường `passwordHash` ra ngoài phản hồi API.")
    add_bullet_p(doc, "Bảo vệ tầng mạng với Helmet & CORS: ", "Áp dụng Helmet nhằm thiết lập các tiêu đề HTTP bảo mật (chống XSS, Clickjacking, MIME-sniffing), kết hợp cấu hình CORS nghiêm ngặt chỉ chấp nhận các nguồn gốc (Origin) được khai báo hợp lệ từ Web và Mobile.")
    add_bullet_p(doc, "Container hóa với Docker & Docker Compose: ", "Toàn bộ hệ thống được đóng gói thành các Docker Container độc lập, chuẩn hóa môi trường thực thi (bao gồm việc cài đặt sẵn các gói nhị phân FFmpeg/FFprobe và các biến môi trường), giúp việc triển khai lên máy chủ thực tế diễn ra nhất quán và nhanh chóng.")

    add_diagram_image(doc, os.path.join(diagrams_dir, "Figure_3_2_Deployment_Diagram.png"), 6, "Mô hình triển khai Container hóa toàn diện với Docker và Docker Compose")

    # Save to Word
    doc.save(output_docx_path)
    file_size_mb = os.path.getsize(output_docx_path) / (1024 * 1024)
    print(f"Successfully generated Chapter 4 DOCX: {output_docx_path} ({file_size_mb:.2f} MB)")

    # Build standalone markdown file
    md_content = """# CHƯƠNG 4: CÔNG NGHỆ VÀ KỸ THUẬT SỬ DỤNG
## HỆ THỐNG THUYẾT MINH TỰ ĐỘNG ĐA NGÔN NGỮ TÍCH HỢP TRÍ TUỆ NHÂN TẠO
**Sinh viên thực hiện**: Phạm Minh Toàn (3122411216) – Vũ Văn Tài (3122411181)  
**Giảng viên hướng dẫn**: TS. Nguyễn Quốc Huy  
**Lớp học phần**: DCT122C2 – Đồ án Chuyên ngành / Công nghệ Phần mềm  

---

## 4.1. TỔNG QUAN KIẾN TRÚC CÔNG NGHỆ TOÀN HỆ THỐNG
Hệ thống Thuyết minh Tự động Đa ngôn ngữ (Multilingual AI Narration System) được xây dựng theo mô hình phân tán hiện đại, tách biệt hoàn toàn giữa các giao diện khách hàng (Customer Web, Mobile App), giao diện quản trị độc lập (Admin Web) và trung tâm điều phối dịch vụ xử lý nền (Backend API + AI Processing Engine). Mục tiêu cốt lõi của kiến trúc công nghệ là bảo đảm tính mở rộng linh hoạt, độ trễ thấp khi truyền phát âm thanh/video, khả năng xử lý bất đồng bộ các tác vụ tính toán nặng của trí tuệ nhân tạo, và tuân thủ các quy chuẩn bảo mật nghiêm ngặt cho môi trường bảo tàng số.

### Bảng 4.1: Bảng tóm tắt các công nghệ và kỹ thuật cốt lõi sử dụng trong hệ thống
| Tầng kiến trúc | Công nghệ / Nền tảng | Phiên bản / Công cụ | Lý do lựa chọn & Vai trò kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Customer Web** | React, TypeScript, Vite | React 19, Vite 5.x | Ứng dụng web trang đơn (SPA) dành cho biên tập viên và khách tham quan (BYOD); hiệu năng kết xuất tối ưu, Hot Module Replacement cực nhanh. |
| **Admin Web** | React, TypeScript, Vite | React 19 (Port 5174) | Cổng quản trị chuyên biệt độc lập; theo dõi hàng đợi tác vụ AI (Jobs), giám sát người dùng RBAC, danh mục giọng đọc và phân tích lượt nghe QR. |
| **Mobile App** | React Native, Expo SDK | Expo SDK 57/58, TypeScript | Ứng dụng di động cầm tay cho khách tham quan; tích hợp expo-av phát âm thanh chất lượng cao, camera quét mã QR hiện vật tự động. |
| **Backend API** | Node.js, Express, TypeScript | Node.js 20 LTS, Express 4.x | Tầng dịch vụ RESTful API bất đồng bộ theo kiến trúc phân tầng (Controller-Service-Repository); kiểm soát xác thực JWT và điều phối luồng nghiệp vụ. |
| **Cơ sở dữ liệu** | MongoDB Atlas, Mongoose ODM | MongoDB 7.x, Mongoose 8.x | Hệ quản trị NoSQL hướng tài liệu lưu trữ 17 Collection; linh hoạt mô hình hóa phân đoạn lời thoại, bản dịch đa ngôn ngữ và phiên bản CAS. |
| **Bóc băng STT** | Whisper AI / Gemini STT | Whisper mono 16kHz | Nhận dạng tiếng nói tự động từ âm thanh/video nguồn; trích xuất chính xác timestamp (mili-giây) từng câu thoại. |
| **Dịch thuật AI** | Google Gemini 3.8 Flash | GROUPS_V1 Algorithm | Mô hình ngôn ngữ lớn tốc độ cao kết hợp thuật toán phân cụm ngữ cảnh GROUPS_V1; duy trì tính mạch lạc và chuẩn hóa thuật ngữ văn hóa, bảo tàng. |
| **Tổng hợp TTS** | Google / OpenAI / Edge TTS | Gemini 3.8 Flash TTS / Nova | Tổng hợp giọng nói nhân tạo tự nhiên đa ngôn ngữ; tự động co giãn timeline (0.75x–1.5x) đồng bộ chính xác với phân đoạn video gốc. |
| **Xử lý Media** | FFmpeg & FFprobe | FFmpeg 6.x Static Binary | Trích xuất âm thanh mono 16kHz, thực thi bộ lọc Audio Ducking (-12dB) thông minh khi có thuyết minh, đóng gói video chuẩn H.264/AAC. |
| **Bảo mật & Phân quyền** | JWT, Bcrypt, Helmet, CORS | Dual JWT + Token Rotation | Cơ chế Access Token (15m) + Refresh Token (7d) xoay vòng; kiểm soát phân quyền RBAC và Ownership Guard chống truy cập trái phép. |
| **Triển khai & Vận hành** | Docker, Docker Compose | Docker Engine 25.x | Đóng gói đồng nhất toàn bộ môi trường (Backend, Frontend, MongoDB, FFmpeg) sẵn sàng triển khai trên môi trường Cloud/On-Premise. |

---

## 4.2. CÔNG NGHỆ TẦNG GIAO DIỆN NGƯỜI DÙNG (FRONTEND TECHNOLOGIES)
Hệ thống áp dụng chiến lược phân tách giao diện người dùng thành 3 ứng dụng chuyên biệt, hoạt động độc lập:

### 4.2.1. Customer Web Portal & Trình nghe Thuyết minh Hiện vật (BYOD)
- **Nền tảng React 19 kết hợp Vite**: Customer Web được triển khai dưới dạng ứng dụng trang đơn (SPA) tại cổng 5173. Việc sử dụng React 19 mang lại lợi thế vượt trội về khả năng quản lý trạng thái đồng thời (Concurrent Features), loại bỏ triệt để tình trạng giật lag giao diện khi xử lý các bảng danh sách câu thoại lớn (hàng trăm câu) trong trình biên tập.
- **Kiến trúc mô-đun hóa tính năng (Feature-based Architecture)**: Cấu trúc thư mục được tổ chức theo module độc lập (`features/transcript`, `features/translation`, `features/voice`, `features/pipeline`), giúp cô lập trạng thái và tái sử dụng logic kết nối API thông qua Custom Hooks.
- **Trình phát âm thanh/video HTTP 206 Partial Content**: Tích hợp Media Player tùy chỉnh hỗ trợ các tiêu chuẩn phát trực tuyến phân đoạn (Byte-Range Requests). Người dùng có thể tua tức thì đến bất kỳ thời điểm nào của tệp đa phương tiện mà không phải đợi tải xong toàn bộ tệp dung lượng lớn (hỗ trợ tệp lên đến 500MB).
- **Giao diện BYOD (Bring Your Own Device) cho Bảo tàng**: Khách tham quan không cần tải ứng dụng từ App Store/Google Play. Khi dùng điện thoại quét mã QR dán tại hiện vật, trình duyệt web di động sẽ tải ngay trang Audio Guide trực quan (`/thuyet-minh/:slug`), tự động phát bài thuyết minh theo ngôn ngữ mong muốn và gửi tín hiệu phân tích lượt nghe về máy chủ.

### 4.2.2. Admin Management Dashboard Độc lập
- **Phân tách cổng độc lập (Port 5174)**: Để bảo đảm nguyên tắc bảo mật 'Separation of Concerns', ứng dụng Quản trị viên (`admin-web`) được tách thành dự án độc lập, không import chéo mã nguồn với ứng dụng người dùng, ngăn chặn nguy cơ rò rỉ các thành phần quản trị nhạy cảm ra ngoài client thông thường.
- **Bảng giám sát tác vụ nền thời gian thực (Jobs Queue Monitor)**: Sử dụng thư viện hiển thị tiến trình và huy hiệu trạng thái (Status Badges) để theo dõi các tác vụ xử lý AI nền (Bóc băng, Dịch thuật, Tổng hợp giọng đọc, Ghép video). Quản trị viên có thể xem chi tiết lỗi và kích hoạt thao tác thử lại (Retry) với một cú nhấp chuột.
- **Trực quan hóa dữ liệu với Recharts**: Biểu đồ hóa số liệu thống kê thời gian thực: phân bổ lượt nghe theo khung giờ, top ngôn ngữ được khách quốc tế lựa chọn nhiều nhất, và tỷ lệ tác vụ AI hoàn thành thành công.

### 4.2.3. Mobile Customer Application (React Native + Expo SDK 57/58)
- **Mã nguồn di động đa nền tảng**: Xây dựng bằng React Native kết hợp Expo SDK mới nhất, xuất bản đồng thời cho cả hệ điều hành Android và iOS từ một cơ sở mã TypeScript duy nhất.
- **Xử lý âm thanh chất lượng cao với `expo-av`**: Quản lý phiên phát âm thanh nền (Background Audio Playback), hỗ trợ tạm dừng khi có cuộc gọi đến và tự động chuyển tiếp giữa các bài thuyết minh hiện vật.
- **Quét mã QR qua Camera**: Tích hợp mô-đun máy ảnh nhận diện QR tức thì trong điều kiện ánh sáng bảo tàng, lập tức điều hướng khách tham quan đến đúng bài giới thiệu hiện vật tương ứng.

---

## 4.3. CÔNG NGHỆ TẦNG MÁY CHỦ VÀ CƠ SỞ DỮ LIỆU (BACKEND & PERSISTENCE)
Tầng máy chủ đóng vai trò hạt nhân điều phối toàn bộ luồng dữ liệu, thực thi kiểm soát bảo mật và quản lý tiến trình tích hợp AI:

### 4.3.1. Nền tảng Backend API: Node.js, Express & TypeScript
- **Kiến trúc phân tầng chuẩn hóa (Layered Architecture)**: Phân tách nghiêm ngặt thành các tầng: `Routes`, `Controllers`, `Services`, `Repositories/Models`, và `Middlewares`.
- **Chuẩn hóa định dạng phản hồi (API Envelope)**: `{ success: true, data: T }` và `{ success: false, error: { code, message } }`.
- **TypeScript Strict Mode toàn diện**: Toàn bộ mã nguồn backend được định kiểu tĩnh chặt chẽ, loại bỏ hoàn toàn `any`.

### 4.3.2. Động cơ Điều phối Tác vụ Nền Bất đồng bộ (ProcessingJob Worker Engine)
- **Cơ chế hàng đợi tác vụ (Job Queue Model)**: Tạo bản ghi `ProcessingJob` với trạng thái `PENDING` và trả về JobId trong 50ms.
- **Thực thi phi phong tỏa (Non-blocking Asynchronous Execution)**: Tiến trình nền tiếp nhận tác vụ, theo dõi tiến độ (`0% -> 100%`) và cập nhật `COMPLETED`.
- **Phục hồi sự cố và Thử lại (Retry & Failure Recovery)**: Ghi nhận mã lỗi chi tiết và cho phép thử lại tác vụ lỗi mà không mất dữ liệu các bước trước.

![Hình 4.1: Sơ đồ luồng điều phối tác vụ xử lý nền bất đồng bộ (ProcessingJob Pipeline)](./diagrams/Figure_3_4_Pipeline_Activity_Diagram.png)

> **📌 Cơ chế Khóa Lạc quan (Optimistic Concurrency Control - CAS)**:
> Trong nghiệp vụ biên tập lời thoại, mỗi bản ghi Transcript duy trì một trường `version` số nguyên. Khi Client gửi yêu cầu cập nhật, câu truy vấn MongoDB sử dụng điều kiện: `{ _id: transcriptId, version: currentVersion }`. Nếu phiên bản trong DB đã bị thay đổi, hệ thống trả về mã lỗi HTTP 409 Conflict, ngăn ngừa xung đột dữ liệu ghi đè đồng thời.

### 4.3.3. Hệ Quản trị Cơ sở Dữ liệu NoSQL MongoDB & Mongoose ODM
- **17 Collections chuẩn hóa**: Cấu trúc mảng động của phân đoạn câu thoại (`transcriptsegments`) và bản dịch (`translationsegments`) được lập chỉ mục (Index) theo `projectId`, `startTime`, `languageId`.
- **Tách biệt nhị phân và siêu dữ liệu (Binary & Metadata Separation)**: MongoDB chỉ lưu metadata kỹ thuật, toàn bộ tệp nhị phân thực tế lưu trong thư mục máy chủ bảo mật `backend/uploads/`.

---

## 4.4. KỸ THUẬT TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI PIPELINE INTEGRATION)

### 4.4.1. Bóc băng Lời thoại Tự động (Speech-to-Text - STT)
- **Tiền xử lý âm thanh Mono 16kHz**: Trích xuất âm thanh thành tệp WAV Mono 1 kênh 16,000Hz qua FFmpeg, giảm 75% dung lượng tệp và tối ưu độ chính xác nhận dạng của mô hình Transformer.
- **Trích xuất mốc thời gian chính xác**: Whisper AI / Gemini STT trích xuất chính xác timestamp (start/end) từng câu thoại tới mili-giây.

### 4.4.2. Thuật toán Phân cụm Ngữ cảnh GROUPS_V1 & Dịch thuật Đa ngôn ngữ
- **Quy tắc gom cụm thông minh**: Khắc phục hiện tượng câu cụt lủn do ngắt nghỉ khi nói. Các câu ngắn liền kề được gom thành một Cụm ngữ cảnh thống nhất (`TranslationGroup`).
- **Dịch thuật có nhận thức ngữ cảnh**: Google Gemini 3.8 Flash xử lý toàn bộ cụm kèm chỉ dẫn chuẩn hóa văn phong lịch sử, bảo tàng.
- **Bảo toàn đối sánh 1-1**: Ánh xạ ngược kết quả dịch về từng câu con trên timeline, giữ nguyên mốc phụ đề chuẩn xác.

![Hình 4.2: Quy trình phân cụm ngữ cảnh GROUPS_V1 kết hợp Google Gemini 3.8 Flash](./diagrams/Figure_3_7_Group_Translation_Sequence.png)

### Bảng 4.2: So sánh giữa phương pháp dịch câu đơn lẻ và thuật toán GROUPS_V1
| Tiêu chí đánh giá | Dịch câu đơn lẻ truyền thống | Thuật toán GROUPS_V1 (Nhóm đề xuất) |
| :--- | :--- | :--- |
| **Tính toàn vẹn ngữ nghĩa** | Dễ mất ngữ cảnh; các câu cụt bị dịch thô hoặc sai nghĩa bóng. | Bảo toàn ngữ cảnh trọn vẹn nhờ gom nhóm câu liền kề theo đoạn ý nghĩa. |
| **Chuẩn hóa thuật ngữ bảo tàng** | Không đồng nhất; cùng một hiện vật có thể bị dịch thành nhiều từ khác nhau. | Tích hợp Glossary Dictionary chuyên biệt trong System Prompt của Gemini. |
| **Độ trễ và Chi phí API** | Tốn nhiều lượt gọi API (gọi riêng cho từng câu ngắn). | Giảm 60–75% số lượng cuộc gọi API nhờ gộp cụm câu theo đợt (batching). |
| **Khớp mốc thời gian phụ đề** | Dễ làm tràn câu hoặc co cụm mốc thời gian. | Thuật toán tự động ánh xạ đối sánh 1-1 về từng timestamp gốc ban đầu. |

> **📌 Bảo tồn Thuật ngữ Di sản & Lịch sử trong GROUPS_V1**:
> Tích hợp bảng từ điển di sản bảo tàng (Glossary Dictionary) chuẩn hóa các danh từ riêng và thuật ngữ cổ (ví dụ: Trống đồng Đông Sơn -> Dong Son Bronze Drum).

### 4.4.3. Tổng hợp Giọng đọc Nhân tạo (TTS) & Co giãn Timeline Tự động
- **Thư viện giọng đọc đa dạng**: Tùy chọn giọng đọc theo ngôn ngữ, giới tính (Nam/Nữ) và phong cách thuyết minh.
- **Thuật toán co giãn tốc độ đọc (Timeline Scaling)**: Tự động điều chỉnh tốc độ phát âm trong dải an toàn (0.75x – 1.5x) kết hợp thuật toán bảo toàn cao độ âm thanh (Pitch Preservation) để audio thuyết minh khớp khít với mốc thời gian video.

![Hình 4.3: Quy trình tổng hợp giọng đọc TTS và co giãn tốc độ timeline](./diagrams/Figure_3_9_TTS_Narration_Sequence.png)

---

## 4.5. KỸ THUẬT XỬ LÝ ĐA PHƯƠNG TIỆN VÀ DỰNG VIDEO (MEDIA ENGINE & FFMPEG)

### 4.5.1. Bóc tách và Thẩm định Thông số Kỹ thuật (FFprobe)
- Kiểm tra tính toàn vẹn và mã hóa MIME an toàn cho tệp tải lên tối đa 500MB.
- Đo đạc chính xác duration, bitrate, framerate, resolution và audio channels.

### 4.5.2. Kỹ thuật Hòa trộn Âm thanh Thông minh (Audio Ducking -12dB)
- Áp dụng bộ lọc `sidechaincompress` của FFmpeg: tự động hạ âm nền gốc xuống -12dB khi có giọng thuyết minh AI và từ từ phục hồi âm lượng gốc sau khi dứt câu.
- Cấu hình Attack Time 200ms và Release Time 800ms tạo cảm giác chuyển tiếp âm thanh êm dịu, chuyên nghiệp như truyền hình.

### Bảng 4.3: Ma trận thông số kỹ thuật bộ lọc FFmpeg Audio Ducking
| Tham số bộ lọc | Giá trị cấu hình | Ý nghĩa kỹ thuật và hiệu quả âm học |
| :--- | :--- | :--- |
| **threshold** | `0.08` (~ -22dB) | Ngưỡng biên độ âm thanh thuyết minh AI kích hoạt nén nhạc nền. |
| **ratio** | `4.0` (mức giảm -12dB) | Hệ số nén âm lượng nhạc nền gốc; giữ lại âm vang vừa đủ, không tắt nghẽn. |
| **attack** | `200 ms` | Thời gian hạ dần âm lượng nền từ 0dB xuống -12dB; chuyển tiếp mượt mà. |
| **release** | `800 ms` | Thời gian hồi phục âm lượng nền về mức gốc khi dứt câu thoại. |
| **makeup** | `1.0` | Hệ số khuếch đại bù tín hiệu đầu ra; đảm bảo chuẩn âm thanh phát sóng. |

![Hình 4.4: Kỹ thuật hòa trộn Audio Ducking (-12dB) và truyền phát phân đoạn HTTP 206](./diagrams/Figure_3_8_FFmpeg_Streaming_Sequence.png)

### 4.5.3. Xuất bản Video & Phân phối Truyền thông (HTTP 206 Partial Content)
- Đóng gói MP4 (H.264 + AAC) kèm cờ `+faststart` (moov atom ở đầu tệp) cho phép xem ngay lập tức.
- Phân đoạn truyền phát HTTP 206 Byte-Range Requests giúp tua mượt mà không phải tải trước toàn bộ tệp lớn.

---

## 4.6. KỸ THUẬT BẢO MẬT, PHÂN QUYỀN VÀ GIÁM SÁT VẬN HÀNH

### 4.6.1. Xác thực Phân tán Kép & Xoay vòng Token (Token Rotation)
- Cơ chế Access Token ngắn hạn (15 phút) và Refresh Token dài hạn (7 ngày).
- Cơ chế xoay vòng Refresh Token: phát hiện và vô hiệu hóa ngay lập tức các phiên đăng nhập bị đánh cắp hoặc tái sử dụng token cũ.

![Hình 4.5: Cơ chế xác thực phân tán Dual JWT kết hợp xoay vòng Refresh Token](./diagrams/Figure_3_5_Auth_Sequence.png)

### 4.6.2. Kiểm soát Phân quyền RBAC & Bộ bảo vệ Quyền sở hữu (Ownership Guard)
- Phân quyền RBAC 2 cấp độ: `CUSTOMER` và `ADMIN`.
- Bộ bảo vệ quyền sở hữu: Kiểm tra `project.userId === req.user.id`, triệt tiêu hoàn toàn lỗ hổng IDOR.

### 4.6.3. Phòng thủ Đa tầng & Đóng gói Môi trường Docker
- Mã hóa mật khẩu an toàn bằng thuật toán Bcrypt với Salt Rounds = 10.
- Bảo vệ tầng mạng với Helmet HTTP Headers, cấu hình CORS nghiêm ngặt.
- Container hóa toàn diện với Docker và Docker Compose sẵn sàng triển khai thực tế.

![Hình 4.6: Mô hình triển khai Container hóa toàn diện với Docker và Docker Compose](./diagrams/Figure_3_2_Deployment_Diagram.png)
"""

    with open(output_md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Successfully generated Chapter 4 Markdown: {output_md_path}")

if __name__ == "__main__":
    docx_out = r"reports/Chuong_4_Cong_Nghe_Va_Ky_Thuat_Hoan_Thien.docx"
    md_out = r"reports/Chuong_4_Cong_Nghe_Va_Ky_Thuat_Hoan_Thien.md"
    build_chapter_4_document(docx_out, md_out)
