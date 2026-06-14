// atier.js — A-tier bonus checklist (visible, tickable, never a miss)

const ATier = (() => {
  let data;
  let persist;

  const ITEMS = [
    { key: 'gym', label: 'Gym' },
    { key: 'vegetables', label: 'Vegetables' },
    { key: 'noDoomscroll', label: 'No doomscrolling' },
    { key: 'sunscreen', label: 'Sunscreen + moisturiser' },
    { key: 'coldShower', label: 'Cold shower' },
    { key: 'cook', label: 'Cook' },
  ];

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function checkDailyReset() {
    const today = todayIso();
    if (data.aTier.date !== today) {
      data.aTier.date = today;
      data.aTier.items = {
        gym: false,
        vegetables: false,
        noDoomscroll: false,
        sunscreen: false,
        coldShower: false,
        cook: false,
      };
      persist();
    }
  }

  function toggle(key) {
    data.aTier.items[key] = !data.aTier.items[key];
    persist();
    render();
  }

  function render() {
    checkDailyReset();

    const list = document.getElementById('atier-list');
    list.innerHTML = '';

    ITEMS.forEach(({ key, label }, i) => {
      const checked = !!data.aTier.items[key];

      const row = document.createElement('div');
      row.className = 'check-item-row';
      if (i === ITEMS.length - 1) row.classList.add('last');

      const btn = document.createElement('button');
      btn.className = 'check-item';
      if (checked) btn.classList.add('checked');
      btn.addEventListener('click', () => toggle(key));

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

  function init(sharedData, persistFn) {
    data = sharedData;
    persist = persistFn;
    checkDailyReset();
    render();
  }

  return { init, render };
})();
