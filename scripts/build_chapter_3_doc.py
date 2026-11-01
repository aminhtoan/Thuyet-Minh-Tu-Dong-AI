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

def set_table_borders(table, color="B0B0B0", sz="4", val="single"):
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

def create_schema_table(doc, table_num, collection_name, title, rows_data):
    p_cap = doc.add_paragraph()
    p_cap.paragraph_format.space_before = Pt(8)
    p_cap.paragraph_format.space_after = Pt(3)
    r_c = p_cap.add_run(f"Bảng 3. {table_num} Đặc tả cấu trúc dữ liệu Collection: {collection_name} ({title})")
    r_c.font.name = 'Times New Roman'
    r_c.font.bold = True
    r_c.font.size = Pt(10)

    table = doc.add_table(rows=len(rows_data) + 1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)

    headers = ["Tên trường (Field)", "Kiểu dữ liệu", "Ràng buộc / Khóa", "Mô tả ý nghĩa"]
    widths = [Inches(1.8), Inches(1.1), Inches(1.5), Inches(2.2)]

    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].width = widths[i]
        set_cell_background(hdr_cells[i], "EAECEE")
        set_cell_margins(hdr_cells[i], top=80, bottom=80, left=80, right=80)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.bold = True
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(0x1A, 0x25, 0x2F)

    for r_idx, row in enumerate(rows_data):
        row_cells = table.rows[r_idx + 1].cells
        for c_idx in range(4):
            row_cells[c_idx].text = row[c_idx]
            row_cells[c_idx].width = widths[c_idx]
            set_cell_margins(row_cells[c_idx], top=50, bottom=50, left=80, right=80)
            if r_idx % 2 == 1:
                set_cell_background(row_cells[c_idx], "F8F9FA")
            p = row_cells[c_idx].paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            for r in p.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(9)
                if c_idx == 0:
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.bold = True
    r.font.size = Pt(11.5)
    r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    return p

