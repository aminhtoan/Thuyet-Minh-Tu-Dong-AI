import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

sys.stdout.reconfigure(encoding='utf-8')
plt.rcParams['font.family'] = 'DejaVu Sans'

# High resolution canvas for thesis print (300 DPI)
fig, ax = plt.subplots(figsize=(16, 19.5), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# Color Tokens - Curated professional pastel palette
BOX_BG = '#FFFFFF'
PRES_BG = '#FAF5FF'      # Light purple
PRES_BORDER = '#A855F7'  # Purple
SEC_BG = '#F0FDFA'       # Light teal
SEC_BORDER = '#0D9488'   # Teal
APP_BG = '#FFFBEB'       # Light amber/orange
APP_BORDER = '#F59E0B'   # Amber
AI_BG = '#F0F9FF'        # Light sky blue
AI_BORDER = '#0284C7'    # Sky blue
DATA_BG = '#F0FDF4'      # Light green
DATA_BORDER = '#16A34A'  # Green

TEXT_MAIN = '#0F172A'
TEXT_MUTED = '#475569'

def draw_tier(ax, x, y, w, h, title, bg, border, subtitle="", title_pos='center'):
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.3,rounding_size=0.8",
                                 facecolor=bg, edgecolor=border, linewidth=1.8, zorder=1)
    ax.add_patch(box)
    
    if title_pos == 'left':
        # Top-left badge to leave center completely clear for vertical arrows
        ax.text(x + 2.5, y + h - 1.2, title, ha='left', va='center',
                fontsize=9.8, fontweight='bold', color='#134E4A', zorder=2)
        if subtitle:
            ax.text(x + 2.5, y + h - 2.4, subtitle, ha='left', va='center',
                    fontsize=7.6, color=TEXT_MUTED, zorder=2)
    else:
        ax.text(x + w/2, y + h - 1.4, title, ha='center', va='center',
                fontsize=10.0, fontweight='bold', color='#1E293B', zorder=2)

def draw_comp(ax, x, y, w, h, text, subtext="", bg='#FFFFFF', border='#334155', is_cyl=False, title_fs=8.8, sub_fs=7.2):
    if is_cyl:
        cap_h = h * 0.22
        ax.add_patch(patches.Rectangle((x, y + cap_h/2), w, h - cap_h, facecolor=bg, edgecolor='none', zorder=4))
        ax.add_patch(patches.Arc((x + w/2, y + cap_h/2), w, cap_h, angle=0, theta1=180, theta2=360, edgecolor=border, linewidth=1.4, zorder=5))
        ax.plot([x, x], [y + cap_h/2, y + h - cap_h/2], color=border, linewidth=1.4, zorder=5)
        ax.plot([x + w, x + w], [y + cap_h/2, y + h - cap_h/2], color=border, linewidth=1.4, zorder=5)
        ax.add_patch(patches.Ellipse((x + w/2, y + h - cap_h/2), w, cap_h, facecolor=bg, edgecolor=border, linewidth=1.4, zorder=6))
    else:
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.2,rounding_size=0.6",
                                     facecolor=bg, edgecolor=border, linewidth=1.3, zorder=4)
        ax.add_patch(box)

    cy = y + h/2 if not subtext else y + h/2 + 0.65
    ax.text(x + w/2, cy, text, ha='center', va='center', fontsize=title_fs, fontweight='bold', color=TEXT_MAIN, zorder=7)
    if subtext:
        ax.text(x + w/2, y + h/2 - 1.0, subtext, ha='center', va='center', fontsize=sub_fs, color=TEXT_MUTED, zorder=7)

