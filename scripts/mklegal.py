# 產生 privacy.html（隱私權政策）和 terms.html（服務條款）。在 repo 根目錄執行：python scripts/mklegal.py
# 三種語言放在同一頁，依網站語言切換（article[data-doc-lang]）。
import os
V = "202610250101"
FORM = "https://forms.gle/FqPYsz1eSLLuJKFM7"
DATE = {"zh": "2026 年 10 月 25 日", "ja": "2026年10月25日", "en": "October 25, 2026"}

PRIVACY = {
"zh": f"""
<p class="lg-date">生效日期：{DATE['zh']}</p>
<p>「めらめら出勤紀錄」（以下稱「本站」）是由粉絲志工個人營運的非官方粉絲網站，與 COVER 株式会社、hololive production 及熱千めら本人沒有任何關係。本頁說明本站會處理哪些資料、怎麼使用，以及你可以怎麼刪除。</p>
<h2>1. 本站處理的資料</h2>
<ul>
<li><b>使用 Google 登入時（周邊頁、音聲頁的「雲端同步」，可自由選擇是否使用）</b>：Google 提供給登入服務的帳號識別碼、email、名稱與大頭貼網址，以及你標記的「已入手」紀錄（品項代號、數量、更新時間）。</li>
<li><b>個人設定（可自由選擇是否填寫）</b>：你設定的暱稱，以及你上傳的頭像圖片（上傳前會在你的瀏覽器裡裁成正方形並縮小）。</li>
<li><b>小遊戲的成績（登入時）</b>：你在小遊戲答完全部題目後的答對題數、題庫題數、遊玩次數和時間。全對的人會以暱稱和頭像顯示在全對排行榜上。</li>
<li><b>沒有登入時</b>：「已入手」紀錄、語言、深淺色等設定只存在你自己的瀏覽器（localStorage），不會傳送到本站。</li>
<li><b>瀏覽統計</b>：本站使用 GoatCounter 統計頁面瀏覽次數。GoatCounter 不使用 Cookie，也不保存可以辨識個人的資訊，只記錄瀏覽的頁面、來源網站、瀏覽器與裝置類型等統計資料。</li>
<li><b>投稿與問題回報</b>：透過 Google 表單送出投稿或回報時，你填寫的內容由 Google 表單保存，本站營運者會看到這些內容。</li>
</ul>
<h2>2. 使用目的</h2>
<ul>
<li>在不同裝置之間同步你的「已入手」紀錄。</li>
<li>統計每個周邊、音聲品項的入手人數（例如入手人數排行榜）。品項的入手人數只會顯示人數，不會顯示是誰。</li>
<li>排行榜等公開頁面上，會顯示你設定的暱稱和頭像（沒有設定就不會顯示，或顯示為「匿名」）。不會公開你的 email 和 Google 帳號名稱。</li>
<li>審核投稿、處理問題回報，以及了解網站的使用狀況。</li>
</ul>
<p>本站不會把你的資料用在上述以外的用途，不會販售，不會用於廣告，也不會提供給第三方（法律要求的情況除外）。</p>
<h2>3. 使用的外部服務</h2>
<ul>
<li>Supabase：登入、資料庫與檔案儲存（保存上面第 1 點的登入資料、已入手紀錄、小遊戲成績、暱稱與頭像）。</li>
<li>Google：Google 帳號登入、Google 表單、Google 試算表（網站內容的資料來源）。</li>
<li>GitHub Pages：網站主機。GoatCounter：瀏覽統計。</li>
<li>YouTube、X（Twitter）：網站內嵌的影片與貼文。播放或顯示這些內容時，這些服務可能依它們自己的政策使用 Cookie 等技術。</li>
</ul>
<h2>4. 保存期間與刪除</h2>
<p>登入後保存的資料，會保存到你刪除為止。在周邊頁或音聲頁的「雲端」區按「刪除雲端紀錄」，就會刪除你的已入手紀錄、小遊戲成績、暱稱、頭像和登入帳號（你瀏覽器裡的紀錄不受影響）。暱稱和頭像也可以隨時在「個人設定」修改或移除。不當的頭像或暱稱，本站可以不經通知移除，並停用上傳功能。如果無法自行刪除，也可以透過下方的表單聯絡我們處理。</p>
<h2>5. 安全</h2>
<p>資料庫設定成每個人只能讀取和修改自己的紀錄。不過網路服務無法保證絕對安全，請不要在本站輸入不必要的個人資料。</p>
<h2>6. 本政策的變更</h2>
<p>本政策更新時，會修改本頁內容並更新上方的生效日期。</p>
<h2>7. 聯絡方式</h2>
<p>關於本政策或你的資料，請透過<a href="{FORM}" target="_blank" rel="noopener">問題回報表單</a>聯絡我們。</p>
""",
"ja": f"""
<p class="lg-date">施行日：{DATE['ja']}</p>
<p>「めらめら出勤記録」（以下「当サイト」）は、ファンの有志が個人で運営している非公式ファンサイトで、カバー株式会社、ホロライブプロダクション、熱千めらさんご本人とは一切関係ありません。このページでは、当サイトが扱う情報、その使い方、削除の方法について説明します。</p>
<h2>1. 当サイトが扱う情報</h2>
<ul>
<li><b>Google でログインした場合（グッズ・ボイスページの「クラウド同期」。使うかどうかは自由です）</b>：Google からログインサービスに提供されるアカウント識別子、メールアドレス、名前、プロフィール画像の URL と、あなたが付けた「入手済み」の記録（品目コード、個数、更新日時）。</li>
<li><b>個人設定（入力は任意です）</b>：設定したニックネームと、アップロードしたアイコン画像（アップロード前にブラウザ内で正方形に切り抜いて縮小します）。</li>
<li><b>ミニゲームの成績（ログイン時）</b>：ミニゲームで全問に答えたときの正解数、問題数、プレイ回数と日時。全問正解した人は、ニックネームとアイコンで全問正解ランキングに表示されます。</li>
<li><b>ログインしていない場合</b>：「入手済み」の記録や言語・表示テーマなどの設定は、あなたのブラウザ（localStorage）にだけ保存され、当サイトには送信されません。</li>
<li><b>アクセス解析</b>：ページの閲覧数を GoatCounter で集計しています。GoatCounter は Cookie を使わず、個人を特定できる情報も保存しません。閲覧したページ、参照元サイト、ブラウザ・端末の種類などの統計のみを記録します。</li>
<li><b>投稿・不具合の報告</b>：Google フォームから送信された内容は Google フォームに保存され、当サイトの運営者が確認します。</li>
</ul>
<h2>2. 利用目的</h2>
<ul>
<li>「入手済み」の記録を複数の端末で同期するため。</li>
<li>グッズ・ボイスの各品目の入手人数を集計するため（入手人数ランキングなど）。品目の入手人数は人数だけを表示し、誰が入手したかは表示しません。</li>
<li>ランキングなどの公開ページに、設定したニックネームとアイコンを表示するため（設定していない場合は表示しないか「匿名」と表示します）。メールアドレスや Google アカウント名は公開しません。</li>
<li>投稿の確認、不具合への対応、サイトの利用状況の把握のため。</li>
</ul>
<p>上記以外の目的には使わず、販売や広告への利用、第三者への提供もしません（法令に基づく場合を除きます）。</p>
<h2>3. 利用している外部サービス</h2>
<ul>
<li>Supabase：ログイン、データベース、ファイル保存（上の 1 のログイン情報、入手済みの記録、ミニゲームの成績、ニックネーム、アイコンを保存）。</li>
<li>Google：Google アカウントでのログイン、Google フォーム、Google スプレッドシート（サイトのデータの元）。</li>
<li>GitHub Pages：サイトのホスティング。GoatCounter：アクセス解析。</li>
<li>YouTube、X（Twitter）：埋め込みの動画・ポスト。表示・再生するときに、各サービスが自身のポリシーに基づき Cookie などを使うことがあります。</li>
</ul>
<h2>4. 保存期間と削除</h2>
<p>ログイン後に保存された情報は、あなたが削除するまで保存されます。グッズページまたはボイスページの「クラウド」欄で「クラウドの記録を削除」を押すと、入手済みの記録、ミニゲームの成績、ニックネーム、アイコン、ログイン用アカウントが削除されます（ブラウザ内の記録はそのまま残ります）。ニックネームとアイコンは「個人設定」でいつでも変更・削除できます。不適切なアイコンやニックネームは予告なく削除し、アップロードを停止することがあります。ご自身で削除できない場合は、下のフォームからご連絡ください。</p>
<h2>5. 安全管理</h2>
<p>データベースは、各自が自分の記録だけを読み書きできるように設定しています。ただしインターネット上のサービスで完全な安全は保証できないため、必要のない個人情報は入力しないでください。</p>
<h2>6. このポリシーの変更</h2>
<p>このポリシーを変更するときは、このページを更新し、上の施行日を改めます。</p>
<h2>7. お問い合わせ</h2>
<p>このポリシーやご自身の情報については、<a href="{FORM}" target="_blank" rel="noopener">問題報告フォーム</a>からご連絡ください。</p>
""",
"en": f"""
<p class="lg-date">Effective date: {DATE['en']}</p>
<p>"Mela Mela Shift Log" ("this site") is an unofficial fan site run by a volunteer fan. It is not affiliated with COVER Corporation, hololive production, or Achichi Mela. This page explains what data this site handles, how it is used, and how you can delete it.</p>
<h2>1. Data this site handles</h2>
<ul>
<li><b>If you sign in with Google</b> (the optional "Cloud" sync on the Merch and Voice pages): the account identifier, email address, name and profile picture URL that Google provides to the sign-in service, and the "owned" items you mark (item code, count and time updated).</li>
<li><b>Profile settings</b> (optional): the nickname you set and the avatar image you upload (cropped to a square and shrunk in your browser before upload).</li>
<li><b>Mini-game scores</b> (when signed in): after you answer every question in a mini-game, the number you got right, the number of questions, how many times you have played and when. Players with a perfect score are shown with their nickname and avatar on the perfect-score leaderboard.</li>
<li><b>If you don't sign in</b>: your "owned" list and settings such as language and theme are stored only in your own browser (localStorage) and are never sent to this site.</li>
<li><b>Analytics</b>: page views are counted with GoatCounter, which uses no cookies and stores no personally identifiable information — only statistics such as the page viewed, the referring site, and the browser and device type.</li>
<li><b>Submissions and bug reports</b>: anything you send through a Google Form is stored by Google Forms and read by the site maintainer.</li>
</ul>
<h2>2. How the data is used</h2>
<ul>
<li>To sync your "owned" list across your devices.</li>
<li>To count how many people own each merch or voice item (for example, a ranking). Item counts only show the number of people, never who they are.</li>
<li>To show the nickname and avatar you set on public pages such as rankings (if you haven't set them, nothing is shown or you appear as "Anonymous"). Your email address and Google account name are never made public.</li>
<li>To review submissions, handle bug reports and understand how the site is used.</li>
</ul>
<p>Your data is not used for anything else, is never sold or used for advertising, and is not shared with third parties except where required by law.</p>
<h2>3. Services this site uses</h2>
<ul>
<li>Supabase: sign-in, database and file storage (stores the sign-in data, "owned" list, mini-game scores, nickname and avatar in section 1).</li>
<li>Google: Google sign-in, Google Forms, and Google Sheets (the source of the site's data).</li>
<li>GitHub Pages: hosting. GoatCounter: analytics.</li>
<li>YouTube and X (Twitter): embedded videos and posts. When they load or play, these services may use cookies or similar technologies under their own policies.</li>
</ul>
<h2>4. Retention and deletion</h2>
<p>Data saved after you sign in is kept until you delete it. Press "Delete cloud data" in the "Cloud" section of the Merch or Voice page to delete your "owned" list, mini-game scores, nickname, avatar and sign-in account (the list in your browser is not affected). You can change or remove your nickname and avatar any time in "Profile settings". Inappropriate avatars or nicknames may be removed without notice and uploading disabled. If you can't do this yourself, contact us using the form below.</p>
<h2>5. Security</h2>
<p>The database is set up so that each person can only read and change their own records. No online service can be perfectly secure, so please don't enter personal information you don't need to.</p>
<h2>6. Changes to this policy</h2>
<p>When this policy changes, this page will be updated together with the effective date above.</p>
<h2>7. Contact</h2>
<p>For questions about this policy or your data, please use the <a href="{FORM}" target="_blank" rel="noopener">report form</a>.</p>
""",
}

