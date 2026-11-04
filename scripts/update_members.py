#!/usr/bin/env python3
"""成員清單 members.json 的 YouTube 頻道頭像 → members_auto.json

members.json 每個成員的 channel 欄位可以填：
  @handle、https://www.youtube.com/@handle、https://www.youtube.com/channel/UCxxxx…、或直接 UCxxxx…（頻道 ID）
用 YouTube Data API（channels.list）查出頻道的頭像網址、頻道名稱，寫進 members_auto.json（網站只讀這個靜態檔）。
channel 留空的成員會略過（網站上就不顯示頭像）。

需要環境變數 YT_API_KEY（repo Settings → Secrets and variables → Actions）。沒有金鑰時什麼都不做（保留現有的 members_auto.json）。
某個頻道這次查不到（API 暫時錯誤、頻道改名…）時，保留上一次查到的資料，不會把頭像弄不見。
每個頻道 1 單位額度（每天免費 10,000）。
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "members.json")
OUT = os.path.join(ROOT, "members_auto.json")
API = "https://www.googleapis.com/youtube/v3/channels"


def parse_channel(v):
    """回傳 ('id', 'UC…') 或 ('handle', '@name')，看不懂就 None"""
    v = (v or "").strip()
    if not v:
        return None
    m = re.search(r"youtube\.com/channel/(UC[\w-]{20,})", v)
    if m:
        return ("id", m.group(1))
    m = re.search(r"youtube\.com/(@[^/?#\s]+)", v)
    if m:
        return ("handle", urllib.parse.unquote(m.group(1)))
    if re.fullmatch(r"UC[\w-]{20,}", v):
        return ("id", v)
    if re.fullmatch(r"@[^\s/]+", v):
        return ("handle", v)
    return None


def fetch(params, key):
    q = urllib.parse.urlencode({**params, "part": "snippet", "key": key})
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": "mela-fan-site-members/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def pick_thumb(snippet):
    th = snippet.get("thumbnails") or {}
    for k in ("medium", "high", "default"):  # medium＝240px，網站上最大也只顯示幾十 px，夠用
        if th.get(k, {}).get("url"):
            return th[k]["url"]
    return ""


def main():
    key = os.environ.get("YT_API_KEY", "").strip()
    if not key:
        print("YT_API_KEY 沒設定，略過（保留現有的 members_auto.json）")
        return 0
    with open(SRC, encoding="utf-8") as f:
        members = json.load(f)
    old = {}
    if os.path.exists(OUT):
        try:
            old = json.load(open(OUT, encoding="utf-8")).get("members", {})
        except Exception:
            old = {}

    result = {}
    for m in members if isinstance(members, list) else []:
        name = str(m.get("name", "")).strip()
        if not name:
            continue
        ch = parse_channel(m.get("channel"))
        if not ch:
            if m.get("channel"):
                print(f"[略過] {name}: 看不懂 channel 欄位 {m.get('channel')!r}")
            continue
        try:
            data = fetch({"id": ch[1]} if ch[0] == "id" else {"forHandle": ch[1]}, key)
            items = data.get("items") or []
            if not items:
                raise ValueError("找不到這個頻道")
            it = items[0]
            sn = it.get("snippet", {})
            thumb = pick_thumb(sn)
            if not thumb:
                raise ValueError("沒有頭像")
            result[name] = {
                "channelId": it["id"],
                "title": sn.get("title", ""),
                "avatar": thumb,
                "url": f"https://www.youtube.com/channel/{it['id']}",
            }
            print(f"[ok] {name}: {sn.get('title','')}")
        except (urllib.error.URLError, ValueError, KeyError) as e:
            print(f"[失敗] {name}: {e}")
            if name in old:
                result[name] = old[name]  # 保留上一次的資料

    # 內容沒變就不要動檔案（避免每次都產生 commit）
    prev = None
    if os.path.exists(OUT):
        try:
            prev = json.load(open(OUT, encoding="utf-8")).get("members")
        except Exception:
            prev = None
    if prev == result:
        print("沒有變動")
        return 0
    out = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "members": result}
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"已寫入 {OUT}（{len(result)} 位）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
