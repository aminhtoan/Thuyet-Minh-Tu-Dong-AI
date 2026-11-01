import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# Set font
plt.rcParams['font.family'] = 'DejaVu Sans'

fig, ax = plt.subplots(figsize=(15, 10.5), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# Color palette matching user's reference image
PURPLE_NODE_BG = '#EDE7F6'
PURPLE_NODE_BORDER = '#7E57C2'

CLIENT_BG = '#E3F2FD'
CLIENT_BORDER = '#1E88E5'

APP_BG = '#FFF8E1'
APP_BORDER = '#FB8C00'

DATA_BG = '#E8F5E9'
DATA_BORDER = '#43A047'

AI_BG = '#F3E5F5'
AI_BORDER = '#8E24AA'

TEXT_DARK = '#212121'

# Helper: Draw rounded node
def draw_rounded_box(ax, x, y, w, h, text, bg=PURPLE_NODE_BG, border=PURPLE_NODE_BORDER, fontsize=10, bold=False):
    box = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.2,rounding_size=1.2",
        facecolor=bg, edgecolor=border, linewidth=1.5, zorder=4
    )
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, text, ha='center', va='center',
            fontsize=fontsize, fontweight='bold' if bold else 'normal',
            color=TEXT_DARK, zorder=5)

# Helper: Draw container tier
def draw_tier_container(ax, x, y, w, h, title, bg, border):
    container = patches.Rectangle(
        (x, y), w, h,
        facecolor=bg, edgecolor=border, linewidth=2.0, zorder=1
    )
    ax.add_patch(container)
    ax.text(x + w/2, y + h - 2.2, title, ha='center', va='center',
            fontsize=10.5, fontweight='bold', color=TEXT_DARK, zorder=2)

# Helper: Draw Database Cylinder
def draw_cylinder(ax, x, y, w, h, text, bg='#EDE7F6', border='#7E57C2'):
    cap_h = h * 0.22
    # Bottom body
    rect = patches.Rectangle((x, y + cap_h/2), w, h - cap_h,
                             facecolor=bg, edgecolor='none', zorder=4)
    ax.add_patch(rect)
    # Bottom arc
    arc_bot = patches.Arc((x + w/2, y + cap_h/2), w, cap_h, angle=0, theta1=180, theta2=360,
                          edgecolor=border, linewidth=1.5, zorder=5)
    ax.add_patch(arc_bot)
    # Side lines
    ax.plot([x, x], [y + cap_h/2, y + h - cap_h/2], color=border, linewidth=1.5, zorder=5)
    ax.plot([x + w, x + w], [y + cap_h/2, y + h - cap_h/2], color=border, linewidth=1.5, zorder=5)
    # Top ellipse
    top_ellipse = patches.Ellipse((x + w/2, y + h - cap_h/2), w, cap_h,
                                  facecolor=bg, edgecolor=border, linewidth=1.5, zorder=6)
    ax.add_patch(top_ellipse)
    ax.text(x + w/2, y + h/2 - 0.5, text, ha='center', va='center',
            fontsize=9.2, color=TEXT_DARK, zorder=7)

# Helper: Draw Arrow with label
def draw_arrow(ax, start, end, label="", label_pos=0.5, offset_label=(0, 0), connectionstyle="arc3,rad=0", color='#555555'):
    ax.annotate(
        "", xy=end, xytext=start,
        arrowprops=dict(arrowstyle="->", color=color, linewidth=1.4, connectionstyle=connectionstyle),
        zorder=3
    )
    if label:
        x_lbl = start[0] + (end[0] - start[0]) * label_pos + offset_label[0]
        y_lbl = start[1] + (end[1] - start[1]) * label_pos + offset_label[1]
        ax.text(x_lbl, y_lbl, label, ha='center', va='center',
                fontsize=8.5, color='#333333',
                bbox=dict(boxstyle="square,pad=0.15", fc='white', ec="none", alpha=0.9),
                zorder=8)

# ==================== 1. TOP NODE: USER ====================
draw_rounded_box(ax, 72, 92, 18, 5.5, "Người dùng\n(Cán bộ bảo tàng & Du khách)",
                 bg=PURPLE_NODE_BG, border=PURPLE_NODE_BORDER, fontsize=9.5, bold=True)

# Arrow from User to Client Tier
draw_arrow(ax, (81, 92), (81, 84), label="Duyệt web / Quét QR BYOD", label_pos=0.5)