TERMS = {
"zh": f"""
<p class="lg-date">生效日期：{DATE['zh']}</p>
<p>使用「めらめら出勤紀錄」（以下稱「本站」）之前，請先閱讀以下條款。使用本站（包括使用 Google 帳號登入）即表示你同意本條款和<a href="privacy.html">隱私權政策</a>。</p>
<h2>1. 關於本站</h2>
<p>本站是由粉絲志工個人營運、非營利的非官方粉絲網站，與 COVER 株式会社、hololive production 及熱千めら本人沒有任何關係。本站依照 hololive production 的二次創作ガイドライン營運。</p>
<h2>2. 內容的權利</h2>
<p>本站介紹的影片、圖片、聲音、商品資訊等，權利屬於各自的權利人（Ⓒ COVER）。本站只提供嵌入和連結，不提供下載，也請不要擷取本站內容用於其他用途。</p>
<h2>3. 資訊的正確性</h2>
<p>本站的直播、歌曲、商品等資訊由志工整理，可能有錯誤或已經過時。本站不販售任何商品，購買請以官方商店的資訊為準。頁面上的「花費」金額只是估算。</p>
<h2>4. 登入與雲端同步</h2>
<ul>
<li>登入是選用的功能；不登入也可以使用本站的所有內容。</li>
<li>請不要大量自動存取、干擾本站或相關服務的運作，或冒用他人的帳號。違反時，本站可以刪除相關資料或停止提供服務。</li>
</ul>
<h2>5. 服務沒有保證</h2>
<p>本站由志工在空閒時間營運，內容和功能可能隨時變更、暫停或結束，雲端紀錄也可能因為服務故障等原因遺失。重要的紀錄請用「匯出備份」自行保存。在法律允許的範圍內，本站對因使用或無法使用本站所造成的損失不負責任。</p>
<h2>6. 投稿</h2>
<p>透過投稿表單送出的內容，會在本站審核後決定是否公開；本站可以不經通知修改或刪除已公開的投稿。</p>
<h2>7. 條款的變更</h2>
<p>本條款更新時，會修改本頁內容並更新上方的生效日期。</p>
<h2>8. 聯絡方式</h2>
<p>請透過<a href="{FORM}" target="_blank" rel="noopener">問題回報表單</a>聯絡我們。</p>
""",
"ja": f"""
<p class="lg-date">施行日：{DATE['ja']}</p>
<p>「めらめら出勤記録」（以下「当サイト」）をご利用になる前に、以下の規約をお読みください。当サイトを利用すること（Google アカウントでのログインを含みます）で、この規約と<a href="privacy.html">プライバシーポリシー</a>に同意したものとみなします。</p>
<h2>1. 当サイトについて</h2>
<p>当サイトは、ファンの有志が個人で運営している非営利の非公式ファンサイトで、カバー株式会社、ホロライブプロダクション、熱千めらさんご本人とは一切関係ありません。ホロライブプロダクションの二次創作ガイドラインに沿って運営しています。</p>
<h2>2. コンテンツの権利</h2>
<p>当サイトで紹介している動画、画像、音声、商品情報などの権利は、それぞれの権利者（Ⓒ COVER）に帰属します。当サイトは埋め込みとリンクのみを提供し、ダウンロードは提供しません。当サイトの内容を抜き出して他の用途に使わないでください。</p>
<h2>3. 情報の正確さ</h2>
<p>配信、歌、グッズなどの情報は有志がまとめたもので、誤りや古い情報が含まれることがあります。当サイトでは商品を販売していません。ご購入の際は公式ショップの情報をご確認ください。ページ上の「使った金額」は概算です。</p>
<h2>4. ログインとクラウド同期</h2>
<ul>
<li>ログインは任意の機能です。ログインしなくても当サイトのすべての内容を利用できます。</li>
<li>大量の自動アクセス、当サイトや関連サービスの運営を妨げる行為、他人のアカウントのなりすましはおやめください。違反した場合、関連するデータの削除や利用の停止を行うことがあります。</li>
</ul>
<h2>5. 無保証</h2>
<p>当サイトは有志が空いた時間に運営しているため、内容や機能は予告なく変更・休止・終了することがあり、クラウドの記録が障害などで失われることもあります。大切な記録は「バックアップを保存」でご自身でも保存してください。法令で認められる範囲で、当サイトの利用または利用できなかったことによる損害について責任を負いません。</p>
<h2>6. 投稿</h2>
<p>投稿フォームから送られた内容は、当サイトで確認したうえで公開するかどうかを決めます。公開した投稿は予告なく修正・削除することがあります。</p>
<h2>7. 規約の変更</h2>
<p>この規約を変更するときは、このページを更新し、上の施行日を改めます。</p>
<h2>8. お問い合わせ</h2>
<p><a href="{FORM}" target="_blank" rel="noopener">問題報告フォーム</a>からご連絡ください。</p>
""",
"en": f"""
<p class="lg-date">Effective date: {DATE['en']}</p>
<p>Please read these terms before using "Mela Mela Shift Log" ("this site"). By using this site, including signing in with a Google account, you agree to these terms and the <a href="privacy.html">Privacy Policy</a>.</p>
<h2>1. About this site</h2>
<p>This site is a non-commercial, unofficial fan site run by a volunteer fan. It is not affiliated with COVER Corporation, hololive production, or Achichi Mela, and it follows hololive production's derivative works guidelines.</p>
<h2>2. Rights to content</h2>
<p>Videos, images, audio and product information introduced on this site belong to their respective rights holders (Ⓒ COVER). This site only provides embeds and links, never downloads. Please don't extract content from this site for other uses.</p>
<h2>3. Accuracy</h2>
<p>Information about streams, songs and merch is compiled by volunteers and may contain mistakes or be out of date. This site does not sell anything — check the official shop before buying. The "Spent" amount is only an estimate.</p>
<h2>4. Sign-in and cloud sync</h2>
<ul>
<li>Signing in is optional. Everything on this site can be used without signing in.</li>
<li>Don't send large amounts of automated requests, interfere with this site or related services, or impersonate others. If you do, related data may be deleted and your access may be stopped.</li>
</ul>
<h2>5. No warranty</h2>
<p>This site is run by a volunteer in their spare time. Content and features may change, pause or end at any time, and cloud data may be lost because of outages or other problems. Please keep your own copy of important records with "Export backup". To the extent permitted by law, this site is not responsible for any loss caused by using or being unable to use it.</p>
<h2>6. Submissions</h2>
<p>Content sent through the submission form is reviewed before it is published, and published submissions may be edited or removed without notice.</p>
<h2>7. Changes to these terms</h2>
<p>When these terms change, this page will be updated together with the effective date above.</p>
<h2>8. Contact</h2>
<p>Please use the <a href="{FORM}" target="_blank" rel="noopener">report form</a>.</p>
""",
}

