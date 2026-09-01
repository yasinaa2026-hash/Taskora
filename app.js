const KEY = 'myday-ai-state-v1';
const today = new Date().toISOString().slice(0, 10);
const defaultState = { days: {} };
let state = loadState();

function loadState(){ try { return JSON.parse(localStorage.getItem(KEY)) || defaultState; } catch { return defaultState; } }
function saveState(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function day(){ state.days[today] ||= { tasks: [], planText: '', reviewText: '', review: null }; return state.days[today]; }
function escapeHtml(s=''){ return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function formatDate(dateStr){ return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(dateStr+'T12:00:00')); }

document.getElementById('dateLabel').textContent = formatDate(today);

function renderTasks(){
  const tasks = day().tasks;
  const list = document.getElementById('taskList');
  list.innerHTML = tasks.length ? tasks.map((t,i)=>`<div class="task ${t.done?'completed':''}">
    <button class="check" aria-label="complete task" onclick="toggleTask(${i})">${t.done?'✓':''}</button>
    <div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${t.duration?escapeHtml(String(t.duration))+' min':''}</div></div>
    <span class="task-time">${escapeHtml(t.time||'No time set')}</span>
  </div>`).join('') : '<div class="muted" style="padding:20px 0;text-align:center">No tasks yet. Tell me what you want to accomplish.</div>';
  updateProgress(); renderHistory();
}
window.toggleTask = function(i){ day().tasks[i].done = !day().tasks[i].done; saveState(); renderTasks(); };
function updateProgress(){
  const tasks=day().tasks, done=tasks.filter(t=>t.done).length, pct=tasks.length?Math.round(done/tasks.length*100):0;
  document.getElementById('progressText').textContent=`${done} / ${tasks.length} completed`;
  document.getElementById('progressPct').textContent=pct+'%';
  document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressRing').style.background=`conic-gradient(var(--primary) ${pct*3.6}deg,#ececf3 0deg)`;
  document.getElementById('progressHint').textContent=tasks.length?(pct===100?'Everything planned is done. Great work!':`${tasks.length-done} task${tasks.length-done===1?'':'s'} still on your list.`):'Create your first plan to get started.';
  document.getElementById('reviewCompleted').textContent=done;
}

function parseTasks(text){
  const normalized=text.replace(/\s+/g,' ').trim();
  const pieces=normalized.split(/,|\band\b|\bthen\b|\balso\b|[.!?]/i).map(x=>x.trim()).filter(Boolean);
  const patterns=[
    [/study english|learn english|english/i,'Study English'],[/exercise|work ?out|training|تمرن|رياضة/i,'Exercise'],[/work on (?:my )?project|project/i,'Work on my project'],[/read|reading|قراءة/i,'Read'],[/mosque|masjid|المسجد/i,'Go to the mosque']
  ];
  const found=[];
  for(const [re,title] of patterns){ if(re.test(normalized)) found.push(title); }
  if(found.length===0){
    return pieces.map(p=>({title:p.replace(/^i (want to|will|plan to|am going to) /i,''),duration:'',time:'',done:false}));
  }
  const tasks=found.map(title=>({title,duration:title==='Exercise'?'30':title==='Study English'?'45':title==='Read'?'20':'',time:'',done:false}));
  return tasks.filter((t,i,a)=>a.findIndex(x=>x.title===t.title)===i);
}

document.getElementById('planBtn').addEventListener('click',()=>{
  const input=document.getElementById('planInput'); const text=input.value.trim(); if(!text) return;
  const parsed=parseTasks(text); day().planText=text; day().tasks=parsed; saveState(); renderTasks();
  document.getElementById('aiMessage').textContent=`I turned your plan into ${parsed.length} task${parsed.length===1?'':'s'}. You can mark them complete as your day moves on.`;
  input.value='';
});

document.getElementById('addTaskBtn').addEventListener('click',()=>{
  const title=prompt('What task do you want to add?'); if(!title?.trim()) return;
  day().tasks.push({title:title.trim(),duration:'',time:'',done:false}); saveState(); renderTasks();
});

function voiceInto(textareaId,buttonId){
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!Speech){ alert('Speech recognition is not supported in this browser. Try Chrome or Edge.'); return; }
  const rec=new Speech(); rec.lang=document.documentElement.lang==='ar'?'ar-SA':'en-US'; rec.interimResults=false; rec.maxAlternatives=1;
  rec.onstart=()=>document.getElementById(buttonId).textContent='🔴 Listening…';
  rec.onerror=()=>document.getElementById(buttonId).textContent='🎙️ Speak';
  rec.onend=()=>document.getElementById(buttonId).textContent='🎙️ Speak';
  rec.onresult=e=>{ document.getElementById(textareaId).value=(document.getElementById(textareaId).value+' '+e.results[0][0].transcript).trim(); };
  rec.start();
}
document.getElementById('voiceBtn').onclick=()=>voiceInto('planInput','voiceBtn');
document.getElementById('reviewVoiceBtn').onclick=()=>voiceInto('reviewInput','reviewVoiceBtn');

