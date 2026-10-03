/* 熱千めら 聲音圖鑑 — shared code for index.html (voices) and songs.html (songs)
 * 這個檔案放兩個頁面共用的東西：語言切換、共用文字、時間/網址工具、頁面下方的播放器。
 * 頁面自己的內容（聲音卡片、歌單）寫在各自的 html 檔裡。
 *
 * 頁面要提供：
 *   addStrings({zh:{…},ja:{…},en:{…}})  加入自己頁面的翻譯文字
 *   window.onLangChange = () => {…}     語言切換後重畫頁面
 *   <body data-title-key="…">           分頁標題用哪個翻譯 key
 */

/* ===== 共用設定 ===== */
// 問題回報用 Google 表單的連結（例如 https://forms.gle/xxxx）。留空就不顯示頁尾的「問題回報」。
const REPORT_URL = "https://forms.gle/FqPYsz1eSLLuJKFM7";
// 頁尾的「最後更新」時間（台灣時間），每次 commit／push 前更新。留空就不顯示。
// 注意：改了這個檔案，記得把 index.html、songs.html 裡的 ?v= 版本號也一起改。
const LAST_UPDATED = "2026-10-03 16:05";

// GoatCounter 瀏覽統計（不用 Cookie）。換帳號時改這裡；留空就不統計。
const GOATCOUNTER_URL = "https://twmelagumi.goatcounter.com/count";
if(GOATCOUNTER_URL&&/^https?:$/.test(location.protocol)){ // 本機預覽（file://）不統計
  const gc=document.createElement("script"); gc.async=true; gc.src="https://gc.zgo.at/count.js"; gc.dataset.goatcounter=GOATCOUNTER_URL; document.head.appendChild(gc); }

/* ===== 共用翻譯 ===== */
const I18N={
 zh:{replay:"重播",openOriginal:"在 YouTube 開啟",openX:"在 X 開啟",close:"關閉",copy:"複製連結",copied:"已複製",sec:"秒",fromStart:"從頭",play:"播放",
   tabVoices:"聲音",tabSongs:"歌曲",tabTimeline:"編年史",artist:"原唱",pMinimize:"縮小播放器",
   playerNote:"ⓘ 本頁使用 YouTube 嵌入式播放，可能不會列入你的 YouTube 觀看紀錄。",pExpand:"展開播放器",pPause:"暫停",pPlay:"播放",
   footer:"非官方粉絲整理。所有聲音都來自原直播／推文，請多去看本人的直播。",
   officialLinks:"官方相關連結",unofficialLinks:"非官方連結",holoOfficial:"hololive 官方介紹",
   dcPromo:"友宣",dcLabel:"非官方粉絲 めら組 Discord 頻道",dcJoin:"歡迎加入一起討論",
   reportLabel:"網站有錯誤或問題？",reportLink:"問題回報 →",
   updatedLabel:"最後更新：",madeWith:"本網站使用 Claude 協助製作",
   rights:"本站為志工維護的非官方粉絲網站。影片由 hololive production 與熱千めら製作，影片的權利歸原創作者所有。"},
 ja:{replay:"もう一度",openOriginal:"YouTubeで開く",openX:"Xで開く",close:"閉じる",copy:"リンクをコピー",copied:"コピーしました",sec:"秒",fromStart:"最初から",play:"再生",
   tabVoices:"ボイス",tabSongs:"歌",tabTimeline:"年表",artist:"原曲",pMinimize:"プレーヤーを小さくする",
   playerNote:"ⓘ このページは YouTube の埋め込みプレーヤーで再生するため、ご自身の視聴履歴に残らない場合があります。",pExpand:"プレーヤーを開く",pPause:"一時停止",pPlay:"再生",
   footer:"非公式ファンまとめです。音声はすべて元の配信・ポストから。ぜひ本人の配信を見に行ってください。",
   officialLinks:"公式リンク",unofficialLinks:"非公式リンク",holoOfficial:"ホロライブ公式",
   dcPromo:"相互宣伝",dcLabel:"非公式ファン めら組 Discord サーバー",dcJoin:"お気軽にご参加ください。一緒に語りましょう！",
   reportLabel:"不具合や間違いを見つけたら",reportLink:"問題を報告 →",
   updatedLabel:"最終更新：",madeWith:"このサイトは Claude の協力で制作しました",
   rights:"当サイトは有志が運営する非公式ファンサイトです。動画はホロライブプロダクションおよび熱千めらが制作したもので、動画の権利は各制作者に帰属します。"},
 en:{replay:"Replay",openOriginal:"Open on YouTube",openX:"Open on X",close:"Close",copy:"Copy link",copied:"Copied",sec:"s",fromStart:"From start",play:"Play",
   tabVoices:"Voices",tabSongs:"Songs",tabTimeline:"Timeline",artist:"Original",pMinimize:"Minimize player",
   playerNote:"ⓘ Videos play in YouTube's embedded player, so they may not show up in your YouTube watch history.",pExpand:"Expand player",pPause:"Pause",pPlay:"Play",
   footer:"Unofficial fan collection. Every sound links back to the original stream or post — go watch her streams!",
   officialLinks:"Official links",unofficialLinks:"Unofficial links",holoOfficial:"hololive official page",
   dcPromo:"Cross-promotion",dcLabel:"Mela Gumi's unofficial fan Discord servers",dcJoin:"Come join us and chat!",
   reportLabel:"Found a bug or a mistake?",reportLink:"Report it →",
   updatedLabel:"Last updated:",madeWith:"Built with help from Claude",
   rights:"This site is an unofficial fan site maintained by volunteers. Videos were produced by Hololive Production and Achichi Mela; rights to the videos belong to their creators."}
};
function addStrings(more){ for(const l in more) Object.assign(I18N[l],more[l]); }