def page(fname, key, docs, desc):
    arts = "\n".join(f'    <article class="lg-doc" data-doc-lang="{l}" hidden>{docs[l]}    </article>' for l in ("zh", "ja", "en"))
    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>熱千めら めらめら出勤紀錄</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Noto+Sans+TC:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&family=M+PLUS+1+Code:wght@400;600&display=swap">
<script>(function(){{try{{var v=localStorage.getItem("mela-theme");if(v==="dark"||v==="light")document.documentElement.dataset.theme=v}}catch(e){{}}}})()</script>
<link rel="stylesheet" href="assets/style.css?v={V}">
<style>
/* 隱私權政策／服務條款（內容由 scripts/mklegal.py 產生，要改文字請改那個檔再重新產生） */
.lg-doc{{max-width:760px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px 22px;line-height:1.8}}
.lg-doc h2{{margin:22px 0 6px;font-family:var(--f-display);font-size:18px;color:var(--accent-text)}}
.lg-doc p{{margin:8px 0}}
.lg-doc ul{{margin:8px 0;padding-left:1.4em}}
.lg-doc li{{margin:4px 0}}
.lg-doc a{{color:var(--accent-text)}}
.lg-date{{font-size:13px;color:var(--muted)}}
</style>
</head>
<body data-title-key="{key}">
<div class="wrap">
  <div class="topbar">
  <header>
    <div>
      <span class="unofficial" data-i18n="unofficial"></span>
      <h1><span class="jp">熱千めら</span> <span data-i18n="{key}"></span></h1>
    </div>
    <div class="right">
      <div class="lang" role="group" aria-label="Language">
        <button type="button" data-lang="zh">中文</button>
        <button type="button" data-lang="ja">日本語</button>
        <button type="button" data-lang="en">EN</button>
      </div>
    </div>
  </header>

  <nav class="views">
    <a href="./" data-i18n="tabVoices"></a>
    <a href="songs.html" data-i18n="tabSongs"></a>
    <a href="timeline.html" data-i18n="tabShift"></a>
    <a href="goods.html" data-i18n="tabTax"></a>
    <a href="quiz.html" data-i18n="tabGames"></a>
  </nav>
  </div>

  <section class="view">
{arts}
  </section>

  <footer></footer><!-- 頁尾內容由 assets/common.js 產生（各頁共用） -->
</div>

<script src="assets/common.js?v={V}"></script>
<script src="assets/sync.js?v={V}"></script><!-- 標題列的登入按鈕（每頁都有） -->
<script>
// 依網站語言顯示對應的那一份
window.onLangChange=()=>{{ document.querySelectorAll("[data-doc-lang]").forEach(a=>a.hidden=a.dataset.docLang!==lang); }};
setLang(pickLang());
</script>
</body>
</html>
"""

open("privacy.html", "w", encoding="utf-8", newline="").write(page("privacy.html", "titlePrivacy", PRIVACY, "めらめら出勤紀錄 隱私權政策（非官方粉絲網站）"))
open("terms.html", "w", encoding="utf-8", newline="").write(page("terms.html", "titleTerms", TERMS, "めらめら出勤紀錄 服務條款（非官方粉絲網站）"))
print("ok")
