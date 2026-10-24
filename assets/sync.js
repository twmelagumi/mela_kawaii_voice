/* 熱千めら めらめら出勤紀錄 — 收藏頁（周邊／音聲）的「雲端同步」：Google 登入（Supabase Auth）＋「已入手」存到 Supabase。
 * 要先載入 common.js、collect.js。沒登入時完全不動，跟以前一樣只存在瀏覽器（localStorage）。
 *
 * 資料表 public.collection（每人只能讀寫自己的列，靠 RLS）：user_id、kind（goods／voice）、item_id、qty（1–999）、updated_at
 * 同步方式：
 *   - 這台第一次跟某個帳號同步時，如果本機和雲端不一樣 → 跳出視窗讓使用者選：合併（數量取較多的）／用雲端的／用這台的
 *   - 之後：開頁面時先把「上次同步後在這台改的」補傳上去，再用雲端的紀錄（其他裝置改的）更新這台
 *   - 每次勾選／加減數量／匯入，頁面呼叫 MelaSync.push()：跟「上次同步的內容」比對，只傳有變的（0＝刪掉那列）
 *   - 連不上雲端（例如免費方案暫停）時，紀錄照樣存在這台，下次開頁面會再補傳
 * 測試期間：LOGIN_PUBLIC=false 時，網址加 ?login=1 才會出現登入區（記在 localStorage，?login=0 取消）；已經登入的人一直看得到。
 */
