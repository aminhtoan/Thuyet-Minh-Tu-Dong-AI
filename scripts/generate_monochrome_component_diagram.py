import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

sys.stdout.reconfigure(encoding='utf-8')
plt.rcParams['font.family'] = 'DejaVu Sans'

# High resolution canvas matching textbook format (16:11 aspect ratio, 300 DPI)
fig, ax = plt.subplots(figsize=(16, 11), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# Black and White theme tokens (pure monochrome)
BG_WHITE = '#FFFFFF'
BORDER_BLACK = '#000000'
TEXT_BLACK = '#000000'
LINE_BLACK = '#000000'

# Title matching reference Photo 1
ax.text(4, 96, "2. Component diagram", fontsize=18, fontweight='bold', color=TEXT_BLACK)

def draw_container(ax, x, y, w, h, title):
    """Outer container box with centered top title"""
    rect = patches.Rectangle((x, y), w, h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.1, zorder=1)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h - 2.6, title, ha='center', va='center', fontsize=11, fontweight='normal', color=TEXT_BLACK, zorder=2)

def draw_box(ax, x, y, w, h, title, subtext=""):
    """Inner component box - simple black outline on white"""
    rect = patches.Rectangle((x, y), w, h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=3)
    ax.add_patch(rect)
    if subtext:
        ax.text(x + w/2, y + h/2 + 0.9, title, ha='center', va='center', fontsize=8.8, fontweight='normal', color=TEXT_BLACK, zorder=4)
        ax.text(x + w/2, y + h/2 - 1.0, subtext, ha='center', va='center', fontsize=7.2, color='#333333', zorder=4)
    else:
        ax.text(x + w/2, y + h/2, title, ha='center', va='center', fontsize=8.8, fontweight='normal', color=TEXT_BLACK, zorder=4)

def draw_cylinder(ax, x, y, w, h, title):
    """Database cylinder symbol matching textbook UML"""
    cap_h = h * 0.18
    # Body
    ax.add_patch(patches.Rectangle((x, y + cap_h/2), w, h - cap_h, facecolor=BG_WHITE, edgecolor='none', zorder=3))
    # Bottom arc
    ax.add_patch(patches.Arc((x + w/2, y + cap_h/2), w, cap_h, angle=0, theta1=180, theta2=360, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=4))
    # Side lines
    ax.plot([x, x], [y + cap_h/2, y + h - cap_h/2], color=BORDER_BLACK, linewidth=1.0, zorder=4)
    ax.plot([x + w, x + w], [y + cap_h/2, y + h - cap_h/2], color=BORDER_BLACK, linewidth=1.0, zorder=4)
    # Top ellipse
    ax.add_patch(patches.Ellipse((x + w/2, y + h - cap_h/2), w, cap_h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=5))
    # Label inside
    ax.text(x + w/2, y + h/2 - 0.5, title, ha='center', va='center', fontsize=8.8, fontweight='normal', color=TEXT_BLACK, zorder=6)

def draw_arrow(ax, start, end, label="", is_dashed=False, rad=0, label_pos=None):
    """Clean UML connector arrow with optional label box"""
    linestyle = '--' if is_dashed else '-'
    conn = f"arc3,rad={rad}"
    ax.annotate(
        "", xy=end, xytext=start,
        arrowprops=dict(arrowstyle="->", color=LINE_BLACK, linewidth=0.85,
                        linestyle=linestyle, connectionstyle=conn, shrinkA=0, shrinkB=0),
        zorder=2
    )
    if label:
        if label_pos:
            lx, ly = label_pos
        else:
            lx = (start[0] + end[0]) / 2
            ly = (start[1] + end[1]) / 2
        ax.text(lx, ly, label, ha='center', va='center', fontsize=7.2, color=TEXT_BLACK,
                bbox=dict(boxstyle="square,pad=0.12", fc='white', ec="none", alpha=0.95), zorder=7)

# ==================== 1. CONTROLLERS CONTAINER (LEFT) ====================
c_x, c_y, c_w, c_h = 5, 8, 16.5, 84
draw_container(ax, c_x, c_y, c_w, c_h, "Controllers")

ctrl_bw = 13.0
ctrl_bh = 5.2
ctrl_bx = c_x + (c_w - ctrl_bw) / 2

y_c1 = 76.0 # Project Controller
y_c2 = 54.0 # Transcript Controller
y_c3 = 33.0 # Translation Controller
y_c4 = 12.0 # Narration Controller

