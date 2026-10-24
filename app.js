const KEY = 'workouts_v1';
const $ = (s) => document.querySelector(s);

const CATALOG = [
  ['Жим лёжа', 'Грудь'], ['Жим гантелей на наклонной', 'Грудь'], ['Отжимания на брусьях', 'Грудь'],
  ['Приседания со штангой', 'Ноги'], ['Румынская тяга', 'Ноги'], ['Выпады', 'Ноги'], ['Жим ногами', 'Ноги'],
  ['Становая тяга', 'Спина'], ['Подтягивания', 'Спина'], ['Тяга штанги в наклоне', 'Спина'], ['Тяга верхнего блока', 'Спина'],
  ['Жим стоя', 'Плечи'], ['Махи гантелями', 'Плечи'],
  ['Подъём на бицепс', 'Руки'], ['Французский жим', 'Руки'], ['Планка', 'Пресс'],
];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => iso(new Date());
const e1rm = (w, r) => (r === 1 ? w : w * (1 + r / 30)); // формула Эпли
const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('ru-RU');

// ---------- Данные ----------
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch { /* ignore */ }
  return demo();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } }

function demo() {
  const plans = [
    [['Жим лёжа', 60], ['Жим гантелей на наклонной', 22], ['Французский жим', 25]],
    [['Приседания со штангой', 80], ['Румынская тяга', 70], ['Выпады', 20]],
    [['Подтягивания', 0], ['Тяга штанги в наклоне', 55], ['Подъём на бицепс', 25]],
  ];
  const workouts = [];
  let k = 0;
  for (let day = 60; day >= 1; day--) {
    const d = new Date();
    d.setDate(d.getDate() - day);
    if (![1, 3, 5].includes(d.getDay())) continue;
    const plan = plans[k % 3];
    const growth = Math.floor(k / 3) * 2.5;
    workouts.push({
      id: `w${k}`,
      date: iso(d),
      items: plan.map(([ex, base]) => ({
        ex,
        sets: [10, 8, 8, 6].slice(0, 3 + (k % 2)).map((r, i) => ({ w: base ? base + growth + i * 2.5 : 0, r: base ? r : 12 - i - Math.floor(k / 6) * -1 })),
      })),
    });
    k++;
  }
  return { workouts, custom: [] };
}

let data = load();
let tab = 'today';

const allExercises = () => [...CATALOG.map(([n, g]) => ({ name: n, group: g })), ...data.custom.map((n) => ({ name: n, group: 'Свои' }))];
const todayWorkout = () => data.workouts.find((w) => w.date === today());
function ensureToday() {
  let w = todayWorkout();
  if (!w) { w = { id: `w${Date.now()}`, date: today(), items: [] }; data.workouts.push(w); }
  return w;
}
const volume = (w) => w.items.reduce((s, it) => s + it.sets.reduce((a, x) => a + x.w * x.r, 0), 0);
const setsCount = (w) => w.items.reduce((s, it) => s + it.sets.length, 0);

// ---------- Шапка ----------
function renderTop() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const week = data.workouts.filter((w) => parse(w.date) >= monday && w.items.length);
  const vol = week.reduce((s, w) => s + volume(w), 0);
  $('#weekStats').innerHTML = `<div><b>${week.length}</b><span>трен. за неделю</span></div><div><b>${fmt(vol / 1000)} т</b><span>тоннаж</span></div>`;
}

// ---------- Сегодня ----------
function lastSets(ex, beforeDate) {
  const prev = [...data.workouts].filter((w) => w.date < beforeDate).sort((a, b) => b.date.localeCompare(a.date)).find((w) => w.items.some((i) => i.ex === ex));
  return prev?.items.find((i) => i.ex === ex).sets ?? null;
}

