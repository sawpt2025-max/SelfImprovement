// settings.js — weekly/total targets + JSON export/import

const Settings = (() => {
  let data;
  let persist;
  let onImport;

  function render() {
    document.getElementById('weekly-target-input').value =
      Math.round(data.settings.weeklyTargetMinutes / 60);
    document.getElementById('total-target-input').value =
      Math.round(data.settings.totalTargetMinutes / 60);
  }

  function setupTargets() {
    document.getElementById('weekly-target-input').addEventListener('change', (e) => {
      const hours = Math.max(1, parseInt(e.target.value, 10) || 1);
      data.settings.weeklyTargetMinutes = hours * 60;
      persist();
      Study.render();
    });

    document.getElementById('total-target-input').addEventListener('change', (e) => {
      const hours = Math.max(1, parseInt(e.target.value, 10) || 1);
      data.settings.totalTargetMinutes = hours * 60;
      persist();
      Study.render();
    });
  }

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
        render();
        onImport();
      });
      e.target.value = '';
    });
  }

  function init(sharedData, persistFn, onImportFn) {
    data = sharedData;
    persist = persistFn;
    onImport = onImportFn;
    setupTargets();
    setupExportImport();
    render();
  }

  return { init, render };
})();
