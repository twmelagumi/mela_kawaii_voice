/* 熱千めら めらめら出勤紀錄 — 收藏頁（周邊 goods.html／音聲 voicegoods.html）共用的程式。要先載入 common.js。
 * 內容：兩頁共用的翻譯文字、網址／圖片／日期小工具、試算表 CSV 讀取（含快取）、頁首「花費」、已入手的 .json 備份（匯出／匯入）。
 * 各頁自己的部分（試算表欄位、畫面、已入手的資料格式）還是寫在各自的 html 裡。
 */
addStrings({
 zh:{haveLabel:"已入手",fAll:"全部",fHave:"已入手",fNot:"未入手",newFirst:"新 → 舊",oldFirst:"舊 → 新",
   shop:"官方商店",markHave:"標記已入手",isHave:"✓ 已入手",unmark:"取消已入手",noImage:"沒有圖片",spendLabel:"花費",
   spendShow:"按一下顯示／隱藏金額",spendMiss:"（未含 {n} 件沒有金額的）",haveNotice:"「已入手」只存在這台裝置的這個瀏覽器裡：換瀏覽器、換手機或電腦、使用無痕模式，或清除瀏覽紀錄／網站資料（Cookie）後都會不見。建議不時按「匯出備份」存一份檔案，之後可以用「匯入備份」還原，也能用來搬到其他裝置。",bkExport:"匯出備份",bkImport:"匯入備份",bkExported:"已下載備份檔（{n} 項）。",
   bkBad:"這不是本站的備份檔，或檔案損壞。",bkEmpty:"目前沒有勾選任何已入手，不需要備份。",emptyNot:"全部都入手了！"},
 ja:{haveLabel:"入手済み",fAll:"すべて",fHave:"入手済み",fNot:"未入手",newFirst:"新しい順",oldFirst:"古い順",
   shop:"公式ショップ",markHave:"入手済みにする",isHave:"✓ 入手済み",unmark:"入手済みを取り消す",noImage:"画像なし",spendLabel:"使った金額",
   spendShow:"押すと金額を表示／非表示",spendMiss:"（金額不明の {n} 件を除く）",haveNotice:"「入手済み」はこの端末のこのブラウザにだけ保存されます。ブラウザや端末を変えたとき、シークレット（プライベート）モードのとき、閲覧履歴やサイトデータ（Cookie）を消去したときは消えてしまいます。ときどき「バックアップを保存」でファイルに保存しておくと、「バックアップを読み込む」で元に戻したり、別の端末に移したりできます。",bkExport:"バックアップを保存",bkImport:"バックアップを読み込む",bkExported:"バックアップファイルを保存しました（{n} 件）。",
   bkBad:"このサイトのバックアップファイルではないか、ファイルが壊れています。",bkEmpty:"入手済みのチェックがまだないので、バックアップは不要です。",emptyNot:"全部そろいました！"},
 en:{haveLabel:"Owned",fAll:"All",fHave:"Owned",fNot:"Not yet",newFirst:"Newest first",oldFirst:"Oldest first",
   shop:"Official shop",markHave:"Mark as owned",isHave:"✓ Owned",unmark:"Unmark as owned",noImage:"No image",spendLabel:"Spent",
   spendShow:"Click to show / hide the amount",spendMiss:" (excl. {n} without a price)",haveNotice:"Your \"owned\" ticks are stored only in this browser on this device. They will be lost if you switch browsers or devices, use a private/incognito window, or clear your browsing history or site data (cookies). Use \"Export backup\" now and then to save a file — \"Import backup\" restores it, or moves your list to another device.",bkExport:"Export backup",bkImport:"Import backup",bkExported:"Backup downloaded ({n} items).",
   bkBad:"This isn't a backup file from this site, or it's damaged.",bkEmpty:"Nothing is marked as owned yet, so there's nothing to back up.",emptyNot:"You've got them all!"}
});

