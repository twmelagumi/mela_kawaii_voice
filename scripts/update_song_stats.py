#!/usr/bin/env python3
"""從 YouTube 抓歌單裡「原創曲（original）」和「Cover（cover）」影片的播放次數，寫進 song_stats.json。

由 GitHub Actions（.github/workflows/update-song-stats.yml）每兩天執行一次，歌單頁讀這個檔顯示播放次數。
需要 YouTube Data API v3 金鑰：環境變數 YT_API_KEY（跟編年史共用同一個 GitHub Secret）。本機測試：
    YT_API_KEY=… python scripts/update_song_stats.py            # 更新 song_stats.json
    YT_API_KEY=… python scripts/update_song_stats.py --dry-run  # 只印出結果，不寫檔

只用 Python 內建模組。videos.list 一次最多查 50 支影片、只花 1 個配額單位（免費額度每天 10,000）。
播放次數是整支影片的數字；歌回片段（clip）是長直播的一段，所以不查。
輸出格式：{"updated": "2026-10-03T01:00:00Z", "views": {"影片ID": 123456, …}}
"""
import argparse
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

CATEGORIES = {"original", "cover"}  # 要顯示播放次數的分類
ROOT = Path(__file__).resolve().parent.parent
SONGS = ROOT / "songs.json"
OUT = ROOT / "song_stats.json"
API = "https://www.googleapis.com/youtube/v3/videos"


def video_id(url):
    """YouTube 網址 → 影片 ID（watch?v=、youtu.be/、/live/、/shorts/、/embed/）"""
    try:
        u = urllib.parse.urlparse(str(url).strip())
    except ValueError:
        return None
    host = u.netloc.lower().removeprefix("www.").removeprefix("m.")
    if host == "youtu.be":
        return u.path.strip("/").split("/")[0] or None
    if host.endswith("youtube.com"):
        v = urllib.parse.parse_qs(u.query).get("v")
        if v:
            return v[0]
        parts = u.path.strip("/").split("/")
        if len(parts) >= 2 and parts[0] in ("live", "shorts", "embed"):
            return parts[1]
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    key = os.environ.get("YT_API_KEY", "").strip()
    if not key:
        sys.exit("沒有 YT_API_KEY：請到 GitHub repo → Settings → Secrets and variables → Actions 設定")

    songs = json.loads(SONGS.read_text(encoding="utf-8"))
    if isinstance(songs, dict):
        songs = songs.get("songs", [])
    ids = []
    for s in songs:
        if str(s.get("category", "")).strip().lower() in CATEGORIES:
            vid = video_id(s.get("url", ""))
            if vid and vid not in ids:
                ids.append(vid)
    print(f"要查的影片：{len(ids)} 支")

    views = {}
    for i in range(0, len(ids), 50):
        q = urllib.parse.urlencode({"part": "statistics", "id": ",".join(ids[i:i + 50]), "maxResults": 50, "key": key})
        with urllib.request.urlopen(API + "?" + q, timeout=30) as r:
            data = json.load(r)
        for item in data.get("items", []):
            n = item.get("statistics", {}).get("viewCount")
            if n is not None:
                views[item["id"]] = int(n)
    missing = [v for v in ids if v not in views]
    if missing:
        print("查不到（可能已刪除或不公開）：", ", ".join(missing))

    out = {"updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "views": views}
    text = json.dumps(out, ensure_ascii=False, indent=2) + "\n"
    if args.dry_run:
        print(text)
        return
    OUT.write_text(text, encoding="utf-8")
    print(f"已寫入 {OUT.name}：{len(views)} 支")


if __name__ == "__main__":
    main()