def add_body_p(doc, text, bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.25
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Times New Roman'
        r_pre.font.bold = True
        r_pre.font.size = Pt(11)
    r = p.add_run(text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    return p

def add_image_with_caption(doc, img_path, caption, max_h_inch=5.0):
    if not os.path.exists(img_path):
        print(f"Warning: Image not found: {img_path}")
        return
    with Image.open(img_path) as im:
        w, h = im.size
        aspect = h / w

    base_w = 5.8
    if base_w * aspect > max_h_inch:
        final_w = Inches(max_h_inch / aspect)
        final_h = Inches(max_h_inch)
    else:
        final_w = Inches(base_w)
        final_h = Inches(base_w * aspect)

    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(6)
    p_img.paragraph_format.space_after = Pt(3)
    p_img.add_run().add_picture(img_path, width=final_w, height=final_h)

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_after = Pt(10)
    r_cap = p_cap.add_run(caption)
    r_cap.font.name = 'Times New Roman'
    r_cap.font.italic = True
    r_cap.font.size = Pt(9.5)
    r_cap.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

print("Building Chapter 3 Word Document...")
doc = docx.Document()

# Page Margins
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

# Header Title
p_meta = doc.add_paragraph()
p_meta.paragraph_format.space_after = Pt(2)
r0 = p_meta.add_run("ỦY BAN NHÂN DÂN THÀNH PHỐ HỒ CHÍ MINH\nTRƯỜNG ĐẠI HỌC SÀI GÒN\nKHOA CÔNG NGHỆ THÔNG TIN\n")
r0.font.name = 'Times New Roman'
r0.font.bold = True
r0.font.size = Pt(11)
p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER

p_div = doc.add_paragraph()
p_div.paragraph_format.space_after = Pt(12)
r_div = p_div.add_run("--------------------***--------------------")
r_div.font.name = 'Times New Roman'
p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER

p_title = doc.add_paragraph()
p_title.paragraph_format.space_before = Pt(4)
p_title.paragraph_format.space_after = Pt(8)
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_ch3 = p_title.add_run("CHƯƠNG 3: THIẾT KẾ HỆ THỐNG VÀ CƠ SỞ DỮ LIỆU\n")
r_ch3.font.name = 'Times New Roman'
r_ch3.font.bold = True
r_ch3.font.size = Pt(15)
r_ch3.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

r_sub = p_title.add_run("HỆ THỐNG THUYẾT MINH TỰ ĐỘNG ĐA NGÔN NGỮ TÍCH HỢP TRÍ TUỆ NHÂN TẠO\n(MULTILINGUAL AI NARRATION SYSTEM FOR MUSEUMS)")
r_sub.font.name = 'Times New Roman'
r_sub.font.bold = True
r_sub.font.size = Pt(12)
r_sub.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

# Section 3.1
add_heading_1(doc, "3.1. THIẾT KẾ KIẾN TRÚC TỔNG THỂ HỆ THỐNG (SYSTEM ARCHITECTURE)")
add_body_p(doc, "Hệ thống Thuyết minh Tự động Đa ngôn ngữ cho Bảo tàng được thiết kế dựa trên kiến trúc phân tầng (Layered Architecture) kết hợp mô hình điều phối bất đồng bộ hướng tác vụ (Event & Task-Driven). Mô hình này phân tách độc lập giữa tầng giao diện người dùng, cổng bảo mật & điều phối, tầng ứng dụng cốt lõi, tầng tích hợp trí tuệ nhân tạo và tầng lưu trữ dữ liệu.")

add_heading_2(doc, "3.1.1. Biểu đồ kiến trúc thành phần (Component Diagram)")
add_body_p(doc, "Biểu đồ kiến trúc thành phần Hình 3.1 mô tả toàn diện cấu trúc mô-đun hóa của hệ thống Thuyết minh Đa ngôn ngữ, phân tách chuẩn mực theo 5 khối thành phần gồm Controllers, Services, External Systems, Repositories và Data Layer:")

add_image_with_caption(doc, "reports/diagrams/Figure_3_1_System_Architecture.png", "Hình 3.1: Biểu đồ kiến trúc thành phần đầy đủ của hệ thống (Component Diagram)")

add_body_p(doc, "Hệ thống bao gồm 5 khối thành phần chính được kết nối đối xứng và chặt chẽ:", "1. Chi tiết các khối kiến trúc thành phần: ")
add_body_p(doc, "Tiếp nhận và chuẩn hóa các yêu cầu HTTP/REST từ phía client, gồm 10 Controllers chuyên biệt: (1) Auth Controller (xác thực và phân quyền JWT); (2) Project Controller (quản trị dự án thuyết minh); (3) Media Controller (quản lý tải lên và thông số media); (4) Transcript & CAS Controller (quản lý phân đoạn thoại và kiểm soát xung đột đồng thời CAS); (5) Translation Controller (điều phối tác vụ dịch thuật đa ngữ); (6) Narration Controller (quản lý tạo giọng đọc và ghép audio); (7) QR & Visitor Controller (phát hành mã QR và phục vụ du khách BYOD); (8) Analytics Controller (thống kê lượt nghe và phân tích tương tác); (9) Voice Catalog Controller (quản lý thư viện giọng đọc đa ngôn ngữ); (10) Admin Controller (giám sát tài khoản, hạn ngạch và cấu hình hệ thống).", "• Khối Controllers (Tầng điều phối nghiệp vụ): ")
add_body_p(doc, "Thực thi toàn bộ logic nghiệp vụ cốt lõi, gồm 10 Services tương ứng đối xứng: (1) Auth Service; (2) Project Service; (3) Media Processing Service; (4) Transcript & CAS Service; (5) Translation Service; (6) Narration & Audio Service; (7) QR & Visitor Service; (8) Analytics Service; (9) Voice Catalog Service; (10) Admin Management Service. Các service giao tiếp với tầng Controllers thông qua các Interface trừu tượng (-IAuth-, -IProject-, -IMedia-, -ITranscript-, -ITranslation-, -INarration-, -IQR-, -IAnalytics-, -IVoice-, -IAdmin-).", "• Khối Services (Tầng dịch vụ nghiệp vụ): ")
add_body_p(doc, "Bao gồm các engine xử lý đa phương tiện cục bộ và các dịch vụ AI đám mây ngoại vi được tích hợp bất đồng bộ: (1) FFmpeg Processing Engine (xử lý cắt ghép, trích xuất âm thanh, multiplexing video); (2) OpenAI Whisper STT API (chuyển đổi giọng nói thành văn bản kèm mốc thời gian chính xác); (3) Google Gemini Translation API (dịch thuật văn cảnh chuyên sâu cho hiện vật bảo tàng); (4) Neural TTS Voice API (tổng hợp giọng đọc truyền cảm tự nhiên đa ngôn ngữ).", "• Khối External Systems (Hệ thống ngoại vi & AI): ")
add_body_p(doc, "Đóng gói việc truy xuất và trừu tượng hóa dữ liệu thông qua 6 Repository chính: Project & Media Repository, Transcript Repository, Translation Repository, Narration Repository, Visitor & QR Repository, User & Analytics Repository.", "• Khối Repositories (Tầng trừu tượng hóa dữ liệu): ")
add_body_p(doc, "Bao gồm MongoDB Database (cơ sở dữ liệu NoSQL lưu trữ toàn bộ thực thể tài khoản, dự án, câu thoại, bản dịch, log lượt nghe) và Local File Storage (hệ thống lưu trữ tệp tin media nhị phân an toàn trên ổ đĩa máy chủ tại backend/uploads/{source, audio, narrations, results}).", "• Khối Data Layer (Tầng lưu trữ dữ liệu): ")

# Section 3.2
add_heading_1(doc, "3.2. THIẾT KẾ MÔ HÌNH TRIỂN KHAI HỆ THỐNG (DEPLOYMENT DIAGRAM)")
add_body_p(doc, "Hệ thống được thiết kế theo mô hình triển khai hỗn hợp (Hybrid Cloud Deployment), bảo đảm tính sẵn sàng cao, bảo mật tuyệt đối cho dữ liệu nội bộ bảo tàng và tối ưu hóa chi phí vận hành.")

add_image_with_caption(doc, "reports/diagrams/Figure_3_2_Deployment_Diagram.png", "Hình 3.2: Biểu đồ triển khai vật lý hệ thống (Deployment Diagram)")

add_body_p(doc, "Mô hình triển khai gồm 4 khối mạng phân tán:", "Phân bổ các nút mạng (Nodes): ")
add_body_p(doc, "Bao gồm máy trạm trình duyệt của Cán bộ bảo tàng (Port 5173), máy tính của Quản trị viên (Port 5174), và thiết bị điện thoại thông minh của Du khách (Android/iOS) kết nối qua giao thức an toàn HTTPS và WebSockets (WSS).", "• Nút thiết bị khách (Client Devices): ")
add_body_p(doc, "Máy chủ chạy môi trường runtime Node.js (v22.x) trên nền tảng Linux/Windows Container, thực thi Express REST API (cổng 8080/api). Tích hợp nhị phân FFmpeg/FFprobe cô lập để xử lý chuyển mã, phân tách luồng âm thanh và ghép video.", "• Nút máy chủ ứng dụng (Backend Server Node): ")
add_body_p(doc, "Cơ sở dữ liệu MongoDB Atlas Replica Set phân tán đa vùng, kết nối với Backend thông qua Mongoose Driver có mã hóa đường truyền TLS/SSL.", "• Nút cơ sở dữ liệu đám mây (Database Cloud): ")
add_body_p(doc, "Các dịch vụ AI độc lập của Google Cloud (Gemini API) và OpenAI Cloud (Whisper API), được gọi bảo mật qua cổng kết nối REST/TLS với khóa bí mật lưu an toàn trên môi trường máy chủ.", "• Nút dịch vụ AI đám mây (Cloud AI Services): ")

# Section 3.3
add_heading_1(doc, "3.3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN & ERD)")
add_body_p(doc, "Hệ thống lựa chọn cơ sở dữ liệu phi quan hệ (NoSQL) MongoDB, phù hợp hoàn hảo với tính chất linh hoạt của phụ đề đa ngữ, mốc thời gian phân đoạn video và dữ liệu nhật ký phân tích lượt nghe.")

add_heading_2(doc, "3.3.1. Lược đồ thực thể - mối quan hệ (ERD Diagram)")
add_body_p(doc, "Biểu đồ ERD Hình 3.3 mô tả trực quan các thực thể cốt lõi, quan hệ kết hợp (1-1, 1-N, N-N) và các trường khóa chính/khóa ngoại trong cơ sở dữ liệu:")

add_image_with_caption(doc, "reports/diagrams/Figure_3_3_Entity_Relationship_Diagram.png", "Hình 3.3: Lược đồ thực thể - mối quan hệ dữ liệu hệ thống (Entity Relationship Diagram - ERD)")

add_heading_2(doc, "3.3.2. Đặc tả chi tiết các Collection trong MongoDB")
add_body_p(doc, "Dưới đây là bảng đặc tả cấu trúc chi tiết của toàn bộ 17 collection trong cơ sở dữ liệu hệ thống, bao gồm kiểu dữ liệu, các ràng buộc toàn vẹn và diễn giải nghiệp vụ:")

# Collection 1: users
create_schema_table(doc, "1", "users", "Người dùng và Phân quyền hệ thống", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh duy nhất của người dùng"],
    ["fullName", "String", "Required, Trim (2-100)", "Họ và tên hiển thị của người dùng"],
    ["email", "String", "Required, Unique, Lowercase, Index", "Địa chỉ email định danh dùng để đăng nhập"],
    ["passwordHash", "String", "Required, Bcrypt (min 60)", "Chuỗi mật khẩu băm một chiều bảo mật (không serialize ra ngoài)"],
    ["role", "String", "Enum: ADMIN, CUSTOMER, Index", "Vai trò phân quyền trong hệ thống (ADMIN / CUSTOMER)"],
    ["status", "String", "Enum: ACTIVE, INACTIVE, BLOCKED", "Trạng thái kích hoạt hoạt động của tài khoản"],
    ["createdAt", "Date", "Default: now(), Index", "Thời điểm tài khoản được khởi tạo trong hệ thống"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật thông tin tài khoản gần nhất"]
])

# Collection 2: authsessions
create_schema_table(doc, "2", "authsessions", "Phiên xác thực JWT và Refresh Token xoay vòng", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh phiên làm việc"],
    ["userId", "ObjectId", "FK -> users._id, Required, Index", "Mã người dùng sở hữu phiên làm việc"],
    ["hashedRefreshToken", "String", "Required, SHA-256", "Mã băm của Refresh Token xoay vòng bảo vệ chống giả mạo"],
    ["deviceInfo", "String", "Optional, Trim", "Thông tin User-Agent và nền tảng thiết bị truy cập"],
    ["expiresAt", "Date", "Required, Index (TTL)", "Thời điểm hết hạn của phiên làm việc (tự động xóa qua TTL Index)"],
    ["isRevoked", "Boolean", "Default: false, Index", "Cờ đánh dấu phiên đã bị thu hồi khi người dùng đăng xuất"],
    ["createdAt", "Date", "Default: now()", "Thời điểm khởi tạo phiên đăng nhập"]
])

# Collection 3: projects
create_schema_table(doc, "3", "projects", "Hồ sơ dự án thuyết minh hiện vật bảo tàng", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh duy nhất của dự án"],
    ["userId", "ObjectId", "FK -> users._id, Required, Index", "Cán bộ bảo tàng sở hữu dự án (Ownership Guard)"],
    ["name", "String", "Required, Trim (1-200)", "Tên dự án / tiêu đề hiện vật thuyết minh"],
    ["description", "String", "Optional, Max 2000", "Mô tả chi tiết bối cảnh lịch sử, hiện vật"],
    ["sourceLanguage", "String", "Required, Trim, Lowercase", "Mã ngôn ngữ gốc của tư liệu nguồn (vd: vi, en)"],
    ["status", "String", "Enum: DRAFT, PROCESSING, READY, FAILED, Index", "Trạng thái tiến trình tổng thể của dự án"],
    ["progress", "Number", "Required, Min: 0, Max: 100, Default: 0", "Tiến độ thực thi pipeline thời gian thực (%)"],
    ["createdAt", "Date", "Default: now(), Index", "Thời điểm khởi tạo dự án"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật thông tin dự án gần nhất"]
])

# Collection 4: media
create_schema_table(doc, "4", "media", "Tệp đa phương tiện nguồn và Metadata kỹ thuật", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh bản ghi media nguồn"],
    ["projectId", "ObjectId", "FK -> projects._id, Required, Unique, Index", "Dự án liên kết trực tiếp (quan hệ 1-1)"],
    ["originalName", "String", "Required, Trim", "Tên gốc của tệp khi người dùng tải lên"],
    ["fileName", "String", "Required, Trim, Sanitized", "Tên tệp đã được chuẩn hóa lưu trữ trên đĩa"],
    ["mediaType", "String", "Enum: AUDIO, VIDEO, Required", "Phân loại tệp là âm thanh hay video"],
    ["mimeType", "String", "Required, Trim (video/mp4, audio/mpeg...)", "Định dạng MIME chuẩn của tệp tư liệu"],
    ["fileSize", "Number", "Required, Min: 0, Max: 500MB", "Dung lượng tệp tính bằng byte (giới hạn tối đa 500MB)"],
    ["duration", "Number", "Min: 0, Optional", "Thời lượng chính xác của tệp media (giây) do FFprobe trích xuất"],
    ["storagePath", "String", "Required, Trim", "Đường dẫn lưu trữ tệp an toàn (backend/uploads/source/...)"],
    ["createdAt", "Date", "Default: now()", "Thời điểm tải tệp lên hệ thống"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật siêu dữ liệu media"]
])

# Collection 5: transcripts
create_schema_table(doc, "5", "transcripts", "Bản ghi lời thoại bóc băng và Kiểm soát phiên bản CAS", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh bản ghi bóc băng lời thoại"],
    ["projectId", "ObjectId", "FK -> projects._id, Required, Unique, Index", "Dự án thuyết minh sở hữu bản ghi lời thoại"],
    ["languageCode", "String", "Required, Trim, Lowercase", "Mã ngôn ngữ bóc băng gốc (mặc định: vi)"],
    ["fullText", "String", "Required, Default: ''", "Toàn văn văn bản bóc băng nối tiếp liền mạch"],
    ["status", "String", "Enum: DRAFT, PROCESSING, READY, FAILED", "Trạng thái hoàn thiện của bản ghi lời thoại"],
    ["revision", "Number", "Optional, Min: 1, Integer", "Số phiên bản bóc băng phục vụ khóa CAS (Compare-And-Set)"],
    ["createdAt", "Date", "Default: now()", "Thời điểm tạo bản ghi lời thoại"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật chỉnh sửa nội dung gần nhất"]
])

# Collection 6: transcriptsegments
create_schema_table(doc, "6", "transcriptsegments", "Phân đoạn câu thoại có mốc thời gian (Timestamps)", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh phân đoạn câu thoại"],
    ["transcriptId", "ObjectId", "FK -> transcripts._id, Required, Index", "Bản ghi lời thoại chứa phân đoạn"],
    ["sequence", "Number", "Required, Min: 1, Integer", "Thứ tự xuất hiện của câu thoại trong bài thuyết minh"],
    ["startTime", "Number", "Required, Min: 0", "Thời điểm bắt đầu câu thoại (giây, chính xác đến ms)"],
    ["endTime", "Number", "Required, endTime >= startTime", "Thời điểm kết thúc câu thoại (giây)"],
    ["text", "String", "Required, Trim", "Nội dung văn bản câu thoại được nhận dạng"],
    ["createdAt", "Date", "Default: now()", "Thời điểm tạo phân đoạn"],
    ["updatedAt", "Date", "Auto update", "Thời điểm hiệu đính câu thoại"]
])

