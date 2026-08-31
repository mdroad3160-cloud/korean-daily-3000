'use strict';
const fs=require('fs');
const START=3101,END=3200,VERSION='1.5.1';
const file=process.argv[2]||'_site/index.html';
let src=fs.readFileSync(file,'utf8');
const candidates=require('./pack-3101-3200-v1.5.1.js');
if(!Array.isArray(candidates)||candidates.length<120)throw new Error('candidate pack must contain at least 120 entries');

function parseArray(name){
  const m=src.match(new RegExp(`(?:const|let)\\s+${name}=(\\[.*?\\]);`,'s'));
  if(!m)throw new Error(`${name} missing`);
  return {json:m[1],data:JSON.parse(m[1]),match:m[0]};
}
const R=parseArray('RANK'),P=parseArray('PACK'),GR=parseArray('GRAMMAR');
const norm=s=>String(s||'').replace(/[-\s]/g,'').trim();
const existingWords=new Set(R.data.map(x=>norm(x.word)));
const selected=[];
for(const row of candidates){
  if(!Array.isArray(row)||row.length<5)throw new Error('bad candidate row');
  const [word,meaning,example,jp,note]=row;
  if(!word||!meaning||!example||!jp||!note)throw new Error(`missing candidate field: ${word}`);
  if(existingWords.has(norm(word)))continue;
  if(selected.some(x=>norm(x[0])===norm(word)))continue;
  selected.push(row);
  if(selected.length===100)break;
}
if(selected.length!==100)throw new Error(`only ${selected.length} nonduplicate candidates available`);

const maxOrig=Math.max(...R.data.map(x=>Number(x.orig)||0),3037);
const newRanks=selected.map((row,i)=>({rank:START+i,word:row[0],confidence:'中（Daily5000拡張）',orig:maxOrig+1+i}));
for(let i=0;i<100;i++)if(newRanks[i].rank!==START+i)throw new Error('rank continuity failure');
const allWords=[...R.data,...newRanks].map(x=>norm(x.word));
if(new Set(allWords).size!==allWords.length)throw new Error('duplicate headword across extended RANK');
src=src.replace(R.match,`const RANK=${JSON.stringify([...R.data,...newRanks])};`);

const grammarByRank=new Map(GR.data.map(g=>[Number(g.rank),g]));
const meaningMap=new Map();
for(const c of P.data)if(c&&c.word&&c.meaning)meaningMap.set(norm(c.word),String(c.meaning));
for(const m of src.matchAll(/"word"\s*:\s*"([^"]+)"[\s\S]{0,260}?"meaning"\s*:\s*"([^"]+)"/g))meaningMap.set(norm(m[1]),m[2]);
for(const row of selected)meaningMap.set(norm(row[0]),row[1]);

