#!/usr/bin/env python3
"""從 YouTube 自動抓直播／影片，寫進 timeline_auto.json（編年史頁的自動資料）。

由 GitHub Actions（.github/workflows/update-timeline.yml）每天台灣時間早上 9 點執行一次。
需要 YouTube Data API v3 金鑰：環境變數 YT_API_KEY（GitHub Secrets）。本機測試：
    YT_API_KEY=… python scripts/update_timeline.py            # 更新 timeline_auto.json
    YT_API_KEY=… python scripts/update_timeline.py --dry-run  # 只印出結果，不寫檔

流程（只用 Python 內建模組）：
  1. 讀頻道 RSS（最近 15 支）；RSS 暫時壞掉（404 等）時改用 API 的「上傳的影片」播放清單
  2. 只把「沒看過的」（新的、還在預定中的）一次交給 API 查（videos.list，1 個配額單位；免費額度每天 10,000）
  3. 收錄規則：
     - 直播（播完的）→ stream；標題有 コラボ 等字 → collab；首播的 MV、一般影片 → release；Shorts → short
     - 預定中的直播也收（"upcoming": true、"start"＝預定開播時間 UTC）；播完後下次執行改成一般直播
     - 常駐待機室（フリーチャット、或預定在很久以後的）不收；預定被取消／刪除就拿掉
     - 標題最後的【ホロライブ/アソビ★まわり隊！/熱千めら】這種固定標籤會拿掉
  4. 看過的影片不再查，舊資料不會被刪掉；不收的影片（待機室等）也記成 "hide": true，之後不再查
  想改標題、說明、種類、聯動對象，或隱藏某支影片 → Google 試算表「編年史」分頁填同一個網址即可（試算表優先）。
"""
import argparse
import datetime as dt
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
# 要抓的頻道：handle（@ 開頭）一定要有；channel_id 填了可以省一次查詢
CHANNELS = [
    {"handle": "@AchichiMela", "channel_id": "", "note": ""},
    # 團體頻道（アソビ★まわり隊！）目前手動新增，不自動抓：
    # {"handle": "@hololive_ASOBIMAWARITAI", "channel_id": "", "note": "アソビ★まわり隊！ 頻道"},
]
TZ = dt.timezone(dt.timedelta(hours=9))  # 日期用日本時間算（配信日）
COLLAB_WORDS = ("コラボ", "collab", "Collab", "COLLAB")  # 標題含這些字 → collab（聯動）
RELEASE_WORDS = ("MV", "Music Video", "歌ってみた", "cover", "Cover", "COVER", "Official", "オリジナル曲")  # 首播的 MV 等
FREE_CHAT_WORDS = ("フリーチャット", "free chat", "Free Chat", "FREE CHAT", "freechat")  # 常駐待機室，不收
TAG_WORDS = ("ホロライブ", "hololive", "熱千めら", "アソビ★まわり隊")  # 標題最後的【…】含這些字就拿掉
MAX_FUTURE_DAYS = 60    # 預定開播超過這麼多天以後的，當成常駐待機室，不收
PREMIERE_MAX_SEC = 600  # 有直播資料、但長度 10 分鐘以內 → 當成首播（MV 等），算 release
SHORT_MAX_SEC = 180     # 沒有直播資料、長度 3 分鐘以內 → 當成 Shorts（RSS 網址是 /shorts/ 的也是）

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "timeline_auto.json"
API = "https://www.googleapis.com/youtube/v3/"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
NOW = dt.datetime.now(dt.timezone.utc)