# Collection 7: translations
create_schema_table(doc, "7", "translations", "Bản dịch đa ngôn ngữ và Cụm ngữ cảnh GROUPS_V1", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh bản ghi dịch thuật"],
    ["projectId", "ObjectId", "FK -> projects._id, Required, Index", "Dự án thuyết minh chứa bản dịch"],
    ["transcriptId", "ObjectId", "FK -> transcripts._id, Required, Index", "Bản ghi lời thoại gốc làm căn cứ dịch"],
    ["sourceLanguage", "String", "Required, Trim, Lowercase", "Mã ngôn ngữ nguồn của bài thuyết minh"],
    ["targetLanguage", "String", "Required, Trim, Lowercase, Index", "Mã ngôn ngữ đích (en, ja, ko, zh, fr, de...)"],
    ["fullText", "String", "Required, Trim", "Toàn văn bản dịch hoàn chỉnh sau xử lý"],
    ["status", "String", "Enum: DRAFT, PROCESSING, READY, FAILED", "Trạng thái hoàn thiện bản dịch"],
    ["revision", "Number", "Min: 1, Integer", "Số phiên bản bản dịch phục vụ khóa CAS"],
    ["sourceTranscriptRevision", "Number", "Min: 1, Integer", "Phiên bản lời thoại gốc dùng làm căn cứ sinh bản dịch"],
    ["alignmentFormat", "String", "Enum: SEGMENTS_V1, GROUPS_V1", "Định dạng canh hàng ngữ nghĩa (khuyên dùng: GROUPS_V1)"],
    ["sourceRevision", "String", "Optional", "Mã băm SHA-256 nội dung nguồn để xác thực tính toàn vẹn"],
    ["groupingVersion", "String", "Optional", "Phiên bản thuật toán gom cụm ngữ cảnh bảo tàng"],
    ["groups", "Array[Object]", "Embedded GROUPS_V1 Schema", "Danh sách các cụm câu dịch (groupId, text, time boundaries)"],
    ["review", "Object", "Embedded Review Approval", "Thông tin kiểm duyệt: reviewedBy, reviewedAt, outputDigest"],
    ["createdAt", "Date", "Default: now()", "Thời điểm khởi tạo bản dịch"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cán bộ hiệu đính và phê duyệt"]
])

