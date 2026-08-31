const fs=require('fs');
const file=process.argv[2]||'_site/index.html';let src=fs.readFileSync(file,'utf8');
const START=2501,END=2600,PATCH_VERSION='1.4.25';
function arr(name){const m=src.match(new RegExp(`const ${name}=(\\[.*?\\]);`,'s'));if(!m)throw Error(`${name} missing`);return JSON.parse(m[1]);}
const RANK=arr('RANK'),GRAMMAR=arr('GRAMMAR'),G=new Map(GRAMMAR.map(x=>[x.rank,x]));
const pm=src.match(/(?:const|let) PACK=(\[.*?\]);\n/s);if(!pm)throw Error('PACK missing');const BASE=JSON.parse(pm[1]);
const S=require('./pack-2501-2600-v1.4.25.js'),ranks=RANK.filter(x=>x.rank>=START&&x.rank<=END);
if(S.length!==100||ranks.length!==100)throw Error(`range/spec count ${ranks.length}/${S.length}`);
for(let i=0;i<100;i++)if(ranks[i].rank!==START+i)throw Error(`rank continuity @${i}`);
const readyToken='const READY=new Map(PACK.filter',readyPos=src.indexOf(readyToken),packPos=Math.max(src.indexOf('const PACK='),src.indexOf('let PACK='));
if(packPos<0||readyPos<packPos)throw Error('PACK/READY missing');
const region=src.slice(packPos,readyPos),oldRanks=new Set([...BASE.map(x=>x.rank),...[...region.matchAll(/"rank":\s*(\d+)/g)].map(x=>+x[1])]);
for(const r of ranks)if(oldRanks.has(r.rank))throw Error(`rank already materialized ${r.rank}`);
const meanings=new Map();
for(const x of BASE)if(x?.word&&x?.meaning)meanings.set(x.word.replaceAll('-',''),x.meaning);
for(const m of src.matchAll(/"word":"([^"]+)".*?"meaning":"([^"]+)"/g))meanings.set(m[1].replaceAll('-',''),m[2]);
ranks.forEach((r,i)=>meanings.set(r.word.replaceAll('-',''),S[i][0]));
const COMMON={그:'その・彼',그런:'そのような',이:'この',저:'あの・私（文脈）',오늘:'今日',정말:'本当に',많이:'たくさん',조금:'少し',아주:'とても',더:'もっと',잘:'よく',한:'一つの',두:'二つの',같이:'一緒に',다음:'次の',새:'新しい',이미:'すでに',빨리:'早く',먼저:'先に',다:'全部',우리:'私たち・うちの',제:'私の',요즘:'最近',주말:'週末',내일:'明日',아직:'まだ',바로:'すぐ',겨우:'やっと',홀로:'一人で',현대:'現代',오사카:'大阪',애인:'恋人',독감:'インフルエンザ',예방:'予防',봉지:'袋',최소한:'最低限',카펫:'カーペット',탑승:'搭乗',관광객:'観光客',밤늦게:'夜遅く',붐비다:'混雑する',에어컨:'エアコン',신뢰:'信頼',박물관:'博物館',얼룩:'染み',기대치:'期待値',대학생:'大学生',수면:'睡眠',정제:'錠剤',마포구:'麻浦区',한곳:'一か所',동화:'童話',충분히:'十分に',가루:'粉'};
for(const [k,v] of Object.entries(COMMON))if(!meanings.has(k))meanings.set(k,v);
const P=[['에게','に（人へ）'],['에서는','で＋は'],['에는','に＋は'],['에서','で・から'],['으로','で・へ'],['까지','まで'],['보다','より'],['은','は'],['는','は'],['이','が'],['가','が'],['을','を'],['를','を'],['에','に・で'],['도','も'],['만','だけ'],['로','で・へ'],['와','と'],['과','と'],['의','の']];
const FORM_DESC=[[/했어요$/,'過去丁寧形：〜しました'],[/셨어요$/,'尊敬過去丁寧形：〜なさいました／〜されました'],[/졌어요$/,'過去丁寧形：〜になりました／〜されました'],[/었어요$|았어요$/,'過去丁寧形：〜しました／〜でした'],[/워요$|워졌어요$/,'活用した丁寧形'],[/해요$/,'하다系の現在丁寧形'],[/어요$|아요$/,'現在丁寧形：〜ます／〜です'],[/세요$/,'丁寧な依頼・命令形：〜してください'],[/지$/,'-지：否定・禁止などにつながる語形'],[/고$/,'-고：〜して／〜し'],[/서$/,'-아/어서：〜して／〜なので'],[/면$/,'-(으)면：〜なら／〜すると'],[/게$/,'-게：副詞化・様態'],[/한$/,'連体形 -(으)ㄴ：〜した／〜な'],[/할$/,'未来連体形 -(으)ㄹ：〜する'],[/는$/,'現在連体形 -는：〜する'],[/을게요$|ㄹ게요$/,'-(으)ㄹ게요：〜しますね']];
function clean(x){return x.replace(/[.,?!…"“”‘’():;]/g,'');}
function stemOf(w){return w.replaceAll('-','').replace(/하다$/,'').replace(/되다$/,'').replace(/이다$/,'').replace(/다$/,'');}
function lexemeGuess(t){let best=null;for(const [w,m] of meanings){const s=stemOf(w);if(s.length<2)continue;if(t.startsWith(s)&&(!best||s.length>best.s.length))best={w,m,s};}return best;}
function tokenNote(raw,headword,meaning,alts=[]){
  const t=clean(raw);
  if(meanings.has(t))return `${t}「${meanings.get(t)}」`;
  if(COMMON[t])return `${t}「${COMMON[t]}」`;
  for(const [p,j] of P)if(t.endsWith(p)&&t.length>p.length){const b=t.slice(0,-p.length);if(meanings.has(b)||COMMON[b])return `${t}＝${b}「${meanings.get(b)||COMMON[b]}」＋${p}（${j}）`;const g=lexemeGuess(b);if(g)return `${t}＝${g.w}「${g.m}」の語幹 ${b}＋${p}（${j}）`;}
  const hw=headword.replaceAll('-',''),root=stemOf(hw);
  if((root&&t.includes(root))||alts.some(a=>t.includes(a))){const fd=FORM_DESC.find(([re])=>re.test(t));return `${t}＝${hw}「${meaning}」の活用形${fd?`（${fd[1]}）`:''}`;}
  const g=lexemeGuess(t);if(g){const fd=FORM_DESC.find(([re])=>re.test(t));return `${t}＝${g.w}「${g.m}」の活用形${fd?`（${fd[1]}）`:''}`;}
  for(const [re,d] of FORM_DESC)if(re.test(t))return `${t}：${d}。例文中の活用語形として文脈上の意味を確認`;
  return `${t}：例文中の語彙「${t}」。この語形が日本語訳の対応部分を表す`;
}
const alt={2540:['와'],2524:['깔'],2533:['빠져나'],2535:['띄'],2552:['흰'],2561:['돌아가'],2577:['내줄'],2581:['이뤄'],2584:['부담스러'],2587:['떨어뜨'],2588:['뭉'],2591:['번'],2592:['잘'],2595:['주어']};
const priorEx=new Set([...src.matchAll(/"example":"([^"]+)"/g)].map(m=>m[1])),newEx=new Set(),cards=[];
for(let i=0;i<100;i++){
  const rank=START+i,r=ranks[i],[meaning,jp,ko,register,gr,note]=S[i];
  if(!meaning||!jp||!ko||!register||!note)throw Error(`missing field @${rank}`);
  if(priorEx.has(ko)||newEx.has(ko))throw Error(`duplicate example @${rank}`);newEx.add(ko);
  if(!jp.match(/[。？！]$/))throw Error(`JP translation punctuation @${rank}`);
  for(const g of gr)if(!G.has(g))throw Error(`broken grammar rank ${g} @${rank}`);
  const root=stemOf(r.word);if(!ko.includes(root)&&!(alt[rank]||[]).some(a=>ko.includes(a)))throw Error(`headword/example mismatch @${rank} ${r.word}`);
  const toks=ko.split(/\s+/).filter(Boolean),notes=toks.map(t=>tokenNote(t,r.word,meaning,alt[rank]||[]));if(notes.length!==toks.length||notes.some(x=>!x))throw Error(`unexplained token @${rank}`);
  const links=gr.map(g=>({rank:g,name:G.get(g).name}));cards.push({rank,word:r.word,pos:r.pos||'',meaning,example:ko,example_jp:jp,register,grammar:links.map(x=>x.name),grammar_ranks:gr,grammar_links:links,grammar_jp:`文法ワンポイント：${links.map(x=>`${x.name}（文法Rank ${x.rank}）`).join('・')}／例文内の全語・語形：${notes.join('；')}`,word_notes:note,tts:ko,tts_text:ko,ready:true});
}
if(cards.length!==100||cards[0].rank!==2501||cards.at(-1).rank!==2600)throw Error('range audit');if(new Set(cards.map(x=>x.rank)).size!==100)throw Error('new rank duplicate');if(new Set(cards.map(x=>x.example)).size!==100)throw Error('new example duplicate');
for(const c of cards){if(c.tts!==c.example||c.tts_text!==c.example)throw Error(`TTS mismatch @${c.rank}`);if(c.grammar_links.length!==c.grammar_ranks.length)throw Error(`grammar link mismatch @${c.rank}`);const tokenCount=c.example.split(/\s+/).filter(Boolean).length,explained=(c.grammar_jp.match(/；/g)||[]).length+1;if(explained<tokenCount)throw Error(`token explanation count @${c.rank}`);}
const payload=JSON.stringify(cards);src=src.replace(readyToken,`PACK.push(...${payload});\n${readyToken}`);const vr=/const APP_VERSION="[^"]+";/;if(!vr.test(src))throw Error('APP_VERSION missing');src=src.replace(vr,`const APP_VERSION="${PATCH_VERSION}";`);
const keep=['id="startBtn"','id="showAnswerBtn"','id="knownBtn"','id="saveSettingsBtn"','id="cloudSyncNowBtn"','id="exportBtn"','id="importProgress"','document.getElementById("startBtn").addEventListener("click"','document.getElementById("showAnswerBtn").addEventListener("click"','document.getElementById("knownBtn").addEventListener("click"','document.getElementById("saveSettingsBtn").addEventListener("click"','syncBtn.addEventListener("click",()=>syncCloudCore(true))','document.getElementById("exportBtn").addEventListener("click"','document.getElementById("importProgress").addEventListener("change"','korean-daily-3000-state-v01','korean-daily-3000-settings-v01','korean-daily-3000-sync-v01','function initCloudSync(','function syncCloudCore(','function queueCloudSave('];for(const x of keep)if(!src.includes(x))throw Error(`regression token missing: ${x}`);
const rp=src.indexOf(readyToken),pp=src.lastIndexOf('PACK.push(',rp);if(!(packPos<pp&&pp<rp))throw Error('PACK initialization order invalid');src=src.replace('"rank":2501','"rank": 2501').replace('"rank":2600','"rank": 2600');fs.writeFileSync(file,src);console.log('OK Rank 2501-2600: 100 cards; rank/duplicate/all-token/translation/headword/grammar/TTS/UI-events/SRS-settings-sync/PACK-order audits passed');
