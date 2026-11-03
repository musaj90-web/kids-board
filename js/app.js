
const KEY='kidsDash.v1';
const DAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const SUBJ=[['قرآن','#059669'],['علوم','#16a34a'],['science','#16a34a'],['رياضيات','#2563eb'],['math','#2563eb'],['لغتي','#ea580c'],['خط','#b45309'],['إسلامية','#0d9488'],['english','#7c3aed'],['إنجليزي','#7c3aed'],['بدنية','#dc2626'],['فنية','#db2777'],['رقمية','#0891b2'],['حياتية','#ca8a04'],['عربية','#ea580c'],['إنجليز','#7c3aed'],['نافس','#9333ea'],['اجتماعية','#0369a1'],['لفظي','#be185d'],['كمي','#7c3aed'],['قدرات','#be185d']];

function defaults(){return{kids:[{id:'ali',name:'علي',emoji:'🦁',color:'#2563eb',grade:4,books:['Top Goal','Family and Friends']},{id:'bader',name:'بدر',emoji:'🚀',color:'#ea580c',grade:3,books:['We Can','Family and Friends']}],plans:{ali:[],bader:[]},done:{},tasks:[],pin:'1234',examSets:[],grades:{},lastMax:{}}}
// only a real subject name may replace a period's subject — e.g. "Spelling quiz … Consonants (sp - sw)" must stay English
const SUBJ_EXTRA=['تفكير','دراسات','تربية','مهارات','اجتماع'];
function knownSubj(s){s=String(s||'').trim().toLowerCase();return isEng(s)||SUBJ.some(([w])=>s.includes(w))||SUBJ_EXTRA.some(w=>s.includes(w))}
function fixExamPeriods(d){
  let ch=false;(d&&d.periods||[]).forEach(p=>{
    if(p.replaced){if(!knownSubj(p.subject)||isEng(p.replaced)){p.subject=p.replaced;delete p.replaced;ch=true}return}  // undo an earlier bad rename
    if(isEng(p.subject))return;  // the timetable comes from the Arabic plan; English-plan text never renames a period
    const t=(p.lesson||'')+' '+(p.homework||'');
    if(!/اختبار|quiz|test|exam/i.test(t))return;
    let m=t.match(/\(([^)]*[؀-ۿA-Za-z][^)]*)\)/),sub=m&&m[1].trim();
    if(!sub){const m2=t.match(/لمادة\s+([؀-ۿ]+(?:\s+[؀-ۿ]+)?)/);sub=m2&&m2[1].trim()}
    if(!sub||/إملاء|املاء/.test(sub)||sub.length>30||!knownSubj(sub))return;
    if(subjectKeyRaw(sub)===subjectKeyRaw(p.subject))return;
    p.replaced=p.subject;p.subject=sub;ch=true;
  });return ch;
}
function subjectKeyRaw(s){s=String(s||'').trim().replace(/^ال/,'');return s.replace(/\s+/g,'')}
function fixHolidayDay(d){
  if(!d||d.holiday||!Array.isArray(d.periods)||!d.periods.length)return false;
  const H=/إجاز|اجاز|عطلة|عطله|holiday|vacation|day\s*off|no school/i,E=s=>!s||/^[.\s…·\-–—]*$/.test(s);
  const ok=d.periods.every(p=>H.test((p.lesson||'')+' '+(p.homework||''))||(E(p.lesson)&&E(p.homework))||/منفصلة|الخطة الإنجليزية/.test(p.lesson||''));
  const hits=d.periods.filter(p=>H.test((p.lesson||'')+' '+(p.homework||'')));
  if(!ok||!hits.length||hits.length<Math.ceil(d.periods.length/2))return false;
  const ar=hits.map(p=>p.lesson).find(s=>/[\u0600-\u06FF]/.test(s||'')&&H.test(s));
  d.holiday=true;d.note=d.note&&H.test(d.note)?d.note:(ar||hits[0].lesson||hits[0].homework||'إجازة');
  d.periods.forEach(p=>{p.lesson='';p.homework=''});return true;
}
// The plan PDFs encode the لا ligature so pdf.js reads it back as "ال"; fix words that can't be right as extracted (plus one typo in the source PDFs)
const AR_FIX=[['ثالثاء','ثلاثاء'],['سالمي','سلامي'],['إسالم','إسلام'],['صالة','صلاة'],['مالحظ','ملاحظ'],['أخالق','أخلاق'],['عالمة','علامة'],['عالمات','علامات'],['إمالء','إملاء'],['ف المعرفة','في المعرفة'],
  ['ماليين','ملايين'],['تالوة','تلاوة'],['الوالء','الولاء'],['مدخالت','مدخلات'],['خاليا','خلايا'],['سالسل','سلاسل'],['عالقات','علاقات'],['الالفقاري','اللافقاري'],['أالحظ','ألاحظ'],['ترحيب بالطالب','ترحيب بالطلاب'],['المبتأ','المبتدأ'],
  ['مرسالت','مرسلات'],['أوالد','أولاد'],['السالمة على','السلامة على'],['الالوهية','الألوهية'],['من ثالثة','من ثلاثة']];
