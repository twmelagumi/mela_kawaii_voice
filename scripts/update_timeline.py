#!/usr/bin/env python3
"""從 YouTube 自動抓直播／影片，寫進 timeline_auto.json（編年史頁的自動資料）。

由 GitHub Actions（.github/workflows/update-timeline.yml）每天台灣時間早上 6 點執行一次，也可以在本機跑：
    python scripts/update_timeline.py            # 抓新的影片並更新 timeline_auto.json
    python scripts/update_timeline.py --dry-run  # 只印出會新增什麼，不寫檔

做法（不需要 API 金鑰，只用 Python 內建模組）：
  1. 讀頻道的 RSS（https://www.youtube.com/feeds/videos.xml?channel_id=…）→ 最近 15 支影片
  2. 新的影片再開一次影片頁，從頁面資料判斷是不是直播、實際開播時間
  3. 直播：要已經播完才加入（預定中／直播中的下次再抓）；Shorts 不加入
  4. 已經在 timeline_auto.json 的影片不會重抓、不會被刪掉。
     想改標題、說明、種類，或隱藏某支影片 → 在 Google 試算表「編年史」分頁填同一個網址即可（試算表優先）。
"""
import argparse
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

# ===== 設定 =====
# 要抓的頻道：handle（@ 開頭）一定要有；channel_id 留空會自動從頻道頁查（查到後會印出來，可以填回這裡）
CHANNELS = [
    {"handle": "@AchichiMela", "channel_id": "", "note": ""},
    # 團體頻道（アソビ★まわり隊！）目前手動新增，不自動抓：
    # {"handle": "@hololive_ASOBIMAWARITAI", "channel_id": "", "note": "アソビ★まわり隊！ 頻道"},
]
# 日期用日本時間算（配信日）
TZ = dt.timezone(dt.timedelta(hours=9))
# 標題含這些字 → 種類設成 collab；不是直播的影片 → release
COLLAB_WORDS = ["コラボ", "collab", "Collab", "COLLAB"]
SKIP_SHORTS = True

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "timeline_auto.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}


def fetch(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.8", "Cookie": "CONSENT=YES+1; SOCS=CAI"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            print(f"  retry {url}: {e}", file=sys.stderr)
            time.sleep(3 * (i + 1))


def resolve_channel_id(handle):
    page = fetch(f"https://www.youtube.com/{handle}")
    for pat in (r'feeds/videos\.xml\?channel_id=(UC[\w-]{22})', r'"externalId":"(UC[\w-]{22})"', r'<meta itemprop="identifier" content="(UC[\w-]{22})"', r'"channelId":"(UC[\w-]{22})"'):
        m = re.search(pat, page)
        if m:
            return m.group(1)
    raise RuntimeError(f"找不到 {handle} 的 channel_id")


def parse_feed(xml_text):
    """RSS → [{vid, title, published, shorts}]"""
    root = ET.fromstring(xml_text)
    out = []
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", default="", namespaces=NS)
        link = e.find("a:link", NS)
        href = link.get("href", "") if link is not None else ""
        out.append({
            "vid": vid,
            "title": (e.findtext("a:title", default="", namespaces=NS) or "").strip(),
            "published": e.findtext("a:published", default="", namespaces=NS),
            "shorts": "/shorts/" in href,
        })
    return [x for x in out if x["vid"]]


def parse_iso(s):
    s = s.strip().replace("Z", "+00:00")
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return dt.datetime.fromisoformat(s).replace(tzinfo=TZ)
    return dt.datetime.fromisoformat(s)


def video_info(watch_html):
    """影片頁 → {live, start, end, upcoming, publish, title}（找不到的欄位是 None）
    live＝真的直播（isLiveContent）；首播（Premiere）的 MV 也有開播時間，但 live=False → 算 release"""
    if '"videoDetails"' not in watch_html:
        raise RuntimeError("影片頁沒有 videoDetails（可能被要求登入／驗證）")
    info = {"live": '"isLiveContent":true' in watch_html, "start": None, "end": None, "upcoming": False, "publish": None, "title": None}
    m = re.search(r'"liveBroadcastDetails":\{([^{}]*)\}', watch_html)
    if m:
        d = m.group(1)
        s = re.search(r'"startTimestamp":"([^"]+)"', d)
        e = re.search(r'"endTimestamp":"([^"]+)"', d)
        info["start"] = parse_iso(s.group(1)) if s else None
        info["end"] = parse_iso(e.group(1)) if e else None
        info["upcoming"] = '"isLiveNow":true' in d or info["end"] is None
    if '"isUpcoming":true' in watch_html:
        info["upcoming"] = True
    p = re.search(r'"publishDate":"([^"]+)"', watch_html) or re.search(r'"uploadDate":"([^"]+)"', watch_html) \
        or re.search(r'<meta itemprop="(?:datePublished|uploadDate)" content="([^"]+)"', watch_html)
    if p:
        info["publish"] = parse_iso(p.group(1))
    t = re.search(r'<meta name="title" content="([^"]*)"', watch_html)
    if t:
        info["title"] = html.unescape(t.group(1))
    return info


def make_entry(item, info, note=""):
    when = info["start"] or info["publish"] or parse_iso(item["published"])
    title = item["title"] or info["title"] or ""
    if info["live"]:
        typ = "collab" if any(w in title for w in COLLAB_WORDS) else "stream"
    else:
        typ = "release"
    e = {"date": when.astimezone(TZ).strftime("%Y-%m-%d"), "type": typ, "title": title,
         "url": f"https://www.youtube.com/watch?v={item['vid']}"}
    if note:
        e["note"] = note
    return e


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    data = json.loads(OUT.read_text("utf-8")) if OUT.exists() else []
    known = {re.search(r"v=([\w-]+)", e.get("url", "")).group(1) for e in data if re.search(r"v=([\w-]+)", e.get("url", ""))}
    added = []
    failed = 0
    for ch in CHANNELS:
        try:
            cid = ch["channel_id"] or resolve_channel_id(ch["handle"])
            if not ch["channel_id"]:
                print(f"{ch['handle']} → channel_id {cid}（可以填回 CHANNELS）")
            feed = parse_feed(fetch(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
        except Exception as e:  # noqa: BLE001
            print(f"!! {ch['handle']} 讀取失敗：{e}", file=sys.stderr)
            failed += 1
            continue
        print(f"{ch['handle']}: RSS {len(feed)} 支")
        for item in feed:
            if item["vid"] in known or (SKIP_SHORTS and item["shorts"]):
                continue
            try:
                info = video_info(fetch(f"https://www.youtube.com/watch?v={item['vid']}&hl=ja"))
            except Exception as e:  # noqa: BLE001
                print(f"  !! {item['vid']} 影片頁讀取失敗，下次再試：{e}", file=sys.stderr)
                continue
            if info["upcoming"]:
                print(f"  … {item['vid']} 預定／直播中，下次再抓：{item['title']}")
                continue
            entry = make_entry(item, info, ch.get("note", ""))
            print(f"  + {entry['date']} [{entry['type']}] {entry['title']}")
            data.append(entry)
            known.add(item["vid"])
            added.append(entry)
            time.sleep(1)

    if failed == len(CHANNELS):
        sys.exit("所有頻道都讀取失敗")
    if not added:
        print("沒有新的影片")
        return
    data.sort(key=lambda e: (e["date"], e["url"]), reverse=True)
    if args.dry_run:
        print(f"(dry-run) 會新增 {len(added)} 筆")
        return
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"已新增 {len(added)} 筆 → {OUT.name}")


if __name__ == "__main__":
    main()
