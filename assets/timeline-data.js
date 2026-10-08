/* 熱千めら めらめら出勤紀錄 — 編年史資料（timeline.html、calendar.html 共用）
 * 事件有三個來源，後面的會蓋過前面的（同一支影片＝同一個事件，日期不同就是另一個事件）：
 *   ① timeline_auto.json：GitHub Actions 每天從 YouTube 自動抓的直播／影片（scripts/update_timeline.py）
 *   ② timeline.json：手動維護的固定資料
 *   ③ Google 試算表「編年史」分頁（TIMELINE_CSV_URL）：日常新增、修改、隱藏
 * 需要先載入 common.js（parseCSV、isYes、normDate、parseClipUrl、hash）
 */
// Google 試算表「編年史」分頁發佈成 CSV 的網址（…/pub?gid=…&single=true&output=csv）。留空就只讀 json。
const TIMELINE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIjhyIETZ-Ky_Nydc7RRi81T3SxLzJ0tROU5xJC9pYiPma7MWY4qhWxRoD9CQZVaPB6q00znizevlf/pub?gid=1439353672&single=true&output=csv";

const TL_SHEET_TTL = 5*60*1000; // 試算表在訪客瀏覽器快取 5 分鐘

const TYPES=["stream","collab","release","short","event","offline","live","anniv","auto"];

// 不是 YouTube 的網址（X 推文等）→ {href, x}；不是 http(s) 網址就 null
const linkOf=u=>{ try{ const url=new URL(String(u||"").trim()); if(!/^https?:$/.test(url.protocol)) return null;
  const host=url.hostname.replace(/^(www|mobile)\./,""); return {href:url.href,x:host==="x.com"||host==="twitter.com"}; }catch(e){ return null; } };
const vidOf=u=>{ const p=parseClipUrl(u||""); return p&&p.src==="youtube"?p.vid:null; };

async function getJSON(u){ try{ const r=await fetch(u,{cache:"no-cache"}); return r.ok?await r.json():[]; }catch(e){ return []; } }

// ---- Google 試算表（CSV；parseCSV、isYes 在 common.js）----
// 依標題文字找欄位（順序不拘）
const TL_COLS={date:["日期","日付","date"],type:["種類","類型","種別","type"],title:["標題","タイトル","title"],url:["網址","url","link","連結"],
  note:["說明","説明","備註","メモ","note"],with:["聯動對象","联动对象","コラボ相手","合作對象","with"],yearly:["每年","毎年","yearly"],hide:["隱藏","非表示","hide"]};
// 「種類」欄可以填中文／日文／英文
const TYPE_WORDS={anniv:["紀念","記念","anniv","生日","誕生","birthday"],collab:["聯動","联动","合作","コラボ","collab"],short:["short","ショート"],offline:["現地","公式イベント","offline","オフライン"],event:["事件","イベント","event"],live:["live","ライブ","演唱會","演唱会","concert"],
  release:["影片","動画","video","發布","发布","リリース","release","mv","cover","歌ってみた","原創","オリジナル","original"],stream:["直播","配信","stream"]};
const typeOf=v=>{ v=String(v||"").trim().toLowerCase(); if(!v) return ""; for(const k in TYPE_WORDS) if(TYPE_WORDS[k].some(w=>v.includes(w))) return k; return TYPES.includes(v)?v:""; };
function sheetToEvents(text){
  const rows=parseCSV(text||""); if(rows.length<2) return [];
  const head=rows[0].map(h=>h.trim().toLowerCase()), idx={};
  for(const k in TL_COLS) idx[k]=head.findIndex(h=>TL_COLS[k].some(w=>h.includes(w.toLowerCase())));
  const get=(r,k)=>idx[k]>=0?(r[idx[k]]||"").trim():"";
  return rows.slice(1).map(r=>({date:normDate(get(r,"date"))||"",type:typeOf(get(r,"type")),title:get(r,"title"),url:get(r,"url"),
    note:get(r,"note"),with:get(r,"with"),yearly:isYes(get(r,"yearly")),hide:isYes(get(r,"hide"))})).filter(e=>e.url||(e.date&&e.title));
}
const TL_SHEET_KEY="mela-tl-sheet:"+hash(TIMELINE_CSV_URL);
function readTlCache(){ try{ const c=JSON.parse(localStorage.getItem(TL_SHEET_KEY)||"null"); return c&&typeof c.text==="string"&&c.at?c:null; }catch(e){ return null; } }
async function fetchTlSheet(){ const r=await fetch(TIMELINE_CSV_URL+(TIMELINE_CSV_URL.includes("?")?"&":"?")+"_="+Date.now()); if(!r.ok) throw new Error("HTTP "+r.status);
  const text=await r.text(); try{ localStorage.setItem(TL_SHEET_KEY,JSON.stringify({text,at:Date.now()})); }catch(e){} return text; }

