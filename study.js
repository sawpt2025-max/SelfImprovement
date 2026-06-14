// study.js — weekly/total counters + pomodoro focus

const Study = (() => {
  let data;
  let persist;
  let selectedMinutes = 30; // default

  let timer = null; // { mode, totalSeconds, remainingSeconds, elapsedFocusSeconds, paused }

  // --- date helpers ---

  function isoDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function mondayOf(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun..6=Sat
    const diff = (day === 0 ? -6 : 1) - day; // days to subtract to reach Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function checkWeeklyReset() {
    const thisMonday = isoDate(mondayOf(new Date()));
    if (data.study.weekStart !== thisMonday) {
      data.study.weekStart = thisMonday;
      data.study.weekMinutes = 0;
      persist();
    }
  }

  // --- formatting ---

  function formatHM(minutes) {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h ${m}m`;
  }

  function formatHShort(minutes) {
    const hours = minutes / 60;
    return (Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10) + 'h';
  }

  function formatClock(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // --- rendering ---

  function render() {
    checkWeeklyReset();

    const weeklyTargetMin = data.settings.weeklyTargetMinutes;
    const weekMinutes = data.study.weekMinutes;

    document.getElementById('weekly-hours').textContent = formatHM(weekMinutes);
    document.getElementById('weekly-target-label').textContent = `/ ${formatHShort(weeklyTargetMin)}`;

    const pct = Math.min(100, (weekMinutes / weeklyTargetMin) * 100);
    document.getElementById('weekly-progress-fill').style.width = `${pct}%`;

    const remaining = weeklyTargetMin - weekMinutes;
    document.getElementById('weekly-remaining').textContent =
      remaining > 0 ? `${formatHM(remaining)} to your weekly target.` : 'Weekly target reached.';

    renderTotalPopup();
  }

  function renderTotalPopup() {
    const total = data.study.totalMinutes;
    const target = data.settings.totalTargetMinutes;
    const pct = Math.min(100, (total / target) * 100);
    document.getElementById('total-progress-text').textContent =
      `${formatHM(total)} of ${formatHM(target)}`;
    document.getElementById('total-progress-fill').style.width = `${pct}%`;
  }

  // --- duration selection ---

  function updatePomodoroDesc() {
    const el = document.getElementById('pomodoro-desc');
    if (!selectedMinutes || selectedMinutes <= 0) {
      el.textContent = 'Choose a length to start.';
      return;
    }
    el.textContent = `${selectedMinutes} min · then a ${breakMinutesFor(selectedMinutes)} min break`;
  }

  function setupDurationButtons() {
    const buttons = document.querySelectorAll('.duration-btn');
    const customInput = document.getElementById('custom-minutes');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');

        if (btn.dataset.minutes === 'custom') {
          customInput.classList.remove('hidden');
          customInput.focus();
          selectedMinutes = parseInt(customInput.value, 10) || 0;
        } else {
          customInput.classList.add('hidden');
          selectedMinutes = parseInt(btn.dataset.minutes, 10);
        }
        updatePomodoroDesc();
      });
    });

    customInput.addEventListener('input', () => {
      selectedMinutes = parseInt(customInput.value, 10) || 0;
      updatePomodoroDesc();
    });

    updatePomodoroDesc();
  }

  // --- total popup ---

  function setupTotalPopup() {
    document.getElementById('open-total-popup').addEventListener('click', () => {
      renderTotalPopup();
      document.getElementById('total-popup').classList.remove('hidden');
    });
    document.getElementById('close-total-popup').addEventListener('click', () => {
      document.getElementById('total-popup').classList.add('hidden');
    });
  }

  // --- chime (Web Audio, no asset file) ---

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25]; // C5, E5 — gentle two-note chime
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const start = ctx.currentTime + i * 0.25;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
        osc.start(start);
        osc.stop(start + 1.2);
      });
    } catch (e) {
      // Web Audio unavailable — silently skip the chime
    }
  }

  // --- session lifecycle ---

  function breakMinutesFor(focusMinutes) {
    return focusMinutes >= 60 ? 15 : 5;
  }

  function startSession() {
    const minutes = selectedMinutes;
    if (!minutes || minutes <= 0) return;

    timer = {
      mode: 'focus',
      focusMinutes: minutes,
      totalSeconds: minutes * 60,
      remainingSeconds: minutes * 60,
      elapsedFocusSeconds: 0,
      paused: false,
    };

    document.getElementById('focus-notes').value = '';
    showFocusScreen();
    timer.intervalId = setInterval(tickTimer, 1000);
  }

  function tickTimer() {
    if (!timer || timer.paused) return;

    timer.remainingSeconds -= 1;
    if (timer.mode === 'focus') {
      timer.elapsedFocusSeconds += 1;
    }

    if (timer.remainingSeconds <= 0) {
      timer.remainingSeconds = 0;
      updateFocusDisplay();
      handleTimerComplete();
      return;
    }

    updateFocusDisplay();
  }

  function updateFocusDisplay() {
    const seconds = Math.max(0, timer.remainingSeconds);
    document.getElementById('focus-time').textContent = formatClock(seconds);
    document.getElementById('focus-label').textContent =
      timer.mode === 'focus' ? 'Focus' : 'Break';
    document.getElementById('focus-notes').classList.toggle('hidden', timer.mode !== 'focus');

    const elapsed = timer.totalSeconds - timer.remainingSeconds;
    const pct = Math.min(100, (elapsed / timer.totalSeconds) * 100);
    document.getElementById('focus-progress-fill').style.width = `${pct}%`;
  }

  function handleTimerComplete() {
    clearInterval(timer.intervalId);

    if (timer.mode === 'focus') {
      playChime();
      bankSession();

      const breakMinutes = breakMinutesFor(timer.focusMinutes);
      timer = {
        mode: 'break',
        focusMinutes: timer.focusMinutes,
        totalSeconds: breakMinutes * 60,
        remainingSeconds: breakMinutes * 60,
        elapsedFocusSeconds: 0,
        paused: false,
      };
      updateFocusDisplay();
      timer.intervalId = setInterval(tickTimer, 1000);
    } else {
      // break finished — quietly close
      hideFocusScreen();
      timer = null;
    }
  }

  function bankSession() {
    const minutes = timer.elapsedFocusSeconds / 60;
    if (minutes > 0) {
      data.study.weekMinutes += minutes;
      data.study.totalMinutes += minutes;
      data.study.sessions.push({
        date: new Date().toISOString(),
        durationMinutes: minutes,
        notes: document.getElementById('focus-notes').value.trim(),
      });
    }
    Checkin.markDone('study');
    persist();
    render();
  }

  function endFocusEarly() {
    // "Cancel" during focus banks elapsed minutes (partial credit), then closes.
    clearInterval(timer.intervalId);
    bankSession();
    hideFocusScreen();
    timer = null;
  }

  function cancelBreak() {
    clearInterval(timer.intervalId);
    hideFocusScreen();
    timer = null;
  }

  function togglePause() {
    if (!timer) return;
    timer.paused = !timer.paused;
    const btn = document.getElementById('focus-pause');
    btn.innerHTML = timer.paused ? Icons.play : Icons.pause;
    btn.setAttribute('aria-label', timer.paused ? 'Resume' : 'Pause');
  }

  function showFocusScreen() {
    const btn = document.getElementById('focus-pause');
    btn.innerHTML = Icons.pause;
    btn.setAttribute('aria-label', 'Pause');
    updateFocusDisplay();
    document.getElementById('focus-screen').classList.remove('hidden');
  }

  function hideFocusScreen() {
    document.getElementById('focus-screen').classList.add('hidden');
  }

  function setupFocusScreen() {
    document.getElementById('start-session').addEventListener('click', startSession);

    document.getElementById('focus-pause').addEventListener('click', togglePause);

    document.getElementById('focus-cancel').addEventListener('click', () => {
      if (!timer) return;
      if (timer.mode === 'focus') {
        endFocusEarly();
      } else {
        cancelBreak();
      }
    });
  }

  // --- init ---

  function init(sharedData, persistFn) {
    data = sharedData;
    persist = persistFn;
    checkWeeklyReset();
    setupDurationButtons();
    setupTotalPopup();
    setupFocusScreen();
    render();
  }

  return { init, render };
})();