const $=id=>document.getElementById(id);
let lang="zh", current=null, ytPlayer=null, ytReady=null;

function pickLang(){ let l=null; try{l=localStorage.getItem("mela-lang")}catch(e){}
  if(!I18N[l]){ const n=(navigator.language||"").toLowerCase(); l=n.startsWith("ja")?"ja":n.startsWith("zh")?"zh":"en"; } return l; }
const t=k=>I18N[lang][k]??k;
function setLang(l){ lang=l; try{localStorage.setItem("mela-lang",l)}catch(e){}
  document.documentElement.lang={zh:"zh-Hant",ja:"ja",en:"en"}[l];
  const tk=document.body.dataset.titleKey; if(tk) document.title=`熱千めら ${t(tk)}`;
  document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>el.placeholder=t(el.dataset.i18nPh));
  document.querySelectorAll("[data-i18n-title]").forEach(el=>{ el.title=t(el.dataset.i18nTitle); el.setAttribute("aria-label",el.title); });
  updateToggle();
  document.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lang===l));
  showUpdated();
  if(typeof window.onLangChange==="function") window.onLangChange();
  if(current) fillInfo(current);
}

/* ===== 工具 ===== */
function fmt(s){ if(s==null) return ""; s=Math.max(0,Math.floor(s)); const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60,p=n=>String(n).padStart(2,"0"); return h?`${h}:${p(m)}:${p(x)}`:`${m}:${p(x)}`; }
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const playSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
const origUrl=c=>c.src==="youtube"?`https://www.youtube.com/watch?v=${encodeURIComponent(c.vid)}${c.start?`&t=${c.start}s`:""}`:c.url;
const dur=c=>(c.end!=null&&c.start!=null&&c.end>c.start)?c.end-c.start:null;
function metaHTML(c){ const d=dur(c); const time=c.start!=null?fmt(c.start)+(c.end!=null?" – "+fmt(c.end):""):(c.src==="youtube"?t("fromStart"):"");
  return `${c.artist?`<span>${t("artist")}: ${esc(c.artist)}</span>`:""}<span class="src">${c.src==="youtube"?"YouTube":"X"}</span>${time?`<span>${time}</span>`:""}${d?`<span>${d} ${t("sec")}</span>`:""}${c.streamDate?`<span>${esc(c.streamDate)}</span>`:""}`; }

// 時間 → 秒數。可吃 1:02:03、62:03、3723、試算表的「上午 12:01:40」或一天的小數
function parseTime(v){ if(typeof v==="number") return v; v=String(v??"").trim().replace(/[：]/g,":");
  if(/^\d*\.\d+$/.test(v)&&+v<1) return Math.round(+v*86400);
  v=v.replace(/\.\d+$/,""); if(!v) return null;
  const pm=/下午|午後|PM/i.test(v), am=/上午|午前|AM/i.test(v); v=v.replace(/上午|下午|午前|午後|AM|PM/gi,"").trim();
  if(/^\d+$/.test(v)) return +v; const p=v.split(":").map(Number); if(p.some(isNaN)||p.length>3) return null;
  if(p.length===3&&(am||pm)){ if(am&&p[0]===12) p[0]=0; if(pm&&p[0]<12) p[0]+=12; }
  return p.reduce((a,x)=>a*60+x,0); }
