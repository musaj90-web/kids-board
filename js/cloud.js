
/* ================= cloud sync (Firebase Realtime Database) ================= */
// Paste the web-app config from Firebase console → Project settings → Your apps. null = local only (as before).
const FB_CONFIG={apiKey:'AIzaSyDT66kuHy9UCZoDncIJPERPY-0KIXnnmHY',authDomain:'kids-board-2026.firebaseapp.com',databaseURL:'https://kids-board-2026-default-rtdb.europe-west1.firebasedatabase.app',projectId:'kids-board-2026',storageBucket:'kids-board-2026.firebasestorage.app'};
// /family/state = everything except S.done, as one JSON string; /family/done/<key> = true per ticked item (so ticks from different devices don't overwrite each other)
const CLOUD={ref:null,user:null,ready:false,online:false,state:null,done:{},pending:false};
const encK=k=>encodeURIComponent(k).replace(/\./g,'%2E');
const hasPlans=s=>!!s&&Object.values(s.plans||{}).some(p=>p&&p.length);
function splitS(){const{done,...rest}=S;return{rest:JSON.stringify(rest),done:done||{}}}
function localSave(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function cloudPush(){
  if(!CLOUD.ready)return;
  const{rest,done}=splitS(),u={};
  if(rest!==CLOUD.state){u.state=rest;CLOUD.state=rest}
  for(const k in done)if(!CLOUD.done[k])u['done/'+encK(k)]=true;
  for(const k in CLOUD.done)if(!done[k])u['done/'+encK(k)]=null;
  CLOUD.done=Object.assign({},done);
  if(Object.keys(u).length)CLOUD.ref.update(u).catch(e=>{console.error(e);CLOUD.err=(CLOUD.user?CLOUD.user.email+': ':'')+(e.code||e.message);toast('⚠️ تعذّرت المزامنة — '+CLOUD.err)});
}
function applyState(v){CLOUD.state=v;S=Object.assign(defaults(),JSON.parse(v),{done:S.done});LOAD_ERR=null;localSave();if(fixSavedText(S)|fixPlans(S)){localSave();setTimeout(cloudPush,0)}}
function applyDone(v){const m={};for(const k in v||{})m[decodeURIComponent(k)]=true;CLOUD.done=Object.assign({},m);S.done=m;localSave()}
// don't redraw under the parent while they type or review a PDF; retry shortly
function cloudBusy(){const a=document.activeElement;return document.getElementById('layer').innerHTML.trim()!==''||(V.name==='parent'&&a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))}
function cloudRefresh(){
  if(cloudBusy()){CLOUD.pending=true;return}
  CLOUD.pending=false;
  if(V.name==='kid'){if(!kidById(V.kid))V={name:'home'};else if(V.date&&!planFor(V.kid,V.date))V.date=null}
  render();
}
setInterval(()=>{if(CLOUD.pending)cloudRefresh()},3000);
async function cloudStart(user){
  CLOUD.user=user;CLOUD.ready=false;CLOUD.ref=firebase.database().ref('family');renderTop();
  // read state + done only; /family/pdfs is large and is fetched per file when viewed
  const[st,dn]=await Promise.all([CLOUD.ref.child('state').once('value'),CLOUD.ref.child('done').once('value')]);
  const v={state:st.val(),done:dn.val()},remote=v.state?JSON.parse(v.state):null;
  if(hasPlans(S)&&!hasPlans(remote)){
    // first device with real data seeds the cloud
    CLOUD.state=v.state||null;CLOUD.done={};for(const k in v.done||{})CLOUD.done[decodeURIComponent(k)]=true;
    CLOUD.ready=true;cloudPush();toast('☁️ تم رفع بيانات هذا الجهاز إلى السحابة');
  }else{
    if(hasPlans(S))try{if(!localStorage.getItem(KEY+'.beforeCloud'))localStorage.setItem(KEY+'.beforeCloud',JSON.stringify(S))}catch(e){}
    if(v.state)applyState(v.state);applyDone(v.done);CLOUD.ready=true;
  }
  CLOUD.ref.child('state').on('value',s=>{const x=s.val();if(x&&x!==CLOUD.state){applyState(x);cloudRefresh()}});
  CLOUD.ref.child('done').on('value',s=>{applyDone(s.val());cloudRefresh()});
  cloudRefresh();
}
function cloudStop(){if(CLOUD.ref){CLOUD.ref.child('state').off();CLOUD.ref.child('done').off()}Object.assign(CLOUD,{ref:null,user:null,ready:false,state:null,done:{}});renderTop()}
function cloudLogin(){
  document.getElementById('layer').innerHTML=`<div class="overlay"><div class="modal"><h3>☁️ تسجيل الدخول</h3><p class="hint">سجّل الدخول بحساب العائلة مرة واحدة على هذا الجهاز لتتزامن الواجبات بين كل الأجهزة.</p><input id="cEmail" class="cloudin" type="email" dir="ltr" placeholder="Email" autocomplete="username"><input id="cPass" class="cloudin" type="password" dir="ltr" placeholder="Password" autocomplete="current-password"><div class="mrow"><button class="btn primary" id="cGo">دخول</button></div></div></div>`;
  const go=()=>{const e=document.getElementById('cEmail').value.trim(),p=document.getElementById('cPass').value;if(!e||!p)return toast('أدخل البريد وكلمة المرور');
    firebase.auth().signInWithEmailAndPassword(e,p).then(()=>closeModal()).catch(err=>{console.error(err);toast(/network/.test(err.code)?'لا يوجد اتصال بالإنترنت':'البريد أو كلمة المرور غير صحيحة')})};
  document.getElementById('cGo').onclick=go;
  document.getElementById('cPass').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
}
function cloudBadge(){if(!FB_CONFIG)return'';const ok=CLOUD.user&&CLOUD.online;return`<span class="cloud ${ok?'on':''}" title="${ok?'متزامن':'غير متصل — تتم المزامنة عند عودة الاتصال'}">${ok?'☁️':'⚠️'}</span>`}
function cloudCard(){if(!FB_CONFIG)return'';return`<div class="card"><h3>☁️ المزامنة</h3><p class="hint">${CLOUD.user?`متصل بحساب <b dir="ltr">${esc(CLOUD.user.email)}</b> — ${CLOUD.online?'✅ البيانات متزامنة مع كل الأجهزة':'⚠️ غير متصل بالإنترنت الآن'}`:'غير مسجّل الدخول'}</p>${CLOUD.err?`<p class="hint" dir="ltr" style="color:var(--bad)">${esc(CLOUD.err)}</p>`:''}${CLOUD.user?'<button class="btn danger" id="cOut">تسجيل الخروج من هذا الجهاز</button>':''}</div>`}
document.addEventListener('click',e=>{if(e.target.closest('#cOut')&&confirm('تسجيل الخروج من المزامنة على هذا الجهاز؟'))firebase.auth().signOut()});
if(FB_CONFIG){
  if(typeof firebase==='undefined')toast('⚠️ تعذّر الاتصال بالسحابة — يعمل التطبيق بدون مزامنة');
  else{
    firebase.initializeApp(FB_CONFIG);
    firebase.database().ref('.info/connected').on('value',s=>{CLOUD.online=!!s.val();renderTop()});
    firebase.auth().onAuthStateChanged(u=>{if(u)cloudStart(u).catch(e=>{console.error(e);toast('⚠️ تعذّرت المزامنة: '+(e.code||e.message))});else{cloudStop();cloudLogin()}});
  }
}