def fetch(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (mela-timeline)"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404) or i == tries - 1:
                raise RuntimeError(f"HTTP {e.code} {e.read().decode('utf-8', 'replace')[:300]}") from None
        except Exception:  # noqa: BLE001
            if i == tries - 1:
                raise
        time.sleep(3 * (i + 1))


def api(path, key, **params):
    params["key"] = key
    return json.loads(fetch(API + path + "?" + urllib.parse.urlencode(params)))


def parse_iso(s):
    return dt.datetime.fromisoformat(s.strip().replace("Z", "+00:00"))


def iso_dur(s):
    """PT1H2M3S → 秒"""
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return None
    d, h, mi, se = (int(x or 0) for x in m.groups())
    return ((d * 24 + h) * 60 + mi) * 60 + se


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


def parse_feed(xml_text):
    """RSS → [{vid, shorts}]"""
    out = []
    for e in ET.fromstring(xml_text).findall("a:entry", NS):
        vid = e.findtext("yt:videoId", default="", namespaces=NS)
        link = e.find("a:link", NS)
        if vid:
            out.append({"vid": vid, "shorts": link is not None and "/shorts/" in link.get("href", "")})
    return out


def classify(v, rss_shorts):
    """videos.list 的一筆 → ((type, when, upcoming), 說明)；第一項 None＝不收"""
    sn, lsd = v.get("snippet", {}), v.get("liveStreamingDetails")
    title = sn.get("title", "")
    dur = iso_dur(v.get("contentDetails", {}).get("duration"))
    lbc = sn.get("liveBroadcastContent", "none")  # upcoming / live / none
    live_type = "collab" if any(w in title for w in COLLAB_WORDS) else "stream"
    if lsd:
        start = lsd.get("actualStartTime") or lsd.get("scheduledStartTime")
        when = parse_iso(start or sn["publishedAt"])
        if lbc in ("upcoming", "live") and is_free_chat(title, when if lbc == "upcoming" else None):
            return None, "常駐待機室"
        if lbc == "upcoming":
            return (live_type, when, True), "預定"
        # 首播：播完、長度很短（MV 等）；標題像 MV 的放寬到 20 分鐘（避免「MV鑑賞」這種長直播被誤判）
        premiere = bool(lsd.get("actualEndTime")) and dur is not None and \
            (dur <= PREMIERE_MAX_SEC or (dur <= 1200 and any(w in title for w in RELEASE_WORDS)))
        if premiere:
            return ("release", when, False), "首播"
        return (live_type, when, False), "直播中" if lbc == "live" else "直播"
    when = parse_iso(sn["publishedAt"])
    if v["id"] in rss_shorts or (dur is not None and dur <= SHORT_MAX_SEC):
        return ("short", when, False), "Shorts"
    return ("release", when, False), "影片"


def make_entry(v, typ, when, upcoming, note=""):
    e = {"date": when.astimezone(TZ).strftime("%Y-%m-%d"), "type": typ, "title": clean_title(v["snippet"]["title"]),
         "url": f"https://www.youtube.com/watch?v={v['id']}"}
    if upcoming:
        e["upcoming"] = True
        e["start"] = when.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if note:
        e["note"] = note
    return e


def recent_videos(cid, key):
    """頻道最近 15 支影片 → ([{vid, shorts}], 來源)
    先讀 RSS（不用配額，還能認出 Shorts）；YouTube 的 RSS 偶爾會暫時回 404／500，
    重試幾次還是失敗就改用 API 的「上傳的影片」播放清單（1 個配額單位，Shorts 改用長度判斷）"""
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"
    for i in range(3):
        try:
            return parse_feed(fetch(url, tries=1)), "RSS"
        except Exception as e:  # noqa: BLE001
            err = str(e).splitlines()[0][:80]
            print(f"  （RSS 讀取失敗 {i + 1}/3：{err}）")
            time.sleep(5 * (i + 1))
    r = api("playlistItems", key, part="contentDetails", playlistId="UU" + cid[2:], maxResults=15)
    return [{"vid": it["contentDetails"]["videoId"], "shorts": False} for it in r.get("items", [])], "API 播放清單"


def collect(ch, key, by_vid):
    """RSS 最近 15 支裡沒看過的（新的、還在預定中的）＋已經不在 RSS 的預定 → 問 API
    → [(vid, entry 或 None, 說明)]"""
    cid = ch["channel_id"]
    if not cid:
        r = api("channels", key, part="id", forHandle=ch["handle"])
        if not r.get("items"):
            raise RuntimeError(f"API 找不到頻道 {ch['handle']}")
        cid = r["items"][0]["id"]
    feed, src = recent_videos(cid, key)
    in_feed = {x["vid"] for x in feed}
    rss_shorts = {x["vid"] for x in feed if x["shorts"]}
    ids = [x["vid"] for x in feed if x["vid"] not in by_vid or by_vid[x["vid"]].get("upcoming")]
    ids += [v for v, e in by_vid.items() if e.get("upcoming") and v not in in_feed]  # 可能被取消的預定
    print(f"{ch['handle']}: {src} {len(feed)} 支，要查 {len(ids)} 支（其他已經看過）")
    out = []
    for i in range(0, len(ids), 50):
        r = api("videos", key, part="snippet,liveStreamingDetails,contentDetails", id=",".join(ids[i:i + 50]), maxResults=50)
        got = {v["id"]: v for v in r.get("items", [])}
        for vid in ids[i:i + 50]:
            v = got.get(vid)
            if not v:
                out.append((vid, None, "API 沒有資料（私人／刪除）"))
                continue
            res, why = classify(v, rss_shorts)
            if res is None:
                out.append((vid, None, f"{why}：{v['snippet']['title']}"))
            else:
                out.append((vid, make_entry(v, *res, ch.get("note", "")), why))
    return out


def vid_of(url):
    m = re.search(r"v=([\w-]+)", url or "")
    return m.group(1) if m else None


KEYS = ("date", "type", "title", "upcoming", "start")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    key = os.environ.get("YT_API_KEY", "").strip()
    if not key:
        sys.exit("沒有 YT_API_KEY：請到 GitHub repo → Settings → Secrets and variables → Actions 設定")

    data = json.loads(OUT.read_text("utf-8")) if OUT.exists() else []
    by_vid = {vid_of(e.get("url")): e for e in data if vid_of(e.get("url"))}
    added = updated = removed = failed = 0
    for ch in CHANNELS:
        try:
            results = collect(ch, key, by_vid)
        except Exception as e:  # noqa: BLE001
            print(f"!! {ch['handle']} 讀取失敗：{e}", file=sys.stderr)
            failed += 1
            continue
        for vid, entry, why in results:
            old = by_vid.get(vid)
            if entry is None:  # 不收（待機室、刪除…）
                if old is not None and old.get("upcoming"):  # 之前是「預定」的就拿掉
                    data.remove(old)
                    del by_vid[vid]
                    removed += 1
                    print(f"  x {vid} 移除（{why}）")
                elif old is None:  # 記下來（"hide": true，網頁不顯示），之後不用再查
                    rec = {"url": f"https://www.youtube.com/watch?v={vid}", "hide": True, "note": why}
                    data.append(rec)
                    by_vid[vid] = rec
                    added += 1
                    print(f"  - {vid} 不收，記下來之後不再查（{why}）")
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
    data.sort(key=lambda e: (e.get("date", ""), e["url"]), reverse=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"→ {OUT.name}")


if __name__ == "__main__":
    main()
