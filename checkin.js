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
    return new Date().toISOString().slice(0, 10);
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

  function render() {
    checkDailyReset();

    const list = document.getElementById('checkin-list');
    list.innerHTML = '';

    ITEMS.forEach(({ key, label }) => {
      const state = data.checkin.items[key];
      const na = data.checkin.na[key];

      const li = document.createElement('li');
      li.className = 'checkin-item';
      if (na) {
        li.classList.add('state-na');
      } else if (state === 'done') {
        li.classList.add('state-done');
      } else if (state === 'missed') {
        li.classList.add('state-missed');
      }

      const name = document.createElement('span');
      name.className = 'checkin-item-name';
      name.textContent = label;
      li.appendChild(name);

      const controls = document.createElement('div');
      controls.className = 'checkin-controls';

      const stateButtons = [
        { value: 'done', text: 'Done' },
        { value: 'in_progress', text: 'In progress' },
        { value: 'missed', text: "Didn't do" },
      ];

      stateButtons.forEach(({ value, text }) => {
        const btn = document.createElement('button');
        btn.className = 'state-btn';
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
      naBtn.className = 'state-btn';
      naBtn.textContent = 'N/A today';
      if (na) naBtn.classList.add('active');
      naBtn.addEventListener('click', () => toggleNa(key));
      controls.appendChild(naBtn);

      li.appendChild(controls);
      list.appendChild(li);
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
