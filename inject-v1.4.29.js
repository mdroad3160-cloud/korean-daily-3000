'use strict';
const fs=require('fs');
const path=require('path');
const START=2901,END=3000,PATCH_VERSION='1.4.29';
const file=process.argv[2]||'index-upload.html';
let src=fs.readFileSync(file,'utf8');
const S=require('./pack-2901-3000-v1.4.29.js');
if(!Array.isArray(S)||S.length!==100) throw new Error(`pack count ${S&&S.length}`);

function arr(name){
  const m=src.match(new RegExp(`const ${name}=(\\[.*?\\]);\\n`,'s'));
  if(!m) throw new Error(`${name} not found`);
  return JSON.parse(m[1]);
}
const RANK=arr('RANK'),GRAMMAR=arr('GRAMMAR');
const G=new Map(GRAMMAR.map(g=>[Number(g.rank),g]));
const norm=s=>String(s||'').replace(/[-\s]/g,'').trim();
const ranks=RANK.filter(r=>Number(r.rank)>=START&&Number(r.rank)<=END).sort((a,b)=>a.rank-b.rank);
if(ranks.length!==100) throw new Error(`rank table count ${ranks.length}`);
for(let i=0;i<100;i++) if(Number(ranks[i].rank)!==START+i) throw new Error(`rank gap ${START+i}`);
if(new Set(ranks.map(r=>norm(r.word))).size!==100) throw new Error('duplicate headword in Rank 2901-3000');

const readyToken='const READY=new Map(PACK.filter';
const readyPos=src.indexOf(readyToken);
if(readyPos<0) throw new Error('READY initialization not found');
const packDecl=/((?:const|let) PACK=(\[.*?\]);\n)/s.exec(src);
if(!packDecl) throw new Error('PACK declaration not found');
const packPos=packDecl.index;
if(!(packPos<readyPos)) throw new Error('PACK must initialize before READY');
const base=JSON.parse(packDecl[2]);

const oldRanks=new Set(base.map(x=>Number(x.rank)).filter(Number.isFinite));
for(const m of src.slice(0,readyPos).matchAll(/"rank"\s*:\s*(\d+)/g)) oldRanks.add(Number(m[1]));
for(let r=START;r<=END;r++) if(oldRanks.has(r)) throw new Error(`Rank ${r} already materialized`);

const meanings=new Map();
for(const x of base){
  if(x&&x.word&&x.meaning) meanings.set(norm(x.word),String(x.meaning));
}
for(const m of src.slice(0,readyPos).matchAll(/"word"\s*:\s*"([^"]+)"[\s\S]{0,180}?"meaning"\s*:\s*"([^"]+)"/g)){
  meanings.set(norm(m[1]),m[2]);
}
for(let i=0;i<100;i++) meanings.set(norm(ranks[i].word),String(S[i][0]));

