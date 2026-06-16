// settings.js — weekly/total targets + JSON export/import + push notifications

const Settings = (() => {
  let data;
  let persist;
  let onImport;

  // ── push notification config ─────────────────────────────────────────────────
  // Update PUSH_WORKER_URL after running `wrangler deploy` in /worker.
  const PUSH_WORKER_URL  = 'https://shinpo-push.REPLACE_WITH_YOUR_SUBDOMAIN.workers.dev';
  const VAPID_PUBLIC_KEY = 'BC0GNdEDR-PAb8mWd_RptsRhrHgFigWck-o_e1ZBGW1kfDOBJffW4IXygDnMMdqsTQnu5fphnu6GNio8OztS-wk';

  function urlBase64ToUint8Array(b64u) {
    const padding = '='.repeat((4 - b64u.length % 4) % 4);
    const base64 = (b64u + padding).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  // ── settings render ───────────────────────────────────────────────────────────

  function render() {
    document.getElementById('weekly-target-input').value =
      Math.round(data.settings.weeklyTargetMinutes / 60);
    document.getElementById('total-target-input').value =
      Math.round(data.settings.totalTargetMinutes / 60);

    const hours = data.study.totalMinutes / 60;
    const rounded = Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10;
    document.getElementById('banked-total').textContent = `${rounded}h`;

    document.getElementById('wake-time-input').value = data.settings.wakeTime;
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

    document.getElementById('wake-time-input').addEventListener('change', (e) => {
      if (!e.target.value) return;
      data.settings.wakeTime = e.target.value;
      persist();
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

  // ── push notifications ────────────────────────────────────────────────────────

  function setPushStatus(msg) {
    document.getElementById('push-status').textContent = msg;
  }

  function refreshPushUI() {
    const enableBtn = document.getElementById('push-enable-btn');
    const testBtn   = document.getElementById('push-test-btn');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('Push notifications not supported in this browser.');
      enableBtn.disabled = true;
      return;
    }

    // iOS requires the app to be installed to the home screen for push to work.
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIos && !navigator.standalone) {
      setPushStatus('Add this app to your Home Screen first, then tap Enable.');
      enableBtn.disabled = true;
      return;
    }

    const perm = Notification.permission;
    if (perm === 'denied') {
      setPushStatus('Notifications are blocked. Enable them in iOS Settings > Safari > Notifications.');
      enableBtn.disabled = true;
    } else if (perm === 'granted') {
      setPushStatus('Study alerts are enabled.');
      enableBtn.textContent = 'Re-enable';
      testBtn.classList.remove('hidden');
    }
  }

  async function enablePush() {
    setPushStatus('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushStatus('Permission not granted.'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const res = await fetch(`${PUSH_WORKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);

      setPushStatus('Study alerts enabled.');
      document.getElementById('push-enable-btn').textContent = 'Re-enable';
      document.getElementById('push-test-btn').classList.remove('hidden');
    } catch (e) {
      setPushStatus('Error: ' + e.message);
    }
  }

  async function sendTestPush() {
    setPushStatus('Sending…');
    try {
      const res = await fetch(`${PUSH_WORKER_URL}/test-send`, { method: 'POST' });
      setPushStatus(res.ok ? 'Test push sent — lock your phone to see it.' : `Error ${res.status}: ${await res.text()}`);
    } catch (e) {
      setPushStatus('Error: ' + e.message);
    }
  }

  function setupPushNotifications() {
    document.getElementById('push-enable-btn').addEventListener('click', enablePush);
    document.getElementById('push-test-btn').addEventListener('click', sendTestPush);
    refreshPushUI();
  }

  // ── init ──────────────────────────────────────────────────────────────────────

  function init(sharedData, persistFn, onImportFn) {
    data = sharedData;
    persist = persistFn;
    onImport = onImportFn;
    setupTargets();
    setupExportImport();
    setupPushNotifications();
    render();
  }

  return { init, render };
})();
