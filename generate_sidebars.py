import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import arabic_reshaper
from bidi.algorithm import get_display

def create_sidebar(mode="installer"):
    W, H = 164, 314
    img = Image.new("RGB", (W, H), (11, 15, 25))
    draw = ImageDraw.Draw(img)

    # Gradient background
    if mode == "installer":
        top_c = (14, 23, 42)    # dark slate blue
        bot_c = (6, 9, 16)      # deep dark
        accent_c = (245, 158, 11) # Gold
        sub_c = (56, 189, 248)    # Cyan
    else:
        top_c = (28, 17, 24)    # dark wine/slate
        bot_c = (10, 8, 14)     # deep dark
        accent_c = (251, 146, 60) # Warm amber
        sub_c = (248, 113, 113)   # Soft red

    for y in range(H):
        t = y / (H - 1)
        r = int(top_c[0] * (1 - t) + bot_c[0] * t)
        g = int(top_c[1] * (1 - t) + bot_c[1] * t)
        b = int(top_c[2] * (1 - t) + bot_c[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Subtle grid / decorative lines
    grid_overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grid_overlay)
    for gy in range(0, H, 20):
        gdraw.line([(0, gy), (W, gy)], fill=(255, 255, 255, 6))
    for gx in range(0, W, 20):
        gdraw.line([(gx, 0), (gx, H)], fill=(255, 255, 255, 6))
    img.paste(Image.alpha_composite(img.convert("RGBA"), grid_overlay).convert("RGB"))
    draw = ImageDraw.Draw(img)

    # Load gorilla icon
    gorilla_path = "assets/icon.png"
    if not os.path.exists(gorilla_path):
        gorilla_path = "assets/gorilla.png"
    
    gorilla = Image.open(gorilla_path).convert("RGBA")
    
    # Glow circle behind gorilla
    glow_size = 114
    glow_img = Image.new("RGBA", (glow_size, glow_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_color = (245, 158, 11, 45) if mode == "installer" else (248, 113, 113, 40)
    glow_draw.ellipse([0, 0, glow_size - 1, glow_size - 1], fill=glow_color)
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(10))
    
    gx = (W - glow_size) // 2
    gy = 22
    img.paste(glow_img, (gx, gy), glow_img)

    # Circle background for gorilla
    circ_size = 98
    circ_x = (W - circ_size) // 2
    circ_y = 30
    circ_bg = Image.new("RGBA", (circ_size, circ_size), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(circ_bg)
    cdraw.ellipse([0, 0, circ_size - 1, circ_size - 1], fill=(15, 23, 42, 230), outline=accent_c, width=2)
    img.paste(circ_bg, (circ_x, circ_y), circ_bg)

    # Resize gorilla face to fit inside
    gw = 82
    gh = int(gorilla.height * (gw / gorilla.width))
    if gh > 82:
        gh = 82
        gw = int(gorilla.width * (gh / gorilla.height))
    gorilla_resized = gorilla.resize((gw, gh), Image.LANCZOS)
    img.paste(gorilla_resized, (circ_x + (circ_size - gw) // 2, circ_y + (circ_size - gh) // 2), gorilla_resized)

    # Load fonts
    font_bold_path = "C:/Windows/Fonts/arialbd.ttf"
    font_reg_path = "C:/Windows/Fonts/tahoma.ttf"
    font_bold_ar_path = "C:/Windows/Fonts/tahomabd.ttf"
    if not os.path.exists(font_bold_ar_path):
        font_bold_ar_path = "C:/Windows/Fonts/segoeuib.ttf"

    font_title = ImageFont.truetype(font_bold_path, 17)
    font_sub = ImageFont.truetype(font_bold_path, 9)
    font_ar = ImageFont.truetype(font_bold_ar_path, 13)
    font_foot = ImageFont.truetype(font_reg_path, 9)

    # Title: M3RGEEN
    title_text = "M3RGEEN"
    tb = draw.textbbox((0, 0), title_text, font=font_title)
    tx = (W - (tb[2] - tb[0])) // 2
    draw.text((tx, 142), title_text, fill=accent_c, font=font_title)

    # Sub: AION 2 COMPANION
    sub_text = "AION 2 COMPANION"
    sb = draw.textbbox((0, 0), sub_text, font=font_sub)
    sx = (W - (sb[2] - sb[0])) // 2
    draw.text((sx, 166), sub_text, fill=(148, 163, 184), font=font_sub)

    # Divider line
    div_y = 186
    draw.line([(32, div_y), (W - 32, div_y)], fill=(51, 65, 85), width=1)
    draw.line([(55, div_y), (W - 55, div_y)], fill=accent_c, width=1)

    # Arabic Badge / Text
    if mode == "installer":
        ar_raw = "مجتمع المعرقين"
        ar_sub_raw = "أهلاً بك يا بطل"
    else:
        ar_raw = "نأسف لرحيلك"
        ar_sub_raw = "نتمنى عودتك قريباً"

    reshaped_ar = get_display(arabic_reshaper.reshape(ar_raw))
    ab = draw.textbbox((0, 0), reshaped_ar, font=font_ar)
    ax = (W - (ab[2] - ab[0])) // 2
    draw.text((ax, 202), reshaped_ar, fill=(241, 245, 249), font=font_ar)

    reshaped_sub = get_display(arabic_reshaper.reshape(ar_sub_raw))
    asb = draw.textbbox((0, 0), reshaped_sub, font=font_foot)
    asx = (W - (asb[2] - asb[0])) // 2
    draw.text((asx, 226), reshaped_sub, fill=(148, 163, 184), font=font_foot)

    # Bottom badge / tag
    badge_y = 275
    badge_w = 120
    bx = (W - badge_w) // 2
    draw.rounded_rectangle([bx, badge_y, bx + badge_w, badge_y + 22], radius=4, fill=(15, 23, 42), outline=(30, 41, 59), width=1)
    
    foot_tag = "TACTICAL RADAR" if mode == "installer" else "M3RGEEN GUILD"
    fb = draw.textbbox((0, 0), foot_tag, font=font_sub)
    fx = (W - (fb[2] - fb[0])) // 2
    draw.text((fx, badge_y + 5), foot_tag, fill=sub_c, font=font_sub)

    return img

if __name__ == "__main__":
    inst = create_sidebar("installer")
    inst.save("assets/installer-sidebar.bmp", "BMP")
    inst.save("assets/installer-sidebar.png", "PNG")
    print("Installer sidebar saved:", os.path.getsize("assets/installer-sidebar.bmp"), "bytes")

    uninst = create_sidebar("uninstaller")
    uninst.save("assets/uninstaller-sidebar.bmp", "BMP")
    uninst.save("assets/uninstaller-sidebar.png", "PNG")
    print("Uninstaller sidebar saved:", os.path.getsize("assets/uninstaller-sidebar.bmp"), "bytes")
