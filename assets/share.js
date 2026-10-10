/* 收藏代碼：把「已入手」紀錄（周邊頁＋音聲頁）做成一段文字代碼／匯入連結／QR code，搬到其他裝置。
 * 周邊頁（goods.html）和音聲頁（voicegoods.html）共用。要先載入 common.js。
 *
 * 代碼格式（MELA1.＋base64url）：
 *   byte 0 = 版本（1）
 *   周邊：uvarint 數量 n，接 n 筆［4 bytes 雜湊（大端）＋ uvarint 入手數量］
 *   音聲：uvarint 數量 m，接 m 筆［4 bytes 雜湊］
 *   最後 2 bytes = 檢查碼（前面所有 bytes 的 FNV-1a 折成 16 位元）
 *   雜湊 = 「企劃代號|品名」（跟 localStorage 裡的 id 一樣）的 UTF-8 bytes 做 32 位元 FNV-1a。
 *   代碼裡看不出品名；匯入時用目前清單的 id 算雜湊來比對，所以品名改過／已下架的品項會對不上。
 * 匯入連結＝頁面網址＋「#r=代碼」（# 後面的內容不會送到伺服器）；QR code 的內容就是這個連結，用手機相機掃就會開站。
 * 兩頁的紀錄都放在同一個代碼裡：在其中一頁匯入，另一頁的部分先存在 localStorage（mela-share-pending），下次開那一頁時自動套用。
 */
