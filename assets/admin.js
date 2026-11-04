/* 管理後台。真正的權限與資料存取限制由 supabase/admin-setup.sql 的 RPC/RLS 保護。 */
const ADMIN_SB_URL="https://qmpmejxmsfidilszqqkk.supabase.co";
const ADMIN_SB_KEY="sb_publishable_7wF1GaIca73NnLCbFaoL2g_-mH8UjfH";
const ADMIN_SB_SRC="assets/supabase.min.js?v=15269396";

addStrings({
 zh:{adminTitle:"管理後台",adminSub:"使用者暱稱與頭像審核",adminSignIn:"管理員登入",adminSignInText:"請使用已加入管理員名單的 Google 帳號。",adminGoogle:"以 Google 登入",adminDenied:"沒有管理權限",adminDeniedText:"此 Google 帳號不在管理員名單中。",adminSearch:"搜尋 email、暱稱或使用者 ID…",adminRefresh:"重新整理",adminNote:"移除內容會刪除雲端頭像檔案或暱稱。停用設定功能後，使用者仍可登入與同步收藏，但不能再修改對應資料。",adminUser:"使用者",adminFlags:"限制狀態",adminActions:"管理操作",adminNoUsers:"目前沒有使用者。",adminLoading:"正在載入…",adminLoadErr:"無法載入使用者清單。",adminRemoveAvatar:"移除頭像",adminRemoveNick:"移除暱稱",adminBanAvatar:"停用頭像上傳",adminAllowAvatar:"允許頭像上傳",adminBanNick:"停用暱稱設定",adminAllowNick:"允許暱稱設定",adminAvatarBanned:"已停用頭像上傳",adminNickBanned:"已停用暱稱設定",adminConfirmAvatar:"確定移除此使用者的頭像檔案與頭像網址？",adminConfirmNick:"確定清除此使用者的暱稱？",adminConfirmBan:"確定變更此使用者的設定權限？",adminApplied:"已更新使用者設定。",adminActionErr:"操作失敗。請確認資料庫已套用 admin-setup.sql。",adminNeedsSetup:"管理員權限尚未設定。請先套用管理員 SQL。"},
 ja:{adminTitle:"管理ページ",adminSub:"ユーザーのニックネームとアイコンの管理",adminSignIn:"管理者ログイン",adminSignInText:"管理者に登録された Google アカウントでログインしてください。",adminGoogle:"Google でログイン",adminDenied:"管理者権限がありません",adminDeniedText:"この Google アカウントは管理者として登録されていません。",adminSearch:"メール、ニックネーム、ユーザー ID を検索…",adminRefresh:"更新",adminNote:"削除すると、クラウド上のアイコンファイルまたはニックネームが削除されます。設定を停止しても、ログインやコレクションの同期は引き続き利用できます。",adminUser:"ユーザー",adminFlags:"制限",adminActions:"操作",adminNoUsers:"ユーザーはいません。",adminLoading:"読み込み中…",adminLoadErr:"ユーザー一覧を読み込めません。",adminRemoveAvatar:"アイコンを削除",adminRemoveNick:"ニックネームを削除",adminBanAvatar:"アイコン投稿を停止",adminAllowAvatar:"アイコン投稿を許可",adminBanNick:"ニックネーム設定を停止",adminAllowNick:"ニックネーム設定を許可",adminAvatarBanned:"アイコン投稿停止中",adminNickBanned:"ニックネーム設定停止中",adminConfirmAvatar:"このユーザーのアイコンファイルと URL を削除しますか？",adminConfirmNick:"このユーザーのニックネームを削除しますか？",adminConfirmBan:"このユーザーの設定権限を変更しますか？",adminApplied:"ユーザー設定を更新しました。",adminActionErr:"操作に失敗しました。admin-setup.sql が適用されているか確認してください。",adminNeedsSetup:"管理者権限が未設定です。管理者 SQL を先に適用してください。"},
 en:{adminTitle:"Admin",adminSub:"Review user nicknames and avatars",adminSignIn:"Administrator sign-in",adminSignInText:"Sign in with a Google account that has been added to the admin list.",adminGoogle:"Sign in with Google",adminDenied:"Admin access required",adminDeniedText:"This Google account is not on the administrator list.",adminSearch:"Search email, nickname, or user ID…",adminRefresh:"Refresh",adminNote:"Removing content deletes the cloud avatar file or nickname. Disabling a setting still allows sign-in and collection sync, but blocks changes to that profile field.",adminUser:"User",adminFlags:"Restrictions",adminActions:"Actions",adminNoUsers:"No users found.",adminLoading:"Loading…",adminLoadErr:"Could not load the user list.",adminRemoveAvatar:"Remove avatar",adminRemoveNick:"Remove nickname",adminBanAvatar:"Ban avatar uploads",adminAllowAvatar:"Allow avatar uploads",adminBanNick:"Ban nickname changes",adminAllowNick:"Allow nickname changes",adminAvatarBanned:"Avatar uploads banned",adminNickBanned:"Nickname changes banned",adminConfirmAvatar:"Remove this user's avatar file and profile URL?",adminConfirmNick:"Clear this user's nickname?",adminConfirmBan:"Change this user's profile permissions?",adminApplied:"User profile updated.",adminActionErr:"Action failed. Confirm that admin-setup.sql has been applied.",adminNeedsSetup:"Admin access is not set up yet. Apply the admin SQL first."}
});

