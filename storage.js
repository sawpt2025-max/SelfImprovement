// storage.js — localStorage persistence, settings, export/import

const STORAGE_KEY = 'keystone-data-v1';

const DEFAULT_DATA = {
  settings: {
    weeklyTargetMinutes: 12 * 60,
    totalTargetMinutes: 190 * 60,
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
      defaults[key] = mergeDefaults(defaults[key], loaded[key] || {});
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