// YouTube / X 網址 → {src, vid, url, t}
function parseClipUrl(u){ try{ const url=new URL(String(u).trim()); const host=url.hostname.replace(/^www\.|^m\./,"");
    if(host==="youtu.be"||host.endsWith("youtube.com")){ let id=url.searchParams.get("v"); if(host==="youtu.be") id=url.pathname.slice(1).split("/")[0];
      const pm=url.pathname.match(/^\/(live|shorts|embed)\/([\w-]{6,})/); if(!id&&pm) id=pm[2]; if(!id) return null;
      const tt=url.searchParams.get("t")||url.searchParams.get("start"); let t=null;
      if(tt){ const m=tt.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/); t=m?(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0):null; }
      return {src:"youtube",vid:id,url:`https://www.youtube.com/watch?v=${id}`,t}; }
    if(["x.com","twitter.com","mobile.twitter.com"].includes(host)&&/\/status\/\d+/.test(url.pathname)) return {src:"x",url:url.origin+url.pathname};
  }catch(e){} return null; }
// Google 試算表發佈的 CSV → 二維陣列（聲音頁、編年史頁共用）
function parseCSV(text){ const rows=[]; let row=[],f="",q=false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=ch; }
    else if(ch==='"') q=true; else if(ch===","){ row.push(f); f=""; }
    else if(ch==="\n"||ch==="\r"){ if(ch==="\r"&&text[i+1]==="\n") i++; row.push(f); rows.push(row); row=[]; f=""; }
    else f+=ch; }
  if(f!==""||row.length){ row.push(f); rows.push(row); } return rows.filter(r=>r.some(c=>c.trim()!==""));
}
// 試算表的勾選欄：打勾（TRUE）或填 v、1、是、○ 都算
const isYes=v=>/^(true|v|y|yes|1|是|○|◯|✓|✔|x)$/i.test(String(v||"").trim());
// 日期 → YYYY-MM-DD。可吃 2026/9/30、9/30/2026、試算表序號 46295
function normDate(v){ v=String(v||"").trim(); const p2=n=>String(n).padStart(2,"0");
  if(/^\d{5}(\.\d+)?$/.test(v)){ const d=new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())}`; }
  let m=v.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/); if(m) return `${m[1]}-${p2(m[2])}-${p2(m[3])}`;
  m=v.match(/^(\d{1,2})\D(\d{1,2})\D(\d{4})/); if(m) return `${m[3]}-${p2(m[1])}-${p2(m[2])}`; return v||null; }

/* ===== 播放器（頁面下方） ===== */
function loadYT(){ if(ytReady) return ytReady; ytReady=new Promise(res=>{ window.onYouTubeIframeAPIReady=res; const s=document.createElement("script"); s.src="https://www.youtube.com/iframe_api"; document.head.appendChild(s); }); return ytReady; }
function fillInfo(c){ $("pTitle").textContent=c.title; $("pMeta").innerHTML=metaHTML(c); $("pOpen").href=origUrl(c); $("pOpen").textContent=c.src==="youtube"?t("openOriginal"):t("openX"); $("pReplay").hidden=c.src!=="youtube"; }
// 手動播放模式：只把影片載入播放器，要使用者自己按影片上的播放鍵（YouTube 只把按原生播放鍵的播放算進觀看次數）
// 歌單頁會依使用者的選擇設定；開啟時待播清單的自動連播也只會載入下一首，不自動播放
let manualPlay=false;
async function play(c){
  if(!c) return;
  current=c; $("player").hidden=false; document.body.classList.add("has-player"); fillInfo(c); isPlaying=!manualPlay; updateToggle();
  document.querySelectorAll(".playing").forEach(p=>p.classList.remove("playing"));
  document.querySelectorAll(`[data-id="${CSS.escape(c.id)}"]`).forEach(el=>el.classList.add("playing"));
  const stage=$("stage");
  if(c.src==="youtube"){
    const opts={videoId:c.vid,startSeconds:c.start||0}; if(c.end&&c.end>(c.start||0)) opts.endSeconds=c.end;
    if(ytPlayer&&stage.querySelector(".frame")){ manualPlay?ytPlayer.cueVideoById(opts):ytPlayer.loadVideoById(opts); return; }
    stage.innerHTML='<div class="frame"><div id="yt"></div></div>';
    await loadYT();
    ytPlayer=new YT.Player("yt",{videoId:c.vid,playerVars:{autoplay:manualPlay?0:1,playsinline:1,rel:0,start:c.start||0,...(opts.endSeconds?{end:opts.endSeconds}:{}),origin:location.origin},
      events:{onReady:e=>{ if(!manualPlay) e.target.playVideo(); },
        // 播完（含播到 end 時間）時通知頁面，歌單頁用來接下一首
        onStateChange:e=>{ isPlaying=e.data===1||e.data===3; updateToggle();
          if(e.data===0&&typeof window.onPlayerEnded==="function") window.onPlayerEnded(current,e.target); }}});
  }else{
    ytPlayer?.destroy?.(); ytPlayer=null;
    stage.innerHTML=`<div class="xframe"><blockquote class="twitter-tweet" data-dnt="true" data-theme="${matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}"><a href="${esc(c.url)}"></a></blockquote></div>`;
    if(window.twttr?.widgets) twttr.widgets.load(stage);
    else{ const s=document.createElement("script"); s.src="https://platform.twitter.com/widgets.js"; s.async=true; document.head.appendChild(s); }
  }
}
function replay(){ if(current&&current.src==="youtube"&&ytPlayer){ const o={videoId:current.vid,startSeconds:current.start||0}; if(current.end&&current.end>(current.start||0)) o.endSeconds=current.end; manualPlay?ytPlayer.cueVideoById(o):ytPlayer.loadVideoById(o);} }
/* ===== 縮小播放器：影片縮成畫面下方的小條，繼續播放，可以繼續看頁面 ===== */
let isPlaying=false;
const PAUSE_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
function setMini(on){ const p=$("player"); if(!p) return; p.classList.toggle("mini",on); document.body.classList.toggle("player-mini",on);
  try{ localStorage.setItem("mela-mini",on?"1":"0"); }catch(e){} }
function updateToggle(){ const b=$("mToggle"); if(!b) return; b.innerHTML=isPlaying?PAUSE_SVG:playSvg; b.title=t(isPlaying?"pPause":"pPlay"); b.setAttribute("aria-label",b.title);
  b.disabled=!(current&&current.src==="youtube");
  b.hidden=manualPlay; } // 手動播放模式不顯示（用網站按鈕開始播放不會算觀看次數）
function togglePlay(){ if(!ytPlayer||!ytPlayer.getPlayerState) return; if(ytPlayer.getPlayerState()===1) ytPlayer.pauseVideo(); else ytPlayer.playVideo(); }

function closePlayer(){ ytPlayer?.destroy?.(); ytPlayer=null; $("stage").innerHTML=""; $("player").hidden=true; document.body.classList.remove("has-player"); current=null; document.querySelectorAll(".playing").forEach(p=>p.classList.remove("playing"));
  if(typeof window.onPlayerClosed==="function") window.onPlayerClosed(); }

/* ===== 頁尾：最後更新時間 ===== */
function showUpdated(){ const el=$("updatedAt"); if(!el||!LAST_UPDATED) return; el.textContent=LAST_UPDATED; $("updated").hidden=false; }

/* ===== 共用事件 ===== */
document.addEventListener("click",e=>{ const b=e.target.closest("button[data-lang]"); if(b) setLang(b.dataset.lang); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&current) closePlayer(); });
document.addEventListener("DOMContentLoaded",()=>{ if($("pReplay")){ $("pReplay").onclick=replay; $("pClose").onclick=closePlayer; } // 編年史頁沒有播放器
  if($("pMin")){ $("pMin").onclick=()=>setMini(true); $("mMax").onclick=()=>setMini(false); $("mClose").onclick=closePlayer; $("mToggle").onclick=togglePlay;
    let m=false; try{ m=localStorage.getItem("mela-mini")==="1"; }catch(e){} setMini(m); updateToggle(); }
  const r=document.querySelector(".report"); if(r&&REPORT_URL){ $("reportLink").href=REPORT_URL; r.hidden=false; } });
