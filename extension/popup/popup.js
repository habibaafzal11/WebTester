var BACKEND = 'http://localhost:3847';
var pollInterval = null;

var urlInput      = document.getElementById('url-input');
var emailInput    = document.getElementById('email-input');
var passwordInput = document.getElementById('password-input');
var runBtn        = document.getElementById('run-btn');
var btnText       = document.getElementById('btn-text');
var statusArea    = document.getElementById('status-area');
var statusText    = document.getElementById('status-text');
var progressFill  = document.getElementById('progress-fill');
var quickStats    = document.getElementById('quick-stats');
var viewReportBtn = document.getElementById('view-report-btn');
var errorBox      = document.getElementById('error-box');
var serverDot     = document.getElementById('server-dot');
var serverLabel   = document.getElementById('server-label');

document.getElementById('creds-toggle').addEventListener('click', function() {
  document.getElementById('creds-section').classList.toggle('visible');
  document.getElementById('creds-arrow').classList.toggle('open');
});

function checkServer() {
  return fetch(BACKEND + '/health', { signal: AbortSignal.timeout(3000) })
    .then(function(r) {
      if (r.ok) { serverDot.classList.add('ok'); serverLabel.textContent = 'Server ready'; return true; }
      throw new Error();
    })
    .catch(function() { serverDot.classList.remove('ok'); serverLabel.textContent = 'Server offline'; return false; });
}

function loadTabUrl() {
  chrome.tabs.query({ active:true, currentWindow:true }, function(tabs) {
    var t = tabs[0];
    if (t && t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('about:'))
      urlInput.value = t.url;
  });
}

function setProgress(pct, msg) {
  progressFill.style.width = pct + '%';
  statusText.textContent = msg;
}

function showError(msg) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
function hideError()     { errorBox.style.display = 'none'; }

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

function startPolling() {
  stopPolling();
  var dots = 0;
  pollInterval = setInterval(function() {
    fetch(BACKEND + '/api/status')
      .then(function(r) { return r.json(); })
      .then(function(st) {
        dots = (dots + 1) % 4;
        var dot = '.'.repeat(dots + 1);
        var msg = (st.message || 'Running') + dot;
        var pct = Math.min(st.progress || 10, 95);
        setProgress(pct, msg);

        if (!st.running) {
          stopPolling();
          if (st.message && st.message.startsWith('Error')) {
            progressFill.style.width = '0%';
            statusArea.style.display = 'none';
            showError('Test failed: ' + st.message);
            runBtn.disabled = false;
            btnText.textContent = 'Run Tests Again';
          } else {
            // Tests done — fetch results
            fetch(BACKEND + '/api/latest-results')
              .then(function(r) { return r.json(); })
              .then(function(data) {
                if (!data || !data.summary) return;
                setProgress(100, 'Done! ' + data.summary.total + ' tests completed.');
                var s = data.summary;
                document.getElementById('stat-total').textContent = s.total;
                document.getElementById('stat-pass').textContent  = s.passed;
                document.getElementById('stat-fail').textContent  = s.failed;
                document.getElementById('stat-warn').textContent  = s.warnings;
                quickStats.style.display = 'grid';
                viewReportBtn.style.display = 'block';
                runBtn.disabled = false;
                btnText.textContent = 'Run Tests Again';
              })
              .catch(function() {
                setProgress(100, 'Done! Open dashboard to view results.');
                viewReportBtn.style.display = 'block';
                runBtn.disabled = false;
                btnText.textContent = 'Run Tests Again';
              });
          }
        }
      })
      .catch(function() {
        // Server may be busy — keep polling
      });
  }, 1500); // poll every 1.5 seconds
}

runBtn.addEventListener('click', async function() {
  var url = urlInput.value.trim();
  if (!url) { showError('Please enter a target URL.'); return; }
  try { new URL(url); } catch(e) { showError('Enter a valid URL starting with http:// or https://'); return; }

  var ok = await checkServer();
  if (!ok) {
    showError('Backend not running!\n\nWindows: double-click start-backend.bat\nMac/Linux: bash start-backend.sh\n\nKeep that window open while testing.');
    return;
  }

  hideError();
  quickStats.style.display = 'none';
  viewReportBtn.style.display = 'none';
  runBtn.disabled = true;
  btnText.textContent = 'Running...';
  statusArea.style.display = 'block';
  setProgress(5, 'Starting test...');

  try {
    // Fire-and-forget — server responds instantly, runs in background
    var res = await fetch(BACKEND + '/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        email: emailInput.value.trim() || undefined,
        password: passwordInput.value || undefined
      }),
      signal: AbortSignal.timeout(10000) // only 10s to get accepted response
    });

    if (!res.ok) {
      var e = await res.json().catch(function(){ return {error:'Server error'}; });
      throw new Error(e.error || 'Server error ' + res.status);
    }

    var data = await res.json();
    if (data.error) throw new Error(data.error);

    // Server accepted - now poll for completion
    setProgress(10, 'Test accepted, loading page...');
    startPolling();

  } catch(err) {
    stopPolling();
    progressFill.style.width = '0%';
    statusArea.style.display = 'none';
    showError('Failed to start test:\n' + err.message);
    runBtn.disabled = false;
    btnText.textContent = 'Run Automated Tests';
  }
});

viewReportBtn.addEventListener('click', function() {
  chrome.tabs.create({ url: BACKEND + '/dashboard' });
});

function resumeIfRunning() {
  // The backend keeps running a test even if the panel/popup was closed
  // mid-run. On (re)open, check whether a test is already in progress and
  // re-attach the UI to it instead of starting fresh / losing progress.
  fetch(BACKEND + '/api/status')
    .then(function(r) { return r.json(); })
    .then(function(st) {
      if (st && st.running) {
        quickStats.style.display = 'none';
        viewReportBtn.style.display = 'none';
        hideError();
        runBtn.disabled = true;
        btnText.textContent = 'Running...';
        statusArea.style.display = 'block';
        setProgress(Math.min(st.progress || 10, 95), st.message || 'Running...');
        startPolling();
      }
    })
    .catch(function() {});
}

checkServer();
loadTabUrl();
resumeIfRunning();
