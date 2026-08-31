const raw=[...require('./raw-1601-1625-v1.4.16.js'),...require('./raw-1626-1650-v1.4.16.js'),...require('./raw-1651-1675-v1.4.16.js'),...require('./raw-1676-1700-v1.4.16.js')];
const inherited={};
for(const f of ['./pack-1001-1100-v1.4.10.js','./pack-1101-1200-v1.4.11.js','./pack-1201-1300-v1.4.12.js','./pack-1301-1400-v1.4.13.js','./pack-1401-1500-v1.4.14.js','./pack-1501-1600-v1.4.15.js']){
 for(const c of require(f))for(const [k,v] of Object.entries(c.form_notes||{}))if(!inherited[k])inherited[k]=v;
}
const particles=[["에서는","에서（場所）＋는（対比）"],["으로는","으로（方法・方向）＋는（対比）"],["에게는","에게（対象）＋는（対比）"],["까지","〜まで"],["부터","〜から"],["에서","〜で／〜から"],["에게","〜に"],["으로","〜で／〜へ"],["로","〜で／〜へ"],["랑","〜と"],["과","〜と"],["와","〜と"],["의","〜の"],["은","話題・対比"],["는","話題・対比"],["이","主格"],["가","主格"],["을","目的格"],["를","目的格"],["에","時・場所・方向"],["도","〜も"],["만","〜だけ"]];
function explain(t,w,m){
 const clean=w.replaceAll('-','');
 if(t===clean||t===w)return `${w}「${m}」（見出し語）`;
 if(inherited[t])return inherited[t];
 if(w==='가'&&t.endsWith('가'))return `${t.slice(0,-1)}＋가（主格助詞「〜が」）`;
 const stem=clean.endsWith('다')?clean.slice(0,-1):clean;
 if(stem.length>=2&&t.startsWith(stem.slice(0,Math.max(2,stem.length-1)))){
  if(/(았|었|했)어요$/.test(t))return `${w}「${m}」→${t}（過去 -았/었-＋丁寧語尾 -요）`;
  if(/(아|어|해)요$/.test(t))return `${w}「${m}」→${t}（現在・丁寧形）`;
  if(/(아서|어서|해서)$/.test(t))return `${w}「${m}」→${t}（理由・接続 -아/어서）`;
  if(/(으면|면)$/.test(t))return `${w}「${m}」→${t}（条件 -(으)면）`;
  if(/고$/.test(t))return `${w}「${m}」→${t}（接続 -고）`;
  if(/(은|는|ㄴ)$/.test(t))return `${w}「${m}」→${t}（連体形）`;
  return `${w}「${m}」→${t}（例文中の活用・派生形）`;
 }
 for(const [p,d] of particles)if(t.length>p.length+1&&t.endsWith(p)){const b=t.slice(0,-p.length);if(b===clean)return `${w}「${m}」＋${p}（${d}）`;if(inherited[b])return `${b}＋${p}（${d}）`;}
 if(/(았|었|했)어요$/.test(t))return `${t}（過去 -았/었-＋丁寧語尾 -요 を含む活用形）`;
 if(/(아|어|해)요$/.test(t))return `${t}（現在・丁寧形 -아/어/해요）`;
 if(/(아서|어서|해서)$/.test(t))return `${t}（理由・接続 -아/어서 を含む語形）`;
 if(/(으면|면)$/.test(t))return `${t}（条件 -(으)면 を含む語形）`;
 if(/고$/.test(t))return `${t}（-고 で後続の動作・状態へ接続）`;
 if(/요$/.test(t))return `${t}（丁寧語尾 -요 を含む会話形）`;
 return `${t}（例文中の語彙・語形。日本語訳と文脈に対応）`;
}
const gd={2:"主語を示す -이/가 です。",3:"目的語を示す -을/를 です。",4:"過去形 -았/었- です。",5:"話題・対比の -은/는 です。",9:"丁寧な会話語尾 -요 です。",10:"動作をつなぐ -고 です。",17:"手段・方向の -(으)로 です。",18:"追加の -도 です。",22:"条件 -(으)면 です。",23:"理由・順序の -아/어서 です。",24:"動作場所の -에서 です。",33:"依頼・恩恵の -아/어 주다 です。",35:"進行・継続の -고 있다 です。",37:"試行の -아/어 보다 です。",48:"終点の -까지 です。",56:"対象の -에게 です。",59:"丁寧な依頼の -(으)세요 です。",64:"意思の -(으)ㄹ게요 です。",69:"希望の -고 싶다 です。",73:"意図の -(으)려고 です。",80:"比較の -보다 です。",94:"禁止の -지 말다 です。",114:"「〜する前に」の 전에 です。"};
function grammar(e){const r=[],n=[];const add=(x,s)=>{if(!r.includes(x)){r.push(x);n.push(s)}};if(/(았|었|했)어요/.test(e))add(4,'V+았/었/였');if(/(아서|어서|해서)/.test(e))add(23,'V+아/어서');if(/고 있어/.test(e))add(35,'고 있다');if(/고 싶/.test(e))add(69,'고 싶다');if(/지 마세요/.test(e)){add(94,'지 말다');add(59,'V+(으)세요');}if(/주세요|줘요|드려요/.test(e))add(33,'아/어 주다');if(/보세요|봐요|봤어요/.test(e))add(37,'아/어 보다');if(/게요/.test(e))add(64,'V+(으)ㄹ게(요)');if(/(으면|면)(\s|,|\.)/.test(e))add(22,'V+(으)면');if(/려고/.test(e))add(73,'V+(으)려고');if(/보다/.test(e))add(80,'-보다');if(/전에/.test(e))add(114,'전에');if(/까지/.test(e))add(48,'-까지');if(/에서/.test(e))add(24,'-에서');if(/에게/.test(e))add(56,'-에게');if(/(으로|로)(\s|[,.?]|$)/.test(e))add(17,'-(으)로');if(/(을|를)(\s|[,.?]|$)/.test(e))add(3,'-을/를');if(/(이|가)(\s|[,.?]|$)/.test(e))add(2,'-이/가');if(/(은|는)(\s|[,.?]|$)/.test(e))add(5,'-은/는');if(/도(\s|[,.?]|$)/.test(e))add(18,'-도');if(/요[.?]?$/.test(e)||e.includes('요.'))add(9,'-요');if(!r.length)add(9,'-요');return[n,r];}
const formal=new Set([1632,1635,1652,1653,1656,1667,1683,1696]);
const cards=raw.map(([rank,word,meaning,example,example_jp,note])=>{const tokens=example.match(/[0-9]+|[가-힣]+/g)||[];const form_notes={};for(const t of tokens)form_notes[t]=explain(t,word,meaning);const [gn,gr]=grammar(example);return{rank,word,meaning,example,example_jp,grammar:gn,grammar_jp:gr.map((r,i)=>gd[r]||`${gn[i]} を例文中で確認します。`).join(' '),register:formal.has(rank)?'一般・やや文章語':'日常・丁寧',form_notes,ready:true,note,grammar_ranks:gr,tts_text:example};});
module.exports=cards;
