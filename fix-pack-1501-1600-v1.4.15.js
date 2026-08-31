const cards=require('./pack-1501-1600-v1.4.15.js');
const c=cards.find(x=>x.rank===1560);
if(!c)throw new Error('Rank 1560 missing');
c.example='회의가 끝나면 저한테 연락해 주세요.';
c.example_jp='会議が終わったら私に連絡してください。';
c.tts_text=c.example;
c.form_notes={
  '회의가':'회의「会議」＋가（主格）',
  '끝나면':'끝나다「終わる」＋-(으)면（条件）→「終わったら」',
  '저한테':'저「私（謙譲）」＋한테（〜に）',
  '연락해':'연락하다「連絡する」→연락해（-아/어 주다 につなぐ形）',
  '주세요':'주다「与える／〜してくれる」→주세요（丁寧な依頼「〜してください」）'
};
c.grammar=['V+(으)면','아/어 주다','-요'];
c.grammar_ranks=[22,33,9];
c.grammar_jp='끝나면 は 끝나다＋-(으)면 で「終わったら」。연락해 주세요 は 연락하다＋-아/어 주다＋丁寧語尾で「連絡してください」という自然な依頼です。';
module.exports=cards;