def draw_arrow(ax, start, end, label="", color='#475569', lw=1.3, rad=0, label_pos=None, double=False):
    conn = f"arc3,rad={rad}"
    style = "<->" if double else "->"
    ax.annotate(
        "", xy=end, xytext=start,
        arrowprops=dict(arrowstyle=style, color=color, linewidth=lw, connectionstyle=conn, shrinkA=2, shrinkB=2),
        zorder=3
    )
    if label:
        if label_pos:
            lx, ly = label_pos
        else:
            lx = (start[0] + end[0]) / 2
            ly = (start[1] + end[1]) / 2
        ax.text(lx, ly, label, ha='center', va='center', fontsize=7.2, color='#334155', fontweight='medium',
                bbox=dict(boxstyle="round,pad=0.15", fc='white', ec="#CBD5E1", lw=0.7, alpha=0.95), zorder=8)

# ==================== TIER 1: PRESENTATION LAYER ====================
draw_tier(ax, 7.5, 87.0, 85, 10.5, "Presentation Layer (Tầng hiển thị - Ứng dụng khách)", PRES_BG, PRES_BORDER, title_pos='center')
# 3 Clients perfectly symmetrical across x=50
# Width = 23, Centers: 23.5, 50.0, 76.5
draw_comp(ax, 12.0, 88.0, 23, 7.0, "Customer Mobile App", "(React Native + Expo SDK 58)", border='#7C3AED')
draw_comp(ax, 38.5, 88.0, 23, 7.0, "Customer Web App", "(React 19 + TypeScript + Vite)", border='#7C3AED')
draw_comp(ax, 65.0, 88.0, 23, 7.0, "Admin Web Portal", "(React 19 + TypeScript + Vite)", border='#7C3AED')

# ==================== TIER 2: SECURITY & GATEWAY LAYER (GỌN GÀNG, ĐỐI XỨNG) ====================
# Compact tier with top-left title so center arrow (x=50) never strikes through text
draw_tier(ax, 7.5, 69.5, 85, 14.5, "Security & Gateway Layer", SEC_BG, SEC_BORDER,
          subtitle="(Tầng bảo mật & Xác thực tập trung)", title_pos='left')

# Slim Bar 1: Traffic & Network Guard (Span from 12.0 to 88.0, w=76, centered at 50)
draw_comp(ax, 12.0, 76.2, 76.0, 3.8, "Traffic & Network Security Guard",
          "(Rate Limiting (express-rate-limit) • Helmet Security Headers • CORS Whitelist Policy)",
          border='#0D9488', title_fs=8.8, sub_fs=7.2)

# Slim Bar 2: Authentication & RBAC Guard (Span from 12.0 to 88.0, w=76, centered at 50)
draw_comp(ax, 12.0, 70.8, 76.0, 3.8, "Identity & Access Control Guard",
          "(JWT Authentication Guard • RBAC Role Permissions [User/Admin] • Resource Ownership Guard)",
          border='#0D9488', title_fs=8.8, sub_fs=7.2)

# Arrows from Presentation to Security (3 parallel straight vertical lines!)
draw_arrow(ax, (23.5, 88.0), (23.5, 80.0), label="HTTPS / WSS")
draw_arrow(ax, (50.0, 88.0), (50.0, 80.0), label="HTTPS / REST")
draw_arrow(ax, (76.5, 88.0), (76.5, 80.0), label="HTTPS / Admin")

# Arrow between Bar 1 and Bar 2 (verified traffic passes to auth)
draw_arrow(ax, (50.0, 76.2), (50.0, 74.6), label="Verified Request", lw=1.2, label_pos=(56.5, 75.4))

# ==================== TIER 3: CORE APPLICATION & SERVICE LAYER ====================
draw_tier(ax, 7.5, 42.5, 85, 24.0, "Core Application & Service Layer (Node.js + Express 5)", APP_BG, APP_BORDER, title_pos='center')

