"""commit 前執行：更新頁尾的「最後更新」時間，並把引用 assets 的 ?v= 版本號對齊各檔案目前的內容。

用法（在 repo 根目錄）：
    python scripts/bump_version.py            # 更新 updated.json 的時間＋對齊 ?v=
    python scripts/bump_version.py --no-time  # 只對齊 ?v=，不改「最後更新」時間
    python scripts/bump_version.py --check    # 只檢查 ?v= 有沒有對齊，不改檔案（有沒對齊的會回傳錯誤碼 1）

版本號＝那個檔案內容的雜湊（前 8 碼）。只有內容真的改了的 assets 檔，引用它的頁面才會跟著換版本號，
所以只改某一頁的頁內程式時，commit 只會動到那一頁和 updated.json。
「最後更新」時間存在 updated.json（頁尾載入時讀取），不寫在 common.js 裡，避免每次都要換 common.js 的版本號。
只改歌單 songs.json 這類資料檔時不用執行。
"""
import re, sys, glob, os, json, hashlib
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_RE = re.compile(r'(assets/[\w.\-]+\.(?:css|js))\?v=([0-9A-Za-z]+)')

def _files():
    # 會引用 assets 的檔案：各頁 html，以及會再載入其他 assets 的 js（例如 share.js 載入 qrcode.min.js）
    return sorted(glob.glob(os.path.join(ROOT, "*.html"))) + sorted(
        f for f in glob.glob(os.path.join(ROOT, "assets", "*.js")) if not f.endswith(".min.js"))

def asset_hash(rel):
    with open(os.path.join(ROOT, rel), "rb") as fh:
        return hashlib.sha1(fh.read().replace(b"\r\n", b"\n")).hexdigest()[:8]

def sync_refs(check=False):
    """把所有 ?v= 換成被引用檔案目前內容的雜湊；回傳改到（或 check 時：沒對齊）的檔案清單"""
    touched = []
    for _ in range(5):  # js 引用 js 時，被引用的先對齊、引用的雜湊才會穩定；最多跑幾輪直到沒有變化
        changed = False
        for f in _files():
            s = open(f, encoding="utf-8", newline="").read()
            def fix(m):
                p = os.path.join(ROOT, m.group(1))
                return f"{m.group(1)}?v={asset_hash(m.group(1))}" if os.path.exists(p) else m.group(0)
            s2 = REF_RE.sub(fix, s)
            if s2 != s:
                rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
                if check:
                    touched.append(rel); continue
                open(f, "w", encoding="utf-8", newline="").write(s2)
                if rel not in touched: touched.append(rel)
                changed = True
        if check or not changed:
            break
    return touched

def write_updated():
    stamp = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M")  # 台灣時間
    with open(os.path.join(ROOT, "updated.json"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps({"updated": stamp}, ensure_ascii=False) + "\n")
    return stamp

if __name__ == "__main__":
    if "--check" in sys.argv:
        bad = sync_refs(check=True)
        print("?v= 都已對齊" if not bad else "這些檔案的 ?v= 沒對齊：" + "、".join(bad))
        sys.exit(1 if bad else 0)
    touched = sync_refs()
    if "--no-time" not in sys.argv:
        print("最後更新 =", write_updated())
    print("?v= 有更新的檔案：" + ("、".join(touched) if touched else "（沒有）"))
