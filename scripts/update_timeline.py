#!/usr/bin/env python3
"""從 YouTube 自動抓直播／影片，寫進 timeline_auto.json（編年史頁的自動資料）。

由 GitHub Actions（.github/workflows/update-timeline.yml）每天台灣時間早上 6 點執行一次，也可以在本機跑：
    python scripts/update_timeline.py            # 抓最近的影片並更新 timeline_auto.json
    python scripts/update_timeline.py --dry-run  # 只印出結果，不寫檔

都是先讀頻道 RSS（最近 15 支），只查「沒看過的」影片（新的、還在預定中的）：
  A. 有環境變數 YT_API_KEY（GitHub Secrets）→ 用 YouTube Data API v3 查，最準：
     直播／首播／預定、實際開播時間、影片長度都由 API 直接提供。每天大約只用 1～2 個配額單位（免費額度每天 10,000）。
     沒用 API 確認過的舊資料（例如之前用標題猜的）會用 API 再確認一次。
  B. 沒有金鑰 → 開影片頁猜；GitHub 拿到的頁面常常沒有直播資料，只能用標題猜。
（只用 Python 內建模組）

收錄規則：
  - 直播（播完的）→ stream；標題有 コラボ 等字 → collab；首播的 MV／Cover → release；一般影片 → release；Shorts → short
  - 預定中的直播也會收（"upcoming": true，日期＝預定開播日）；常駐待機室（フリーチャット）不收
  - 看過的影片不再查；預定中的直播每天再查，播完就改成一般直播
  - 預定中的直播如果已經不在頻道上（取消／刪除）就拿掉；其他舊資料不會動、不會被刪掉
  - 想改標題、說明、種類、聯動對象，或隱藏某支影片 → Google 試算表「編年史」分頁填同一個網址即可（試算表優先）
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

# ===== 設定 =====
# 要抓的頻道：handle（@ 開頭）一定要有；channel_id 留空會自動查（查到後會印出來，可以填回這裡）
CHANNELS = [
    {"handle": "@AchichiMela", "channel_id": "", "note": ""},
    # 團體頻道（アソビ★まわり隊！）目前手動新增，不自動抓：
    # {"handle": "@hololive_ASOBIMAWARITAI", "channel_id": "", "note": "アソビ★まわり隊！ 頻道"},
]
TZ = dt.timezone(dt.timedelta(hours=9))  # 日期用日本時間算（配信日）
COLLAB_WORDS = ("コラボ", "collab", "Collab", "COLLAB")  # 標題含這些字 → collab（聯動）
RELEASE_WORDS = ("MV", "Music Video", "歌ってみた", "cover", "Cover", "COVER", "Official", "オリジナル曲")  # 首播的 MV 等
FREE_CHAT_WORDS = ("フリーチャット", "free chat", "Free Chat", "FREE CHAT", "freechat")  # 常駐待機室，不收
MAX_FUTURE_DAYS = 60    # 預定開播超過這麼多天以後的，當成常駐待機室，不收
PREMIERE_MAX_SEC = 600  # 有直播資料、但長度 10 分鐘以內 → 當成首播（MV 等），算 release
SHORT_MAX_SEC = 180     # API 模式：沒有直播資料、長度 3 分鐘以內 → 當成 Shorts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "timeline_auto.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "media": "http://search.yahoo.com/mrss/"}
API = "https://www.googleapis.com/youtube/v3/"
NOW = dt.datetime.now(dt.timezone.utc)


# ---------- 共用 ----------
def fetch(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.8", "Cookie": "CONSENT=YES+1; SOCS=CAI"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404) or i == tries - 1:
                detail = e.read().decode("utf-8", "replace")[:300] if hasattr(e, "read") else ""
                raise RuntimeError(f"HTTP {e.code} {detail}") from None
        except Exception:  # noqa: BLE001
            if i == tries - 1:
                raise
        print(f"  retry {url.split('key=')[0]}", file=sys.stderr)
        time.sleep(3 * (i + 1))


def parse_iso(s):
    s = s.strip().replace("Z", "+00:00")
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return dt.datetime.fromisoformat(s).replace(tzinfo=TZ)
    return dt.datetime.fromisoformat(s)


def iso_dur(s):
    """PT1H2M3S → 秒"""
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return None
    d, h, mi, se = (int(x or 0) for x in m.groups())
    return ((d * 24 + h) * 60 + mi) * 60 + se


# 標題最後的【ホロライブ/アソビ★まわり隊！/熱千めら】這種固定標籤拿掉，時間線上比較好讀
TAG_WORDS = ("ホロライブ", "hololive", "熱千めら", "アソビ★まわり隊")


def clean_title(title):
    t = (title or "").strip()
    while True:
        m = re.search(r'\s*【([^【】]*)】\s*$', t)
        if not m or not any(w in m.group(1) for w in TAG_WORDS) or m.start() == 0:
            return t
        t = t[:m.start()].rstrip()


def is_free_chat(title, start):
    if any(w in (title or "") for w in FREE_CHAT_WORDS):
        return True
    return bool(start and start - NOW > dt.timedelta(days=MAX_FUTURE_DAYS))


def make_entry(vid, kind, title, when, upcoming=False, note=""):
    """kind: live / premiere / video / short"""
    title = clean_title(title)
    if kind == "live":
        typ = "collab" if any(w in title for w in COLLAB_WORDS) else "stream"
    elif kind == "short":
        typ = "short"
    else:
        typ = "release"
    e = {"date": when.astimezone(TZ).strftime("%Y-%m-%d"), "type": typ, "title": title,
         "url": f"https://www.youtube.com/watch?v={vid}"}
    if upcoming:
        e["upcoming"] = True
        e["start"] = when.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if note:
        e["note"] = note
    return e


# ---------- RSS（兩種模式都會讀，用來認 Shorts）----------
def parse_feed(xml_text):
    """RSS → [{vid, title, published, shorts}]"""
    root = ET.fromstring(xml_text)
    out = []
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", default="", namespaces=NS)
        link = e.find("a:link", NS)
        href = link.get("href", "") if link is not None else ""
        out.append({"vid": vid, "title": (e.findtext("a:title", default="", namespaces=NS) or "").strip(),
                    "published": e.findtext("a:published", default="", namespaces=NS), "shorts": "/shorts/" in href})
    return [x for x in out if x["vid"]]


def resolve_channel_id_html(handle):
    page = fetch(f"https://www.youtube.com/{handle}")
    for pat in (r'feeds/videos\.xml\?channel_id=(UC[\w-]{22})', r'"externalId":"(UC[\w-]{22})"',
                r'<meta itemprop="identifier" content="(UC[\w-]{22})"', r'"channelId":"(UC[\w-]{22})"'):
        m = re.search(pat, page)
        if m:
            return m.group(1)
    raise RuntimeError(f"找不到 {handle} 的 channel_id")


# ---------- 模式 A：YouTube Data API ----------
def api(path, key, **params):
    params["key"] = key
    return json.loads(fetch(API + path + "?" + urllib.parse.urlencode(params)))


def classify_api(v, rss_shorts):
    """videos.list 的一筆 → (kind, when, upcoming, title)；None＝不收"""
    sn, lsd = v.get("snippet", {}), v.get("liveStreamingDetails")
    title = sn.get("title", "")
    dur = iso_dur(v.get("contentDetails", {}).get("duration"))
    lbc = sn.get("liveBroadcastContent", "none")  # upcoming / live / none
    if lsd:
        start = lsd.get("actualStartTime") or lsd.get("scheduledStartTime")
        when = parse_iso(start) if start else parse_iso(sn["publishedAt"])
        if lbc == "upcoming":
            if is_free_chat(title, when):
                return None, "常駐待機室"
            return ("live", when, True, title), "預定"
        ended = bool(lsd.get("actualEndTime"))
        # 首播：播完、長度很短（MV 等）；標題像 MV 的放寬到 20 分鐘（避免「MV鑑賞」這種長直播被誤判）
        premiere = ended and dur is not None and (dur <= PREMIERE_MAX_SEC or (dur <= 1200 and any(w in title for w in RELEASE_WORDS)))
        if lbc == "live" and is_free_chat(title, None):
            return None, "常駐待機室"
        return ("premiere" if premiere else "live", when, False, title), ("首播" if premiere else "直播中" if lbc == "live" else "直播")
    when = parse_iso(sn["publishedAt"])
    if v["id"] in rss_shorts or (dur is not None and dur <= SHORT_MAX_SEC):
        return ("short", when, False, title), "Shorts"
    return ("video", when, False, title), "影片"


def need_check(vid, by_vid, api_mode):
    """看過的不再看：新的影片、還在「預定」的、（API 模式）還沒被 API 確認過的才要查"""
    old = by_vid.get(vid)
    if old is None or old.get("upcoming"):
        return True
    return api_mode and not old.get("api")


def channel_id(ch, key):
    if ch["channel_id"]:
        return ch["channel_id"]
    if key:
        r = api("channels", key, part="id", forHandle=ch["handle"])
        if not r.get("items"):
            raise RuntimeError(f"API 找不到頻道 {ch['handle']}")
        cid = r["items"][0]["id"]
    else:
        cid = resolve_channel_id_html(ch["handle"])
    print(f"{ch['handle']} → channel_id {cid}（可以填回 CHANNELS，省一次查詢）")
    return cid


def collect_api(ch, key, by_vid):
    """RSS 最近 15 支裡「要查的」＋還在預定中的舊資料 → 一次問 API（1 個配額單位）
    → [(vid, entry or None, why)]"""
    cid = channel_id(ch, key)
    feed = parse_feed(fetch(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
    rss_shorts = {x["vid"] for x in feed if x["shorts"]}
    ids = [x["vid"] for x in feed if need_check(x["vid"], by_vid, True)]
    # 預定中、但已經不在 RSS 的（可能被取消）也問一次
    ids += [v for v, e in by_vid.items() if e.get("upcoming") and v not in ids and v not in {x["vid"] for x in feed}]
    print(f"{ch['handle']}: RSS {len(feed)} 支，要查 {len(ids)} 支（其他已經看過）")
    out = []
    for i in range(0, len(ids), 50):
        r = api("videos", key, part="snippet,liveStreamingDetails,contentDetails", id=",".join(ids[i:i + 50]), maxResults=50)
        got = {v["id"]: v for v in r.get("items", [])}
        for vid in ids[i:i + 50]:
            v = got.get(vid)
            if not v:
                out.append((vid, None, "API 沒有資料（私人／刪除）"))
                continue
            res, why = classify_api(v, rss_shorts)
            if res is None:
                out.append((vid, None, why + "：" + v["snippet"]["title"]))
                continue
            kind, when, upcoming, title = res
            e = make_entry(vid, kind, title, when, upcoming, ch.get("note", ""))
            e["api"] = True  # 已經由 API 確認過，之後不再查（預定中的除外）
            out.append((vid, e, why))
    return out


# ---------- 模式 B：RSS ＋ 影片頁 ----------
def video_info_html(watch_html):
    h = watch_html.replace('\\"', '"')  # 有些資料放在 JS 字串裡（\"isLiveContent\":true），先還原
    if '"videoDetails"' not in h and 'itemprop="videoId"' not in h:
        raise RuntimeError("影片頁沒有影片資料（可能被要求登入／驗證）")
    info = {"live": False, "start": None, "end": None, "upcoming": False, "publish": None, "why": []}
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
        info["upcoming"] = info["end"] is None and re.search(r'"isLiveNow"\s*:\s*true', d) is None
    if not info["start"]:
        s = re.search(r'itemprop="startDate"\s+content="([^"]+)"', h)
        info["start"] = parse_iso(s.group(1)) if s else None
    if re.search(r'"isUpcoming"\s*:\s*true', h):
        info["upcoming"] = True
    info["live"] = live_true or ((bool(m) or broadcast) and not live_false) or info["upcoming"]
    info["why"] = [k for k, v in (("isLiveContent=true", live_true), ("isLiveContent=false", live_false),
                                   ("liveBroadcastDetails", bool(m)), ("isLiveBroadcast", broadcast), ("isUpcoming", info["upcoming"])) if v]
    p = re.search(r'"publishDate"\s*:\s*"([^"]+)"', h) or re.search(r'"uploadDate"\s*:\s*"([^"]+)"', h) \
        or re.search(r'itemprop="(?:datePublished|uploadDate)"\s+content="([^"]+)"', h)
    if p:
        info["publish"] = parse_iso(p.group(1))
    return info


def collect_html(ch, by_vid):
    cid = channel_id(ch, "")
    feed = parse_feed(fetch(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
    todo = [x for x in feed if need_check(x["vid"], by_vid, False)]
    print(f"{ch['handle']}: RSS {len(feed)} 支，要查 {len(todo)} 支（其他已經看過）")
    out = []
    for item in todo:
        vid, title = item["vid"], item["title"]
        if item["shorts"]:
            out.append((vid, make_entry(vid, "short", title, parse_iso(item["published"]), note=ch.get("note", "")), "Shorts"))
            continue
        try:
            info = video_info_html(fetch(f"https://www.youtube.com/watch?v={vid}&hl=ja"))
        except Exception as e:  # noqa: BLE001
            out.append((vid, "skip", f"影片頁讀取失敗，下次再試：{e}"))
            continue
        why = ",".join(info["why"])
        if not info["why"]:  # 沒有任何直播線索 → 用標題猜（めら頻道大多是直播）
            info["live"] = not any(w in title for w in RELEASE_WORDS)
            why = "標題推測"
        when = info["start"] or info["publish"] or parse_iso(item["published"])
        if info["upcoming"] and is_free_chat(title, info["start"]):
            out.append((vid, None, "常駐待機室：" + title))
            continue
        kind = "live" if info["live"] else "video"
        out.append((vid, make_entry(vid, kind, title, when, info["upcoming"], ch.get("note", "")), why))
        time.sleep(1)
    return out


# ---------- 主程式 ----------
def vid_of(url):
    m = re.search(r"v=([\w-]+)", url or "")
    return m.group(1) if m else None


KEYS = ("date", "type", "title", "upcoming", "start", "api")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    key = os.environ.get("YT_API_KEY", "").strip()
    print("模式：" + ("YouTube Data API" if key else "RSS＋影片頁（沒有 YT_API_KEY）"))

    data = json.loads(OUT.read_text("utf-8")) if OUT.exists() else []
    by_vid = {vid_of(e.get("url")): e for e in data if vid_of(e.get("url"))}
    added = updated = removed = 0
    failed = 0
    for ch in CHANNELS:
        try:
            results = collect_api(ch, key, by_vid) if key else collect_html(ch, by_vid)
        except Exception as e:  # noqa: BLE001
            print(f"!! {ch['handle']} 讀取失敗：{e}", file=sys.stderr)
            failed += 1
            continue
        for vid, entry, why in results:
            old = by_vid.get(vid)
            if entry == "skip":
                print(f"  !! {vid} {why}")
                continue
            if entry is None:  # 不收（待機室、刪除…）；如果之前是「預定」就拿掉
                if old is not None and old.get("upcoming"):
                    data.remove(old)
                    del by_vid[vid]
                    removed += 1
                    print(f"  x {vid} 移除（{why}）")
                else:
                    print(f"  - {vid} 略過（{why}）")
                continue
            tag = f"{entry['date']} [{entry['type']}{'・預定' if entry.get('upcoming') else ''}] {entry['title']}  ({why})"
            if old is None:
                data.append(entry)
                by_vid[vid] = entry
                added += 1
                print(f"  + {tag}")
            elif any(old.get(k) != entry.get(k) for k in KEYS):
                for k in KEYS:
                    if k in entry:
                        old[k] = entry[k]
                    else:
                        old.pop(k, None)
                updated += 1
                print(f"  ~ {tag}")
            else:
                print(f"  = {tag}")

    if failed == len(CHANNELS):
        sys.exit("所有頻道都讀取失敗")
    print(f"新增 {added}、更新 {updated}、移除 {removed}")
    if not (added or updated or removed) or args.dry_run:
        return
    data.sort(key=lambda e: (e["date"], e["url"]), reverse=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"→ {OUT.name}")


if __name__ == "__main__":
    main()
