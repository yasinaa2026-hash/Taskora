const STORAGE_KEY = 'myday-task-manager-v1';

let data = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { tasks: [] }; }
  catch { return { tasks: [] }; }
})();

const $ = (id) => document.getElementById(id);
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

function render() {
  const list = $('taskList');
  const total = data.tasks.length;
  const done = data.tasks.filter(t => t.done).length;
  const pending = total - done;
  if ($('progressText')) $('progressText').textContent = `${done} / ${total} completed`;
  if ($('progressPct')) $('progressPct').textContent = `${total ? Math.round(done / total * 100) : 0}%`;
  if ($('progressBar')) $('progressBar').style.width = `${total ? Math.round(done / total * 100) : 0}%`;
  if ($('progressHint')) $('progressHint').textContent = total ? `${pending} task${pending === 1 ? '' : 's'} remaining.` : 'Add your first task.';
  if (!list) return;
  list.innerHTML = total ? data.tasks.map((t, i) => `
    <div class="task ${t.done ? 'completed' : ''}">
      <button class="check" onclick="TaskManager.toggle(${i})">${t.done ? '✓' : ''}</button>
      <div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${t.time ? escapeHtml(t.time) : 'No time set'}${t.duration ? ` • ${escapeHtml(t.duration)} min` : ''}</div></div>
      <button class="task-delete" aria-label="Delete task" onclick="TaskManager.remove(${i})">×</button>
    </div>`).join('') : '<div class="muted empty-state">No tasks yet.</div>';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' })[ch]);
}

function addTask(title, time = '', duration = '') {
  const clean = String(title || '').trim();
  if (!clean) return false;
  data.tasks.push({ id: Date.now(), title: clean, time: String(time || ''), duration: String(duration || ''), done: false });
  save(); render(); return true;
}

function parseSimplePlan(text) {
  const source = text.trim();
  if (!source) return [];
  const chunks = source.split(/(?:,|\n|\band\b|\bthen\b|\balso\b|،|و|ثم)/i).map(x => x.trim()).filter(Boolean);
  const timeRe = /(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
  return chunks.map(chunk => {
    const match = chunk.match(timeRe);
    const duration = chunk.match(/(\d+)\s*(?:minutes?|mins?|دقيقة|دقائق)/i);
    return { title: chunk.replace(timeRe, '').replace(/\s+/g, ' ').trim(), time: match ? match[1] : '', duration: duration ? duration[1] : '', done: false };
  }).filter(t => t.title);
}

function buildPlan() {
  const input = $('planInput');
  const tasks = parseSimplePlan(input?.value || '');
  if (!tasks.length) return;
  data.tasks = tasks.map(t => ({ ...t, id: Date.now() + Math.random() }));
  save(); render();
  if ($('aiMessage')) $('aiMessage').textContent = `Created ${tasks.length} task${tasks.length === 1 ? '' : 's'} from your plan.`;
  input.value = '';
}

function startVoice(textareaId, buttonId) {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  const button = $(buttonId); const area = $(textareaId);
  if (!Speech) {
    if (button) button.textContent = '🎙️ Voice unavailable';
    return;
  }
  const recognition = new Speech();
  recognition.lang = /[\u0600-\u06FF]/.test(area.value) ? 'ar-SA' : 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => { button.textContent = '🔴 Listening…'; button.classList.add('listening'); };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map(r => r[0].transcript).join(' ');
    area.value = transcript;
  };
  recognition.onerror = () => { button.textContent = '🎙️ Speak'; button.classList.remove('listening'); };
  recognition.onend = () => { button.textContent = '🎙️ Speak'; button.classList.remove('listening'); };
  recognition.start();
}

function init() {
  $('planBtn')?.addEventListener('click', buildPlan);
  $('addTaskBtn')?.addEventListener('click', () => addTask(prompt('Task name?')));
  $('voiceBtn')?.addEventListener('click', () => startVoice('planInput', 'voiceBtn'));
  render();
}

window.TaskManager = {
  toggle(index) { if (data.tasks[index]) { data.tasks[index].done = !data.tasks[index].done; save(); render(); } },
  remove(index) { data.tasks.splice(index, 1); save(); render(); },
  add: addTask,
  voice: startVoice
};

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
