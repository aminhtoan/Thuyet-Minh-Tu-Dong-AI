import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.lines as lines
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# Configure matplotlib font and style
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['mathtext.fontset'] = 'dejavusans'

fig, ax = plt.subplots(figsize=(13, 16), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# 1. System Boundary Box
boundary = patches.Rectangle(
    (22, 4), 56, 92,
    linewidth=2.0, edgecolor='#000000', facecolor='#FAFAFC', zorder=1
)
ax.add_patch(boundary)

# System Title
ax.text(
    50, 93.5,
    "Multilingual AI Narration System for Museums",
    ha='center', va='center', fontsize=15, fontweight='bold', color='#111111', zorder=10
)

# Helper function to draw stick figures
def draw_actor(ax, x, y, title, subtitle="", scale=1.0):
    head_radius = 1.3 * scale
    torso_len = 3.2 * scale
    arm_span = 2.6 * scale
    leg_len = 3.6 * scale
    leg_span = 2.2 * scale
    
    # Head
    head = patches.Circle((x, y + torso_len + head_radius), head_radius,
                          linewidth=1.6, edgecolor='#111111', facecolor='white', zorder=5)
    ax.add_patch(head)
    
    # Torso
    ax.plot([x, x], [y, y + torso_len], color='#111111', linewidth=1.6, zorder=5)
    
    # Arms
    ax.plot([x - arm_span/2, x + arm_span/2], [y + torso_len * 0.65, y + torso_len * 0.65],
            color='#111111', linewidth=1.6, zorder=5)
    
    # Legs
    ax.plot([x, x - leg_span/2], [y, y - leg_len], color='#111111', linewidth=1.6, zorder=5)
    ax.plot([x, x + leg_span/2], [y, y - leg_len], color='#111111', linewidth=1.6, zorder=5)
    
    # Label
    label_y = y - leg_len - 1.4
    if subtitle:
        ax.text(x, label_y, title, ha='center', va='top', fontsize=9.5, fontweight='bold', color='#111111')
        ax.text(x, label_y - 1.8, subtitle, ha='center', va='top', fontsize=8.5, fontstyle='italic', color='#444444')
    else:
        ax.text(x, label_y, title, ha='center', va='top', fontsize=9.5, fontweight='bold', color='#111111')

# Draw Actors
# Left: Visitor (top), Staff (middle), External AI (bottom)
draw_actor(ax, 11, 80, "Museum Visitor", "(Du khách)", scale=1.0)
draw_actor(ax, 11, 46, "Museum Staff", "(Cán bộ bảo tàng)", scale=1.0)
draw_actor(ax, 11, 12, "External AI Service", "(Whisper / Gemini / TTS)", scale=1.0)

# Right: Admin (middle-top), FFmpeg Engine (bottom)
draw_actor(ax, 89, 62, "System Admin", "(Quản trị viên)", scale=1.0)
draw_actor(ax, 89, 22, "FFmpeg Engine", "(Động cơ Media)", scale=1.0)

# 16 Use Cases Coordinates & Text
# Col 1 (x_center = 36): 8 use cases
# Col 2 (x_center = 64): 8 use cases
oval_w = 23
oval_h = 5.2
rounding = 2.6

# Y positions for 8 rows: from y=86 down to y=9
y_rows = [86 - i * 10.8 for i in range(8)]

col1_cases = [
    ("UC_13", "Scan QR & Play\nAudio Guide", 36, y_rows[0]),
    ("UC_01", "Register / Login\n(JWT Auth)", 36, y_rows[1]),
    ("UC_02", "Manage User Profile", 36, y_rows[2]),
    ("UC_03", "Create Project &\nUpload Media", 36, y_rows[3]),
    ("UC_04", "Manage Project List", 36, y_rows[4]),
    ("UC_05", "Transcribe Speech\n(Whisper STT)", 36, y_rows[5]),
    ("UC_06", "Edit Transcript\n(CAS Protected)", 36, y_rows[6]),
    ("UC_07", "Context Translation\n(GROUPS_V1)", 36, y_rows[7]),
]

col2_cases = [
    ("UC_08", "Review & Approve\nTranslation", 64, y_rows[0]),
    ("UC_09", "Select Voice & Speed\n(0.75x - 1.5x)", 64, y_rows[1]),
    ("UC_10", "Synthesize Narration\n(Neural TTS)", 64, y_rows[2]),
    ("UC_11", "Mux Video &\nAudio Ducking", 64, y_rows[3]),
    ("UC_12", "Preview & Download\nResult (MP4)", 64, y_rows[4]),
    ("UC_14", "Monitor & Retry\nProcessing Jobs", 64, y_rows[5]),
    ("UC_15", "Manage Users\n(Block / Unblock)", 64, y_rows[6]),
    ("UC_16", "Manage Languages &\nVoice Catalog", 64, y_rows[7]),
]

all_cases = col1_cases + col2_cases
case_coords = {}

# Draw Ovals
for code, text, cx, cy in all_cases:
    case_coords[code] = (cx, cy)
    oval = patches.FancyBboxPatch(
        (cx - oval_w/2, cy - oval_h/2), oval_w, oval_h,
        boxstyle=f"round,pad=0.2,rounding_size={rounding}",
        linewidth=1.2, edgecolor='#111111', facecolor='white', zorder=3
    )
    ax.add_patch(oval)
    ax.text(cx, cy, text, ha='center', va='center', fontsize=9.2, color='#111111', zorder=4)

# Connections: Actors to Use Cases
# Visitor (11, 80)
v_pt = (11, 80)
ax.plot([v_pt[0], case_coords["UC_13"][0] - oval_w/2], [v_pt[1], case_coords["UC_13"][1]],
        color='#111111', linewidth=1.1, zorder=2)

# Staff (11, 46)
s_pt = (11, 46)
for target in ["UC_01", "UC_02", "UC_03", "UC_04", "UC_05", "UC_06", "UC_07", "UC_08", "UC_09", "UC_10", "UC_11", "UC_12"]:
    tx = case_coords[target][0] - oval_w/2 if case_coords[target][0] == 36 else case_coords[target][0] - oval_w/2
    ty = case_coords[target][1]
    ax.plot([s_pt[0], tx], [s_pt[1], ty], color='#111111', linewidth=1.1, zorder=2)

# Admin (89, 62)
a_pt = (89, 62)
for target in ["UC_01", "UC_02", "UC_14", "UC_15", "UC_16"]:
    tx = case_coords[target][0] + oval_w/2
    ty = case_coords[target][1]
    ax.plot([a_pt[0], tx], [a_pt[1], ty], color='#111111', linewidth=1.1, zorder=2)

# External AI Service (11, 12) -> UC-05, UC-07, UC-10 (Blue lines)
ai_pt = (11, 12)
for target in ["UC_05", "UC_07", "UC_10"]:
    tx = case_coords[target][0] - oval_w/2
    ty = case_coords[target][1]
    ax.plot([ai_pt[0], tx], [ai_pt[1], ty], color='#1976D2', linewidth=1.2, linestyle='-', zorder=2)

# FFmpeg Engine (89, 22) -> UC-11 (Red line)
ff_pt = (89, 22)
tx = case_coords["UC_11"][0] + oval_w/2
ty = case_coords["UC_11"][1]
ax.plot([ff_pt[0], tx], [ff_pt[1], ty], color='#D32F2F', linewidth=1.2, linestyle='-', zorder=2)

# Include arrows between Use Cases
def draw_include(ax, src_code, dst_code, offset_y=0):
    x1, y1 = case_coords[src_code]
    x2, y2 = case_coords[dst_code]
    
    # Calculate edge connection points
    if x1 == x2: # Vertical
        start = (x1, y1 - oval_h/2) if y1 > y2 else (x1, y1 + oval_h/2)
        end = (x2, y2 + oval_h/2) if y1 > y2 else (x2, y2 - oval_h/2)
        mid_x = x1
        mid_y = (start[1] + end[1]) / 2 + offset_y
    else: # Cross column
        start = (x1 + oval_w/2, y1) if x1 < x2 else (x1 - oval_w/2, y1)
        end = (x2 - oval_w/2, y2) if x1 < x2 else (x2 + oval_w/2, y2)
        mid_x = (start[0] + end[0]) / 2
        mid_y = (start[1] + end[1]) / 2 + offset_y

    ax.annotate(
        "", xy=end, xytext=start,
        arrowprops=dict(arrowstyle="->", color="#555555", linestyle="--", linewidth=1.1),
        zorder=3
    )
    ax.text(
        mid_x, mid_y, "<<include>>",
        ha='center', va='center', fontsize=7.5, color='#444444',
        bbox=dict(boxstyle="square,pad=0.1", fc='#FAFAFC', ec="none"),
        zorder=4
    )

# Draw domain-specific include relationships
# UC_03 -> UC_05 (Create Project & Upload media -> Transcribe speech)
draw_include(ax, "UC_03", "UC_05")

# UC_07 -> UC_08 (Context Translation -> Review & Approve)
draw_include(ax, "UC_07", "UC_08", offset_y=0.5)

# UC_10 -> UC_09 (Synthesize Narration -> Select Voice & Speed)
draw_include(ax, "UC_10", "UC_09")

# UC_11 -> UC_10 (Mux Video & Audio Ducking -> Synthesize Speech)
draw_include(ax, "UC_11", "UC_10")

plt.tight_layout()

# Save both PNG and SVG to reports/diagrams/
png_path = "reports/diagrams/Figure_2_1_System_Overview_Use_Case.png"
svg_path = "reports/diagrams/Figure_2_1_System_Overview_Use_Case.svg"
uml_png_path = "reports/diagrams/Figure_2_1_UML_Use_Case_Diagram.png"
uml_svg_path = "reports/diagrams/Figure_2_1_UML_Use_Case_Diagram.svg"

plt.savefig(png_path, dpi=300, bbox_inches='tight')
plt.savefig(svg_path, format='svg', bbox_inches='tight')
plt.savefig(uml_png_path, dpi=300, bbox_inches='tight')
plt.savefig(uml_svg_path, format='svg', bbox_inches='tight')

print(f"Successfully generated 16-Use-Case diagrams:")
print(f" - {png_path}")
print(f" - {svg_path}")