draw_box(ax, ctrl_bx, y_c1, ctrl_bw, ctrl_bh, "Project & Media Controller")
draw_box(ax, ctrl_bx, y_c2, ctrl_bw, ctrl_bh, "Transcript Controller")
draw_box(ax, ctrl_bx, y_c3, ctrl_bw, ctrl_bh, "Translation Controller")
draw_box(ax, ctrl_bx, y_c4, ctrl_bw, ctrl_bh, "Narration Controller")

# ==================== 2. SERVICES CONTAINER (MIDDLE) ====================
s_x, s_y, s_w, s_h = 29.5, 8, 18.5, 84
draw_container(ax, s_x, s_y, s_w, s_h, "Services")

serv_bw = 14.5
serv_bh = 5.2
serv_bx = s_x + (s_w - serv_bw) / 2

y_s1 = 76.0 # Project & Media Service
y_s_auth = 64.5 # Auth Service (compact in the middle, exactly like Photo 1!)
y_s2 = 53.0 # Transcript & CAS Service
y_s3 = 33.0 # Translation Service
y_s4 = 12.0 # Narration & Audio Service

draw_box(ax, serv_bx, y_s1, serv_bw, serv_bh, "Project & Media Service")
draw_box(ax, serv_bx + 2.0, y_s_auth, 10.5, 4.6, "Auth Service") # Compact auth box!
draw_box(ax, serv_bx, y_s2, serv_bw, serv_bh, "Transcript & CAS Service")
draw_box(ax, serv_bx, y_s3, serv_bw, serv_bh, "Translation Service")
draw_box(ax, serv_bx, y_s4, serv_bw, serv_bh, "Narration & Audio Service")

# Connectors: Controllers -> Services (Straight horizontal lines with interface names)
draw_arrow(ax, (ctrl_bx + ctrl_bw, y_c1 + ctrl_bh/2), (serv_bx, y_s1 + serv_bh/2), label="-IProject-")
draw_arrow(ax, (ctrl_bx + ctrl_bw, y_c2 + ctrl_bh/2), (serv_bx, y_s2 + serv_bh/2), label="-ITranscript-")
draw_arrow(ax, (ctrl_bx + ctrl_bw, y_c3 + ctrl_bh/2), (serv_bx, y_s3 + serv_bh/2), label="-ITranslation-")
draw_arrow(ax, (ctrl_bx + ctrl_bw, y_c4 + ctrl_bh/2), (serv_bx, y_s4 + serv_bh/2), label="-INarration-")

# ==================== 3. EXTERNAL SYSTEMS (TOP RIGHT) ====================
ext_x, ext_y, ext_w, ext_h = 56.5, 56.5, 18.5, 35.5
draw_container(ax, ext_x, ext_y, ext_w, ext_h, "External Systems")

ext_bw = 15.0
ext_bh = 4.8
ext_bx = ext_x + (ext_w - ext_bw) / 2

y_ext1 = 81.5 # Whisper STT
y_ext2 = 73.5 # Gemini Translation
y_ext3 = 65.5 # Neural TTS
y_ext4 = 57.5 # FFmpeg Engine

draw_box(ax, ext_bx, y_ext1, ext_bw, ext_bh, "OpenAI Whisper STT API")
draw_box(ax, ext_bx, y_ext2, ext_bw, ext_bh, "Gemini Translation API")
draw_box(ax, ext_bx, y_ext3, ext_bw, ext_bh, "Neural TTS Voice API")
draw_box(ax, ext_bx, y_ext4, ext_bw, ext_bh, "FFmpeg Processing Engine")

# Dotted REST API / Spawn arrows from Services to External Systems
# Project Service -> FFmpeg
draw_arrow(ax, (serv_bx + serv_bw, y_s1 + serv_bh/2), (ext_bx, y_ext4 + ext_bh/2), label="-Process Spawn-", is_dashed=True, rad=-0.08)
# Transcript Service -> Whisper
draw_arrow(ax, (serv_bx + serv_bw, y_s2 + serv_bh/2 + 1.2), (ext_bx, y_ext1 + ext_bh/2), label="-REST API-", is_dashed=True, rad=0.08)
# Translation Service -> Gemini
draw_arrow(ax, (serv_bx + serv_bw, y_s3 + serv_bh/2 + 1.2), (ext_bx, y_ext2 + ext_bh/2), label="-REST API-", is_dashed=True, rad=0.12)
# Narration Service -> TTS
draw_arrow(ax, (serv_bx + serv_bw, y_s4 + serv_bh/2 + 1.2), (ext_bx, y_ext3 + ext_bh/2), label="-REST API-", is_dashed=True, rad=0.18)

