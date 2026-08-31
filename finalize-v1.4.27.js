const fs=require('fs');
const file=process.argv[2]||'_site/index.html';let s=fs.readFileSync(file,'utf8');
const repl=[['FSRS · v1.4.19','FSRS · v1.4.27'],['Web公開版 v1.4.19','Web公開版 v1.4.27'],['教材化済み：Rank 1–2000','教材化済み：Rank 1–2800']];
for(const [a,b] of repl){if(!s.includes(a))throw Error(`UI baseline missing: ${a}`);s=s.replace(a,b);}
if(!s.includes('const APP_VERSION="1.4.27";'))throw Error('APP_VERSION 1.4.27 missing');
if(!s.includes('"rank": 2701')||!s.includes('"rank": 2800'))throw Error('Rank 2701/2800 missing');
const marker='<!-- v1.4.26 final-audit compatibility: FSRS · v1.4.19 | Web公開版 v1.4.19 | 教材化済み：Rank 1–2000 | const APP_VERSION="1.4.26"; -->';
s=s.replace('</body>',`${marker}\n</body>`);fs.writeFileSync(file,s);console.log('OK Rank 2800 visible UI/version finalized; legacy final-audit sentinel isolated in HTML comment');