function renderToday() {
  const w = todayWorkout();
  const items = w?.items ?? [];
  const d = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#today').innerHTML = `
    <p class="date">${d}</p>
    ${items.length ? '' : '<div class="empty"><span>🏋️</span><p>Тренировка ещё не начата.<br>Добавьте первое упражнение.</p></div>'}
    ${items.map((it, i) => {
      const prev = lastSets(it.ex, today());
      return `<article class="ex" data-i="${i}">
        <header class="ex__head">
          <h3>${escapeHTML(it.ex)}</h3>
          <button class="icon" data-remove-ex="${i}" aria-label="Удалить упражнение">✕</button>
        </header>
        ${prev ? `<p class="ex__prev">Прошлый раз: ${prev.map((s) => `${fmt(s.w)}×${s.r}`).join(', ')}</p>` : ''}
        <div class="sets">
          <div class="set set--head"><span>#</span><span>Вес, кг</span><span>Повторы</span><span></span></div>
          ${it.sets.map((s, j) => `<div class="set">
            <span class="set__n">${j + 1}</span>
            <div class="stepper"><button data-step="w" data-d="-2.5" data-j="${j}">−</button><input data-field="w" data-j="${j}" inputmode="decimal" value="${s.w}"><button data-step="w" data-d="2.5" data-j="${j}">+</button></div>
            <div class="stepper"><button data-step="r" data-d="-1" data-j="${j}">−</button><input data-field="r" data-j="${j}" inputmode="numeric" value="${s.r}"><button data-step="r" data-d="1" data-j="${j}">+</button></div>
            <button class="icon" data-remove-set="${j}" aria-label="Удалить подход">✕</button>
          </div>`).join('')}
        </div>
        <button class="add-set" data-add-set>＋ Подход</button>
      </article>`;
    }).join('')}
    <button class="btn btn--primary" id="addEx">＋ Упражнение</button>
    ${items.length ? `<p class="summary">Подходов: <b>${setsCount(w)}</b> · Тоннаж: <b>${fmt(volume(w))} кг</b></p>` : ''}`;
}

// ---------- История ----------
function renderHistory() {
  const list = [...data.workouts].filter((w) => w.items.length).sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) { $('#history').innerHTML = '<div class="empty"><span>📅</span><p>Здесь появятся ваши тренировки.</p></div>'; return; }
  $('#history').innerHTML = list.map((w) => `
    <details class="hist">
      <summary>
        <span class="hist__date">${parse(w.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}</span>
        <span class="hist__name">${w.items.map((i) => escapeHTML(i.ex)).slice(0, 2).join(', ')}${w.items.length > 2 ? ` +${w.items.length - 2}` : ''}</span>
        <span class="hist__vol">${fmt(volume(w))} кг</span>
      </summary>
      <ul>${w.items.map((it) => `<li><b>${escapeHTML(it.ex)}</b><span>${it.sets.map((s) => `${fmt(s.w)}×${s.r}`).join(' · ')}</span></li>`).join('')}</ul>
    </details>`).join('');
}

// ---------- Прогресс ----------
function renderProgress() {
  const used = [...new Set(data.workouts.flatMap((w) => w.items.map((i) => i.ex)))];
  const sel = $('#exSelect');
  const prevVal = sel.value;
  sel.innerHTML = used.map((e) => `<option>${escapeHTML(e)}</option>`).join('');
  if (used.includes(prevVal)) sel.value = prevVal;
  const ex = sel.value;
  if (!ex) { $('#prs').innerHTML = ''; $('#chart').innerHTML = '<p class="muted">Нет данных</p>'; return; }

  const points = [...data.workouts].sort((a, b) => a.date.localeCompare(b.date)).flatMap((w) => {
    const it = w.items.find((i) => i.ex === ex);
    if (!it || !it.sets.length) return [];
    return [{ date: w.date, best: Math.max(...it.sets.map((s) => e1rm(s.w, s.r))), maxW: Math.max(...it.sets.map((s) => s.w)), maxR: Math.max(...it.sets.map((s) => s.r)) }];
  });
  const bodyweight = points.every((p) => p.maxW === 0);
  const prW = Math.max(...points.map((p) => p.maxW));
  const prR = Math.max(...points.map((p) => p.maxR));
  const pr1 = Math.max(...points.map((p) => p.best));
  $('#prs').innerHTML = (bodyweight
    ? [['Повторы', prR], ['Тренировок', points.length]]
    : [['Макс. вес', `${fmt(prW)} кг`], ['1ПМ', `${fmt(pr1)} кг`], ['Тренировок', points.length]])
    .map(([l, v]) => `<div class="pr"><small>${l}</small><b>${v}</b></div>`).join('');
  $('.chart-card h3').textContent = bodyweight ? 'Максимум повторов' : 'Расчётный максимум (1ПМ), кг';
  drawChart(points.map((p) => ({ date: p.date, v: bodyweight ? p.maxR : p.best })));
}

function drawChart(pts) {
  const W = 600;
  const H = 240;
  const P = { l: 44, r: 14, t: 16, b: 32 };
  if (pts.length < 2) { $('#chart').innerHTML = '<p class="muted">Нужно минимум 2 тренировки с этим упражнением</p>'; return; }
  const vals = pts.map((p) => p.v);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = (hi - lo) * 0.15 || 5;
  lo = Math.max(0, lo - pad);
  hi += pad;
  const x = (i) => P.l + (i / (pts.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const area = `${line}L${x(pts.length - 1)},${H - P.b}L${x(0)},${H - P.b}Z`;
  const ticks = [0, 0.5, 1].map((k) => lo + (hi - lo) * k);
  const labels = [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="График прогресса">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#facc15" stop-opacity=".35"/><stop offset="1" stop-color="#facc15" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`).join('')}
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" class="line"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === pts.length - 1 ? 5 : 3}" class="${i === pts.length - 1 ? 'dot dot--last' : 'dot'}"><title>${parse(p.date).toLocaleDateString('ru-RU')}: ${fmt(p.v)}</title></circle>`).join('')}
    ${labels.map((i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${parse(pts[i].date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</text>`).join('')}
  </svg>`;
}

// ---------- Выбор упражнения ----------
function renderPicker() {
  const q = $('#exSearch').value.trim().toLowerCase();
  const list = allExercises().filter((e) => e.name.toLowerCase().includes(q));
  const groups = {};
  list.forEach((e) => { (groups[e.group] ||= []).push(e.name); });
  const exact = list.some((e) => e.name.toLowerCase() === q);
  $('#exList').innerHTML = (q && !exact ? `<button class="ex-item ex-item--new" data-pick="${escapeHTML($('#exSearch').value.trim())}">＋ Создать «${escapeHTML($('#exSearch').value.trim())}»</button>` : '')
    + Object.entries(groups).map(([g, names]) => `<h4>${g}</h4>${names.map((n) => `<button class="ex-item" data-pick="${escapeHTML(n)}">${escapeHTML(n)}</button>`).join('')}`).join('');
}

function pickExercise(name) {
  if (!allExercises().some((e) => e.name === name)) data.custom.push(name);
  const w = ensureToday();
  const prev = lastSets(name, today());
  w.items.push({ ex: name, sets: prev ? prev.map((s) => ({ ...s })) : [{ w: 20, r: 10 }] });
  save();
  $('#picker').hidden = true;
  render();
  toast(prev ? 'Подходы скопированы с прошлой тренировки' : 'Упражнение добавлено');
}

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, 2000);
}

// ---------- События ----------
function render() {
  renderTop();
  if (tab === 'today') renderToday();
  if (tab === 'history') renderHistory();
  if (tab === 'progress') renderProgress();
}

document.querySelector('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t === b));
  document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== tab; });
  render();
});

$('#today').addEventListener('click', (e) => {
  if (e.target.closest('#addEx')) { $('#exSearch').value = ''; renderPicker(); $('#picker').hidden = false; setTimeout(() => $('#exSearch').focus(), 50); return; }
  const card = e.target.closest('.ex');
  if (!card) return;
  const w = todayWorkout();
  const it = w.items[Number(card.dataset.i)];
  const step = e.target.closest('[data-step]');
  if (step) {
    const s = it.sets[Number(step.dataset.j)];
    const f = step.dataset.step;
    s[f] = Math.max(0, Math.round((s[f] + Number(step.dataset.d)) * 10) / 10);
  } else if (e.target.closest('[data-add-set]')) {
    const lastSet = it.sets.at(-1) ?? { w: 20, r: 10 };
    it.sets.push({ ...lastSet });
  } else if (e.target.closest('[data-remove-set]')) {
    it.sets.splice(Number(e.target.closest('[data-remove-set]').dataset.removeSet), 1);
  } else if (e.target.closest('[data-remove-ex]')) {
    if (!confirm(`Удалить «${it.ex}» из тренировки?`)) return;
    w.items.splice(Number(card.dataset.i), 1);
  } else return;
  save();
  render();
});

$('#today').addEventListener('change', (e) => {
  const inp = e.target.closest('[data-field]');
  if (!inp) return;
  const it = todayWorkout().items[Number(inp.closest('.ex').dataset.i)];
  const v = parseFloat(inp.value.replace(',', '.'));
  it.sets[Number(inp.dataset.j)][inp.dataset.field] = Number.isFinite(v) && v >= 0 ? v : 0;
  save();
  render();
});

$('#exSearch').addEventListener('input', renderPicker);
$('#exSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const first = $('#exList [data-pick]'); if (first) pickExercise(first.dataset.pick); } });
$('#exList').addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) pickExercise(b.dataset.pick); });
$('#picker').addEventListener('click', (e) => { if (e.target.id === 'picker') $('#picker').hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#picker').hidden = true; });
$('#exSelect').addEventListener('change', renderProgress);

render();
