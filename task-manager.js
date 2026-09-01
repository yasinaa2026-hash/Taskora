const STORAGE_KEY='myday-game-v2';
let data=load();
const $=id=>document.getElementById(id);
function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{tasks:[],xp:0,streak:0,lastDate:null}}catch{return{tasks:[],xp:0,streak:0,lastDate:null}}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
function todayKey(){return new Date().toISOString().slice(0,10)}
function levelInfo(xp){return{level:Math.floor(xp/100)+1,inLevel:xp%100}}
function escapeHtml(v=''){return String(v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function render(){
 const total=data.tasks.length,done=data.tasks.filter(t=>t.done).length,pct=total?Math.round(done/total*100):0,info=levelInfo(data.xp);
 if($('todayProgress'))$('todayProgress').textContent=`${done} / ${total}`;
 if($('todayPercent'))$('todayPercent').textContent=`${pct}%`;
 if($('coinsValue'))$('coinsValue').textContent=data.xp;
 if($('coinsValueMirror'))$('coinsValueMirror').textContent=data.xp;
 if($('levelLabel'))$('levelLabel').textContent=info.level;
 if($('xpLabel'))$('xpLabel').textContent=`${info.inLevel} / 100 XP`;
 if($('xpBar'))$('xpBar').style.width=`${info.inLevel}%`;
 const orb=document.querySelector('.stats-orb');if(orb)orb.style.background=`conic-gradient(var(--primary) ${pct*3.6}deg,#ececff 0deg)`;
 if($('streakValue'))$('streakValue').textContent=data.streak;
 const html=total?data.tasks.map((t,i)=>`<article class="task ${t.done?'completed':''}"><button class="check" onclick="TaskManager.toggle(${i})" aria-label="تغيير حالة المهمة">${t.done?'✓':''}</button><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${t.time?escapeHtml(t.time):'بدون وقت'}${t.duration?` • ${escapeHtml(t.duration)} دقيقة`:''}</div></div><button class="task-delete" onclick="TaskManager.remove(${i})" aria-label="حذف المهمة">×</button></article>`).join(''):'<div class="empty-state">✦ لا توجد مهام بعد — ابدأ بأول مهمة لك!</div>';
 if($('taskList'))$('taskList').innerHTML=html;if($('allTasksList'))$('allTasksList').innerHTML=html;
 if($('motivationText'))$('motivationText').textContent=total===0?'جاهز لأول مهمة؟':pct===100?'🔥 أنهيت كل التحديات!':pct>=50?'💪 أنت في منتصف الطريق!':'🚀 استمر، كل مهمة تقرّبك من هدفك!';
 if($('motivationSub'))$('motivationSub').textContent=total===0?'ابدأ بمهمة واحدة فقط.':`${total-done} مهام متبقية اليوم.`;
}
function updateStreak(){const t=todayKey();if(data.lastDate===t)return;const prev=new Date();prev.setDate(prev.getDate()-1);const p=prev.toISOString().slice(0,10);data.streak=data.lastDate===p?data.streak+1:1;data.lastDate=t}
function addTask(title,time=''){const clean=String(title||'').trim();if(!clean)return false;const m=clean.match(/(\d+)\s*(?:دقيقة|دقائق|minutes?|mins?)/i);data.tasks.push({id:Date.now()+Math.random(),title:clean,time:String(time||''),duration:m?m[1]:'',done:false});save();render();return true}
function addFromInputs(){const input=$('taskInput'),time=$('timeInput');if(addTask(input?.value,time?.value)){input.value='';time.value='';input.focus()}}
window.TaskManager={toggle(i){const t=data.tasks[i];if(!t)return;t.done=!t.done;if(t.done){data.xp+=25;updateStreak()}else data.xp=Math.max(0,data.xp-25);save();render()},remove(i){data.tasks.splice(i,1);save();render()},add:addTask,render};
function init(){$('addBtn')?.addEventListener('click',addFromInputs);$('taskInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addFromInputs()}});render()}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