// apply AR_FIX to every string already saved in plans / exam sets (they were imported before a fix was added)
function fixSavedText(r){let ch=false;const walk=o=>{if(Array.isArray(o)){o.forEach((v,i)=>{if(typeof v==='string'){const n=arFixStr(v);if(n!==v){o[i]=n;ch=true}}else if(v&&typeof v==='object')walk(v)})}else for(const k in o){const v=o[k];if(typeof v==='string'){const n=arFixStr(v);if(n!==v){o[k]=n;ch=true}}else if(v&&typeof v==='object')walk(v)}};walk(r.plans||{});walk(r.examSets||[]);return ch}
function fixPlans(r){let ch=false;Object.values(r.plans||{}).forEach(ps=>(ps||[]).forEach(pl=>(pl.days||[]).forEach(d=>{if(fixExamPeriods(d))ch=true})));return ch}
function arFixStr(s){for(const[a,b]of AR_FIX)if(s.includes(a))s=s.split(a).join(b);return s}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.kids){const d=defaults();const r=Object.assign(d,s);r.kids.forEach(k=>{if(!r.plans[k.id])r.plans[k.id]=[];if(!k.grade)k.grade=k.id==='ali'?4:k.id==='bader'?3:0;if(!k.books)k.books=k.id==='ali'?['Top Goal','Family and Friends']:k.id==='bader'?['We Can','Family and Friends']:[]});let ch=false;const mig=!r.mig3;(r.examSets||[]).forEach(s=>{if(s.period===undefined){s.period=guessPeriod(s.title);ch=true}(s.exams||[]).forEach(e=>{const o=`ex|${s.kid}|${e.date}|${subjectKey(e.subject)}`,n=`ex|${s.kid}|${s.id}|${e.date}|${subjectKey(e.subject)}`;if(r.grades&&r.grades[o]&&!r.grades[n]){r.grades[n]=r.grades[o];delete r.grades[o];ch=true}})});Object.values(r.plans).forEach(ps=>ps.forEach(pl=>(pl.days||[]).forEach(d=>{if(fixHolidayDay(d))ch=true;if(fixExamPeriods(d))ch=true;if(mig)(d.periods||[]).forEach(p=>{if(p.test&&!/quiz|إملاء|املاء/i.test((p.lesson||'')+' '+(p.homework||''))){delete p.test;ch=true}})})));if(mig){r.mig3=1;ch=true}if(fixSavedText(r))ch=true;if(ch)try{localStorage.setItem(KEY,JSON.stringify(r))}catch(e){}return r}}catch(e){console.error(e);LOAD_ERR=e;try{const raw=localStorage.getItem(KEY);if(raw)localStorage.setItem(KEY+'.rescue',raw)}catch(_){}}return defaults()}
var LOAD_ERR=null;
let S=load();
function save(){if(LOAD_ERR){toast('⚠️ تعذّر تحميل البيانات المحفوظة — لم يتم الحفظ');return}try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('تعذّر الحفظ!')}if(typeof cloudPush==='function')cloudPush()}
let V={name:'home',kid:null,tab:'today',date:null};
let parentOK=false;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pd=k=>{const[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const dk=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const todayKey=()=>dk(new Date());
const fmt=(k,o)=>new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn',o||{day:'numeric',month:'long'}).format(pd(k));
const hijri=k=>{try{return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'}).format(pd(k))}catch(e){return''}};
const dayName=k=>DAYS[pd(k).getDay()];
const kidById=id=>S.kids.find(k=>k.id===id);
function subjColor(s){s=String(s||'').toLowerCase();for(const[w,c]of SUBJ)if(s.includes(w))return c;return'#6b7280'}
const chip=s=>`<span class="chip" style="--c:${subjColor(s)}" dir="auto">${esc(s)}</span>`;
const hasHw=h=>h&&!/^[.\s…·\-]*$/.test(h);
const bkB=(...a)=>typeof bookBtns==='function'?bookBtns(...a):'';  // 📖/✅ buttons, from books.js

// the plan's spelling words come from the English plan, so they belong only to the English spelling quiz (not to an Arabic إملاء)
function testWords(plan,p){const w=plan&&plan.extras&&plan.extras.spelling;return p&&p.test&&w&&w.length&&isEng(p.subject)&&/spell/i.test((p.lesson||'')+' '+(p.homework||''))?w:null}
const wordsHtml=w=>w?`<div class="words sw">${w.map(x=>`<span class="word">${esc(x)}</span>`).join('')}</div>`:'';
function upcomingTests(plan,date){
  const ds=plan.days.map(d=>d.date).sort(),i=ds.indexOf(date),next=i>=0&&i<ds.length-1?ds[i+1]:null,out=[];
  plan.days.forEach(d=>{if(d.date===date||d.date===next)d.periods.forEach(p=>{if(p.test&&!(V.kid&&officialFor(V.kid,d.date,p.subject)))out.push({date:d.date,today:d.date===date,p,words:testWords(plan,p)})})});
  return out;
}
const holDays=plan=>plan.days.filter(d=>d.holiday);
function holidayBanner(d,big){return`<div class="holiday ${big?'big':''}"><div class="holsun">🏖️</div><div><b>${esc(d.note||'إجازة')}</b><span>${big?'لا توجد حصص ولا واجبات اليوم — استمتع بإجازتك! 🎉':dayName(d.date)+' '+fmt(d.date)}</span></div></div>`}
function plansOf(kid){return(S.plans[kid]||[]).slice().sort((a,b)=>a.from<b.from?-1:1)}
function allDays(kid){const r=[];plansOf(kid).forEach(p=>p.days.forEach(d=>r.push({plan:p,day:d})));return r.sort((a,b)=>a.day.date<b.day.date?-1:1)}
function findDay(kid,date){return allDays(kid).find(x=>x.day.date===date)||null}
function planFor(kid,date){return plansOf(kid).find(p=>date>=p.from&&date<=p.to)||null}
function defaultDate(kid){
  const t=todayKey(),all=allDays(kid);if(!all.length)return null;
  if(all.some(x=>x.day.date===t))return t;
  const next=all.find(x=>x.day.date>t);
  if(next&&(pd(next.day.date)-pd(t))/864e5<=3)return next.day.date;
  const prev=[...all].reverse().find(x=>x.day.date<t);
  return prev?prev.day.date:all[0].day.date;
}
function items(kid,date){
  const f=findDay(kid,date),out=[];
  const hol=f&&f.day.holiday;
  if(f&&!hol)f.day.periods.forEach(p=>{if(hasHw(p.homework))out.push({id:`${kid}|${date}|p${p.n}`,kind:'hw',subject:p.subject,text:p.homework,sub:p.lesson,pts:1})});
  S.tasks.filter(t=>(t.kid===kid||t.kid==='both')&&(t.date===date||(t.date==='daily'&&f&&!hol)))
    .forEach(t=>out.push({id:`${kid}|${date}|t${t.id}`,kind:'task',subject:'مهمة إضافية',text:t.title,pts:+t.points||1}));
  out.forEach(i=>i.done=!!S.done[i.id]);return out;
}
function weekStats(kid,plan){let d=0,t=0,stars=0;if(plan)plan.days.forEach(x=>items(kid,x.date).forEach(i=>{t++;if(i.done){d++;stars+=i.pts}}));return{d,t,stars}}

/* ---------- top bar ---------- */
function renderTop(){
  document.getElementById('top').innerHTML=
    `<button class="brand" data-nav="home">📚 <span class="bt">لوحة الواجبات</span></button>
     ${S.kids.map(k=>`<button class="kidbtn ${V.name==='kid'&&V.kid===k.id?'on':''}" style="--kid:${k.color}" data-kid="${k.id}">${k.emoji} ${esc(k.name)}</button>`).join('')}
     <div class="sp"></div>
     ${typeof cloudBadge==='function'?cloudBadge():''}
     <button class="btn" data-act="tv" title="لوحة العرض للتلفاز">📺 <span class="bt">لوحة العرض</span></button>
     <button class="btn" data-act="${parentOK?'parent':'askPin'}">🔒 ولي الأمر</button>`;
}

/* ---------- home ---------- */
function renderHome(){
  const t=todayKey(),h=new Date().getHours();
  let html=`<div class="hello"><h1>${h<12?'صباح الخير':'مساء الخير'} يا أبطال 👋</h1><p>${fmt(t,{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${hijri(t)}</p></div><div class="kids">`;
  S.kids.forEach(k=>{
    const date=defaultDate(k.id);
    if(!date){html+=`<button class="kidcard" style="--kid:${k.color}" data-kid="${k.id}"><div class="avatar">${k.emoji}</div><div class="meta"><h2 style="color:var(--ink)">${esc(k.name)}</h2><span>لا توجد خطة محمّلة بعد</span></div></button>`;return}
    const its=items(k.id,date),dn=its.filter(i=>i.done).length,p=its.length?Math.round(dn/its.length*100):100;
    const ws=weekStats(k.id,planFor(k.id,date));
    const hd=findDay(k.id,date);
    if(hd&&hd.day.holiday){html+=`<button class="kidcard" style="--kid:${k.color}" data-kid="${k.id}"><div class="avatar">${k.emoji}</div><div class="meta"><h2 style="color:var(--ink)">${esc(k.name)}</h2><span>${date===t?'اليوم':'يوم '+dayName(date)}: 🏖️ ${esc(hd.day.note||'إجازة')}</span><span>⭐ ${weekStats(k.id,planFor(k.id,date)).stars} نجمة هذا الأسبوع</span></div><div class="ring" style="background:linear-gradient(135deg,#fde68a,#7dd3fc)"><div style="font-size:40px">🏖️</div></div></button>`;return}
    const lbl=date===t?'واجبات اليوم':'واجبات يوم '+dayName(date);
    html+=`<button class="kidcard" style="--kid:${k.color}" data-kid="${k.id}">
      <div class="avatar">${k.emoji}</div>
      <div class="meta"><h2 style="color:var(--ink)">${esc(k.name)}</h2><span>${lbl}: ${dn} من ${its.length}</span><span>⭐ ${ws.stars} نجمة هذا الأسبوع</span>${(()=>{const e=upcomingExams(k.id,t,14)[0];return e?`<span class="homeexam">📝 ${esc(e.subject)} — ${whenTxt(e.date)}</span>`:''})()}</div>
      <div class="ring" style="background:conic-gradient(${k.color} ${p}%,#e5e7eb 0)"><div>${p}%</div></div></button>`;
  });
  return html+'</div>';
}

/* ---------- TV dashboard (#tv): read-only, sized to the screen, refreshes itself ---------- */
function renderTV(){
  const t=todayKey(),now=new Date();
  return`<div class="tv"><div class="tvbar"><div class="tvclock"><b>${now.toLocaleTimeString('ar-SA-u-nu-latn',{hour:'numeric',minute:'2-digit'})}</b><span>${fmt(t,{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${hijri(t)}</span></div><div class="sp"></div>${typeof cloudBadge==='function'?cloudBadge():''}<button class="btn tvexit" data-act="tvExit">✕ خروج</button></div>
  <div class="tvgrid" style="--n:${S.kids.length}">${S.kids.map(tvKid).join('')}</div></div>`;
}
function tvKid(k){
  const t=todayKey(),date=defaultDate(k.id);
  const head=(sub,ring)=>`<div class="tvhead"><div class="avatar">${k.emoji}</div><div class="tvname"><h2>${esc(k.name)}</h2>${sub}</div>${ring||''}</div>`;
  if(!date)return`<section class="tvkid" style="--kid:${k.color}">${head('<span>لا توجد خطة محمّلة بعد</span>')}</section>`;
  const plan=planFor(k.id,date),f=findDay(k.id,date),hol=f&&f.day.holiday,ws=weekStats(k.id,plan),avg=kidAverage(k.id);
  const its=items(k.id,date),dn=its.filter(i=>i.done).length,p=its.length?Math.round(dn/its.length*100):100;
  const n=Math.round((pd(date)-pd(t))/864e5),lbl=n===0?'اليوم':n===1?'غداً — '+dayName(date):dayName(date)+' '+fmt(date);
  const ring=hol?`<div class="ring" style="background:linear-gradient(135deg,#fde68a,#7dd3fc)"><div>🏖️</div></div>`:`<div class="ring" style="background:conic-gradient(${k.color} ${p}%,#e5e7eb 0)"><div>${dn}/${its.length}</div></div>`;
  let h=head(`<span>${lbl} · ${esc(plan.weekLabel||('الأسبوع '+plan.week))}</span><span>⭐ ${ws.stars} نجمة هذا الأسبوع${avg?` · 📊 المعدل ${avg.avg}%`:''}</span>`,ring);
  // classes: the shown day, or from 5 PM to 7 AM the next school day (so the bag can be packed the night before) — then it goes on top
  const ev=tvEvening(),nd=ev&&tvNextDay(k.id),cd=nd||date,cf=findDay(k.id,cd),cplan=planFor(k.id,cd)||plan,cn=daysTo(cd);
  const ctitle=ev?`🎒 جدول ${cn===1?'الغد':cn===0?'اليوم':'يوم '+dayName(cd)} · ${dayName(cd)} ${fmt(cd)}`:'🏫 الحصص';
  const per=pr=>{const b=isEng(pr.subject)&&englishBook(k,pr,cplan);return`<span class="tvp ${isExamP(k.id,cd,pr)?'x':''}" style="--c:${subjColor(pr.subject)}" dir="auto">${subjIcon(pr.subject)} ${esc(pr.subject)}${b?' · '+esc(b):''}</span>`};
  let cls='';
  if(ev&&!nd)cls=`<div class="tvsec ev"><h3>🎒 جدول اليوم الدراسي القادم</h3><p class="tvhint">📭 لم تُحمّل خطة الأسبوع القادم بعد</p></div>`;
  else if(cf&&cf.day.holiday){if(ev)cls=`<div class="tvsec ev"><h3>${ctitle}</h3><p class="tvhint">🏖️ ${esc(cf.day.note||'إجازة')} — لا مدرسة</p></div>`}
  else if(cf&&cf.day.periods.length)cls=`<div class="tvsec ${ev?'ev':''}"><h3>${ctitle}</h3><div class="tvper">${cf.day.periods.map(per).join('')}</div></div>`;
  if(ev)h+=cls;
  // announcements: official exams in the next 7 days, then dictation / spelling / quizzes from the plan (the day before and the morning of)
  h+=upcomingExams(k.id,t,7).map(e=>`<div class="tvalert exam ${daysTo(e.date)===0?'soon':''}"><b>📝 ${whenTxt(e.date)} (${dayName(e.date)}): اختبار ${esc(e.subject)}${e.type?' — '+esc(e.type):''}</b>${e.parts.length?`<div class="xparts">${e.parts.map(x=>`<span dir="auto">${esc(x)}</span>`).join('')}</div>`:''}</div>`).join('');
  h+=tvTests(k).map(x=>{const eng=isEng(x.p.subject),dict=/إملاء|املاء/.test(x.p.lesson+' '+x.p.homework),n=daysTo(x.date);
    const what=eng&&/spell/i.test(x.p.lesson+' '+x.p.homework)?`Spelling quiz${x.book?' · '+esc(x.book):''}`:dict?`إملاء ${esc(x.p.subject)}`:`اختبار ${esc(x.p.subject)}`;
    const det=eng?'':[x.p.lesson,x.p.homework].filter(s=>s&&!isEmptyCell(s)).map(esc).join(' — ');
    return`<div class="tvalert ${n===0?'soon':''}"><b>${n===0?'📝':'⏰'} ${whenTxt(x.date)} (${dayName(x.date)}): <span dir="auto">${what}</span></b>${det?`<div class="tvdet" dir="auto">${det}</div>`:''}${wordsHtml(x.words)}</div>`}).join('');
  if(f&&noteOk(f.day.note)&&!hol)h+=`<div class="note">📢 ${esc(f.day.note)}</div>`;
  if(hol)h+=holidayBanner(f.day,false);
  if(!ev)h+=cls;
  // homework: subject + the class topic it belongs to, then the homework itself
  const hw=its.map(i=>{const top=i.kind==='hw'&&i.sub&&!isEmptyCell(i.sub)&&!/منفصلة/.test(i.sub)&&i.sub!==i.text?i.sub:'';
    return`<div class="tvhw ${i.done?'done':''}"><span class="check">${i.done?'✓':''}</span><div><div class="tvhwtop">${i.kind==='hw'?chip(i.subject):'<span class="chip" style="--c:#b45309">مهمة إضافية</span>'}${top?`<span class="tvtopic" dir="auto">${esc(top)}</span>`:''}</div><span class="txt" dir="auto">${top?'<small>الواجب: </small>':''}${esc(i.text)}</span>${i.kind==='hw'?bkB(k.id,date,i.id.split('|')[2].slice(1),'hw'):''}</div></div>`}).join('');
  if(!hol||its.length)h+=`<div class="tvsec"><h3>📝 الواجبات</h3>${hw?`<div class="tvhwl">${hw}</div>`:'<p class="tvhint">لا توجد واجبات 😊</p>'}${its.length&&dn===its.length?`<div class="bravo">🎉 أحسنت يا ${esc(k.name)}! أنهيت كل المهام</div>`:''}</div>`;
  return`<section class="tvkid" style="--kid:${k.color}">${h}</section>`;
}
// plan tests to announce: on the school day before (all day) and on the day itself until 5 PM
function tvTests(k){
  const t=todayKey(),hr=new Date().getHours(),nx=(allDays(k.id).find(x=>x.day.date>t)||{day:{}}).day.date,out=[];
  allDays(k.id).forEach(({plan,day})=>{if(day.holiday||!((day.date===t&&hr<17)||day.date===nx))return;
    day.periods.forEach(p=>{if(p.test&&!officialFor(k.id,day.date,p.subject))out.push({date:day.date,p,words:testWords(plan,p),book:isEng(p.subject)&&englishBook(k,p,plan)})})});
  return out;
}
const noteOk=s=>/[\p{L}]{2}/u.test(s||'');  // skip stray marks like ")" read from the PDF
// 5 PM–midnight: the next school day after today; midnight–7 AM: the school day starting today; otherwise null (normal)
const tvEvening=()=>{const hr=new Date().getHours();return hr>=17||hr<7};
function tvNextDay(kid){
  const hr=new Date().getHours(),t=todayKey(),x=allDays(kid).find(x=>hr>=17?x.day.date>t:x.day.date>=t);return x?x.day.date:null;
}
// shrink a kid's card until it fits the screen (landscape only; portrait scrolls)
function fitTV(){
  if(matchMedia('(max-width:900px),(orientation:portrait)').matches)return;
  const cs=[...document.querySelectorAll('.tvkid')];let u=1;
  const over=()=>cs.some(c=>c.scrollHeight>c.clientHeight+1),set=v=>cs.forEach(c=>v?c.style.setProperty('--u',v+'vw'):c.style.removeProperty('--u'));
  set(0);while(over()&&u>.5){u=Math.round((u-.05)*100)/100;set(u)}  // same size for every kid
}
addEventListener('resize',()=>{if(V.name==='tv')fitTV()});
let WAKE=null;
async function tvWake(){try{if(V.name==='tv'&&!WAKE&&navigator.wakeLock){WAKE=await navigator.wakeLock.request('screen');WAKE.addEventListener('release',()=>WAKE=null)}}catch(e){}}
function fromHash(){if(location.hash==='#tv'){V={name:'tv'};tvWake()}else if(V.name==='tv')V={name:'home'}}
addEventListener('hashchange',()=>{fromHash();render()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tvWake()});
// keep the clock and ticks current; skip while a modal (e.g. cloud login) is open
setInterval(()=>{if(V.name==='tv'&&!document.getElementById('layer').innerHTML.trim())render()},20*1000);

/* ---------- kid ---------- */
function kidHead(k,plan){
  return `<div class="kidhead"><div class="avatar sm">${k.emoji}</div><div><h2>${esc(k.name)}</h2>${plan?`<small>${esc(plan.grade)}</small><button class="weekbadge" data-act="viewPdf" title="عرض الخطة الأسبوعية">🗓️ ${esc(plan.weekLabel||('الأسبوع '+plan.week))}${(plan.pdfs||[]).length?' 📄':''}</button>`:''}</div><div class="sp"></div>
  <div class="tabs"><button class="tab ${V.tab==='today'?'on':''}" data-tab="today">📅 اليوم</button><button class="tab ${V.tab==='week'?'on':''}" data-tab="week">🗓️ الأسبوع</button><button class="tab ${V.tab==='table'?'on':''}" data-tab="table">📋 الجدول</button><button class="tab ${V.tab==='exams'?'on':''}" data-tab="exams">📝 الاختبارات${upcomingExams(k.id,todayKey(),7).length?'<i class="dot"></i>':''}</button><button class="tab ${V.tab==='sum'?'on':''}" data-tab="sum">📊 الملخص</button></div></div>`;
}
function renderKid(){
  const k=kidById(V.kid);if(!V.date)V.date=defaultDate(k.id);
  const wrap=s=>`<div style="--kid:${k.color}">${s}</div>`;
  if(!V.date&&V.tab==='exams')return wrap(kidHead(k,null)+renderExams(k));
  if(!V.date)return wrap(kidHead(k,null)+`<div class="card empty" style="margin-top:20px">لا توجد خطة أسبوعية بعد.<br>ادخل <b>وضع ولي الأمر 🔒</b> لتحميل الخطة.</div>`);
  const plan=planFor(k.id,V.date),plans=plansOf(k.id),idx=plans.indexOf(plan);
  let h=kidHead(k,plan);
  if(V.tab==='sum')return wrap(h+renderSummary(k));
  if(V.tab==='exams')return wrap(h+renderExams(k));
  h+=`<div class="weeknav">${idx>0?`<button class="btn sm" data-date="${plans[idx-1].days[0].date}">→ الأسبوع السابق</button>`:''}
     <span>${fmt(plan.from)} – ${fmt(plan.to)}</span>     ${idx<plans.length-1?`<button class="btn sm" data-date="${plans[idx+1].days[0].date}">الأسبوع التالي ←</button>`:''}</div>`;
  if(V.tab==='week')return wrap(h+renderWeek(k,plan));
  if(V.tab==='table')return wrap(h+renderTimetable(k,plan));
  const t=todayKey();
  h+=`<div class="days">${plan.days.map(d=>{const its=items(k.id,d.date),full=its.length&&its.every(i=>i.done);
     return `<button class="day ${d.date===V.date?'on':''} ${d.date===t?'today':''} ${d.holiday?'hol':''}" data-date="${d.date}">${d.holiday?'<span class="full">🏖️</span>':full?'<span class="full">✅</span>':kidExams(k.id).some(e=>e.date===d.date)?'<span class="full">📝</span>':''}${dayName(d.date)}<small>${d.holiday?'إجازة':fmt(d.date)}</small></button>`}).join('')}</div>`;
  const fh=findDay(k.id,V.date);
  if(fh&&fh.day.holiday){const tk0=items(k.id,V.date);return wrap(h+`<div class="cols"><div>${holidayBanner(fh.day,true)}${tk0.length?`<div class="card"><h3>✅ مهام إضافية</h3>${tk0.map(i=>`<button class="item ${i.done?'done':''}" data-toggle="${i.id}"><span class="check">${i.done?'✓':''}</span><span class="body"><span class="txt" dir="auto">${esc(i.text)}</span></span><span class="pts">⭐ ${i.pts}</span></button>`).join('')}</div>`:''}</div><div>${extrasCard(plan)}</div></div>`)}
  const f=findDay(k.id,V.date),its=items(k.id,V.date),hw=its.filter(i=>i.kind==='hw'),tk=its.filter(i=>i.kind==='task');
  const dn=its.filter(i=>i.done).length,p=its.length?Math.round(dn/its.length*100):0,ws=weekStats(k.id,plan);
  const item=i=>`<button class="item ${i.done?'done':''}" data-toggle="${i.id}"><span class="check">${i.done?'✓':''}</span><span class="body">${i.kind==='hw'?chip(i.subject):'<span class="chip" style="--c:#b45309">مهمة إضافية</span>'}<span class="txt" dir="auto">${esc(i.text)}</span>${i.sub?`<small dir="auto">الدرس: ${esc(i.sub)}</small>`:''}${i.kind==='hw'?bkB(k.id,V.date,i.id.split('|')[2].slice(1),'hw'):''}</span><span class="pts">⭐ ${i.pts}</span></button>`;
  h+=`<div class="cols dayc"><div>
    ${f&&noteOk(f.day.note)?`<div class="note">📢 ${esc(f.day.note)}</div>`:''}
    ${(()=>{const ds=plan.days.map(d=>d.date).sort(),i=ds.indexOf(V.date),nx=i>=0?plan.days.find(d=>d.date===ds[i+1]):null;return nx&&nx.holiday?`<div class="holiday small"><div class="holsun">🏖️</div><div><b>غداً ${esc(nx.note||'إجازة')}</b><span>لا مدرسة يوم ${dayName(nx.date)}</span></div></div>`:''})()}
    ${upcomingExams(k.id,V.date,3).map(e=>{const n=Math.round((pd(e.date)-pd(V.date))/864e5);return`<div class="testbox exam"><b>${n===0?'📝 اليوم':n===1?'⏰ غداً ('+dayName(e.date)+')':'📅 بعد '+n+' أيام ('+dayName(e.date)+')'}: اختبار ${esc(e.subject)}${e.type?' — '+esc(e.type):''}</b>${e.parts.length?`<div class="hint" style="margin-top:4px">${n===0?'الجزء المقرر':'راجع'}:</div><div class="xparts">${e.parts.map(p=>`<span dir="auto">${esc(p)}</span>`).join('')}</div>`:''}</div>`}).join('')}
    ${upcomingTests(plan,V.date).map(x=>`<div class="testbox"><b>${x.today?'📝 اليوم':'⏰ غداً ('+dayName(x.date)+')'}: اختبار ${esc(x.p.subject)} — <span dir="auto">${esc(x.p.lesson)}</span></b>${x.words?`<div class="hint" style="margin-top:4px">${x.today?'كلمات الإملاء':'راجع كلمات الإملاء الليلة'}:</div>${wordsHtml(x.words)}`:''}</div>`).join('')}
    <div class="card"><div class="progress"><b>أنجزت ${dn} من ${its.length}</b><div class="bar"><i style="width:${p}%"></i></div><span class="stars">⭐ ${ws.stars}</span></div>
    ${its.length&&dn===its.length?`<div class="bravo">🎉 أحسنت يا ${esc(k.name)}! أنهيت كل مهام ${dayName(V.date)}</div>`:''}</div>
    <div class="card"><h3>📝 الواجبات (${hw.length})</h3>${hw.length?hw.map(item).join(''):'<p class="hint">لا توجد واجبات في هذا اليوم 😊</p>'}</div>
    <div class="card"><h3>✅ مهام إضافية</h3>${tk.length?tk.map(item).join(''):'<p class="hint">لا توجد مهام إضافية. يضيفها ولي الأمر من 🔒</p>'}</div>
    <div class="wk-end">${extrasCard(plan)}</div>
  </div><div>
    <div class="card"><h3>🏫 حصص يوم ${dayName(V.date)}</h3>${f?f.day.periods.map(pr=>`<div class="period"><span class="num">${pr.n}</span><div class="ptxt"><span class="subjlink" data-subj="${esc(subjectKey(pr.subject))}" title="ملخص المادة">${chip(pr.subject)}</span>${pr.replaced?`<small class="repl">بدلاً من ${esc(pr.replaced)}</small>`:''}<span dir="auto">${esc(pr.lesson)}</span>${bkB(k.id,V.date,pr.n,'lesson')}${wordsHtml(testWords(plan,pr))}</div>${isExamP(k.id,V.date,pr)?`<span class="badge">${pr.test?'اختبار قصير':'اختبار'}</span>`:''}</div>`).join(''):''}</div>
    <div class="wk-side">${extrasCard(plan)}</div>
  </div></div>`;
  return wrap(h);
}
/* ---------- timetable (auto-generated) ---------- */
const TT_ICONS=[['قرآن','📗'],['إسلامية','🕌'],['لغتي','📖'],['خط','✒️'],['فنية','🎨'],['بدنية','⚽'],['رقمية','💻'],['حياتية','💡'],['اجتماعية','🌍'],['كمي','📐'],['لفظي','💬'],['قدرات','🧠'],['عربية','📖'],['إنجليز','🔤'],['نافس','🎯'],['علوم','🧪'],['science','🧪'],['رياضيات','🧮'],['math','🧮']];
const TT_DAYS=[['☀️','#2a7de1'],['☁️','#3aa655'],['🌸','#f28c28'],['⭐','#8e44ad'],['🏆','#e84a6f']];
const TT_COLS=['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899','#64748b'];
const TT_ORD=['الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة'];
const normBook=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]/g,'');
const shortBook=b=>/family\s*(and|&)\s*friends/i.test(b)?'F & F':b;
const KNOWN_BOOKS=['We Can','Family and Friends','Top Goal'];
const BOOK_ALIASES={familyandfriends:['fandf','ff','familyfriends','familiyandfriends','familyandfreinds'],wecan:['wecan'],topgoal:['topgoal','topgoals']};
function bookHit(t,b){const n=normBook(b);if(!n)return false;if(t.includes(n))return true;return(BOOK_ALIASES[n]||[]).some(a=>a.length>2?t.includes(a):new RegExp('(^|[^a-z])'+a+'([^a-z]|$)').test(t))}
// which English book a period uses, from that day's text in the English plan; a spelling-quiz day with no book named
// (e.g. "Checking the homework & Spelling quiz") uses the book this week's spelling words come from
function englishBook(k,p,plan){
  const b=englishBookIn(k,p),sb=plan&&plan.extras&&plan.extras.spellingBook;
  return b||(sb&&/spell/i.test(p.lesson+' '+p.homework)?englishBookIn(k,{lesson:sb,homework:''}):'');
}
function englishBookIn(k,p){
  const raw=String(p.lesson+' '+p.homework).toLowerCase().replace(/&/g,' and '),t=normBook(raw),spaced=raw.replace(/[^a-z0-9]+/g,' ');
  const SHORT={topgoal:'tg',wecan:'wc'};  // the plans sometimes write "TG — SB — P: 4-7" / "WC — Unit 1"
  const hit=b=>bookHit(t,b)||(normBook(b)==='familyandfriends'&&/(^| )(f and f|ff)( |$)/.test(spaced))||(SHORT[normBook(b)]&&new RegExp('(^| )'+SHORT[normBook(b)]+'( |$)').test(spaced));
  const own=(k.books||[]).find(hit);if(own)return shortBook(own);
  const any=[...new Set([...S.kids.flatMap(x=>x.books||[]),...KNOWN_BOOKS])].find(hit);return any?shortBook(any):'';
}
function ttCell(k,p,plan){
  if(!p||!p.subject)return'<div class="ttc empty"><span class="ttdash">—</span></div>';
  const s=p.subject.trim();
  if(isEng(s)){const b=englishBook(k,p,plan);return`<div class="ttc"><div class="abc"><i style="color:#e53935">A</i><i style="color:#1e63d6">B</i><i style="color:#2e9d4a">C</i></div><b dir="ltr">English</b>${b?`<small dir="ltr">${esc(b)}</small>`:''}</div>`}
  const low=s.toLowerCase(),ic=(TT_ICONS.find(([w])=>low.includes(w))||[0,'📚'])[1];
  const label=s==='لغتي'?'لغتي الجميلة':s;
  return`<div class="ttc"><div class="ttic">${ic}</div><b dir="auto">${esc(label)}</b></div>`;
}
function renderTimetable(k,plan){
  const maxN=Math.max(0,...plan.days.map(d=>Math.max(0,...d.periods.map(p=>p.n))));
  const g=gradeNum(plan.grade)||k.grade,sec=(String(plan.grade||'').match(/\(([^)]+)\)/)||[])[1];
  let h=`<div class="tt-actions"><button class="btn" onclick="window.print()">🖨️ طباعة الجدول</button></div>
  <div class="tt" id="tt"><div class="tthead"><span class="ttdeco">🎒</span><div><h1>جدول الصف <span style="color:#2e9d4a">${esc(GRADE_WORDS[g-1]||g)}</span>${sec?` <span style="color:#e53935">(${esc(sec)})</span>`:''} الأسبوعي</h1>
  <p>أتعلم ⭐ أستمتع ⭐ أنجح</p><small>${esc(k.name)} · ${esc(plan.weekLabel||'')} · ${fmt(plan.from)} – ${fmt(plan.to)}</small></div><span class="ttdeco">🚀</span></div>
  <div class="ttgrid" style="--n:${maxN};grid-template-columns:110px repeat(${maxN},1fr)"><div class="tth" style="background:#1e3a8a">اليوم</div>`;
  for(let n=1;n<=maxN;n++)h+=`<div class="tth" style="background:${TT_COLS[(n-1)%TT_COLS.length]}">${TT_ORD[n-1]||n}</div>`;
  plan.days.forEach(d=>{const off=pd(d.date).getDay(),[ic,c]=TT_DAYS[off]||['📅','#64748b'];
    h+=`<div class="ttday" style="background:${c}"><span>${ic}</span>${dayName(d.date)}</div>`;
    if(d.holiday)h+=`<div class="ttc tthol" style="grid-column:span ${maxN}"><span class="ttic">🏖️</span><b>${esc(d.note||'إجازة')}</b><small>لا توجد حصص</small></div>`;
    else for(let n=1;n<=maxN;n++)h+=ttCell(k,d.periods.find(p=>p.n===n),plan);
  });
  return h+`</div></div>`;
}
/* ---------- subject summary ---------- */
function subjectKey(s){s=String(s||'').trim();if(isEng(s)||/^اللغة الإنجليزية$|^الإنجليزي/.test(s))return'English';if(s==='لغتي الجميلة'||/^(اللغة العربية|لغتي)$/.test(s))return'لغتي';return s}
function subjIcon(s){if(isEng(s))return'🔤';const low=s.toLowerCase();return(TT_ICONS.find(([w])=>low.includes(w))||[0,'📚'])[1]}
function subjectHistory(kid){
  const map={};
  allDays(kid).forEach(({plan,day})=>{
    if(day.holiday)return;
    day.periods.forEach(p=>{
      const key=subjectKey(p.subject);if(!key)return;
      const les=(p.lesson||'').trim(),skip=isEmptyCell(les)||/منفصلة|الخطة الإنجليزية/.test(les)||(day.note&&les===day.note);
      const hwId=hasHw(p.homework)?`${kid}|${day.date}|p${p.n}`:null;
      (map[key]=map[key]||[]).push({date:day.date,n:p.n,lesson:skip?'':les,homework:hasHw(p.homework)?p.homework:'',test:!!p.test,hwId,done:hwId?!!S.done[hwId]:false,week:plan.weekLabel||'',spell:testWords(plan,p)});
    });
  });
  Object.values(map).forEach(a=>a.sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:x.n-y.n));
  return map;
}
function topicsOf(entries){
  const out=[];
  entries.forEach(e=>{
    const last=out.at(-1),title=e.lesson||(e.homework?'—':'');
    if(!title)return;
    if(last&&last.title===title&&e.lesson){last.items.push(e);return}
    out.push({title,items:[e]});
  });
  return out;
}
function renderSummary(k){
  const map=subjectHistory(k.id),keys=Object.keys(map),t=todayKey();
  if(!keys.length)return`<div class="card empty" style="margin-top:20px">لا توجد خطط محمّلة بعد.</div>`;
  if(V.subj&&map[V.subj])return renderSubject(k,V.subj,map[V.subj]);
  const stat=e=>{const past=e.filter(x=>x.date<=t),hw=past.filter(x=>x.hwId);return{classes:past.length,topics:topicsOf(past).filter(x=>x.title!=='—').length,hwT:hw.length,hwD:hw.filter(x=>x.done).length,last:[...past].reverse().find(x=>x.lesson),tests:e.filter(x=>x.test).length}};
  keys.sort((a,b)=>map[b].length-map[a].length);
  const weeks=plansOf(k.id).length;
  let h=`<div class="sumhead"><h3>📊 ملخص المواد</h3><span class="hint">من ${weeks} ${weeks===1?'أسبوع':'أسابيع'} محمّلة — اضغط على أي مادة لرؤية كل الدروس</span></div><div class="sumgrid">`;
  keys.forEach(key=>{const s=stat(map[key]),c=subjColor(key),pc=s.hwT?Math.round(s.hwD/s.hwT*100):100;
    h+=`<button class="sumcard" data-subj="${esc(key)}" style="--c:${c}"><div class="sumtop"><span class="sumic">${subjIcon(key)}</span><b dir="auto">${esc(key==='لغتي'?'لغتي الجميلة':key)}</b>${s.tests?`<span class="badge">${s.tests} اختبار</span>`:''}</div>
    <div class="sumnums"><span><b>${s.classes}</b> حصة</span><span><b>${s.topics}</b> موضوع</span></div>
    ${s.last?`<div class="sumlast"><small>آخر درس</small><span dir="auto">${esc(s.last.lesson)}</span></div>`:''}
    <div class="sumhw"><small>الواجبات ${s.hwD}/${s.hwT}</small><div class="bar"><i style="width:${pc}%;background:${c}"></i></div></div></button>`});
  return h+`</div>`;
}
function renderSubject(k,key,entries){
  const t=todayKey(),past=entries.filter(e=>e.date<=t),next=entries.filter(e=>e.date>t),c=subjColor(key);
  const hw=past.filter(e=>e.hwId),done=hw.filter(e=>e.done).length,tp=topicsOf(past);
  const dateChip=e=>`<span class="dchip ${e.date===t?'today':''}">${dayName(e.date)} ${fmt(e.date)}</span>`;
  const hwLine=e=>e.hwId?`<button class="cellhw ${e.done?'done':''} ${!e.done&&e.date<t?'late':''}" data-toggle="${e.hwId}">${e.done?'✅':'⬜'} <small class="hwday">${tpc_multi(e)}</small><span dir="auto">${esc(e.homework)}</span>${!e.done&&e.date<t?' <small>لم يُنجز</small>':''}</button>`:'';
  let tpc_multi=()=>'';
  const topic=tpc=>{tpc_multi=e=>tpc.items.length>1?dayName(e.date)+' '+fmt(e.date,{day:'numeric',month:'numeric'})+':':'';return `<div class="topic"><div class="ttl"><b dir="auto">${esc(tpc.title)}</b>${tpc.items.some(e=>e.test)?'<span class="badge">اختبار</span>':''}</div>
    <div class="dates">${tpc.items.map(dateChip).join('')}</div>${tpc.items.map(e=>wordsHtml(e.spell)).find(Boolean)||''}${tpc.items.map(hwLine).join('')}</div>`};
  let h=`<div class="subjview" style="--c:${c}"><div class="subjhead"><button class="btn sm" data-subj="">→ كل المواد</button><span class="sumic">${subjIcon(key)}</span><h2 dir="auto">${esc(key==='لغتي'?'لغتي الجميلة':key)}</h2></div>
  <div class="subjstats"><div><b>${past.length}</b><small>حصة حتى الآن</small></div><div><b>${tp.filter(x=>x.title!=='—').length}</b><small>موضوع</small></div><div><b>${done}/${hw.length}</b><small>واجبات منجزة</small></div><div><b>${entries.filter(e=>e.test).length}</b><small>اختبارات</small></div></div>`;
  if(next.length)h+=`<div class="card"><h3>⏭️ القادم</h3>${topicsOf(next).map(topic).join('')}</div>`;
  const sx=kidExams(k.id).filter(e=>subjectKey(e.subject)===key),st=[];
  if(sx.length||st.length)h+=`<div class="card"><h3>📝 الاختبارات والدرجات</h3><div class="xlist">${[...sx.map(e=>({date:e.date,t:e.set.title,parts:e.parts,key:e.key,s:e.subject})),...st.map(x=>({date:x.date,t:x.title,parts:[],key:x.key,s:x.subject}))].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<div class="xcard ${daysTo(x.date)<0?'past':''}" style="--c:${c}"><div class="xdate"><b>${pd(x.date).getDate()}</b><span>${dayName(x.date)}</span><small>${fmt(x.date,{month:'long'})}</small></div><div class="xbody"><div class="xtitle"><b dir="auto">${esc(x.t)}</b><span class="xwhen">${whenTxt(x.date)}</span></div>${x.parts.length?`<div class="xparts">${x.parts.map(p=>`<span dir="auto">${esc(p)}</span>`).join('')}</div>`:''}</div><div class="xgrade">${gradeBlock(x.key,x.s,x.date)}</div></div>`).join('')}</div></div>`;
  h+=`<div class="card"><h3>📚 الدروس حتى الآن</h3>${tp.length?tp.slice().reverse().map(topic).join(''):'<p class="hint">لا توجد دروس بعد</p>'}</div></div>`;
  return h;
}
function extrasCard(plan){
  const e=plan.extras||{},t=todayKey();
  const tests=[];plan.days.forEach(d=>d.periods.forEach(p=>{if(p.test)tests.push({date:d.date,p})}));
  if(V.kid)kidExams(V.kid).filter(e=>e.date>=plan.from&&e.date<=addDays(plan.to,2)).forEach(e=>tests.push({date:e.date,p:{subject:e.subject,lesson:e.set.period||e.set.title}}));tests.sort((a,b)=>a.date.localeCompare(b.date));
  let h=`<div class="card"><h3>🌟 هذا الأسبوع</h3>`;
  if(tests.length)h+=`<div class="ex"><b>الاختبارات</b>${tests.map(x=>`<div class="test ${x.date<t?'past':''}"><span>📌 ${dayName(x.date)}: ${esc(x.p.subject)} — <span dir="auto">${esc(x.p.lesson)}</span></span></div>`).join('')}</div>`;
  if(e.spelling&&e.spelling.length)h+=`<div class="ex"><b>كلمات الإملاء (English Spelling)</b><div class="words">${e.spelling.map(w=>`<span class="word">${esc(w)}</span>`).join('')}</div></div>`;
  if(e.questionOfWeek)h+=`<div class="ex"><b>سؤال الأسبوع</b><div dir="ltr" style="text-align:left">${esc(e.questionOfWeek)}</div></div>`;
  if(e.newVocab)h+=`<div class="ex"><b>مفردات جديدة</b><div dir="ltr" style="text-align:left">${esc(e.newVocab)}</div></div>`;
  if(e.scienceMath&&e.scienceMath.length)h+=`<div class="ex"><b>Science & Math (بالإنجليزي)</b>${e.scienceMath.map(s=>`<div dir="ltr" style="text-align:left">${esc(s)}</div>`).join('')}</div>`;
  if(plan.weekValue)h+=`<div class="ex"><b>قيمة الأسبوع</b>${esc(plan.weekValue)}</div>`;
  if(!/class="ex"/.test(h))return'';
  return h+'</div>';
}
function renderWeek(k,plan){
  const t=todayKey(),maxN=Math.max(0,...plan.days.map(d=>Math.max(0,...d.periods.map(p=>p.n))));
  let h=`<div class="card" style="margin-top:16px"><div class="tablewrap"><table class="week"><tr><th class="n"></th>${plan.days.map(d=>`<th ${d.holiday?'class="holth"':''}>${dayName(d.date)}<small>${fmt(d.date)}${d.holiday?' · 🏖️':d.note?' · 📢':''}</small></th>`).join('')}</tr>`;
  for(let n=1;n<=maxN;n++){
    h+=`<tr><td class="n">${n}</td>`;
    plan.days.forEach(d=>{
      if(d.holiday){if(n===1)h+=`<td rowspan="${maxN}" class="holcell"><div class="holsun">🏖️</div><b>${esc(d.note||'إجازة')}</b></td>`;return}
      const p=d.periods.find(x=>x.n===n);
      if(!p){h+=`<td></td>`;return}
      const id=`${k.id}|${d.date}|p${n}`,dn=!!S.done[id];
      h+=`<td class="${d.date===t?'today':''}">${chip(p.subject)} ${isExamP(k.id,d.date,p)?`<span class="badge">${p.test?'اختبار قصير':'اختبار'}</span>`:''}${p.replaced?`<small class="repl">بدلاً من ${esc(p.replaced)}</small>`:''}<div dir="auto">${esc(p.lesson)}</div>${wordsHtml(testWords(plan,p))}${hasHw(p.homework)?`<button class="cellhw ${dn?'done':''}" data-toggle="${id}">${dn?'✅':'⬜'} <span dir="auto">${esc(p.homework)}</span></button>`:''}</td>`});
    h+='</tr>';
  }
  h+='</table></div>';
  const notes=plan.days.filter(d=>d.note&&!d.holiday);
  if(notes.length)h+=notes.map(d=>`<div class="note" style="margin:10px 0 0">📢 ${dayName(d.date)}: ${esc(d.note)}</div>`).join('');
  return h+`</div>`+extrasCard(plan);
}

/* ---------- parent ---------- */
function renderParent(){
  const t=todayKey(),opts=S.kids.map(k=>`<option value="${k.id}">${esc(k.name)}</option>`).join('');
  let h=`<div class="parenthead"><h1>🔒 وضع ولي الأمر</h1><div class="sp"></div><button class="btn" data-act="lock">خروج وقفل</button></div><div class="grid2"><div>`;
  h+=`<div class="card"><h3>📥 تحميل الخطة الأسبوعية</h3>
  <button class="drop" id="drop" data-act="pickPdf"><span style="font-size:40px">📄</span><b>اسحب ملفات خطة المدرسة (PDF) وأفلتها هنا</b><span class="hint">الخطة الأسبوعية (العربية والإنجليزية) أو جدول الاختبارات — أو اضغط هنا للاختيار</span></button>`;
  h+=`<button class="btn sm" data-act="pickAttach" style="margin-bottom:12px">📎 إرفاق ملفات PDF الأصلية لأسابيع محفوظة</button>`;
  S.kids.forEach(k=>{const ps=plansOf(k.id);h+=`<b>${k.emoji} ${esc(k.name)}</b><ul class="list">${ps.length?ps.map(p=>`<li><span>${esc(p.weekLabel||('الأسبوع '+p.week))} — ${fmt(p.from)} إلى ${fmt(p.to)}${(p.pdfs||[]).length?' 📎':''}</span><button class="btn sm danger" data-act="delPlan" data-kid2="${k.id}" data-from="${p.from}">حذف</button></li>`).join(''):'<li class="hint">لا توجد خطط</li>'}</ul>`});
  h+=`</div>`;
  h+=`<div class="card"><h3>➕ مهام إضافية</h3>
    <div class="row"><label style="flex:1">المهمة<input id="tTitle" placeholder="مثال: قراءة 10 صفحات"></label></div>
    <div class="row"><label>لمن<select id="tKid"><option value="both">الاثنين</option>${opts}</select></label>
    <label>متى<select id="tWhen"><option value="daily">كل يوم دراسي</option><option value="date">يوم محدد</option></select></label>
    <label>التاريخ<input type="date" id="tDate" value="${t}"></label>
    <label>النجوم<select id="tPts"><option>1</option><option>2</option><option>3</option></select></label>
    <button class="btn primary" data-act="addTask">إضافة</button></div>
    <ul class="list">${S.tasks.length?S.tasks.map(x=>`<li><span>${esc(x.title)} <small class="hint">— ${x.kid==='both'?'الاثنين':esc(kidById(x.kid)?.name)} · ${x.date==='daily'?'كل يوم':dayName(x.date)+' '+fmt(x.date)} · ⭐${x.points}</small></span><button class="btn sm danger" data-act="delTask" data-id="${x.id}">حذف</button></li>`).join(''):'<li class="hint">لا توجد مهام</li>'}</ul></div>`;
  if(typeof booksCard==='function')h+=booksCard();
  h+=`</div><div>`;
  h+=`<div class="card"><h3>📊 ملخص الأسبوع</h3>`;
  S.kids.forEach(k=>{const date=defaultDate(k.id),plan=date&&planFor(k.id,date);
    if(!plan){h+=`<p><b>${k.emoji} ${esc(k.name)}</b>: لا توجد خطة</p>`;return}
    const ws=weekStats(k.id,plan),missed=[];
    plan.days.filter(d=>d.date<t).forEach(d=>items(k.id,d.date).forEach(i=>{if(!i.done)missed.push({d:d.date,i})}));
    const av=kidAverage(k.id);
    h+=`<div class="ex"><b style="color:var(--ink);font-size:17px">${k.emoji} ${esc(k.name)} — ${ws.d} من ${ws.t} · ⭐ ${ws.stars}${av?` · 📝 معدل ${av.avg}%`:''}</b>
      <div class="bar" style="margin:6px 0"><i style="width:${ws.t?ws.d/ws.t*100:0}%;background:${k.color}"></i></div>
      ${missed.length?`<div class="hint">لم يُنجز من الأيام الماضية:</div><ul class="list">${missed.map(m=>`<li><span>${dayName(m.d)} · ${esc(m.i.subject)}: <span dir="auto">${esc(m.i.text)}</span></span></li>`).join('')}</ul>`:'<div class="hint">✅ لا يوجد شيء متأخر</div>'}</div>`});
  h+=`</div>`;
  h+=`<div class="card"><h3>⚙️ الإعدادات</h3>${S.kids.map(k=>`<div class="row"><label>الاسم<input id="nm_${k.id}" value="${esc(k.name)}"></label><label>الرمز<input id="em_${k.id}" value="${esc(k.emoji)}" style="width:70px;text-align:center"></label><label>اللون<input type="color" id="cl_${k.id}" value="${k.color}" style="width:60px;padding:2px"></label><label style="flex:1;min-width:200px">كتب الإنجليزي (افصل بفاصلة)<input id="bk_${k.id}" dir="ltr" value="${esc((k.books||[]).join(', '))}"></label><label>الصف<select id="gr_${k.id}">${GRADE_WORDS.map((w,i)=>`<option value="${i+1}" ${+k.grade===i+1?'selected':''}>${w}</option>`).join('')}</select></label></div>`).join('')}
    <div class="row"><label>رمز ولي الأمر الجديد<input id="newPin" type="password" inputmode="numeric" placeholder="اتركه فارغاً بلا تغيير"></label><button class="btn primary" data-act="saveSettings">حفظ الإعدادات</button></div></div>`;
  if(typeof cloudCard==='function')h+=cloudCard();
  h+=`<div class="card"><h3>💾 نسخة احتياطية</h3><p class="hint">البيانات محفوظة في هذا المتصفح. خذ نسخة احتياطية كل فترة.</p><div class="row"><button class="btn" data-act="export">تنزيل نسخة احتياطية</button><label>استعادة من ملف<input type="file" id="bkFile" accept=".json"></label><button class="btn" data-act="import">استعادة</button></div></div>`;
  return h+`</div></div>`;
}

/* ---------- helpers ---------- */
function toast(m){const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}
function celebrate(){for(let i=0;i<40;i++){const s=document.createElement('span');s.className='confetti';s.textContent=['🎉','⭐','🌟','✨','🏆'][i%5];s.style.left=Math.random()*100+'vw';s.style.animationDelay=Math.random()*.6+'s';document.body.appendChild(s);setTimeout(()=>s.remove(),3200)}}
function closeModal(){document.getElementById('layer').innerHTML=''}
let PIN_RET=null;
function askPin(ret){PIN_RET=ret&&ret.name?ret:null;
  document.getElementById('layer').innerHTML=`<div class="overlay"><div class="modal"><h3>🔒 وضع ولي الأمر</h3><input id="pinIn" type="password" inputmode="numeric" autocomplete="off"><div class="mrow"><button class="btn" data-act="closeModal">إلغاء</button><button class="btn primary" data-act="checkPin">دخول</button></div>${S.pin==='1234'?'<small class="hint">الرمز الافتراضي 1234 — غيّره من الإعدادات</small>':''}</div></div>`;
  const i=document.getElementById('pinIn');i.focus();i.addEventListener('keydown',e=>{if(e.key==='Enter')checkPin()});
}
function checkPin(){if(document.getElementById('pinIn').value===S.pin){parentOK=true;closeModal();V=PIN_RET||{name:'parent'};PIN_RET=null;render();if(STASH){const f=STASH;STASH=null;handleFiles(f)}}else toast('الرمز غير صحيح')}
function parsePlan(txt){
  txt=String(txt).replace(/^﻿/,'').replace(/[​-‏‪-‮⁦-⁩]/g,m=>m==='‏'||m==='‎'?m:'').trim();
  const a=txt.indexOf('{'),b=txt.lastIndexOf('}');
  if(txt.startsWith('%PDF'))return{error:'هذا ملف PDF من المدرسة. اختر ملف الخطة الذي ينتهي بـ .json (مثل week-09-grade3A.json).'};
  if(a<0||b<a)return{error:'هذا ليس ملف خطة (لا يحتوي على بيانات JSON). تأكد أنك اخترت ملف .json وليس PDF.'};
  txt=txt.slice(a,b+1).replace(/[“”]/g,'"');
  let p;try{p=JSON.parse(txt)}catch(e){return{error:'صيغة الملف تالفة: '+e.message}}
  if(!Array.isArray(p.days)||!p.days.length)return{error:'الملف لا يحتوي على أيام الخطة (days).'};
  if(!p.from||!p.to){const ds=p.days.map(d=>d.date).sort();p.from=p.from||ds[0];p.to=p.to||ds[ds.length-1]}
  for(const d of p.days){if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date||''))return{error:'تاريخ غير صحيح في الخطة: '+d.date};if(!Array.isArray(d.periods))d.periods=[]}
  p.format='kids-dashboard-week';return{plan:p};
}
function showErr(m){document.getElementById('layer').innerHTML=`<div class="overlay"><div class="modal"><h3>⚠️ لم يتم التحميل</h3><p style="white-space:pre-wrap;margin:0" dir="auto">${esc(m)}</p><div class="mrow"><button class="btn primary" data-act="closeModal">حسناً</button></div></div></div>`}
/* ================= PDF import (offline, pdf.js) ================= */
let PENDING=null,STASH=null,QUEUE=[],QTOTAL=0,QSAVED=0;
function nextReview(){if(!QUEUE.length){if(QTOTAL>1)toast('✅ تم حفظ '+QSAVED+' من '+QTOTAL+' أسابيع');QTOTAL=0;QSAVED=0;return}PENDING=QUEUE.shift();PENDING.kind==='exam'?drawExamReview():drawReview()}
const addDays=(k,n)=>{const d=pd(k);d.setDate(d.getDate()+n);return dk(d)};
const sundayOf=k=>{const d=pd(k);d.setDate(d.getDate()-d.getDay());return dk(d)};
const median=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
const cx=i=>i.x+i.w/2;
const AR_RE=/[؀-ۿ]/;
function fixAr(s){
  s=String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/ـ/g,'').replace(/[”“″]/g,"'");
  s=s.replace(/(^|[\s(\/])([وفبك]?)ا([أإآ])ل/g,'$1$2ال$3').replace(/(^|[\s(\/])([وفبك]?)اال/g,'$1$2الا');
  s=s.replace(/(^|\s)([وف]?)ال(?=[\s.،]|$)/g,'$1$2لا').replace(/(^|\s)إال(?=[\s.،]|$)/g,'$1إلا');
  for(const[a,b]of AR_FIX)s=s.split(a).join(b);
  return s.replace(/\s+/g,' ').trim();
}
const isEmptyCell=s=>!s||/^[.\s…·\-–—]*$/.test(s);
async function pdfPages(buf){
  const doc=await pdfjsLib.getDocument({data:buf,isEvalSupported:false}).promise,out=[];
  for(let n=1;n<=Math.min(doc.numPages,6);n++){const pg=await doc.getPage(n),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent();out.push(tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({s:i.str,x:i.transform[4],y:vp.height-i.transform[5],w:i.width})))}
  return out;
}
async function pdfItems(buf){
  if(!window.pdfjsLib)throw new Error('مكتبة قراءة PDF غير موجودة');
  const doc=await pdfjsLib.getDocument({data:buf,isEvalSupported:false}).promise;
  const pg=await doc.getPage(1),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent();
  return tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({s:i.str,x:i.transform[4],y:vp.height-i.transform[5],w:i.width}));
}
/* ---------- original plan PDFs: IndexedDB on this device + cloud /family/pdfs (loaded only when viewed) ---------- */
const b64enc=u=>{let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
const b64dec=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
function pdfDB(){return new Promise((res,rej)=>{const r=indexedDB.open('kidsDashPdf',1);r.onupgradeneeded=()=>r.result.createObjectStore('pdf');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function pdfCache(id,buf){try{const db=await pdfDB();return await new Promise((res,rej)=>{const st=db.transaction('pdf',buf?'readwrite':'readonly').objectStore('pdf'),r=buf?st.put(buf,id):st.get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}catch(e){return null}}
const cloudPdfRef=id=>typeof CLOUD!=='undefined'&&CLOUD.ready&&CLOUD.ref?CLOUD.ref.child('pdfs/'+id):null;
async function storePdf(id,buf){await pdfCache(id,buf);const r=cloudPdfRef(id);if(r)await r.set(b64enc(buf))}
async function loadPdf(id){let b=await pdfCache(id);if(b)return b;const r=cloudPdfRef(id);if(!r)return null;const v=(await r.once('value')).val();if(!v)return null;b=b64dec(v);pdfCache(id,b);return b}
function dropPdf(id){const r=cloudPdfRef(id);if(r)r.remove();pdfDB().then(db=>db.transaction('pdf','readwrite').objectStore('pdf').delete(id)).catch(()=>{})}
async function attachPdfs(kid,plan,list){for(const x of list){const id=`${kid}_${plan.from}_${x.lang}`;await storePdf(id,x.buf);plan.pdfs=(plan.pdfs||[]).filter(p=>p.lang!==x.lang).concat({id,lang:x.lang,name:x.name})}}
let PDFV=[],PDFBUF=null;
// print: re-render the pages sharper than the on-screen canvases, then print only those (works on phones too)
async function printPdf(){
  if(!PDFBUF)return toast('⏳ انتظر حتى يكتمل تحميل الملف');
  try{const doc=await pdfjsLib.getDocument({data:PDFBUF.slice(),isEvalSupported:false,disableFontFace:true}).promise;return printDocPages(doc,[...Array(doc.numPages)].map((_,i)=>i+1))}
  catch(e){console.error(e);toast('⚠️ تعذّرت الطباعة')}
}
// nums: 1-based PDF page numbers (also used to print book pages)
async function printDocPages(doc,nums){
  toast('🖨️ جاري تجهيز الطباعة...');
  try{
    const imgs=[];let land=false;
    for(const n of nums){const pg=await doc.getPage(n),vp=pg.getViewport({scale:2.5}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;if(vp.width>vp.height)land=true;
      await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;const im=new Image();im.src=c.toDataURL('image/png');imgs.push(im)}
    await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));
    document.getElementById('pdfPrint')?.remove();document.getElementById('pdfPrintPage')?.remove();
    const box=document.createElement('div');box.id='pdfPrint';imgs.forEach(i=>box.appendChild(i));document.body.appendChild(box);
    const st=document.createElement('style');st.id='pdfPrintPage';st.textContent=`@page{size:A4 ${land?'landscape':'portrait'};margin:6mm}`;document.head.appendChild(st);
    const done=()=>{document.body.classList.remove('printpdf');box.remove();st.remove()};
    addEventListener('afterprint',done,{once:true});
    document.body.classList.add('printpdf');window.print();
  }catch(e){console.error(e);toast('⚠️ تعذّرت الطباعة')}
}
// list: the week's plan files [{id,lang,name}]; i: which one to show (Arabic / English tabs)
async function viewPdf(list,i=0){
  PDFV=list;PDFBUF=null;const cur=list[i];
  const tabs=list.length>1?`<div class="tabs">${list.map((p,j)=>`<button class="tab ${j===i?'on':''}" data-act="pdfTab" data-i="${j}">${p.lang==='en'?'🇬🇧 English':'📗 العربية'}</button>`).join('')}</div>`
    :`<h3>📄 <span dir="auto">${cur?esc(cur.name.replace(/\.pdf$/i,'')):'الخطة الأسبوعية'}</span></h3>`;
  document.getElementById('layer').innerHTML=`<div class="overlay"><div class="modal big pdfv"><div class="kidhead">${tabs}<div class="sp"></div><button class="btn primary" id="pdfPrintBtn" data-act="printPdf" hidden>🖨️ طباعة</button><a class="btn" id="pdfOpen" target="_blank" rel="noopener" hidden>↗️ فتح في نافذة</a><button class="btn" data-act="closeModal">إغلاق</button></div><div id="pdfPages" class="hint">${cur?'⏳ جاري تحميل الملف...':'لم يُرفق ملف الخطة لهذا الأسبوع بعد.<br>ولي الأمر: من <b>وضع ولي الأمر 🔒</b> اضغط «📎 إرفاق ملفات PDF الأصلية».'}</div></div></div>`;
  if(!cur)return;const id=cur.id,box0=document.getElementById('pdfPages');
  try{
    const buf=await loadPdf(id);if(!box0.isConnected)return;/* closed or switched tab meanwhile */if(!buf)throw new Error('الملف غير موجود. أرفقه من وضع ولي الأمر 🔒');
    const a=document.getElementById('pdfOpen');if(a){a.href=URL.createObjectURL(new Blob([buf],{type:'application/pdf'}));a.hidden=false}
    PDFBUF=buf;const pb=document.getElementById('pdfPrintBtn');if(pb)pb.hidden=false;
    // disableFontFace: draw glyphs from the embedded fonts directly; handing the converted Arabic fonts to the browser drops letters
    const doc=await pdfjsLib.getDocument({data:buf.slice(),isEvalSupported:false,disableFontFace:true}).promise,box=document.getElementById('pdfPages');if(!box)return;box.textContent='';box.className='';
    for(let n=1;n<=doc.numPages;n++){if(!box.isConnected)return;const pg=await doc.getPage(n),sc=(box.clientWidth||800)/pg.getViewport({scale:1}).width*Math.min(window.devicePixelRatio||1,2),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;c.className='pdfpage';box.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}
  }catch(e){if(box0.isConnected)box0.textContent='⚠️ '+(e.message||e)}
}
function joinItems(arr){
  if(!arr.length)return'';
  const rtl=arr.some(i=>AR_RE.test(i.s));
  const a=arr.slice().sort((p,q)=>rtl?((q.x+q.w)-(p.x+p.w)||q.x-p.x):p.x-q.x);
  let out=a[0].s;
  for(let k=1;k<a.length;k++){const p=a[k-1],q=a[k],gap=rtl?p.x-(q.x+q.w):q.x-(p.x+p.w);out+=(gap>1.5?' ':'')+q.s}
  return out.replace(/\s+/g,' ').trim();
}
function lines(arr,tol=4){
  const L=[];arr.slice().sort((p,q)=>p.y-q.y).forEach(i=>{const l=L.find(l=>Math.abs(l.y-i.y)<=tol);l?l.items.push(i):L.push({y:i.y,items:[i]})});
  return L.map(l=>({y:l.y,text:fixAr(joinItems(l.items))}));
}
const cellText=(arr,sep=' ')=>lines(arr).map(l=>l.text).filter(Boolean).join(sep);
const DAY_RE=[/حد/,/ثنين/,/ثلاثاء|ثالثاء/,/ربعاء/,/خميس/];
const ORD={'الأول':1,'الثاني':2,'الثالث':3,'الرابع':4,'الخامس':5,'السادس':6,'السابع':7,'الثامن':8,'التاسع':9,'العاشر':10,'الحادي عشر':11,'الثاني عشر':12,'الثالث عشر':13,'الرابع عشر':14,'الخامس عشر':15,'السادس عشر':16,'السابع عشر':17,'الثامن عشر':18,'التاسع عشر':19,'العشرون':20};
const MONTHS=[/يناير/,/فبراير/,/مارس/,/[أاإ]بريل/,/مايو/,/يونيو/,/يوليو/,/[أا]غسطس/,/سبتمبر/,/[أا]كتوبر/,/نوفمبر/,/ديسمبر/];

function parseArabic(items){
  const f=re=>items.find(i=>re.test(fixAr(i.s)));
  const hPer=f(/^الحصة$/),hSub=f(/^المادة$/),hLes=f(/موضوع/),hHw=f(/الواجبات/),hDay=f(/^اليوم$/);
  if(!hPer||!hSub||!hLes||!hHw)return null;
  const C={per:cx(hPer),sub:cx(hSub),les:cx(hLes),hw:cx(hHw),day:hDay?cx(hDay):cx(hPer)+45};
  const top=hPer.y+5;
  const anchors=items.filter(i=>i.y>top&&Math.abs(cx(i)-C.per)<15&&/^\d{1,2}$/.test(fixAr(i.s))).sort((a,b)=>a.y-b.y);
  if(!anchors.length)return null;
  const g=median(anchors.slice(1).map((a,k)=>a.y-anchors[k].y))||15;
  const rows=anchors.map((a,k)=>({n:+fixAr(a.s),top:k?(anchors[k-1].y+a.y)/2:a.y-g/2,bot:k<anchors.length-1?(a.y+anchors[k+1].y)/2:a.y+g/2,sub:[],les:[],hw:[],span:[]}));
  const dayLabels=[];
  for(const i of items){
    if(i.y<=top||anchors.includes(i))continue;
    const c=cx(i),d={day:Math.abs(c-C.day),per:Math.abs(c-C.per),sub:Math.abs(c-C.sub),les:Math.abs(c-C.les),hw:Math.abs(c-C.hw)};
    if(d.day<d.per&&d.day<d.sub){dayLabels.push(i);continue}
    const r=rows.find(r=>i.y>=r.top&&i.y<r.bot);if(!r)continue;
    if(d.per<d.sub&&d.per<d.les)continue;
    const lo=Math.min(C.les,C.hw),hi=Math.max(C.les,C.hw);if(d.les>50&&d.hw>50&&c>lo&&c<hi){r.span.push(i);continue}
    r[d.sub<=d.les&&d.sub<=d.hw?'sub':d.les<=d.hw?'les':'hw'].push(i);
  }
  const days=[];let cur=null,prev=99;
  rows.forEach(r=>{if(!cur||r.n<=prev){cur={rows:[]};days.push(cur)}cur.rows.push(r);prev=r.n});
  const out=days.map((d,idx)=>{
    const t0=d.rows[0].top,t1=d.rows.at(-1).bot;
    const lab=dayLabels.find(l=>l.y>=t0&&l.y<t1),lt=lab?fixAr(lab.s):'';
    let off=DAY_RE.findIndex(re=>re.test(lt));if(off<0)off=idx;
    let note='';
    const periods=d.rows.map(r=>{
      if(r.span.length)note=cellText(r.span);
      return{n:r.n,subject:cellText(r.sub),lesson:cellText(r.les),homework:cellText(r.hw)};
    });
    const holiday=!!note&&/إجاز|اجاز|عطلة|عطله|holiday|vacation|day off/i.test(note)&&d.rows.every(r=>!r.les.length&&!r.hw.length);
    if(note&&!holiday)periods.forEach(p=>{if(isEmptyCell(p.lesson)&&isEmptyCell(p.homework))p.lesson=note});
    if(holiday)periods.forEach(p=>{p.lesson='';p.homework=''});
    return{offset:off,note,holiday,periods};
  });
  const L=lines(items.filter(i=>i.y<top-10));
  const m=re=>{for(const l of L){const x=l.text.match(re);if(x)return x[1].trim()}return''};
  let date='';
  for(const l of L){if(!/التاريخ/.test(l.text))continue;const t=l.text.replace(/[ً-ْ]/g,'');const dd=t.match(/(\d{1,2})\s*([^\d\s]+)\s*(\d{4})/);
    if(dd){const mi=MONTHS.findIndex(re=>re.test(dd[2]));if(mi>=0)date=dd[3]+'-'+String(mi+1).padStart(2,'0')+'-'+dd[1].padStart(2,'0')}}
  const weekWord=m(/(?<!قيمة )الأسبوع:\s*(\S+(?:\s+عشر)?)/);
  return{days:out,date,weekWord,week:ORD[weekWord]||+(weekWord.match(/\d+/)||[0])[0]||0,
    grade:m(/الصف:\s*(.+?)(?:\s+رائد|$)/),classTeacher:m(/رائد الفصل:\s*(.+)$/),weekValue:m(/قيمة الأسبوع:\s*(\S+)/),
    school:m(/(مدرسة\s+[^:]+?)(?:\s+\S+:|$)/)};
}

function parseEnglish(items){
  const names=['sunday','monday','tuesday','wednesday','thursday'];
  const hd=names.map(n=>items.find(i=>i.s.trim().toLowerCase()===n));
  const present=hd.filter(Boolean);if(present.length<3)return null;
  const hy=median(present.map(i=>i.y)),centers=hd.map(i=>i?cx(i):null);
  const cs=centers.filter(c=>c!=null),cut=cs[0]-(cs[1]-cs[0])/2;
  const lab=re=>items.find(i=>i.x+i.w<cut+5&&i.y>hy&&re.test(i.s.trim()));
  const cw=lab(/class\s*work|^lessons?$/i),hw=lab(/home\s*work/i),sm=lab(/^science/i),sp=lab(/^spelling$/i);
  const qh=items.find(i=>/question of the week/i.test(i.s)),vh=items.find(i=>/new vocab/i.test(i.s)),bh=items.find(i=>/brilliant/i.test(i.s));
  const bottom=qh?qh.y-5:Infinity;
  const ys=[cw,hw,sm,sp].map(x=>x?x.y:null);
  const band=(a,b)=>[a,b];
  const b={cw:cw&&band(hy+5,hw?(cw.y+hw.y)/2:(sm?(cw.y+sm.y)/2:bottom)),
           hw:hw&&band(cw?(cw.y+hw.y)/2:hy+5,sm?(hw.y+sm.y)/2:(sp?(hw.y+sp.y)/2:bottom)),
           sm:sm&&band(hw?(hw.y+sm.y)/2:hy+5,sp?(sm.y+sp.y)/2:bottom),
           sp:sp&&band(sm?(sm.y+sp.y)/2:hy+5,bottom)};
  const inB=(i,k)=>b[k]&&i.y>=b[k][0]&&i.y<b[k][1]&&i.x>=cut-2&&![cw,hw,sm,sp].includes(i);
  const nearestDay=i=>{let best=-1,bd=1e9;centers.forEach((c,k)=>{if(c!=null&&Math.abs(cx(i)-c)<bd){bd=Math.abs(cx(i)-c);best=k}});return best};
  const days=names.map(()=>({cw:[],hw:[]}));
  items.forEach(i=>{for(const k of['cw','hw'])if(inB(i,k)){const d=nearestDay(i);if(d>=0)days[d][k].push(i)}});
  const clean=s=>s.replace(/\s*[-–]\s*[-–]\s*/g,' — ').replace(/\s*–\s*/g,' — ').replace(/\s+/g,' ').trim();
  const outDays=days.map(d=>{
    const cwL=lines(d.cw).map(l=>clean(l.text)).filter(Boolean);let h=clean(cellText(d.hw,' — '));
    if(/^p\.?\s*:?\s*\d+$/i.test(h)&&cwL.length>1&&!/\d/.test(cwL.at(-1)))h=cwL.pop()+' '+h;
    return{lesson:cwL.join(' — '),homework:h};
  });
  const smL=lines(items.filter(i=>inB(i,'sm'))).map(l=>clean(l.text)).filter(Boolean);
  const spT=clean(cellText(items.filter(i=>inB(i,'sp'))));
  let spelling=[],spellingBook='';
  const pm=spT.match(/^(.*?)\(([^)]*)\)?/);
  if(pm){spellingBook=pm[1].trim();spelling=pm[2].split(/\s*[—,،]\s*/).map(s=>s.replace(/[()]/g,'').trim()).filter(Boolean)}
  else if(spT)spelling=spT.split(/\s*[—,،]\s*/).filter(Boolean);
  let question='',vocab='';
  if(qh){const hs=[qh,vh,bh].filter(Boolean);const vals={};
    const vl=items.filter(i=>i.y>qh.y+5&&i.y<qh.y+70);
    const groups=[];vl.slice().sort((a,b)=>Math.abs(a.y-b.y)>4?a.y-b.y:a.x-b.x).forEach(i=>{const g=groups.at(-1);if(g&&Math.abs(g.y-i.y)<=4&&i.x-g.r<10){g.items.push(i);g.r=Math.max(g.r,i.x+i.w)}else groups.push({y:i.y,l:i.x,r:i.x+i.w,items:[i]})});
    groups.forEach(g=>{const c=(g.l+g.r)/2;let best=0,bd=1e9;hs.forEach((h,k)=>{const d=Math.abs(c-cx(h));if(d<bd){bd=d;best=k}});(vals[best]=vals[best]||[]).push(...g.items)});
    question=clean(cellText(vals[0]||[]));if(vh)vocab=clean(cellText(vals[1]||[]));}
  const all=lines(items).map(l=>l.text).join('\n');
  const ds=[...all.matchAll(/(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})/g)];
  const from=ds[0]?ds[0][3]+'-'+ds[0][2].padStart(2,'0')+'-'+ds[0][1].padStart(2,'0'):'';
  const wk=all.match(/Week\s*:?\s*\(?\s*(\d+)/i),gr=all.match(/Grade\s*:?\s*(\d+)/i);
  return{days:outDays,scienceMath:smL,spelling,spellingBook,question,vocab,from,week:wk?+wk[1]:0,grade:gr?gr[1]:''};
}

const GRADE_WORDS=['الأول','الثاني','الثالث','الرابع','الخامس','السادس'];
function gradeNum(t){t=String(t||'');const d=t.match(/\d+/);if(d)return +d[0];const i=GRADE_WORDS.findIndex(w=>t.includes(w));return i>=0?i+1:0}
function detectKid(P,ar,en){
  const g=gradeNum(ar&&ar.grade)||gradeNum(en&&en.grade)||gradeNum(P.grade);P.gradeNo=g;
  const k=g&&S.kids.find(k=>+k.grade===g);
  if(k){P.kid=k.id;P.detected=true}else{P.kid=(S.gradeKid&&S.gradeKid[P.grade])||S.kids[0].id;P.detected=false}
}
const HOL_RE=/إجاز|اجاز|عطلة|عطله|holiday|vacation|day\s*off|no school/i;
function isEng(s){return /^(e|english|eng|انجليزي|إنجليزي|الإنجليزية|اللغة الإنجليزية)$/i.test(String(s).trim())}
function buildPending(ar,en,warn){
  let start=(en&&en.from)||(ar&&ar.date)||'';
  if(!start)warn.push('لم أجد تاريخ الأسبوع في الملفات — اختره بنفسك بالأسفل.');
  start=start?sundayOf(start):sundayOf(todayKey());
  let days;
  if(ar){
    days=ar.days.map(d=>{const ed=en&&en.days[d.offset];if(!d.holiday&&ed&&HOL_RE.test(ed.lesson+' '+ed.homework)&&d.periods.every(p=>isEmptyCell(p.lesson)||/منفصلة/.test(p.lesson))&&d.periods.every(p=>isEmptyCell(p.homework))){d.holiday=true;d.note=d.note||ed.lesson}return d}).map(d=>({offset:d.offset,note:d.note,holiday:!!d.holiday,periods:d.holiday?d.periods.map(p=>({n:p.n,subject:isEng(p.subject)?'English':p.subject,lesson:'',homework:''})):d.periods.map(p=>{
      const q={n:p.n,subject:p.subject,lesson:isEmptyCell(p.lesson)?'':p.lesson,homework:isEmptyCell(p.homework)?'':p.homework};
      if(/^(science|math)$/i.test(q.subject.trim()))q.subject=q.subject.trim()[0].toUpperCase()+q.subject.trim().slice(1).toLowerCase();
      if(isEng(q.subject)){q.subject='English';const e=en&&en.days[d.offset];
        if(e){q.lesson=e.lesson;q.homework=e.homework}else if(/منفصلة/.test(q.lesson))q.lesson='الخطة الإنجليزية'}
      else if(/^(science|math)$/i.test(q.subject.trim())&&/منفصلة/.test(q.lesson)){
        const l=en&&en.scienceMath.find(x=>x.toLowerCase().startsWith(q.subject.trim().toLowerCase()));
        q.lesson=l?l.replace(/^\w+\s*—\s*/,''):'';q.homework=q.homework||''}
      if(/quiz|إملاء|املاء/i.test(q.lesson+' '+q.homework))q.test=true;
      return q})}));
    if(!en&&ar.days.some(d=>d.periods.some(p=>isEng(p.subject))))warn.push('لم تُضف الخطة الإنجليزية — حصص English ستبقى بدون تفاصيل. أفلت الملفين معاً.');
  }else{
    days=en.days.map((e,k)=>HOL_RE.test(e.lesson+' '+e.homework)?{offset:k,note:e.lesson,holiday:true,periods:[]}:({offset:k,note:'',periods:(e.lesson||e.homework)?[{n:1,subject:'English',lesson:e.lesson,homework:e.homework,test:/quiz|إملاء|املاء/i.test(e.lesson)}]:[]}));
    warn.push('هذه الخطة الإنجليزية فقط. لإضافة باقي المواد أفلت الخطة العربية معها.');
  }
  const week=(ar&&ar.week)||(en&&en.week)||0;
  return{start,week,weekLabel:ar&&ar.weekWord?'الأسبوع '+ar.weekWord:(week?'الأسبوع '+week:''),
    grade:(ar&&ar.grade)||(en&&en.grade?'الصف '+en.grade:''),classTeacher:ar?ar.classTeacher:'',weekValue:ar?ar.weekValue:'',school:ar?ar.school:'',
    extras:{spelling:en?en.spelling:[],spellingBook:en?en.spellingBook:'',questionOfWeek:en?en.question:'',newVocab:en?en.vocab:'',scienceMath:en?en.scienceMath:[]},
    days,warnings:warn};
}

async function handleFiles(list,attach){
  const files=[...list];if(!files.length)return;
  if(!parentOK){STASH=files;return askPin()}
  toast('⏳ جاري قراءة '+(files.length>1?files.length+' ملفات':'الخطة')+'...');
  const warn=[],parsed=[],examsParsed=[];
  for(const f of files){
    try{
      if(/\.json$/i.test(f.name)){const r=parsePlan(await readFile(f));if(r.error)warn.push(f.name+': '+r.error);else parsed.push({json:r.plan,start:sundayOf(r.plan.from)});continue}
      if(!/\.pdf$/i.test(f.name)){warn.push('تم تجاهل '+f.name+' (ليس PDF)');continue}
      const buf=new Uint8Array(await f.arrayBuffer());const it=await pdfItems(buf.slice());
      const xs=parseExams(it);if(xs){try{const pages=await pdfPages(buf.slice());pages.slice(1).forEach(pi=>{const m=parseExams(pi);if(m)xs.exams.push(...m.exams)})}catch(e){}examsParsed.push(xs);continue}
      const a=parseArabic(it);if(a){parsed.push({ar:a,start:a.date?sundayOf(a.date):'',g:gradeNum(a.grade),wk:a.week,name:f.name,pdf:buf});continue}
      const e=parseEnglish(it);if(e){parsed.push({en:e,start:e.from?sundayOf(e.from):'',g:gradeNum(e.grade),wk:e.week,name:f.name,pdf:buf});continue}
      warn.push('لم أتعرف على شكل الملف: '+f.name);
    }catch(e){warn.push('تعذّرت قراءة '+f.name+': '+(e.message||e))}
  }
  // group into weeks: same grade + same start date (or same week number)
  const groups=[];
  for(const x of parsed){
    if(x.json){groups.push({json:x.json,start:x.start});continue}
    const k=x.ar?'ar':'en';
    let g=groups.find(g=>!g.json&&!g[k]&&(!g.g||!x.g||g.g===x.g)&&((x.start&&g.start&&x.start===g.start)||(!(x.start&&g.start)&&x.wk&&g.wk===x.wk)));
    if(!g){g={g:x.g,wk:x.wk,start:x.start};groups.push(g)}
    g[k]=x[k];g.start=g.start||x.start;g.wk=g.wk||x.wk;g.g=g.g||x.g;if(x.pdf)g[k+'Pdf']={lang:k,name:x.name,buf:x.pdf};
  }
  if(attach){
    // attach the original PDFs to weeks that are already saved, without re-reviewing them
    let n=0;const miss=[];
    for(const g of groups){if(g.json)continue;const T={grade:''};detectKid(T,g.ar,g.en);const pdfs=[g.arPdf,g.enPdf].filter(Boolean),names=pdfs.map(p=>p.name).join('، ');
      const plan=T.detected&&g.start&&plansOf(T.kid).find(p=>sundayOf(p.from)===g.start);
      if(!plan){miss.push(names);continue}
      try{await attachPdfs(T.kid,plan,pdfs);n+=pdfs.length}catch(e){miss.push(names+' ('+(e.message||e)+')')}}
    save();render();
    if(miss.length||warn.length)return showErr((n?'✅ تم إرفاق '+n+' ملف.\n\n':'')+(miss.length?'لم أجد أسبوعاً محفوظاً يطابق:\n'+miss.join('\n'):'')+(warn.length?'\n'+warn.join('\n'):''));
    return toast('📎 تم إرفاق '+n+' ملف');
  }
  if(!groups.length&&!examsParsed.length)return showErr(warn.join('\n')||'لم يتم العثور على خطة في الملفات.');
  groups.sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  QUEUE=groups.map((g,i)=>{
    let P;const w=i===0?warn.slice():[];
    if(g.json){const j=g.json;P={start:g.start,week:j.week||0,weekLabel:j.weekLabel||'',grade:j.grade||'',classTeacher:j.classTeacher||'',weekValue:j.weekValue||'',school:j.school||'',extras:j.extras||{},
      days:j.days.map(d=>({offset:Math.round((pd(d.date)-pd(g.start))/864e5),note:d.note||'',holiday:!!d.holiday,periods:d.periods})),warnings:w}}
    else P=buildPending(g.ar||null,g.en||null,w);
    detectKid(P,g.ar,g.en);P.pdfs=[g.arPdf,g.enPdf].filter(Boolean);return P;
  });
  examsParsed.forEach(x=>QUEUE.push(examPending(x)));
  QTOTAL=QUEUE.length;nextReview();
}

function drawReview(){
  const P=PENDING,inp=(id,v,extra='')=>`<input id="${id}" value="${esc(v)}" dir="auto" ${extra}>`;
  let h=`<div class="overlay"><div class="modal big"><div class="kidhead"><h3>📋 راجع الخطة قبل الحفظ${QTOTAL>1?` <span class="hint">(${QTOTAL-QUEUE.length} من ${QTOTAL})</span>`:''}</h3><div class="sp"></div>${QUEUE.length?'<button class="btn" data-act="skipPlan">تخطي</button>':''}<button class="btn" data-act="cancelAll">إلغاء${QTOTAL>1?' الكل':''}</button><button class="btn primary" data-act="savePlan">💾 حفظ الخطة</button></div>`;
  if(P.warnings.length)h+=`<div class="note" style="margin:0">${P.warnings.map(esc).join('<br>')}</div>`;
  const dk_=kidById(P.kid);
  h+=P.detected?`<div class="bravo" style="margin:0">✅ تم التعرف تلقائياً: الخطة لـ <b>${dk_.emoji} ${esc(dk_.name)}</b> (الصف ${GRADE_WORDS[P.gradeNo-1]||P.gradeNo})</div>`
    :`<div class="note" style="margin:0">⚠️ لم أستطع تحديد الطفل من الصف${P.gradeNo?' ('+P.gradeNo+')':''} — اختره بنفسك. يمكنك ضبط صف كل طفل من الإعدادات.</div>`;
  h+=`<p class="hint" style="margin:0">قرأتُ الخطة من الملف. تأكد من الكلمات وصحّح أي خطأ مباشرة في الخانات.</p>
  <div class="row"><label>لأي طفل؟<select id="rv_kid">${S.kids.map(k=>`<option value="${k.id}" ${k.id===P.kid?'selected':''}>${k.emoji} ${esc(k.name)}</option>`).join('')}</select></label>
  <label>بداية الأسبوع (الأحد)<input type="date" id="rv_start" value="${P.start}"></label>
  <label>الأسبوع${inp('rv_label',P.weekLabel)}</label><label>الصف${inp('rv_grade',P.grade)}</label><label>قيمة الأسبوع${inp('rv_value',P.weekValue)}</label></div>`;
  P.days.forEach((d,di)=>{
    h+=`<div class="rvday"><div class="rvhead"><b>${DAYS[d.offset]||('يوم '+(di+1))}</b><span class="hint">${fmt(addDays(P.start,d.offset))}</span><label class="sp">${inp('rv_note_'+di,d.note,'placeholder="ملاحظة اليوم (اختياري)" style="width:100%"')}</label><label class="holchk"><input type="checkbox" id="rv_hol_${di}" ${d.holiday?'checked':''}> 🏖️ إجازة</label></div>
    <table class="rv"><tr><th>#</th><th>المادة</th><th>موضوع الدرس</th><th>الواجب</th><th>اختبار</th><th></th></tr>
    ${d.periods.map((p,pi)=>`<tr><td><input id="rv_${di}_${pi}_n" value="${p.n}" style="width:44px;text-align:center"></td><td>${inp(`rv_${di}_${pi}_s`,p.subject)}</td><td>${inp(`rv_${di}_${pi}_l`,p.lesson)}</td><td>${inp(`rv_${di}_${pi}_h`,p.homework)}</td><td style="text-align:center"><input type="checkbox" id="rv_${di}_${pi}_t" ${p.test?'checked':''}></td><td><button class="btn sm danger" data-act="delRow" data-d="${di}" data-p="${pi}">✕</button></td></tr>`).join('')}
    </table><button class="btn sm" data-act="addRow" data-d="${di}">+ حصة</button></div>`});
  const e=P.extras||{};
  h+=`<div class="rvday"><div class="rvhead"><b>🌟 إضافات الأسبوع</b></div>
   <div class="row"><label style="flex:1">كلمات الإملاء (افصل بفاصلة)${inp('rv_spell',(e.spelling||[]).join(', '),'style="width:100%"')}</label></div>
   <div class="row"><label style="flex:1">سؤال الأسبوع${inp('rv_q',e.questionOfWeek||'','style="width:100%"')}</label><label style="flex:1">مفردات جديدة${inp('rv_v',e.newVocab||'','style="width:100%"')}</label></div>
   <div class="row"><label style="flex:1">Science & Math (سطر لكل مادة)<textarea id="rv_sm" rows="2" dir="ltr">${esc((e.scienceMath||[]).join('\n'))}</textarea></label></div></div>
  <div class="mrow"><button class="btn" data-act="cancelAll">إلغاء${QTOTAL>1?' الكل':''}</button><button class="btn primary" data-act="savePlan">💾 حفظ ${QUEUE.length?'والانتقال للتالي ←':'الخطة'}</button></div></div></div>`;
  document.getElementById('layer').innerHTML=h;
}
function collectReview(){
  const P=PENDING,v=id=>{const e=document.getElementById(id);return e?e.value.trim():''};
  P.kid=v('rv_kid');P.start=v('rv_start')||P.start;P.weekLabel=v('rv_label');P.grade=v('rv_grade');P.weekValue=v('rv_value');
  P.days.forEach((d,di)=>{d.note=v('rv_note_'+di);d.holiday=!!document.getElementById('rv_hol_'+di)?.checked;d.periods.forEach((p,pi)=>{const k=`rv_${di}_${pi}_`;p.n=+v(k+'n')||pi+1;p.subject=v(k+'s');p.lesson=v(k+'l');p.homework=v(k+'h');p.test=!!document.getElementById(k+'t')?.checked})});
  P.extras=Object.assign(P.extras||{},{spelling:v('rv_spell').split(/\s*[,،]\s*/).filter(Boolean),questionOfWeek:v('rv_q'),newVocab:v('rv_v'),scienceMath:v('rv_sm').split('\n').map(s=>s.trim()).filter(Boolean)});
}
function saveReview(){
  collectReview();const P=PENDING;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(P.start))return toast('اختر تاريخ بداية الأسبوع');
  const start=sundayOf(P.start);
  const days=P.days.slice().sort((a,b)=>a.offset-b.offset).map(d=>({date:addDays(start,d.offset),note:d.note||(d.holiday?'إجازة':undefined),holiday:d.holiday||undefined,periods:d.holiday?d.periods.filter(p=>p.subject).map(p=>({n:p.n,subject:p.subject,lesson:'',homework:''})):d.periods.filter(p=>p.subject||p.lesson||p.homework).map(p=>{const q={n:p.n,subject:p.subject,lesson:p.lesson,homework:p.homework};if(p.test)q.test=true;return q})}));
  const plan={format:'kids-dashboard-week',version:1,school:P.school||'',grade:P.grade,classTeacher:P.classTeacher||'',week:P.week||0,weekLabel:P.weekLabel,from:days[0].date,to:days.at(-1).date,weekValue:P.weekValue,extras:P.extras,days};
  plan.days.forEach(d=>{fixHolidayDay(d);fixExamPeriods(d)});
  const old=(S.plans[P.kid]||[]).find(x=>x.from===plan.from);if(old&&old.pdfs)plan.pdfs=old.pdfs.slice();
  S.plans[P.kid]=(S.plans[P.kid]||[]).filter(x=>x.from!==plan.from);S.plans[P.kid].push(plan);
  S.gradeKid=S.gradeKid||{};if(plan.grade)S.gradeKid[plan.grade]=P.kid;save();
  if(P.pdfs&&P.pdfs.length)attachPdfs(P.kid,plan,P.pdfs).then(save).catch(e=>{console.error(e);toast('⚠️ تعذّر حفظ ملف PDF الأصلي')});
  closeModal();PENDING=null;QSAVED++;toast('✅ تم حفظ '+(plan.weekLabel||'الخطة')+' لـ '+kidById(P.kid).name);render();nextReview();
}

/* ================= official exam schedule ================= */
function parseExams(items){
  const F=re=>items.find(i=>re.test(fixAr(i.s)));
  const hDate=F(/^التاريخ$/),hSub=F(/^المادة$/),hType=F(/نوع/),hPart=F(/الجزء المقرر|المقرر/);
  const title=lines(items.filter(i=>i.y<(hDate?hDate.y:0))).map(l=>l.text).find(t=>/جدول\s*اختبارات|اختبارات/.test(t));
  if(!hDate||!hSub||!title)return null;
  const C={date:cx(hDate),sub:cx(hSub),type:hType?cx(hType):cx(hSub)-100,part:hPart?cx(hPart):60};
  const instr=items.find(i=>/تعليمات/.test(fixAr(i.s))),bottom=instr?instr.y-4:1e9,top=hDate.y+(hPart?20:8);
  const inDate=i=>Math.abs(cx(i)-C.date)<45;
  const years=items.filter(i=>i.y>top&&i.y<bottom&&inDate(i)&&/^\d{4}$/.test(fixAr(i.s).replace(/م$/,''))).sort((a,b)=>a.y-b.y);
  if(!years.length)return null;
  const rows=years.map(yi=>{
    const same=items.filter(i=>Math.abs(i.y-yi.y)<=4&&inDate(i)&&/^\d{1,2}$/.test(fixAr(i.s))).sort((a,b)=>b.x-a.x);
    const dd=same[0]?fixAr(same[0].s):'',mm=same[1]?fixAr(same[1].s):'';
    const date=dd&&mm?fixAr(yi.s).replace(/م$/,'')+'-'+mm.padStart(2,'0')+'-'+dd.padStart(2,'0'):'';
    const near=(c,tol)=>items.filter(i=>Math.abs(cx(i)-c)<tol&&i.y>top&&i.y<bottom);
    const subI=near(C.sub,60).filter(i=>Math.abs(i.y-yi.y)<=6);
    const typI=near(C.type,35).sort((a,b)=>Math.abs(a.y-yi.y)-Math.abs(b.y-yi.y))[0];
    return{y:yi.y,date,subject:fixAr(joinItems(subI)),type:typI&&Math.abs(typI.y-yi.y)<40?fixAr(typI.s):'',lines:[]};
  });
  const cut=(C.type+C.part)/2;
  const pi=items.filter(i=>cx(i)<cut&&i.y>top&&i.y<bottom);
  const L=[];pi.slice().sort((a,b)=>a.y-b.y).forEach(i=>{const l=L.find(l=>Math.abs(l.y-i.y)<=4);l?l.items.push(i):L.push({y:i.y,items:[i]})});
  const isNum=i=>/^\d+$/.test(fixAr(i.s));
  const plain=l=>l.items.filter(isNum).length===2&&l.items.every(i=>isNum(i)||/^(إلى|الى|من)$/.test(fixAr(i.s)));
  const aligned=l=>rows.find(r=>Math.abs(r.y-l.y)<=4);
  const closed=new Set();L.forEach(l=>{const r=aligned(l);if(r&&plain(l))closed.add(r)});
  L.forEach(l=>{let r=aligned(l);if(!r){const open=rows.filter(r=>!closed.has(r));r=(open.length?open:rows).slice().sort((a,b)=>Math.abs(a.y-l.y)-Math.abs(b.y-l.y))[0]}r.lines.push(l)});
  const exams=rows.map(r=>{
    const parts=[];let book='';
    r.lines.sort((a,b)=>a.y-b.y).forEach(l=>{
      const latin=!l.items.some(i=>AR_RE.test(i.s))&&l.items.some(i=>/[A-Za-z]/.test(i.s));
      if(latin){const t=l.items.slice().sort((a,b)=>a.x-b.x).map(i=>fixAr(i.s)).join(' ').replace(/\s+/g,' ').trim();
        const m=t.match(/([A-Za-z]+)\s*:?\s*from\s*(\d+)\s*to\s*(\d+)/i);
        if(m)parts.push((book?book+' — ':'')+m[1].toUpperCase()+': '+m[2]+' – '+m[3]);else if(!/\d/.test(t))book=t.replace(/\s*:\s*$/,'').trim();else parts.push(t);return}
      const nums=l.items.filter(isNum).sort((a,b)=>b.x-a.x).map(i=>+fixAr(i.s));
      const label=fixAr(joinItems(l.items.filter(i=>!isNum(i)&&!/^(إلى|الى|من)$/.test(fixAr(i.s))))).replace(/[:،]$/,'').trim();
      if(nums.length>=2)parts.push((label?label+': ':'')+'ص '+nums[0]+' – '+nums[1]);
      else if(label||nums.length)parts.push([label,...nums].filter(Boolean).join(' '));
    });
    if(book&&!parts.some(x=>x.startsWith(book)))parts.unshift(book);
    return{date:r.date,subject:r.subject,type:r.type,parts};
  });
  let instructions=[];
  if(instr){const ii=items.filter(i=>i.y>instr.y+4&&i.x+i.w>300&&!/^[\d.]+$/.test(i.s.trim())&&!/مدير/.test(fixAr(i.s)));instructions=lines(ii).map(l=>l.text.replace(/^[\d.\s]+/,'').trim()).filter(t=>t.length>8&&AR_RE.test(t)&&!/@|www|P\.?O\.? ?Box/i.test(t))}
  const gl=lines(items.filter(i=>i.y<hDate.y)).map(l=>l.text).find(t=>/الصف/.test(t))||'';
  const short=title.replace(/^جدول\s*/,'').replace(/\s*للعام.*$/,'').trim();
  return{kind:'exam',title:short||title,fullTitle:title,grade:gl.trim(),exams,instructions};
}
const EXAM_PERIODS=['الفترة الأولى','الفترة الثانية','الفترة الثالثة','الاختبارات النهائية'];
function guessPeriod(t){t=String(t||'');if(/نهائي|النهائية|نهاية الفصل/.test(t))return'الاختبارات النهائية';if(/الفترة\s*الثانية/.test(t))return'الفترة الثانية';if(/الفترة\s*الثالثة/.test(t))return'الفترة الثالثة';if(/الفترة\s*الأولى/.test(t))return'الفترة الأولى';return''}
function examPending(x){x.period=guessPeriod(x.fullTitle||x.title);const g=gradeNum(x.grade),k=g&&S.kids.find(k=>+k.grade===g);return Object.assign(x,{gradeNo:g,kid:k?k.id:S.kids[0].id,detected:!!k})}
function drawExamReview(){
  const P=PENDING,inp=(id,v,extra='')=>`<input id="${id}" value="${esc(v)}" dir="auto" ${extra}>`,k=kidById(P.kid);
  let h=`<div class="overlay"><div class="modal big"><div class="kidhead"><h3>📝 راجع جدول الاختبارات${QTOTAL>1?` <span class="hint">(${QTOTAL-QUEUE.length} من ${QTOTAL})</span>`:''}</h3><div class="sp"></div>${QUEUE.length?'<button class="btn" data-act="skipPlan">تخطي</button>':''}<button class="btn" data-act="cancelAll">إلغاء</button><button class="btn primary" data-act="saveExam">💾 حفظ الجدول</button></div>
  ${P.detected?`<div class="bravo" style="margin:0">✅ تم التعرف تلقائياً: الجدول لـ <b>${k.emoji} ${esc(k.name)}</b> (الصف ${GRADE_WORDS[P.gradeNo-1]||P.gradeNo})</div>`:`<div class="note" style="margin:0">⚠️ لم أستطع تحديد الطفل — اختره بنفسك.</div>`}
  <div class="row"><label>لأي طفل؟<select id="xv_kid">${S.kids.map(x=>`<option value="${x.id}" ${x.id===P.kid?'selected':''}>${x.emoji} ${esc(x.name)}</option>`).join('')}</select></label><label>نوع الجدول<select id="xv_period">${[...EXAM_PERIODS,''].map(o=>`<option value="${o}" ${o===P.period?'selected':''}>${o||'أخرى'}</option>`).join('')}</select></label><label style="flex:1">العنوان${inp('xv_title',P.title,'style="width:100%"')}</label></div>
  <table class="rv"><tr><th>التاريخ</th><th>المادة</th><th>النوع</th><th>الجزء المقرر (افصل بـ | )</th><th></th></tr>
  ${P.exams.map((e,i)=>`<tr><td><input type="date" id="xv_${i}_d" value="${e.date}"></td><td>${inp(`xv_${i}_s`,e.subject)}</td><td style="width:90px">${inp(`xv_${i}_t`,e.type)}</td><td style="width:45%">${inp(`xv_${i}_p`,e.parts.join(' | '))}</td><td><button class="btn sm danger" data-act="delExamRow" data-i="${i}">✕</button></td></tr>`).join('')}
  </table><button class="btn sm" data-act="addExamRow">+ اختبار</button>
  ${P.instructions.length?`<details><summary class="hint">تعليمات عامة (${P.instructions.length})</summary><ul>${P.instructions.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`:''}
  </div></div>`;
  document.getElementById('layer').innerHTML=h;
}
function collectExam(){const P=PENDING,v=id=>{const e=document.getElementById(id);return e?e.value.trim():''};P.kid=v('xv_kid');P.title=v('xv_title');P.period=v('xv_period');
  P.exams.forEach((e,i)=>{e.date=v(`xv_${i}_d`);e.subject=v(`xv_${i}_s`);e.type=v(`xv_${i}_t`);e.parts=v(`xv_${i}_p`).split('|').map(s=>s.trim()).filter(Boolean)})}
function saveExamReview(){
  collectExam();const P=PENDING,ex=P.exams.filter(e=>e.subject&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)).sort((a,b)=>a.date.localeCompare(b.date));
  if(!ex.length)return toast('لا توجد اختبارات بتاريخ صحيح');
  const same=(S.examSets||[]).find(s=>s.kid===P.kid&&(s.period||s.title)===(P.period||P.title)&&s.title===P.title);
  if(same&&!confirm('يوجد جدول بنفس الاسم لـ '+kidById(P.kid).name+'. استبداله؟ (الدرجات تبقى)'))return;
  S.examSets=(S.examSets||[]).filter(s=>s!==same);
  S.examSets.push({id:Date.now().toString(36),kid:P.kid,period:P.period,title:P.title,grade:P.grade,instructions:P.instructions,exams:ex});save();
  closeModal();PENDING=null;QSAVED++;toast('✅ تم حفظ جدول الاختبارات لـ '+kidById(P.kid).name);render();nextReview();
}
const examKey=(kid,e,set)=>`ex|${kid}|${set&&set.id||''}|${e.date}|${subjectKey(e.subject)}`;
function kidExams(kid){const out=[];(S.examSets||[]).filter(s=>s.kid===kid).forEach(s=>s.exams.forEach(e=>out.push(Object.assign({set:s,key:examKey(kid,e,s)},e))));return out.sort((a,b)=>a.date.localeCompare(b.date))}
function officialFor(kid,date,subj){return kidExams(kid).find(e=>e.date===date&&subjectKey(e.subject)===subjectKey(subj))}
function isExamP(kid,date,p){return !!(p.test||officialFor(kid,date,p.subject))}
function planTests(kid){const out=[];allDays(kid).forEach(({plan,day})=>day.periods.forEach(p=>{if(p.test&&!officialFor(kid,day.date,p.subject))out.push({date:day.date,subject:p.subject,title:p.lesson,key:`${kid}|${day.date}|p${p.n}`,spell:testWords(plan,p)})}));return out}
const daysTo=d=>Math.round((pd(d)-pd(todayKey()))/864e5);
function whenTxt(d){const n=daysTo(d);return n===0?'اليوم':n===1?'غداً':n===2?'بعد غد':n>2?(n<=10?'بعد '+n+' أيام':'بعد '+n+' يوماً'):'انتهى'}
function rating(p){return p>=90?['ممتاز 🌟','#16a34a']:p>=80?['جيد جداً 👍','#2563eb']:p>=65?['جيد','#d97706']:['يحتاج مراجعة','#dc2626']}
function gradeBlock(key,subj,date){
  const g=(S.grades||{})[key],past=date<=todayKey();
  if(parentOK)return`<div class="gform"><input type="number" min="0" step="0.5" data-gs="${esc(key)}" value="${g?g.s:''}" placeholder="الدرجة"><span>/</span><input type="number" min="1" step="0.5" data-gm="${esc(key)}" value="${g?g.m:(S.lastMax||{})[subjectKey(subj)]||''}" placeholder="من"><button class="btn sm primary" data-act="saveGrade" data-key="${esc(key)}" data-subj2="${esc(subjectKey(subj))}">حفظ</button></div>${g?gradeShow(g):''}`;
  if(g)return gradeShow(g);
  return past?`<button class="btn sm" data-act="pinHere">🔒 إضافة الدرجة</button>`:'';
}
function gradeShow(g){const pc=Math.round(g.s/g.m*100),[t,c]=rating(pc);return`<div class="gshow" style="--g:${c}"><b>${g.s}<small>/${g.m}</small></b><span>${pc}% · ${t}</span></div>`}
function kidAverage(kid,set){const ks=kidExams(kid).filter(e=>!set||e.set===set).map(e=>e.key),gs=ks.map(k=>(S.grades||{})[k]).filter(Boolean);return gs.length?{avg:Math.round(gs.reduce((a,g)=>a+g.s/g.m,0)/gs.length*100),n:gs.length}:null}
function upcomingExams(kid,from,days){return kidExams(kid).filter(e=>{const n=Math.round((pd(e.date)-pd(from))/864e5);return n>=0&&n<=days})}
function renderExams(k){
  const ex=kidExams(k.id),t=todayKey();
  if(!ex.length)return`<div class="card empty" style="margin-top:20px">لا توجد اختبارات بعد.<br>أفلت ملف <b>جدول الاختبارات (PDF)</b> في وضع ولي الأمر 🔒</div>`;
  const next=ex.find(e=>e.date>=t),avg=kidAverage(k.id);
  let h=`<div class="xstats">${next?`<div class="xnext" style="--c:${subjColor(next.subject)}"><small>الاختبار القادم</small><b>${subjIcon(next.subject)} ${esc(next.subject)}</b><span>${dayName(next.date)} ${fmt(next.date)} · <b>${whenTxt(next.date)}</b></span></div>`:'<div class="xnext"><small>الاختبار القادم</small><b>لا يوجد 🎉</b></div>'}
  <div class="xavg">${avg?`<small>معدل الدرجات</small><b style="color:${rating(avg.avg)[1]}">${avg.avg}%</b><span>${rating(avg.avg)[0]} · ${avg.n} ${avg.n===1?'درجة':'درجات'}</span>`:`<small>معدل الدرجات</small><b>—</b><span>${parentOK?'أدخل الدرجات بالأسفل':'لم تُضف درجات بعد'}</span>`}</div></div>`;
  if(!parentOK)h+=`<div class="hint" style="margin:-6px 0 12px">لإضافة الدرجات: <button class="btn sm" data-act="pinHere">🔒 وضع ولي الأمر</button></div>`;
  const sets=(S.examSets||[]).filter(s=>s.kid===k.id).slice().sort((a,b)=>(b.exams[0]?.date||'').localeCompare(a.exams[0]?.date||''));
  sets.forEach(s=>{
    h+=`<div class="card"><div class="kidhead" style="margin-bottom:10px"><h3 style="margin:0">📝 ${esc(s.period||s.title)}</h3>${s.period&&s.period!==s.title?`<span class="hint">${esc(s.title)}</span>`:''}<div class="sp"></div>${(()=>{const a=kidAverage(k.id,s);return a?`<span class="setavg" style="--g:${rating(a.avg)[1]}">المعدل ${a.avg}%</span>`:''})()}${parentOK?`<button class="btn sm danger" data-act="delExamSet" data-id="${s.id}">حذف الجدول</button>`:''}</div><div class="xlist">`;
    s.exams.forEach(e=>{const key=examKey(k.id,e,s),n=daysTo(e.date),c=subjColor(e.subject);
      h+=`<div class="xcard ${n<0?'past':n===0?'now':''}" style="--c:${c}"><div class="xdate"><b>${pd(e.date).getDate()}</b><span>${dayName(e.date)}</span><small>${fmt(e.date,{month:'long'})}</small></div>
      <div class="xbody"><div class="xtitle"><span class="sumic">${subjIcon(e.subject)}</span><b class="subjlink" data-subj="${esc(subjectKey(e.subject))}" dir="auto">${esc(e.subject)}</b>${e.type?`<span class="xtype ${/تكوين/.test(e.type)?'f':''}">${esc(e.type)}</span>`:''}<span class="xwhen">${whenTxt(e.date)}</span></div>
      ${e.parts.length?`<div class="xparts">${e.parts.map(p=>`<span dir="auto">${esc(p)}</span>`).join('')}</div>`:''}</div>
      <div class="xgrade">${gradeBlock(key,e.subject,e.date)}</div></div>`});
    h+=`</div>${s.instructions&&s.instructions.length?`<details class="xins"><summary>📋 تعليمات عامة</summary><ol>${s.instructions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>`:''}</div>`;
  });
  return h;
}

const readFile=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(f,'utf-8')});
function burst(x,y,pts){
  const cols=['⭐','✨','🌟','💫'];
  for(let i=0;i<10;i++){const s=document.createElement('span');s.className='spark';s.textContent=cols[i%4];
    const a=Math.PI*2*i/10,r=60+Math.random()*30;s.style.left=x+'px';s.style.top=y+'px';s.style.setProperty('--dx',Math.cos(a)*r+'px');s.style.setProperty('--dy',Math.sin(a)*r+'px');
    document.body.appendChild(s);setTimeout(()=>s.remove(),900)}
  const t=document.createElement('span');t.className='plus';t.textContent='+'+pts+' ⭐';t.style.left=x+'px';t.style.top=y+'px';document.body.appendChild(t);setTimeout(()=>t.remove(),1200);
}
function toggle(id,el){
  const was=!!S.done[id];if(was)delete S.done[id];else S.done[id]=true;save();
  const[kid,date]=id.split('|'),its=items(kid,date),it=its.find(i=>i.id===id);
  let x=innerWidth/2,y=innerHeight/2;if(el){const r=(el.querySelector('.check')||el).getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2}
  render();
  if(!was){burst(x,y,it?it.pts:1);if(its.length&&its.every(i=>i.done))setTimeout(celebrate,250)}
}

async function act(a,el){
  if(a.startsWith('book')&&typeof bookAct==='function')return bookAct(a,el);
  if(a==='askPin')return askPin();
  if(a==='checkPin')return checkPin();
  if(a==='closeModal')return closeModal();
  if(a==='parent'){V={name:'parent'};return render()}
  if(a==='tv'){try{document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}location.hash='tv';return}
  if(a==='tvExit'){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});history.replaceState(null,'',location.pathname+location.search);V={name:'home'};return render()}
  if(a==='lock'){parentOK=false;V={name:'home'};return render()}
  if(a==='pickPdf'){const i=document.getElementById('pdfFiles');i.value='';return i.click()}
  if(a==='savePlan')return saveReview();
  if(a==='skipPlan'){closeModal();return nextReview()}
  if(a==='saveExam')return saveExamReview();
  if(a==='addExamRow'){collectExam();PENDING.exams.push({date:'',subject:'',type:'',parts:[]});return drawExamReview()}
  if(a==='delExamRow'){collectExam();PENDING.exams.splice(+el.dataset.i,1);return drawExamReview()}
  if(a==='delExamSet'){if(!confirm('حذف جدول الاختبارات؟ (الدرجات المحفوظة تبقى)'))return;S.examSets=S.examSets.filter(s=>s.id!==el.dataset.id);save();return render()}
  if(a==='pinHere')return askPin(Object.assign({},V));
  if(a==='saveGrade'){const k=el.dataset.key,q=s=>[...document.querySelectorAll(s)].find(x=>x.dataset.gs===k||x.dataset.gm===k);
    const sv=q('[data-gs]').value.trim(),mv=q('[data-gm]').value.trim();S.grades=S.grades||{};
    if(sv===''){delete S.grades[k];save();toast('تم حذف الدرجة');return render()}
    const s=+sv,m=+mv;if(!(m>0))return toast('أدخل الدرجة الكاملة (من كم)');if(s<0||s>m)return toast('الدرجة يجب أن تكون بين 0 و '+m);
    S.grades[k]={s,m};S.lastMax=S.lastMax||{};S.lastMax[el.dataset.subj2]=m;save();render();
    const pc=s/m*100;if(pc>=90)celebrate();toast('✅ تم حفظ الدرجة: '+s+'/'+m);return}
  if(a==='cancelAll'){QUEUE=[];QTOTAL=0;QSAVED=0;PENDING=null;return closeModal()}
  if(a==='addRow'){collectReview();const d=PENDING.days[+el.dataset.d];d.periods.push({n:(d.periods.at(-1)?.n||0)+1,subject:'',lesson:'',homework:''});return drawReview()}
  if(a==='delRow'){collectReview();PENDING.days[+el.dataset.d].periods.splice(+el.dataset.p,1);return drawReview()}
  if(a==='viewPdf'){const p=planFor(V.kid,V.date),list=((p&&p.pdfs)||[]).slice().sort((x,y)=>x.lang==='ar'?-1:y.lang==='ar'?1:0);
    return viewPdf(list,Math.max(0,list.findIndex(x=>x.id===el.dataset.id)))}
  if(a==='pdfTab')return viewPdf(PDFV,+el.dataset.i);
  if(a==='printPdf')return printPdf();
  if(a==='pickAttach'){const i=document.getElementById('pdfAttach');i.value='';return i.click()}
  if(a==='delPlan'){if(!confirm('حذف هذه الخطة؟'))return;const k=el.dataset.kid2;((S.plans[k].find(x=>x.from===el.dataset.from)||{}).pdfs||[]).forEach(p=>dropPdf(p.id));S.plans[k]=S.plans[k].filter(x=>x.from!==el.dataset.from);save();return render()}
  if(a==='addTask'){
    const title=document.getElementById('tTitle').value.trim();if(!title)return toast('اكتب المهمة');
    const when=document.getElementById('tWhen').value,date=document.getElementById('tDate').value;
    S.tasks.push({id:Date.now().toString(36),title,kid:document.getElementById('tKid').value,date:when==='daily'?'daily':(date||todayKey()),points:+document.getElementById('tPts').value});
    save();toast('تمت الإضافة');return render();
  }
  if(a==='delTask'){S.tasks=S.tasks.filter(x=>x.id!==el.dataset.id);save();return render()}
  if(a==='saveSettings'){
    S.kids.forEach(k=>{k.name=document.getElementById('nm_'+k.id).value.trim()||k.name;k.emoji=document.getElementById('em_'+k.id).value.trim()||k.emoji;k.color=document.getElementById('cl_'+k.id).value;k.grade=+document.getElementById('gr_'+k.id).value;k.books=document.getElementById('bk_'+k.id).value.split(/\s*[,،]\s*/).filter(Boolean)});
    const np=document.getElementById('newPin').value.trim();if(np)S.pin=np;save();toast('تم الحفظ');return render();
  }
  if(a==='export'){
    const b=new Blob([JSON.stringify(S,null,1)],{type:'application/json'}),u=URL.createObjectURL(b),l=document.createElement('a');
    l.href=u;l.download='kids-dashboard-backup-'+todayKey()+'.json';l.click();setTimeout(()=>URL.revokeObjectURL(u),1000);return;
  }
  if(a==='import'){
    const f=document.getElementById('bkFile').files[0];if(!f)return toast('اختر ملف النسخة');
    try{const s=JSON.parse(await readFile(f));if(!s.kids||!s.plans)throw 0;if(!confirm('سيتم استبدال كل البيانات الحالية. متابعة؟'))return;S=Object.assign(defaults(),s);save();toast('تمت الاستعادة');render()}catch(e){toast('الملف غير صالح')}
  }
}

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-toggle],[data-subj],[data-nav],[data-kid],[data-date],[data-tab],[data-act]');if(!el)return;
  if(el.dataset.toggle)return toggle(el.dataset.toggle,el);
  if(el.dataset.subj!==undefined){V.tab='sum';V.subj=el.dataset.subj||null;scrollTo(0,0);return render()}
  if(el.dataset.act)return act(el.dataset.act,el);
  if(el.dataset.nav){V={name:'home'};return render()}
  if(el.dataset.kid){V={name:'kid',kid:el.dataset.kid,tab:V.kid===el.dataset.kid?V.tab:'today',date:null};return render()}
  if(el.dataset.tab){V.tab=el.dataset.tab;V.subj=null;return render()}
  if(el.dataset.date){V.date=el.dataset.date;return render()}
});

document.getElementById('pdfFiles').addEventListener('change',e=>handleFiles(e.target.files));
document.getElementById('pdfAttach').addEventListener('change',e=>handleFiles(e.target.files,true));
let dragN=0;
document.addEventListener('dragenter',e=>{e.preventDefault();if(++dragN===1)document.body.classList.add('dragging')});
document.addEventListener('dragleave',e=>{if(--dragN<=0){dragN=0;document.body.classList.remove('dragging')}});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',e=>{e.preventDefault();dragN=0;document.body.classList.remove('dragging');if(e.dataTransfer&&e.dataTransfer.files.length)handleFiles(e.dataTransfer.files)});

function render(){
  if(V.name==='parent'&&!parentOK)V={name:'home'};
  renderTop();
  document.body.classList.toggle('tvmode',V.name==='tv');
  const app=document.getElementById('app');
  app.innerHTML=V.name==='tv'?renderTV():V.name==='kid'?renderKid():V.name==='parent'?renderParent():renderHome();
  if(V.name==='tv')fitTV();
}
fromHash();
render();
setInterval(()=>{if(V.name!=='parent')render()},10*60*1000);