const MelaShare=(()=>{
  const GK="mela-goods-have", VK="mela-voice-have", PK="mela-share-pending", PREFIX="MELA1.", QR_SRC="assets/qrcode.min.js?v=202610101642";
  addStrings({
   zh:{shOpen:"轉移到其他裝置",recLabel:"紀錄",shTitle:"轉移紀錄",shCopyCode:"複製代碼",shCopyLink:"複製連結",shLinkL:"匯入連結",shCodeL:"代碼",shPasteL:"在這台裝置匯入：貼上代碼或匯入連結",shClose:"關閉",shQrNote2:"在另一台裝置用相機掃描 QR code，或開啟匯入連結，確認後即可匯入。",shImport:"匯入",shCancel:"取消",shDownload:"下載圖片",shDesc:"代碼包含「周邊」和「音聲」兩頁已入手的紀錄，在任一頁匯入，兩頁都會套用。匯入是「合併」：不會取消你原本勾的，周邊數量取較多的。代碼裡只存每個品項的指紋（由企劃代號＋品名算出），看不出品名；匯入時會拿去對照目前網站上的清單。如果某個品項的品名或企劃代號後來被改過、或已從清單移除，就對不到、不會匯入，匯入後會告訴你有幾項沒對上。",
     shPlaceholder:"把代碼或匯入連結貼在這裡",shQrNote:"用手機相機掃描，會開啟本站並詢問是否匯入。",shQrDense:"紀錄比較多，QR code 很密；如果掃不到，請改用匯入連結或代碼。",shQrBig:"紀錄太多，QR code 放不下，請改用匯入連結或代碼。",
     shCopied:"已複製代碼（{n} 項）。",shLinkCopied:"已複製匯入連結（{n} 項）。",shCopyFail:"瀏覽器不讓網頁自動複製，文字已選取，請按 Ctrl+C（手機長按）複製。",
     shEmpty:"目前沒有已入手的紀錄。",shBad:"這不是有效的代碼：內容不完整或有錯字。",shBusy:"清單還沒載入完成，請稍後再試。",
     shDone:"已匯入：這一頁新增或更新 {m} 項。",shMiss:"有 {k} 項在目前的清單裡找不到（品名改過或已下架）。",shOther:"另一頁的 {o} 項會在下次開啟那一頁時自動套用。",
     shFound:"偵測到收藏紀錄代碼（周邊 {g} 項、音聲 {v} 項）。要匯入（合併到目前的紀錄）嗎？",shApplied:"已套用從另一頁匯入的紀錄：新增或更新 {m} 項。"},
   ja:{shOpen:"別の端末へ移す",recLabel:"記録",shTitle:"記録を移す",shCopyCode:"コードをコピー",shCopyLink:"リンクをコピー",shLinkL:"読み込みリンク",shCodeL:"コード",shPasteL:"この端末で読み込む：コードまたはリンクを貼り付け",shClose:"閉じる",shQrNote2:"別の端末のカメラで QRコードを読み取るか、読み込みリンクを開くと、確認のうえ読み込めます。",shImport:"読み込む",shCancel:"キャンセル",shDownload:"画像を保存",shDesc:"コードには「グッズ」と「ボイス」両方のページの入手済み記録が入っていて、どちらのページで読み込んでも両方に反映されます。読み込みは「統合」で、今チェックしているものは消えず、グッズの個数は多いほうが残ります。コードには各商品の指紋（企画コード＋品名から計算）しか入っておらず、品名は読めません。読み込み時に今のサイトの一覧と照合するため、品名や企画コードがあとで変更された商品、一覧から外された商品は一致せず読み込まれません（読み込み後に、一致しなかった件数をお知らせします）。",
     shPlaceholder:"コードまたは読み込みリンクをここに貼り付け",shQrNote:"スマホのカメラで読み取ると、このサイトが開いて読み込みの確認が出ます。",shQrDense:"記録が多いため QRコードが細かくなっています。読み取れないときは、読み込みリンクかコードをお使いください。",shQrBig:"記録が多すぎて QRコードに入りません。読み込みリンクかコードをお使いください。",
     shCopied:"コードをコピーしました（{n} 件）。",shLinkCopied:"読み込みリンクをコピーしました（{n} 件）。",shCopyFail:"ブラウザが自動コピーを許可しませんでした。文字を選択したので、Ctrl+C（スマホは長押し）でコピーしてください。",
     shEmpty:"入手済みの記録がまだありません。",shBad:"有効なコードではありません。内容が途中で切れているか、誤字があります。",shBusy:"一覧の読み込みがまだ終わっていません。少し待ってからもう一度お試しください。",
     shDone:"読み込みました：このページで {m} 件を追加・更新しました。",shMiss:"今の一覧に見つからないものが {k} 件ありました（品名の変更・取り下げなど）。",shOther:"もう一方のページの {o} 件は、そのページを次に開いたときに自動で反映されます。",
     shFound:"コレクションコードを検出しました（グッズ {g} 件、ボイス {v} 件）。今の記録に統合して読み込みますか？",shApplied:"もう一方のページで読み込んだ記録を反映しました：{m} 件を追加・更新。"},
   en:{shOpen:"Move to another device",recLabel:"Records",shTitle:"Move your records",shCopyCode:"Copy code",shCopyLink:"Copy link",shLinkL:"Import link",shCodeL:"Code",shPasteL:"Import on this device: paste a code or link",shClose:"Close",shQrNote2:"Scan the QR code with the other device's camera, or open the import link, then confirm to import.",shImport:"Import",shCancel:"Cancel",shDownload:"Download image",shDesc:"The code holds your owned items from both the Merch and Voice pages — import it on either page and both are updated. Importing is a merge: nothing you have already ticked is removed, and for merch the larger quantity is kept. The code stores only a fingerprint of each item (computed from its project code + name), so names can't be read from it; on import the fingerprints are matched against the current list on this site. If an item's name or project code was changed later, or the item was removed from the list, it won't match and won't be imported — you'll be told how many items didn't match.",
     shPlaceholder:"Paste the code or import link here",shQrNote:"Scan with your phone's camera: it opens this site and asks whether to import.",shQrDense:"You own a lot of items, so the QR code is dense. If it won't scan, use the import link or the code instead.",shQrBig:"Too many items to fit in a QR code. Please use the import link or the code.",
     shCopied:"Code copied ({n} items).",shLinkCopied:"Import link copied ({n} items).",shCopyFail:"Your browser blocked automatic copying. The text is selected — press Ctrl+C (long-press on mobile) to copy.",
     shEmpty:"Nothing is marked as owned yet.",shBad:"That isn't a valid code: it looks incomplete or has a typo.",shBusy:"The list hasn't finished loading. Please try again in a moment.",
     shDone:"Imported: {m} items added or updated on this page.",shMiss:"{k} items weren't found in the current list (renamed or removed).",shOther:"{o} items for the other page will be applied the next time you open it.",
     shFound:"Found a collection code ({g} merch, {v} voice items). Merge it into your current records?",shApplied:"Applied what you imported on the other page: {m} items added or updated."}
  });
  const tf=(k,o)=>t(k).replace(/\{(\w)\}/g,(_,x)=>o[x]??"");

  /* ---------- 編碼／解碼 ---------- */
  function fnv(bytes){ let h=0x811c9dc5; for(const b of bytes){ h^=b; h=Math.imul(h,16777619); } return h>>>0; }
  const h32=s=>fnv(new TextEncoder().encode(String(s)));
  const crc16=bytes=>{ const h=fnv(bytes); return ((h>>>16)^h)&0xffff; };
  function putVar(a,n){ while(n>=128){ a.push((n&127)|128); n=Math.floor(n/128); } a.push(n); }
  function readVar(b,st){ let n=0,m=1; for(let i=0;i<5;i++){ if(st.i>=b.length) throw 0; const x=b[st.i++]; n+=(x&127)*m; if(x<128) return n; m*=128; } throw 0; }
  const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const unb64=s=>{ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); };

  function readLocal(){ // 目前這個瀏覽器裡兩頁已入手的紀錄
    const goods=new Map(), voice=new Set();
    try{ const d=JSON.parse(localStorage.getItem(GK)||"null");
      if(Array.isArray(d)) d.forEach(id=>typeof id==="string"&&goods.set(id,1));
      else if(d&&typeof d==="object") for(const [id,n] of Object.entries(d)){ const k=Math.floor(+n); if(k>=1) goods.set(id,Math.min(k,999)); } }catch(e){}
    try{ const d=JSON.parse(localStorage.getItem(VK)||"null"); if(Array.isArray(d)) d.forEach(id=>typeof id==="string"&&voice.add(id)); }catch(e){}
    return {goods,voice}; }
  function encode(){ const {goods,voice}=readLocal(); if(!goods.size&&!voice.size) return {code:"",g:0,v:0};
    const g=new Map(); for(const [id,n] of goods) g.set(h32(id),Math.max(g.get(h32(id))||0,n)); // 雜湊撞到時取數量較多的
    const v=new Set([...voice].map(h32));
    const a=[1]; putVar(a,g.size);
    for(const [h,n] of [...g].sort((x,y)=>x[0]-y[0])){ a.push(h>>>24,(h>>>16)&255,(h>>>8)&255,h&255); putVar(a,n); }
    putVar(a,v.size); for(const h of [...v].sort((x,y)=>x-y)) a.push(h>>>24,(h>>>16)&255,(h>>>8)&255,h&255);
    const c=crc16(a); a.push(c>>8,c&255);
    return {code:PREFIX+b64(a),g:g.size,v:v.size}; }
  // 接受：代碼、含 #r=代碼 的連結；回傳 {goods:[[雜湊,數量]…], voice:[雜湊…]}，壞掉的回 null
  function decode(text){ try{
    let s=String(text||"").trim(); const m=s.match(/[#?&]r=([^&#\s]+)/); if(m) s=m[1];
    s=s.replace(/\s+/g,""); if(!s.startsWith(PREFIX)) return null;
    const b=unb64(s.slice(PREFIX.length)); if(b.length<5||b[0]!==1) return null;
    const body=b.slice(0,-2), c=crc16(body); if(((b[b.length-2]<<8)|b[b.length-1])!==c) return null;
    const st={i:1}, rd=()=>{ if(st.i+4>body.length) throw 0; const h=((body[st.i]<<24)|(body[st.i+1]<<16)|(body[st.i+2]<<8)|body[st.i+3])>>>0; st.i+=4; return h; };
    const goods=[], voice=[]; const n=readVar(body,st); for(let i=0;i<n;i++){ const h=rd(), q=readVar(body,st); if(q<1) throw 0; goods.push([h,Math.min(q,999)]); }
    const k=readVar(body,st); for(let i=0;i<k;i++) voice.push(rd());
    if(st.i!==body.length) return null;
    return {goods,voice}; }catch(e){ return null; } }
  const shareUrl=code=>location.origin==="null"||location.protocol==="file:"?location.href.split("#")[0]+"#r="+code:location.origin+location.pathname+"#r="+code;

  /* ---------- 另一頁的部分先存起來 ---------- */
  const readPending=()=>{ try{ const p=JSON.parse(localStorage.getItem(PK)||"null"); return p&&typeof p==="object"?{goods:Array.isArray(p.goods)?p.goods:[],voice:Array.isArray(p.voice)?p.voice:[]}:{goods:[],voice:[]}; }catch(e){ return {goods:[],voice:[]}; } };
  const writePending=p=>{ try{ if(!p.goods.length&&!p.voice.length) localStorage.removeItem(PK); else localStorage.setItem(PK,JSON.stringify(p)); }catch(e){} };
  function stash(kind,entries){ if(!entries.length) return; const p=readPending();
    if(kind==="goods"){ const m=new Map(p.goods); for(const [h,q] of entries) m.set(h,Math.max(m.get(h)||0,q)); p.goods=[...m]; }
    else p.voice=[...new Set([...p.voice,...entries])];
    writePending(p); }

  /* ---------- 畫面 ---------- */
  let cfg=null, el={}, bn=null; // bn：匯入橫幅（文字要跟著語言換）
  const $s=id=>document.getElementById(id);
  const dlgOpen=()=>!!(el.dlg&&el.dlg.open);
  function say(text,cls){ const m=dlgOpen()?el.msg:$s("bkMsg"); if(!m) return; if(m!==el.msg&&el.msg) el.msg.hidden=true; if(m===el.msg){ const o=$s("bkMsg"); if(o) o.hidden=true; }
    m.textContent=text; m.className="g-bk-msg g-share-msg "+(cls||""); m.hidden=!text; }
  function paintBanner(){ if(!bn) return; bn.p.textContent=tf("shFound",{g:bn.d.goods.length,v:bn.d.voice.length}); bn.yes.textContent=t("shImport"); bn.no.textContent=t("shCancel"); }
  function hideMsg(){ if(el.msg) el.msg.hidden=true; const x=$s("shX"); if(x) x.setAttribute("aria-label",t("shClose")); if(bn&&!bn.b.isConnected) bn=null; paintBanner(); }
  // 把代碼裡這一頁的部分合併進目前的清單。回傳 {changed,found,missing}
  function applyEntries(entries){ // entries：周邊 [[h,q]]、音聲 [h]
    const ids=cfg.ids(), by=new Map(); for(const id of ids){ const h=h32(id); (by.get(h)||by.set(h,[]).get(h)).push(id); }
    const hits=[]; let found=0;
    for(const e of entries){ const h=Array.isArray(e)?e[0]:e, q=Array.isArray(e)?e[1]:1, list=by.get(h); if(!list) continue; found++; for(const id of list) hits.push([id,q]); }
    const changed=hits.length?cfg.merge(hits):0; return {changed,found,missing:entries.length-found}; }
  function importPayload(p){ // 這一頁用自己的部分，另一頁的部分先存起來
    const mine=cfg.kind==="goods"?p.goods:p.voice, other=cfg.kind==="goods"?p.voice:p.goods;
    const r=applyEntries(mine); stash(cfg.kind==="goods"?"voice":"goods",other);
    return {...r,other:other.length}; }
  function report(r){ const parts=[tf("shDone",{m:r.changed})]; if(r.missing) parts.push(tf("shMiss",{k:r.missing})); if(r.other) parts.push(tf("shOther",{o:r.other})); say(parts.join(" "),"ok"); }

  async function copyText(text,field,okKey,n){
    try{ await navigator.clipboard.writeText(text); say(tf(okKey,{n}),"ok"); }
    catch(e){ field.focus(); field.select(); say(t("shCopyFail"),"err"); } }

  let qrP=null; const loadQR=()=>qrP||(qrP=new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=QR_SRC; s.onload=()=>res(window.qrcode); s.onerror=()=>rej(new Error("qr")); document.head.appendChild(s); }));
  async function drawQR(url){
    let qr; try{ const lib=await loadQR(); qr=lib(0,"L"); qr.addData(url); qr.make(); }catch(err){ return false; }
    const n=qr.getModuleCount(), q=4, scale=Math.max(4,Math.ceil(720/(n+2*q))), px=(n+2*q)*scale, c=el.cv; c.width=c.height=px;
    const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,px,px); g.fillStyle="#000";
    for(let r=0;r<n;r++) for(let k=0;k<n;k++) if(qr.isDark(r,k)) g.fillRect((k+q)*scale,(r+q)*scale,scale,scale);
    return true; }
  // 打開視窗／匯入後：用目前的紀錄重新產生代碼、連結、QR code
  async function refresh(){ const e=encode(), has=!!e.code; el.mine.hidden=!has; el.empty.hidden=has; if(!has) return;
    const url=shareUrl(e.code); el.link.value=url; el.code.value=e.code; el.n=e.g+e.v;
    const ok=await drawQR(url); el.qrBox.hidden=!ok; if(!ok){ say(t("shQrBig"),"err"); return; }
    el.qrNote.textContent=t("shQrNote2")+(url.length>1000?" "+t("shQrDense"):""); }
  function openDlg(){ hideMsg(); say("",""); el.ta.value=""; if(!el.dlg.open) el.dlg.showModal(); refresh(); }

  function init(c){ cfg=c;
    const d=document.createElement("dialog"); d.className="g-dlg"; d.id="shDlg"; d.setAttribute("aria-labelledby","shDT");
    d.innerHTML=`<button type="button" class="g-dlg-x" id="shX" aria-label="">✕</button>
      <h2 id="shDT" data-i18n="shTitle"></h2>
      <p class="g-share-d" data-i18n="haveNotice"></p><p class="g-share-d" data-i18n="shDesc"></p>
      <p class="g-share-d" id="shEmpty" data-i18n="shEmpty" hidden></p>
      <div id="shMine">
        <div class="g-share-qr" id="shQr"><canvas id="shCv" role="img" aria-label="QR code"></canvas><div><p id="shQrNote" class="g-share-d"></p><button type="button" id="shDl" data-i18n="shDownload"></button></div></div>
        <label class="g-dlg-l" for="shLink" data-i18n="shLinkL"></label>
        <div class="g-dlg-row"><input type="text" id="shLink" readonly spellcheck="false"><button type="button" class="primary" id="shCopyLink" data-i18n="shCopyLink"></button></div>
        <label class="g-dlg-l" for="shCode" data-i18n="shCodeL"></label>
        <div class="g-dlg-row"><input type="text" id="shCode" readonly spellcheck="false"><button type="button" id="shCopyCode" data-i18n="shCopyCode"></button></div>
      </div>
      <hr class="g-dlg-hr">
      <label class="g-dlg-l" for="shTa" data-i18n="shPasteL"></label>
      <textarea id="shTa" rows="2" spellcheck="false" autocomplete="off" data-i18n-ph="shPlaceholder"></textarea>
      <div class="g-bk-btns"><button type="button" class="primary" id="shGo" data-i18n="shImport"></button></div>
      <p class="g-bk-msg g-share-msg" id="shMsg" role="status" aria-live="polite" hidden></p>`;
    document.body.appendChild(d);
    el={dlg:d,msg:$s("shMsg"),cv:$s("shCv"),qrBox:$s("shQr"),qrNote:$s("shQrNote"),mine:$s("shMine"),empty:$s("shEmpty"),link:$s("shLink"),code:$s("shCode"),ta:$s("shTa"),n:0};
    $s("shOpen").onclick=openDlg; $s("shX").onclick=()=>d.close();
    d.addEventListener("click",e=>{ if(e.target===d) d.close(); }); // 點視窗外面關閉
    $s("shCopyLink").onclick=()=>copyText(el.link.value,el.link,"shLinkCopied",el.n);
    $s("shCopyCode").onclick=()=>copyText(el.code.value,el.code,"shCopied",el.n);
    for(const f of [el.link,el.code]) f.onfocus=()=>f.select();
    $s("shDl").onclick=()=>el.cv.toBlob(b=>{ const u=URL.createObjectURL(b), a=Object.assign(document.createElement("a"),{href:u,download:"mela-collection-qr.png"}); document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1000); });
    $s("shGo").onclick=()=>{ if(!cfg.ids().length) return say(t("shBusy"),"err");
      const x=decode(el.ta.value); if(!x) return say(t("shBad"),"err");
      report(importPayload(x)); el.ta.value=""; refresh(); };
  }
  // 頁面資料載入、畫好之後呼叫：先套用另一頁存下來的部分，再處理網址裡的 #r=代碼
  function ready(){ if(!cfg||!cfg.ids().length) return;
    const p=readPending(), mine=cfg.kind==="goods"?p.goods:p.voice;
    if(mine.length){ const r=applyEntries(mine); if(cfg.kind==="goods") p.goods=[]; else p.voice=[]; writePending(p); if(r.changed) say(tf("shApplied",{m:r.changed}),"ok"); }
    const m=location.hash.match(/^#r=/); if(!m) return; const d=decode(location.hash);
    history.replaceState(null,"",location.pathname+location.search);
    if(!d) return say(t("shBad"),"err");
    const sec=cfg.panel.closest("section")||document.body, b=document.createElement("div"); b.className="g-share-banner"; b.setAttribute("role","alert");
    b.innerHTML=`<p></p><div class="g-bk-btns"><button type="button" class="primary"></button><button type="button"></button></div>`;
    const [yes,no]=b.querySelectorAll("button"); bn={b,d,p:b.querySelector("p"),yes,no}; paintBanner();
    yes.onclick=()=>{ report(importPayload(d)); b.remove(); cfg.panel.scrollIntoView({block:"center",behavior:"smooth"}); }; no.onclick=()=>b.remove();
    sec.prepend(b); }
  return {init,ready,hideMsg,encode,decode,h32};
})();
