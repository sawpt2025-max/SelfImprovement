// calendar.js — month grid, gentle look-back (no streaks, no red)

const Calendar = (() => {
  let data;
  let viewDate; // first of the month being viewed

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  function isoDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function todayIso() {
    return isoDate(new Date());
  }

  function render() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    document.getElementById('calendar-month-label').textContent = `${MONTH_NAMES[month]} ${year}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((label) => {
      const head = document.createElement('div');
      head.className = 'calendar-weekday';
      head.textContent = label;
      grid.appendChild(head);
    });

    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first grid
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day calendar-day-empty';
      grid.appendChild(empty);
    }

    const today = todayIso();
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = isoDate(new Date(year, month, day));
      const entry = data.history[iso];

      const cell = document.createElement('div');
      cell.className = 'calendar-day';

      const circle = document.createElement('div');
      circle.className = 'cal-circle';

      if (entry && entry.dayType === 'work') {
        circle.classList.add(entry.sTierDone ? 'cal-circle-work-done' : 'cal-circle-work');
      } else if (entry && entry.dayType === 'rest') {
        circle.classList.add(entry.sTierDone ? 'cal-circle-rest-done' : 'cal-circle-rest');
      } else if (iso === today) {
        circle.classList.add('cal-circle-today');
      } else {
        circle.classList.add('cal-plain');
      }

      circle.textContent = String(day);
      cell.appendChild(circle);
      grid.appendChild(cell);
    }
  }

  function changeMonth(delta) {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
    render();
  }

  function setup() {
    document.getElementById('calendar-prev').addEventListener('click', () => changeMonth(-1));
    document.getElementById('calendar-next').addEventListener('click', () => changeMonth(1));
  }

  function init(sharedData) {
    data = sharedData;
    const now = new Date();
    viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
    setup();
  }

  return { init, render };
})();
