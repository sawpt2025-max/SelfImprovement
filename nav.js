// nav.js — screen routing, day-type recording, home/gear/back

const Nav = (() => {
  let data;
  let persist;

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.toggle('hidden', screen.dataset.screen !== name);
    });
  }

  function goHome() {
    showScreen('home');
  }

  function openStudy() {
    Study.render();
    showScreen('study');
  }

  function openCheckin(dayType) {
    data.dayType.date = todayIso();
    data.dayType.type = dayType;

    const isWork = dayType === 'work';
    const checkinScreen = document.getElementById('checkin-screen');
    const doingScreen = document.getElementById('doing-screen');
    checkinScreen.classList.toggle('surface-dark', isWork);
    checkinScreen.classList.toggle('surface-parchment', !isWork);
    doingScreen.classList.toggle('surface-dark', isWork);
    doingScreen.classList.toggle('surface-parchment', !isWork);

    document.getElementById('checkin-title').textContent = isWork ? 'Work day' : 'Rest day';
    document.getElementById('checkin-mascot').src = isWork
      ? './icons/monkey/work.png'
      : './icons/monkey/reading.png';
    document.getElementById('checkin-date').textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    Checkin.render();
    ATier.render();
    Routines.render();
    Checkin.recordHistory();
    persist();
    showScreen('checkin');
  }

  function openSettings() {
    Settings.render();
    showScreen('settings');
  }

  function openCalendar() {
    Calendar.render();
    showScreen('calendar');
  }

  function setup(sharedData, persistFn) {
    data = sharedData;
    persist = persistFn;

    document.getElementById('nav-study').addEventListener('click', openStudy);
    document.getElementById('nav-work').addEventListener('click', () => openCheckin('work'));
    document.getElementById('nav-rest').addEventListener('click', () => openCheckin('rest'));
    document.getElementById('open-settings').addEventListener('click', openSettings);
    document.getElementById('open-calendar').addEventListener('click', openCalendar);

    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', goHome);
    });

    goHome();
  }

  return { setup, showScreen, goHome };
})();
