const fs=require('fs');
const input=process.argv[2];
const output=process.argv[3];
if(!input||!output) throw new Error('usage: node normalize-build-input.js input output');
let s=fs.readFileSync(input,'utf8');
for(const name of ['RANK','PACK','GRAMMAR']){
  const re=new RegExp(`(?:const|let|var)\\s+${name}\\s*=`);
  if(!re.test(s)) throw new Error(`${name} declaration not found`);
  s=s.replace(re,`const ${name}=`);
}
fs.writeFileSync(output,s);
console.log('Normalized build source declarations');