# Collection 8: translationsegments
create_schema_table(doc, "8", "translationsegments", "Phân đoạn câu dịch đối sánh 1-1", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh phân đoạn câu dịch"],
    ["translationId", "ObjectId", "FK -> translations._id, Required, Index", "Bản dịch liên kết"],
    ["transcriptSegmentId", "ObjectId", "FK -> transcriptsegments._id, Required, Index", "Khóa ngoại đối sánh tương ứng câu gốc"],
    ["translatedText", "String", "Required, Trim", "Nội dung câu dịch tương ứng với câu nguồn"],
    ["createdAt", "Date", "Default: now()", "Thời điểm tạo câu dịch"],
    ["updatedAt", "Date", "Auto update", "Thời điểm hiệu đính câu dịch"]
])

# Collection 9: languages
create_schema_table(doc, "9", "languages", "Danh mục ngôn ngữ hỗ trợ trong bảo tàng", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh ngôn ngữ"],
    ["code", "String", "Required, Unique, Lowercase, Index", "Mã chuẩn quốc tế ISO (vi, en, ja, ko, zh, fr, de, es, ru)"],
    ["name", "String", "Required, Trim", "Tên tiếng Anh chuẩn của ngôn ngữ (vd: Vietnamese, English)"],
    ["nativeName", "String", "Required, Trim", "Tên bản ngữ bản địa (vd: Tiếng Việt, 日本語, 한국어)"],
    ["isActive", "Boolean", "Required, Default: true, Index", "Trạng thái sẵn sàng kích hoạt phục vụ dịch và thuyết minh"],
    ["createdAt", "Date", "Default: now()", "Thời điểm cấu hình ngôn ngữ vào hệ thống"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật thông tin ngôn ngữ"]
])

