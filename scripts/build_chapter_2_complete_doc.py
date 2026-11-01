import os
import re
import sys
import docx
from PIL import Image
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

sys.stdout.reconfigure(encoding='utf-8')

def set_cell_margins(cell, top=50, bottom=50, left=80, right=80):
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

def set_table_borders(table, color="999999", sz="4", val="single"):
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

def parse_markdown_use_cases(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        text = f.read()

    sections = re.split(r'\n### (UC_\d+:[^\n]+)', text)
    use_cases = []

    for i in range(1, len(sections), 2):
        header = sections[i].strip()
        body = sections[i+1].strip()

        m_head = re.match(r'(UC_\d+):\s*(.*)', header)
        uc_id = m_head.group(1) if m_head else f"UC_{i//2+1}"
        full_title = m_head.group(2) if m_head else header
        
        clean_title = full_title
        if '(' in full_title and ')' in full_title:
            vn_part = full_title[full_title.find('(')+1 : full_title.rfind(')')].strip()
            if vn_part:
                clean_title = vn_part
        clean_title = clean_title.replace('&', 'và')

        table_match = re.search(r'(\| Thuộc tính \|[\s\S]*?\n\n)', body)
        if not table_match:
            table_match = re.search(r'(\| Thuộc tính \|[\s\S]*?\n(?!\s*\|))', body)
            
        rows_data = []
        if table_match:
            lines = [l.strip() for l in table_match.group(1).split('\n') if l.strip().startswith('|')]
            for l in lines:
                if re.match(r'^\|(\s*:?-+:?\s*\|)+$', l):
                    continue
                cells = [c.strip() for c in l.split('|')[1:-1]]
                rows_data.append(cells)
                
        use_cases.append({
            'id': uc_id,
            'number': int(uc_id.replace('UC_', '')),
            'full_title': full_title,
            'clean_title': clean_title,
            'rows': rows_data
        })
        
    return use_cases

def format_cell_text(cell, text, bold=False, size_pt=9.5, align=WD_ALIGN_PARAGRAPH.LEFT):
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    if text:
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.bold = bold
        r.font.size = Pt(size_pt)
        r.font.color.rgb = RGBColor(0x11, 0x18, 0x27)

def build_use_case_table(doc, uc):
    rows = uc['rows']
    
    uc_number = f"UC_{uc['number']}"
    uc_name = uc['clean_title']
    actor = ""
    maturity = "Focused"
    summary = ""
    
    basic_steps = []
    alt_steps = []
    
    exception_paths = ""
    extension_points = "Không có"
    triggers = ""
    assumptions = "Thiết bị người dùng kết nối mạng Internet ổn định"
    preconditions = ""
    postconditions = ""
    
    mode = None
    
    for r in rows:
        c0 = r[0] if len(r) > 0 else ""
        c1 = r[1] if len(r) > 1 else ""
        c2 = r[2] if len(r) > 2 else ""
        
        c0_clean = c0.replace('**', '').strip()
        
        if c0_clean == 'Use case number':
            uc_number = c1.replace('**', '').strip() or uc_number
        elif c0_clean == 'Use case name':
            uc_name = c1.replace('**', '').strip() or uc_name
        elif c0_clean == 'Actor':
            actor = c1.replace('**', '').strip()
        elif c0_clean == 'Maturity':
            maturity = c1.replace('**', '').strip() or maturity
        elif c0_clean == 'Summary':
            summary = c1.replace('**', '').strip()
        elif c0_clean == 'Basic course of event':
            mode = 'BASIC'
        elif c0_clean == 'Alternative Path':
            mode = 'ALT'
        elif c0_clean == 'Exception Paths':
            mode = None
            exception_paths = c1.replace('<br>', '\n').replace('**', '').replace('$ightarrow$', '→').replace('$\\rightarrow$', '→').strip()
        elif c0_clean == 'Extension Points:':
            mode = None
            extension_points = c1.replace('**', '').strip() or "Không có"
        elif c0_clean == 'Triggers':
            mode = None
            triggers = c1.replace('**', '').strip()
        elif c0_clean in ['Assumption', 'Assumptions']:
            mode = None
            assumptions = c1.replace('**', '').strip()
        elif c0_clean in ['Preconditions', 'Pre-conditions']:
            mode = None
            preconditions = c1.replace('**', '').strip()
        elif c0_clean in ['Post Conditions:', 'Post Conditions']:
            mode = None
            postconditions = c1.replace('**', '').strip()
        elif mode == 'BASIC':
            if c1 or c2:
                basic_steps.append((c1.strip(), c2.strip()))
        elif mode == 'ALT':
            if c1 or c2:
                alt_steps.append((c1.strip(), c2.strip()))

    total_rows = 5 + (1 + max(1, len(basic_steps))) + (1 + max(1, len(alt_steps))) + 6
    tbl = doc.add_table(rows=total_rows, cols=3)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl, color="999999", sz="4")
    
    current_row = 0

    # 1. Top Metadata Rows (0-4)
    top_meta = [
        ("Use Case Number:", uc_number),
        ("Use Case Name:", uc_name),
        ("Actor (s):", actor),
        ("Maturity:", maturity),
        ("Summary:", summary)
    ]
    for label, val in top_meta:
        row = tbl.rows[current_row]
        c0, c1, c2 = row.cells[0], row.cells[1], row.cells[2]
        c1.merge(c2)
        c0.width = Inches(2.06)
        c1.width = Inches(4.44)
        set_cell_margins(c0, 50, 50, 80, 80)
        set_cell_margins(c1, 50, 50, 80, 80)
        set_cell_background(c0, "F8FAFC")
        format_cell_text(c0, label, bold=True, size_pt=10.0)
        format_cell_text(c1, val, bold=False, size_pt=9.5)
        current_row += 1

    # 2. Basic Course of Events
    b_start_row = current_row
    h_row = tbl.rows[current_row]
    c0, c1, c2 = h_row.cells[0], h_row.cells[1], h_row.cells[2]
    c0.width = Inches(2.06)
    c1.width = Inches(1.99)
    c2.width = Inches(2.45)
    for c in [c0, c1, c2]:
        set_cell_margins(c, 50, 50, 80, 80)
    set_cell_background(c0, "F8FAFC")
    set_cell_background(c1, "F1F5F9")
    set_cell_background(c2, "F1F5F9")
    format_cell_text(c0, "Basic Course of Events:", bold=True, size_pt=10.5)
    format_cell_text(c1, "Actor Action", bold=True, size_pt=10.0)
    format_cell_text(c2, "System Response", bold=True, size_pt=10.0)
    current_row += 1
    
    if not basic_steps:
        basic_steps = [("1. Người dùng thực hiện thao tác", "2. Hệ thống xử lý và phản hồi")]
        
    for act, resp in basic_steps:
        s_row = tbl.rows[current_row]
        c0, c1, c2 = s_row.cells[0], s_row.cells[1], s_row.cells[2]
        c0.width = Inches(2.06)
        c1.width = Inches(1.99)
        c2.width = Inches(2.45)
        for c in [c0, c1, c2]:
            set_cell_margins(c, 40, 40, 80, 80)
        format_cell_text(c1, act.replace('**', ''), bold=False, size_pt=9.5)
        format_cell_text(c2, resp.replace('**', ''), bold=False, size_pt=9.5)
        current_row += 1
        
    b_end_row = current_row - 1
    tbl.rows[b_start_row].cells[0].merge(tbl.rows[b_end_row].cells[0])
    tbl.rows[b_start_row].cells[0].vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    # 3. Alternative Paths
    a_start_row = current_row
    h_row_a = tbl.rows[current_row]
    c0, c1, c2 = h_row_a.cells[0], h_row_a.cells[1], h_row_a.cells[2]
    c0.width = Inches(2.06)
    c1.width = Inches(1.99)
    c2.width = Inches(2.45)
    for c in [c0, c1, c2]:
        set_cell_margins(c, 50, 50, 80, 80)
    set_cell_background(c0, "F8FAFC")
    set_cell_background(c1, "F1F5F9")
    set_cell_background(c2, "F1F5F9")
    format_cell_text(c0, "Alternative Paths:", bold=True, size_pt=10.5)
    format_cell_text(c1, "Actor Action", bold=True, size_pt=10.0)
    format_cell_text(c2, "System Response", bold=True, size_pt=10.0)
    current_row += 1
    
    if not alt_steps:
        alt_steps = [("Không có đường đi thay thế", "")]
        
    for act, resp in alt_steps:
        s_row = tbl.rows[current_row]
        c0, c1, c2 = s_row.cells[0], s_row.cells[1], s_row.cells[2]
        c0.width = Inches(2.06)
        c1.width = Inches(1.99)
        c2.width = Inches(2.45)
        for c in [c0, c1, c2]:
            set_cell_margins(c, 40, 40, 80, 80)
        is_branch_title = act.startswith('**A') or act.startswith('A1') or act.startswith('A2')
        if is_branch_title:
            set_cell_background(c1, "F8FAFC")
            format_cell_text(c1, act.replace('**', ''), bold=True, size_pt=9.5)
        else:
            format_cell_text(c1, act.replace('**', ''), bold=False, size_pt=9.5)
        format_cell_text(c2, resp.replace('**', ''), bold=False, size_pt=9.5)
        current_row += 1
        
    a_end_row = current_row - 1
    tbl.rows[a_start_row].cells[0].merge(tbl.rows[a_end_row].cells[0])
    tbl.rows[a_start_row].cells[0].vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    # 4. Bottom Metadata Rows (6 rows)
    bottom_meta = [
        ("Exception Paths", exception_paths or "Không có ngoại lệ đặc thù"),
        ("Extension Points:", extension_points),
        ("Triggers", triggers or "Người dùng kích hoạt chức năng từ thanh điều hướng"),
        ("Assumptions", assumptions),
        ("Pre-conditions", preconditions or "Người dùng đã đăng nhập vào hệ thống"),
        ("Post Conditions", postconditions or "Trạng thái hệ thống được cập nhật an toàn")
    ]
    for label, val in bottom_meta:
        row = tbl.rows[current_row]
        c0, c1, c2 = row.cells[0], row.cells[1], row.cells[2]
        c1.merge(c2)
        c0.width = Inches(2.06)
        c1.width = Inches(4.44)
        set_cell_margins(c0, 50, 50, 80, 80)
        set_cell_margins(c1, 50, 50, 80, 80)
        set_cell_background(c0, "F8FAFC")
        format_cell_text(c0, label, bold=True, size_pt=10.0)
        format_cell_text(c1, val, bold=False, size_pt=9.5)
        current_row += 1

    return tbl

