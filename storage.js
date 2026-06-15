// storage.js — localStorage persistence, settings, export/import

const STORAGE_KEY = 'keystone-data-v1';

const DEFAULT_DATA = {
  settings: {
    weeklyTargetMinutes: 12 * 60,
    totalTargetMinutes: 190 * 60,
    wakeTime: '08:30',
  },
  study: {
    weekStart: null, // ISO date (Monday) the current weekly counter started
    weekMinutes: 0,
    totalMinutes: 0,
    sessions: [], // { date, durationMinutes, notes }
  },
  checkin: {
    date: null, // ISO date the current check-in state applies to
    items: {
      wake: 'pending',
      noBanana: 'pending',
      study: 'pending',
    },
    na: {
      wake: false,
      noBanana: false,
      study: false,
    },
  },
  dayType: {
    date: null,
    type: null, // 'work' | 'rest' | 'off'
  },
  aTier: {
    date: null, // ISO date the current bonus state applies to
    items: {
      gym: false,
      vegetables: false,
      noDoomscroll: false,
      sunscreen: false,
      coldShower: false,
      cook: false,
    },
  },
  routines: {
    date: null, // ISO date the current routine state applies to
    morning: {
      water: false,
      noPhone: false,
      light: false,
      moisturiser: false,
    },
    night: {
      read: false,
      water: false,
      retinol: false,
      moisturiser: false,
      magnesium: false,
    },
  },
  history: {}, // { 'YYYY-MM-DD': { dayType, sTierDone } } — feeds the calendar
  schedule: {
    inputs: {
      wakeTime: '08:30',
      restDay: false,
      workStart: '09:00',
      workEnd: '17:00',
      gym: false,
      groceries: false,
      cooking: false,
    },
    // [{ start: 'HH:MM', end: 'HH:MM', label, category }] — empty until Generate is
    // pressed, then frozen until Reset. Never auto-regenerated.
    plan: [],
    note: '', // optional "no room for X today" message
  },
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return mergeDefaults(structuredClone(DEFAULT_DATA), parsed);
  } catch (e) {
    console.error('Failed to load data, using defaults', e);
    return structuredClone(DEFAULT_DATA);
  }
}

function mergeDefaults(defaults, loaded) {
  for (const key of Object.keys(defaults)) {
    if (loaded[key] === undefined) continue;
    if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
      if (Object.keys(defaults[key]).length === 0) {
        // e.g. history: {} — a free-form date-keyed map, take it as-is
        defaults[key] = loaded[key] || {};
      } else {
        defaults[key] = mergeDefaults(defaults[key], loaded[key] || {});
      }
    } else {
      defaults[key] = loaded[key];
    }
  }
  return defaults;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function exportData(data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `keystone-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const merged = mergeDefaults(structuredClone(DEFAULT_DATA), parsed);
      saveData(merged);
      onDone(null, merged);
    } catch (e) {
      onDone(e, null);
    }
  };
  reader.onerror = () => onDone(reader.error, null);
  reader.readAsText(file);
}
