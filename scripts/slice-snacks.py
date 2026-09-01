from pathlib import Path
import numpy as np
from PIL import Image
from collections import deque

src = Path(r"C:\Users\user\.cursor\projects\c-Users-user-Documents-Projects-The-Goods\assets\c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_34418dd5c459b3db04343d03a04de27a_images_image-5cf2623a-3e05-48ff-9d6a-714554212cca.png")
out_dir = Path(r"C:\Users\user\Documents\Projects\The_Goods\public\snacks")
out_dir.mkdir(parents=True, exist_ok=True)
for old in out_dir.glob("*.png"):
    old.unlink()

im = Image.open(src).convert("RGB")
arr = np.array(im)
h, w = arr.shape[:2]
row_bounds = [50, 184, 320, 444, 575, h]
col_bounds = [0, 100, 200, 300, 400, w]
names = [
    "martys-cracklin","cheese-ring","chikn-skin","chiz-curls","tempura",
    "boy-bawang","nagaraya","ding-dong","tortillos","bread-pan",
    "roller-coaster","mr-chips","potato-chips","vcut","crispy-patata",
    "nova","clover-chips","piattos","kirei","potato-fries",
    "cracklings","knick-knacks","sponge-crunch","pillows","prawn-crackers",
]

def likely_bg(px):
    r, g, b = int(px[0]), int(px[1]), int(px[2])
    mx, mn = max(r,g,b), min(r,g,b)
    return (r > 226 and g > 226 and b > 226 and mn > 205) or (mx > 236 and mx-mn < 16)

def flood_alpha(crop):
    hh, ww = crop.shape[:2]
    vis = np.zeros((hh, ww), dtype=bool)
    q = deque()
    def push(y,x):
        if 0 <= y < hh and 0 <= x < ww and not vis[y,x] and likely_bg(crop[y,x]):
            vis[y,x] = True
            q.append((y,x))
    for x in range(ww):
        push(0,x); push(hh-1,x)
    for y in range(hh):
        push(y,0); push(y,ww-1)
    while q:
        y,x = q.popleft()
        for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            push(ny,nx)
    alpha = np.where(vis, 0, 255).astype(np.uint8)
    return alpha

index = 0
for r in range(5):
    for c in range(5):
        y0, y1 = row_bounds[r], row_bounds[r+1]
        x0, x1 = col_bounds[c], col_bounds[c+1]
        cell = arr[y0:y1, x0:x1]
        alpha_full = flood_alpha(cell)
        ys, xs = np.where(alpha_full > 0)
        if len(ys) < 200:
            print("SKIP", r, c)
            continue
        pad = 2
        cy0 = max(0, int(ys.min()) - pad)
        cy1 = min(cell.shape[0], int(ys.max()) + 1 + pad)
        cx0 = max(0, int(xs.min()) - pad)
        cx1 = min(cell.shape[1], int(xs.max()) + 1 + pad)
        crop = cell[cy0:cy1, cx0:cx1]
        alpha = alpha_full[cy0:cy1, cx0:cx1]
        # keep padded border transparent
        rgba = np.dstack([crop, alpha])
        img = Image.fromarray(rgba, "RGBA")
        name = names[index]
        img.save(out_dir / f"{name}.png")
        print(f"{index+1:2d} {name:16s} {img.size} opaque={(alpha>10).mean():.2f}")
        index += 1
print("wrote", index)