# Collection 10: voices
create_schema_table(doc, "10", "voices", "Thư viện giọng đọc AI đa ngôn ngữ", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh giọng đọc AI"],
    ["languageId", "ObjectId", "FK -> languages._id, Required, Index", "Ngôn ngữ của giọng đọc"],
    ["provider", "String", "Required, Trim (Gemini, ElevenLabs...)", "Nhà cung cấp dịch vụ công nghệ giọng đọc"],
    ["providerVoiceId", "String", "Required, Trim", "Mã định danh kỹ thuật của giọng đọc từ nhà cung cấp"],
    ["name", "String", "Required, Trim", "Tên hiển thị thân thiện (Hoài Nam, Mai Lan, John, Emma...)"],
    ["gender", "String", "Required, Trim (MALE, FEMALE, NEUTRAL)", "Giới tính của giọng đọc"],
    ["description", "String", "Trim, Default: ''", "Đặc tính phong cách âm sắc (ấm áp, truyền cảm, trang trọng...)"],
    ["previewUrl", "String", "Trim, Optional", "Đường dẫn tệp âm thanh phát thử đoạn đọc mẫu"],
    ["isActive", "Boolean", "Required, Default: true, Index", "Trạng thái giọng đọc sẵn sàng phục vụ"],
    ["createdAt", "Date", "Default: now()", "Thời điểm đưa giọng đọc vào danh mục"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật cấu hình giọng đọc"]
])

