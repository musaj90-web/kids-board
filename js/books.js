/* ================= books & solutions: PDFs in Firebase Storage (behind the family login), cached on each device ================= */
// S.books: [{id,kid,subject,eng,kind:'sb'|'wb'|'sol',solFor,name,off,from,to,size}]
//   off: PDF page = printed page + off · from/to: printed pages this file covers (books split into parts) · solFor: the book a solutions file belongs to
const BOOK_KINDS={sb:'كتاب الطالب',wb:'كتاب النشاط',sol:'الحلول'};
const bookById=id=>(S.books||[]).find(b=>b.id===id);
// one clean name per subject; plan PDFs spell them many ways ("(الرياضيات", "science", "اللغة العربية") — [name, words that identify it]
const SUBJ_CANON=[['لغتي',['لغتي','اللغة العربية','لغة عربية']],['الرياضيات',['رياضيات']],['العلوم',['علوم']],['Math',['math']],['Science',['science']],
  ['الدراسات الإسلامية',['إسلامية','اسلامية']],['القرآن الكريم',['قرآن','قران']],['الدراسات الاجتماعية',['اجتماعية']],['المهارات الرقمية',['رقمية']],
  ['المهارات الحياتية',['حياتية']],['التربية الفنية',['فنية']],['التربية البدنية',['بدنية']],['الخط العربي',['الخط']],['التفكير الناقد',['تفكير']],['قدرات',['قدرات']],['نافس',['نافس']]];