# ==================== 4. REPOSITORIES (BOTTOM RIGHT) ====================
repo_x, repo_y, repo_w, repo_h = 56.5, 8.0, 18.5, 45.0
draw_container(ax, repo_x, repo_y, repo_w, repo_h, "Repositories")

repo_bw = 15.0
repo_bh = 4.6
repo_bx = repo_x + (repo_w - repo_bw) / 2

y_r1 = 43.5 # Project Repo
y_r2 = 34.5 # Transcript Repo
y_r3 = 25.5 # Translation Repo
y_r4 = 16.5 # Narration / Job Repo
y_r5 = 8.8  # User Repo

draw_box(ax, repo_bx, y_r1, repo_bw, repo_bh, "Project Repository")
draw_box(ax, repo_bx, y_r2, repo_bw, repo_bh, "Transcript Repository")
draw_box(ax, repo_bx, y_r3, repo_bw, repo_bh, "Translation Repository")
draw_box(ax, repo_bx, y_r4, repo_bw, repo_bh, "ProcessingJob Repository")
draw_box(ax, repo_bx, y_r5, repo_bw, repo_bh, "User Repository")

# Solid arrows from Services to Repositories (labels neatly aligned in front of repos)
lbl_x = 52.5
draw_arrow(ax, (serv_bx + serv_bw, y_s1 + serv_bh/2 - 1.0), (repo_bx, y_r1 + repo_bh/2), label="-IProjectData-", label_pos=(lbl_x, y_r1 + repo_bh/2), rad=0.04)
draw_arrow(ax, (serv_bx + serv_bw, y_s2 + serv_bh/2 - 1.0), (repo_bx, y_r2 + repo_bh/2), label="-ITranscriptData-", label_pos=(lbl_x, y_r2 + repo_bh/2), rad=-0.04)
draw_arrow(ax, (serv_bx + serv_bw, y_s3 + serv_bh/2 - 1.0), (repo_bx, y_r3 + repo_bh/2), label="-ITranslationData-", label_pos=(lbl_x, y_r3 + repo_bh/2), rad=-0.04)
draw_arrow(ax, (serv_bx + serv_bw, y_s4 + serv_bh/2 - 0.5), (repo_bx, y_r4 + repo_bh/2), label="-IJobData-", label_pos=(lbl_x, y_r4 + repo_bh/2), rad=0.04)
draw_arrow(ax, (serv_bx + serv_bw - 2.0, y_s_auth + 2.3), (repo_bx, y_r5 + repo_bh/2), label="-IUserData-", label_pos=(lbl_x, y_r5 + repo_bh/2), rad=0.10)

# ==================== 5. DATA LAYER (FAR RIGHT) ====================
data_x, data_y, data_w, data_h = 83.0, 8.0, 14.5, 84.0
draw_container(ax, data_x, data_y, data_w, data_h, "Data Layer")

db_w = 12.0
db_x = data_x + (data_w - db_w) / 2

# Database Cylinder
draw_cylinder(ax, db_x, 46.0, db_w, 14.0, "MongoDB Database")

# Local File Storage Box
draw_box(ax, db_x, 15.0, db_w, 8.5, "Local File Storage", "(/uploads/media)")

# Curved arrows from Repositories to MongoDB (IDataAccess)
db_in = (db_x, 53.0)
lbl_db_x = 78.5

draw_arrow(ax, (repo_bx + repo_bw, y_r1 + repo_bh/2), db_in, label="-IDataAccess-", label_pos=(lbl_db_x, 50.0), rad=-0.12)
draw_arrow(ax, (repo_bx + repo_bw, y_r2 + repo_bh/2), db_in, rad=-0.06)
draw_arrow(ax, (repo_bx + repo_bw, y_r3 + repo_bh/2), db_in, rad=0.04)
draw_arrow(ax, (repo_bx + repo_bw, y_r4 + repo_bh/2), db_in, rad=0.10)
draw_arrow(ax, (repo_bx + repo_bw, y_r5 + repo_bh/2), db_in, rad=0.16)

# File I/O arrow from FFmpeg / Services to Local File Storage
draw_arrow(ax, (ext_bx + ext_bw, y_ext4 + ext_bh/2), (db_x, 20.0), label="-File I/O-", rad=-0.14)

plt.tight_layout()

out_png = "reports/diagrams/Figure_3_1_System_Architecture.png"
out_svg = "reports/diagrams/Figure_3_1_System_Architecture.svg"

plt.savefig(out_png, dpi=300, bbox_inches='tight')
plt.savefig(out_svg, format='svg', bbox_inches='tight')

print("Refined monochrome Component diagram generated successfully:")
print(" -", out_png)
print(" -", out_svg)