// ---- 合併三個來源：自動 < timeline.json < 試算表 ----
// 同一支影片（或沒有網址時：同日期＋同標題）視為同一個事件，後面的來源只覆蓋有填的欄位。
// 試算表「隱藏」打勾 → 把那個事件拿掉（例如自動抓到、但不想放進編年史的影片）。
function mergeSources(autoList,jsonList,sheetList){
  // 同一個網址（或沒有網址時：同日期＋同標題）＝同一組。組裡：
  //   沒填日期、或日期相同 → 修改那一筆（只覆蓋有填的欄位）
  //   填了不同的日期     → 另外一個事件（同一支影片在不同天發生的事）
  // 「隱藏」：沒填日期 → 整組都隱藏；有填日期 → 只隱藏那一天的
  const out=[], groups=new Map(), hideAll=new Set();
  const baseOf=e=>{ const v=vidOf(e.url); if(v) return "v:"+v; const u=linkOf(e.url); return u?"u:"+u.href:"d:"+normDate(e.date)+"|"+String(e.title||"").trim(); };
  const pick=(g,d)=>d?(g.find(x=>x.date&&normDate(x.date)===d)||g.find(x=>!x.date)):g[0];
  for(const src of [autoList,jsonList,sheetList]) for(const e of src||[]){ if(!e) continue;
    const b=baseOf(e), d=e.date?normDate(e.date):"", g=groups.get(b)||[]; groups.set(b,g);
    if(e.hide){
      if(!d){ hideAll.add(b); g.forEach(x=>x._hide=true); }
      else { const t=pick(g,d); if(t) t._hide=true; else g.push({date:d,_hide:true}); } // 先記下來，之後同一天的也隱藏
      continue; }
    const t=pick(g,d);
    if(t){ for(const f in e) if(e[f]!==""&&e[f]!=null&&e[f]!==false) t[f]=e[f]; }
    else { const c={...e}; for(const f in c) if(c[f]===""||c[f]===false) delete c[f];
      if(hideAll.has(b)) c._hide=true; g.push(c); out.push(c); } }
  return out.filter(e=>!e._hide);
}

// 手動加的（試算表、timeline.json）未來的直播／聯動沒有 upcoming 標記 → 日期在今天以後的自動當成「預定」
// （自動抓的由 YouTube API 判斷，已經有標記；今天的不自動加，因為不知道播了沒）
const UPCOMING_TYPES=new Set(["stream","collab"]);
function markUpcoming(list){
  const n=new Date(), today=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
  for(const e of list) if(!e.upcoming&&e.date&&UPCOMING_TYPES.has(e.type||"stream")&&normDate(e.date)>today) e.upcoming=true;
  return list;
}
// 讀三個來源並合併 → { raw: 合併後的事件, songs, refresh }
// refresh：試算表快取過期時，背景抓新的；有變動會 resolve 成新的 raw，沒變或失敗是 null
async function loadTimeline(opts={}){
  const arr=d=>Array.isArray(d)?d:[];
  const cached=TIMELINE_CSV_URL?readTlCache():null;
  const sheetP=cached?Promise.resolve(cached.text):TIMELINE_CSV_URL?fetchTlSheet().catch(e=>{ console.warn("timeline sheet failed",e); return ""; }):Promise.resolve("");
  let [autoL,jsonL,songL,sheetText]=await Promise.all([getJSON("timeline_auto.json"),getJSON("timeline.json"),opts.songs?getJSON("songs.json"):[],sheetP]);
  autoL=arr(autoL); jsonL=arr(jsonL);
  const merge=text=>markUpcoming(mergeSources(autoL,jsonL,sheetToEvents(text)));
  const refresh=cached&&Date.now()-cached.at>=TL_SHEET_TTL
    ?fetchTlSheet().then(t=>t!==cached.text?merge(t):null).catch(e=>{ console.warn("timeline sheet refresh failed",e); return null; }):null;
  return {raw:merge(sheetText),songs:arr(songL),refresh};
}
