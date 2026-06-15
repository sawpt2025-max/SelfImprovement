// app.js — load data, wire up modules, register service worker

(function () {
  const data = loadData();
  const persist = () => saveData(data);

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  Checkin.init(data, persist);
  ATier.init(data, persist);
  Routines.init(data, persist);
  Study.init(data, persist);
  Settings.init(data, persist, () => {
    Study.render();
    Checkin.render();
    ATier.render();
    Routines.render();
  });
  Calendar.init(data);
  Schedule.init(data, persist);
  Nav.setup(data, persist);
  registerServiceWorker();
})();