document.getElementById('reviewBtn').addEventListener('click',()=>{
  const text=document.getElementById('reviewInput').value.trim(); if(!text) return;
  const tasks=day().tasks;
  const lower=text.toLowerCase();
  const completed=[], missing=[], unclear=[];
  tasks.forEach(t=>{
    const words=t.title.toLowerCase().split(/\s+/).filter(w=>w.length>3);
    const match=words.some(w=>lower.includes(w));
    const negative=new RegExp(`(?:didn't|did not|not|no|لم|ما|مو)\\s*(?:.{0,20})${words[0]}`,'i').test(text);
    if(match && !negative) completed.push(t.title); else if(negative) missing.push(t.title); else unclear.push(t.title);
  });
  day().reviewText=text; day().review={completed,missing,unclear}; saveState();
  const result=document.getElementById('reviewResult'); result.classList.remove('hidden');
  result.innerHTML=`<p class="eyebrow">MYDAY AI REVIEW</p><p class="result-title">You recorded ${completed.length} of ${tasks.length} planned task${tasks.length===1?'':'s'}.</p>
  <div class="result-grid"><div class="result-box"><h4 class="good">✅ YOU MENTIONED</h4>${completed.length?completed.map(x=>`<p>✓ ${escapeHtml(x)}</p>`).join(''):'<p>Nothing clearly confirmed yet.</p>'}</div>
  <div class="result-box"><h4 class="bad">○ NOT CONFIRMED</h4>${missing.concat(unclear).length?missing.concat(unclear).map(x=>`<p>• ${escapeHtml(x)}</p>`).join(''):'<p>All tasks were accounted for.</p>'}</div></div>
  ${unclear.length?`<div class="question">🤔 <strong>One quick question:</strong> ${escapeHtml(unclear[0])} — did you complete this task?</div>`:''}`;
  result.scrollIntoView({behavior:'smooth',block:'start'});
});

function renderHistory(){
  const box=document.getElementById('historyList'); const entries=Object.entries(state.days).sort((a,b)=>b[0].localeCompare(a[0]));
  box.innerHTML=entries.length?entries.slice(0,12).map(([date,d])=>{const total=d.tasks.length,done=d.tasks.filter(x=>x.done).length,p=total?Math.round(done/total*100):0;return `<div class="history-card"><h3>${formatDate(date)}</h3><div class="muted">${done} / ${total} completed</div><div class="bar"><span style="width:${p}%"></span></div><div class="muted">${p}% progress</div></div>`}).join(''):'<div class="content-card"><p class="muted">Your completed days will appear here.</p></div>';
}

function showView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
  document.getElementById(view+'View').classList.add('active-view');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  document.getElementById('pageTitle').textContent=view==='today'?'Today':view==='review'?'Review':'History';
  if(view==='history') renderHistory();
}
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>showView(b.dataset.view));

document.getElementById('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('myday-theme',document.body.classList.contains('dark')?'dark':'light');};
if(localStorage.getItem('myday-theme')==='dark') document.body.classList.add('dark');

renderTasks();