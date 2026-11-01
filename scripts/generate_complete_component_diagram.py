import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

sys.stdout.reconfigure(encoding='utf-8')
plt.rcParams['font.family'] = 'DejaVu Sans'

def generate_complete_component_diagram():
    # Large high-res canvas
    fig, ax = plt.subplots(figsize=(19, 14), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    BG_WHITE = '#FFFFFF'
    BORDER_BLACK = '#000000'
    TEXT_BLACK = '#000000'
    LINE_BLACK = '#000000'

    # Title matching Photo 1: "2. Component diagram"
    ax.text(3.5, 97.2, "2. Component diagram", fontsize=20, fontweight='bold', color=TEXT_BLACK)

    def draw_container(ax, x, y, w, h, title):
        rect = patches.Rectangle((x, y), w, h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.1, zorder=1)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h - 2.5, title, ha='center', va='center', fontsize=12.0, fontweight='normal', color=TEXT_BLACK,
                bbox=dict(boxstyle="square,pad=0.25", fc='white', ec="none"), zorder=2)

    def draw_box(ax, x, y, w, h, title, subtext=""):
        rect = patches.Rectangle((x, y), w, h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=3)
        ax.add_patch(rect)
        if subtext:
            ax.text(x + w/2, y + h/2 + 0.9, title, ha='center', va='center', fontsize=8.8, fontweight='normal', color=TEXT_BLACK, zorder=4)
            ax.text(x + w/2, y + h/2 - 1.1, subtext, ha='center', va='center', fontsize=7.0, color='#333333', zorder=4)
        else:
            ax.text(x + w/2, y + h/2, title, ha='center', va='center', fontsize=8.8, fontweight='normal', color=TEXT_BLACK, zorder=4)

    def draw_cylinder(ax, x, y, w, h, title, subtext=""):
        cap_h = h * 0.20
        ax.add_patch(patches.Rectangle((x, y + cap_h/2), w, h - cap_h, facecolor=BG_WHITE, edgecolor='none', zorder=3))
        ax.add_patch(patches.Arc((x + w/2, y + cap_h/2), w, cap_h, angle=0, theta1=180, theta2=360, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=4))
        ax.plot([x, x], [y + cap_h/2, y + h - cap_h/2], color=BORDER_BLACK, linewidth=1.0, zorder=4)
        ax.plot([x + w, x + w], [y + cap_h/2, y + h - cap_h/2], color=BORDER_BLACK, linewidth=1.0, zorder=4)
        ax.add_patch(patches.Ellipse((x + w/2, y + h - cap_h/2), w, cap_h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=5))
        if subtext:
            ax.text(x + w/2, y + h/2 + 0.5, title, ha='center', va='center', fontsize=9.2, fontweight='normal', color=TEXT_BLACK, zorder=6)
            ax.text(x + w/2, y + h/2 - 1.5, subtext, ha='center', va='center', fontsize=7.2, color='#333333', zorder=6)
        else:
            ax.text(x + w/2, y + h/2 - 0.5, title, ha='center', va='center', fontsize=9.2, fontweight='normal', color=TEXT_BLACK, zorder=6)

    def draw_arrow(ax, start, end, label="", is_dashed=False, rad=0, label_pos=None):
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
            ax.text(lx, ly, label, ha='center', va='center', fontsize=7.4, color=TEXT_BLACK,
                    bbox=dict(boxstyle="square,pad=0.16", fc='white', ec="none", alpha=1.0), zorder=7)

    # =========================================================================
    # 1. CONTROLLERS CONTAINER (LEFT COLUMN) - ALL 10 CONTROLLERS
    # =========================================================================
    c_x, c_y, c_w, c_h = 3.5, 4.0, 16.5, 91.0
    draw_container(ax, c_x, c_y, c_w, c_h, "Controllers")

    ctrl_bw = 14.2
    ctrl_bh = 4.6
    ctrl_bx = c_x + (c_w - ctrl_bw) / 2

    # 10 Y-coordinates with exact uniform 8.6 step
    y_coords = [87.5 - i * 8.6 for i in range(10)]

    controllers_info = [
        ("Auth Controller", "-IAuth-"),
        ("Project Controller", "-IProject-"),
        ("Media Controller", "-IMedia-"),
        ("Transcript & CAS Controller", "-ITranscript-"),
        ("Translation Controller", "-ITranslation-"),
        ("Narration Controller", "-INarration-"),
        ("QR & Visitor Controller", "-IQR-"),
        ("Analytics Controller", "-IAnalytics-"),
        ("Voice Catalog Controller", "-IVoice-"),
        ("Admin Controller", "-IAdmin-")
    ]

    for i, (name, _) in enumerate(controllers_info):
        draw_box(ax, ctrl_bx, y_coords[i], ctrl_bw, ctrl_bh, name)

    # =========================================================================
    # 2. SERVICES CONTAINER (MIDDLE COLUMN) - ALL 10 SERVICES
    # =========================================================================
    s_x, s_y, s_w, s_h = 27.5, 4.0, 18.5, 91.0
    draw_container(ax, s_x, s_y, s_w, s_h, "Services")

    serv_bw = 15.8
    serv_bh = 4.6
    serv_bx = s_x + (s_w - serv_bw) / 2

    services_info = [
        "Auth Service",
        "Project Service",
        "Media Processing Service",
        "Transcript & CAS Service",
        "Translation Service",
        "Narration & Audio Service",
        "QR & Visitor Service",
        "Analytics Service",
        "Voice Catalog Service",
        "Admin Management Service"
    ]

    for i, name in enumerate(services_info):
        # Auth Service can be styled compact or uniform
        if i == 0:
            draw_box(ax, serv_bx + 1.0, y_coords[i], serv_bw - 2.0, serv_bh, name)
        else:
            draw_box(ax, serv_bx, y_coords[i], serv_bw, serv_bh, name)

    # Draw horizontal connectors from Controllers to Services
    for i, (_, label) in enumerate(controllers_info):
        y_c = y_coords[i] + ctrl_bh / 2
        p_start = (ctrl_bx + ctrl_bw, y_c)
        target_x = serv_bx + 1.0 if i == 0 else serv_bx
        p_end = (target_x, y_c)
        draw_arrow(ax, p_start, p_end, label=label)

    # =========================================================================
    # 3. EXTERNAL SYSTEMS (TOP RIGHT) - ALL 4 EXTERNAL ENGINES & APIS
    # =========================================================================
    ext_x, ext_y, ext_w, ext_h = 54.0, 56.5, 20.0, 38.5
    draw_container(ax, ext_x, ext_y, ext_w, ext_h, "External Systems")

    ext_bw = 16.8
    ext_bh = 4.8
    ext_bx = ext_x + (ext_w - ext_bw) / 2

    y_ext1 = 86.5 # FFmpeg
    y_ext2 = 77.0 # Whisper STT
    y_ext3 = 67.5 # Gemini Translation
    y_ext4 = 58.5 # Neural TTS

    draw_box(ax, ext_bx, y_ext1, ext_bw, ext_bh, "FFmpeg Processing Engine", "(Audio/Video Processing)")
    draw_box(ax, ext_bx, y_ext2, ext_bw, ext_bh, "OpenAI Whisper STT API", "(Speech Recognition)")
    draw_box(ax, ext_bx, y_ext3, ext_bw, ext_bh, "Gemini Translation API", "(LLM Multilingual Translation)")
    draw_box(ax, ext_bx, y_ext4, ext_bw, ext_bh, "Neural TTS Voice API", "(Speech Synthesis)")

    # Dotted REST / Process Spawn arrows from Services into External Systems
    lbl_ext_x = 49.5
    # Media Processing Service -> FFmpeg
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[2] + serv_bh/2), (ext_bx, y_ext1 + ext_bh/2),
               label="-Process Spawn-", is_dashed=True, label_pos=(lbl_ext_x, 79.0), rad=-0.10)
    # Transcript & CAS Service -> Whisper
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[3] + serv_bh/2), (ext_bx, y_ext2 + ext_bh/2),
               label="-REST API-", is_dashed=True, label_pos=(lbl_ext_x, 71.0), rad=-0.08)
    # Translation Service -> Gemini
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[4] + serv_bh/2), (ext_bx, y_ext3 + ext_bh/2),
               label="-REST API-", is_dashed=True, label_pos=(lbl_ext_x, 62.0), rad=-0.06)
    # Narration Service -> Neural TTS
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[5] + serv_bh/2), (ext_bx, y_ext4 + ext_bh/2),
               label="-REST API-", is_dashed=True, label_pos=(lbl_ext_x, 53.0), rad=-0.05)

    # =========================================================================
    # 4. REPOSITORIES (BOTTOM RIGHT) - REPOSITORIES COVERING ALL MODULES
    # =========================================================================
    repo_x, repo_y, repo_w, repo_h = 54.0, 4.0, 20.0, 50.0
    draw_container(ax, repo_x, repo_y, repo_w, repo_h, "Repositories")

    repo_bw = 16.8
    repo_bh = 4.6
    repo_bx = repo_x + (repo_w - repo_bw) / 2

    y_repos = [
        45.0, # Project & Media Repository
        37.0, # Transcript Repository
        29.0, # Translation Repository
        21.0, # Narration Repository
        13.5, # Visitor & QR Repository
        6.0   # User & Analytics Repository
    ]

    repo_names = [
        ("Project & Media Repository", "(Project, Media Documents)"),
        ("Transcript Repository", "(Transcript, Segment Docs)"),
        ("Translation Repository", "(Translation, Attempt Docs)"),
        ("Narration Repository", "(Narration, Job, Result Docs)"),
        ("Visitor & QR Repository", "(VisitQR, Visitor, ListenEvent)"),
        ("User & Analytics Repository", "(User, Session, ActivityLog)")
    ]

    for i, (r_title, r_sub) in enumerate(repo_names):
        draw_box(ax, repo_bx, y_repos[i], repo_bw, repo_bh, r_title, r_sub)

    # Solid lines from Services to Repositories
    lbl_repo_x = 49.5
    # Project Service -> Project & Media Repo
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[1] + serv_bh/2), (repo_bx, y_repos[0] + repo_bh/2 + 0.8),
               label="-IProjectData-", label_pos=(lbl_repo_x, 50.0), rad=0.08)
    # Media Service -> Project & Media Repo
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[2] + serv_bh/2), (repo_bx, y_repos[0] + repo_bh/2 - 0.8),
               label="-IMediaData-", label_pos=(lbl_repo_x, 47.0), rad=0.04)
    # Transcript Service -> Transcript Repo
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[3] + serv_bh/2), (repo_bx, y_repos[1] + repo_bh/2),
               label="-ITranscriptData-", label_pos=(lbl_repo_x, 39.5), rad=0.0)
    # Translation Service -> Translation Repo
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[4] + serv_bh/2), (repo_bx, y_repos[2] + repo_bh/2),
               label="-ITranslationData-", label_pos=(lbl_repo_x, 31.5), rad=0.0)
    # Narration Service -> Narration Repo
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[5] + serv_bh/2), (repo_bx, y_repos[3] + repo_bh/2),
               label="-INarrationData-", label_pos=(lbl_repo_x, 24.0), rad=0.0)
    # QR & Visitor Service -> Visitor & QR Repo
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[6] + serv_bh/2), (repo_bx, y_repos[4] + repo_bh/2),
               label="-IQRData-", label_pos=(lbl_repo_x, 16.5), rad=0.0)
    # Admin & Auth & Analytics -> User & Analytics Repo
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[7] + serv_bh/2), (repo_bx, y_repos[5] + repo_bh/2 + 0.8),
               label="-ILogData-", label_pos=(lbl_repo_x, 12.0), rad=-0.04)
    draw_arrow(ax, (serv_bx + serv_bw, y_coords[9] + serv_bh/2), (repo_bx, y_repos[5] + repo_bh/2 - 0.8),
               label="-IUserData-", label_pos=(lbl_repo_x, 7.0), rad=-0.02)

    # =========================================================================
    # 5. DATA LAYER (FAR RIGHT) - MONGODB DATABASE + LOCAL FILE STORAGE
    # =========================================================================
    data_x, data_y, data_w, data_h = 81.0, 4.0, 16.5, 91.0
    draw_container(ax, data_x, data_y, data_w, data_h, "Data Layer")

    db_w = 13.5
    db_h = 16.0
    db_x = data_x + (data_w - db_w) / 2
    db_y = 48.0 # Centered vertically

    draw_cylinder(ax, db_x, db_y, db_w, db_h, "MongoDB Database", "(Replica Set Cloud)")

    # Local File Storage box
    fs_h = 8.0
    fs_y = 10.0
    draw_box(ax, db_x, fs_y, db_w, fs_h, "Local File Storage", "(/uploads/{source, audio, narrations})")

    # Smooth curved arrows from Repositories to MongoDB Database (IDataAccess)
    db_target = (db_x, db_y + db_h/2)
    lbl_db_x = 76.5

    draw_arrow(ax, (repo_bx + repo_bw, y_repos[0] + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 53.0), rad=-0.12)
    draw_arrow(ax, (repo_bx + repo_bw, y_repos[1] + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 47.0), rad=-0.05)
    draw_arrow(ax, (repo_bx + repo_bw, y_repos[2] + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 42.0), rad=0.03)
    draw_arrow(ax, (repo_bx + repo_bw, y_repos[3] + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 37.0), rad=0.10)
    draw_arrow(ax, (repo_bx + repo_bw, y_repos[4] + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 31.0), rad=0.18)
    draw_arrow(ax, (repo_bx + repo_bw, y_repos[5] + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 24.0), rad=0.25)

    # File I/O from FFmpeg down to Local File Storage along the right outer edge
    draw_arrow(ax, (ext_bx + ext_bw, y_ext1 + ext_bh/2), (db_x + db_w/2, fs_y + fs_h),
               label="-File I/O Stream-", label_pos=(86.0, 75.0), rad=-0.22)

    plt.tight_layout()

    out_png = "reports/diagrams/Figure_3_1_System_Architecture.png"
    out_svg = "reports/diagrams/Figure_3_1_System_Architecture.svg"

    plt.savefig(out_png, dpi=300, bbox_inches='tight')
    plt.savefig(out_svg, format='svg', bbox_inches='tight')
    plt.close()

    print("Complete Component diagram generated successfully:")
    print(" -", out_png)
    print(" -", out_svg)

if __name__ == "__main__":
    generate_complete_component_diagram()
