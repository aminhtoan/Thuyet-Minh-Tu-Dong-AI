import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

sys.stdout.reconfigure(encoding='utf-8')
plt.rcParams['font.family'] = 'DejaVu Sans'

# ==============================================================================
# 1. COMPONENT DIAGRAM (EXACT REPLICA OF REFERENCE PHOTO 1: "2. Component diagram")
# ==============================================================================
def generate_component_diagram():
    fig, ax = plt.subplots(figsize=(16, 11), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    BG_WHITE = '#FFFFFF'
    BORDER_BLACK = '#000000'
    TEXT_BLACK = '#000000'
    LINE_BLACK = '#000000'

    # Title matching Photo 1 exactly: "2. Component diagram"
    ax.text(4.5, 96.5, "2. Component diagram", fontsize=20, fontweight='bold', color=TEXT_BLACK)

    def draw_container(ax, x, y, w, h, title):
        rect = patches.Rectangle((x, y), w, h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.1, zorder=1)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h - 2.8, title, ha='center', va='center', fontsize=11.5, fontweight='normal', color=TEXT_BLACK,
                bbox=dict(boxstyle="square,pad=0.2", fc='white', ec="none"), zorder=2)

    def draw_box(ax, x, y, w, h, title):
        rect = patches.Rectangle((x, y), w, h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=3)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h/2, title, ha='center', va='center', fontsize=9.2, fontweight='normal', color=TEXT_BLACK, zorder=4)

    def draw_cylinder(ax, x, y, w, h, title):
        cap_h = h * 0.22
        # Body
        ax.add_patch(patches.Rectangle((x, y + cap_h/2), w, h - cap_h, facecolor=BG_WHITE, edgecolor='none', zorder=3))
        # Bottom curve
        ax.add_patch(patches.Arc((x + w/2, y + cap_h/2), w, cap_h, angle=0, theta1=180, theta2=360, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=4))
        # Side lines
        ax.plot([x, x], [y + cap_h/2, y + h - cap_h/2], color=BORDER_BLACK, linewidth=1.0, zorder=4)
        ax.plot([x + w, x + w], [y + cap_h/2, y + h - cap_h/2], color=BORDER_BLACK, linewidth=1.0, zorder=4)
        # Top oval
        ax.add_patch(patches.Ellipse((x + w/2, y + h - cap_h/2), w, cap_h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=5))
        # Text
        ax.text(x + w/2, y + h/2 - 0.5, title, ha='center', va='center', fontsize=9.5, fontweight='normal', color=TEXT_BLACK, zorder=6)

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
            ax.text(lx, ly, label, ha='center', va='center', fontsize=7.6, color=TEXT_BLACK,
                    bbox=dict(boxstyle="square,pad=0.18", fc='white', ec="none", alpha=1.0), zorder=7)

    # -------------------------------------------------------------------------
    # 1. CONTROLLERS CONTAINER (LEFT)
    # Exactly 4 boxes with a gap for Auth Service
    # -------------------------------------------------------------------------
    c_x, c_y, c_w, c_h = 5.0, 6.0, 16.5, 87.0
    draw_container(ax, c_x, c_y, c_w, c_h, "Controllers")

    ctrl_bw = 13.5
    ctrl_bh = 5.4
    ctrl_bx = c_x + (c_w - ctrl_bw) / 2

    y_c1 = 78.0  # Project Controller
    # (Vertical gap at y ≈ 63 for compact Auth Service)
    y_c2 = 49.0  # Transcript Controller
    y_c3 = 31.0  # Translation Controller
    y_c4 = 13.0  # Narration Controller

    draw_box(ax, ctrl_bx, y_c1, ctrl_bw, ctrl_bh, "Project & Media Controller")
    draw_box(ax, ctrl_bx, y_c2, ctrl_bw, ctrl_bh, "Transcript Controller")
    draw_box(ax, ctrl_bx, y_c3, ctrl_bw, ctrl_bh, "Translation Controller")
    draw_box(ax, ctrl_bx, y_c4, ctrl_bw, ctrl_bh, "Narration Controller")

    # -------------------------------------------------------------------------
    # 2. SERVICES CONTAINER (MIDDLE)
    # Exactly 5 boxes: Top service, compact Auth Service, then 3 lower services
    # -------------------------------------------------------------------------
    s_x, s_y, s_w, s_h = 29.5, 6.0, 18.5, 87.0
    draw_container(ax, s_x, s_y, s_w, s_h, "Services")

    serv_bw = 15.0
    serv_bh = 5.4
    serv_bx = s_x + (s_w - serv_bw) / 2

    y_s1 = 78.0     # Project & Media Service
    y_s_auth = 63.5 # Auth Service (compact box in the gap, exactly like Reference 1!)
    y_s2 = 49.0     # Transcript & CAS Service
    y_s3 = 31.0     # Translation Service
    y_s4 = 13.0     # Narration & Audio Service

    draw_box(ax, serv_bx, y_s1, serv_bw, serv_bh, "Project & Media Service")
    draw_box(ax, serv_bx + 2.0, y_s_auth, 11.0, 4.8, "Auth Service")
    draw_box(ax, serv_bx, y_s2, serv_bw, serv_bh, "Transcript & CAS Service")
    draw_box(ax, serv_bx, y_s3, serv_bw, serv_bh, "Translation Service")
    draw_box(ax, serv_bx, y_s4, serv_bw, serv_bh, "Narration & Audio Service")

    # Connectors: Controllers -> Services (Perfect horizontal arrows)
    draw_arrow(ax, (ctrl_bx + ctrl_bw, y_c1 + ctrl_bh/2), (serv_bx, y_s1 + serv_bh/2), label="-IProject-")
    draw_arrow(ax, (ctrl_bx + ctrl_bw, y_c2 + ctrl_bh/2), (serv_bx, y_s2 + serv_bh/2), label="-ITranscript-")
    draw_arrow(ax, (ctrl_bx + ctrl_bw, y_c3 + ctrl_bh/2), (serv_bx, y_s3 + serv_bh/2), label="-ITranslation-")
    draw_arrow(ax, (ctrl_bx + ctrl_bw, y_c4 + ctrl_bh/2), (serv_bx, y_s4 + serv_bh/2), label="-INarration-")

    # -------------------------------------------------------------------------
    # 3. EXTERNAL SYSTEMS (TOP RIGHT)
    # Exactly 2 boxes matching Reference 1 (Health Insurance Gateway, Payment Gateway)
    # -------------------------------------------------------------------------
    ext_x, ext_y, ext_w, ext_h = 56.5, 59.0, 18.5, 34.0
    draw_container(ax, ext_x, ext_y, ext_w, ext_h, "External Systems")

    ext_bw = 15.0
    ext_bh = 5.2
    ext_bx = ext_x + (ext_w - ext_bw) / 2

    y_ext1 = 78.0 # Speech & Media Processing Engine (FFmpeg / Whisper STT)
    y_ext2 = 63.5 # AI Translation & Voice Gateway (Gemini API / Neural TTS)

    draw_box(ax, ext_bx, y_ext1, ext_bw, ext_bh, "Speech & Media Engine")
    draw_box(ax, ext_bx, y_ext2, ext_bw, ext_bh, "AI Translation & Voice API")

    # Dotted REST API arrows from Services into External Systems (matching Reference 1)
    draw_arrow(ax, (serv_bx + serv_bw, y_s1 + serv_bh/2), (ext_bx, y_ext1 + ext_bh/2),
               label="-REST API-", is_dashed=True)
    draw_arrow(ax, (serv_bx + serv_bw - 2.0, y_s_auth + 4.8/2), (ext_bx, y_ext2 + ext_bh/2),
               label="-REST API-", is_dashed=True)

    # -------------------------------------------------------------------------
    # 4. REPOSITORIES (BOTTOM RIGHT)
    # Exactly 4 boxes matching Reference 1 (Patient, Drug, Claim, Plan Repositories)
    # -------------------------------------------------------------------------
    repo_x, repo_y, repo_w, repo_h = 56.5, 6.0, 18.5, 49.0
    draw_container(ax, repo_x, repo_y, repo_w, repo_h, "Repositories")

    repo_bw = 15.0
    repo_bh = 5.2
    repo_bx = repo_x + (repo_w - repo_bw) / 2

    y_r1 = 43.5 # Project Repository
    y_r2 = 31.0 # Transcript Repository
    y_r3 = 18.5 # Translation Repository
    y_r4 = 8.5  # Narration Repository

    draw_box(ax, repo_bx, y_r1, repo_bw, repo_bh, "Project Repository")
    draw_box(ax, repo_bx, y_r2, repo_bw, repo_bh, "Transcript Repository")
    draw_box(ax, repo_bx, y_r3, repo_bw, repo_bh, "Translation Repository")
    draw_box(ax, repo_bx, y_r4, repo_bw, repo_bh, "Narration Repository")

    # Solid lines from Services to Repositories (Matching Reference 1 routing)
    draw_arrow(ax, (serv_bx + serv_bw, y_s1 + serv_bh/2 - 1.2), (repo_bx, y_r1 + repo_bh/2 + 0.8),
               label="-IProjectData-", label_pos=(52.0, 58.0), rad=0.08)
    draw_arrow(ax, (serv_bx + serv_bw, y_s2 + serv_bh/2), (repo_bx, y_r2 + repo_bh/2 + 0.8),
               label="-ITranscriptData-", label_pos=(51.5, 42.0), rad=-0.04)
    draw_arrow(ax, (serv_bx + serv_bw, y_s3 + serv_bh/2), (repo_bx, y_r3 + repo_bh/2),
               label="-ITranslationData-", label_pos=(51.5, 25.0), rad=-0.04)
    draw_arrow(ax, (serv_bx + serv_bw, y_s4 + serv_bh/2), (repo_bx, y_r4 + repo_bh/2),
               label="-INarrationData-", label_pos=(51.5, 11.0), rad=-0.02)
    # Cross binding: Project Service also interacts with Transcript Repo
    draw_arrow(ax, (serv_bx + serv_bw, y_s2 + serv_bh/2 - 1.2), (repo_bx, y_r1 + repo_bh/2 - 0.8),
               label="-IProjectData-", label_pos=(52.0, 48.0), rad=-0.06)

    # -------------------------------------------------------------------------
    # 5. DATA LAYER (FAR RIGHT)
    # Exactly 1 cylinder: PostgreSQL Database -> MongoDB Database
    # -------------------------------------------------------------------------
    data_x, data_y, data_w, data_h = 83.0, 6.0, 14.5, 87.0
    draw_container(ax, data_x, data_y, data_w, data_h, "Data Layer")

    db_w = 12.0
    db_h = 16.0
    db_x = data_x + (data_w - db_w) / 2
    db_y = 41.5 # Centered vertically inside Data Layer

    draw_cylinder(ax, db_x, db_y, db_w, db_h, "MongoDB Database")

    # Curved arrows from all 4 Repositories to MongoDB cylinder (all labeled -IDataAccess-)
    db_target = (db_x, db_y + db_h/2)
    lbl_db_x = 78.0

    draw_arrow(ax, (repo_bx + repo_bw, y_r1 + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 48.0), rad=-0.14)
    draw_arrow(ax, (repo_bx + repo_bw, y_r2 + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 41.0), rad=-0.04)
    draw_arrow(ax, (repo_bx + repo_bw, y_r3 + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 34.0), rad=0.06)
    draw_arrow(ax, (repo_bx + repo_bw, y_r4 + repo_bh/2), db_target,
               label="-IDataAccess-", label_pos=(lbl_db_x, 26.0), rad=0.16)

    plt.tight_layout()

    out_png = "reports/diagrams/Figure_3_1_System_Architecture.png"
    out_svg = "reports/diagrams/Figure_3_1_System_Architecture.svg"

    plt.savefig(out_png, dpi=300, bbox_inches='tight')
    plt.savefig(out_svg, format='svg', bbox_inches='tight')
    plt.close()

    print("Component diagram generated successfully:")
    print(" -", out_png)
    print(" -", out_svg)