const MelaSync=(()=>{
  const SB_URL="https://qmpmejxmsfidilszqqkk.supabase.co";
  const SB_KEY="sb_publishable_7wF1GaIca73NnLCbFaoL2g_-mH8UjfH"; // publishable key：本來就是公開的，安全性靠資料表的 RLS
  const LOGIN_PUBLIC=false; // 正式公開登入時改成 true
  const SB_SRC="assets/supabase.min.js?v=202610250131"; // supabase-js 2.118.0（MIT），需要時才載入
  const TOKEN_KEY="sb-qmpmejxmsfidilszqqkk-auth-token", TEST_KEY="mela-login-test", LINK_KEY="mela-sync-link";

  addStrings({
   zh:{syLabel:"雲端",syLogin:"用 Google 登入同步",syLoginD:"登入後，「已入手」會存到雲端，換手機或電腦也看得到。",syAs:"已登入：{n}",syLogout:"登出",syDelete:"刪除雲端紀錄",
     syOk:"已同步",sySyncing:"同步中…",syOff:"連不上雲端，紀錄先存在這台，下次開頁面會再同步。",syNotLinked:"還沒同步：重新整理頁面後可以再選一次。",syErr:"登入失敗，請再試一次。",
     syPrivacy:"登入後會在本站的資料庫（Supabase）保存：你的 Google 帳號名稱與 email、你標記的已入手紀錄。之後的入手人數排行榜只會顯示人數，不會顯示是誰。可以隨時用「刪除雲端紀錄」刪掉。",
     syChTitle:"這台的紀錄和雲端不一樣",syChBody:"這台瀏覽器有 {a} 項已入手，雲端有 {b} 項。要怎麼處理？",syMerge:"合併兩邊（數量取較多的）",syUseCloud:"用雲端的紀錄（取代這台的）",syUseLocal:"用這台的紀錄（取代雲端的）",syLater:"先不要同步",
     syDelTitle:"刪除雲端紀錄",syDelBody:"會刪除你存在雲端的所有已入手紀錄（周邊和音聲）和登入帳號，並登出。這台瀏覽器裡的紀錄會保留。",syDelGo:"刪除",syCancel:"取消",syDeleted:"已刪除雲端紀錄並登出。"},
   ja:{syLabel:"クラウド",syLogin:"Google でログインして同期",syLoginD:"ログインすると「入手済み」がクラウドに保存され、スマホやパソコンを変えても見られます。",syAs:"ログイン中：{n}",syLogout:"ログアウト",syDelete:"クラウドの記録を削除",
     syOk:"同期済み",sySyncing:"同期中…",syOff:"クラウドにつながりません。記録はこの端末に保存し、次にページを開いたときに同期します。",syNotLinked:"まだ同期していません。ページを再読み込みすると選び直せます。",syErr:"ログインに失敗しました。もう一度お試しください。",
     syPrivacy:"ログインすると、当サイトのデータベース（Supabase）に Google アカウントの名前とメールアドレス、入手済みの記録が保存されます。今後の入手人数ランキングでは人数だけを表示し、誰かは表示しません。「クラウドの記録を削除」でいつでも削除できます。",
     syChTitle:"この端末とクラウドの記録が違います",syChBody:"このブラウザには {a} 件、クラウドには {b} 件の入手済みがあります。どうしますか？",syMerge:"両方を合わせる（個数は多いほう）",syUseCloud:"クラウドの記録を使う（この端末の記録を置き換え）",syUseLocal:"この端末の記録を使う（クラウドの記録を置き換え）",syLater:"今は同期しない",
     syDelTitle:"クラウドの記録を削除",syDelBody:"クラウドに保存した入手済みの記録（グッズとボイス）とログイン用アカウントをすべて削除し、ログアウトします。このブラウザの記録は残ります。",syDelGo:"削除する",syCancel:"キャンセル",syDeleted:"クラウドの記録を削除してログアウトしました。"},
   en:{syLabel:"Cloud",syLogin:"Sign in with Google to sync",syLoginD:"Sign in to save your \"owned\" list to the cloud and see it on any phone or computer.",syAs:"Signed in: {n}",syLogout:"Sign out",syDelete:"Delete cloud data",
     syOk:"Synced",sySyncing:"Syncing…",syOff:"Can't reach the cloud. Your list is saved on this device and will sync next time you open the page.",syNotLinked:"Not synced yet — reload the page to choose again.",syErr:"Sign-in failed. Please try again.",
     syPrivacy:"Signing in stores your Google account name and email and your \"owned\" list in this site's database (Supabase). A future ranking will only show how many people own each item, never who. You can delete it any time with \"Delete cloud data\".",
     syChTitle:"This device and the cloud don't match",syChBody:"This browser has {a} owned items and the cloud has {b}. What should we do?",syMerge:"Merge both (the larger count wins)",syUseCloud:"Use the cloud list (replaces this device)",syUseLocal:"Use this device's list (replaces the cloud)",syLater:"Don't sync for now",
     syDelTitle:"Delete cloud data",syDelBody:"This deletes everything you saved in the cloud (merch and voice) and your sign-in account, then signs you out. The list in this browser is kept.",syDelGo:"Delete",syCancel:"Cancel",syDeleted:"Cloud data deleted and signed out."}
  });

  let cfg=null, sb=null, user=null, state="out", last=null, timer=null, busy=false, row=null;
  const lsGet=(k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } };
  const lsSet=(k,v)=>{ try{ v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const lastKey=()=>`mela-sync-last-${cfg.kind}`;
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

  // ---- 畫面：在「備份」那一列上面多一列「雲端」 ----
  function paint(){ if(!row) return;
    const name=user?(user.user_metadata?.full_name||user.user_metadata?.name||user.email||""):"";
    const st={sync:t("sySyncing"),ok:t("syOk"),off:t("syOff"),wait:t("syNotLinked"),err:t("syErr")}[state]||"";
    row.innerHTML=`<span class="chips-label">${t("syLabel")}</span><div class="g-sync-in">
      ${user?`<div class="tags"><span class="g-sync-who">${esc(tfm("syAs",{n:name}))}</span><button type="button" class="chip" id="syOut">${t("syLogout")}</button><button type="button" class="chip" id="syDel">${t("syDelete")}</button></div>`
           :`<div class="tags"><button type="button" class="chip primary" id="syIn">${t("syLogin")}</button></div><p class="g-sync-d">${t("syLoginD")}</p>`}
      ${st?`<p class="g-sync-st ${state==="ok"?"ok":state==="sync"?"":"err"}" role="status">${esc(st)}</p>`:""}
      <p class="g-sync-d">${t("syPrivacy")} <a href="privacy.html">${t("privacyLink")}</a>・<a href="terms.html">${t("termsLink")}</a></p></div>`;
    const b=id=>document.getElementById(id);
    if(b("syIn")) b("syIn").onclick=login;
    if(b("syOut")) b("syOut").onclick=logout;
    if(b("syDel")) b("syDel").onclick=askDelete; }
  const setState=s=>{ state=s; paint(); };

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
      try{ await flush(); setState("ok"); }catch(e){ console.warn("sync push failed",e); setState("off"); } finally{ busy=false; } },700); }

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
      else pick=await dialog(t("syChTitle"),tfm("syChBody",{a:total(local),b:total(cloud)}),[
        {label:t("syMerge"),value:"merge",primary:true},{label:t("syUseCloud"),value:"cloud"},{label:t("syUseLocal"),value:"local"},{label:t("syLater"),value:null}]);
      if(!pick){ last=null; return setState("wait"); }
      if(pick==="cloud") adopt(cloud);
      else{ const target=pick==="merge"?new Map(cloud):new Map(); if(pick==="merge") for(const [k,n] of local) target.set(k,Math.max(n,target.get(k)||0)); else for(const [k,n] of local) target.set(k,n);
        last=cloud; cfg.set(target); await flush(); } // last＝雲端現況 → flush 只傳差別
      lsSet(LINK_KEY,{...(link.uid===user.id?link:{}),uid:user.id,[cfg.kind]:1}); setState("ok");
    }catch(e){ console.warn("sync start failed",e); last=null; setState("off"); } finally{ busy=false; } }

  async function login(){ try{ await loadLib(); sb=sb||mk();
      const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname}}); if(error) throw error; }
    catch(e){ console.warn("login failed",e); setState("err"); } }
  async function logout(){ try{ await sb.auth.signOut(); }catch(e){} user=null; last=null; lsSet(LINK_KEY,null); setState("out"); }
  async function askDelete(){ const ok=await dialog(t("syDelTitle"),t("syDelBody"),[{label:t("syDelGo"),value:1,primary:true},{label:t("syCancel"),value:null}]); if(!ok) return;
    setState("sync");
    try{ const r=await sb.rpc("delete_me"); if(r.error){ const d=await sb.from("collection").delete().eq("user_id",user.id); if(d.error) throw d.error; } // delete_me＝連帳號一起刪；沒建這個函式就只刪紀錄
      for(const k of ["goods","voice"]) lsSet(`mela-sync-last-${k}`,null);
      await logout(); alertMsg(t("syDeleted")); }catch(e){ console.warn("delete failed",e); setState("off"); } }
  const alertMsg=m=>{ const p=row?.querySelector(".g-sync-st")||Object.assign(document.createElement("p"),{className:"g-sync-st ok"}); p.textContent=m; p.className="g-sync-st ok"; if(!p.isConnected) row.querySelector(".g-sync-in").prepend(p); };
  const mk=()=>window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"}});

  /* 頁面呼叫：init({kind:"goods"|"voice", before:要插在哪個元素上面, get:()=>Map(id→數量), set:map=>{換掉這台的紀錄、存檔、重畫}})
   * get/set 之後由頁面在資料（試算表）讀完後呼叫 ready() 才開始同步 */
  function init(c){ cfg=c; if(!enabled()) return;
    row=document.createElement("div"); row.className="g-tools g-frow g-sync"; row.id="syncRow"; c.before.parentNode.insertBefore(row,c.before); paint(); }
  async function ready(){ if(!row) return;
    try{ await loadLib(); sb=mk();
      const {data}=await sb.auth.getSession(); user=data.session?.user||null;
      if(/[?&]code=/.test(location.search)) history.replaceState(null,"",location.pathname+location.hash); // 登入回來後把網址上的 code 拿掉
      sb.auth.onAuthStateChange((ev,s)=>{ if(ev==="SIGNED_OUT"){ user=null; paint(); } });
      if(user) await start(); else paint(); }
    catch(e){ console.warn("sync init failed",e); setState(localStorage.getItem(TOKEN_KEY)?"off":"err"); } }
  return {init,ready,push,paint};
})();