# ==================== 2. CLIENT TIER ====================
draw_tier_container(ax, 66, 62, 30, 22, "CLIENT TIER - Vercel / Cloud CDN", CLIENT_BG, CLIENT_BORDER)
draw_rounded_box(ax, 68.5, 74.5, 25, 4.8, "Customer Web (React 19 SPA)", fontsize=9.5)
draw_rounded_box(ax, 68.5, 68.5, 25, 4.8, "Admin Web Portal (React 19)", fontsize=9.5)
draw_rounded_box(ax, 68.5, 63.2, 25, 4.2, "Customer Mobile (Expo SDK 58)", fontsize=9)

# Arrow from Client Tier to Application Tier
draw_arrow(ax, (81, 62), (81, 52), label="HTTPS / REST API\nJSON / JWT Auth", label_pos=0.5)

# ==================== 3. APPLICATION TIER ====================
draw_tier_container(ax, 58, 14, 40, 38, "APPLICATION TIER - Node.js Server (Docker / VPS)", APP_BG, APP_BORDER)
draw_rounded_box(ax, 65, 42, 26, 6.0, "Express.js 5 REST API Backend\n(/api - Cổng 8080)", fontsize=10, bold=True)
draw_rounded_box(ax, 61, 30, 16.5, 8.0, "ProcessingJob\nQueue Manager\n(Tác vụ nền)", fontsize=9)
draw_rounded_box(ax, 79.5, 30, 16.5, 8.0, "FFmpeg / FFprobe\nMedia Engine\n(Ducking & Ghép Video)", fontsize=9)

# Internal links in Application Tier
draw_arrow(ax, (73, 42), (69, 38), label="", color='#FB8C00')
draw_arrow(ax, (83, 42), (87, 38), label="", color='#FB8C00')

# ==================== 4. DATA TIER ====================
draw_tier_container(ax, 28, 14, 28, 22, "DATA TIER", DATA_BG, DATA_BORDER)
draw_cylinder(ax, 30, 18, 11.5, 12.5, "MongoDB\nAtlas\n(Cloud Replica)", bg='#EDE7F6', border='#7E57C2')
draw_cylinder(ax, 43, 18, 11.5, 12.5, "Local Disk\nStorage\n(/uploads)", bg='#EDE7F6', border='#7E57C2')

# ==================== 5. AI SERVICES TIER ====================
draw_tier_container(ax, 2, 14, 24, 22, "AI SERVICES (Cloud)", AI_BG, AI_BORDER)
draw_rounded_box(ax, 4, 28, 20, 5.0, "Google Gemini 3.8 Flash\n(GROUPS_V1 Translation)", fontsize=8.5)
draw_rounded_box(ax, 4, 21.5, 20, 5.0, "OpenAI Whisper AI\n(Speech-to-Text STT)", fontsize=8.5)
draw_rounded_box(ax, 4, 15.2, 20, 5.0, "Neural TTS Speech Engine\n(Đa ngôn ngữ & giọng đọc)", fontsize=8.5)

# ==================== 6. CONNECTING ARROWS ====================
# Backend to Data Tier
draw_arrow(ax, (65, 44), (36, 31), label="Mongoose / TLS", label_pos=0.45, connectionstyle="arc3,rad=-0.1")
draw_arrow(ax, (80, 30), (49, 31), label="File I/O Stream", label_pos=0.5, connectionstyle="arc3,rad=-0.08")

# Backend to AI Services
draw_arrow(ax, (65, 46), (24, 31), label="REST / HTTPS (API Key)", label_pos=0.45, connectionstyle="arc3,rad=-0.15")

# Caption at the bottom center
ax.text(50, 4, "Hình 3.1. Kiến trúc tổng thể hệ thống Thuyết minh Tự động Đa ngôn ngữ",
        ha='center', va='center', fontsize=12.5, fontweight='bold', color='#111111')

plt.tight_layout()

# Save PNG and SVG
out_png = "reports/diagrams/Hinh_3_1_Kien_Truc_Tong_The_He_Thong.png"
out_svg = "reports/diagrams/Hinh_3_1_Kien_Truc_Tong_The_He_Thong.svg"
plt.savefig(out_png, dpi=300, bbox_inches='tight')
plt.savefig(out_svg, format='svg', bbox_inches='tight')

# Also overwrite Figure_3_1_System_Architecture.png to keep all synced
plt.savefig("reports/diagrams/Figure_3_1_System_Architecture.png", dpi=300, bbox_inches='tight')
plt.savefig("reports/diagrams/Figure_3_1_System_Architecture.svg", format='svg', bbox_inches='tight')

print("Successfully generated Architecture Diagram:")
print(" -", out_png)
print(" -", out_svg)
