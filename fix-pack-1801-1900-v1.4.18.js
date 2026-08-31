const Module=require('module');
const path=require('path');
const target=path.resolve(__dirname,'pack-1801-1900-v1.4.18.js');
const original=Module._load;
Module._load=function(request,parent,isMain){
 const out=original.apply(this,arguments);
 let resolved;
 try{resolved=Module._resolveFilename(request,parent);}catch{return out;}
 if(resolved===target&&Array.isArray(out)){
   const c=out.find(x=>x.rank===1895);
   if(c){
     c.example='외출하기 전에 휴대폰을 완전히 충전했어요.';
     c.example_jp='外出する前に携帯電話をフル充電しました。';
     c.note='휴대폰 は「携帯電話」。핸드폰、스마트폰 も会話でよく使われます。';
     c.grammar=['전에','V+았/었/였','-요'];
     c.grammar_ranks=[114,4,9];
     c.grammar_jp='「〜する前に」の 전에、過去形 -았/었-、丁寧語尾 -요 を確認します。';
     c.tts_text=c.example;
     c.form_notes={};
     for(const t of c.example.match(/[0-9]+|[가-힣]+/g)||[])c.form_notes[t]=`${t}（例文中の語彙・活用形。日本語訳と文脈に対応）`;
   }
 }
 return out;
};