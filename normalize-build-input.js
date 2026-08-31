const fs=require('fs'),cp=require('child_process');
const input=process.argv[2];
const output=process.argv[3];
if(!input||!output) throw new Error('usage: node normalize-build-input.js input output');
let s=fs.readFileSync(input,'utf8');
for(const name of ['RANK','PACK','GRAMMAR']){
  const re=new RegExp(`(?:const|let|var)\\s+${name}\\s*=`);
  if(!re.test(s)) throw new Error(`${name} declaration not found`);
  s=s.replace(re,`const ${name}=`);
}
for(const f of ['pack-2701-2800-v1.4.27.js','inject-v1.4.27.js','finalize-v1.4.27.js'])cp.execFileSync(process.execPath,['--check',f],{stdio:'inherit'});
const hook="\nrequire('./inject-v1.4.27.js');\nrequire('./finalize-v1.4.27.js');\n";
const injector='inject-v1.4.26.js';let i=fs.readFileSync(injector,'utf8');if(!i.includes("require('./inject-v1.4.27.js')"))fs.writeFileSync(injector,i+hook);
fs.writeFileSync(output,s);
console.log('Normalized build source declarations; Rank 2701-2800 syntax checks and chained injector prepared');