addStrings({
 zh:{adPostsTitle:"#あちちみて 貼文審核",adPostsNote:"預設只列出被檢舉過或已下架的貼文。「恢復」＝確認沒問題（之後不會再被自動下架）；「永久刪除」＝同一則貼文也不能再被投稿；「停止投稿權」＝這位使用者不能再投稿。",adPostsAll:"顯示全部貼文",adPostCol:"貼文",adPostBy:"投稿人",adPostState:"狀態",
   adStVisible:"顯示中",adStHidden:"已下架",adStRemoved:"已永久刪除",adReports:"檢舉 {n}",adReviewed:"已審核",adBannedPost:"已停止投稿權",adRestore:"恢復",adHide:"下架",adRemove:"永久刪除",adBanPost:"停止投稿權",adAllowPost:"恢復投稿權",adNoPosts:"沒有需要處理的貼文。",adConfirmRemove:"永久刪除這則貼文？（同一則貼文也不能再被投稿）",adConfirmBanPost:"停止這位使用者的投稿權？"},
 ja:{adPostsTitle:"#あちちみて 投稿の管理",adPostsNote:"初期表示は通報された投稿と非表示の投稿のみです。「復元」＝問題なしと確認（以後は自動で非表示になりません）、「完全に削除」＝同じポストは再投稿もできません、「投稿を停止」＝そのユーザーは投稿できなくなります。",adPostsAll:"すべての投稿を表示",adPostCol:"投稿",adPostBy:"投稿者",adPostState:"状態",
   adStVisible:"表示中",adStHidden:"非表示",adStRemoved:"完全に削除",adReports:"通報 {n}",adReviewed:"確認済み",adBannedPost:"投稿停止中",adRestore:"復元",adHide:"非表示にする",adRemove:"完全に削除",adBanPost:"投稿を停止",adAllowPost:"投稿を再開",adNoPosts:"対応が必要な投稿はありません。",adConfirmRemove:"この投稿を完全に削除しますか？（同じポストは再投稿もできません）",adConfirmBanPost:"このユーザーの投稿を停止しますか？"},
 en:{adPostsTitle:"#あちちみて post review",adPostsNote:"By default only reported or hidden posts are listed. “Restore” = confirmed fine (it will not be auto-hidden again); “Delete forever” = the same post can't be submitted again; “Stop posting” = this user can no longer submit.",adPostsAll:"Show all posts",adPostCol:"Post",adPostBy:"Posted by",adPostState:"Status",
   adStVisible:"Visible",adStHidden:"Hidden",adStRemoved:"Deleted",adReports:"{n} report(s)",adReviewed:"Reviewed",adBannedPost:"Posting stopped",adRestore:"Restore",adHide:"Hide",adRemove:"Delete forever",adBanPost:"Stop posting",adAllowPost:"Allow posting",adNoPosts:"No posts need attention.",adConfirmRemove:"Delete this post forever? (The same post can't be submitted again.)",adConfirmBanPost:"Stop this user from submitting posts?"}
});
const $admin=id=>document.getElementById(id);
const escAdmin=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let adminClient=null, adminUsers=[], listReady=false, adminPosts=[], postsReady=false;
const adminState=(msg,err=false)=>{ const e=$admin("status"); if(e){e.textContent=msg||"";e.className="admin-status"+(err?" err":"");} };
function showAdmin(which){ for(const id of ["loginBox","adminBoard","denied"]) $admin(id).hidden=id!==which; $admin("postsBoard").hidden=which!=="adminBoard"; }
function loadSupabase(){ return new Promise((resolve,reject)=>{ if(window.supabase?.createClient)return resolve(); const s=document.createElement("script");s.src=ADMIN_SB_SRC;s.onload=resolve;s.onerror=()=>reject(new Error("Supabase client failed to load"));document.head.appendChild(s); }); }
async function loadUsers(){
  if(!adminClient)return; adminState(t("adminLoading"));
  try{
    const {data,error}=await adminClient.rpc("admin_list_users");
    if(error){console.warn("admin list failed",error);if(error.code==="42501"){showAdmin("denied");return;}adminState(error.code==="PGRST202"?t("adminNeedsSetup"):t("adminLoadErr"),true);return;}
    adminUsers=Array.isArray(data)?data:[];listReady=true;renderUsers();
  }catch(e){console.error("admin list request failed",e);adminState(t("adminLoadErr"),true);}
}
function renderUsers(){
  const q=$admin("search").value.trim().toLocaleLowerCase();
  const rows=adminUsers.filter(u=>[u.email,u.nickname,u.user_id].some(x=>String(x||"").toLocaleLowerCase().includes(q)));
  $admin("resultCount").textContent=`${rows.length} / ${adminUsers.length}`;
  $admin("users").innerHTML=rows.map(u=>{
    const label=u.nickname||u.email||String(u.user_id).slice(0,8), initial=String(label||"?").slice(0,1).toUpperCase();
    let avatarUrl="";try{const x=new URL(u.avatar_url||"");if(x.protocol==="https:"||x.protocol==="http:")avatarUrl=x.href;}catch(_){}
    const avatar=avatarUrl?`<img class="admin-avatar" src="${escAdmin(avatarUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.hidden=true">`:`<span class="admin-avatar" aria-hidden="true">${escAdmin(initial)}</span>`;
    const flags=[u.upload_banned?`<span class="admin-flag warn">${t("adminAvatarBanned")}</span>`:"",u.nickname_banned?`<span class="admin-flag warn">${t("adminNickBanned")}</span>`:""].filter(Boolean).join("")||"—";
    return `<tr><td><div class="admin-user">${avatar}<div><span class="admin-name">${escAdmin(u.nickname||t("setNickPh"))}</span><span class="admin-email">${escAdmin(u.email||"")}</span><span class="admin-id">${escAdmin(u.user_id)}</span></div></div></td><td><div class="admin-flags">${flags}</div></td><td><div class="admin-actions">
      <button type="button" class="danger" data-action="avatar" data-id="${escAdmin(u.user_id)}">${t("adminRemoveAvatar")}</button>
      <button type="button" class="danger" data-action="nickname" data-id="${escAdmin(u.user_id)}">${t("adminRemoveNick")}</button>
      <button type="button" data-action="upload-ban" data-id="${escAdmin(u.user_id)}" data-value="${!u.upload_banned}">${t(u.upload_banned?"adminAllowAvatar":"adminBanAvatar")}</button>
      <button type="button" data-action="nickname-ban" data-id="${escAdmin(u.user_id)}" data-value="${!u.nickname_banned}">${t(u.nickname_banned?"adminAllowNick":"adminBanNick")}</button>
      </div></td></tr>`;
  }).join("")||`<tr><td colspan="3" class="admin-disabled">${listReady?t("adminNoUsers"):t("adminLoading")}</td></tr>`;
}
async function moderate(button){
  const id=button.dataset.id, action=button.dataset.action;
  const confirmKey=action==="avatar"?"adminConfirmAvatar":action==="nickname"?"adminConfirmNick":"adminConfirmBan";
  if(!window.confirm(t(confirmKey)))return;
  const args={target_user_id:id,p_remove_nickname:action==="nickname",p_remove_avatar:action==="avatar",p_upload_banned:null,p_nickname_banned:null};
  if(action==="upload-ban")args.p_upload_banned=button.dataset.value==="true";
  if(action==="nickname-ban")args.p_nickname_banned=button.dataset.value==="true";
  button.disabled=true;adminState(t("adminLoading"));
  try{
    if(action==="avatar"){
      const storage=adminClient.storage.from("avatars");
      for(const path of [`${id}/avatar.webp`,`${id}/avatar.jpg`]){
        const {error}=await storage.remove([path]);
        if(error&&!(["404",404].includes(error.statusCode)||/not found|no such key/i.test(error.message||"")))throw error;
      }
    }
    const {error}=await adminClient.rpc("admin_moderate_profile",args);
    if(error){console.error("moderation failed",error);adminState(`${t("adminActionErr")} ${String(error.message||error).slice(0,180)}`,true);return;}
    adminState(t("adminApplied"));await loadUsers();
  }catch(e){console.error("moderation request failed",e);adminState(t("adminActionErr"),true);}
  finally{button.disabled=false;}
}
/* ===== #あちちみて 貼文審核（RPC：admin_ayatsumi_list／admin_ayatsumi_set／admin_ayatsumi_ban，在 supabase/ayatsumi-setup.sql） ===== */
const postsState=(msg,err=false)=>{ const e=$admin("postsStatus"); if(e){e.textContent=msg||"";e.className="admin-status"+(err?" err":"");} };
const xUrl=u=>/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+$/.test(String(u||""))?u:"";
async function loadPosts(){
  if(!adminClient)return; postsState(t("adminLoading"));
  try{
    const {data,error}=await adminClient.rpc("admin_ayatsumi_list",{p_all:$admin("postsAll").checked});
    if(error){console.warn("admin posts failed",error);postsState(error.code==="PGRST202"?t("adminNeedsSetup"):t("adminLoadErr"),true);return;}
    adminPosts=Array.isArray(data)?data:[];postsReady=true;postsState("");renderPosts();
  }catch(e){console.error("admin posts request failed",e);postsState(t("adminLoadErr"),true);}
}
function renderPosts(){
  $admin("postsCount").textContent=String(adminPosts.length);
  $admin("posts").innerHTML=adminPosts.map(p=>{
    const stKey={visible:"adStVisible",hidden:"adStHidden",removed:"adStRemoved"}[p.status]||"adStVisible", u=xUrl(p.url);
    const flags=[`<span class="admin-flag${p.status!=="visible"?" bad":""}">${t(stKey)}</span>`,p.report_count>0?`<span class="admin-flag warn">${escAdmin(t("adReports").replace("{n}",p.report_count))}</span>`:"",p.reviewed?`<span class="admin-flag">${t("adReviewed")}</span>`:""].join(" ");
    const id=escAdmin(p.id), uid=escAdmin(p.user_id);
    return `<tr><td>${u?`<a href="${escAdmin(u)}" target="_blank" rel="noopener noreferrer">@${escAdmin(p.handle)} ↗</a>`:escAdmin(p.handle)}${p.comment?`<span class="admin-email">「${escAdmin(p.comment)}」</span>`:""}<span class="admin-id">${escAdmin(String(p.created_at||"").slice(0,16).replace("T"," "))}</span></td>
      <td><span class="admin-name">${escAdmin(p.nickname||"—")}</span><span class="admin-email">${escAdmin(p.email||"")}</span>${p.banned?`<span class="admin-flag warn">${t("adBannedPost")}</span>`:""}</td>
      <td><div class="admin-flags">${flags}</div></td>
      <td><div class="admin-actions">
        ${p.status!=="visible"?`<button type="button" data-post="visible" data-id="${id}">${t("adRestore")}</button>`:`<button type="button" data-post="hidden" data-id="${id}">${t("adHide")}</button>`}
        ${p.status!=="removed"?`<button type="button" class="danger" data-post="removed" data-id="${id}">${t("adRemove")}</button>`:""}
        <button type="button" data-ban="${!p.banned}" data-user="${uid}">${t(p.banned?"adAllowPost":"adBanPost")}</button>
      </div></td></tr>`;
  }).join("")||`<tr><td colspan="4" class="admin-disabled">${postsReady?t("adNoPosts"):t("adminLoading")}</td></tr>`;
}
async function postAction(b){
  try{
    b.disabled=true; postsState(t("adminLoading"));
    if(b.dataset.post){ if(b.dataset.post==="removed"&&!window.confirm(t("adConfirmRemove")))return;
      const {error}=await adminClient.rpc("admin_ayatsumi_set",{p_id:Number(b.dataset.id),p_status:b.dataset.post}); if(error)throw error; }
    else { if(b.dataset.ban==="true"&&!window.confirm(t("adConfirmBanPost")))return;
      const {error}=await adminClient.rpc("admin_ayatsumi_ban",{p_user:b.dataset.user,p_banned:b.dataset.ban==="true"}); if(error)throw error; }
    postsState(t("adminApplied")); await loadPosts();
  }catch(e){console.error("post action failed",e);postsState(`${t("adminActionErr")} ${String(e&&e.message||e).slice(0,180)}`,true);}
  finally{b.disabled=false;}
}
async function signIn(){
  try{const {error}=await adminClient.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname}});
    if(error)throw error;
  }catch(e){console.error("admin sign-in failed",e);adminState(t("adminLoadErr"),true);}
}
async function initAdmin(){
  setLang(pickLang());
  try{
    await loadSupabase();adminClient=window.supabase.createClient(ADMIN_SB_URL,ADMIN_SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"}});
    const {data,error}=await adminClient.auth.getSession();if(error)throw error;
    if(/[?&]code=/.test(location.search))history.replaceState(null,"",location.pathname+location.hash);
    if(!data.session?.user){showAdmin("loginBox");return;}
    showAdmin("adminBoard");await loadUsers();loadPosts();
    adminClient.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){adminUsers=[];showAdmin("loginBox");}});
  }catch(e){console.error("admin init failed",e);showAdmin("loginBox");adminState(t("adminLoadErr"),true);}
}
$admin("signIn").addEventListener("click",signIn);
$admin("refresh").addEventListener("click",loadUsers);
$admin("signOut").addEventListener("click",async()=>{await adminClient.auth.signOut();showAdmin("loginBox");});
$admin("deniedOut").addEventListener("click",async()=>{await adminClient.auth.signOut();showAdmin("loginBox");});
$admin("search").addEventListener("input",renderUsers);
$admin("postsRefresh").addEventListener("click",loadPosts);
$admin("postsAll").addEventListener("change",loadPosts);
$admin("posts").addEventListener("click",e=>{const b=e.target.closest("button[data-post],button[data-ban]");if(b)postAction(b);});
$admin("users").addEventListener("click",e=>{const b=e.target.closest("button[data-action]");if(b)moderate(b);});
window.onLangChange=()=>{if(adminUsers.length||listReady)renderUsers();if(postsReady)renderPosts();};
document.addEventListener("DOMContentLoaded",initAdmin);