const subjClean=s=>String(s||'').replace(/[()[\]{}«»"'.:،,؛\-–—]/g,' ').replace(/\s+/g,' ').trim();
// the clean name, or null when the text names two subjects at once (e.g. "الرياضيات العلوم", a merged PDF cell)
function canonSubj(s){
  const t=subjClean(s).toLowerCase();if(!t)return null;if(subjectKey(t)==='English'||isEng(t))return'English';
  const hits=SUBJ_CANON.filter(([,ws])=>ws.some(w=>t.includes(w)));return hits.length===1?hits[0][0]:null;
}
const subjNorm=s=>canonSubj(s)||subjectKeyRaw(subjectKey(subjClean(s))).toLowerCase();
const bookLabel=(b,short)=>!b?'':(short?'':(canonSubj(b.subject)||subjClean(b.subject))+' · ')+(b.eng?shortBook(b.eng)+' · ':'')+BOOK_KINDS[b.kind]+(b.from?` (ص${b.from}–${b.to||''})`:'');
// the other part of the same book that holds this printed page (parts 1 / 2), or the book itself
function partFor(b,page){
  if(!b.from&&!b.to)return b;if(page>=(b.from||1)&&page<=(b.to||9999))return b;
  return(S.books||[]).find(x=>x.kid===b.kid&&x.kind===b.kind&&subjNorm(x.subject)===subjNorm(b.subject)&&(x.eng||'')===(b.eng||'')&&page>=(x.from||1)&&page<=(x.to||9999))||b;
}
const arDigits=s=>String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

// printed page(s) named in plan text: "حل ص119", "ص111 / 112", "SB P: 29", "P: 34-35", "Ps: 20:21", "WB — 156-157"
function pagesIn(s){
  s=arDigits(s);
  const m=s.match(/(?:^|[^؀-ۿ])(?:ص|صفحة)\s*[.:]?\s*(\d{1,3})(?:\s*[-–\/،,]\s*(\d{1,3}))?/)
    ||s.match(/\b(?:pg|page|ps|p)\s*[.:]?\s*(\d{1,3})(?:\s*[-–\/:,]\s*(\d{1,3}))?/i)
    ||s.match(/\b(?:wb|workbook|sb)\b\s*[—–:\-]*\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/i);
  if(!m)return null;const a=+m[1],b=m[2]?+m[2]:a;return{from:a,to:b>=a&&b-a<=6?b:a};
}
// which uploaded book (and solutions) a period's lesson / homework points to, and at which printed page
function bookFind(kid,date,n,src){
  const f=findDay(kid,date),p=f&&f.day.periods.find(x=>String(x.n)===String(n));if(!p)return null;
  const eng=isEng(p.subject),label=eng&&englishBook(kidById(kid),p,f.plan);
  const [a,b]=src==='lesson'?[p.lesson,p.homework]:[p.homework,p.lesson];
  let pg=pagesIn(a),txt=a;if(!pg){pg=pagesIn(b);txt=b}
  const kind=eng?(/\b(wb|workbook)\b/i.test(txt||'')?'wb':'sb'):(/نشاط/.test(txt||'')?'wb':'sb');
  const all=(S.books||[]).filter(x=>x.kid===kid&&subjNorm(x.subject)===subjNorm(p.subject)&&(!label||!x.eng||shortBook(x.eng)===label));
  // a part whose page range contains the page wins over a file with no range (books split into parts 1 / 2)
  const fits=x=>pg&&x.from&&pg.from>=x.from&&pg.from<=(x.to||9999),inR=x=>!pg||!x.from||fits(x),books=all.filter(x=>x.kind!=='sol');
  const book=books.find(x=>x.kind===kind&&fits(x))||books.find(x=>x.kind===kind&&inR(x))||books.find(fits)||books.find(inR)||books[0]||null;
  const sols=all.filter(x=>x.kind==='sol'&&x.solFor===book?.id),sol=book&&(sols.find(fits)||sols.find(inR)||sols[0]);
  const ord={sb:0,wb:1,sol:2};
  return{p,pg,book,sol,tabs:all.slice().sort((x,y)=>ord[x.kind]-ord[y.kind]).map(x=>x.id)};
}
// 📖 / ✅ buttons next to a homework or lesson (spans, so they can sit inside the clickable homework item)
function bookBtns(kid,date,n,src){
  if(!(S.books||[]).some(b=>b.kid===kid))return'';
  const r=bookFind(kid,date,n,src);if(!r||!r.book)return'';
  const pg=r.pg?` ص${r.pg.from}${r.pg.to>r.pg.from?'-'+r.pg.to:''}`:'',a=`data-kid="${kid}" data-date="${date}" data-n="${esc(n)}" data-src="${src}"`;
  return`<span class="bkbtns"><span class="bkbtn" role="button" data-act="bookOpen" ${a}>📖 الكتاب${pg}</span>${r.sol?`<span class="bkbtn sol" role="button" data-act="bookOpen" data-sol="1" ${a}>✅ الحل</span>`:''}</span>`;
}

/* ---------- storage (Firebase Storage REST API with the signed-in family account) ---------- */
const storErr=s=>s===401||s===403?'لا توجد صلاحية — راجع قواعد Firebase Storage':s===404?'التخزين غير مُفعّل أو الملف غير موجود':'خطأ في التخزين ('+s+')';
const BOOKSTORE={
  base:()=>`https://firebasestorage.googleapis.com/v0/b/${FB_CONFIG.storageBucket||FB_CONFIG.projectId+'.firebasestorage.app'}/o`,
  token(){if(typeof CLOUD==='undefined'||!CLOUD.user)return Promise.reject(new Error('سجّل الدخول للمزامنة أولاً ☁️'));return CLOUD.user.getIdToken()},
  xhr(method,url,body,prog,type){return this.token().then(tk=>new Promise((res,rej)=>{const x=new XMLHttpRequest();x.open(method,url);x.setRequestHeader('Authorization','Firebase '+tk);
    if(type)x.responseType=type;if(body)x.setRequestHeader('Content-Type','application/pdf');
    (body?x.upload:x).onprogress=e=>{if(prog&&e.lengthComputable)prog(e.loaded/e.total)};
    x.onload=()=>x.status<300?res(x.response):rej(new Error(storErr(x.status)));x.onerror=()=>rej(new Error('لا يوجد اتصال بالإنترنت'));x.send(body||null)}))},
  upload(path,file,prog){return this.xhr('POST',this.base()+'?name='+encodeURIComponent(path),file,prog)},
  download(path,prog){return this.xhr('GET',this.base()+'/'+encodeURIComponent(path)+'?alt=media',null,prog,'arraybuffer').then(b=>new Uint8Array(b))},
  remove(path){return this.xhr('DELETE',this.base()+'/'+encodeURIComponent(path)).catch(()=>{})}
};
const BOOKDOC={};
// open a book's PDF: memory → this device's cache → download once from the cloud
async function bookDoc(b,prog){
  if(BOOKDOC[b.id])return BOOKDOC[b.id];
  let buf=await pdfCache('book_'+b.id);
  if(!buf){buf=await BOOKSTORE.download('books/'+b.id+'.pdf',prog);await pdfCache('book_'+b.id,buf)}
  return BOOKDOC[b.id]=await pdfjsLib.getDocument({data:new Uint8Array(buf),isEvalSupported:false,disableFontFace:true}).promise;
}

/* ---------- viewer ---------- */
let BV=null;
const lastPage=id=>{try{return+localStorage.getItem('kidsDash.bookPage.'+id)||0}catch(e){return 0}};
// moving past the end of part 1 continues in part 2 (and back); the part joins the tabs if it wasn't there
function bvPart(){const b=partFor(bookById(BV.id),BV.from);if(!BV.tabs.includes(b.id))BV.tabs.push(b.id);return b.id}
function viewBook(id,pg,tabs){const b=bookById(id);if(!b)return;const f=pg?pg.from:(lastPage(id)||b.from||1);BV={id,from:f,to:pg?pg.to:f,tabs:tabs&&tabs.length?tabs:[id]};drawBook()}
async function drawBook(){
  const b=bookById(BV.id);if(!b)return closeModal();
  const tabs=BV.tabs.length>1?`<div class="tabs">${BV.tabs.map(x=>`<button class="tab ${x===b.id?'on':''}" data-act="bookTab" data-id="${x}">${esc(bookLabel(bookById(x),true))}</button>`).join('')}</div>`:`<h3>📖 ${esc(bookLabel(b))}</h3>`;
  document.getElementById('layer').innerHTML=`<div class="overlay"><div class="modal big pdfv"><div class="kidhead">${tabs}<div class="sp"></div><button class="btn" data-act="closeModal">إغلاق</button></div>
    <div class="bvnav"><button class="btn" data-act="bookPrev">→ السابق</button><label>صفحة <input id="bvPage" type="number" inputmode="numeric" value="${BV.from}"></label>${BV.to>BV.from?`<span>إلى ${BV.to}</span>`:''}<button class="btn" data-act="bookNext">التالي ←</button><div class="sp"></div><button class="btn primary" id="bvPrint" data-act="bookPrint" hidden>🖨️ طباعة</button></div>
    <div id="bvPages" class="hint">⏳ جاري فتح الكتاب...</div></div></div>`;
  const inp=document.getElementById('bvPage');inp.addEventListener('keydown',e=>{if(e.key==='Enter')bookAct('bookGo')});inp.addEventListener('change',()=>bookAct('bookGo'));
  const box=document.getElementById('bvPages'),tok=BV.tok={};
  try{localStorage.setItem('kidsDash.bookPage.'+b.id,BV.from)}catch(e){}
  try{
    const doc=await bookDoc(b,p=>{if(box.isConnected)box.textContent='⏳ تحميل الكتاب لأول مرة على هذا الجهاز... '+Math.round(p*100)+'%'});
    if(BV.tok!==tok||!box.isConnected)return;box.textContent='';box.className='';
    for(let n=BV.from;n<=BV.to;n++){
      const pg=await doc.getPage(Math.min(Math.max(1,n+(b.off||0)),doc.numPages));if(BV.tok!==tok||!box.isConnected)return;
      const sc=(box.clientWidth||800)/pg.getViewport({scale:1}).width*Math.min(window.devicePixelRatio||1,2),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');
      c.width=vp.width;c.height=vp.height;c.className='pdfpage';box.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    }
    const pb=document.getElementById('bvPrint');if(pb)pb.hidden=false;
  }catch(e){console.error(e);if(box.isConnected)box.textContent='⚠️ '+(e.message||e)}
}

/* ---------- parent mode: upload / list ---------- */
let BKUP='';
function booksCard(){
  const bs=S.books||[],kidOpts=S.kids.map(k=>`<option value="${k.id}">${esc(k.name)}</option>`).join('');
  const subs=SUBJ_CANON.map(c=>c[0]);
  const engs=[...new Set(S.kids.flatMap(k=>k.books||[]))];
  const bookOpts=bs.filter(b=>b.kind!=='sol').map(b=>`<option value="${b.id}">${esc(kidById(b.kid)?.name||'')} · ${esc(bookLabel(b))}</option>`).join('');
  let h=`<div class="card"><h3>📚 الكتب والحلول</h3>
  <p class="hint">ارفع كل كتاب مرة واحدة — يظهر زر «📖 الكتاب» بجانب الواجبات والدروس ويفتح على الصفحة المذكورة في الخطة، و«✅ الحل» إن رفعت الحلول.</p>
  <div class="row"><label style="flex:1;min-width:200px">ملف PDF<input type="file" id="bkPdf" accept=".pdf,application/pdf"></label>
  <label>النوع<select id="bkKind"><option value="sb">كتاب الطالب</option><option value="wb">كتاب النشاط / Workbook</option><option value="sol">الحلول</option></select></label></div>
  <div class="row"><label>لمن<select id="bkKid">${kidOpts}</select></label>
  <label>المادة<select id="bkSubj">${subs.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}${engs.map(e=>`<option value="English|${esc(e)}">English · ${esc(e)}</option>`).join('')}</select></label>
  <label>الحلول لكتاب<select id="bkSolFor"><option value="">— للحلول فقط —</option>${bookOpts}</select></label></div>
  <div class="row"><label>الصفحة المطبوعة رقم<input type="number" id="bkPrinted" value="10" style="width:90px"></label><label>هي صفحة PDF رقم<input type="number" id="bkPdfPage" placeholder="مثلاً 14" style="width:110px"></label>
  <label>يغطي الصفحات من (اختياري)<input type="number" id="bkFrom" style="width:80px"></label><label>إلى<input type="number" id="bkTo" style="width:80px"></label></div>
  <p class="hint" style="margin-top:-4px">افتح الكتاب، اختر أي صفحة عليها رقم مطبوع، واكتب رقمها المطبوع ورقمها في ملف الـPDF. «من/إلى» فقط إذا كان الكتاب مقسوماً إلى أكثر من ملف.</p>
  <div class="row"><button class="btn primary" data-act="bookUpload">⬆️ رفع الكتاب</button><span id="bkStatus" class="hint">${esc(BKUP)}</span></div>`;
  S.kids.forEach(k=>{const mine=bs.filter(b=>b.kid===k.id&&b.kind!=='sol');
    h+=`<b>${k.emoji} ${esc(k.name)}</b><ul class="list">${mine.length?mine.map(b=>{const sols=bs.filter(s=>s.solFor===b.id);
      const ni=(x,cls,v,ph)=>`<input type="number" class="${cls}" data-id="${x.id}" value="${v||''}" placeholder="${ph}" style="width:62px;padding:2px 4px;font-size:14px">`;
      return[b,...sols].map(x=>`<li${x.kind==='sol'?' style="padding-right:24px"':''}><span>${x.kind==='sol'?'✅':'📖'} ${esc(x.kind==='sol'?BOOK_KINDS.sol:bookLabel(x))} <small class="hint">· ${Math.round((x.size||0)/1048576)}MB</small><br>
        <small class="hint">إزاحة ${ni(x,'bkoff',x.off||0,'0')} · الصفحات من ${ni(x,'bkfrom',x.from,'—')} إلى ${ni(x,'bkto',x.to,'—')}</small></span>
        <button class="btn sm" data-act="bookOffSave" data-id="${x.id}">حفظ</button><button class="btn sm" data-act="bookView" data-id="${x.id}">فتح</button><button class="btn sm danger" data-act="bookDel" data-id="${x.id}">حذف</button></li>`).join('')}).join(''):'<li class="hint">لم يُرفع أي كتاب</li>'}</ul>`});
  return h+`<p class="hint">«الإزاحة» = رقم صفحة الـPDF ناقص الرقم المطبوع. إن فتح الكتاب على صفحة خاطئة عدّلها واضغط حفظ.</p></div>`;
}
function bookStatus(t){BKUP=t;const e=document.getElementById('bkStatus');if(e)e.textContent=t}

async function bookAct(a,el){
  if(a==='bookOpen'){
    const r=bookFind(el.dataset.kid,el.dataset.date,el.dataset.n,el.dataset.src);if(!r||!r.book)return toast('لم يُرفع كتاب هذه المادة بعد');
    const t=el.dataset.sol?r.sol:r.book;if(!t)return toast('لا توجد حلول لهذا الكتاب');return viewBook(t.id,r.pg,r.tabs);
  }
  if(a==='bookView')return viewBook(el.dataset.id,null,[el.dataset.id]);
  if(a==='bookTab'){BV.id=el.dataset.id;return drawBook()}
  if(a==='bookPrev'||a==='bookNext'){const s=BV.to-BV.from+1,d=a==='bookNext'?s:-s;if(BV.from+d<1)return;BV.from+=d;BV.to+=d;BV.id=bvPart();return drawBook()}
  if(a==='bookGo'){const v=+document.getElementById('bvPage').value;if(!(v>=1)||v===BV.from&&BV.to===BV.from)return;BV.from=BV.to=v;BV.id=bvPart();return drawBook()}
  if(a==='bookPrint'){const b=bookById(BV.id),doc=BOOKDOC[BV.id];if(!doc)return;const ns=[];for(let n=BV.from;n<=BV.to;n++)ns.push(Math.min(Math.max(1,n+(b.off||0)),doc.numPages));return printDocPages(doc,ns)}
  if(a==='bookOffSave'){const b=bookById(el.dataset.id),q=c=>document.querySelector(`.${c}[data-id="${el.dataset.id}"]`);if(!b)return;
    b.off=+q('bkoff').value||0;b.from=+q('bkfrom').value||0;b.to=+q('bkto').value||0;save();return toast('✅ تم الحفظ')}
  if(a==='bookDel'){const b=bookById(el.dataset.id);if(!b||!confirm('حذف «'+bookLabel(b)+'» من السحابة ومن كل الأجهزة؟'))return;
    const gone=(S.books||[]).filter(x=>x.id===b.id||x.solFor===b.id);
    for(const x of gone){BOOKSTORE.remove('books/'+x.id+'.pdf');delete BOOKDOC[x.id];pdfDB().then(db=>db.transaction('pdf','readwrite').objectStore('pdf').delete('book_'+x.id)).catch(()=>{})}
    S.books=S.books.filter(x=>!gone.includes(x));save();return render()}
  if(a==='bookUpload'){
    const f=document.getElementById('bkPdf').files[0];if(!f)return toast('اختر ملف PDF');
    const kind=document.getElementById('bkKind').value,solFor=document.getElementById('bkSolFor').value,pr=+document.getElementById('bkPrinted').value,pp=+document.getElementById('bkPdfPage').value;
    if(!(pp>=1&&pr>=0))return toast('اكتب رقم الصفحة المطبوعة ورقمها في ملف الـPDF');
    let kid=document.getElementById('bkKid').value,[subject,eng]=document.getElementById('bkSubj').value.split('|');
    if(kind==='sol'){const b=bookById(solFor);if(!b)return toast('اختر الكتاب الذي تخصه الحلول');kid=b.kid;subject=b.subject;eng=b.eng}
    const id=Date.now().toString(36),rec={id,kid,subject,eng:eng||'',kind,solFor:kind==='sol'?solFor:'',name:f.name,off:pp-pr,from:+document.getElementById('bkFrom').value||0,to:+document.getElementById('bkTo').value||0,size:f.size};
    try{
      bookStatus('⏳ جاري الرفع... 0%');
      await BOOKSTORE.upload('books/'+id+'.pdf',f,p=>bookStatus('⏳ جاري الرفع... '+Math.round(p*100)+'%'));
      await pdfCache('book_'+id,new Uint8Array(await f.arrayBuffer()));  // no need to download it again on this device
      S.books=(S.books||[]).concat(rec);save();bookStatus('');render();toast('✅ تم رفع «'+bookLabel(rec)+'»');
    }catch(e){console.error(e);bookStatus('⚠️ '+(e.message||e))}
  }
}
render();