def build_summary_table(doc):
    headers = ["STT", "Yêu cầu bắt buộc", "Mô tả cách nhóm thực hiện", "Đã hoàn thành", "Minh chứng"]
    data = [
        ("1", "Quản lý dự án & Tải tệp đa phương tiện", "Xây dựng API upload an toàn tệp Video/Audio tối đa 500MB, kiểm tra MIME type và dùng FFprobe đọc thông số kỹ thuật (thời lượng, bitrate, codec).", "Có", "Mục 2.3.3, 2.3.4 (UC-03, UC-04), Hình 2.6 – 2.9"),
        ("2", "Bóc băng lời thoại tự động AI (STT)", "Tách luồng âm thanh mono 16kHz qua FFmpeg, gửi xử lý nhận dạng giọng nói tự động qua Whisper AI, trích xuất timeline chính xác từng câu thoại.", "Có", "Mục 2.3.5 (UC-05), Hình 2.10, 2.11"),
        ("3", "Biên tập lời thoại & Khóa lạc quan (CAS)", "Giao diện trình biên tập transcript trực quan, kiểm soát phiên bản bằng cơ chế Compare-And-Set (CAS) ngăn chặn xung đột ghi đè đồng thời.", "Có", "Mục 2.3.6 (UC-06), Hình 2.12, 2.13"),
        ("4", "Phân cụm ngữ cảnh & Dịch thuật đa ngôn ngữ", "Phát triển thuật toán gom cụm ngữ cảnh GROUPS_V1 kết hợp Google Gemini 3.8 Flash, duy trì tính mạch lạc và chuẩn hóa thuật ngữ lịch sử/bảo tàng.", "Có", "Mục 2.3.7, 2.3.8 (UC-07, UC-08), Hình 2.14 – 2.17"),
        ("5", "Tổng hợp giọng đọc nhân tạo (TTS)", "Tích hợp dịch vụ TTS đa ngôn ngữ, tự động co giãn tốc độ (0.75x–1.5x) đồng bộ tuyệt đối với mốc thời gian của từng phân đoạn video.", "Có", "Mục 2.3.9, 2.3.10 (UC-09, UC-10), Hình 2.18 – 2.21"),
        ("6", "Hòa trộn âm thanh thông minh & Xuất bản", "Triển khai FFmpeg Audio Ducking tự động hạ 12dB âm thanh nền gốc khi có thuyết minh, xuất bản video thành phẩm MP4 tối ưu hóa truyền phát web.", "Có", "Mục 2.3.11, 2.3.12 (UC-11, UC-12), Hình 2.22 – 2.25"),
        ("7", "Trải nghiệm khách tham quan qua mã QR", "Hệ thống cấp phát mã QR định danh cho hiện vật, giao diện Audio Guide thân thiện trên trình duyệt di động (BYOD), ghi nhận phân tích lượt nghe.", "Có", "Mục 2.3.13 (UC-13), Hình 2.26, 2.27"),
        ("8", "Bảo mật, phân quyền RBAC & Giám sát", "Xác thực JWT kép với Token Rotation, phân quyền RBAC (CUSTOMER / ADMIN), kiểm soát quyền sở hữu Ownership Guard và bảng điều khiển giám sát tác vụ nền.", "Có", "Mục 2.3.1, 2.3.14 - 2.3.16 (UC-01, UC-14..16), Hình 2.2, 2.3, 2.28 – 2.33")
    ]
    
    tbl = doc.add_table(rows=len(data)+1, cols=5)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl, color="999999", sz="4")
    
    col_widths = [Inches(0.6), Inches(1.8), Inches(2.5), Inches(0.8), Inches(1.0)]
    
    h_row = tbl.rows[0]
    for c_idx, title in enumerate(headers):
        c = h_row.cells[c_idx]
        c.width = col_widths[c_idx]
        set_cell_margins(c, 60, 60, 80, 80)
        set_cell_background(c, "E2E8F0")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(title)
        r.font.name = 'Times New Roman'
        r.font.bold = True
        r.font.size = Pt(10)
        
    for r_idx, row_values in enumerate(data):
        row = tbl.rows[r_idx + 1]
        for c_idx, val in enumerate(row_values):
            c = row.cells[c_idx]
            c.width = col_widths[c_idx]
            set_cell_margins(c, 50, 50, 80, 80)
            if c_idx in [0, 3]:
                set_cell_background(c, "F8FAFC")
            p = c.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [0, 3] else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(val)
            r.font.name = 'Times New Roman'
            r.font.size = Pt(9.5)
            if c_idx == 0 or (c_idx == 3 and val == "Có"):
                r.font.bold = True

    return tbl

