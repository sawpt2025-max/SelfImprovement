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

    items.forEach(({ key, label }, i) => {
      const checked = !!data.routines[section][key];

      const row = document.createElement('div');
      row.className = 'check-item-row';
      if (i === items.length - 1) row.classList.add('last');

      const btn = document.createElement('button');
      btn.className = 'check-item';
      if (checked) btn.classList.add('checked');
      btn.addEventListener('click', () => toggle(section, key));

      const circle = document.createElement('span');
      circle.className = 'check-circle';
      if (checked) {
        circle.classList.add('checked');
        circle.innerHTML = Icons.check;
      }

      const name = document.createElement('span');
      name.className = 'check-label';
      name.textContent = label;

      btn.appendChild(circle);
      btn.appendChild(name);
      row.appendChild(btn);
      list.appendChild(row);
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
