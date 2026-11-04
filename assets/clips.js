/* ===== 回音片段資料（voices.html 和首頁 index.html 共用） =====
 * 來源：clips.json＋Google 試算表（發佈成 CSV 的「公開」分頁，投稿表單的回覆）。
 * 試算表網址在這裡改：SHEET_CSV_URL（…/pub?gid=…&single=true&output=csv）。留空就只讀 clips.json。
 * 用法：const list=await MelaClips.load(newList=>{ …背景更新時重畫… });
 */
const MelaClips=(()=>{
  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIjhyIETZ-Ky_Nydc7RRi81T3SxLzJ0tROU5xJC9pYiPma7MWY4qhWxRoD9CQZVaPB6q00znizevlf/pub?gid=656485988&single=true&output=csv";
// 依標題文字找欄位，表單題目順序不同也沒關係
const COLS={ts:["時間戳記","タイムスタンプ","timestamp"],url:["網址","url","link","連結"],start:["開始","开始","start"],end:["結束","结束","終了","end"],title:["標題","タイトル","title"],
  quote:["台詞","セリフ","quote"],tags:["標籤","タグ","tag"],note:["備註","メモ","note"],date:["日期","配信日","date"],pick:["推薦","おすすめ","pick","recommend"]};
// 「推薦」欄：打勾（TRUE）或填 v、1、是、○ 都算推薦（isYes 在 common.js）
function sheetToClips(text){
  const rows=parseCSV(text); if(rows.length<2) return [];
  const head=rows[0].map(h=>h.trim().toLowerCase()); const idx={};
  for(const k in COLS) idx[k]=head.findIndex(h=>COLS[k].some(w=>h.includes(w.toLowerCase())));
  if(idx.end<0&&idx.start>=0) idx.end=idx.start+1; // 找不到「結束」就用開始時間的下一欄
  console.info("[mela] sheet columns",rows[0],idx);
  const get=(r,k)=>idx[k]>=0?(r[idx[k]]||"").trim():"";
  return rows.slice(1).map((r,i)=>{ const p=parseClipUrl(get(r,"url")); const title=get(r,"title"); if(!p||!title) return null;
    let start=parseTime(get(r,"start")); const end=parseTime(get(r,"end")); if(start==null&&p.t!=null) start=p.t;
    return {id:"g"+hash(get(r,"ts")+"|"+get(r,"url")+"|"+i).toString(36),src:p.src,vid:p.vid||null,url:p.url,start,end:(end!=null&&start!=null&&end<=start)?null:end,
      title,quote:get(r,"quote"),note:get(r,"note"),tags:[...new Set(get(r,"tags").split(/[,，、\s]+/).map(x=>x.split(/[／\/]/)[0].replace(/^[#＃]/,"").trim()).filter(Boolean))].slice(0,12),
      streamDate:normDate(get(r,"date")),pick:isYes(get(r,"pick")),addedAt:2e12+i}; }).filter(Boolean);
}
// Google 試算表 CSV 的快取：存在訪客瀏覽器（localStorage），SHEET_TTL 內不會再連 Google。
// 過期時先用舊資料立刻顯示，再在背景抓新的，有變動才重畫。
const SHEET_TTL = 5*60*1000; // 5 分鐘
const SHEET_KEY = "mela-sheet:"+hash(SHEET_CSV_URL);
function readSheetCache(){ try{ const c=JSON.parse(localStorage.getItem(SHEET_KEY)||"null"); return c&&typeof c.text==="string"&&c.at?c:null; }catch(e){ return null; } }
function writeSheetCache(text){ try{ localStorage.setItem(SHEET_KEY,JSON.stringify({text,at:Date.now()})); }catch(e){} }
async function fetchSheet(){
  const r=await fetch(SHEET_CSV_URL+(SHEET_CSV_URL.includes("?")?"&":"?")+"_="+Date.now());
  if(!r.ok) throw new Error("HTTP "+r.status);
  const text=await r.text(); writeSheetCache(text); return text;
}
function mergeClips(jsonClips,sheetClips){
  const seen=new Set(), out=[];
  const byKey={};
  for(const c of [...jsonClips,...sheetClips]){ const key=(c.vid||c.url)+"@"+(c.start??"");
    if(seen.has(key)){ if(c.pick) byKey[key].pick=true; continue; } // 重複的片段：只要任一邊標了推薦就算推薦
    seen.add(key); const copy={...c}; byKey[key]=copy; out.push(copy); }
  return out;
}
// 讀全部片段（clips.json＋試算表），回傳陣列。快取過期時先回傳舊資料，背景抓到新的、內容有變就呼叫 onUpdate(新陣列)
async function load(onUpdate){
  const jsonP=fetch("clips.json",{cache:"no-cache"}).then(r=>r.ok?r.json():[]).then(d=>(Array.isArray(d)?d:d.clips||[]).filter(c=>c&&c.title&&c.id)).catch(()=>[]);
  const cached=SHEET_CSV_URL?readSheetCache():null;
  let sheetText="";
  if(cached) sheetText=cached.text;                       // 有快取：先用快取，不等網路
  else if(SHEET_CSV_URL) sheetText=await fetchSheet().catch(e=>{ console.warn("sheet load failed",e); return ""; });
  const jsonClips=await jsonP, list=mergeClips(jsonClips,sheetToClips(sheetText));
  if(cached&&Date.now()-cached.at>=SHEET_TTL){            // 快取過期：背景更新，內容有變才通知
    fetchSheet().then(text=>{ if(text!==cached.text&&onUpdate) onUpdate(mergeClips(jsonClips,sheetToClips(text))); }).catch(e=>console.warn("sheet refresh failed",e));
  }
  return list;
}

return {load,sheetToClips};
})();
