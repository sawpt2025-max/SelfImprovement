// schedule.js — rule-based daily schedule planner.
// Pure suggestion: never reads/writes study, check-in, or history data.

const Schedule = (() => {
  let data;
  let persist;

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  // --- time helpers (minutes since 00:00) ---

  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function toHHMM(mins) {
    mins = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function fmt12(mins) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    let h = h24 % 12;
    if (h === 0) h = 12;
    return m === 0 ? `${h} ${period}` : `${h}:${String(m).padStart(2, '0')} ${period}`;
  }

  // --- constants ---

  const DAY_END = 23 * 60; // 23:00 — last possible end for any non-fixed activity
  const PEAK_START = 10 * 60;
  const PEAK_END = 16 * 60;
  const TRAVEL_HOME_LIB = 30; // home <-> Library A or Library B
  const GYM_MIN = 90;
  const GROCERIES_MIN = 90;
  const COOK_MIN = 60;
  const STUDY_TRAVEL_THRESHOLD = 90; // free windows shorter than this stay home

  const LOC_NAME = { home: 'Home', libraryA: 'Library A', libraryB: 'Library B' };

  // --- interval helpers ---

  function mergeBusy(busy) {
    const sorted = busy.slice().sort((a, b) => a.start - b.start);
    const merged = [];
    for (const b of sorted) {
      if (merged.length && b.start <= merged[merged.length - 1].end) {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end);
      } else {
        merged.push({ start: b.start, end: b.end });
      }
    }
    return merged;
  }

  function freeWindows(busy, rangeStart, rangeEnd) {
    const merged = mergeBusy(busy);
    const windows = [];
    let cursor = rangeStart;
    for (const b of merged) {
      if (b.start > cursor) windows.push({ start: cursor, end: Math.min(b.start, rangeEnd) });
      cursor = Math.max(cursor, b.end);
      if (cursor >= rangeEnd) break;
    }
    if (cursor < rangeEnd) windows.push({ start: cursor, end: rangeEnd });
    return windows.filter((w) => w.end > w.start);
  }

  function findFreeSpan(busy, rangeStart, rangeEnd, span) {
    for (const w of freeWindows(busy, rangeStart, rangeEnd)) {
      if (w.end - w.start >= span) return w.start;
    }
    return null;
  }

  function atLocation(block, loc) {
    if (loc === 'libraryA') return block.category === 'groceries';
    if (loc === 'libraryB') return block.category === 'gym';
    return false;
  }

  function locOf(block) {
    if (block.category === 'gym') return 'libraryB';
    if (block.category === 'groceries') return 'libraryA';
    if (block.category === 'study-peak' || block.category === 'study-light') {
      if (block.label.includes('Library A')) return 'libraryA';
      if (block.label.includes('Library B')) return 'libraryB';
      return 'home';
    }
    return null;
  }

  // collapse "Travel · home" immediately followed by "Travel · to X" when the
  // activities on either side are both at X — a pointless round trip.
  function collapseRedundantTravel(blocks) {
    for (let i = 1; i < blocks.length - 2; i++) {
      const a = blocks[i];
      const b = blocks[i + 1];
      if (
        a.category === 'travel' && a.label === 'Travel · home' &&
        b.category === 'travel' && b.label.startsWith('Travel · to ') &&
        a.end === b.start
      ) {
        const prev = blocks[i - 1];
        const next = blocks[i + 2];
        const prevLoc = locOf(prev);
        const nextLoc = locOf(next);
        if (prevLoc && prevLoc === nextLoc) {
          if (next.category === 'study-peak' || next.category === 'study-light') {
            next.start = a.start;
          } else if (prev.category === 'study-peak' || prev.category === 'study-light') {
            prev.end = b.end;
          } else {
            next.start = a.start;
          }
          blocks.splice(i, 2);
          i -= 2;
        }
      }
    }
    return blocks;
  }

  // --- generation ---

  function generatePlan(inputs, wakeTime) {
    const wakeMin = toMinutes(wakeTime);
    const blocks = [];
    const busy = [];
    const notes = [];

    let isLate = false;
    let commuteStart = null;
    let commuteEnd = null;

    if (!inputs.restDay) {
      const workStartMin = toMinutes(inputs.workStart);
      const workEndMin = toMinutes(inputs.workEnd);
      commuteStart = workStartMin - 60;
      commuteEnd = workEndMin + 60;
      isLate = workEndMin >= toMinutes('19:00');
      blocks.push({ start: commuteStart, end: workStartMin, label: 'Commute', category: 'work' });
      blocks.push({ start: workStartMin, end: workEndMin, label: 'Work', category: 'work' });
      blocks.push({ start: workEndMin, end: commuteEnd, label: 'Commute', category: 'work' });
      busy.push({ start: commuteStart, end: commuteEnd });
    }

    // preferred study location for today
    let studyLoc = 'libraryA';
    if (inputs.gym) studyLoc = 'libraryB';
    else if (inputs.groceries) studyLoc = 'libraryA';

    // --- groceries (Library A / Lidl) ---
    let groceriesHomeArrival = null;
    if (inputs.groceries) {
      const span = TRAVEL_HOME_LIB + GROCERIES_MIN + TRAVEL_HOME_LIB;
      let start = null;
      if (inputs.restDay) {
        start = findFreeSpan(busy, wakeMin, DAY_END, span);
      } else if (isLate) {
        start = findFreeSpan(busy, wakeMin, commuteStart, span);
      } else {
        start = findFreeSpan(busy, commuteEnd, DAY_END, span);
      }
      if (start !== null) {
        const gStart = start + TRAVEL_HOME_LIB;
        const gEnd = gStart + GROCERIES_MIN;
        const homeArrival = gEnd + TRAVEL_HOME_LIB;
        blocks.push({ start, end: gStart, label: 'Travel · to Lidl', category: 'travel' });
        blocks.push({ start: gStart, end: gEnd, label: 'Groceries · Lidl', category: 'groceries' });
        blocks.push({ start: gEnd, end: homeArrival, label: 'Travel · home', category: 'travel' });
        busy.push({ start, end: homeArrival });
        groceriesHomeArrival = homeArrival;
      } else {
        notes.push('No room for groceries today');
      }
    }

    // --- cooking (home) ---
    if (inputs.cooking) {
      let cookStart = null;
      if (!inputs.restDay && isLate) {
        const earliest = groceriesHomeArrival !== null ? groceriesHomeArrival : wakeMin;
        if (earliest + COOK_MIN <= commuteStart) cookStart = earliest;
      } else {
        const earliest = Math.max(
          toMinutes('19:00'),
          inputs.restDay ? wakeMin : commuteEnd,
          groceriesHomeArrival || 0
        );
        if (earliest + COOK_MIN <= DAY_END) cookStart = earliest;
      }
      if (cookStart !== null) {
        blocks.push({ start: cookStart, end: cookStart + COOK_MIN, label: 'Cook', category: 'cook' });
        busy.push({ start: cookStart, end: cookStart + COOK_MIN });
      } else {
        notes.push('No room for cooking today');
      }
    }

    // --- gym (Library B area) ---
    if (inputs.gym) {
      const span = TRAVEL_HOME_LIB + GYM_MIN + TRAVEL_HOME_LIB;
      let placed = false;

      const addGymWithTravel = (s) => {
        const gStart = s + TRAVEL_HOME_LIB;
        const gEnd = gStart + GYM_MIN;
        const homeArrival = gEnd + TRAVEL_HOME_LIB;
        blocks.push({ start: s, end: gStart, label: 'Travel · to Library B', category: 'travel' });
        blocks.push({ start: gStart, end: gEnd, label: 'Gym · Library B', category: 'gym' });
        blocks.push({ start: gEnd, end: homeArrival, label: 'Travel · home', category: 'travel' });
        busy.push({ start: s, end: homeArrival });
      };

      // (a) midday 12:00–15:00, preferred (quieter)
      let start = findFreeSpan(busy, 12 * 60, 15 * 60, span);
      if (start !== null) {
        addGymWithTravel(start);
        placed = true;
      }

      // (b) morning, before noon
      if (!placed) {
        start = findFreeSpan(busy, wakeMin, 12 * 60, span);
        if (start !== null) {
          addGymWithTravel(start);
          placed = true;
        }
      }

      // (c) right before work — folded into the existing commute, no extra travel
      if (!placed && !inputs.restDay) {
        const s = commuteStart - GYM_MIN;
        if (s >= wakeMin && freeWindows(busy, s, commuteStart).some((w) => w.start <= s && w.end >= commuteStart)) {
          blocks.push({ start: s, end: commuteStart, label: 'Gym · Library B', category: 'gym' });
          busy.push({ start: s, end: commuteStart });
          placed = true;
        }
      }

      if (!placed) notes.push('No room for gym today');
    }

    // --- study fills remaining free time, peak hours first ---
    let studyMinutes = 0;
    let windows = freeWindows(busy, wakeMin, DAY_END);
    if (isLate) {
      windows = windows
        .filter((w) => w.start < commuteEnd)
        .map((w) => ({ start: w.start, end: Math.min(w.end, commuteEnd) }));
    }

    windows.forEach((w) => {
      if (w.end - w.start < 15) return;

      let loc = 'home';
      let sStart = w.start;
      let sEnd = w.end;

      if (w.end - w.start >= STUDY_TRAVEL_THRESHOLD) {
        loc = studyLoc;
        let travelIn = TRAVEL_HOME_LIB;
        let travelOut = TRAVEL_HOME_LIB;
        const before = blocks.find((b) => b.end === w.start);
        const after = blocks.find((b) => b.start === w.end);
        if (before && atLocation(before, loc)) travelIn = 0;
        if (after && atLocation(after, loc)) travelOut = 0;

        const candidateStart = w.start + travelIn;
        const candidateEnd = w.end - travelOut;
        if (candidateEnd - candidateStart < 30) {
          loc = 'home';
        } else {
          sStart = candidateStart;
          sEnd = candidateEnd;
          if (travelIn) blocks.push({ start: w.start, end: sStart, label: `Travel · to ${LOC_NAME[loc]}`, category: 'travel' });
          if (travelOut) blocks.push({ start: sEnd, end: w.end, label: 'Travel · home', category: 'travel' });
        }
      }

      // split into peak / lower-focus segments at 10:00 and 16:00
      const cuts = new Set([sStart, sEnd]);
      if (sStart < PEAK_START && sEnd > PEAK_START) cuts.add(PEAK_START);
      if (sStart < PEAK_END && sEnd > PEAK_END) cuts.add(PEAK_END);
      const points = [...cuts].sort((a, b) => a - b);

      for (let i = 0; i < points.length - 1; i++) {
        const segStart = points[i];
        const segEnd = points[i + 1];
        if (segEnd - segStart < 10) continue;
        const peak = segStart >= PEAK_START && segEnd <= PEAK_END;
        blocks.push({
          start: segStart,
          end: segEnd,
          label: `Study · ${LOC_NAME[loc]} — ${peak ? 'peak focus' : 'lower focus'}`,
          category: peak ? 'study-peak' : 'study-light',
        });
        studyMinutes += segEnd - segStart;
      }
    });

    if (studyMinutes === 0) notes.push('A full day — no study room today');

    blocks.sort((a, b) => a.start - b.start);
    collapseRedundantTravel(blocks);
    return {
      plan: blocks.map((b) => ({ start: toHHMM(b.start), end: toHHMM(b.end), label: b.label, category: b.category })),
      note: notes.join('. '),
    };
  }

  // --- daily reset / regeneration ---

  function checkDailyReset() {
    const today = todayIso();
    if (data.schedule.date !== today) {
      data.schedule.date = today;
      const { plan, note } = generatePlan(data.schedule.inputs, data.settings.wakeTime);
      data.schedule.plan = plan;
      data.schedule.note = note;
      persist();
    }
  }

  function regenerate() {
    const { plan, note } = generatePlan(data.schedule.inputs, data.settings.wakeTime);
    data.schedule.plan = plan;
    data.schedule.note = note;
    data.schedule.date = todayIso();
    persist();
    renderTimeline();
  }

  // --- form ---

  const TOGGLES = [
    { key: 'restDay', label: 'Rest day / no work' },
    { key: 'gym', label: 'Gym today' },
    { key: 'groceries', label: 'Groceries today' },
    { key: 'cooking', label: 'Cooking today' },
  ];

  function renderToggles() {
    const list = document.getElementById('schedule-toggles');
    list.innerHTML = '';

    TOGGLES.forEach(({ key, label }, i) => {
      const checked = !!data.schedule.inputs[key];

      const row = document.createElement('div');
      row.className = 'check-item-row';
      if (i === TOGGLES.length - 1) row.classList.add('last');

      const btn = document.createElement('button');
      btn.className = 'check-item';
      if (checked) btn.classList.add('checked');
      btn.addEventListener('click', () => {
        data.schedule.inputs[key] = !data.schedule.inputs[key];
        persist();
        renderToggles();
        updateWorkRowVisibility();
      });

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

  function updateWorkRowVisibility() {
    document.getElementById('sch-work-card').classList.toggle('hidden', !!data.schedule.inputs.restDay);
  }

  function renderForm() {
    document.getElementById('sch-work-start').value = data.schedule.inputs.workStart;
    document.getElementById('sch-work-end').value = data.schedule.inputs.workEnd;
    renderToggles();
    updateWorkRowVisibility();
  }

  function setupForm() {
    document.getElementById('sch-work-start').addEventListener('change', (e) => {
      data.schedule.inputs.workStart = e.target.value;
      persist();
    });
    document.getElementById('sch-work-end').addEventListener('change', (e) => {
      data.schedule.inputs.workEnd = e.target.value;
      persist();
    });
    document.getElementById('sch-generate').addEventListener('click', regenerate);
  }

  // --- timeline rendering ---

  function renderTimeline() {
    const hoursEl = document.getElementById('schedule-hours');
    const blocksEl = document.getElementById('schedule-blocks');
    const noteEl = document.getElementById('schedule-note');
    hoursEl.innerHTML = '';
    blocksEl.innerHTML = '';

    if (data.schedule.note) {
      noteEl.textContent = data.schedule.note;
      noteEl.classList.remove('hidden');
    } else {
      noteEl.classList.add('hidden');
    }

    const wakeMin = toMinutes(data.settings.wakeTime);
    const timelineStart = Math.floor(wakeMin / 60) * 60;
    const timelineEnd = 24 * 60;
    const PX_PER_MIN = 1;

    for (let h = timelineStart; h < timelineEnd; h += 60) {
      const row = document.createElement('div');
      row.className = 'timeline-hour';
      row.style.height = `${60 * PX_PER_MIN}px`;
      const label = document.createElement('span');
      label.className = 'timeline-hour-label';
      label.textContent = fmt12(h);
      row.appendChild(label);
      hoursEl.appendChild(row);
    }

    blocksEl.style.height = `${(timelineEnd - timelineStart) * PX_PER_MIN}px`;

    data.schedule.plan.forEach((b) => {
      const start = toMinutes(b.start);
      const end = toMinutes(b.end);
      const el = document.createElement('div');
      el.className = `timeline-block sch-block-${b.category}`;
      el.style.top = `${(start - timelineStart) * PX_PER_MIN}px`;
      el.style.height = `${Math.max(end - start, 1) * PX_PER_MIN}px`;
      el.textContent = b.label;
      blocksEl.appendChild(el);
    });
  }

  function render() {
    checkDailyReset();
    renderForm();
    renderTimeline();
  }

  function init(sharedData, persistFn) {
    data = sharedData;
    persist = persistFn;
    checkDailyReset();
    setupForm();
    render();
  }

  return { init, render };
})();
