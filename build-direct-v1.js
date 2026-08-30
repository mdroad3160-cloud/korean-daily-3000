const fs=require('fs');
const path=require('path');

async function main(){
  const wrapperPath=process.argv[2]||'index.html';
  const basePath=process.argv[3]||'index-upload.html';
  const outPath=process.argv[4]||'_site/index.html';
  const wrapper=fs.readFileSync(wrapperPath,'utf8');
  const m=wrapper.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) throw new Error('wrapper script not found');
  let captured='';
  global.fetch=async()=>({ok:true,status:200,text:async()=>fs.readFileSync(basePath,'utf8')});
  global.document={
    open(){},
    write(s){captured=String(s)},
    close(){},
    getElementById(){return {textContent:''}}
  };
  const p=eval(m[1]);
  if(p&&typeof p.then==='function') await p;
  if(!captured || !captured.includes('<!doctype html>')) throw new Error('wrapper did not generate HTML');
  let html=captured;

  // Version marker.
  html=html.replace('const APP_VERSION="0.9";','const APP_VERSION="1.1";');
  html=html.replaceAll('Web公開版 v0.9','Web公開版 v1.1');

  // Remove the completion MutationObserver. It mutated the DOM from inside its
  // own callback and could create an endless microtask loop on the final card.
  const observerBlock=`const _completionObserver = new MutationObserver(()=>{\n  const text = document.body ? document.body.innerText : "";\n  if(/今日の.*完了/.test(text) && !extraUnlimitedMode && extraAllowance<=0){\n    showExtraStudyPanel();\n  }\n});\nif(document.body) _completionObserver.observe(document.body,{subtree:true,childList:true,characterData:true});`;
  html=html.replace(observerBlock,'');

  // Empty-queue rendering itself shows the extra-study panel; no observer needed.
  html=html.replace(
    'updateStats(); return;\n  }\n  const rank=queue.shift()',
    'updateStats(); setTimeout(()=>{try{if(typeof showExtraStudyPanel==="function")showExtraStudyPanel();}catch(e){}},0); return;\n  }\n  const rank=queue.shift()'
  );

  // UI must render and bind before any network/CDN initialization finishes.
  html=html.replace(
    'load();\nawait initCloudSync();',
    'load();\nif(!state||typeof state!=="object")state={cards:{},reviews:[],daily:{}};\nif(!state.cards||typeof state.cards!=="object")state.cards={}; if(!Array.isArray(state.reviews))state.reviews=[]; if(!state.daily||typeof state.daily!=="object")state.daily={};\ninitCloudSync().catch(e=>{console.error("cloud init",e);try{cloudStatus("クラウド初期化エラー。ローカル学習は利用できます。","error")}catch(_){} });'
  );
  html=html.replace(
    'await initFSRS(); buildQueue(); updateStats(); renderRank();',
    'buildQueue(); updateStats(); renderRank(); initFSRS().catch(e=>console.warn("FSRS init",e));'
  );

  // CDN outage/latency falls back instead of blocking the app.
  html=html.replace(
    'FS=await import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm");',
    'FS=await Promise.race([import("https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm"),new Promise((_,rej)=>setTimeout(()=>rej(new Error("FSRS load timeout")),5000))]);'
  );

  // Daily quota follows the user's local calendar date, not UTC.
  html=html.replace(
    'function todayKey(){return new Date().toISOString().slice(0,10)}',
    'function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}'
  );

  // A grading exception must never leave every grade button disabled.
  html=html.replace(
    'document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>grade(b.dataset.grade)));',
    'document.querySelectorAll("[data-grade]").forEach(b=>b.addEventListener("click",()=>{try{grade(b.dataset.grade)}catch(e){console.error("grade click",e)}finally{document.querySelectorAll("[data-grade]").forEach(x=>x.disabled=false)}}));'
  );
  html=html.replace(
    'document.getElementById("knownBtn").addEventListener("click",markKnown);',
    'document.getElementById("knownBtn").addEventListener("click",()=>{try{markKnown()}catch(e){console.error("known click",e)}});'
  );

  // Settings save should not wait for CDN FSRS reinitialization.
  html=html.replace(
    'document.getElementById("saveSettingsBtn").addEventListener("click",async()=>{settings.newPerDay=Math.max(0,Math.min(50,Number(document.getElementById("newPerDay").value)||15));settings.retention=Math.max(.8,Math.min(.97,Number(document.getElementById("retention").value)||.9));save();await initFSRS();buildQueue();document.getElementById("dataMsg").textContent="設定を保存しました。";});',
    'document.getElementById("saveSettingsBtn").addEventListener("click",()=>{settings.newPerDay=Math.max(0,Math.min(50,Number(document.getElementById("newPerDay").value)||15));settings.retention=Math.max(.8,Math.min(.97,Number(document.getElementById("retention").value)||.9));save();buildQueue();document.getElementById("dataMsg").textContent="設定を保存しました。";initFSRS().catch(e=>console.warn("FSRS settings",e));});'
  );

  html=html.replace(
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer}',
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer} button:disabled{opacity:.55;cursor:wait}'
  );
  html=html.replace('日常会話Rank × 発音 × 想起テスト × FSRS</div>','日常会話Rank × 発音 × 想起テスト × FSRS · v1.1</div>');

  // Enrich every example with word-by-word notes and one focused grammar note.
  html=html.replace(
    '<div class="jp" id="exampleJp"></div>',
    '<div class="jp" id="exampleJp"></div><details class="breakdown" open><summary>例文の全単語解説</summary><div id="exampleBreakdown" class="breakdown-list"></div></details>'
  );
  html=html.replace(
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer}',
    '.smallbtn{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:white;cursor:pointer} .breakdown{margin-top:14px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:10px 12px} .breakdown summary{font-weight:800;cursor:pointer} .breakdown-list{margin-top:8px;display:grid;gap:6px}.breakdown-row{display:grid;grid-template-columns:minmax(70px,120px) 1fr;gap:10px;align-items:start;font-size:14px;line-height:1.5}.breakdown-row b{font-size:15px}.grammar-title{font-weight:800;margin-bottom:5px}@media(max-width:520px){.breakdown-row{grid-template-columns:1fr;gap:1px}}'
  );
  html=html.replace(
    'function reveal(){',
    `
const EXTRA_EXAMPLE_LEX={"영화":"映画","필요하다":"必要だ","준비":"準備","약속":"約束","요즘":"最近","술":"酒","마시다":"飲む","한국어":"韓国語","내일":"明日","회사":"会社","일본":"日本","날씨":"天気","물":"水","친구":"友達","연락하다":"連絡する","앉다":"座る","피곤하다":"疲れている","천천히":"ゆっくり","비":"雨","식당":"食堂・レストラン","바쁘다":"忙しい","가방":"かばん","어디서":"どこで／どこから","쉬다":"休む","음식":"食べ物・料理","선물":"プレゼント","밥":"ご飯","커피":"コーヒー","노래":"歌","저녁":"夕食・夕方","옷":"服","한국":"韓国","전에":"前に","방":"部屋","갑자기":"急に","걱정하다":"心配する","세":"3（固有数詞）","사과":"りんご","끝나다":"終わる","민수":"ミンス（人名）","요리":"料理","서울":"ソウル","맛있다":"おいしい","아이":"子ども","자다":"寝る","역":"駅","주":"週","회의":"会議","주말":"週末","엄마":"母・お母さん","전화하다":"電話する","밖":"外","현금":"現金","잔":"杯（飲み物の助数詞）","여기서":"ここで","원":"ウォン","생각하다":"考える・思う","책상":"机","형":"兄・年上の男性","나중에":"あとで","화장실":"トイレ","찾다":"探す","건강":"健康","운동하다":"運動する","거기서":"そこで","돈":"お金","문제":"問題","게임":"ゲーム","설탕":"砂糖","가족":"家族","조용하다":"静かだ","돕다":"助ける","감사하다":"感謝する・ありがたい","맵다":"辛い","월":"月","잠깐":"少しの間","죽다":"死ぬ","속":"胃・お腹の中","힘들다":"大変だ・つらい","빨리":"早く","지하철":"地下鉄","둘":"二人・二つ","놓다":"置く","재미있다":"面白い","그녀":"彼女","예쁘다":"かわいい・きれいだ","오랜만":"久しぶり","모습":"姿・様子","모든":"すべての","머리":"髪・頭","보내다":"過ごす・送る","예약":"予約","상황":"状況","복잡하다":"複雑だ","이유":"理由","덥다":"暑い","이미":"すでに","들어오다":"入ってくる","편하다":"楽だ・気楽だ","가장":"最も・一番","엄청":"ものすごく","약간":"少し","이야기":"話","여러분":"皆さん","이름":"名前","곳":"場所","시":"時（時刻）","분":"分","명":"人（助数詞）","개":"個（助数詞）","년":"年","번":"回","정도":"程度・くらい","때문":"ため・せい","등":"背中","몸":"体","처음":"初めて","소리":"音","마음":"心・気持ち","손":"手","얼굴":"顔","느낌":"感じ","중":"中・最中","뒤":"後ろ・後","앞":"前"};
const EXAMPLE_FORM_NOTES={"해요":"하다「する」の丁寧形。「します／しています」","있어요":"있다「いる・ある」＋-어요（丁寧語尾）","됐어요":"되다「なる・できる」の過去形。「なりました／できました」","거예요":"거「もの・こと」＋이다「〜だ」の丁寧形。「〜のです／〜ものです」","갈게":"가다「行く」＋-(으)ㄹ게（話し手の意志）。「行くね」","봤어요":"보다「見る」の過去形。「見ました」","필요한":"필요하다「必要だ」の連体形。「必要な」","없어요":"없다「ない・いない」＋-어요。「ありません／いません」","마시지":"마시다「飲む」＋-지。後ろの 않다 と組んで -지 않다「〜しない」","않아요":"않다「〜しない」＋-아요。前の -지 と組んで否定を作る","알아요":"알다「知る・分かる」の丁寧形。「知っています／分かります」","먹고":"먹다「食べる」＋-고「〜して／〜し」","싶어요":"싶다「〜したい」＋-어요。通常 -고 싶다 で使う","이게":"이것이／이거가 の口語的な形。「これが」","좋은":"좋다「良い」の連体形。「良い〜」","같아요":"같다「同じだ／〜のようだ」＋-아요。「〜みたいです／〜と思います」","말할":"말하다「話す」＋-(으)ㄹ（連体・可能表現の前）。「話す〜」","그건":"그것은 の縮約。「それは」","아니에요":"아니다「〜ではない」の丁寧形。「違います／〜ではありません」","친구예요":"친구「友達」＋이다「〜だ」→「友達です」","가요":"가다「行く」＋-아요。「行きます」","사람이에요":"사람「人」＋이다「〜だ」→「人です」","이렇게":"이렇다「こうだ」からできた副詞。「このように／こんなに」","비싸요":"비싸다「高い」＋-아요。「高いです」","누구예요":"누구「誰」＋이다「〜だ」→「誰ですか」","얼마예요":"얼마「いくら」＋이다「〜だ」→「いくらですか」","좋아요":"좋다「良い」＋-아요。「良いです」","먹어요":"먹다「食べる」＋-어요。「食べます」","와요":"오다「来る」＋-아요 → 와요。「来ます」","주세요":"주다「くれる／与える」＋-(으)세요。「ください」","줬어요":"주다「与える」の過去形。「あげました／くれました」","말이에요":"말「言葉・話」＋이다「〜だ」→「話です／意味です」","있을":"있다「ある・いる」＋-(으)ㄹ（連体形）。「ある〜／いる〜」","연락해":"연락하다「連絡する」の해体。「連絡して」","앉아도":"앉다「座る」＋-아/어도「〜しても」","돼요":"되다「なる・よい」＋-어요。-아/어도 돼요 で「〜してもいいです」","알겠어요":"알겠다「分かるだろう／了解する」→ 会話では「分かりました」","있어":"있다「ある・いる」のパンマル。「ある／いる」","맛있어요":"맛있다「おいしい」＋-어요。「おいしいです」","피곤해요":"피곤하다「疲れている」の丁寧形。「疲れています」","많아요":"많다「多い」＋-아요。「多いです」","괜찮아요":"괜찮다「大丈夫だ」＋-아요。「大丈夫です」","먹을까요":"먹다「食べる」＋-(으)ㄹ까요?。「食べましょうか？」","잘해요":"잘하다「上手にする／得意だ」の丁寧形。「上手です」","왔어요":"오다「来る」の過去形。「来ました」","먹었어요":"먹다「食べる」の過去形。「食べました」","말해":"말하다「話す・言う」の해体。「話して／言って」","할":"하다「する」＋-(으)ㄹ（連体形）。「する〜」","나왔어요":"나오다「出てくる・出る」の過去形。「出ました」","있었어요":"있다「いる・ある」の過去形。「いました／ありました」","어때요":"어떻다「どうだ」の丁寧形。「どうですか？」","모르겠어요":"모르다「分からない」＋-겠어요（控えめ・推量）。会話では「分かりません」","바빴어요":"바쁘다「忙しい」の過去形。「忙しかったです」","이건":"이것은 の縮約。「これは」","가방이에요":"가방「かばん」＋이다「〜だ」→「かばんです」","갈게요":"가다「行く」＋-(으)ㄹ게요（話し手の意志）。「行きますね」","샀어요":"사다「買う」の過去形。「買いました」","쉬고":"쉬다「休む」＋-고「〜して／〜し」","좋아해요":"좋아하다「好きだ」＋-아요。「好きです」","받았어요":"받다「受け取る」の過去形。「受け取りました」","그렇게":"그렇다「そうだ」からできた副詞。「そのように／そう」","생각해요":"생각하다「考える・思う」の丁寧形。「思います」","마셨어요":"마시다「飲む」の過去形。「飲みました」","어떻게":"어떻다「どうだ」からできた副詞。「どうやって／どのように」","써요":"쓰다「使う／書く」の丁寧形。文脈では「使います」","만나요":"만나다「会う」の丁寧形。「会います」","피곤해":"피곤하다「疲れている」の해体・連結形。「疲れて」","보여요":"보이다「見える」＋-어요。「見えます」","늦어요":"늦다「遅い・遅れる」＋-어요。「遅れます／遅いです」","만들게요":"만들다「作る」＋-(으)ㄹ게요。「作りますね」","10":"数字の10。「10」","기다려":"기다리다「待つ」の해体。「待って」","맞아요":"맞다「合っている」＋-아요。「合っています／その通りです」","알겠어":"알겠다 のパンマル。「分かった」","들어요":"들다「入る／気に入る等」の丁寧形。마음에 들어요 で「気に入ります」","온":"오다「来る」の連体形。「来た〜」","지":"動詞の連体形＋지 で「〜してから」。온 지 2년 = 来て2年","2":"数字の2。「2」","그게":"그것이 の縮約。「それが」","생각이에요":"생각「考え」＋이다「〜だ」→「考えです」","3":"数字の3。「3」","바빠요":"바쁘다「忙しい」＋-아요。「忙しいです」","해":"하다「する」の해体。「して／する」","보세요":"보다「見る」＋-(으)세요。「見てください」。-아/어 보다 と組むと「〜してみてください」","커요":"크다「大きい」＋-어요。「大きいです」","어디예요":"어디「どこ」＋이다「〜だ」→「どこですか」","걸려요":"걸리다「かかる」＋-어요。「かかります」","있을게요":"있다「いる」＋-(으)ㄹ게요。「いますね」","났어요":"나다「出る・生じる」の過去形。생각이 났어요 で「思い出しました」","몰라요":"모르다「知らない・分からない」＋-아요。「分かりません」","걱정하지":"걱정하다「心配する」＋-지。後ろの 마세요 と組んで「心配しないで」","마세요":"말다「やめる」＋-(으)세요。-지 마세요 で「〜しないでください」","갔어요":"가다「行く」の過去形。「行きました」","아파요":"아프다「痛い・具合が悪い」＋-아요。「痛いです」","끝나면":"끝나다「終わる」＋-(으)면「〜したら／〜すれば」","들어가세요":"들어가다「入る」＋-(으)세요。「入ってください／お先にどうぞ」","잡아":"잡다「つかむ・握る」の해体。「握って」","못해요":"못하다「できない／苦手だ」＋-아요。「できません／苦手です」","살아요":"살다「住む・生きる」＋-아요。「住んでいます」","맛있지만":"맛있다「おいしい」＋-지만「〜ですが」","하자":"하다「する」＋-자（勧誘）。「しよう」","자고":"자다「寝る」＋-고。자고 있어요 で「寝ています」","달라요":"다르다「違う」＋-아요。「違います」","중이에요":"중「〜中」＋이다「〜だ」→「〜中です」","먹은":"먹다「食べる」の過去連体形。「食べた〜」","가자":"가다「行く」＋-자。「行こう」","전화했어요":"전화하다「電話する」の過去形。「電話しました」","와":"오다「来る」のパンマル／連結形。「来て／来る」","봐요":"보다「見る」＋-아요。「見ます」。-아/어 보다 で「〜してみる」","민수야":"민수「ミンス」＋-야（親しい呼びかけ）。「ミンス！」","가":"가다「行く」のパンマル。「行く／行って」","나요":"나다「出る・生じる」＋-아요。「出ます／します」","가지고":"가지다「持つ」＋-고。「持って」","마실게요":"마시다「飲む」＋-(으)ㄹ게요。「飲みますね」","기다릴게요":"기다리다「待つ」＋-(으)ㄹ게요。「待ちますね」","원이에요":"원「ウォン」＋이다「〜だ」→「ウォンです」","생각했던":"생각하다「考える・思う」＋-았/었던（過去の回想連体）。「思っていた〜」","시작해요":"시작하다「始める／始まる」の丁寧形。「始まります／始めます」","편하게":"편하다「楽だ・気楽だ」＋-게（副詞化）。「気楽に」","대해요":"대하다「接する・対する」＋-아요。「接します」","얘기해요":"얘기하다「話す」の丁寧形。「話します」","좋네요":"좋다「良い」＋-네요（気づき・感嘆）。「いいですね」","알겠습니다":"알다「分かる」＋-겠습니다（丁寧で改まった意志・了解）。「承知しました」","시예요":"시「時」＋이다「〜だ」→「〜時です」","안녕하세요":"안녕하다「安寧だ」＋-(으)세요。定型挨拶「こんにちは」","찾고":"찾다「探す」＋-고。「探して」","위해서":"위하다「〜のためにする」＋-아서/어서。-을/를 위해서 で「〜のために」","운동해요":"운동하다「運動する」の丁寧形。「運動します」","나가요":"나가다「出て行く・出かける」の丁寧形。「出かけます」","없어서":"없다「ない」＋-아서/어서（理由）。「ないので」","냈어요":"내다「出す・払う」の過去形。「払いました」","먹어":"먹다「食べる」の해体。「食べて／食べる」","가세요":"가다「行く」＋-(으)세요。「行ってください／お行きください」","넣어요":"넣다「入れる」の丁寧形。「入れます」","뭐예요":"뭐「何」＋이다「〜だ」→「何ですか」","조용한":"조용하다「静かだ」の連体形。「静かな」","도와주셔서":"도와주다「手伝ってくれる」＋-(으)셔서（尊敬＋理由）。「手伝ってくださって」","감사합니다":"감사하다「感謝する」＋-ㅂ니다（改まった丁寧語尾）。「ありがとうございます」","매워요":"맵다「辛い」＋-어요。「辛いです」","볼게요":"보다「見る／やってみる」＋-(으)ㄹ게요。「やってみますね」","9":"数字の9。「9」","피곤해서":"피곤하다「疲れている」＋-아서/어서（理由）。「疲れていて／疲れたので」","죽겠어요":"죽다「死ぬ」＋-겠어요。誇張して「死にそうです」","힘들었어요":"힘들다「大変だ・つらい」の過去形。「大変でした」","타고":"타다「乗る」＋-고。「乗って」","낼게요":"내다「出す・払う」＋-(으)ㄹ게요。「払いますね」","놓아":"놓다「置く」＋-아/어。「置いて」","재미있었어요":"재미있다「面白い」の過去形。「面白かったです」","예뻐요":"예쁘다「かわいい・きれいだ」＋-어요。「かわいいです」","보니까":"보다「見る」＋-(으)니까（〜してみると／〜すると）。「会ってみると／見ると」","달라졌어요":"다르다「違う」＋-아/어지다「〜になる」の過去。「変わりました」","건":"것은 の縮約。「ものは／わけは」。文脈では「〜わけでは」","잘랐어요":"자르다「切る」の過去形。「切りました」","보냈어요":"보내다「過ごす／送る」の過去形。文脈では「過ごしました」","그것보다":"그것「それ」＋보다「〜より」。「それより」","필요해요":"필요하다「必要だ」の丁寧形。「必要です」","복잡해요":"복잡하다「複雑だ」の丁寧形。「複雑です」","덥네요":"덥다「暑い」＋-네요（気づき・感嘆）。「暑いですね」","했어요":"하다「する」の過去形。「しました」","들어오세요":"들어오다「入ってくる」＋-(으)세요。「入ってきてください／どうぞお入りください」"};
const EXAMPLE_PARTICLES=[
  ["에서","〜で／〜から"],["한테","〜に"],["이랑","〜と"],["에게","〜に"],["까지","〜まで"],["부터","〜から"],
  ["으로","〜で／〜へ"],["보다","〜より"],["랑","〜と"],["로","〜で／〜へ"],["께","〜に（敬語）"],
  ["은","〜は"],["는","〜は"],["이","〜が"],["가","〜が"],["을","〜を"],["를","〜を"],["에","〜に／〜で"],
  ["도","〜も"],["만","〜だけ"],["과","〜と"],["와","〜と"],["의","〜の"]
];
let _exampleLexCache=null;
function exampleLexicon(){
  if(_exampleLexCache)return _exampleLexCache;
  const m={...EXTRA_EXAMPLE_LEX};
  for(const c of PACK||[])if(c?.word&&c?.meaning)m[c.word]=c.meaning;
  _exampleLexCache=m;
  return m;
}
function explainExampleToken(token){
  if(EXAMPLE_FORM_NOTES[token])return EXAMPLE_FORM_NOTES[token];
  const lex=exampleLexicon();
  if(lex[token])return lex[token];
  for(const [p,pjp] of EXAMPLE_PARTICLES){
    if(token.endsWith(p)&&token.length>p.length){
      const root=token.slice(0,-p.length);
      if(lex[root])return `${root}「${lex[root]}」＋${p}「${pjp}」`;
    }
  }
  return "この例文で使う語・表現";
}
function renderExampleBreakdown(sentence){
  const tokens=String(sentence||"").match(/[0-9]+|[가-힣]+/g)||[];
  return tokens.map(t=>`<div class="breakdown-row"><b>${escapeHtml(t)}</b><span>${escapeHtml(explainExampleToken(t))}</span></div>`).join("");
}
function primaryGrammar(card){
  const gs=card?.grammar||[];
  const generic=new Set(["-요","V+아/어/여","V+았/었/였","-이/가","-을/를","-은/는","-에","N+이다"]);
  return gs.find(g=>!generic.has(g))||gs[0]||"";
}
\nfunction reveal(){`
  );
  html=html.replace(
    'document.getElementById("exampleJp").textContent=c.example_jp||"";',
    'document.getElementById("exampleJp").textContent=c.example_jp||""; document.getElementById("exampleBreakdown").innerHTML=renderExampleBreakdown(c.example||"");'
  );
  html=html.replace(
    'document.getElementById("grammarText").innerHTML=(gs?`<b>文法:</b> ${gs}<br>`:"")+escapeHtml(c.grammar_jp||"")+(c.note?`<br><span class="muted">注意: ${escapeHtml(c.note)}</span>`:"");',
    'const pg=primaryGrammar(c); document.getElementById("grammarText").innerHTML=`<div class="grammar-title">文法ワンポイント${pg?`：<span class="badge">${escapeHtml(pg)}</span>`:""}</div>`+escapeHtml(c.grammar_jp||"")+(gs?`<div class="muted" style="margin-top:6px">関連文法: ${gs}</div>`:"")+(c.note?`<br><span class="muted">注意: ${escapeHtml(c.note)}</span>`:"");'
  );

  // Hard assertions: fail deployment instead of shipping a half-patched build.
  const forbidden=['_completionObserver','await initCloudSync();','await initFSRS(); buildQueue(); updateStats(); renderRank();'];
  for(const s of forbidden) if(html.includes(s)) throw new Error('forbidden legacy pattern remains: '+s);
  const required=['const APP_VERSION="1.1";','FSRS · v1.1','クラウド同期','data-grade="Easy"','例文の全単語解説','文法ワンポイント'];
  for(const s of required) if(!html.includes(s)) throw new Error('required pattern missing: '+s);

  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,html);
  console.log('Built',outPath,Buffer.byteLength(html),'bytes');
}
main().catch(e=>{console.error(e);process.exit(1)});
