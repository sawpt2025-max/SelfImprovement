// checkin.js — S-tier daily check-in (3 tracked items)

const Checkin = (() => {
  let data;
  let persist;

  const ITEMS = [
    { key: 'wake', label: 'Steady wake + screen-free wind-down' },
    { key: 'noBanana', label: 'No banana' },
    { key: 'study', label: 'Study' },
  ];

  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function checkDailyReset() {
    const today = todayIso();
    if (data.checkin.date !== today) {
      data.checkin.date = today;
      data.checkin.items = { wake: 'pending', noBanana: 'pending', study: 'pending' };
      data.checkin.na = { wake: false, noBanana: false, study: false };
      persist();
    }
  }

  function setState(key, state) {
    data.checkin.items[key] = state;
    recordHistory();
    persist();
    render();
  }

  function toggleNa(key) {
    data.checkin.na[key] = !data.checkin.na[key];
    recordHistory();
    persist();
    render();
  }

  function markDone(key) {
    data.checkin.items[key] = 'done';
    recordHistory();
    persist();
    render();
  }

  // --- calendar history ---
  // Records, for today, the day-type and whether all S-tier items are
  // done/N-A — the only things the calendar (Phase 2) shows per day.

  function recordHistory() {
    const today = todayIso();
    const sTierDone = ITEMS.every(
      ({ key }) => data.checkin.na[key] || data.checkin.items[key] === 'done'
    );
    const dayType = data.dayType.date === today ? data.dayType.type : null;
    data.history[today] = { dayType, sTierDone };
  }

  // --- "doing it now" full screen ---

  function openDoing(key, label) {
    document.getElementById('doing-label').textContent = label;
    document.getElementById('doing-screen').classList.remove('hidden');
    document.getElementById('doing-screen').dataset.key = key;
  }

  function closeDoing() {
    document.getElementById('doing-screen').classList.add('hidden');
  }

  function setupDoingScreen() {
    document.getElementById('doing-finished').addEventListener('click', () => {
      const key = document.getElementById('doing-screen').dataset.key;
      setState(key, 'done');
      closeDoing();
    });
    document.getElementById('doing-back').addEventListener('click', closeDoing);
  }

  // --- rendering ---

  // glyph for the current state — done | progress | didnt | na | pending
  function glyphFor(state, na) {
    if (na) return { cls: 'state-glyph-na', icon: Icons.dash };
    if (state === 'done') return { cls: 'state-glyph-done', icon: Icons.check };
    if (state === 'in_progress') return { cls: 'state-glyph-progress', icon: '' };
    if (state === 'missed') return { cls: 'state-glyph-didnt', icon: Icons.cross };
    return { cls: 'state-glyph-pending', icon: '' };
  }

  function render() {
    checkDailyReset();

    const list = document.getElementById('checkin-list');
    list.innerHTML = '';

    ITEMS.forEach(({ key, label }, i) => {
      const state = data.checkin.items[key];
      const na = data.checkin.na[key];
      const glyph = glyphFor(state, na);

      const row = document.createElement('div');
      row.className = 'tier-row';
      if (i === ITEMS.length - 1) row.classList.add('last');

      const main = document.createElement('div');
      main.className = 'tier-main';

      const glyphEl = document.createElement('div');
      glyphEl.className = `state-glyph ${glyph.cls}`;
      glyphEl.innerHTML = glyph.icon;
      main.appendChild(glyphEl);

      const name = document.createElement('span');
      name.className = 'tier-label';
      if (!na && state === 'missed') name.classList.add('is-didnt');
      name.textContent = label;
      main.appendChild(name);

      row.appendChild(main);

      const controls = document.createElement('div');
      controls.className = 'tier-controls';

      const stateButtons = [
        { value: 'done', text: 'Done' },
        { value: 'in_progress', text: 'In progress' },
        { value: 'missed', text: "Didn't do" },
      ];

      stateButtons.forEach(({ value, text }) => {
        const btn = document.createElement('button');
        btn.className = 'state-pill';
        btn.textContent = text;
        if (state === value && !na) btn.classList.add('active');
        btn.addEventListener('click', () => {
          if (value === 'in_progress') {
            setState(key, 'in_progress');
            openDoing(key, label);
          } else {
            setState(key, value);
          }
        });
        controls.appendChild(btn);
      });

      const naBtn = document.createElement('button');
      naBtn.className = 'state-pill';
      naBtn.textContent = 'N/A today';
      if (na) naBtn.classList.add('na-active');
      naBtn.addEventListener('click', () => toggleNa(key));
      controls.appendChild(naBtn);

      row.appendChild(controls);
      list.appendChild(row);
    });
  }

  // --- init ---

  function init(sharedData, persistFn) {
    data = sharedData;
    persist = persistFn;
    checkDailyReset();
    setupDoingScreen();
    render();
  }

  return { init, render, markDone, recordHistory };
})();
