/* 熱千めら めらめら出勤紀錄 — 收藏頁（周邊／音聲）的「雲端同步」：Google 登入（Supabase Auth）＋「已入手」存到 Supabase。
 * 每一頁都載入（要先載入 common.js）：每頁標題列都有登入按鈕；同步只在有呼叫 init({kind,…}) 的收藏頁進行。沒登入時完全不動，跟以前一樣只存在瀏覽器（localStorage）。
 * 個人設定（頭像、暱稱）：資料表 public.profiles＋Storage 的 avatars bucket（頭像在瀏覽器裡先裁成正方形、縮成 256px webp、100KB 以內才上傳）。
 *
 * 資料表 public.collection（每人只能讀寫自己的列，靠 RLS）：user_id、kind（goods／voice）、item_id、qty（1–999）、updated_at
 * 同步方式：
 *   - 這台第一次跟某個帳號同步時，如果本機和雲端不一樣 → 跳出視窗讓使用者選：合併（數量取較多的）／用雲端的／用這台的
 *   - 之後：開頁面時先把「上次同步後在這台改的」補傳上去，再用雲端的紀錄（其他裝置改的）更新這台
 *   - 每次勾選／加減數量／匯入，頁面呼叫 MelaSync.push()：跟「上次同步的內容」比對，只傳有變的（0＝刪掉那列）
 *   - 連不上雲端（例如免費方案暫停）時，紀錄照樣存在這台，下次開頁面會再補傳
 * 畫面：標題列語言切換左邊的「Google 登入」按鈕；登入後變成頭像（右下角小圓點＝同步狀態），點了打開選單：名稱、email、狀態、立即同步、登出、刪除雲端紀錄。
 * Google 登入按鈕目前對所有訪客公開顯示。
 */