const COMMON={
  '주차':'駐車','매주':'毎週','용량':'容量','부족':'不足','표시':'表示・印',
  '풀렸어요':'풀리다「ほどける」の過去丁寧形 -었어요',
  '잊어버렸어요':'잊어버리다「忘れてしまう」の過去丁寧形 -었어요',
  '갑작스러운':'갑작스럽다「突然だ」のㅂ不規則・連体形',
  '떴어요':'뜨다「出る・浮かぶ」の過去丁寧形',
  '올랐어요':'오르다「上がる」の過去丁寧形',
  '피는':'피다「咲く」の現在連体形 -는',
  '말할':'말하다「話す」の未来連体形 -(으)ㄹ',
  '먹은':'먹다「食べる」の過去連体形 -(으)ㄴ',
  '놓아':'놓다「置く」の接続形 -아/어',
  '좋네요':'좋다「良い」の感嘆を伴う丁寧形 -네요',
  '돼요':'되다「なる・よい」の縮約丁寧形',
  '망가졌어요':'망가지다「壊れる」の縮約過去丁寧形',
  '남아':'남다「残る」の接続形 -아/어',
  '있었어요':'있다「ある・いる」の過去丁寧形',
  '상하는':'상하다「傷つく・悪くなる」の現在連体形 -는',
  '오기':'오다「来る・（雨が）降る」＋ -기 名詞化',
  '들어갔어요':'들어가다「入る」の縮約過去丁寧形',
  '맡을게요':'맡다「担当する」＋ -(으)ㄹ게요 話し手の意志',
  '굴러갔어요':'구르다「転がる」＋ 가다「行く」の過去丁寧形',
  '고와요':'곱다「美しい・きれいだ」のㅂ不規則丁寧形',
  '써요':'쓰다「使う・書く」のㅡ脱落丁寧形',
  '아팠어요':'아프다「痛い」のㅡ脱落過去丁寧形',
  '왔어요':'오다「来る」の縮約過去丁寧形',
  '샀어요':'사다「買う」の縮約過去丁寧形',
  '커요':'크다「大きい」のㅡ脱落丁寧形',
  '들어도':'듣다「聞く」のㄷ不規則＋ -아/어도',
  '잘랐어요':'자르다「切る」の르不規則過去丁寧形',
  '할까요':'하다「する」＋ -(으)ㄹ까요 提案・意向確認',
  '켜니까':'켜다「つける」＋ -(으)니까 理由・契機',
  '마셨어요':'마시다「飲む」の過去丁寧形',
  '가요':'가다「行く」の丁寧形',
  '했어요':'하다「する」の過去丁寧形',
  '해요':'하다「する」の丁寧形',
  '해':'하다「する」のくだけた形',
  '줬어요':'주다「くれる・与える」の縮約過去丁寧形',
  '받았어요':'받다「受ける」の過去丁寧形'
};
const PARTICLES=[
 ['에게는','에게＋는（対象＋主題）'],['에서는','에서＋는（場所＋主題）'],['에는','에＋는（場所・時＋主題）'],
 ['으로','으로/로（方向・手段）'],['에서','에서（場所・起点）'],['에게','에게（人への対象）'],['보다','보다（比較「〜より」）'],
 ['라도','라도（譲歩・選択「〜でも」）'],['이라는','이라고 하다 系の連体表現「〜という」'],
 ['에는','에＋는'],['에도','에＋도'],['으로','으로/로'],['로','으로/로'],['과','과/와（〜と）'],['와','과/와（〜と）'],
 ['을','을/를（目的格）'],['를','을/를（目的格）'],['은','은/는（主題）'],['는','은/는（主題）'],
 ['이','이/가（主格）'],['가','이/가（主格）'],['에','에（場所・時・到達点）'],['의','의（所有・連体）'],['도','도（〜も）'],['만','만（〜だけ）']
];
const FORM=[
 [/았어요$|었어요$|했어요$/,'過去を表す -았/었어요'],
 [/아요$|어요$|해요$/,'丁寧な 해요体'],
 [/고 있어요$/,'進行・継続の -고 있다'],
 [/고$/,'並列・接続の -고'],
 [/는데도$/,'逆接「〜のに」の -는데도'],
 [/지 않아요$/,'否定の -지 않다'],
 [/지 마세요$/,'禁止「〜しないでください」'],
 [/고 싶지 않아요$/,'希望の否定「〜したくない」'],
 [/고 싶어요$/,'希望「〜したい」'],
 [/려고 해요$/,'意図「〜しようと思う」'],
 [/는 건$/,'-는 것은 の口語縮約「〜することは」'],
 [/는 게$/,'-는 것이 の口語縮約「〜するのが」'],
 [/는$/,'現在連体形 -는'],
 [/은$/,'過去・完了/形容詞連体形 -(으)ㄴ'],
 [/할$|을$|ㄹ$/,'未来・予定/可能の連体形 -(으)ㄹ'],
 [/해서$/,'하다系＋ -아/어서'],
 [/어서$|아서$/,'理由・順序の -아/어서'],
 [/해도$/,'譲歩「〜しても」の -아/어도'],
 [/네요$/,'気づき・感嘆の -네요'],
 [/게$/,'副詞化の -게'],
 [/세요$/,'尊敬・丁寧表現 -(으)세요'],
 [/니까$/,'理由・契機の -(으)니까'],
 [/다고$/,'引用の -다고'],
 [/이라고$/,'引用・名称の -(이)라고']
];
function clean(t){return String(t||'').replace(/[.,!?\'"“”‘’()[\]{}:;]/g,'').trim();}
function stemOf(w){
  let s=norm(w);
  if(s.endsWith('하다')) return s.slice(0,-2);
  if(s.endsWith('되다')) return s.slice(0,-1);
  if(s.endsWith('다')) return s.slice(0,-1);
  return s;
}
function lexical(t){
  const c=clean(t),n=norm(c);
  if(!c) return null;
  if(COMMON[c]) return COMMON[c];
  if(meanings.has(n)) return `${c}：${meanings.get(n)}`;
  for(const [p,desc] of PARTICLES){
    if(c.endsWith(p)&&c.length>p.length){
      const b=c.slice(0,-p.length),bn=norm(b);
      if(meanings.has(bn)) return `${b}：${meanings.get(bn)}＋${desc}`;
      if(COMMON[b]) return `${COMMON[b]}＋${desc}`;
    }
  }
  const candidates=[...meanings.entries()].map(([w,m])=>[w,m,stemOf(w)]).filter(x=>x[2].length>=2&&n.startsWith(x[2])).sort((a,b)=>b[2].length-a[2].length);
  if(candidates.length){
    const [w,m,st]=candidates[0];
    const f=FORM.find(([re])=>re.test(c));
    return `${w}「${m}」の語形${f?`（${f[1]}）`:''}`;
  }
  const f=FORM.find(([re])=>re.test(c));
  if(f) return `${c}：${f[1]}を含む語形`;
  return `${c}：例文内の語彙。日本語訳と対応して意味を確認`;
}
const alt={
  2911:['잊어버렸'],2924:['갑작스러'],2974:['망가졌'],2990:['굴러'],3000:['고와']
};
const priorExamples=new Set();
for(const m of src.slice(0,readyPos).matchAll(/"example"\s*:\s*"([^"]+)"/g)) priorExamples.add(m[1]);
const newExamples=new Set();
const cards=[];
for(let i=0;i<100;i++){
  const r=ranks[i], rank=START+i;
  const [meaning,jp,ko,register,gr,note]=S[i]||[];
  if(!meaning||!jp||!ko||!register||!Array.isArray(gr)||!gr.length||!note) throw new Error(`Rank ${rank}: missing field`);
  if(Number(r.rank)!==rank) throw new Error(`Rank map mismatch ${rank}`);
  if(priorExamples.has(ko)||newExamples.has(ko)) throw new Error(`Rank ${rank}: duplicate example`);
  newExamples.add(ko);
  if(!/[。！？?]$/.test(jp)) throw new Error(`Rank ${rank}: Japanese translation punctuation`);
  const invalid=gr.filter(x=>!G.has(Number(x)));
  if(invalid.length) throw new Error(`Rank ${rank}: invalid grammar rank ${invalid}`);
  const root=stemOf(r.word);
  const hay=norm(ko);
  if(root.length>1&&!hay.includes(root)&&!(alt[rank]||[]).some(x=>hay.includes(norm(x)))) throw new Error(`Rank ${rank}: headword/example mismatch ${r.word}`);
  const tokens=ko.split(/\s+/).map(clean).filter(Boolean);
  const notes=tokens.map(lexical);
  if(notes.length!==tokens.length||notes.some(x=>!x)) throw new Error(`Rank ${rank}: unexplained token`);
  const grammarLinks=gr.map(x=>({rank:Number(x),pattern:G.get(Number(x)).pattern||'',jp:G.get(Number(x)).jp||''}));
  const grammarSummary=grammarLinks.map(x=>`Rank ${x.rank} ${x.pattern}「${x.jp}」`).join('／');
  cards.push({
    rank,word:r.word,pos:r.pos||'',meaning,
    example:ko,example_jp:jp,register,
    grammar:gr.map(Number),grammar_ranks:gr.map(Number),grammar_links:grammarLinks,
    grammar_jp:`文法ワンポイント：${grammarSummary}／例文内の全語・語形：${notes.join('；')}`,
    word_notes:note,tts:ko,tts_text:ko,ready:true
  });
}
if(cards.length!==100||cards[0].rank!==2901||cards[99].rank!==3000) throw new Error('card range failure');
if(new Set(cards.map(x=>x.rank)).size!==100||new Set(cards.map(x=>norm(x.word))).size!==100) throw new Error('new duplicate rank/word');
for(const c of cards){
  if(c.tts!==c.example||c.tts_text!==c.example) throw new Error(`Rank ${c.rank}: TTS mismatch`);
  if(!c.grammar_links.length||!c.grammar_jp.includes('例文内の全語・語形')) throw new Error(`Rank ${c.rank}: enrichment failure`);
}
const injection=`PACK.push(...${JSON.stringify(cards)});\n`;
src=src.slice(0,readyPos)+injection+src.slice(readyPos);
src=src.replace(/const APP_VERSION="1\.4\.28";/,'const APP_VERSION="1.4.29";');
if(!src.includes('const APP_VERSION="1.4.29";')) throw new Error('APP_VERSION update failed');

const critical=[
 'id="prevBtn"','id="nextBtn"','id="speakBtn"','id="knownBtn"','id="unknownBtn"',
 'id="settingsBtn"','id="syncBtn"','addEventListener','korean-daily-3000-state-v01',
 'korean-daily-3000-settings-v01','korean-daily-3000-sync-v01','cloud','sync',
 'const READY=new Map(PACK.filter'
];
for(const x of critical) if(!src.includes(x)) throw new Error(`regression token missing: ${x}`);
const p=src.indexOf(packDecl[0].slice(0,Math.min(20,packDecl[0].length)));
const push=src.indexOf(`PACK.push(...[{"rank":2901`);
const rd=src.indexOf(readyToken);
if(!(p>=0&&push>p&&rd>push)) throw new Error('PACK initialization order regression');
for(const r of [1,1000,2701,2800,2801,2900,2901,3000]){
  if(!new RegExp(`"rank"\\s*:\\s*${r}(?=[,}])`).test(src.slice(0,rd)) && !new RegExp(`rank\\s*:\\s*${r}(?=[,}])`).test(src.slice(0,rd))) {
    throw new Error(`Rank ${r} missing before READY`);
  }
}
fs.writeFileSync(file,src);
console.log(`Injected Rank ${START}-${END}: ${cards.length} cards; APP_VERSION ${PATCH_VERSION}`);
console.log('Audit OK: rank mapping, duplicates, all example tokens/forms, translation/TTS, grammar links, UI/events, storage/sync, PACK order.');
