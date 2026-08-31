"""
Generate a professional PowerPoint (.pptx) presentation for BorderVision AI.
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)  # 16:9 widescreen
    prs.slide_height = Inches(7.5)

    # Color Palette (Dark Tactical Theme)
    BG_COLOR = RGBColor(10, 14, 26)       # #0A0E1A Dark Navy
    CARD_BG = RGBColor(18, 24, 42)        # #12182A Card Navy
    CARD_BORDER = RGBColor(40, 50, 75)    # Slate Border
    ACCENT_BLUE = RGBColor(59, 130, 246)  # #3B82F6 Bright Blue
    ACCENT_RED = RGBColor(255, 45, 85)    # #FF2D55 Crimson Red
    ACCENT_GREEN = RGBColor(52, 211, 153) # #34D399 Emerald
    ACCENT_CYAN = RGBColor(56, 189, 248)  # #38BDF8 Sky Blue
    TEXT_WHITE = RGBColor(245, 247, 250)  # Off-white
    TEXT_MUTED = RGBColor(156, 163, 175)  # Gray-400
    TEXT_CYAN = RGBColor(56, 189, 248)    # Sky blue

    blank_slide_layout = prs.slide_layouts[6]

    def set_slide_background(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = BG_COLOR

    def add_header(slide, title_text, category_text="BORDERVISION AI — PLATFORM OVERVIEW"):
        # Category / Breadcrumb
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ACCENT_RED

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.7))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE

    def add_card(slide, left, top, width, height, title, points, accent_color=ACCENT_BLUE):
        # Card Background Shape
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = CARD_BG
        shape.line.color.rgb = CARD_BORDER
        shape.line.width = Pt(1.5)

        # Top Accent Line
        accent_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Inches(0.06))
        accent_line.fill.solid()
        accent_line.fill.fore_color.rgb = accent_color
        accent_line.line.fill.background()

        # Text Frame
        tx_box = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.15), width - Inches(0.5), height - Inches(0.3))
        tf = tx_box.text_frame
        tf.word_wrap = True

        # Card Title
        p_title = tf.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(16)
        p_title.font.bold = True
        p_title.font.color.rgb = accent_color
        p_title.space_after = Pt(10)

        # Bullet points
        for pt in points:
            p = tf.add_paragraph()
            p.text = f"• {pt}"
            p.font.size = Pt(12.5)
            p.font.color.rgb = TEXT_WHITE
            p.space_after = Pt(6)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 1: Title Slide
    # ════════════════════════════════════════════════════════════════════════
    slide1 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide1)

    # Title Card container
    t_shape = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.2), Inches(10.33), Inches(5.1))
    t_shape.fill.solid()
    t_shape.fill.fore_color.rgb = CARD_BG
    t_shape.line.color.rgb = ACCENT_RED
    t_shape.line.width = Pt(2)

    # Badge
    badge_box = slide1.shapes.add_textbox(Inches(1.8), Inches(1.6), Inches(9.7), Inches(0.4))
    b_p = badge_box.text_frame.paragraphs[0]
    b_p.text = "🛡️ NEXT-GEN PERIMETER DEFENSE & COMPUTER VISION"
    b_p.font.size = Pt(12)
    b_p.font.bold = True
    b_p.font.color.rgb = ACCENT_RED

    # Main Title
    title_box = slide1.shapes.add_textbox(Inches(1.8), Inches(2.2), Inches(9.7), Inches(1.2))
    p1 = title_box.text_frame.paragraphs[0]
    p1.text = "BorderVision AI"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE

    # Subtitle
    sub_box = slide1.shapes.add_textbox(Inches(1.8), Inches(3.4), Inches(9.7), Inches(1.0))
    p2 = sub_box.text_frame.paragraphs[0]
    p2.text = "AI-Powered Border Surveillance & Real-Time Video Analytics Platform Tailored for Legacy CCTV Infrastructure"
    p2.font.size = Pt(18)
    p2.font.color.rgb = TEXT_CYAN

    # Footer Metadata
    meta_box = slide1.shapes.add_textbox(Inches(1.8), Inches(4.8), Inches(9.7), Inches(1.0))
    tf_m = meta_box.text_frame
    pm1 = tf_m.paragraphs[0]
    pm1.text = "Tech Stack: YOLOv8 | ByteTrack | FastAPI WebSockets | Next.js 14 | Leaflet GIS | OpenCV"
    pm1.font.size = Pt(12)
    pm1.font.color.rgb = TEXT_MUTED

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 2: Industry Problem & Challenge
    # ════════════════════════════════════════════════════════════════════════
    slide2 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide2)
    add_header(slide2, "The Challenge: Gaps in Perimeter Security", "Problem Statement")

    add_card(slide2, Inches(0.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "1. Legacy Infrastructure",
             [
                 "Existing CCTV cameras lack built-in intelligence.",
                 "High upgrade costs to replace thousands of deployed analog and IP cameras.",
                 "Poor image quality in low-light, fog, and night-vision conditions."
             ], ACCENT_RED)

    add_card(slide2, Inches(4.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "2. False Alarms & Fatigue",
             [
                 "Traditional motion sensors trigger on wind, rain, trees, and wildlife.",
                 "Security operators suffer from alarm fatigue and miss critical breaches.",
                 "Inability to filter human threats from harmless animal movement."
             ], ACCENT_RED)

    add_card(slide2, Inches(8.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "3. Lack of Geospatial Context",
             [
                 "Video feeds operate in silos without live GIS mapping.",
                 "Operators struggle to locate exactly where an intrusion is happening on a map.",
                 "Slow response time from breach detection to dispatch."
             ], ACCENT_RED)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 3: The Solution (BorderVision AI)
    # ════════════════════════════════════════════════════════════════════════
    slide3 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide3)
    add_header(slide3, "The Solution: Automated AI Video Analytics", "System Overview")

    add_card(slide3, Inches(0.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "AI Threat Classification",
             [
                 "Real-time YOLOv8 object detection categorizes targets into Human, Vehicle, and Wildlife.",
                 "Suppresses false alarms automatically by filtering non-threatening wildlife movement.",
                 "Persistent ByteTrack multi-target tracking across frames."
             ], ACCENT_GREEN)

    add_card(slide3, Inches(4.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Virtual Geofencing & Tripwires",
             [
                 "Interactive HTML5 canvas allows operators to draw custom Red Zones and Tripwires.",
                 "Mathematical cross-product CCW and Ray-Casting point-in-polygon algorithms.",
                 "Instant alerts triggered only upon true boundary crossings."
             ], ACCENT_BLUE)

    add_card(slide3, Inches(8.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Tactical GIS Situational Awareness",
             [
                 "Live Leaflet map with high-res Satellite Imagery and Dark Tactical vector modes.",
                 "Dynamic Field-of-View (FOV) cones that pulse red during active security breaches.",
                 "One-click GPS location detection for outpost cameras."
             ], ACCENT_CYAN)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 4: Full-Stack Architecture
    # ════════════════════════════════════════════════════════════════════════
    slide4 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide4)
    add_header(slide4, "Modular System Architecture", "Technical Design")

    add_card(slide4, Inches(0.8), Inches(1.7), Inches(5.6), Inches(2.4),
             "Frontend (Next.js 14 + Tailwind CSS)",
             [
                 "Next.js App Router with TypeScript & Tailwind CSS.",
                 "HTML5 Canvas Overlay for real-time polygon & tripwire drawing.",
                 "React-Leaflet GIS Map with high-res Satellite & Tactical Dark layers."
             ], ACCENT_CYAN)

    add_card(slide4, Inches(6.8), Inches(1.7), Inches(5.6), Inches(2.4),
             "Backend (Python FastAPI + WebSockets)",
             [
                 "Asynchronous FastAPI server with binary & text WebSocket channels.",
                 "High-speed JPEG frame streaming + real-time incident broadcast.",
                 "SQLite / PostgreSQL with async SQLAlchemy ORM persistence."
             ], ACCENT_BLUE)

    add_card(slide4, Inches(0.8), Inches(4.4), Inches(11.6), Inches(2.4),
             "Core Vision Pipeline (Ultralytics YOLOv8 + ByteTrack + OpenCV)",
             [
                 "Stream Ingestion: Supports RTSP IP cameras, USB/Laptop webcams, MP4 video files, or Synthetic simulator.",
                 "Low-Light CLAHE: Contrast Limited Adaptive Histogram Equalization filter toggle for night feeds.",
                 "Inference Engine: YOLOv8n with optimized imgsz=384 for ~15ms CPU inference and 25-30 FPS throughput."
             ], ACCENT_GREEN)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 5: Vision Pipeline & Geometry Algorithms
    # ════════════════════════════════════════════════════════════════════════
    slide5 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide5)
    add_header(slide5, "Computer Vision & Mathematical Engine", "Core Algorithms")

    add_card(slide5, Inches(0.8), Inches(1.7), Inches(5.6), Inches(5.0),
             "⚡ Tripwire Line-Crossing (CCW Algorithm)",
             [
                 "Line segment intersection is computed via 2D vector cross-products.",
                 "Tests orientation between previous object centroid (A, B) and drawn tripwire (C, D):",
                 "  CCW(A, B, C) != CCW(A, B, D) and CCW(C, D, A) != CCW(C, D, B)",
                 "Zero false triggers from stationary targets near the line.",
                 "Calculates exact direction of movement across the perimeter."
             ], ACCENT_RED)

    add_card(slide5, Inches(6.8), Inches(1.7), Inches(5.6), Inches(5.0),
             "🔷 Red Zone Polygon (Ray-Casting Algorithm)",
             [
                 "Tests whether target centroid lies inside a multi-point polygon zone.",
                 "Casts a horizontal ray from point (px, py) to infinity and counts edge intersections.",
                 "Odd number of intersections = Target is INSIDE zone (Breach).",
                 "Even number of intersections = Target is OUTSIDE zone.",
                 "Supports complex convex and concave multi-vertex security perimeters."
             ], ACCENT_BLUE)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 6: Tactical Map & Situational Awareness
    # ════════════════════════════════════════════════════════════════════════
    slide6 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide6)
    add_header(slide6, "Tactical GIS Map & Outpost Monitoring", "Situational Awareness")

    add_card(slide6, Inches(0.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "High-Res Satellite Mapping",
             [
                 "Integrated Esri World Imagery providing crystal-clear satellite terrain view.",
                 "Zero API key requirements and no watermarks.",
                 "One-click toggle between Satellite & Tactical Dark vector modes."
             ], ACCENT_CYAN)

    add_card(slide6, Inches(4.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Dynamic FOV Cones",
             [
                 "Calculates exact visual cone geometry based on camera bearing and field-of-view angle.",
                 "Normal state: Blue translucent radar cone.",
                 "Breach state: Cone pulses bright RED with animated perimeter rings."
             ], ACCENT_RED)

    add_card(slide6, Inches(8.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "One-Click Station GPS",
             [
                 "Built-in browser GPS & IP geolocation detection.",
                 "Instantly positions camera posts to actual real-world coordinates.",
                 "Synchronizes location with backend database in real time."
             ], ACCENT_GREEN)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 7: Incident Response & Forensics
    # ════════════════════════════════════════════════════════════════════════
    slide7 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide7)
    add_header(slide7, "Incident Response & Audit Workflows", "Operations & Compliance")

    add_card(slide7, Inches(0.8), Inches(1.7), Inches(5.6), Inches(2.4),
             "🚨 Real-Time Incident Ticker & Sirens",
             [
                 "WebSocket live event feed categorizing breaches as Critical, High, or Warning.",
                 "WebAudio API generates dynamic audio siren alarm on Critical intrusions.",
                 "Built-in operator 'Acknowledge' workflow to log active response."
             ], ACCENT_RED)

    add_card(slide7, Inches(6.8), Inches(1.7), Inches(5.6), Inches(2.4),
             "📸 Forensic Snapshot Viewer",
             [
                 "Automatic snapshot capture of the exact frame at the moment of breach.",
                 "High-resolution image viewer with embedded timestamp, track ID, and zone data.",
                 "Provides indisputable evidentiary visual records for investigations."
             ], ACCENT_BLUE)

    add_card(slide7, Inches(0.8), Inches(4.4), Inches(11.6), Inches(2.4),
             "📊 Searchable Event Audit Logs & CSV Export",
             [
                 "Comprehensive database query interface with filters for date range, camera ID, severity, and acknowledgment status.",
                 "One-click CSV Export functionality for legal reporting, shift handovers, and compliance audits."
             ], ACCENT_GREEN)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 8: Performance Benchmarks & Edge Readiness
    # ════════════════════════════════════════════════════════════════════════
    slide8 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide8)
    add_header(slide8, "Performance Benchmarks & Optimizations", "System Metrics")

    add_card(slide8, Inches(0.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Inference Speed",
             [
                 "Resolution: imgsz=384",
                 "CPU Latency: ~12-18ms / frame",
                 "Throughput: 25-30 FPS",
                 "YOLOv8-nano model footprint: ~6.2 MB",
                 "Zero GPU dependency required."
             ], ACCENT_GREEN)

    add_card(slide8, Inches(4.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Tracking Accuracy",
             [
                 "Multi-Target Tracking: ByteTrack",
                 "Matching Algorithm: Hungarian with C++ lap solver",
                 "False Alarm Suppression: >95% reduction via class filtering",
                 "Accurate Unique Target counter."
             ], ACCENT_CYAN)

    add_card(slide8, Inches(8.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Network & Streaming",
             [
                 "Protocol: Full-duplex WebSockets",
                 "Compression: Turbo-JPEG Quality 75",
                 "Bandwidth: ~300-500 KB/s per feed",
                 "Ultra-low latency: <100ms glass-to-glass delay."
             ], ACCENT_BLUE)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 9: Deployment & Scalability Roadmap
    # ════════════════════════════════════════════════════════════════════════
    slide9 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide9)
    add_header(slide9, "Deployment & Future Roadmap", "Scale & Integration")

    add_card(slide9, Inches(0.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Phase 1: Present (Delivered)",
             [
                 "Full-stack platform operational.",
                 "Real-time webcam & CCTV simulator.",
                 "Interactive Canvas geofencing & tripwires.",
                 "Tactical GIS Leaflet map with FOV cones.",
                 "One-click Windows & Linux launcher scripts."
             ], ACCENT_GREEN)

    add_card(slide9, Inches(4.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Phase 2: Scale & Edge",
             [
                 "Docker containerization for multi-camera edge nodes (NVIDIA Jetson / Intel NUC).",
                 "PostgreSQL + Redis pub/sub cluster for 50+ concurrent CCTV streams.",
                 "ONVIF Auto-Discovery for automatic IP camera detection on local subnets."
             ], ACCENT_BLUE)

    add_card(slide9, Inches(8.8), Inches(1.7), Inches(3.6), Inches(5.0),
             "Phase 3: Advanced AI",
             [
                 "Facial recognition & ALPR (License Plate Recognition) integration.",
                 "Thermal / Infrared drone video stream integration.",
                 "PTZ (Pan-Tilt-Zoom) auto-tracking of detected intruders."
             ], ACCENT_CYAN)

    # ════════════════════════════════════════════════════════════════════════
    # SLIDE 10: Summary & Conclusion
    # ════════════════════════════════════════════════════════════════════════
    slide10 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide10)

    # Conclusion Container
    c_shape = slide10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.2), Inches(10.33), Inches(5.1))
    c_shape.fill.solid()
    c_shape.fill.fore_color.rgb = CARD_BG
    c_shape.line.color.rgb = ACCENT_GREEN
    c_shape.line.width = Pt(2)

    # Content
    c_box = slide10.shapes.add_textbox(Inches(2.0), Inches(1.6), Inches(9.33), Inches(4.3))
    tf_c = c_box.text_frame
    tf_c.word_wrap = True

    p_c1 = tf_c.paragraphs[0]
    p_c1.text = "Summary: Why BorderVision AI?"
    p_c1.font.size = Pt(32)
    p_c1.font.bold = True
    p_c1.font.color.rgb = TEXT_WHITE
    p_c1.space_after = Pt(20)

    points = [
        "Modernizes Legacy CCTV: Upgrades existing surveillance cameras without costly hardware replacements.",
        "Zero False Alarms: Human vs. Vehicle vs. Wildlife separation eliminates operator alarm fatigue.",
        "High-Precision Geofencing: Interactive canvas with mathematical CCW and Point-in-Polygon validation.",
        "Complete Situational Awareness: Tactical GIS map with live pulsing Field-of-View cones.",
        "Production-Ready & High Performance: Runs on standard CPU with ~15ms inference latency and <100ms latency."
    ]

    for pt in points:
        p = tf_c.add_paragraph()
        p.text = f"✔ {pt}"
        p.font.size = Pt(15)
        p.font.color.rgb = TEXT_CYAN
        p.space_after = Pt(12)

    output_path = "BorderVision_AI_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    create_presentation()
