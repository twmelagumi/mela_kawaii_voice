/* 熱千めら 聲音圖鑑 — shared code for index.html (voices) and songs.html (songs)
 * 這個檔案放兩個頁面共用的東西：語言切換、共用文字、時間/網址工具、頁面下方的播放器。
 * 頁面自己的內容（聲音卡片、歌單）寫在各自的 html 檔裡。
 *
 * 頁面要提供：
 *   addStrings({zh:{…},ja:{…},en:{…}})  加入自己頁面的翻譯文字
 *   window.onLangChange = () => {…}     語言切換後重畫頁面
 *   <body data-title-key="…">           分頁標題用哪個翻譯 key
 */

/* ===== 共用翻譯 ===== */
const I18N={
 zh:{replay:"重播",openOriginal:"在 YouTube 開啟",openX:"在 X 開啟",close:"關閉",copy:"複製連結",copied:"已複製",sec:"秒",fromStart:"從頭",play:"播放",
   tabVoices:"聲音",tabSongs:"歌曲",artist:"原唱",
   footer:"非官方粉絲整理。所有聲音都來自原直播／推文，請多去看本人的直播。"},
 ja:{replay:"もう一度",openOriginal:"YouTubeで開く",openX:"Xで開く",close:"閉じる",copy:"リンクをコピー",copied:"コピーしました",sec:"秒",fromStart:"最初から",play:"再生",
   tabVoices:"ボイス",tabSongs:"歌",artist:"原曲",
   footer:"非公式ファンまとめです。音声はすべて元の配信・ポストから。ぜひ本人の配信を見に行ってください。"},
 en:{replay:"Replay",openOriginal:"Open on YouTube",openX:"Open on X",close:"Close",copy:"Copy link",copied:"Copied",sec:"s",fromStart:"From start",play:"Play",
   tabVoices:"Voices",tabSongs:"Songs",artist:"Original",
   footer:"Unofficial fan collection. Every sound links back to the original stream or post — go watch her streams!"}
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
  document.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lang===l));
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
// 日期 → YYYY-MM-DD。可吃 2026/9/30、9/30/2026、試算表序號 46295
function normDate(v){ v=String(v||"").trim(); const p2=n=>String(n).padStart(2,"0");
  if(/^\d{5}(\.\d+)?$/.test(v)){ const d=new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())}`; }
  let m=v.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/); if(m) return `${m[1]}-${p2(m[2])}-${p2(m[3])}`;
  m=v.match(/^(\d{1,2})\D(\d{1,2})\D(\d{4})/); if(m) return `${m[3]}-${p2(m[1])}-${p2(m[2])}`; return v||null; }

/* ===== 播放器（頁面下方） ===== */
function loadYT(){ if(ytReady) return ytReady; ytReady=new Promise(res=>{ window.onYouTubeIframeAPIReady=res; const s=document.createElement("script"); s.src="https://www.youtube.com/iframe_api"; document.head.appendChild(s); }); return ytReady; }
function fillInfo(c){ $("pTitle").textContent=c.title; $("pMeta").innerHTML=metaHTML(c); $("pOpen").href=origUrl(c); $("pOpen").textContent=c.src==="youtube"?t("openOriginal"):t("openX"); $("pReplay").hidden=c.src!=="youtube"; }
async function play(c){
  if(!c) return;
  current=c; $("player").hidden=false; document.body.classList.add("has-player"); fillInfo(c);
  document.querySelectorAll(".playing").forEach(p=>p.classList.remove("playing"));
  document.querySelectorAll(`[data-id="${CSS.escape(c.id)}"]`).forEach(el=>el.classList.add("playing"));
  const stage=$("stage");
  if(c.src==="youtube"){
    const opts={videoId:c.vid,startSeconds:c.start||0}; if(c.end&&c.end>(c.start||0)) opts.endSeconds=c.end;
    if(ytPlayer&&stage.querySelector(".frame")){ ytPlayer.loadVideoById(opts); return; }
    stage.innerHTML='<div class="frame"><div id="yt"></div></div>';
    await loadYT();
    ytPlayer=new YT.Player("yt",{videoId:c.vid,playerVars:{autoplay:1,playsinline:1,rel:0,start:c.start||0,...(opts.endSeconds?{end:opts.endSeconds}:{}),origin:location.origin},
      events:{onReady:e=>e.target.playVideo()}});
  }else{
    ytPlayer?.destroy?.(); ytPlayer=null;
    stage.innerHTML=`<div class="xframe"><blockquote class="twitter-tweet" data-dnt="true" data-theme="${matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}"><a href="${esc(c.url)}"></a></blockquote></div>`;
    if(window.twttr?.widgets) twttr.widgets.load(stage);
    else{ const s=document.createElement("script"); s.src="https://platform.twitter.com/widgets.js"; s.async=true; document.head.appendChild(s); }
  }
}
function replay(){ if(current&&current.src==="youtube"&&ytPlayer){ const o={videoId:current.vid,startSeconds:current.start||0}; if(current.end&&current.end>(current.start||0)) o.endSeconds=current.end; ytPlayer.loadVideoById(o);} }
function closePlayer(){ ytPlayer?.destroy?.(); ytPlayer=null; $("stage").innerHTML=""; $("player").hidden=true; document.body.classList.remove("has-player"); current=null; document.querySelectorAll(".playing").forEach(p=>p.classList.remove("playing")); }

/* ===== 共用事件 ===== */
document.addEventListener("click",e=>{ const b=e.target.closest("button[data-lang]"); if(b) setLang(b.dataset.lang); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&current) closePlayer(); });
document.addEventListener("DOMContentLoaded",()=>{ $("pReplay").onclick=replay; $("pClose").onclick=closePlayer; });
