import os
import sys
import docx
from PIL import Image
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
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

def add_image_with_caption(doc, img_path, caption, max_h_inch=7.2):
    if not os.path.exists(img_path):
        print(f"Warning: Image not found: {img_path}")
        return
    with Image.open(img_path) as im:
        w, h = im.size
        aspect = h / w

    base_w = 6.2
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

print("Building Section 3.3 Database Design Document...")
doc = docx.Document()

# Page Margins 1 inch
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

# Academic Header
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
r_ch3 = p_title.add_run("BÁO CÁO THIẾT KẾ CƠ SỞ DỮ LIỆU CHI TIẾT\n")
r_ch3.font.name = 'Times New Roman'
r_ch3.font.bold = True
r_ch3.font.size = Pt(15)
r_ch3.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

r_sub = p_title.add_run("HỆ THỐNG THUYẾT MINH TỰ ĐỘNG ĐA NGÔN NGỮ TÍCH HỢP TRÍ TUỆ NHÂN TẠO\n(MULTILINGUAL AI NARRATION SYSTEM FOR MUSEUMS)")
r_sub.font.name = 'Times New Roman'
r_sub.font.bold = True
r_sub.font.size = Pt(12)
r_sub.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

# Section 3.3 Main Header
add_heading_1(doc, "3.3. THIẾT KẾ CƠ SỞ DỮ LIỆU VÀ LƯỢC ĐỒ THỰC THỂ (DATABASE DESIGN & ERD)")
add_body_p(doc, "Cơ sở dữ liệu của Hệ thống Thuyết minh Tự động Đa ngôn ngữ được xây dựng trên hệ quản trị cơ sở dữ liệu phi quan hệ MongoDB (NoSQL Document Store). Lựa chọn này xuất phát từ đặc thù phi cấu trúc và bán cấu trúc linh hoạt của dữ liệu đa phương tiện trong bảo tàng: cấu trúc phân đoạn câu thoại (timestamps), các khối ngữ cảnh dịch thuật GROUPS_V1 co giãn theo độ dài ngôn ngữ, cùng dữ liệu ghi nhận lượt tương tác du khách BYOD với tần suất cao.")
add_body_p(doc, "Cơ sở dữ liệu được tổ chức chuẩn hóa gồm 17 Collection độc lập, phân bổ chặt chẽ theo các nhóm nghiệp vụ chính: (1) Quản trị tài khoản & xác thực bảo mật; (2) Quản lý dự án thuyết minh & đa phương tiện; (3) Bóc băng STT & kiểm soát xung đột CAS; (4) Dịch thuật đa ngữ ngữ cảnh; (5) Danh mục ngôn ngữ & giọng đọc AI; (6) Tổng hợp thuyết minh TTS & hòa trộn video; (7) Hàng đợi tác vụ nền; (8) Quản lý du khách, phát hành mã QR và phân tích lượt nghe.")

# Section 3.3.1 ERD
add_heading_2(doc, "3.3.1. Lược đồ thực thể - mối quan hệ (Entity Relationship Diagram - ERD)")
add_body_p(doc, "Lược đồ ERD tại Hình 3.3 mô tả trực quan toàn diện 17 thực thể dữ liệu tương ứng 17 collection trong MongoDB, bao gồm khóa chính (_id ObjectId), các khóa ngoại (Foreign Keys), khóa duy nhất (Unique Keys) và bản số quan hệ kết hợp (1-1, 1-N):")

add_image_with_caption(doc, "reports/diagrams/Figure_3_3_Entity_Relationship_Diagram.png", "Hình 3.3: Lược đồ thực thể - mối quan hệ đầy đủ 17 thực thể (Entity Relationship Diagram - ERD)")

add_body_p(doc, "Lược đồ thiết lập các mối quan hệ ràng buộc logic cốt lõi giữa 17 thực thể:", "Phân tích mối quan hệ nghiệp vụ giữa các thực thể: ")
add_body_p(doc, "Một User có thể sở hữu nhiều phiên đăng nhập AuthSession (1-N), khởi tạo nhiều Project (1-N), ghi nhận nhiều vết hành động ActivityLog (1-N), và kích hoạt các sự kiện nghe ListenEvent (1-N).", "• Nhóm Người dùng & Bảo mật: ")
add_body_p(doc, "Mỗi Project liên kết 1-1 với một bản ghi tệp nguồn Media và một bản ghi phụ đề Transcript. Từ Project có thể sinh ra nhiều bản dịch Translation (1-N), nhiều bản thuyết minh Narration (1-N), nhiều video xuất bản Result (1-N), nhiều tác vụ nền ProcessingJob (1-N), và tích lũy dữ liệu nghe ListenEvent (1-N).", "• Nhóm Dự án & Pipeline: ")
add_body_p(doc, "Bản ghi Transcript chứa nhiều câu thoại TranscriptSegment (1-N) có thứ tự sequence tăng dần. Mỗi TranscriptSegment liên kết 1-1 với câu dịch tương ứng trong TranslationSegment.", "• Nhóm Bóc băng & Canh hàng: ")
add_body_p(doc, "Một Language quản lý danh mục nhiều Voice AI (1-N). Mỗi bản dịch Translation kết hợp cùng một Voice để tạo ra bản thu âm Narration (1-N). Bản thu Narration tiếp tục được hòa trộn (multiplexing) tạo ra video thành phẩm Result (1-N).", "• Nhóm Ngôn ngữ, Giọng đọc & Kết xuất: ")
add_body_p(doc, "Một Visitor ẩn danh hoặc định danh có thể thực hiện nhiều lượt quét mã VisitQR (1-N) tại các trạm hiện vật khác nhau, đồng thời phát sinh nhiều sự kiện nghe thuyết minh ListenEvent (1-N) trên nền tảng Web hoặc Mobile.", "• Nhóm Du khách, Mã QR & Tương tác: ")

