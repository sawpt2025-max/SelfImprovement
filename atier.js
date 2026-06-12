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

    ITEMS.forEach(({ key, label }) => {
      const li = document.createElement('li');
      li.className = 'bonus-item';

      const btn = document.createElement('button');
      btn.className = 'bonus-check';
      btn.classList.toggle('checked', !!data.aTier.items[key]);
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', () => toggle(key));

      const name = document.createElement('span');
      name.className = 'bonus-label';
      name.textContent = label;

      li.appendChild(btn);
      li.appendChild(name);
      list.appendChild(li);
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
