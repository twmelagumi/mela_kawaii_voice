"""commit 前執行：更新頁尾的「最後更新」時間，並把所有 html 引用 assets 的 ?v= 版本號換成現在時間（讓瀏覽器重新下載）。

用法（在 repo 根目錄）：
    python scripts/bump_version.py            # 用現在的台灣時間
    python scripts/bump_version.py --check    # 只檢查各頁 ?v= 是否一致，不改檔案

只改歌單 songs.json 這類資料檔時不用執行。
"""
import re, sys, glob, os
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
V_RE = re.compile(r'(assets/[\w.\-]+\.(?:css|js))\?v=(\d+)')
FILES = sorted(glob.glob("*.html")) + ["assets/share.js"]  # share.js 裡有 qrcode.min.js 的 ?v=

def versions():
    found = {}
    for f in FILES:
        for m in V_RE.finditer(open(f, encoding="utf-8").read()):
            found.setdefault(m.group(2), set()).add(f)
    return found

if "--check" in sys.argv:
    v = versions()
    print("?v= 版本號：", {k: sorted(x) for k, x in v.items()})
    sys.exit(0 if len(v) == 1 else 1)

now = datetime.now(timezone(timedelta(hours=8)))
stamp, ver = now.strftime("%Y-%m-%d %H:%M"), now.strftime("%Y%m%d%H%M")
for f in FILES:
    s = open(f, encoding="utf-8").read()
    s2 = V_RE.sub(lambda m: f"{m.group(1)}?v={ver}", s)
    if s2 != s:
        open(f, "w", encoding="utf-8", newline="").write(s2)
cj = "assets/common.js"
s = open(cj, encoding="utf-8").read()
s2, n = re.subn(r'const LAST_UPDATED = "[^"]*";', f'const LAST_UPDATED = "{stamp}";', s)
if n != 1:
    sys.exit("找不到 common.js 的 LAST_UPDATED")
open(cj, "w", encoding="utf-8", newline="").write(s2)
print(f"LAST_UPDATED = {stamp}，?v={ver}")