# 4 Symmetrical Columns: centers at 18.5, 39.5, 60.5, 81.5 (each col is 21 units apart!)
# Box width = 17.5
c_w = 17.5
c_h = 6.0
c_y = 57.8
draw_comp(ax, 9.75,  c_y, c_w, c_h, "Project & Media\nController", "(Tải tệp & Quản lý dự án)", border='#EA580C')
draw_comp(ax, 30.75, c_y, c_w, c_h, "Transcript & STT\nController", "(Bóc băng & Soạn thảo)", border='#EA580C')
draw_comp(ax, 51.75, c_y, c_w, c_h, "Translation\nController", "(Gemini GROUPS_V1)", border='#EA580C')
draw_comp(ax, 72.75, c_y, c_w, c_h, "Narration & Result\nController", "(TTS & Xuất bản MP4)", border='#EA580C')

# Arrows from Security Gateway (Bar 2) down to 4 Controllers (4 PERFECT PARALLEL VERTICAL LINES!)
draw_arrow(ax, (18.5, 70.8), (18.5, 63.8), lw=1.2)
draw_arrow(ax, (39.5, 70.8), (39.5, 63.8), lw=1.2)
draw_arrow(ax, (60.5, 70.8), (60.5, 63.8), lw=1.2)
draw_arrow(ax, (81.5, 70.8), (81.5, 63.8), lw=1.2)

# Row 2: 2 Core Service Engines (Symmetrical Left & Right)
# Left: spans from 11.0 to 47.0 (w=36.0, center=29.0, exactly 10.5 from Col 1 & 2)
# Right: spans from 53.0 to 89.0 (w=36.0, center=71.0, exactly 10.5 from Col 3 & 4)
s_w = 36.0
s_h = 6.8
s_y = 44.0
draw_comp(ax, 11.0, s_y, s_w, s_h, "AI Pipeline & Task Queue Manager",
          "(Điều phối hàng đợi STT, Dịch thuật, TTS, Muxing & Báo tiến độ SSE/Polling)",
          border='#C2410C', title_fs=9.0, sub_fs=7.2)
draw_comp(ax, 53.0, s_y, s_w, s_h, "Data Provenance & CAS Version Engine",
          "(Quản lý phiên bản Content-Addressable, Khóa lạc quan chống xung đột dữ liệu)",
          border='#C2410C', title_fs=9.0, sub_fs=7.2)

# Controllers connect symmetrically to Core Engines (exact matching angles!)
draw_arrow(ax, (18.5, c_y), (22.0, s_y + s_h), lw=1.2)
draw_arrow(ax, (39.5, c_y), (36.0, s_y + s_h), lw=1.2)
draw_arrow(ax, (60.5, c_y), (64.0, s_y + s_h), lw=1.2)
draw_arrow(ax, (81.5, c_y), (78.0, s_y + s_h), lw=1.2)

# Cross-coordination between Queue Manager and CAS Engine (Horizontal bidirectional arrow)
draw_arrow(ax, (47.0, s_y + s_h/2), (53.0, s_y + s_h/2), label="Hash Sync & Lock", label_pos=(50.0, s_y + s_h/2 + 1.2), lw=1.2, double=True)

# ==================== TIER 4: AI & MEDIA PROCESSING ENGINES ====================
draw_tier(ax, 7.5, 23.0, 85, 14.5, "AI & Media Processing Engines (Tầng tích hợp AI & Động cơ Media)", AI_BG, AI_BORDER, title_pos='center')

# 4 Symmetrical Adapters at exact same column centers (18.5, 39.5, 60.5, 81.5)
e_w = 17.5
e_h = 7.4
e_y = 24.5
draw_comp(ax, 9.75,  e_y, e_w, e_h, "Speech-to-Text\nAdapter", "(OpenAI Whisper AI\n& Gemini Flash STT)", border='#0284C7')
draw_comp(ax, 30.75, e_y, e_w, e_h, "AI Translation\nAdapter", "(Gemini 3.8 Flash\nGROUPS_V1 Prompting)", border='#0284C7')
draw_comp(ax, 51.75, e_y, e_w, e_h, "Text-to-Speech\nAdapter", "(Neural Voice Synthesis\nOpenAI TTS / Edge TTS)", border='#0284C7')
draw_comp(ax, 72.75, e_y, e_w, e_h, "Media Processor\nEngine", "(FFmpeg & FFprobe\nAudio Dubbing & Muxer)", border='#0284C7')