# Section 3.3.2 Specification Tables (All 17 Collections)
add_heading_2(doc, "3.3.2. Đặc tả chi tiết cấu trúc 17 Collection trong MongoDB")
add_body_p(doc, "Dưới đây là bảng đặc tả cấu trúc chi tiết của toàn bộ 17 collection trong cơ sở dữ liệu hệ thống, bao gồm tên trường, kiểu dữ liệu, ràng buộc toàn vẹn, chỉ mục và diễn giải nghiệp vụ chi tiết:")

# 1. users
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

# 2. authsessions
create_schema_table(doc, "2", "authsessions", "Phiên xác thực JWT và Refresh Token xoay vòng", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh phiên làm việc"],
    ["userId", "ObjectId", "FK -> users._id, Required, Index", "Mã người dùng sở hữu phiên làm việc"],
    ["hashedRefreshToken", "String", "Required, SHA-256", "Mã băm của Refresh Token xoay vòng bảo vệ chống giả mạo"],
    ["deviceInfo", "String", "Optional, Trim", "Thông tin User-Agent và nền tảng thiết bị truy cập"],
    ["expiresAt", "Date", "Required, Index (TTL)", "Thời điểm hết hạn của phiên làm việc (tự động xóa qua TTL Index)"],
    ["isRevoked", "Boolean", "Default: false, Index", "Cờ đánh dấu phiên đã bị thu hồi khi người dùng đăng xuất"],
    ["createdAt", "Date", "Default: now()", "Thời điểm khởi tạo phiên đăng nhập"]
])

# 3. projects
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

# 4. media
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

# 5. transcripts
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

# 6. transcriptsegments
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

# 7. translations
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

# 8. translationsegments
create_schema_table(doc, "8", "translationsegments", "Phân đoạn câu dịch đối sánh 1-1", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh phân đoạn câu dịch"],
    ["translationId", "ObjectId", "FK -> translations._id, Required, Index", "Bản dịch liên kết"],
    ["transcriptSegmentId", "ObjectId", "FK -> transcriptsegments._id, Required, Index", "Khóa ngoại đối sánh tương ứng câu gốc"],
    ["translatedText", "String", "Required, Trim", "Nội dung câu dịch tương ứng với câu nguồn"],
    ["createdAt", "Date", "Default: now()", "Thời điểm tạo câu dịch"],
    ["updatedAt", "Date", "Auto update", "Thời điểm hiệu đính câu dịch"]
])

# 9. languages
create_schema_table(doc, "9", "languages", "Danh mục ngôn ngữ hỗ trợ trong bảo tàng", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh ngôn ngữ"],
    ["code", "String", "Required, Unique, Lowercase, Index", "Mã chuẩn quốc tế ISO (vi, en, ja, ko, zh, fr, de, es, ru)"],
    ["name", "String", "Required, Trim", "Tên tiếng Anh chuẩn của ngôn ngữ (vd: Vietnamese, English)"],
    ["nativeName", "String", "Required, Trim", "Tên bản ngữ bản địa (vd: Tiếng Việt, 日本語, 한국어)"],
    ["isActive", "Boolean", "Required, Default: true, Index", "Trạng thái sẵn sàng kích hoạt phục vụ dịch và thuyết minh"],
    ["createdAt", "Date", "Default: now()", "Thời điểm cấu hình ngôn ngữ vào hệ thống"],
    ["updatedAt", "Date", "Auto update", "Thời điểm cập nhật thông tin ngôn ngữ"]
])

# 10. voices
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

# 11. narrations
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

# 12. results
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

# 13. processingjobs
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

# 14. activitylogs
create_schema_table(doc, "14", "activitylogs", "Nhật ký hoạt động và Giám sát hệ thống (Audit Trail)", [
    ["_id", "ObjectId", "PK, Auto", "Mã định danh bản ghi nhật ký"],
    ["userId", "ObjectId", "FK -> users._id, Required, Index", "Tài khoản người dùng thực thi hành động"],
    ["action", "String", "Required, Trim (vd: PROJECT_CREATE...)", "Mã hành động nghiệp vụ phát sinh"],
    ["entityType", "String", "Required, Trim (Project, Transcript...)", "Tên loại thực thể bị tác động"],
    ["entityId", "ObjectId", "Required, Index", "Mã định danh thực thể bị tác động"],
    ["description", "String", "Required, Trim", "Mô tả diễn giải chi tiết hành động phục vụ kiểm toán"],
    ["createdAt", "Date", "Default: now(), Index", "Thời điểm phát sinh hoạt động"]
])