# ==============================================================================
# 2. DEPLOYMENT DIAGRAM (EXACT REPLICA OF REFERENCE PHOTO 2: "3. Deployment diagram")
# ==============================================================================
def generate_deployment_diagram():
    fig, ax = plt.subplots(figsize=(14, 12), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    BG_WHITE = '#FFFFFF'
    BORDER_BLACK = '#000000'
    TEXT_BLACK = '#000000'
    LINE_BLACK = '#000000'

    # Title matching Photo 2 exactly: "3. Deployment diagram"
    ax.text(5.0, 96.5, "3. Deployment diagram", fontsize=20, fontweight='bold', color=TEXT_BLACK)

    def draw_container(ax, x, y, w, h, title):
        rect = patches.Rectangle((x, y), w, h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.1, zorder=1)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h - 2.6, title, ha='center', va='center', fontsize=11.5, fontweight='normal', color=TEXT_BLACK,
                bbox=dict(boxstyle="square,pad=0.25", fc='white', ec="none"), zorder=5)

    def draw_box(ax, x, y, w, h, title):
        rect = patches.Rectangle((x, y), w, h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=3)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h/2, title, ha='center', va='center', fontsize=9.2, fontweight='normal', color=TEXT_BLACK, zorder=4)

    def draw_cylinder(ax, x, y, w, h, title):
        cap_h = h * 0.22
        ax.add_patch(patches.Rectangle((x, y + cap_h/2), w, h - cap_h, facecolor=BG_WHITE, edgecolor='none', zorder=3))
        ax.add_patch(patches.Arc((x + w/2, y + cap_h/2), w, cap_h, angle=0, theta1=180, theta2=360, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=4))
        ax.plot([x, x], [y + cap_h/2, y + h - cap_h/2], color=BORDER_BLACK, linewidth=1.0, zorder=4)
        ax.plot([x + w, x + w], [y + cap_h/2, y + h - cap_h/2], color=BORDER_BLACK, linewidth=1.0, zorder=4)
        ax.add_patch(patches.Ellipse((x + w/2, y + h - cap_h/2), w, cap_h, facecolor=BG_WHITE, edgecolor=BORDER_BLACK, linewidth=1.0, zorder=5))
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
            ax.text(lx, ly, label, ha='center', va='center', fontsize=7.8, color=TEXT_BLACK,
                    bbox=dict(boxstyle="square,pad=0.2", fc='white', ec="none", alpha=1.0), zorder=7)

    # -------------------------------------------------------------------------
    # 1. CLIENT DEVICES (TOP)
    # Box 1: Hospital / Pharmacy -> Customer Web & Admin Portal
    # Box 2: Patient Mobile -> Customer Mobile App
    # -------------------------------------------------------------------------
    draw_container(ax, 38.0, 80.0, 56.0, 13.0, "Client Devices")
    draw_box(ax, 42.0, 82.5, 23.0, 7.0, "Customer Web & Admin Portal")
    draw_box(ax, 68.0, 82.5, 23.0, 7.0, "Customer Mobile App")

    # -------------------------------------------------------------------------
    # 2. DMZ ZONE
    # Load Balancer / Reverse Proxy
    # -------------------------------------------------------------------------
    draw_container(ax, 38.0, 58.0, 56.0, 15.0, "DMZ Zone")
    draw_box(ax, 49.0, 61.0, 34.0, 8.0, "Load Balancer / Reverse Proxy")

    # Smooth curving HTTPS arrows from Client Devices down into DMZ Load Balancer
    # Exactly like Reference 2: curve inward to top edge of Load Balancer
    draw_arrow(ax, (53.5, 82.5), (60.0, 69.0), label="HTTPS", rad=0.08, label_pos=(55.5, 76.0))
    draw_arrow(ax, (79.5, 82.5), (72.0, 69.0), label="HTTPS", rad=-0.08, label_pos=(77.5, 76.0))

    # -------------------------------------------------------------------------
    # 3. APPLICATION SERVER CLUSTER
    # Server 1 (left) & Server 2 (right), title centered in between arrows!
    # -------------------------------------------------------------------------
    draw_container(ax, 16.0, 35.0, 78.0, 17.0, "Application Server Cluster")
    # Position Server 1 at x=30..48 and Server 2 at x=70..88 (Title is at x=55!)
    draw_box(ax, 32.0, 38.0, 18.0, 8.0, "Server 1")
    draw_box(ax, 70.0, 38.0, 18.0, 8.0, "Server 2")

    # Smooth curving HTTP/TCP arrows from Load Balancer down into Server 1 & Server 2
    # Arrow to Server 1 enters at x=41 (< 46), Arrow to Server 2 enters at x=79 (> 64)
    # The title "Application Server Cluster" is at x=55, perfectly clear in between!
    draw_arrow(ax, (54.0, 61.0), (41.0, 46.0), label="HTTP/TCP", rad=0.08, label_pos=(45.5, 53.5))
    draw_arrow(ax, (78.0, 61.0), (79.0, 46.0), label="HTTP/TCP", rad=-0.08, label_pos=(81.0, 53.5))

    # -------------------------------------------------------------------------
    # 4. EXTERNAL NETWORK (BOTTOM LEFT)
    # Box 1: Health Insurance Gateway -> Speech & AI Gateway
    # Box 2: Payment Gateway -> Voice & Media Engine
    # Title centered at x=34! Dotted arrows frame the title on left and right!
    # -------------------------------------------------------------------------
    ext_net_x, ext_net_y, ext_net_w, ext_net_h = 6.0, 6.0, 56.0, 22.0
    draw_container(ax, ext_net_x, ext_net_y, ext_net_w, ext_net_h, "External Network")
    draw_box(ax, 9.0, 11.5, 23.0, 9.0, "Speech & AI Gateway\n(Whisper / Gemini)")
    draw_box(ax, 36.0, 11.5, 23.0, 9.0, "Voice & Media Engine\n(TTS / FFmpeg)")

    # Dotted REST API arrows from Server 1 down to External Network
    # Arrow 1 enters Speech & AI Gateway at x=20.5 (left of title x=34)
    # Arrow 2 enters Voice & Media Engine at x=47.5 (right of title x=34)
    draw_arrow(ax, (34.0, 38.0), (20.5, 20.5), label="REST API", is_dashed=True, rad=-0.06, label_pos=(25.0, 30.5))
    draw_arrow(ax, (43.0, 38.0), (47.5, 20.5), label="REST API", is_dashed=True, rad=0.04, label_pos=(48.5, 30.5))

    # -------------------------------------------------------------------------
    # 5. DATABASE CLUSTER (BOTTOM RIGHT)
    # Database cylinder
    # -------------------------------------------------------------------------
    db_c_x, db_c_y, db_c_w, db_c_h = 68.0, 6.0, 26.0, 22.0
    draw_container(ax, db_c_x, db_c_y, db_c_w, db_c_h, "Database Cluster")

    db_w = 14.0
    db_h = 13.0
    db_x = db_c_x + (db_c_w - db_w) / 2
    db_y = 10.5
    draw_cylinder(ax, db_x, db_y, db_w, db_h, "Database")

    # Solid Write Data arrows from Server 1 & Server 2 curving down to top oval of Database
    db_in_top = (db_x + db_w/2, db_y + db_h - db_h*0.22/2)
    draw_arrow(ax, (50.0, 38.0), (db_x + 3.0, db_in_top[1] + 0.5), label="Write Data", rad=0.06, label_pos=(62.5, 30.5))
    draw_arrow(ax, (79.0, 38.0), (db_x + 10.0, db_in_top[1] + 0.5), label="Write Data", rad=-0.05, label_pos=(83.5, 28.5))

    plt.tight_layout()

    out_png = "reports/diagrams/Figure_3_2_Deployment_Diagram.png"
    out_svg = "reports/diagrams/Figure_3_2_Deployment_Diagram.svg"

    plt.savefig(out_png, dpi=300, bbox_inches='tight')
    plt.savefig(out_svg, format='svg', bbox_inches='tight')
    plt.close()

    print("Deployment diagram generated successfully:")
    print(" -", out_png)
    print(" -", out_svg)


if __name__ == "__main__":
    generate_component_diagram()
    generate_deployment_diagram()