# Collection 11: narrations
create_schema_table(doc, "11", "narrations", "Bản ghi âm thanh thuyết minh AI (TTS Synthesis)", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh tệp âm thanh thuyết minh"],
    ["projectId", "ObjectId", "FK -> projects._id, Required, Index", "Dự án thuyết minh liên kết"],
    ["translationId", "ObjectId", "FK -> translations._id, Required, Index", "Bản dịch được chuyển hóa thành âm thanh"],
    ["voiceId", "ObjectId", "FK -> voices._id, Required, Index", "Giọng đọc AI được sử dụng"],
    ["revision", "Number", "Min: 1, Integer", "Số phiên bản âm thanh thuyết minh phục vụ khóa CAS"],
    ["sourceTranslationRevision", "Number", "Min: 1, Integer", "Phiên bản bản dịch dùng làm căn cứ sinh audio"],
    ["languageCode", "String", "Required, Trim, Lowercase", "Mã ngôn ngữ của bài thuyết minh âm thanh"],
    ["speed", "Number", "Required, Min: 0.5, Max: 2.0, Default: 1.0", "Hệ số tốc độ đọc được cấu hình"],
    ["audioPath", "String", "Required, Trim", "Đường dẫn tệp MP3 thuyết minh trên máy chủ (backend/uploads/narrations/...)"],
    ["mimeType", "String", "Required, Trim (audio/mpeg)", "Định dạng MIME của tệp âm thanh"],
    ["fileSize", "Number", "Required, Min: 1", "Dung lượng tệp âm thanh (bytes)"],
    ["provider", "String", "Required, Trim", "Nhà cung cấp tổng hợp giọng nói thực thi"],
    ["model", "String", "Required, Trim", "Tên mô hình AI TTS (vd: gemini-2.5-flash)"],
    ["duration", "Number", "Min: 0, Optional", "Tổng thời lượng phát của âm thanh thuyết minh (giây)"],
    ["status", "String", "Enum: DRAFT, PROCESSING, READY, FAILED", "Trạng thái tổng hợp âm thanh"],
    ["createdAt", "Date", "Default: now()", "Thời điểm tạo bản ghi thuyết minh"],
    ["updatedAt", "Date", "Auto update", "Thời điểm hoàn thành tệp âm thanh"]
])

# Collection 12: results
create_schema_table(doc, "12", "results", "Video thành phẩm xuất bản và Hòa trộn âm thanh", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh video thành phẩm"],
    ["projectId", "ObjectId", "FK -> projects._id, Required, Index", "Dự án sở hữu video thành phẩm"],
    ["narrationId", "ObjectId", "FK -> narrations._id, Required, Index", "Âm thanh thuyết minh hòa trộn vào video"],
    ["sourceNarrationRevision", "Number", "Min: 1, Integer", "Phiên bản thuyết minh tương ứng"],
    ["languageCode", "String", "Required, Trim, Lowercase", "Mã ngôn ngữ của video xuất bản"],
    ["videoPath", "String", "Required, Trim", "Đường dẫn lưu tệp video MP4 thành phẩm (backend/uploads/results/...)"],
    ["audioPath", "String", "Trim, Optional", "Đường dẫn âm thanh hoàn thiện đi kèm nếu có"],
    ["mimeType", "String", "Required, Trim (video/mp4)", "Định dạng MIME của video"],
    ["duration", "Number", "Required, Min: 0", "Thời lượng phát của video hoàn thiện (giây)"],
    ["fileSize", "Number", "Required, Min: 1", "Dung lượng tệp video xuất bản tính bằng bytes"],
    ["width", "Number", "Min: 1, Optional", "Chiều rộng khung hình video (pixels)"],
    ["height", "Number", "Min: 1, Optional", "Chiều cao khung hình video (pixels)"],
    ["createdAt", "Date", "Default: now(), Index", "Thời điểm kết xuất hoàn thiện video"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật bản ghi thành phẩm"]
])

