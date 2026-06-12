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
      if (iso === today) cell.classList.add('calendar-day-today');

      const num = document.createElement('div');
      num.className = 'calendar-day-num';
      num.textContent = String(day);
      cell.appendChild(num);

      const marks = document.createElement('div');
      marks.className = 'calendar-day-marks';

      if (entry && entry.dayType) {
        const dot = document.createElement('span');
        dot.className = `calendar-dot calendar-dot-${entry.dayType}`;
        marks.appendChild(dot);
      }

      if (entry && entry.sTierDone) {
        const check = document.createElement('span');
        check.className = 'calendar-check';
        check.textContent = '✓';
        marks.appendChild(check);
      }

      cell.appendChild(marks);
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
