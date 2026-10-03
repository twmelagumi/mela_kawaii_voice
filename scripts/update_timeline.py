#!/usr/bin/env python3
"""從 YouTube 自動抓直播／影片，寫進 timeline_auto.json（編年史頁的自動資料）。

由 GitHub Actions（.github/workflows/update-timeline.yml）每天台灣時間早上 6 點執行一次，也可以在本機跑：
    python scripts/update_timeline.py            # 抓新的影片並更新 timeline_auto.json
    python scripts/update_timeline.py --dry-run  # 只印出會新增什麼，不寫檔

做法（不需要 API 金鑰，只用 Python 內建模組）：
  1. 讀頻道的 RSS（https://www.youtube.com/feeds/videos.xml?channel_id=…）→ 最近 15 支影片
  2. 新的影片再開一次影片頁，從頁面資料判斷是不是直播、實際開播時間
  3. 直播：要已經播完才加入（預定中／直播中的下次再抓）；Shorts 不加入
  4. RSS 裡的影片每次都重新確認：新的加入；已經有的若種類／日期／標題有變就更新。
     RSS 以外（比較舊）的資料不會動、不會被刪掉。
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


def _has(h, *needles):
    return any(n in h for n in needles)


def video_info(watch_html):
    """影片頁 → {live, start, end, upcoming, publish, title, why}
    判斷是不是直播用好幾種線索（YouTube 頁面格式會變）：
      - "isLiveContent":true／false（播放器資料）
      - "liveBroadcastDetails"（播放器資料，有開播／結束時間）
      - <meta itemprop="isLiveBroadcast" content="True">、startDate／endDate（頁面 microdata）
    首播（Premiere）的 MV 也有開播時間，但 isLiveContent=false → 算 release。"""
    h = watch_html.replace('\\"', '"')  # 有些資料是放在 JS 字串裡（\"isLiveContent\":true），先還原
    if '"videoDetails"' not in h and 'itemprop="videoId"' not in h:
        raise RuntimeError("影片頁沒有影片資料（可能被要求登入／驗證）")
    info = {"live": False, "start": None, "end": None, "upcoming": False, "publish": None, "title": None, "why": []}
    live_true = re.search(r'"isLiveContent"\s*:\s*true', h) is not None
    live_false = re.search(r'"isLiveContent"\s*:\s*false', h) is not None
    broadcast = re.search(r'itemprop="isLiveBroadcast"\s+content="True"', h, re.I) is not None
    m = re.search(r'"liveBroadcastDetails"\s*:\s*\{([^{}]*)\}', h)
    if m:
        d = m.group(1)
        s = re.search(r'"startTimestamp"\s*:\s*"([^"]+)"', d)
        e = re.search(r'"endTimestamp"\s*:\s*"([^"]+)"', d)
        info["start"] = parse_iso(s.group(1)) if s else None
        info["end"] = parse_iso(e.group(1)) if e else None
        info["upcoming"] = re.search(r'"isLiveNow"\s*:\s*true', d) is not None or info["end"] is None
    if not info["start"]:
        s = re.search(r'itemprop="startDate"\s+content="([^"]+)"', h)
        info["start"] = parse_iso(s.group(1)) if s else None
    if not info["end"]:
        e = re.search(r'itemprop="endDate"\s+content="([^"]+)"', h)
        info["end"] = parse_iso(e.group(1)) if e else None
        if broadcast and not m:
            info["upcoming"] = info["end"] is None
    if re.search(r'"isUpcoming"\s*:\s*true', h):
        info["upcoming"] = True
    # 直播：isLiveContent=true；或有直播資料、而且沒有明確寫 isLiveContent=false（＝不是首播）
    info["live"] = live_true or ((bool(m) or broadcast) and not live_false)
    info["why"] = [k for k, v in (("isLiveContent=true", live_true), ("isLiveContent=false", live_false),
                                   ("liveBroadcastDetails", bool(m)), ("isLiveBroadcast", broadcast)) if v]
    p = re.search(r'"publishDate"\s*:\s*"([^"]+)"', h) or re.search(r'"uploadDate"\s*:\s*"([^"]+)"', h) \
        or re.search(r'itemprop="(?:datePublished|uploadDate)"\s+content="([^"]+)"', h)
    if p:
        info["publish"] = parse_iso(p.group(1))
    t = re.search(r'<meta name="title" content="([^"]*)"', h)
    if t:
        info["title"] = html.unescape(t.group(1))
    return info


# 完全找不到直播線索時，用標題猜：像 MV／歌ってみた 的算 release，其他算直播（めら頻道大多是直播）
RELEASE_WORDS = ("MV", "Music Video", "歌ってみた", "cover", "Cover", "COVER", "Official", "オリジナル曲", "ショート")


# 標題最後的【ホロライブ/アソビ★まわり隊！/熱千めら】這種固定標籤拿掉，時間線上比較好讀
TAG_WORDS = ("ホロライブ", "hololive", "熱千めら", "アソビ★まわり隊")


def clean_title(title):
    t = title.strip()
    while True:
        m = re.search(r'\s*【([^【】]*)】\s*$', t)
        if not m or not any(w in m.group(1) for w in TAG_WORDS) or m.start() == 0:
            return t
        t = t[:m.start()].rstrip()


def make_entry(item, info, note=""):
    when = info["start"] or info["publish"] or parse_iso(item["published"])
    title = clean_title(item["title"] or info["title"] or "")
    if not info["why"]:  # 沒有任何直播線索 → 用標題猜
        info["live"] = not any(w in title for w in RELEASE_WORDS)
        info["why"] = ["標題推測"]
    if info["live"]:
        typ = "collab" if any(w in title for w in COLLAB_WORDS) else "stream"
    else:
        typ = "release"
    e = {"date": when.astimezone(TZ).strftime("%Y-%m-%d"), "type": typ, "title": title,
         "url": f"https://www.youtube.com/watch?v={item['vid']}"}
    if note:
        e["note"] = note
    return e


def vid_of(url):
    m = re.search(r"v=([\w-]+)", url or "")
    return m.group(1) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    data = json.loads(OUT.read_text("utf-8")) if OUT.exists() else []
    by_vid = {vid_of(e.get("url")): e for e in data if vid_of(e.get("url"))}
    added, updated, failed = [], [], 0
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
        # RSS 裡的影片每次都重新確認（新的就加入；已經有的，種類／日期／標題有變就更新）
        # RSS 以外的舊資料不會動
        for item in feed:
            if SKIP_SHORTS and item["shorts"]:
                print(f"  - {item['vid']} Shorts，略過")
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
            why = ",".join(info["why"]) or "沒有直播資料"
            old = by_vid.get(item["vid"])
            if old is None:
                print(f"  + {entry['date']} [{entry['type']}] {entry['title']}  ({why})")
                data.append(entry)
                by_vid[item["vid"]] = entry
                added.append(entry)
            elif any(old.get(k) != entry.get(k) for k in ("date", "type", "title")):
                print(f"  ~ {entry['date']} [{old.get('type')}→{entry['type']}] {entry['title']}  ({why})")
                old.update({k: entry[k] for k in ("date", "type", "title")})
                updated.append(entry)
            else:
                print(f"  = {entry['date']} [{entry['type']}] {entry['title']}  ({why})")
            time.sleep(1)

    if failed == len(CHANNELS):
        sys.exit("所有頻道都讀取失敗")
    if not added and not updated:
        print("沒有變動")
        return
    data.sort(key=lambda e: (e["date"], e["url"]), reverse=True)
    if args.dry_run:
        print(f"(dry-run) 新增 {len(added)} 筆、更新 {len(updated)} 筆")
        return
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"新增 {len(added)} 筆、更新 {len(updated)} 筆 → {OUT.name}")


if __name__ == "__main__":
    main()