# Collection 13: processingjobs
create_schema_table(doc, "13", "processingjobs", "Hàng đợi điều phối tác vụ nền bất đồng bộ", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh tác vụ nền"],
    ["projectId", "ObjectId", "FK -> projects._id, Required, Index", "Dự án phát sinh tác vụ"],
    ["type", "String", "Enum: STT, TRANSLATION, TTS, VIDEO_PROCESSING", "Phân loại tác vụ xử lý nền"],
    ["targetLanguage", "String", "Trim, Lowercase, Optional", "Ngôn ngữ đích (đối với tác vụ dịch hoặc thuyết minh)"],
    ["voiceId", "ObjectId", "FK -> voices._id, Optional", "Mã giọng đọc sử dụng (cho tác vụ TTS)"],
    ["narrationId", "ObjectId", "FK -> narrations._id, Optional", "Mã âm thanh thuyết minh (cho tác vụ MUX video)"],
    ["sourceTranscriptId", "ObjectId", "FK -> transcripts._id, Optional", "Bản ghi lời thoại đầu vào"],
    ["sourceTranscriptRevision", "Number", "Optional", "Phiên bản lời thoại đầu vào"],
    ["sourceTranslationId", "ObjectId", "FK -> translations._id, Optional", "Bản dịch đầu vào"],
    ["sourceTranslationRevision", "Number", "Optional", "Phiên bản bản dịch đầu vào"],
    ["sourceNarrationId", "ObjectId", "FK -> narrations._id, Optional", "Bản thu âm đầu vào"],
    ["sourceNarrationRevision", "Number", "Optional", "Phiên bản bản thu âm đầu vào"],
    ["status", "String", "Enum: QUEUED, PROCESSING, COMPLETED, FAILED, Index", "Trạng thái thực thi hiện tại của tác vụ"],
    ["progress", "Number", "Required, Min: 0, Max: 100, Default: 0", "Tiến độ hoàn thành tác vụ thời gian thực (%)"],
    ["errorMessage", "String", "Trim, Optional", "Thông báo lỗi tóm tắt trả về cho người dùng khi thất bại"],
    ["diagnostics", "Object", "Select: false, Chẩn đoán nội bộ", "Chi tiết lỗi kỹ thuật: stage, exitCode, durationMs, stderr"],
    ["startedAt", "Date", "Optional", "Thời điểm tác vụ bắt đầu thực thi"],
    ["completedAt", "Date", "Optional", "Thời điểm tác vụ hoàn tất hoặc thất bại"],
    ["createdAt", "Date", "Default: now(), Index", "Thời điểm tác vụ được đẩy vào hàng đợi"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật tiến độ gần nhất"]
])

# Collection 14: activitylogs
create_schema_table(doc, "14", "activitylogs", "Nhật ký hoạt động và Giám sát hệ thống (Audit Trail)", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh bản ghi nhật ký"],
    ["userId", "ObjectId", "FK -> users._id, Required, Index", "Tài khoản người dùng thực thi hành động"],
    ["action", "String", "Required, Trim (vd: PROJECT_CREATE...)", "Mã hành động nghiệp vụ phát sinh"],
    ["entityType", "String", "Required, Trim (Project, Transcript...)", "Tên loại thực thể bị tác động"],
    ["entityId", "ObjectId", "Required, Index", "Mã định danh thực thể bị tác động"],
    ["description", "String", "Required, Trim", "Mô tả diễn giải chi tiết hành động phục vụ kiểm toán"],
    ["createdAt", "Date", "Default: now(), Index", "Thời điểm phát sinh hoạt động"]
])

# Collection 15: visitors
create_schema_table(doc, "15", "visitors", "Khách tham quan bảo tàng (Ẩn danh và Định danh)", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh du khách"],
    ["visitorCode", "String", "Required, Unique, Index (vd: Khách #6208)", "Mã số định danh thân thiện cấp cho du khách"],
    ["ipAddress", "String", "Trim, Default: null, Index", "Địa chỉ IP mạng của thiết bị du khách"],
    ["userAgent", "String", "Trim, Default: null", "Chuỗi User-Agent trình duyệt của du khách"],
    ["deviceType", "String", "Enum: mobile, tablet, desktop, unknown", "Phân loại chủng loại thiết bị du khách sử dụng"],
    ["os", "String", "Trim, Optional (iOS, Android, Windows...)", "Hệ điều hành thiết bị của du khách"],
    ["browser", "String", "Trim, Optional (Safari, Chrome, Zalo...)", "Trình duyệt du khách sử dụng khi mở trang thuyết minh"],
    ["totalScans", "Number", "Required, Default: 0, Min: 0, Index", "Tổng số lần quét mã QR tại bảo tàng"],
    ["totalListens", "Number", "Required, Default: 0, Min: 0, Index", "Tổng số lần lắng nghe bài thuyết minh"],
    ["languages", "Array[String]", "Default: []", "Danh sách các mã ngôn ngữ du khách đã từng lựa chọn"],
    ["firstVisitAt", "Date", "Default: now()", "Thời điểm lần đầu tiên du khách đến bảo tàng"],
    ["lastVisitAt", "Date", "Default: now(), Index", "Thời điểm du khách tương tác gần nhất tại bảo tàng"],
    ["createdAt", "Date", "Default: now()", "Thời điểm khởi tạo bản ghi khách tham quan"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật thông tin du khách gần nhất"]
])