# Direct clean connections from Tier 3 to Tier 4:
# Gap between Tier 3 bottom (42.5) and Tier 4 top (37.5) is 5.0 units!
# Midpoint of gap is y = 40.0!
gap_3_4_y = 40.0
draw_arrow(ax, (22.0, s_y), (18.5, e_y + e_h), label="Audio Dispatch", lw=1.2, label_pos=(18.0, gap_3_4_y))
draw_arrow(ax, (36.0, s_y), (39.5, e_y + e_h), label="Prompt Dispatch", lw=1.2, label_pos=(40.0, gap_3_4_y))
draw_arrow(ax, (64.0, s_y), (60.5, e_y + e_h), label="Text Synthesis", lw=1.2, label_pos=(60.0, gap_3_4_y))
draw_arrow(ax, (78.0, s_y), (81.5, e_y + e_h), label="Muxing Job", lw=1.2, label_pos=(82.0, gap_3_4_y))

# ==================== TIER 5: DATA PERSISTENCE & STORAGE LAYER ====================
draw_tier(ax, 7.5, 3.5, 85, 14.5, "Data Persistence & Storage Layer (Tầng lưu trữ dữ liệu tập trung)", DATA_BG, DATA_BORDER, title_pos='center')

# 2 Symmetrical Storages (Left = Database, Right = File System)
# Spans match Row 2 of Tier 3: Left (11.0 to 47.0, center 29.0), Right (53.0 to 89.0, center 71.0)
d_w = 36.0
d_h = 8.8
d_y = 5.0
draw_comp(ax, 11.0, d_y, d_w, d_h, "MongoDB Atlas Cloud Database",
          "(Collections: Users, Projects, Transcripts,\nTranslations, ProcessingJobs, SystemAuditLogs)\n[Mongoose ODM • TLS 1.3 Encryption]",
          border='#16A34A', is_cyl=True, title_fs=9.2, sub_fs=7.2)

draw_comp(ax, 53.0, d_y, d_w, d_h, "Secure Local File Storage System",
          "(backend/uploads/:\n/source (Raw Media), /audio (Vocal Stems),\n/narrations (TTS Audio), /results (Final MP4/HLS))\n[Stream I/O • Content-Type & Size Sanitized]",
          border='#16A34A', title_fs=9.2, sub_fs=7.2)

# Gap between Tier 4 bottom (23.0) and Tier 5 top (18.0) is 5.0 units!
# Midpoint of gap is y = 20.5!
gap_4_5_y = 20.5
draw_arrow(ax, (18.5, e_y), (20.0, d_y + d_h), label="Persist STT Data", label_pos=(17.5, gap_4_5_y), lw=1.2)
draw_arrow(ax, (39.5, e_y), (38.0, d_y + d_h), label="Persist Translation", label_pos=(40.5, gap_4_5_y), lw=1.2)
draw_arrow(ax, (60.5, e_y), (62.0, d_y + d_h), label="Write TTS Audio", label_pos=(59.5, gap_4_5_y), lw=1.2)
draw_arrow(ax, (81.5, e_y), (80.0, d_y + d_h), label="Write Rendered MP4", label_pos=(82.5, gap_4_5_y), lw=1.2)

plt.tight_layout()

out_png = "reports/diagrams/Figure_3_1_System_Architecture.png"
out_svg = "reports/diagrams/Figure_3_1_System_Architecture.svg"

plt.savefig(out_png, dpi=300, bbox_inches='tight')
plt.savefig(out_svg, format='svg', bbox_inches='tight')

print(f"Successfully generated Symmetrical Component Diagram:")
print(" -", out_png)
print(" -", out_svg)
