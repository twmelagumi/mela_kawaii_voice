/* 熱千めら めらめら出勤紀錄 — 成員清單（聯動對象、合唱對象的名字旁邊顯示 YouTube 頻道頭像）
 * 資料：
 *   members.json       手動維護的成員清單：[{ "name": "顯示用的名字", "aliases": ["別名", …], "channel": "@handle 或頻道網址" }, …]
 *   members_auto.json  GitHub Actions（daily-update.yml／scripts/update_members.py）用 YouTube API 查出來的頭像，不用手動改
 * 名字比對時會忽略大小寫、空白、「・」「･」、全形半形的差別，所以 name 或 aliases 其中一個對得上就會顯示頭像。
 * 沒有登記的名字、沒填 channel 的成員、或 members_auto.json 還沒產生：什麼都不顯示（和以前一樣）。
 * 用法（要先載入 common.js）：
 *   await MelaMembers.load();          // 讀資料（只讀一次；失敗也不會丟錯）
 *   MelaMembers.img("AZKi")            // → '<img class="mem-av" …>' 或 ""
 *   MelaMembers.get("キョーコ")        // → { name, avatar, url, title } 或 null
 */
const MelaMembers=(()=>{
  const norm=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/[\s・･·.]+/g,"");
  const idx=new Map();          // 正規化後的名字 → 成員
  let P=null;
  const getJSON=async u=>{ try{ const r=await fetch(u,{cache:"no-cache"}); return r.ok?await r.json():null; }catch(e){ return null; } };
  function load(){ return P||(P=(async()=>{
    const [list,auto]=await Promise.all([getJSON("members.json"),getJSON("members_auto.json")]);
    const info=(auto&&auto.members)||{};
    for(const m of Array.isArray(list)?list:[]){
      const name=String(m&&m.name||"").trim(); if(!name) continue;
      const a=info[name]; if(!a||!/^https:\/\//.test(a.avatar||"")) continue;      // 還沒有頭像資料 → 略過
      const rec={name,avatar:a.avatar,url:/^https:\/\/www\.youtube\.com\//.test(a.url||"")?a.url:"",title:a.title||name};
      for(const k of [name,...(Array.isArray(m.aliases)?m.aliases:[])]){ const n=norm(k); if(n&&!idx.has(n)) idx.set(n,rec); }
    }
  })().catch(e=>{ console.warn("members load failed",e); }));}
  const get=name=>idx.get(norm(name))||null;
  const esc2=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // 頭像小圖（圓形，20px）。alt 留空（旁邊就是名字），不送 referrer 給 Google 的圖片伺服器
  const img=name=>{ const m=get(name); return m?`<img class="mem-av" src="${esc2(m.avatar)}" alt="" width="20" height="20" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`:""; };
  return {load,get,img};
})();