# Collection 16: visitqrs
create_schema_table(doc, "16", "visitqrs", "Nhật ký quét mã QR hiện vật bảo tàng", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh lượt quét mã QR"],
    ["visitorId", "ObjectId", "FK -> visitors._id, Default: null, Index", "Khách tham quan thực hiện quét (nếu đã nhận diện)"],
    ["source", "String", "Trim, Default: qr_unknown, Index", "Mã trạm hiện vật định danh mã QR (vd: exhibit_war_peace_01)"],
    ["ipAddress", "String", "Trim, Default: null, Index", "Địa chỉ IP của thiết bị khi quét mã tại bảo tàng"],
    ["userAgent", "String", "Trim, Default: null", "Chuỗi User-Agent nhận dạng trình duyệt"],
    ["deviceType", "String", "Trim, Default: mobile", "Loại thiết bị khách sử dụng để quét mã QR"],
    ["os", "String", "Trim, Optional", "Hệ điều hành của thiết bị khách"],
    ["browser", "String", "Trim, Optional", "Trình duyệt ứng dụng quét mã"],
    ["targetPath", "String", "Trim, Default: '/'", "Đường dẫn URL đích mà mã QR điều hướng tới"],
    ["location", "String", "Trim, Optional", "Vị trí gian trưng bày hiện vật trong bảo tàng"],
    ["createdAt", "Date", "Default: now(), Index", "Thời điểm khách quét mã QR tại hiện vật"]
])

# Collection 17: listenevents
create_schema_table(doc, "17", "listenevents", "Nhật ký lắng nghe bài thuyết minh và Phân tích tương tác", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh sự kiện nghe"],
    ["visitorId", "ObjectId", "FK -> visitors._id, Default: null, Index", "Khách tham quan đang nghe bài thuyết minh"],
    ["platform", "String", "Enum: web, mobile, Required, Index", "Nền tảng du khách sử dụng (BYOD Web hay Mobile App)"],
    ["projectId", "ObjectId", "FK -> projects._id, Default: null, Index", "Bài thuyết minh hiện vật được phát"],
    ["narrationId", "ObjectId", "FK -> narrations._id, Default: null", "Bản thu âm thuyết minh cụ thể được phát"],
    ["userId", "ObjectId", "FK -> users._id, Default: null", "Tài khoản cán bộ hoặc thành viên (nếu đã đăng nhập)"],
    ["languageCode", "String", "Trim, Lowercase, Optional, Index", "Mã ngôn ngữ du khách đang nghe"],
    ["userAgent", "String", "Trim, Default: null", "Chuỗi User-Agent của thiết bị nghe"],
    ["ipAddress", "String", "Trim, Default: null", "Địa chỉ IP của thiết bị nghe"],
    ["createdAt", "Date", "Default: now(), Index", "Thời điểm ghi nhận sự kiện nghe bài thuyết minh"]
])

# Section 3.4
add_heading_1(doc, "3.4. THIẾT KẾ LUỒNG XỬ LÝ DỮ LIỆU VÀ PIPELINE TỔNG HỢP AI")
add_body_p(doc, "Hệ thống vận hành xoay quanh pipeline xử lý đa phương tiện khép kín gồm 5 giai đoạn liên hoàn:", "Quy trình tổng thể: ")
add_body_p(doc, "1. Giai đoạn Tiếp nhận (Ingestion): Cán bộ bảo tàng tải video tư liệu lên; hệ thống kiểm tra MIME, lưu vào storage an toàn và dùng FFprobe trích xuất thông số kỹ thuật.")
add_body_p(doc, "2. Giai đoạn Bóc băng (STT): FFmpeg trích xuất luồng âm thanh mono 16kHz; chuyển tiếp đến Whisper AI bóc tách phụ đề kèm mốc thời gian; CSDL lưu trữ có kiểm soát phiên bản CAS.")
add_body_p(doc, "3. Giai đoạn Dịch thuật ngữ cảnh (Context Translation): Thuật toán GROUPS_V1 gom các câu ngắn thành cụm ngữ nghĩa; Google Gemini 3.8 Flash dịch đa ngữ bảo toàn thuật ngữ; cán bộ hiệu đính qua giao diện Split-View và bấm Phê duyệt.")
add_body_p(doc, "4. Giai đoạn Tổng hợp giọng đọc (TTS): Hệ thống chuyển văn bản dịch sang Neural TTS với giọng đọc và tốc độ được chọn; tự động tính toán co giãn thời lượng để khớp với trường thời gian video gốc.")
add_body_p(doc, "5. Giai đoạn Hòa trộn & Xuất bản (Muxing & Audio Ducking): FFmpeg tự động hạ nhạc nền video xuống -12dB trong các đoạn có giọng thuyết minh AI cất lên; xuất video MP4 hoàn thiện phục vụ tải về hoặc phát luồng trực tiếp cho du khách qua mã QR.")

# Save logic with fallback
out_path = r"reports/Chuong_3_Thiet_Ke_He_Thong_Hoan_Thien.docx"
candidate_paths = [
    out_path,
    r"reports/Chuong_3_Thiet_Ke_He_Thong.docx",
    r"reports/Chuong_3_Thiet_Ke_He_Thong_Final.docx"
]
actual_path = None
for p in candidate_paths:
    try:
        doc.save(p)
        actual_path = p
        break
    except PermissionError:
        continue

if actual_path:
    size_mb = os.path.getsize(actual_path) / (1024 * 1024)
    print(f"Successfully generated Chapter 3 document! File size: {size_mb:.2f} MB ({actual_path})")
else:
    print("Error: Could not save Chapter 3 document due to permission locks.")