const clean=t=>String(t||'').replace(/^[“”‘’'"()[\]{}]+|[.,!?。！？;:…~“”‘’'"()[\]{}]+$/g,'').trim();
const particles=[
  ['에서는','에서＋는（場所＋主題）'],['에게는','에게＋는（対象＋主題）'],['으로','으로/로（手段・方向）'],
  ['에서','에서（場所・起点）'],['에게','에게（人への対象）'],['까지','까지（〜まで）'],['부터','부터（〜から）'],
  ['보다','보다（比較「〜より」）'],['처럼','처럼（〜のように）'],['하고','하고（〜と／〜して）'],['이랑','이랑/랑（〜と）'],
  ['랑','이랑/랑（〜と）'],['로','으로/로'],['은','은/는（主題）'],['는','은/는（主題・連体）'],
  ['이','이/가（主格）'],['가','이/가（主格）'],['을','을/를（目的格）'],['를','을/를（目的格）'],
  ['에','에（場所・時・到達点）'],['도','도（〜も）'],['만','만（〜だけ）'],['의','의（〜の）']
];
const common={
  '오늘':'오늘「今日」','오늘은':'오늘「今日」＋은/는','내일':'내일「明日」','어제':'어제「昨日」','요즘':'요즘「最近」',
  '지금':'지금「今」','다시':'다시「再び」','바로':'바로「すぐ」','먼저':'먼저「先に」','미리':'미리「前もって」',
  '정말':'정말「本当に」','조금':'조금「少し」','좀':'좀「少し／依頼を柔らげる」','너무':'너무「とても／あまりに」',
  '아직':'아직「まだ」','벌써':'벌써「もう」','꼭':'꼭「必ず」','천천히':'천천히「ゆっくり」','직접':'직접「直接」',
  '여기':'여기「ここ」','저쪽':'저쪽「あちら」','오른쪽으로':'오른쪽「右」＋으로/로','왼쪽으로':'왼쪽「左」＋으로/로',
  '회사':'회사「会社」','회사에':'회사「会社」＋에','회사에서':'회사「会社」＋에서','집에':'집「家」＋에','집에서':'집「家」＋에서',
  '병원에서':'병원「病院」＋에서','공항에서':'공항「空港」＋에서','인터넷에서':'인터넷「インターネット」＋에서',
  '카드로':'카드「カード」＋으로/로','휴대폰':'휴대폰「携帯電話」','앱에':'앱「アプリ」＋에','파일을':'파일「ファイル」＋을/를',
  '사진을':'사진「写真」＋을/를','메시지로':'메시지「メッセージ」＋으로/로','친구가':'친구「友達」＋이/가',
  '여행을':'여행「旅行」＋을/를','예약을':'예약「予約」＋을/를','상품을':'상품「商品」＋을/를','서류를':'서류「書類」＋을/를',
  '일정을':'일정「日程」＋을/를','내용을':'내용「内容」＋을/를','문서를':'문서「文書」＋을/를','전화를':'전화「電話」＋을/를',
  '한':'한「一つの」','두':'두「二つの」','세':'세「三つの」','열':'열「十」','시':'시「時」','분':'분「分」',
  '다':'다「全部」','더':'더「もっと」','안':'안「〜ない」','왜':'왜「なぜ」','뭐예요':'뭐「何」＋이다 の丁寧形',
  '새':'새「新しい」','다른':'다르다「違う」の連体形','중':'중「〜中」','전에':'전「前」＋에','때':'때「時」'
};
const irregular={
  '잊어버렸어요':'잊어버리다「忘れてしまう」の過去丁寧形',
  '맞췄어요':'맞추다「合わせる・設定する」の過去丁寧形',
  '뒀어요':'두다「置く・しておく」の縮約過去丁寧形',
  '됐어요':'되다「なる」の縮約過去丁寧形',
  '돼요':'되다「なる・よい」の縮約丁寧形',
  '포함돼':'포함되다「含まれる」の縮約語形',
  '포함돼요':'포함되다「含まれる」の縮約丁寧形',
  '입고될':'입고되다「入荷する」の未来連体形',
  '붐벼요':'붐비다「混雑する」の丁寧形',
  '켰어요':'켜다「つける」の過去丁寧形',
  '쟀어요':'재다「測る」の縮約過去丁寧形',
  '물어봤어요':'물어보다「尋ねる」の過去丁寧形',
  '들렀어요':'들르다「立ち寄る」の過去丁寧形',
  '비쌌어요':'비싸다「高い」の過去丁寧形',
  '골랐어요':'고르다「選ぶ」の르不規則過去丁寧形'
};
const endings=[
 ['하고 있어요','進行形 -고 있다'],['고 있어요','進行形 -고 있다'],['해야 해요','義務 -아/어야 하다'],
 ['할 거예요','予定・推測 -(으)ㄹ 거예요'],['할게요','意思 -(으)ㄹ게요'],['해 주세요','依頼 -아/어 주세요'],
 ['해도 돼요','許可 -아/어도 되다'],['하고 싶어요','希望 -고 싶다'],['고 싶어요','希望 -고 싶다'],
 ['았어요','過去丁寧形 -았어요'],['었어요','過去丁寧形 -었어요'],['했어요','하다 の過去丁寧形 -했어요'],
 ['해요','現在丁寧形'],['아요','現在丁寧形 -아요'],['어요','現在丁寧形 -어요'],
 ['해서','理由・順序 -아/어서'],['아서','理由・順序 -아/어서'],['어서','理由・順序 -아/어서'],
 ['하면','条件 -(으)면'],['으면','条件 -(으)면'],['세요','尊敬・丁寧 -(으)세요'],['할','未来連体形 -(으)ㄹ'],
 ['한','하다系・形容詞の連体形 -(으)ㄴ'],['는','現在連体形 -는'],['은','連体形 -(으)ㄴ'],
 ['고','接続 -고'],['게','副詞化 -게']
];

function explainToken(raw){
  const t=clean(raw),n=norm(t);
  if(!t)return '';
  if(/^\d+$/.test(t))return `${t}：数字`;
  if(irregular[t])return irregular[t];
  if(common[t])return common[t];
  if(meaningMap.has(n))return `${t}：${meaningMap.get(n)}`;
  for(const [p,desc] of particles){
    if(t.endsWith(p)&&t.length>p.length){
      const base=t.slice(0,-p.length),bn=norm(base);
      if(meaningMap.has(bn))return `${base}「${meaningMap.get(bn)}」＋${desc}`;
      if(common[base])return `${common[base]}＋${desc}`;
    }
  }
  const entries=[...meaningMap.entries()].sort((a,b)=>b[0].length-a[0].length);
  for(const [w,m] of entries){
    const stem=w.endsWith('하다')?w.slice(0,-2):w.endsWith('되다')?w.slice(0,-1):w.endsWith('다')?w.slice(0,-1):w;
    if(stem.length<2)continue;
    if(n.startsWith(stem)){
      const end=endings.find(([e])=>t.endsWith(e));
      return `${w}「${m}」の活用形${end?`（${end[1]}）`:''}`;
    }
  }
  const end=endings.find(([e])=>t.endsWith(e));
  if(end)return `${t}：${end[1]}を含む語形`;
  return `${t}：例文で使われる語。例文訳の対応箇所と合わせて意味を確認`;
}

function grammarFor(example){
  const out=[];
  if(/[았었했]어요|됐어요|왔어요|갔어요|봤어요|났어요|켰어요|쟀어요|랐어요/.test(example))out.push(4);
  if(/고 있어요/.test(example))out.push(35);
  if(/할 거예요|ㄹ 거예요|을 거예요/.test(example))out.push(50);
  if(/해도 돼요|아도 돼요|어도 돼요/.test(example))out.push(120);
  if(/주세요| 주세요/.test(example))out.push(33);
  if(/해야 해요|아야 해요|어야 해요/.test(example))out.push(46);
  if(/해서|아서|어서/.test(example))out.push(23);
  if(/에서/.test(example))out.push(24);
  if(/까지/.test(example))out.push(48);
  if(/보다/.test(example))out.push(80);
  if(/고 싶어요/.test(example))out.push(69);
  if(/수 있어요/.test(example))out.push(31);
  if(/면 /.test(example)||/으면 /.test(example))out.push(22);
  if(/려고 /.test(example))out.push(73);
  if(/요[.?！]?$/u.test(example))out.push(9);
  if(!out.length)out.push(9);
  return [...new Set(out)].filter(x=>grammarByRank.has(x));
}

const priorExamples=new Set([...src.matchAll(/"example"\s*:\s*"([^"]+)"/g)].map(m=>m[1]));
const cards=selected.map((row,i)=>{
  const rank=START+i,[word,meaning,example,jp,note]=row;
  if(priorExamples.has(example))throw new Error(`duplicate example @${rank}`);
  priorExamples.add(example);
  const gr=grammarFor(example);
  if(!gr.length)throw new Error(`grammar missing @${rank}`);
  const tokens=String(example).split(/\s+/).map(clean).filter(Boolean);
  const form_notes={};
  for(const t of tokens)form_notes[t]=explainToken(t);
  if(Object.keys(form_notes).length!==new Set(tokens).size)throw new Error(`token note mismatch @${rank}`);
  if(Object.values(form_notes).some(x=>!x||String(x).length<3))throw new Error(`unexplained token @${rank}`);
  const links=gr.map(r=>{const g=grammarByRank.get(r)||{};return {rank:r,pattern:g.name||g.pattern||'',jp:g.definition||g.jp||''};});
  return {
    rank,word,meaning,example,example_jp:jp,register:'丁寧・日常会話中心',
    grammar:links.map(x=>x.pattern).filter(Boolean),grammar_ranks:gr,grammar_links:links,
    grammar_jp:`文法ワンポイント：${links.map(x=>`Rank ${x.rank} ${x.pattern}「${x.jp}」`).join('／')}／例文内の全語・活用形は form_notes で確認`,
    form_notes,word_notes:note,tts:example,tts_text:example,ready:true
  };
});
if(cards.length!==100||cards[0].rank!==3101||cards.at(-1).rank!==3200)throw new Error('card range failure');
if(new Set(cards.map(x=>norm(x.word))).size!==100)throw new Error('duplicate new headword');
if(new Set(cards.map(x=>x.example)).size!==100)throw new Error('duplicate new example');
for(const c of cards){
  if(c.tts!==c.example||c.tts_text!==c.example)throw new Error(`TTS mismatch @${c.rank}`);
  if(!c.example_jp||!c.grammar_links.length||!c.word_notes||!c.form_notes)throw new Error(`required field missing @${c.rank}`);
}

const readyToken='const READY=new Map(PACK.filter';
const readyPos=src.indexOf(readyToken);
if(readyPos<0)throw new Error('READY initialization missing');
const packPos=Math.max(src.lastIndexOf('const PACK=',readyPos),src.lastIndexOf('let PACK=',readyPos));
if(packPos<0||packPos>=readyPos)throw new Error('PACK init order missing');
for(let r=START;r<=END;r++)if(new RegExp(`"rank"\\s*:\\s*${r}(?=[,}])`).test(src.slice(packPos,readyPos)))throw new Error(`Rank already materialized ${r}`);
const anchor=src.lastIndexOf('PACK.push(...[{"rank":3001',readyPos);
if(anchor<0)throw new Error('Rank 3001 anchor missing');
src=src.slice(0,anchor)+`PACK.push(...${JSON.stringify(cards)});\n`+src.slice(anchor);

src=src.replace('FSRS · v1.5.0','FSRS · v1.5.1')
       .replace('Web公開版 v1.5.0','Web公開版 v1.5.1')
       .replace('教材化済み：Rank 1–3100','教材化済み：Rank 1–3200');

const critical=[
'id="startBtn"','id="showAnswerBtn"','id="knownBtn"','id="saveSettingsBtn"','id="cloudSyncNowBtn"','id="exportBtn"','id="importProgress"',
'document.getElementById("startBtn").addEventListener("click"','document.getElementById("showAnswerBtn").addEventListener("click"',
'document.getElementById("knownBtn").addEventListener("click"','document.getElementById("saveSettingsBtn").addEventListener("click"',
'syncBtn.addEventListener("click",()=>syncCloudCore(true))','document.getElementById("exportBtn").addEventListener("click"',
'document.getElementById("importProgress").addEventListener("change"',
'korean-daily-3000-state-v01','korean-daily-3000-settings-v01','korean-daily-3000-sync-v01',
'function initCloudSync(','function syncCloudCore(','function queueCloudSave(','const READY=new Map(PACK.filter','function normalizeExampleToken'
];
for(const x of critical)if(!src.includes(x))throw new Error(`regression token missing: ${x}`);
const newReady=src.indexOf(readyToken),newPack=Math.max(src.lastIndexOf('const PACK=',newReady),src.lastIndexOf('let PACK=',newReady));
if(newPack<0||newPack>=newReady)throw new Error('PACK initialization order regression');
const p3101=src.indexOf('PACK.push(...[{"rank":3101',newPack);
const p3001=src.indexOf('PACK.push(...[{"rank":3001',p3101);
if(!(newPack<p3101&&p3101<p3001&&p3001<newReady))throw new Error('extended PACK order regression');
const ext=src.slice(p3101,p3001);
for(const f of ['"tts_text":','"grammar_links":','"example_jp":','"word_notes":','"form_notes":'])
  if(ext.split(f).length-1!==100)throw new Error(`field count ${f}`);
if(ext.split('文法ワンポイント：').length-1!==100)throw new Error('grammar point count');
for(let r=3101;r<=3200;r++){
  if((src.match(new RegExp(`"rank"\\s*:\\s*${r}(?=[,}])`,'g'))||[]).length<2)throw new Error(`rank/card mapping absent ${r}`);
}
fs.writeFileSync(file,src);
console.log(`AUDIT OK Daily5000 Rank ${START}-${END}: 100 cards; duplicate filtering; all-token form_notes; grammar links; TTS; legacy SRS/cloud/buttons/PACK order preserved`);
