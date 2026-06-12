// app.js — wiring: data load/save, day-type tag, export/import, init

(function () {
  const data = loadData();
  const persist = () => saveData(data);

  // --- day type (lightweight, V1: just records the tag) ---

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function renderDayType() {
    const today = todayIso();
    if (data.dayType.date !== today) {
      data.dayType.date = today;
      data.dayType.type = null;
      persist();
    }
    document.querySelectorAll('.day-type-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.type === data.dayType.type);
    });
  }

  function setupDayType() {
    document.querySelectorAll('.day-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        data.dayType.type = btn.dataset.type;
        persist();
        renderDayType();
      });
    });
    renderDayType();
  }

  // --- export / import ---

  function setupExportImport() {
    document.getElementById('export-btn').addEventListener('click', () => {
      exportData(data);
    });

    document.getElementById('import-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      importData(file, (err, imported) => {
        if (err) {
          alert('Could not import that file.');
          return;
        }
        Object.assign(data, imported);
        Study.render();
        Checkin.render();
        renderDayType();
      });
      e.target.value = '';
    });
  }

  // --- service worker ---

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  // --- init ---

  Checkin.init(data, persist);
  Study.init(data, persist);
  setupDayType();
  setupExportImport();
  registerServiceWorker();
})();
