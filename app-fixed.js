(() => {
  'use strict';

  const KEY = 'myday-ai-fixed-state-v1';
  const TODAY = new Date().toISOString().slice(0, 10);
  let state = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { days: {} }; }
    catch { return { days: {} }; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function day() {
    if (!state.days[TODAY]) state.days[TODAY] = { tasks: [], planText: '', reviewText: '', review: null };
    return state.days[TODAY];
  }
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[c]));
  const ar = s => /[\u0600-\u06FF]/.test(s || '');
  const norm = s => String(s || '').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/[ىي]/g,'ي').replace(/\s+/g,' ').trim().toLowerCase();

  const intents = [
    [/english|انجليزي|دراسه|دراسة|تعلم/, 'Study English', 45],
    [/exercise|workout|gym|training|تمرين|تمرن|رياضه|رياضة/, 'Exercise', 30],
    [/project|coding|programming|code|مشروع|برمجه|برمجة/, 'Work on my project', 60],
    [/read|reading|book|قراءة|اقرا|اقرأ|كتاب/, 'Read', 20],
    [/mosque|masjid|مسجد|المسجد|صلاه|صلاة/, 'Go to the mosque', ''],
    [/homework|واجب|الواجب/, 'Homework', 30],
    [/school|مدرسه|مدرسة/, 'School', ''],
    [/sleep|bed|نوم|انام|أنام/, 'Sleep', '']
  ];

  function duration(text) {
    let m = text.match(/(\d+)\s*(?:minutes?|mins?|دقيقة|دقائق)/i);
    if (m) return Number(m[1]);
    m = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|ساعة|ساعات)/i);
    return m ? Math.round(Number(m[1]) * 60) : '';
  }

  function time(text) {
    let m = text.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i);
    if (m) {
      let h = Number(m[1]);
      if (m[3].toLowerCase() === 'pm' && h < 12) h += 12;
      if (m[3].toLowerCase() === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${m[2] || '00'}`;
    }
    m = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    return m ? `${String(Number(m[1])).padStart(2,'0')}:${m[2]}` : '';
  }

  function smartPlan(text) {
    const source = String(text).trim();
    const chunks = source.replace(/[؛;]/g, ',').split(/,|\band\b|\bthen\b|\balso\b|\bafter that\b|\bnext\b|و(?:بعدها)?|ثم|بعدها|[.!?]/i).map(x=>x.trim()).filter(Boolean);
    const tasks = [];
    for (const chunk of chunks) {
      const n = norm(chunk);
      const rule = intents.find(x => x[0].test(n));
      const title = rule ? rule[1] : chunk.replace(/^(today|i want to|i will|i plan to|اليوم|اريد|أريد|سوف|راح|ابغى|أبغى)\s+/i,'').trim();
      if (!title || title.length < 2) continue;
      tasks.push({ title, duration: duration(chunk) || (rule ? rule[2] : ''), time: time(chunk), done:false });
    }
    // Detect known activities embedded in longer sentences.
    intents.forEach(rule => {
      if (rule[0].test(norm(source)) && !tasks.some(t => t.title === rule[1])) {
        tasks.push({ title:rule[1], duration:rule[2], time:time(source), done:false });
      }
    });
    const seen = new Set();
    return tasks.filter(t => { const k=t.title.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
  }

  function renderTasks() {
    const list = $('taskList'); if (!list) return;
    const tasks = day().tasks;
    list.innerHTML = tasks.length ? tasks.map((t,i) => `<div class="task ${t.done?'completed':''}"><button class="check" data-i="${i}" aria-label="complete">${t.done?'✓':''}</button><div><div class="task-title">${esc(t.title)}</div><div class="task-meta">${t.duration ? esc(t.duration)+' min' : 'No duration set'}</div></div><span class="task-time">${esc(t.time || 'No time set')}</span></div>`).join('') : '<div class="muted" style="padding:20px;text-align:center">No tasks yet. Tell me what you want to accomplish.</div>';
    list.querySelectorAll('.check').forEach(b => b.addEventListener('click', () => { const i=Number(b.dataset.i); if(day().tasks[i]){day().tasks[i].done=!day().tasks[i].done;save();renderTasks();} }));
    updateProgress();
  }

  function updateProgress() {
    const tasks=day().tasks, done=tasks.filter(t=>t.done).length, pct=tasks.length?Math.round(done/tasks.length*100):0;
    if($('progressText')) $('progressText').textContent=`${done} / ${tasks.length} completed`;
    if($('progressPct')) $('progressPct').textContent=`${pct}%`;
    if($('progressBar')) $('progressBar').style.width=`${pct}%`;
    if($('progressRing')) $('progressRing').style.background=`conic-gradient(var(--primary) ${pct*3.6}deg,#ececf3 0deg)`;
    if($('progressHint')) $('progressHint').textContent=tasks.length?(pct===100?'Everything planned is done. Great work!':`${tasks.length-done} task${tasks.length-done===1?'':'s'} still on your list.`):'Create your first plan to get started.';
    if($('reviewCompleted')) $('reviewCompleted').textContent=done;
  }

  function plan() {
    const input=$('planInput'); if(!input || !input.value.trim()) return;
    const text=input.value.trim(), tasks=smartPlan(text), d=day();
    if(!tasks.length){ if($('aiMessage')) $('aiMessage').textContent='I could not find a clear task. Try: “Study English at 5 PM for 45 minutes, then read for 20 minutes.”'; return; }
    d.planText=text; d.tasks=tasks; d.review=null; save(); input.value='';
    if($('aiMessage')) $('aiMessage').textContent=`✨ MyDay AI created ${tasks.length} smart tasks from your plan.`;
    renderTasks();
  }

  function review() {
    const input=$('reviewInput'); if(!input || !input.value.trim()) return;
    const text=input.value.trim(), n=norm(text), d=day();
    const completed=[], notCompleted=[], unclear=[];
    d.tasks.forEach(task => {
      const title=norm(task.title);
      const aliases=[title];
      if(title.includes('english')) aliases.push('english','انجليزي');
      if(title.includes('exercise')) aliases.push('exercise','workout','تمرين','رياضه');
      if(title.includes('project')) aliases.push('project','مشروع');
      if(title.includes('read')) aliases.push('read','reading','قراءة','كتاب');
      if(title.includes('mosque')) aliases.push('mosque','masjid','مسجد');
      const hit=aliases.find(a=>n.includes(norm(a)));
      if(!hit){ unclear.push(task.title); return; }
      const idx=n.indexOf(norm(hit));
      const nearby=n.slice(Math.max(0,idx-35),Math.min(n.length,idx+70));
      if(/didn't|did not|not|no|لم|لن|ما|مو|مش|ما انجز|لم انجز/.test(nearby)) notCompleted.push(task.title); else completed.push(task.title);
    });
    completed.forEach(title=>{const t=d.tasks.find(x=>x.title===title);if(t)t.done=true;});
    const result={completed,not_completed:notCompleted,unclear,questions:unclear.slice(0,2).map(x=>ar(text)?`هل تقصد أنك أنجزت «${x}» بالكامل؟`:`Did you complete “${x}” completely?`),summary:ar(text)?`ممتاز! تم تأكيد ${completed.length} من ${d.tasks.length} مهام مخططة.`:`Great! I confirmed ${completed.length} of ${d.tasks.length} planned tasks.`};
    d.reviewText=text; d.review=result; save(); renderTasks(); renderReview(result);
  }

  function renderReview(r) {
    const box=$('reviewResult'); if(!box)return;
    box.classList.remove('hidden');
    const done=r.completed||[], no=r.not_completed||[], u=r.unclear||[];
    box.innerHTML=`<p class="eyebrow">MYDAY AI REVIEW</p><p class="result-title">${esc(r.summary||'Review complete.')}</p><div class="result-grid"><div class="result-box"><h4 class="good">✅ COMPLETED</h4>${done.length?done.map(x=>`<p>✓ ${esc(x)}</p>`).join(''):'<p>None confirmed yet.</p>'}</div><div class="result-box"><h4 class="bad">○ NOT COMPLETED</h4>${no.length?no.map(x=>`<p>• ${esc(x)}</p>`).join(''):'<p>None explicitly marked incomplete.</p>'}</div></div>${u.length?`<div class="question">🤔 <strong>One quick question:</strong> ${esc(r.questions?.[0]||`Did you complete “${u[0]}”?`)}</div>`:''}`;
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function startVoice(id, buttonId) {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition, area=$(id), button=$(buttonId);
    if(!SR){ alert('Voice input is not supported here. Please use Chrome or Edge over HTTPS.'); return; }
    const rec=new SR(); rec.lang=isArabic(area.value)?'ar-SA':'en-US'; rec.continuous=false; rec.interimResults=true; rec.maxAlternatives=1;
    const before=area.value.trim(); button.disabled=true; button.textContent='🔴 Listening…'; button.classList.add('listening');
    rec.onresult=e=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript+' ';area.value=[before,t.trim()].filter(Boolean).join(' ').trim();};
    rec.onerror=e=>{console.warn(e.error);if(e.error==='not-allowed')alert('Please allow microphone access for this site.');};
    rec.onend=()=>{button.disabled=false;button.textContent='🎙️ Speak';button.classList.remove('listening');};
    try{rec.start();}catch{button.disabled=false;button.textContent='🎙️ Speak';button.classList.remove('listening');}
  }

  function isArabic(text){return /[\u0600-\u06FF]/.test(text||'');}

  function boot(){
    if($('dateLabel'))$('dateLabel').textContent=formatDate(TODAY);
    $('planBtn')?.addEventListener('click',plan);
    $('reviewBtn')?.addEventListener('click',review);
    $('voiceBtn')?.addEventListener('click',()=>startVoice('planInput','voiceBtn'));
    $('reviewVoiceBtn')?.addEventListener('click',()=>startVoice('reviewInput','reviewVoiceBtn'));
    $('themeBtn')?.addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('myday-theme',document.body.classList.contains('dark')?'dark':'light');});
    $('addTaskBtn')?.addEventListener('click',()=>{const title=prompt('What task do you want to add?');if(title?.trim()){day().tasks.push({title:title.trim(),duration:'',time:'',done:false});save();renderTasks();}});
    document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));$(btn.dataset.view+'View')?.classList.add('active-view');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b===btn));if($('pageTitle'))$('pageTitle').textContent=btn.dataset.view==='today'?'Today':btn.dataset.view==='review'?'Review':'History';if(btn.dataset.view==='history')renderHistory();}));
    if(localStorage.getItem('myday-theme')==='dark')document.body.classList.add('dark');
    renderTasks(); renderHistory();
  }

  function renderHistory(){const box=$('historyList');if(!box)return;const entries=Object.entries(state.days).sort((a,b)=>b[0].localeCompare(a[0]));box.innerHTML=entries.length?entries.slice(0,12).map(([d,x])=>{const total=x.tasks.length,done=x.tasks.filter(t=>t.done).length,p=total?Math.round(done/total*100):0;return `<div class="history-card"><h3>${esc(formatDate(d))}</h3><div class="muted">${done} / ${total} completed</div><div class="bar"><span style="width:${p}%"></span></div><div class="muted">${p}% progress</div></div>`}).join(''):'<div class="content-card"><p class="muted">Your completed days will appear here.</p></div>'}
  function formatDate(d){return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(d+'T12:00:00'));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