# 15. visitors
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

# 16. visitqrs
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

# 17. listenevents
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

# Section 3.3.3 Indexing Strategy
add_heading_2(doc, "3.3.3. Chiến lược đánh chỉ mục (Indexing Strategy) và Tối ưu hóa hiệu năng")
add_body_p(doc, "Để đảm bảo tốc độ phản hồi nhanh (< 100ms) dưới điều kiện hàng nghìn du khách truy cập đồng thời tại bảo tàng, hệ thống áp dụng các chiến lược đánh chỉ mục chuyên biệt trên MongoDB:")
add_body_p(doc, "Tạo chỉ mục đơn trên các trường khóa ngoại (userId, projectId, transcriptId, translationId, narrationId, visitorId) để tối ưu các truy vấn kết hợp và lọc quan hệ 1-N.", "1. Single Field Index: ")
add_body_p(doc, "Thiết lập chỉ mục kết hợp trên các cặp trường truy vấn thường xuyên: { userId: 1, createdAt: -1 } cho danh sách dự án; { status: 1, type: 1, createdAt: -1 } cho hàng đợi job; { platform: 1, createdAt: -1 } cho phân tích thống kê nghe; { source: 1, createdAt: -1 } cho lượt quét QR.", "2. Compound Index: ")
add_body_p(doc, "Áp dụng ràng buộc duy nhất để ngăn chặn dữ liệu trùng lặp: email (users); { projectId: 1 } (media, transcripts); { transcriptId: 1, targetLanguage: 1 } (translations); { translationId: 1, voiceId: 1, speed: 1 } (narrations); { code: 1 } (languages); { visitorCode: 1 } (visitors).", "3. Unique Index: ")
add_body_p(doc, "Áp dụng trên ProcessingJob với Partial Filter Expression { type: 'TRANSLATION', status: 'PROCESSING' } nhằm bảo đảm tại một thời điểm chỉ có duy nhất một job dịch thuật đang chạy cho một ngôn ngữ của dự án, chống xung đột tài nguyên AI.", "4. Partial Index: ")
add_body_p(doc, "Thiết lập chỉ mục TTL (Time-To-Live) trên trường expiresAt của Collection authsessions, cho phép MongoDB ngầm thu dọn tự động các phiên đăng nhập hết hạn mà không gây quá tải CPU.", "5. TTL Index: ")

# Section 3.3.4 CAS and Partitioning
add_heading_2(doc, "3.3.4. Cơ chế kiểm soát toàn vẹn dữ liệu và phân vùng lưu trữ")
add_body_p(doc, "Hệ thống áp dụng kiến trúc bảo vệ dữ liệu toàn diện giữa CSDL và tệp vật lý:", "Kiến trúc bảo toàn dữ liệu: ")
add_body_p(doc, "Mọi thao tác chỉnh sửa lời thoại (Transcript) và bản dịch (Translation) bắt buộc phải truyền kèm số phiên bản revision. MongoDB thực thi atomic update qua điều kiện { _id, revision: currentRevision }, nếu revision bị thay đổi bởi phiên làm việc khác, thao tác sẽ bị từ chối ngay lập tức (HTTP 409 Conflict), triệt tiêu hoàn toàn nguy cơ Race Condition và mất mát dữ liệu do ghi đè.", "• Cơ chế khóa lạc quan CAS (Compare-And-Set): ")
add_body_p(doc, "MongoDB chỉ lưu trữ metadata, đường dẫn và thông số kỹ thuật (sizeBytes, duration, mimeType). Toàn bộ tệp nhị phân nặng (video MP4, âm thanh MP3, phụ đề VTT) được lưu trữ tại hệ thống tệp cục bộ có phân thư mục cô lập: backend/uploads/{source, audio, narrations, results}/. Tên tệp được sinh ngẫu nhiên kèm UUID và tiền tố thời gian để chống tấn công Path Traversal.", "• Phân tách lưu trữ nhị phân (Binary Partitioning): ")

# Save dedicated document
out_dedicated = r"reports/Phan_3.3_Thiet_Ke_Co_So_Du_Lieu.docx"
alt_dedicated = r"reports/3.3_Thiet_Ke_Co_So_Du_Lieu.docx"

saved = False
for p in [out_dedicated, alt_dedicated]:
    try:
        doc.save(p)
        print(f"Successfully generated Section 3.3 document! File size: {os.path.getsize(p)/(1024*1024):.2f} MB ({p})")
        saved = True
        break
    except PermissionError:
        continue

if not saved:
    print("Error: Could not save Section 3.3 document due to permission lock.")