const MelaSync=(()=>{
  const SB_URL="https://qmpmejxmsfidilszqqkk.supabase.co";
  const SB_KEY="sb_publishable_7wF1GaIca73NnLCbFaoL2g_-mH8UjfH"; // publishable key：本來就是公開的，安全性靠資料表的 RLS
  const LOGIN_PUBLIC=true; // 公開顯示 Google 登入
  const SB_SRC="assets/supabase.min.js?v=202610250247"; // supabase-js 2.118.0（MIT），需要時才載入
  const TOKEN_KEY="sb-qmpmejxmsfidilszqqkk-auth-token", TEST_KEY="mela-login-test", LINK_KEY="mela-sync-link";

  addStrings({
   zh:{sySettings:"個人設定",setAvatar:"頭像（排行榜上顯示）",setPick:"選擇圖片",setRemove:"移除頭像",setNoteA:"會自動裁成正方形並縮小。上傳不當圖片會被移除並停用上傳。",setNick:"暱稱（排行榜上顯示，最多 24 字）",setNickPh:"沒填寫時顯示為「匿名」",setSave:"儲存",setSaving:"儲存中…",setSaved:"已儲存。",setFail:"儲存失敗，請再試一次。",setBig:"圖片太大了（上限 10MB）。",setType:"請選擇圖片檔（JPG、PNG、WebP…）。",setBad:"這張圖片讀不出來，請換一張。",setBanned:"你的頭像上傳功能已被停用。",setNickBanned:"你的暱稱設定功能已被停用。",setClose:"關閉",setPending:"按「儲存」後才會更新。",syBtn:"Google 登入",syMenu:"帳號與同步",sySyncNow:"立即同步",syOutNote:"登出後，紀錄仍會保留在這台裝置。",syGo:"用 Google 登入",syLabel:"雲端",syLogin:"用 Google 登入同步",syLoginD:"登入後，「已入手」會存到雲端，換手機或電腦也看得到。",syAs:"已登入：{n}",syLogout:"登出",syDelete:"刪除雲端紀錄",
     syOk:"已同步",sySyncing:"同步中…",syOff:"連不上雲端，紀錄先存在這台，下次開頁面會再同步。",syNotLinked:"還沒同步：按「立即同步」可以再選一次。",syErr:"登入失敗，請再試一次。",
     syPrivacy:"登入後會在本站的資料庫（Supabase）保存：你的 Google 帳號名稱與 email、你標記的已入手紀錄，以及你在「個人設定」填的暱稱和頭像。品項的入手人數只顯示人數；暱稱和頭像只有你設定了才會顯示在排行榜上。可以隨時用「刪除雲端紀錄」刪掉。",
     syChTitle:"這台的紀錄和雲端不一樣",syChBody:"這台瀏覽器有 {a} 項已入手，雲端有 {b} 項。要怎麼處理？",syMerge:"合併兩邊（數量取較多的）",syUseCloud:"用雲端的紀錄（取代這台的）",syUseLocal:"用這台的紀錄（取代雲端的）",syLater:"先不要同步",
     syDelTitle:"刪除雲端紀錄",syDelBody:"會刪除你存在雲端的所有已入手紀錄（周邊和音聲）、暱稱、頭像和登入帳號，並登出。這台瀏覽器裡的紀錄會保留。",syDelGo:"刪除",syCancel:"取消",syDeleted:"已刪除雲端紀錄並登出。"},
   ja:{sySettings:"個人設定",setAvatar:"アイコン（ランキングに表示）",setPick:"画像を選ぶ",setRemove:"アイコンを削除",setNoteA:"自動で正方形に切り抜いて縮小します。不適切な画像は削除され、アップロードが停止されます。",setNick:"ニックネーム（ランキングに表示、24 文字まで）",setNickPh:"未入力のときは「匿名」と表示",setSave:"保存",setSaving:"保存中…",setSaved:"保存しました。",setFail:"保存できませんでした。もう一度お試しください。",setBig:"画像が大きすぎます（上限 10MB）。",setType:"画像ファイル（JPG、PNG、WebP など）を選んでください。",setBad:"この画像は読み込めません。別の画像を選んでください。",setBanned:"アイコンのアップロードは停止されています。",setNickBanned:"ニックネームの設定は停止されています。",setClose:"閉じる",setPending:"「保存」を押すと反映されます。",syBtn:"Google ログイン",syMenu:"アカウントと同期",sySyncNow:"今すぐ同期",syOutNote:"ログアウトしても、記録はこの端末に残ります。",syGo:"Google でログイン",syLabel:"クラウド",syLogin:"Google でログインして同期",syLoginD:"ログインすると「入手済み」がクラウドに保存され、スマホやパソコンを変えても見られます。",syAs:"ログイン中：{n}",syLogout:"ログアウト",syDelete:"クラウドの記録を削除",
     syOk:"同期済み",sySyncing:"同期中…",syOff:"クラウドにつながりません。記録はこの端末に保存し、次にページを開いたときに同期します。",syNotLinked:"まだ同期していません。「今すぐ同期」で選び直せます。",syErr:"ログインに失敗しました。もう一度お試しください。",
     syPrivacy:"ログインすると、当サイトのデータベース（Supabase）に Google アカウントの名前とメールアドレス、入手済みの記録、「個人設定」で入力したニックネームとアイコンが保存されます。品目の入手人数は人数だけを表示し、ニックネームとアイコンは設定した場合にだけランキングに表示されます。「クラウドの記録を削除」でいつでも削除できます。",
     syChTitle:"この端末とクラウドの記録が違います",syChBody:"このブラウザには {a} 件、クラウドには {b} 件の入手済みがあります。どうしますか？",syMerge:"両方を合わせる（個数は多いほう）",syUseCloud:"クラウドの記録を使う（この端末の記録を置き換え）",syUseLocal:"この端末の記録を使う（クラウドの記録を置き換え）",syLater:"今は同期しない",
     syDelTitle:"クラウドの記録を削除",syDelBody:"クラウドに保存した入手済みの記録（グッズとボイス）、ニックネーム、アイコン、ログイン用アカウントをすべて削除し、ログアウトします。このブラウザの記録は残ります。",syDelGo:"削除する",syCancel:"キャンセル",syDeleted:"クラウドの記録を削除してログアウトしました。"},
   en:{sySettings:"Profile settings",setAvatar:"Avatar (shown on rankings)",setPick:"Choose image",setRemove:"Remove avatar",setNoteA:"Images are cropped to a square and shrunk automatically. Inappropriate images will be removed and uploading disabled.",setNick:"Nickname (shown on rankings, up to 24 characters)",setNickPh:"Shown as \"Anonymous\" if empty",setSave:"Save",setSaving:"Saving…",setSaved:"Saved.",setFail:"Couldn't save. Please try again.",setBig:"That image is too large (10MB max).",setType:"Please choose an image file (JPG, PNG, WebP…).",setBad:"This image can't be read. Please choose another one.",setBanned:"Avatar uploads are disabled for your account.",setNickBanned:"Nickname settings are disabled for your account.",setClose:"Close",setPending:"Changes apply when you press \"Save\".",syBtn:"Sign in",syMenu:"Account and sync",sySyncNow:"Sync now",syOutNote:"Your list stays on this device after you sign out.",syGo:"Sign in with Google",syLabel:"Cloud",syLogin:"Sign in with Google to sync",syLoginD:"Sign in to save your \"owned\" list to the cloud and see it on any phone or computer.",syAs:"Signed in: {n}",syLogout:"Sign out",syDelete:"Delete cloud data",
     syOk:"Synced",sySyncing:"Syncing…",syOff:"Can't reach the cloud. Your list is saved on this device and will sync next time you open the page.",syNotLinked:"Not synced yet — press \"Sync now\" to choose again.",syErr:"Sign-in failed. Please try again.",
     syPrivacy:"Signing in stores your Google account name and email, your \"owned\" list, and the nickname and avatar you set in \"Profile settings\" in this site's database (Supabase). Item rankings only show how many people own each item; your nickname and avatar appear on rankings only if you set them. You can delete it any time with \"Delete cloud data\".",
     syChTitle:"This device and the cloud don't match",syChBody:"This browser has {a} owned items and the cloud has {b}. What should we do?",syMerge:"Merge both (the larger count wins)",syUseCloud:"Use the cloud list (replaces this device)",syUseLocal:"Use this device's list (replaces the cloud)",syLater:"Don't sync for now",
     syDelTitle:"Delete cloud data",syDelBody:"This deletes everything you saved in the cloud (merch and voice lists, nickname and avatar) and your sign-in account, then signs you out. The list in this browser is kept.",syDelGo:"Delete",syCancel:"Cancel",syDeleted:"Cloud data deleted and signed out."}
  });

  let lastErr=null; // 最近一次的錯誤（顯示在狀態後面，方便查原因）
  const tfx=(k,o)=>t(k).replace(/\{(\w)\}/g,(_,x)=>o[x]??""); // 文字裡的 {n}… 換成數字（不依賴 collect.js）
  let profile=null; // public.profiles 的這個人：{nickname, avatar_url, upload_banned}
  let cfg=null, sb=null, user=null, state="out", last=null, timer=null, busy=false, box=null, open=false, notice="";
  const lsGet=(k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } };
  const lsSet=(k,v)=>{ try{ v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const lastKey=()=>`mela-sync-last-${cfg.kind}`;
  const syncing=()=>!!cfg?.kind; // 這一頁有沒有要同步的收藏（沒有＝只有帳號按鈕）
  const toMap=o=>new Map(Object.entries(o||{}).filter(([,n])=>n>=1));
  const fromMap=m=>Object.fromEntries(m);
  const same=(a,b)=>a.size===b.size&&[...a].every(([k,n])=>b.get(k)===n);
  const total=m=>m.size;

  // 測試旗標：?login=1 打開、?login=0 關掉
  (()=>{ const m=location.search.match(/[?&]login=([01])/); if(m) lsSet(TEST_KEY,m[1]==="1"?1:null); })();
  const enabled=()=>LOGIN_PUBLIC||!!lsGet(TEST_KEY,null)||!!localStorage.getItem(TOKEN_KEY)||/[?&]code=/.test(location.search);

  let libP=null;
  const loadLib=()=>libP||(libP=new Promise((res,rej)=>{ if(window.supabase?.createClient) return res();
    const s=document.createElement("script"); s.src=SB_SRC; s.onload=()=>res(); s.onerror=()=>rej(new Error("supabase-js")); document.head.appendChild(s); }));

  // ---- 畫面：標題列右上角（語言切換旁邊）的「Google 登入」按鈕／頭像，點了打開選單 ----
  const G_SVG='<svg class="acct-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  const gName=()=>user?(user.user_metadata?.full_name||user.user_metadata?.name||user.email||""):"";
  const who=()=>profile?.nickname||gName(); // 顯示名稱：有暱稱用暱稱，沒有用 Google 名稱
  const picUrl=()=>profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||"";
  const dotCls=()=>!syncing()?"none":({ok:"ok",sync:"sync"}[state]||(user?"bad":""));
  function paint(){ if(!box) return;
    const st={sync:t("sySyncing"),ok:t("syOk")+" ✓",off:t("syOff"),wait:t("syNotLinked"),err:t("syErr")}[state]||"";
    const errS=(state==="off"||state==="err")&&lastErr?` <small class="g-sync-err">（${esc(errText(lastErr))}）</small>`:"";
    const pic=picUrl();
    const btn=user
      ?`<button type="button" class="acct-av" id="syBtn" aria-haspopup="dialog" aria-expanded="${open}" aria-label="${esc(t("syMenu"))}" title="${esc(who())}">${pic?`<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:""}<span class="acct-ini" aria-hidden="true">${esc((who()||"?").slice(0,1).toUpperCase())}</span><i class="acct-dot ${dotCls()}"></i></button>`
      :`<button type="button" class="acct-in" id="syBtn" aria-haspopup="dialog" aria-expanded="${open}">${G_SVG}<span>${t("syBtn")}</span></button>`;
    const legal=`<p class="acct-small">${t("syPrivacy")} <a href="privacy.html">${t("privacyLink")}</a>・<a href="terms.html">${t("termsLink")}</a></p>`;
    const pop=!open?"":user
      ?`<div class="acct-pop" role="dialog" aria-label="${esc(t("syMenu"))}">
          ${notice?`<p class="g-sync-st ok">${esc(notice)}</p>`:""}
          <b class="acct-name">${esc(who())}</b>${user.email&&user.email!==who()?`<span class="acct-mail">${esc(user.email)}</span>`:""}
          ${st&&syncing()?`<p class="acct-st" role="status"><i class="acct-dot ${dotCls()}"></i><span>${esc(st)}${errS}</span></p>`:""}
          ${syncing()?`<button type="button" id="syNow">${t("sySyncNow")}</button>`:""}
          <button type="button" id="sySet">${t("sySettings")}</button>
          <button type="button" class="primary" id="syOut">${t("syLogout")}</button>
          <p class="acct-small">${t("syOutNote")}</p>
          <button type="button" class="acct-link" id="syDel">${t("syDelete")}</button>
          ${legal}</div>`
      :`<div class="acct-pop" role="dialog" aria-label="${esc(t("syBtn"))}">
          ${notice?`<p class="g-sync-st ok">${esc(notice)}</p>`:""}
          <b class="acct-name">${t("syLogin")}</b><p class="acct-small">${t("syLoginD")}</p>
          ${state==="err"?`<p class="g-sync-st err" role="status">${esc(st)}${errS}</p>`:""}
          <button type="button" class="primary acct-go" id="syIn">${G_SVG}<span>${t("syGo")}</span></button>
          ${legal}</div>`;
    box.innerHTML=btn+pop;
    const b=id=>document.getElementById(id);
    b("syBtn").onclick=e=>{ e.stopPropagation(); open=!open; if(!open) notice=""; paint(); };
    if(b("syIn")) b("syIn").onclick=login;
    if(b("syNow")) b("syNow").onclick=()=>{ if(!busy) start(); };
    if(b("sySet")) b("sySet").onclick=()=>{ open=false; paint(); openSettings(); };
    if(b("syOut")) b("syOut").onclick=logout;
    if(b("syDel")) b("syDel").onclick=()=>{ open=false; paint(); askDelete(); }; }
  // 點選單外面或按 Esc 關掉
  // 用 composedPath：選單裡的按鈕按下後會重畫，e.target 已經不在畫面上
  document.addEventListener("click",e=>{ if(open&&box&&!e.composedPath().includes(box)){ open=false; notice=""; paint(); } });
  document.addEventListener("keydown",e=>{ if(open&&e.key==="Escape"){ open=false; notice=""; paint(); document.getElementById("syBtn")?.focus(); } });
  const setState=s=>{ state=s; if(s==="ok"||s==="sync") lastErr=null; paint(); };
  const errText=e=>[e.code,e.status,e.message||String(e)].filter(Boolean).join(" ").slice(0,160);
  const fail=(where,e,s)=>{ console.warn(where,e); lastErr=e; setState(s); };

  // ---- 對話框（沿用收藏代碼的 .g-dlg 樣式） ----
  function dialog(title,body,buttons){ return new Promise(res=>{
    const d=document.createElement("dialog"); d.className="g-dlg";
    d.innerHTML=`<h2>${esc(title)}</h2><p class="g-share-d">${esc(body)}</p><div class="g-sync-btns">${buttons.map((x,i)=>`<button type="button" class="${x.primary?"primary":""}" data-i="${i}">${esc(x.label)}</button>`).join("")}</div>`;
    d.addEventListener("click",e=>{ const b=e.target.closest("button[data-i]"); if(b){ d.close(); res(buttons[+b.dataset.i].value); } });
    d.addEventListener("cancel",()=>res(null)); d.addEventListener("close",()=>setTimeout(()=>d.remove(),0));
    document.body.appendChild(d); d.showModal(); }); }

  // ---- 雲端讀寫 ----
  async function pull(){ const {data,error}=await sb.from("collection").select("item_id,qty").eq("kind",cfg.kind).limit(5000);
    if(error) throw error; return new Map(data.map(r=>[r.item_id,r.qty])); }
  async function write(ups,dels){ const now=new Date().toISOString();
    if(ups.length){ const {error}=await sb.from("collection").upsert(ups.map(([id,n])=>({user_id:user.id,kind:cfg.kind,item_id:id,qty:Math.min(999,n),updated_at:now})),{onConflict:"user_id,kind,item_id"}); if(error) throw error; }
    for(let i=0;i<dels.length;i+=100){ const {error}=await sb.from("collection").delete().eq("kind",cfg.kind).in("item_id",dels.slice(i,i+100)); if(error) throw error; } }
  // 把「現在這台」跟「上次同步的內容」的差別傳上去
  async function flush(){ if(!user||!last) return; const cur=cfg.get(), ups=[], dels=[];
    for(const [k,n] of cur) if(last.get(k)!==n) ups.push([k,n]);
    for(const k of last.keys()) if(!cur.has(k)) dels.push(k);
    if(!ups.length&&!dels.length) return;
    await write(ups,dels); last=new Map(cur); lsSet(lastKey(),fromMap(last)); }
  function push(){ if(!user||!last) return; clearTimeout(timer); timer=setTimeout(async()=>{
      if(busy) return push(); busy=true; setState("sync");
      try{ await flush(); setState("ok"); }catch(e){ fail("sync push failed",e,"off"); } finally{ busy=false; } },700); }

  // 用 list 取代這台的紀錄，並記成「已同步」
  const adopt=m=>{ last=new Map(m); lsSet(lastKey(),fromMap(last)); cfg.set(new Map(m)); };

  // 登入後（或開頁面時已經登入）：決定怎麼合併，然後同步
  async function start(){ busy=true; setState("sync");
    try{
      const link=lsGet(LINK_KEY,{}), linked=link.uid===user.id&&link[cfg.kind];
      if(linked){ last=toMap(lsGet(lastKey(),{})); await flush(); adopt(await pull()); return setState("ok"); }
      const cloud=await pull(), local=cfg.get();
      let pick="local";
      if(same(cloud,local)||!local.size) pick="cloud"; else if(!cloud.size) pick="local";
      else pick=await dialog(t("syChTitle"),tfx("syChBody",{a:total(local),b:total(cloud)}),[
        {label:t("syMerge"),value:"merge",primary:true},{label:t("syUseCloud"),value:"cloud"},{label:t("syUseLocal"),value:"local"},{label:t("syLater"),value:null}]);
      if(!pick){ last=null; return setState("wait"); }
      if(pick==="cloud") adopt(cloud);
      else{ const target=pick==="merge"?new Map(cloud):new Map(); if(pick==="merge") for(const [k,n] of local) target.set(k,Math.max(n,target.get(k)||0)); else for(const [k,n] of local) target.set(k,n);
        last=cloud; cfg.set(target); await flush(); } // last＝雲端現況 → flush 只傳差別
      lsSet(LINK_KEY,{...(link.uid===user.id?link:{}),uid:user.id,[cfg.kind]:1}); setState("ok");
    }catch(e){ last=null; fail("sync start failed",e,"off"); } finally{ busy=false; } }

  async function login(){ try{ await loadLib(); sb=sb||mk();
      const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname}}); if(error) throw error; }
    catch(e){ fail("login failed",e,"err"); } }
  async function logout(){ try{ await sb.auth.signOut(); }catch(e){} user=null; profile=null; last=null; lsSet(LINK_KEY,null); setState("out"); }
  async function askDelete(){ const ok=await dialog(t("syDelTitle"),t("syDelBody"),[{label:t("syDelGo"),value:1,primary:true},{label:t("syCancel"),value:null}]); if(!ok) return;
    setState("sync");
    try{ await sb.storage.from("avatars").remove(AV_FILES()).catch(()=>{}); // 頭像檔（Storage 不會跟著帳號一起刪）
      const r=await sb.rpc("delete_me"); if(r.error){ const d=await sb.from("collection").delete().eq("user_id",user.id); if(d.error) throw d.error; } // delete_me＝連帳號一起刪；沒建這個函式就只刪紀錄
      for(const k of ["goods","voice"]) lsSet(`mela-sync-last-${k}`,null);
      await logout(); notice=t("syDeleted"); open=true; paint(); }catch(e){ fail("delete failed",e,"off"); } }
  // ---- 個人設定：暱稱＋頭像 ----
  const AV_FILES=()=>[`${user.id}/avatar.webp`,`${user.id}/avatar.jpg`];
  async function loadProfile(){ try{ const {data,error}=await sb.from("profiles").select("nickname,avatar_url,upload_banned,nickname_banned").eq("user_id",user.id).maybeSingle();
      if(error) throw error; profile=data||null; }catch(e){ console.warn("profile load failed",e); profile=null; } }
  // 暱稱：去掉控制字元／看不見的字元、連續空白變一個、最多 24 個字
  const cleanNick=v=>Array.from(String(v||"").normalize("NFC").replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,"").replace(/\s+/g," ").trim()).slice(0,24).join("");
  // 頭像：裁成置中的正方形、縮成 256×256，存成 webp（不支援就 jpeg），壓到 100KB 以內
  async function shrink(file){
    if(!/^image\//.test(file.type)) throw new Error("type"); if(file.size>10*1024*1024) throw new Error("big");
    let img; try{ img=await createImageBitmap(file,{imageOrientation:"from-image"}); }
    catch(e){ img=await new Promise((res,rej)=>{ const u=URL.createObjectURL(file), i=new Image(); i.onload=()=>{ URL.revokeObjectURL(u); res(i); }; i.onerror=()=>{ URL.revokeObjectURL(u); rej(new Error("bad")); }; i.src=u; }); }
    const w=img.width||img.naturalWidth, h=img.height||img.naturalHeight; if(!w||!h) throw new Error("bad");
    const S=256, side=Math.min(w,h), c=document.createElement("canvas"); c.width=c.height=S;
    const g=c.getContext("2d"); g.imageSmoothingQuality="high"; g.drawImage(img,(w-side)/2,(h-side)/2,side,side,0,0,S,S);
    const toBlob=(type,q)=>new Promise(r=>c.toBlob(r,type,q)); let blob=null;
    for(const q of [0.85,0.75,0.65,0.5,0.4]){ blob=await toBlob("image/webp",q); if(!blob||blob.type!=="image/webp") blob=await toBlob("image/jpeg",q); if(blob&&blob.size<=100*1024) break; }
    if(!blob) throw new Error("bad"); return blob; }
  let setDlg=null;
  function openSettings(){ if(!user) return; setDlg?.remove();
    let pending=null, removeAv=false; // pending＝選好、還沒上傳的頭像；removeAv＝按了移除
    const d=setDlg=document.createElement("dialog"); d.className="g-dlg acct-set"; d.setAttribute("aria-labelledby","setT");
    const banned=!!profile?.upload_banned, nickBanned=!!profile?.nickname_banned;
    d.innerHTML=`<button type="button" class="g-dlg-x" data-x aria-label="${esc(t("setClose"))}">✕</button>
      <h2 id="setT">${t("sySettings")}</h2>
      <div class="set-av"><div class="set-pic" id="setPic"></div><div class="set-avr"><b>${t("setAvatar")}</b>
        <div class="g-bk-btns"><button type="button" id="setPick" ${banned?"disabled":""}>${t("setPick")}</button><button type="button" id="setRm">${t("setRemove")}</button></div></div></div>
      <input type="file" id="setFile" accept="image/*" hidden>
      <p class="g-share-d">${banned?esc(t("setBanned")):t("setNoteA")}</p>
      <label class="g-dlg-l" for="setNick">${t("setNick")}</label>
      <div class="set-nick"><input type="text" id="setNick" autocomplete="nickname" spellcheck="false" placeholder="${esc(t("setNickPh"))}" ${nickBanned?"disabled":""}><span id="setCnt"></span></div>
      ${nickBanned?`<p class="g-share-d">${esc(t("setNickBanned"))}</p>`:""}
      <p class="g-sync-st" id="setMsg" role="status"></p>
      <button type="button" class="primary" id="setSave">${t("setSave")}</button>`;
    document.body.appendChild(d);
    const $d=id=>d.querySelector("#"+id), msg=(m,cls)=>{ const e=$d("setMsg"); e.textContent=m||""; e.className="g-sync-st "+(cls||""); };
    const showPic=()=>{ const u=pending?URL.createObjectURL(pending):removeAv?"":(profile?.avatar_url||user.user_metadata?.avatar_url||"");
      $d("setPic").innerHTML=u?`<img src="${esc(u)}" alt="" referrerpolicy="no-referrer">`:`<span>${esc((who()||"?").slice(0,1).toUpperCase())}</span>`; };
    const nick=$d("setNick"); nick.value=profile?.nickname||"";
    const count=()=>{ const n=Array.from(nick.value).length; $d("setCnt").textContent=`${n}/24`; $d("setCnt").className=n>24?"over":""; };
    nick.oninput=count; count(); showPic();
    $d("setPick").onclick=()=>{ $d("setFile").value=""; $d("setFile").click(); };
    $d("setFile").onchange=async e=>{ const f=e.target.files[0]; if(!f) return;
      try{ pending=await shrink(f); removeAv=false; showPic(); msg(t("setPending")); }
      catch(err){ msg(t({type:"setType",big:"setBig"}[err.message]||"setBad"),"err"); } };
    $d("setRm").onclick=()=>{ pending=null; removeAv=true; showPic(); msg(t("setPending")); };
    d.querySelector("[data-x]").onclick=()=>d.close();
    d.addEventListener("close",()=>{ setTimeout(()=>d.remove(),0); if(setDlg===d) setDlg=null; });
    $d("setSave").onclick=async()=>{ const btn=$d("setSave"); btn.disabled=true; msg(t("setSaving"));
      try{ let avatar_url=profile?.avatar_url||null; const store=sb.storage.from("avatars");
        if(pending){ const ext=pending.type==="image/webp"?"webp":"jpg", path=`${user.id}/avatar.${ext}`;
          const up=await store.upload(path,pending,{upsert:true,contentType:pending.type,cacheControl:"3600"}); if(up.error) throw up.error;
          await store.remove(AV_FILES().filter(x=>x!==path)).catch(()=>{});
          avatar_url=store.getPublicUrl(path).data.publicUrl+"?v="+Date.now(); } // ?v＝換圖後瀏覽器才會重新抓
        else if(removeAv){ await store.remove(AV_FILES()).catch(()=>{}); avatar_url=null; }
        const nickname=nickBanned?(profile?.nickname||null):(cleanNick(nick.value)||null);
        const r=await sb.from("profiles").upsert({user_id:user.id,nickname,avatar_url,updated_at:new Date().toISOString()},{onConflict:"user_id"});
        if(r.error) throw r.error;
        profile={...(profile||{}),nickname,avatar_url}; pending=null; removeAv=false; nick.value=nickname||""; count(); showPic(); paint(); msg(t("setSaved"),"ok"); }
      catch(err){ console.warn("profile save failed",err); msg(t("setFail")+` （${errText(err)}）`,"err"); }
      finally{ btn.disabled=false; } };
    d.showModal(); }

  const mk=()=>window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"}});

  /* 收藏頁呼叫：init({kind:"goods"|"voice", get:()=>Map(id→數量), set:map=>{換掉這台的紀錄、存檔、重畫}})，資料（試算表）讀完後呼叫 ready() 才開始同步
   * 其他頁不用呼叫：DOMContentLoaded 時自動 init({}) ＋ ready()，只顯示帳號按鈕。按鈕放在標題列的語言切換左邊 */
  function init(c){ cfg=c||{}; if(!enabled()) return; const lang=document.querySelector("header .lang"); if(!lang) return;
    const top=document.createElement("div"); top.className="h-top"; lang.parentNode.insertBefore(top,lang);
    box=document.createElement("div"); box.className="acct"; top.append(box,lang); paint(); }
  async function ready(){ if(!box) return;
    try{ await loadLib(); sb=mk();
      const {data}=await sb.auth.getSession(); user=data.session?.user||null;
      if(/[?&]code=/.test(location.search)) history.replaceState(null,"",location.pathname+location.hash); // 登入回來後把網址上的 code 拿掉
      sb.auth.onAuthStateChange((ev,s)=>{ if(ev==="SIGNED_OUT"){ user=null; paint(); } });
      if(user){ await loadProfile(); paint(); if(syncing()) await start(); else setState("in"); } else paint(); }
    catch(e){ fail("sync init failed",e,localStorage.getItem(TOKEN_KEY)?"off":"err"); } }
  document.addEventListener("DOMContentLoaded",()=>{ if(!cfg){ init({}); ready(); } });
  // 換語言時重畫（不用每一頁自己呼叫 paint）
  new MutationObserver(()=>paint()).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  return {init,ready,push,paint};
})();
