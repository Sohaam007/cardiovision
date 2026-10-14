"""
Generate a professional, high-impact 1920x1080 YouTube & Devpost Thumbnail for CardioVision.
Team: Lv. 9
Incorporates real application screenshots, 3D renders, SHAP explainability, and ECG telemetry.
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

def create_thumbnail():
    width = 1920
    height = 1080

    # 1. Base Dark Clinical Gradient Background (#060911 -> #0b1324)
    img = Image.new("RGBA", (width, height), (7, 11, 20, 255))
    draw = ImageDraw.Draw(img)

    # Gradient backdrop
    for y in range(height):
        ratio = y / height
        r = int(7 * (1 - ratio) + 12 * ratio)
        g = int(11 * (1 - ratio) + 20 * ratio)
        b = int(20 * (1 - ratio) + 40 * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # Ambient radial light glows (Cyan glow top-left, Purple glow bottom-right, Crimson heart glow center)
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)

    # Cyan ambient top left
    glow_draw.ellipse([(-200, -200), (800, 600)], fill=(6, 182, 212, 35))
    # Magenta/Purple glow top right
    glow_draw.ellipse([(1200, -100), (2100, 700)], fill=(168, 85, 247, 40))
    # Emerald heart glow center
    glow_draw.ellipse([(700, 200), (1600, 1000)], fill=(16, 185, 129, 30))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img)

    # 2. Add Medical Isometric Grid
    grid_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_layer)
    for x in range(0, width, 40):
        grid_draw.line([(x, 0), (x, height)], fill=(15, 30, 50, 45), width=1)
    for y in range(0, height, 40):
        grid_draw.line([(0, y), (width, y)], fill=(15, 30, 50, 45), width=1)
    img = Image.alpha_composite(img, grid_layer)
    draw = ImageDraw.Draw(img)

    # 3. Load and Paste Screenshots with Perspective Glass Frames
    # (a) Dashboard Overview screenshot (Left-bottom background preview)
    dash_path = "docs/figures/dashboard_overview.png"
    if os.path.exists(dash_path):
        dash_img = Image.open(dash_path).convert("RGBA")
        dash_img = dash_img.resize((860, 538), Image.Resampling.LANCZOS)

        # Border and shadow
        dash_card = Image.new("RGBA", (880, 558), (0, 0, 0, 0))
        card_draw = ImageDraw.Draw(dash_card)
        card_draw.rounded_rectangle([0, 0, 879, 557], radius=18, fill=(13, 20, 36, 230), outline=(56, 189, 248, 120), width=2)
        dash_card.paste(dash_img, (10, 10), dash_img)

        # Subtle tilt or angle
        img.paste(dash_card, (60, 480), dash_card)

    # (b) 3D Blender Photorealistic Heart Render (Dominant center-right)
    blender_path = "docs/figures/blender_render_anterior.png"
    if os.path.exists(blender_path):
        heart_img = Image.open(blender_path).convert("RGBA")
        
        # Remove black background if needed or blend with screen
        heart_w, heart_h = heart_img.size
        heart_resized = heart_img.resize((920, int(920 * heart_h / heart_w)), Image.Resampling.LANCZOS)

        # Create glowing backing circle
        heart_glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        h_glow_draw = ImageDraw.Draw(heart_glow)
        h_glow_draw.ellipse([(980, 120), (1850, 990)], fill=(239, 68, 68, 55)) # Crimson LAD glow
        h_glow_draw.ellipse([(1100, 220), (1750, 870)], fill=(16, 185, 129, 65)) # Emerald LAD/LCX glow
        heart_glow = heart_glow.filter(ImageFilter.GaussianBlur(80))
        img = Image.alpha_composite(img, heart_glow)

        # Paste heart on top
        img.paste(heart_resized, (960, 140), heart_resized)

    # (c) SHAP Waterfall / Beeswarm Card (Bottom right accent)
    shap_path = "docs/figures/shap_beeswarm_cad.png"
    if os.path.exists(shap_path):
        shap_img = Image.open(shap_path).convert("RGBA")
        shap_img = shap_img.resize((480, 373), Image.Resampling.LANCZOS)
        shap_card = Image.new("RGBA", (500, 393), (0, 0, 0, 0))
        s_card_draw = ImageDraw.Draw(shap_card)
        s_card_draw.rounded_rectangle([0, 0, 499, 392], radius=16, fill=(10, 16, 30, 235), outline=(168, 85, 247, 140), width=2)
        shap_card.paste(shap_img, (10, 10), shap_img)
        img.paste(shap_card, (1360, 620), shap_card)

    draw = ImageDraw.Draw(img)

    # 4. Draw Flowing Live Emerald ECG Telemetry Wave across the middle-bottom
    ecg_y = 780
    ecg_points = [
        (0, ecg_y), (100, ecg_y),
        (130, ecg_y - 12), (160, ecg_y),
        (200, ecg_y), (215, ecg_y + 8),
        (240, ecg_y - 75), (265, ecg_y + 45), (280, ecg_y),
        (330, ecg_y - 25), (380, ecg_y),
        (480, ecg_y),
        (510, ecg_y - 12), (540, ecg_y),
        (580, ecg_y), (595, ecg_y + 8),
        (620, ecg_y - 75), (645, ecg_y + 45), (660, ecg_y),
        (710, ecg_y - 25), (760, ecg_y),
        (900, ecg_y), (1100, ecg_y),
        (1130, ecg_y - 12), (1160, ecg_y),
        (1200, ecg_y), (1215, ecg_y + 8),
        (1240, ecg_y - 75), (1265, ecg_y + 45), (1280, ecg_y),
        (1330, ecg_y - 25), (1380, ecg_y),
        (1920, ecg_y)
    ]
    # Draw glowing ECG trail
    for offset_width, alpha in [(6, 40), (4, 90), (2, 255)]:
        draw.line(ecg_points, fill=(16, 185, 129, alpha), width=offset_width)

    # 5. Overlay Bold Typography & Team Branding
    # Try system fonts, fallback to default
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 88)
        font_sub = ImageFont.truetype("arialbd.ttf", 36)
        font_team = ImageFont.truetype("arialbd.ttf", 46)
        font_badge = ImageFont.truetype("arialbd.ttf", 26)
        font_stat = ImageFont.truetype("arialbd.ttf", 28)
    except:
        font_title = font_sub = font_team = font_badge = font_stat = ImageFont.load_default()

    # Top Track Badge
    badge_x, badge_y = 60, 60
    draw.rounded_rectangle([badge_x, badge_y, badge_x + 640, badge_y + 54], radius=27, fill=(15, 23, 42, 220), outline=(56, 189, 248, 180), width=2)
    draw.text((badge_x + 24, badge_y + 12), "MULTIMODAL AI HACKATHON 2026 • TRACK A", fill=(56, 189, 248), font=font_badge)

    # TEAM Lv. 9 High-Impact Golden/Neon Pill Badge
    team_x, team_y = 730, 60
    draw.rounded_rectangle([team_x, team_y, team_x + 360, team_y + 54], radius=27, fill=(245, 158, 11, 230), outline=(253, 230, 138, 255), width=2)
    draw.text((team_x + 28, team_y + 11), "★ TEAM: Lv. 9 ★", fill=(15, 23, 42), font=font_badge)

    # Nano-Banana Core Badge
    nb_x, nb_y = 1120, 60
    draw.rounded_rectangle([nb_x, nb_y, nb_x + 360, nb_y + 54], radius=27, fill=(168, 85, 247, 220), outline=(216, 180, 254, 255), width=2)
    draw.text((nb_x + 24, nb_y + 11), "⚡ NANO-BANANA CORE", fill=(255, 255, 255), font=font_badge)

    # Main Project Title: CARDIOVISION
    title_x, title_y = 60, 140
    # Shadow
    draw.text((title_x + 5, title_y + 5), "CARDIOVISION", fill=(0, 0, 0, 200), font=font_title)
    draw.text((title_x, title_y), "CARDIOVISION", fill=(255, 255, 255), font=font_title)

    # Subtitle: 3D Anatomical Risk & Explainable AI
    sub_y = title_y + 102
    draw.text((title_x, sub_y), "3D CARDIAC DIGITAL TWIN & CLINICAL AI", fill=(56, 189, 248), font=font_sub)

    # Value Proposition Pills / Badges
    pills = [
        ("0.9026 ROC-AUC", (16, 185, 129)),
        ("LAD / LCX / RCA Stenosis", (239, 68, 68)),
        ("Sub-25ms TreeSHAP", (168, 85, 247)),
        ("Zero-Leakage Guard", (56, 189, 248))
    ]
    pill_start_x = 60
    pill_y = sub_y + 60
    for text, color in pills:
        text_bbox = draw.textbbox((0, 0), text, font=font_stat)
        text_w = text_bbox[2] - text_bbox[0]
        pill_w = text_w + 32
        draw.rounded_rectangle([pill_start_x, pill_y, pill_start_x + pill_w, pill_y + 44], radius=12, fill=(15, 23, 42, 230), outline=color, width=2)
        draw.text((pill_start_x + 16, pill_y + 7), text, fill=color, font=font_stat)
        pill_start_x += pill_w + 16

    # Floating Call-to-Action Bottom Banner
    cta_x, cta_y = 60, height - 90
    draw.rounded_rectangle([cta_x, cta_y, cta_x + 580, cta_y + 54], radius=14, fill=(2, 132, 199, 230), outline=(125, 211, 252, 255), width=2)
    draw.text((cta_x + 24, cta_y + 12), "▶ WATCH FULL 5-MIN SYSTEM DEMO", fill=(255, 255, 255), font=font_badge)

    # Save outputs
    out_dir = "docs/media"
    os.makedirs(out_dir, exist_ok=True)
    out_png = os.path.join(out_dir, "thumbnail.png")
    out_jpg = os.path.join(out_dir, "thumbnail.jpg")
    img.save(out_png, "PNG")
    img.convert("RGB").save(out_jpg, "JPEG", quality=95)
    print(f"Thumbnail generated successfully: {out_png} ({width}x{height})")

if __name__ == "__main__":
    create_thumbnail()