// 文字裡的 {n}、{m}… 換成數字
const tfm=(k,o)=>t(k).replace(/\{(\w)\}/g,(_,x)=>o[x]??"");
// 只接受 http(s) 網址（試算表的連結欄）
const webUrl=u=>{ try{ const x=new URL(String(u||"").trim()); return /^https?:$/.test(x.protocol)?x.href:""; }catch(e){ return ""; } };
// 官方商店的圖片讀小張一點
const smallImg=u=>{ try{ const x=new URL(u); if(x.hostname==="shop.hololivepro.com"&&x.pathname.startsWith("/cdn/")&&!x.searchParams.has("width")) x.searchParams.set("width","600"); return x.href; }catch(e){ return u; } };
const fmtDate=d=>d?d.replace(/-/g,"."):"";

const MelaCollect={
  /* 讀 Google 試算表發佈的 CSV：先用瀏覽器裡的快取（ttl 內直接用），沒有快取才等網路；
   * 快取過期時先用舊的畫，背景抓新的，有變才呼叫 onUpdate。
   * first(text)：第一次拿到資料（可能是空字串＝讀不到）；onUpdate(text)：背景更新後資料有變 */
  async loadSheet({url,key,ttl=5*60*1000},first,onUpdate){
    const read=()=>{ try{ const c=JSON.parse(localStorage.getItem(key)||"null"); return c&&typeof c.text==="string"&&c.at?c:null; }catch(e){ return null; } };
    const get=async()=>{ const r=await fetch(url+(url.includes("?")?"&":"?")+"_="+Date.now()); if(!r.ok) throw new Error("HTTP "+r.status);
      const text=await r.text(); try{ localStorage.setItem(key,JSON.stringify({text,at:Date.now()})); }catch(e){} return text; };
    const cached=read();
    first(cached?cached.text:await get().catch(e=>{ console.warn("sheet failed",key,e); return ""; }));
    if(cached&&Date.now()-cached.at>=ttl) get().then(t2=>{ if(t2!==cached.text) onUpdate(t2); }).catch(e=>console.warn("sheet refresh failed",key,e)); },

  /* 頁首的「花費」：預設隱藏金額，按一下顯示。entries() 回傳 [[金額或 null, 數量], …]（只給已入手的）
   * 回傳 update()，已入手有變時呼叫 */
  spend(entries){ let show=false;
    const update=()=>{ let sum=0, miss=0; for(const [price,n] of entries()){ if(!n) continue; if(price!=null) sum+=price*n; else miss++; }
      const b=$("spendBtn"); b.setAttribute("aria-pressed",show); b.title=t("spendShow");
      $("spendV").textContent=show?"¥"+sum.toLocaleString("ja-JP"):"¥ •••••";
      $("spendNote").hidden=!show; // 金額的註記：顯示金額時才出現
      $("spendMiss").hidden=!(show&&miss); $("spendMiss").textContent=miss?tfm("spendMiss",{n:miss}):""; };
    $("spendBtn").onclick=()=>{ show=!show; update(); };
    return update; },

  /* 已入手的 .json 備份：匯出成檔案、再匯入（合併，不會取消原本的勾選）
   * site：檔案裡的 site 欄位和檔名開頭；size()：目前已入手幾項；data()：寫進檔案的 {version, have}
   * merge(檔案內容)：讀不懂就丟錯誤，讀得懂就合併並回傳 {n:檔案裡幾項, m:新增或更新幾項} */
  backup({site,size,data,merge}){
    const msg=(text,cls)=>{ const m=$("bkMsg"); m.textContent=text; m.className="g-bk-msg "+cls; m.hidden=false; };
    $("bkExport").onclick=()=>{
      if(!size()) return msg(t("bkEmpty"),"");
      const d=new Date(), p2=n=>String(n).padStart(2,"0"), day=`${d.getFullYear()}${p2(d.getMonth()+1)}${p2(d.getDate())}`;
      const url=URL.createObjectURL(new Blob([JSON.stringify({site,...data(),exported:d.toISOString()},null,1)],{type:"application/json"}));
      const a=Object.assign(document.createElement("a"),{href:url,download:`${site}-backup-${day}.json`});
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      msg(tfm("bkExported",{n:size()}),"ok"); };
    $("bkImport").onclick=()=>{ $("bkFile").value=""; $("bkFile").click(); };
    $("bkFile").onchange=async e=>{ const f=e.target.files[0]; if(!f) return;
      try{ msg(tfm("bkImported",merge(JSON.parse(await f.text()))),"ok"); }catch(err){ msg(t("bkBad"),"err"); } }; }
};