def build_chapter_2_document(output_path):
    doc = docx.Document()
    
    # Page setup - A4, margins: Top/Bottom 2cm (0.79 in), Left 2.5cm (0.98 in), Right 2cm (0.79 in)
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.79)
    section.bottom_margin = Inches(0.79)
    section.left_margin = Inches(0.98)
    section.right_margin = Inches(0.79)
    
    # Default Normal Style
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(0x11, 0x18, 0x27)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(3)

    # 1. Header block
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
    p_title.paragraph_format.space_before = Pt(12)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("CHƯƠNG 2: PHÂN TÍCH YÊU CẦU HỆ THỐNG VÀ ĐẶC TẢ USE CASE\n")
    r_title.font.bold = True
    r_title.font.size = Pt(15)
    r_title.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    r_subtitle = p_title.add_run("HỆ THỐNG THUYẾT MINH TỰ ĐỘNG ĐA NGÔN NGỮ TÍCH HỢP TRÍ TUỆ NHÂN TẠO\n(MULTILINGUAL AI NARRATION SYSTEM FOR MUSEUMS)")
    r_subtitle.font.bold = True
    r_subtitle.font.size = Pt(12.5)
    r_subtitle.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    
    # Info Box
    tbl_info = doc.add_table(rows=4, cols=2)
    tbl_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_info, color="94A3B8", sz="4")
    
    info_data = [
        ("Sinh viên thực hiện:", "Phạm Minh Toàn (3122411216)  –  Vũ Văn Tài (3122411181)"),
        ("Lớp học phần:", "DCT122C2 – Đồ án Chuyên ngành / Công nghệ Phần mềm"),
        ("Giảng viên hướng dẫn:", "TS. Nguyễn Quốc Huy"),
        ("Thời gian thực hiện:", "Tháng 10 / Năm 2026")
    ]
    for row_idx, (label, val) in enumerate(info_data):
        row = tbl_info.rows[row_idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        set_cell_margins(c0, 50, 50, 80, 80)
        set_cell_margins(c1, 50, 50, 80, 80)
        set_cell_background(c0, "F8FAFC")
        format_cell_text(c0, label, bold=True, size_pt=10.0)
        format_cell_text(c1, val, bold=False, size_pt=10.0)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(10)
    
    # 2.1. Product Backlog
    h1 = doc.add_paragraph()
    r = h1.add_run("2.1. DANH SÁCH USER STORIES (PRODUCT BACKLOG)")
    r.font.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    h1.paragraph_format.space_before = Pt(12)
    h1.paragraph_format.space_after = Pt(4)
    
    user_stories = [
        "User story 1: Là khách hàng, tôi muốn đăng ký và đăng nhập an toàn bằng Email/Mật khẩu để truy cập không gian làm việc và bảo vệ dữ liệu cá nhân.",
        "User story 2: Là người dùng đã đăng nhập (Khách hàng hoặc Quản trị viên), tôi muốn xem và cập nhật họ tên hồ sơ cá nhân để quản lý tài khoản đồng bộ.",
        "User story 3: Là khách hàng, tôi muốn tạo dự án mới và tải lên tệp Video/Audio nguồn (tối đa 500MB) để hệ thống kiểm tra và lưu trữ an toàn.",
        "User story 4: Là khách hàng, tôi muốn xem danh sách các dự án của mình, có thể tìm kiếm theo tên và lọc theo trạng thái để quản lý thuận tiện.",
        "User story 5: Là khách hàng, tôi muốn bóc băng giọng nói tự động (Speech-to-Text) để trích xuất toàn bộ lời thoại kèm mốc thời gian chính xác.",
        "User story 6: Là khách hàng, tôi muốn chỉnh sửa trực tiếp nội dung từng câu thoại trên trình biên tập và hệ thống tự động khóa phiên bản (CAS) để tránh xung đột dữ liệu.",
        "User story 7: Là khách hàng, tôi muốn hệ thống tự động gom các câu ngắn liền kề thành cụm ngữ cảnh (Groups_v1) và dịch bằng AI để bản dịch tự nhiên hơn.",
        "User story 8: Là khách hàng, tôi muốn xem bảng đối chiếu song ngữ và chỉnh sửa bản dịch trước khi phê duyệt lưu chính thức.",
        "User story 9: Là khách hàng, tôi muốn chọn giọng đọc nhân tạo theo ngôn ngữ đích, giới tính và nghe thử đoạn âm thanh mẫu trước khi tạo audio.",
        "User story 10: Là khách hàng, tôi muốn điều chỉnh tốc độ đọc (0.75x đến 1.5x) phù hợp với nhịp độ video và tạo thuyết minh âm thanh AI.",
        "User story 11: Là khách hàng, tôi muốn hệ thống tự động hòa trộn âm thanh thuyết minh vào video gốc, giảm âm lượng nền gốc (Audio Ducking) và xuất bản video thành phẩm.",
        "User story 12: Là khách hàng, tôi muốn xem trực tiếp video kết quả với tính năng tua nhanh mượt mà (HTTP 206 Partial Content) và tải về máy.",
        "User story 13: Là khách tham quan, tôi muốn quét mã QR bảo tàng để nghe bài thuyết minh hiện vật tự động trên thiết bị di động mà không cần cài đặt ứng dụng.",
        "User story 14: Là quản trị viên, tôi muốn giám sát các tác vụ xử lý nền (STT, Dịch, TTS, Video), có thể thử lại các tác vụ lỗi hoặc hủy bỏ tác vụ treo.",
        "User story 15: Là quản trị viên, tôi muốn quản lý danh sách người dùng, kích hoạt hoặc khóa tài khoản và kiểm soát phân quyền hệ thống.",
        "User story 16: Là quản trị viên, tôi muốn quản lý danh mục Giọng đọc và Ngôn ngữ hỗ trợ trên toàn hệ thống."
    ]
    for us in user_stories:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(us)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10.5)

    # 2.2. Overview Diagram
    h2 = doc.add_paragraph()
    r = h2.add_run("2.2. LƯỢC ĐỒ USE CASE TỔNG THỂ TOÀN HỆ THỐNG")
    r.font.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(4)
    
    overview_img = r"reports/diagrams/Figure_2_1_System_Overview_Use_Case.png"
    if os.path.exists(overview_img):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_after = Pt(2)
        doc.add_picture(overview_img, width=Inches(6.2))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rc = p_cap.add_run("Hình 2.1: Sơ đồ Use Case tổng thể toàn hệ thống Thuyết minh Tự động Đa ngôn ngữ")
        rc.font.name = 'Times New Roman'
        rc.font.italic = True
        rc.font.size = Pt(9.5)
        rc.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    doc.add_page_break()

    # 2.3. Detailed Use Case Specifications
    h3 = doc.add_paragraph()
    r = h3.add_run("2.3. ĐẶC TẢ CHI TIẾT CÁC USE CASE HỆ THỐNG")
    r.font.bold = True
    r.font.size = Pt(14)
    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    h3.paragraph_format.space_before = Pt(8)
    h3.paragraph_format.space_after = Pt(4)

    p_intro = doc.add_paragraph()
    r_intro = p_intro.add_run("Dưới đây là bảng đặc tả chi tiết, sơ đồ hoạt động (Activity Diagram) và sơ đồ tuần tự (Sequence Diagram) đầy đủ cho toàn bộ 16 Use Case nghiệp vụ của hệ thống:")
    r_intro.font.name = 'Times New Roman'
    r_intro.font.size = Pt(11)
    p_intro.paragraph_format.space_after = Pt(8)

    md_path = r"reports/Dac_Ta_Cac_Use_Case_Trong_Yeu.md"
    use_cases = parse_markdown_use_cases(md_path)
    diagrams_dir = r"reports/diagrams"

    sequence_captions = {
        1: "Sequence Đăng ký và Đăng nhập (Xác thực JWT kép & Token Rotation)",
        2: "Sequence Quản lý hồ sơ cá nhân (Truy vấn & Cập nhật họ tên)",
        3: "Sequence Tạo dự án & Tải media nguồn (Upload an toàn & Trích xuất FFprobe)",
        4: "Sequence Quản lý danh sách dự án (Tìm kiếm Debounce & Lọc trạng thái)",
        5: "Sequence Bóc băng lời thoại tự động bằng AI (Whisper AI & Mono 16kHz)",
        6: "Sequence Hiệu chỉnh lời thoại & Khóa lạc quan CAS (Optimistic Concurrency Control)",
        7: "Sequence Dịch thuật ngữ cảnh GROUPS_V1 (Gemini 3.8 Flash & Phân cụm ngữ nghĩa)",
        8: "Sequence Phê duyệt bản dịch song ngữ (Bilingual Split-View & Approval)",
        9: "Sequence Cấu hình giọng đọc AI & Nghe thử mẫu (Voice Catalog & Sample Streamer)",
        10: "Sequence Tổng hợp âm thanh thuyết minh TTS (TTS Provider & Co giãn timeline)",
        11: "Sequence Hòa trộn Audio Ducking & Ghép Video (FFmpeg Ducking -12dB & Xuất bản MP4)",
        12: "Sequence Xem kết quả & Tải video (HTTP 206 Partial Content Streaming & Download)",
        13: "Sequence Quét mã QR & Nghe thuyết minh hiện vật (Visitor BYOD & Audio Analytics)",
        14: "Sequence Giám sát tác vụ nền & Thử lại lỗi (ProcessingJob Queue & Recovery)",
        15: "Sequence Quản trị người dùng & Phân quyền (RBAC Admin & Khóa tài khoản vi phạm)",
        16: "Sequence Quản lý ngôn ngữ & Giọng đọc (Admin Voice & Language Catalog)"
    }

    ui_screenshots_map = {
        1: ("UI_UC_01_Auth.png", "Giao diện Đăng nhập và xác thực tài khoản hệ thống (JWT & Token Rotation)"),
        2: ("UI_UC_02_Profile.png", "Giao diện Quản lý hồ sơ cá nhân và thông tin tài khoản người dùng"),
        3: ("UI_UC_03_New_Project.png", "Giao diện Khởi tạo dự án mới và tải lên tệp đa phương tiện (Video/Audio)"),
        4: ("UI_UC_04_Project_List.png", "Giao diện Quản lý danh sách dự án, bộ lọc trạng thái và tìm kiếm"),
        5: ("UI_UC_05_STT_Extraction.png", "Giao diện Bóc băng lời thoại tự động bằng AI (Speech-to-Text) trích xuất mốc thời gian"),
        6: ("UI_UC_06_Transcript_Editor.png", "Giao diện Trình biên tập lời thoại trực quan và cơ chế kiểm soát phiên bản CAS"),
        7: ("UI_UC_07_Context_Translation.png", "Giao diện Phân cụm ngữ cảnh GROUPS_V1 và dịch thuật tự động đa ngôn ngữ AI"),
        8: ("UI_UC_08_Bilingual_Approval.png", "Giao diện Bảng đối chiếu song ngữ và phê duyệt bản dịch chính thức"),
        9: ("UI_UC_09_Voice_Catalog.png", "Giao diện Cấu hình danh mục giọng đọc AI và nghe thử mẫu âm thanh"),
        10: ("UI_UC_10_TTS_Narration.png", "Giao diện Điều chỉnh tốc độ giọng đọc và tổng hợp âm thanh thuyết minh TTS"),
        11: ("UI_UC_11_Audio_Ducking.png", "Giao diện Tiến trình hòa trộn Audio Ducking (-12dB) và ghép video thành phẩm"),
        12: ("UI_UC_12_Result_Streaming.png", "Giao diện Trình phát video thành phẩm HTTP 206 Partial Content và tải về"),
        13: ("UI_UC_13_Museum_Guide.png", "Giao diện Cổng thuyết minh hiện vật bảo tàng dành cho khách tham quan (BYOD)"),
        14: ("UI_UC_14_Admin_Jobs.png", "Giao diện Bảng điều khiển giám sát tác vụ nền (Processing Jobs) và phục hồi lỗi"),
        15: ("UI_UC_15_Admin_Users.png", "Giao diện Quản trị danh sách người dùng và phân quyền hệ thống (RBAC)"),
        16: ("UI_UC_16_Admin_Voices.png", "Giao diện Quản trị danh mục Giọng đọc và Ngôn ngữ hỗ trợ trên toàn hệ thống")
    }

    table_counter = 4
    fig_counter = 2

    for uc in use_cases:
        i = uc['number']

        # 1. Heading
        p_h = doc.add_paragraph()
        p_h.paragraph_format.space_before = Pt(14)
        p_h.paragraph_format.space_after = Pt(3)
        r_h = p_h.add_run(f"2.3.{i}. Đặc tả Use Case {i}: {uc['clean_title']}")
        r_h.font.name = 'Times New Roman'
        r_h.font.bold = True
        r_h.font.size = Pt(12)
        r_h.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

        # 2. Table Caption
        p_cap = doc.add_paragraph()
        p_cap.paragraph_format.space_before = Pt(3)
        p_cap.paragraph_format.space_after = Pt(3)
        r_c = p_cap.add_run(f"Bảng 2. {table_counter} UC-{i:02d}: {uc['clean_title']}")
        r_c.font.name = 'Times New Roman'
        r_c.font.bold = True
        r_c.font.size = Pt(10)
        table_counter += 1

        # 3. Specification Table
        build_use_case_table(doc, uc)

        # 4. Activity Diagram Heading & Picture
        p_act = doc.add_paragraph()
        p_act.paragraph_format.space_before = Pt(8)
        p_act.paragraph_format.space_after = Pt(3)
        r_act = p_act.add_run("Activity Diagram:")
        r_act.font.name = 'Times New Roman'
        r_act.font.bold = True
        r_act.font.size = Pt(10.5)

        act_file = os.path.join(diagrams_dir, f"Activity_UC_{i}.png")
        if os.path.exists(act_file):
            p_act_img = doc.add_paragraph()
            p_act_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_act_img.paragraph_format.space_after = Pt(6)
            with Image.open(act_file) as img:
                w, h = img.size
                aspect = h / w
            max_act_h = 5.0
            base_w = 4.6 if aspect <= 1.8 else (3.6 if aspect <= 2.8 else 2.6)
            if base_w * aspect > max_act_h:
                final_w = Inches(max_act_h / aspect)
                final_h = Inches(max_act_h)
            else:
                final_w = Inches(base_w)
                final_h = Inches(base_w * aspect)
            p_act_img.add_run().add_picture(act_file, width=final_w, height=final_h)

        # 5. Sequence Diagram Heading & Picture (ALL 16 USE CASES HAVE SEQUENCE DIAGRAM!)
        seq_file = os.path.join(diagrams_dir, f"Sequence_UC_{i}.png")
        if os.path.exists(seq_file):
            p_seq_h = doc.add_paragraph()
            p_seq_h.paragraph_format.space_before = Pt(8)
            p_seq_h.paragraph_format.space_after = Pt(3)
            r_seq_h = p_seq_h.add_run("Sequence diagram:")
            r_seq_h.font.name = 'Times New Roman'
            r_seq_h.font.bold = True
            r_seq_h.font.size = Pt(10.5)

            p_seq_img = doc.add_paragraph()
            p_seq_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_seq_img.paragraph_format.space_after = Pt(2)
            with Image.open(seq_file) as img:
                sw, sh = img.size
                seq_aspect = sh / sw
            max_seq_h = 4.5
            base_seq_w = 5.8
            if base_seq_w * seq_aspect > max_seq_h:
                final_seq_w = Inches(max_seq_h / seq_aspect)
                final_seq_h = Inches(max_seq_h)
            else:
                final_seq_w = Inches(base_seq_w)
                final_seq_h = Inches(base_seq_w * seq_aspect)
            p_seq_img.add_run().add_picture(seq_file, width=final_seq_w, height=final_seq_h)

            p_seq_cap = doc.add_paragraph()
            p_seq_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_seq_cap.paragraph_format.space_after = Pt(8)
            caption_text = sequence_captions.get(i, f"Sequence {uc['clean_title']}")
            rc = p_seq_cap.add_run(f"Hình 2.{fig_counter}: {caption_text}")
            rc.font.name = 'Times New Roman'
            rc.font.italic = True
            rc.font.size = Pt(9.5)
            rc.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
            fig_counter += 1

        # 6. UI Screenshot (Giao diện thực thi chức năng hệ thống)
        ui_info = ui_screenshots_map.get(i)
        if ui_info:
            ui_filename, ui_caption = ui_info
            ui_file = os.path.join(diagrams_dir, "ui_screenshots", ui_filename)
            if os.path.exists(ui_file):
                p_ui_h = doc.add_paragraph()
                p_ui_h.paragraph_format.space_before = Pt(8)
                p_ui_h.paragraph_format.space_after = Pt(3)
                r_ui_h = p_ui_h.add_run("Giao diện thực thi chức năng:")
                r_ui_h.font.name = 'Times New Roman'
                r_ui_h.font.bold = True
                r_ui_h.font.size = Pt(10.5)

                p_ui_img = doc.add_paragraph()
                p_ui_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_ui_img.paragraph_format.space_after = Pt(2)
                with Image.open(ui_file) as img:
                    uw, uh = img.size
                    ui_aspect = uh / uw
                max_ui_h = 3.6
                base_ui_w = 5.8
                if base_ui_w * ui_aspect > max_ui_h:
                    final_ui_w = Inches(max_ui_h / ui_aspect)
                    final_ui_h = Inches(max_ui_h)
                else:
                    final_ui_w = Inches(base_ui_w)
                    final_ui_h = Inches(base_ui_w * ui_aspect)
                p_ui_img.add_run().add_picture(ui_file, width=final_ui_w, height=final_ui_h)

                p_ui_cap = doc.add_paragraph()
                p_ui_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_ui_cap.paragraph_format.space_after = Pt(10)
                rc = p_ui_cap.add_run(f"Hình 2.{fig_counter}: {ui_caption}")
                rc.font.name = 'Times New Roman'
                rc.font.italic = True
                rc.font.size = Pt(9.5)
                rc.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
                fig_counter += 1

        doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # 2.4. Summary Table Section
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(4)
    r4 = h4.add_run("2.4. TỔNG KẾT CÁC YÊU CẦU HỆ THỐNG")
    r4.font.name = 'Times New Roman'
    r4.font.bold = True
    r4.font.size = Pt(13)
    r4.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    p_sum_cap = doc.add_paragraph()
    p_sum_cap.paragraph_format.space_before = Pt(4)
    p_sum_cap.paragraph_format.space_after = Pt(4)
    r_sc = p_sum_cap.add_run(f"Bảng 2. {table_counter} Tổng kết các yêu cầu chức năng hệ thống Thuyết minh Tự động Đa ngôn ngữ")
    r_sc.font.name = 'Times New Roman'
    r_sc.font.bold = True
    r_sc.font.size = Pt(10)

    build_summary_table(doc)
    doc.add_paragraph().paragraph_format.space_after = Pt(16)

    # Save to both main target files
    save_targets = [
        r"reports/Chuong_2_Dac_Ta_Use_Cases_Hoan_Thien.docx",
        r"reports/Chuong_2_Dac_Ta_Use_Cases_Moi_Nhat_16_UC.docx"
    ]
    for p in save_targets:
        try:
            doc.save(p)
            file_size_mb = os.path.getsize(p) / (1024 * 1024)
            print(f"Successfully saved to: {p} ({file_size_mb:.2f} MB)")
        except Exception as e:
            print(f"Could not save to {p}: {e}")

if __name__ == "__main__":
    out_file = r"reports/Chuong_2_Dac_Ta_Use_Cases_Hoan_Thien.docx"
    build_chapter_2_document(out_file)

