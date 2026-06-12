// routines.js — gentle morning/night checklists, not scored

const Routines = (() => {
  let data;
  let persist;

  const MORNING = [
    { key: 'water', label: 'Water' },
    { key: 'noPhone', label: 'No phone on waking' },
    { key: 'light', label: 'Natural light' },
    { key: 'moisturiser', label: 'Moisturiser' },
  ];

  const NIGHT = [
    { key: 'read', label: 'Read 10 min' },
    { key: 'water', label: 'Water' },
    { key: 'retinol', label: 'Retinol' },
    { key: 'moisturiser', label: 'Moisturiser' },
    { key: 'magnesium', label: 'Magnesium' },
  ];

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function checkDailyReset() {
    const today = todayIso();
    if (data.routines.date !== today) {
      data.routines.date = today;
      data.routines.morning = { water: false, noPhone: false, light: false, moisturiser: false };
      data.routines.night = { read: false, water: false, retinol: false, moisturiser: false, magnesium: false };
      persist();
    }
  }

  function toggle(section, key) {
    data.routines[section][key] = !data.routines[section][key];
    persist();
    render();
  }

  function renderList(listId, section, items) {
    const list = document.getElementById(listId);
    list.innerHTML = '';

    items.forEach(({ key, label }) => {
      const li = document.createElement('li');
      li.className = 'bonus-item';

      const btn = document.createElement('button');
      btn.className = 'bonus-check';
      btn.classList.toggle('checked', !!data.routines[section][key]);
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', () => toggle(section, key));

      const name = document.createElement('span');
      name.className = 'bonus-label';
      name.textContent = label;

      li.appendChild(btn);
      li.appendChild(name);
      list.appendChild(li);
    });
  }

  function render() {
    checkDailyReset();
    renderList('morning-list', 'morning', MORNING);
    renderList('night-list', 'night', NIGHT);
  }

  function init(sharedData, persistFn) {
    data = sharedData;
    persist = persistFn;
    checkDailyReset();
    render();
  }

  return { init, render };
})();
