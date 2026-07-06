function getDashboardHTML() {
return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WebTester Pro - Dashboard</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
:root{
  --bg:#09090f;
  --surface:#111118;
  --surface2:#1a1a26;
  --border:#ffffff0d;

  --text:#e2e8f0;
  --muted:#475569;

  --stat-label:#cbd5e1;
  --stat-hint:#94a3b8;S

  --accent:#6366f1;
  --accent2:#8b5cf6;

  --pass:#22c55e;
  --pass-bg:#052e16;
  --fail:#ef4444;
  --fail-bg:#2d0a0a;
  --warn:#f59e0b;
  --warn-bg:#2d1c00;
  --skip:#475569;
  --skip-bg:#0f172a;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.topbar{height:56px;background:var(--surface);border-bottom:1px solid var(--border);
  padding:0 28px;display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:200}
.brand{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;color:#fff}
.brand-sub{font-size:11px;font-weight:400;color:var(--muted);margin-left:2px}
.topbar-right{display:flex;align-items:center;gap:10px}
.status-pill{display:flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;
  font-size:12px;font-weight:600;background:var(--surface2);border:1px solid var(--border)}
.pulse{width:7px;height:7px;border-radius:50%;background:var(--pass);
  box-shadow:0 0 0 0 rgba(34,197,94,.4);animation:ping 2s infinite}
.pulse.red{background:var(--fail);box-shadow:none;animation:none}
.pulse.yellow{background:var(--warn);animation:none}
@keyframes ping{0%{box-shadow:0 0 0 0 rgba(34,197,94,.4)}70%{box-shadow:0 0 0 6px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
.topbtn{padding:6px 14px;border-radius:8px;border:1px solid var(--border);
  background:transparent;color:var(--muted);font-size:12px;font-weight:600;
  cursor:pointer;transition:all .15s;font-family:inherit}
.topbtn:hover{border-color:var(--accent);color:var(--accent)}
.topbtn.pdf{border-color:var(--accent2);color:var(--accent2)}
.topbtn.pdf:hover{background:var(--accent2);color:#fff}
.main{max-width:1200px;margin:0 auto;padding:22px 20px}
.screen{display:none;min-height:75vh;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px}
.screen.on{display:flex}
#scr-results{display:none}
#scr-results.on{display:block}
.spin-ring{width:48px;height:48px;border:4px solid var(--surface2);
  border-top-color:var(--accent);border-radius:50%;animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.spin-txt{font-size:14px;color:var(--muted)}
.big-icon{font-size:52px;margin-bottom:4px}
.big-h{font-size:20px;font-weight:800}
.big-p{font-size:13px;color:var(--muted);line-height:1.9;max-width:400px}
.info-box{background:var(--surface);border:1px solid var(--border);border-radius:10px;
  padding:16px 22px;text-align:left;max-width:420px;width:100%;font-size:13px;line-height:2}
.info-box.err{border-color:#7f1d1d}
.info-box code{font-family:'JetBrains Mono',monospace;color:var(--accent);
  background:var(--surface2);padding:1px 7px;border-radius:4px;font-size:12px}
.retry-btn{padding:9px 24px;border-radius:8px;border:none;
  background:var(--accent);color:#fff;font-size:13px;font-weight:700;
  cursor:pointer;font-family:inherit}
.retry-btn:hover{opacity:.85}
#err-detail{font-size:11px;color:var(--fail);margin-top:4px;font-family:'JetBrains Mono',monospace;max-width:420px;word-break:break-all}
.hero{margin-bottom:18px}
.hero-meta{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
.hero-url{font-size:18px;font-weight:800;color:#fff;word-break:break-all;margin-bottom:4px}
.hero-sub{font-size:12px;color:var(--muted)}
.banner{border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;margin-bottom:18px;border:1px solid}
.banner.fail{background:var(--fail-bg);border-color:#7f1d1d}
.banner.warn{background:var(--warn-bg);border-color:#78350f}
.banner.pass{background:var(--pass-bg);border-color:#14532d}
.banner-icon{font-size:22px;flex-shrink:0}
.banner-title{font-size:14px;font-weight:700}
.banner-sub{font-size:12px;color:var(--muted);margin-top:2px}

/* STAT CARDS - functional global filters */
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:22px}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:16px 14px;text-align:center;cursor:pointer;transition:all .15s;
  position:relative;overflow:hidden;user-select:none}
.stat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;
  background:currentColor;opacity:.25;transition:opacity .15s}
.stat:hover::after{opacity:.7}
.stat.active{border-color:currentColor;background:var(--surface2)}
.stat.active::after{opacity:1}
.stat-n{font-size:34px;font-weight:800;line-height:1;margin-bottom:4px}
.stat-l{
    font-size:11px;
    font-weight:700;
    color:var(--stat-label);
    text-transform:uppercase;
    letter-spacing:.08em;
}
.stat-hint{
    font-size:10px;
    color:var(--stat-hint);
    margin-top:6px;
    line-height:1.4;
    opacity:1;
}

.row2{display:grid;grid-template-columns:1fr 250px;gap:16px;margin-bottom:22px}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px}
.panel-h{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px}
.donut-row{display:flex;align-items:center;gap:20px}
.legend{display:flex;flex-direction:column;gap:9px;flex:1}
.leg-item{display:flex;align-items:center;justify-content:space-between;font-size:13px}
.leg-dot{width:9px;height:9px;border-radius:2px;margin-right:7px;flex-shrink:0}
.leg-label{display:flex;align-items:center;flex:1;color:var(--text)}
.leg-n{font-weight:700;font-size:14px}
.pr-row{margin-top:14px;display:flex;align-items:center;gap:10px;font-size:13px}
.pr-bar-wrap{flex:1;height:5px;background:var(--surface2);border-radius:3px;overflow:hidden}
.pr-bar{height:100%;border-radius:3px;transition:width .8s ease}
.pr-pct{font-weight:800;font-size:15px;min-width:40px;text-align:right}
.el-rows{display:flex;flex-direction:column;gap:7px}
.el-row{display:flex;align-items:center;gap:8px;font-size:12px}
.el-name{color:var(--text);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.el-bw{width:70px;height:5px;background:var(--surface2);border-radius:3px;overflow:hidden;flex-shrink:0}
.el-b{height:100%;background:var(--accent);border-radius:3px}
.el-n{font-size:12px;font-weight:700;color:var(--muted);min-width:20px;text-align:right}

/* ── SINGLE CATEGORIES PANEL ── (one container, all categories listed inside) */
.categories-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:18px}
.categories-panel-h{padding:14px 18px;border-bottom:1px solid var(--border);
  font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;
  display:flex;align-items:center;justify-content:space-between}
.cat-list{display:flex;flex-direction:column}
.cat-row{border-bottom:1px solid var(--border)}
.cat-row:last-child{border-bottom:none}
.cat-row-head{display:flex;align-items:center;justify-content:space-between;
  padding:13px 18px;cursor:pointer;transition:background .12s;user-select:none}
.cat-row-head:hover{background:var(--surface2)}
.cat-row-head.expanded{background:var(--surface2)}
.cat-row-left{display:flex;align-items:center;gap:10px}
.cat-chevron{font-size:10px;color:var(--muted);transition:transform .15s;width:12px;display:inline-block}
.cat-row-head.expanded .cat-chevron{transform:rotate(90deg)}
.cat-row-title{font-size:13px;font-weight:700;color:#fff}
.cat-row-count{font-size:11px;color:var(--muted);background:var(--surface2);padding:1px 8px;border-radius:8px}
.cat-row-badges{display:flex;gap:6px}
.crb{font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px}
.crb-fail{color:var(--fail);background:var(--fail-bg)}
.crb-warn{color:var(--warn);background:var(--warn-bg)}
.crb-pass{color:var(--pass);background:var(--pass-bg)}

.cat-row-body{display:none;padding:0 18px 16px}
.cat-row-body.open{display:block}

.status-filter{display:flex;gap:5px;margin:10px 0 12px;flex-wrap:wrap}
.sf-btn{padding:4px 11px;border-radius:16px;border:1px solid var(--border);background:transparent;
  color:var(--muted);font-size:11px;font-weight:600;cursor:pointer;transition:all .12s;font-family:inherit}
.sf-btn.sf-on{color:#fff}
.sf-btn.sf-all.sf-on{background:var(--accent);border-color:var(--accent)}
.sf-btn.sf-fail.sf-on{background:var(--fail);border-color:var(--fail)}
.sf-btn.sf-warn.sf-on{background:var(--warn);border-color:var(--warn)}
.sf-btn.sf-pass.sf-on{background:var(--pass);border-color:var(--pass)}
.sf-btn.sf-skip.sf-on{background:var(--skip);border-color:var(--skip)}

.cards{display:flex;flex-direction:column;gap:6px}
.card{background:var(--bg);border:1px solid var(--border);border-left:3px solid transparent;
  border-radius:9px;cursor:pointer;transition:background .12s;overflow:hidden}
.card:hover{background:#15151f}
.card.fail{border-left-color:var(--fail)}.card.warn{border-left-color:var(--warn)}
.card.pass{border-left-color:var(--pass)}.card.skip{border-left-color:var(--skip)}
.card.card-hidden{display:none}
.card-top{display:grid;grid-template-columns:72px 1fr auto auto auto;align-items:center;gap:12px;padding:11px 14px}
.c-id{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)}
.c-name{font-size:13px;font-weight:500}
.c-cat{font-size:11px;color:var(--muted);margin-top:1px}
.badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;white-space:nowrap}
.b-crit{color:#c084fc;background:#1e0a3c}.b-high{color:var(--fail);background:var(--fail-bg)}
.b-med{color:var(--warn);background:var(--warn-bg)}.b-low{color:var(--skip);background:var(--skip-bg)}
.s-pass{color:var(--pass);background:var(--pass-bg)}.s-fail{color:var(--fail);background:var(--fail-bg)}
.s-warn{color:var(--warn);background:var(--warn-bg)}.s-skip{color:var(--skip);background:var(--skip-bg)}
.c-ms{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace}
.card-detail{display:none;padding:0 14px 13px;border-top:1px solid var(--border)}
.card-detail.open{display:block}
.d-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:11px 0 4px}
.d-desc{font-size:12px;color:var(--muted);line-height:1.7}
.d-result{font-family:'JetBrains Mono',monospace;font-size:12px;padding:10px 13px;border-radius:8px;word-break:break-word;line-height:1.6;margin-top:6px}
.d-err{background:var(--fail-bg);color:#fca5a5;border:1px solid #7f1d1d}
.d-ok{background:var(--pass-bg);color:#86efac;border:1px solid #14532d}
.d-warn{background:var(--warn-bg);color:#fde68a;border:1px solid #78350f}
.no-results{text-align:center;padding:24px;font-size:13px;color:var(--muted)}

@media print{
  .topbar,.topbtn,.status-filter{display:none!important}
  .cat-row-body{display:block!important}
  .card-detail{display:block!important}
  body{background:#fff;color:#000}
  .card{break-inside:avoid;background:#f9f9f9;border-color:#ddd}
  .card-top{grid-template-columns:60px 1fr auto auto}
  .c-ms{display:none}
}
@media(max-width:860px){.stats{grid-template-columns:repeat(3,1fr)}.row2{grid-template-columns:1fr}}
@media(max-width:540px){.stats{grid-template-columns:repeat(2,1fr)}.card-top{grid-template-columns:1fr auto auto}.c-id,.c-ms{display:none}}
</style>
</head>
<body>

<div class="topbar">
  <div class="brand">&#129514; WebTester Pro <span class="brand-sub">/ Dashboard</span></div>
  <div class="topbar-right">
    <div class="status-pill">
      <div class="pulse yellow" id="pulse-dot"></div>
      <span id="status-txt">Connecting...</span>
    </div>
    <button class="topbtn" id="btn-refresh">Refresh</button>
    <button class="topbtn pdf" id="btn-pdf">Export PDF</button>
  </div>
</div>

<div class="main">

  <div class="screen on" id="scr-loading">
    <div class="spin-ring"></div>
    <div class="spin-txt">Connecting to backend...</div>
  </div>

  <div class="screen" id="scr-offline">
    <div class="big-icon">&#128268;</div>
    <div class="big-h" style="color:var(--fail)">Backend Not Running</div>
    <div class="big-p">The WebTester Pro backend must be started before the dashboard works.</div>
    <div class="info-box err">
      <strong>How to start it:</strong><br>
      Windows: double-click <code>start-backend.bat</code><br>
      Mac/Linux: open terminal, run <code>bash start-backend.sh</code><br><br>
      Keep that terminal open, then click Retry below.
    </div>
    <div id="err-detail"></div>
    <button class="retry-btn" id="btn-retry">Retry Now</button>
  </div>

  <div class="screen" id="scr-empty">
    <div class="big-icon">&#129514;</div>
    <div class="big-h" style="color:#fff">Ready - No Tests Yet</div>
    <div class="big-p">Backend is running. Run a test from the Chrome extension and results appear here automatically.</div>
    <div class="info-box">
      1. Click the WebTester Pro extension icon in Chrome<br>
      2. Enter a website URL<br>
      3. Click Run Automated Tests<br>
      4. Click Refresh above when it finishes
    </div>
  </div>

  <div id="scr-results">
    <div class="hero">
      <div class="hero-meta">Last Test Run</div>
      <div class="hero-url" id="h-url"></div>
      <div class="hero-sub" id="h-sub"></div>
    </div>
    <div id="banner" class="banner"></div>

    <!-- Functional global stat filters -->
    <div class="stats">
      <div class="stat active" data-status="ALL" style="color:var(--accent)">
        <div class="stat-n" id="sn-total">0</div><div class="stat-l">Total</div>
        <div class="stat-hint">Show all tests</div>
      </div>
      <div class="stat" data-status="PASS" style="color:var(--pass)">
        <div class="stat-n" id="sn-pass">0</div><div class="stat-l">Passed</div>
        <div class="stat-hint">Show passed only</div>
      </div>
      <div class="stat" data-status="FAIL" style="color:var(--fail)">
        <div class="stat-n" id="sn-fail">0</div><div class="stat-l">Failed</div>
        <div class="stat-hint">Show failed only</div>
      </div>
      <div class="stat" data-status="WARN" style="color:var(--warn)">
        <div class="stat-n" id="sn-warn">0</div><div class="stat-l">Warnings</div>
        <div class="stat-hint">Show warnings only</div>
      </div>
      <div class="stat" data-status="SKIP" style="color:var(--skip)">
        <div class="stat-n" id="sn-skip">0</div><div class="stat-l">Skipped</div>
        <div class="stat-hint">Show skipped only</div>
      </div>
    </div>

    <div class="row2">
      <div class="panel">
        <div class="panel-h">Pass Rate</div>
        <div class="donut-row">
          <canvas id="donut" width="120" height="120"></canvas>
          <div class="legend" id="legend"></div>
        </div>
        <div class="pr-row">
          <span style="font-size:12px;color:var(--muted)">Overall</span>
          <div class="pr-bar-wrap"><div class="pr-bar" id="pr-bar"></div></div>
          <div class="pr-pct" id="pr-pct"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-h">Elements Found</div>
        <div class="el-rows" id="el-rows"></div>
      </div>
    </div>

    <!-- SINGLE categories panel - all categories listed, expand/collapse each -->
    <div class="categories-panel">
      <div class="categories-panel-h">
        <span>Test Categories</span>
        <span id="cat-summary"></span>
      </div>
      <div class="cat-list" id="cat-list"></div>
    </div>

  </div>
</div>

<script>
var allData = null;
var gFilter = 'ALL';
var catFilter = {};
var expandedCats = {};
var isFirstLoad = true;
var hasRenderedOnce = false;

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function show(id) {
  var ids = ['scr-loading','scr-offline','scr-empty','scr-results'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (!el) continue;
    if (ids[i] === id) {
      el.style.display = (id === 'scr-results') ? 'block' : 'flex';
      el.classList.add('on');
    } else {
      el.style.display = 'none';
      el.classList.remove('on');
    }
  }
}

function setPulse(state, txt) {
  var dot = document.getElementById('pulse-dot');
  var label = document.getElementById('status-txt');
  dot.className = 'pulse' + (state === 'ok' ? '' : state === 'warn' ? ' yellow' : ' red');
  label.textContent = txt;
}

function fetchTimeout(url, ms) {
  return new Promise(function(resolve, reject) {
    var done = false;
    var timer = setTimeout(function() {
      if (!done) { done = true; reject(new Error('Request timed out')); }
    }, ms);
    fetch(url).then(function(r) {
      if (done) return;
      done = true; clearTimeout(timer); resolve(r);
    }).catch(function(e) {
      if (done) return;
      done = true; clearTimeout(timer); reject(e);
    });
  });
}

/* MANUAL load only - triggered by Refresh button / Retry button / initial page load.
   NOT auto-polled, so it never resets your open category or filter selection. */
function load() {
  if (isFirstLoad) show('scr-loading');
  setPulse('warn', 'Connecting...');

  fetchTimeout('http://localhost:3847/health', 4000)
    .then(function(r) {
      if (!r.ok) throw new Error('Health check failed: ' + r.status);
      return fetchTimeout('http://localhost:3847/api/latest-results', 6000);
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      isFirstLoad = false;
      if (!data || !data.results || !data.results.length) {
        setPulse('ok', 'Backend ready');
        show('scr-empty');
      } else {
        allData = data;
        setPulse('ok', 'Last run: ' + (data.testedAt || ''));
        show('scr-results');
        render(data);
        hasRenderedOnce = true;
      }
    })
    .catch(function(err) {
      isFirstLoad = false;
      setPulse('red', 'Backend offline');
      if (hasRenderedOnce) {
        setPulse('red', 'Backend offline - showing last loaded results');
        return;
      }
      var detail = (err && err.message) ? err.message : String(err);
      var detailEl = document.getElementById('err-detail');
      if (detailEl) detailEl.textContent = 'Error: ' + detail;
      show('scr-offline');
    });
}

function render(d) {
  var s = d.summary;
  document.getElementById('h-url').textContent = d.url || '';
  document.getElementById('h-sub').textContent =
    'Tested ' + (d.testedAt || '') + ' | ' +
    (s.duration / 1000).toFixed(1) + 's | ' +
    s.elementCount + ' elements found';

  var bn = document.getElementById('banner');
  if (s.failed > 0) {
    bn.className = 'banner fail';
    bn.innerHTML = '<div class="banner-icon">&#128027;</div><div>' +
      '<div class="banner-title" style="color:var(--fail)">' + s.failed + ' failure' + (s.failed !== 1 ? 's' : '') + ' detected' +
      (s.warnings ? ' + ' + s.warnings + ' warning' + (s.warnings !== 1 ? 's' : '') : '') + '</div>' +
      '<div class="banner-sub">Click the Failed stat card above to see every failure across all categories.</div></div>';
  } else if (s.warnings > 0) {
    bn.className = 'banner warn';
    bn.innerHTML = '<div class="banner-icon">&#9888;&#65039;</div><div>' +
      '<div class="banner-title" style="color:var(--warn)">' + s.warnings + ' warning' + (s.warnings !== 1 ? 's' : '') + ' need review</div>' +
      '<div class="banner-sub">No failures. Click Warnings stat card to review.</div></div>';
  } else {
    bn.className = 'banner pass';
    bn.innerHTML = '<div class="banner-icon">&#127881;</div><div>' +
      '<div class="banner-title" style="color:var(--pass)">All ' + s.total + ' tests passed!</div>' +
      '<div class="banner-sub">No failures or warnings detected on this run.</div></div>';
  }

  document.getElementById('sn-total').textContent = s.total;
  document.getElementById('sn-pass').textContent  = s.passed;
  document.getElementById('sn-fail').textContent  = s.failed;
  document.getElementById('sn-warn').textContent  = s.warnings;
  document.getElementById('sn-skip').textContent  = s.skipped;

  drawDonut(s);

  var ld = [['Passed', s.passed, '#22c55e'], ['Failed', s.failed, '#ef4444'], ['Warnings', s.warnings, '#f59e0b'], ['Skipped', s.skipped, '#475569']];
  document.getElementById('legend').innerHTML = ld.map(function(l) {
    return '<div class="leg-item"><div class="leg-label"><div class="leg-dot" style="background:' + l[2] + '"></div>' + l[0] + '</div><div class="leg-n" style="color:' + l[2] + '">' + l[1] + '</div></div>';
  }).join('');

  var pct = s.passRate || 0;
  var pc = pct >= 80 ? 'var(--pass)' : pct >= 50 ? 'var(--warn)' : 'var(--fail)';
  document.getElementById('pr-pct').textContent = pct + '%';
  document.getElementById('pr-pct').style.color = pc;
  document.getElementById('pr-bar').style.width = pct + '%';
  document.getElementById('pr-bar').style.background = pc;

  var em = d.elementCategories || {};
  var mx = Math.max.apply(null, Object.values(em).concat([1]));
  var elRowsHtml = Object.entries(em).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 12)
    .map(function(e) {
      return '<div class="el-row"><div class="el-name">' + esc(e[0]) + '</div>' +
        '<div class="el-bw"><div class="el-b" style="width:' + Math.round(e[1] / mx * 100) + '%"></div></div>' +
        '<div class="el-n">' + e[1] + '</div></div>';
    }).join('');
  document.getElementById('el-rows').innerHTML = elRowsHtml || '<div style="font-size:12px;color:var(--muted)">None detected</div>';

  buildCategoryList(d.results);
}

/* ── Build the single category list - Security pinned to top ── */
function buildCategoryList(tests) {
  var byCat = {};
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var c = t.category || 'Other';
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(t);
  }

  // Security ALWAYS first, then the rest by failure count (most important first)
  var catNames = Object.keys(byCat);
  catNames.sort(function(a, b) {
    if (a === 'Security') return -1;
    if (b === 'Security') return 1;
    var af = byCat[a].filter(function(x){return x.status==='FAIL';}).length;
    var bf = byCat[b].filter(function(x){return x.status==='FAIL';}).length;
    return bf - af;
  });

  var listEl = document.getElementById('cat-list');
  listEl.innerHTML = '';

  document.getElementById('cat-summary').textContent = catNames.length + ' categories';

  for (var ci = 0; ci < catNames.length; ci++) {
    (function(cat) {
      var items = byCat[cat];
      var nf = items.filter(function(i) { return i.status === 'FAIL'; }).length;
      var nw = items.filter(function(i) { return i.status === 'WARN'; }).length;
      var np = items.filter(function(i) { return i.status === 'PASS'; }).length;
      var ns = items.filter(function(i) { return i.status === 'SKIP'; }).length;
      var safeCatId = cat.replace(/[^a-zA-Z0-9]/g, '-');

      if (!(cat in catFilter)) catFilter[cat] = 'ALL';
      if (!(cat in expandedCats)) expandedCats[cat] = (cat === 'Security'); // Security open by default

      var row = document.createElement('div');
      row.className = 'cat-row';
      row.setAttribute('data-cat', cat);

      // Header (click to expand/collapse)
      var head = document.createElement('div');
      head.className = 'cat-row-head' + (expandedCats[cat] ? ' expanded' : '');

      var left = document.createElement('div');
      left.className = 'cat-row-left';
      var chevron = document.createElement('span');
      chevron.className = 'cat-chevron';
      chevron.innerHTML = '&#9656;';
      var title = document.createElement('span');
      title.className = 'cat-row-title';
      title.textContent = cat;
      var count = document.createElement('span');
      count.className = 'cat-row-count';
      count.textContent = items.length + ' tests';
      left.appendChild(chevron);
      left.appendChild(title);
      left.appendChild(count);

      var badges = document.createElement('div');
      badges.className = 'cat-row-badges';
      if (nf) { var b1=document.createElement('span'); b1.className='crb crb-fail'; b1.textContent=nf+' failed'; badges.appendChild(b1); }
      if (nw) { var b2=document.createElement('span'); b2.className='crb crb-warn'; b2.textContent=nw+' warnings'; badges.appendChild(b2); }
      if (!nf && !nw && np) { var b3=document.createElement('span'); b3.className='crb crb-pass'; b3.textContent='all passed'; badges.appendChild(b3); }

      head.appendChild(left);
      head.appendChild(badges);
      head.addEventListener('click', function() {
        expandedCats[cat] = !expandedCats[cat];
        head.classList.toggle('expanded');
        body.classList.toggle('open');
      });
      row.appendChild(head);

      // Body (status filters + cards)
      var body = document.createElement('div');
      body.className = 'cat-row-body' + (expandedCats[cat] ? ' open' : '');
      body.id = 'body-' + safeCatId;

      var sf = document.createElement('div');
      sf.className = 'status-filter';
      var sfDefs = [
        ['ALL','sf-all','All ('+items.length+')', true],
        ['FAIL','sf-fail','Failed ('+nf+')', nf>0],
        ['WARN','sf-warn','Warnings ('+nw+')', nw>0],
        ['PASS','sf-pass','Passed ('+np+')', np>0],
        ['SKIP','sf-skip','Skipped ('+ns+')', ns>0]
      ];
      for (var si = 0; si < sfDefs.length; si++) {
        if (!sfDefs[si][3]) continue;
        var sfBtn = document.createElement('button');
        sfBtn.className = 'sf-btn ' + sfDefs[si][1] + (sfDefs[si][0] === catFilter[cat] ? ' sf-on' : '');
        sfBtn.textContent = sfDefs[si][2];
        (function(status, btn) {
          btn.addEventListener('click', function(ev) {
            ev.stopPropagation();
            catFilter[cat] = status;
            var allSf = sf.querySelectorAll('.sf-btn');
            for (var z=0; z<allSf.length; z++) allSf[z].classList.remove('sf-on');
            btn.classList.add('sf-on');
            applyFilterToCards(cardsWrap, status);
          });
        })(sfDefs[si][0], sfBtn);
        sf.appendChild(sfBtn);
      }
      body.appendChild(sf);

      var cardsWrap = document.createElement('div');
      cardsWrap.className = 'cards';
      for (var ti = 0; ti < items.length; ti++) {
        cardsWrap.appendChild(buildCardEl(items[ti]));
      }
      body.appendChild(cardsWrap);

      // Apply existing filter state (e.g. from a global stat-card click)
      applyFilterToCards(cardsWrap, catFilter[cat]);

      row.appendChild(body);
      listEl.appendChild(row);
    })(catNames[ci]);
  }
}

function buildCardEl(t) {
  var st = (t.status || 'SKIP').toLowerCase();
  var pri = (t.priority || 'low').toLowerCase();
  var pc = pri === 'critical' ? 'b-crit' : pri === 'high' ? 'b-high' : pri === 'medium' ? 'b-med' : 'b-low';
  var detail = t.error || t.details || '';
  var dc = t.error ? 'd-err' : t.status === 'WARN' ? 'd-warn' : 'd-ok';

  var card = document.createElement('div');
  card.className = 'card ' + st;
  card.setAttribute('data-status', t.status || '');
  card.addEventListener('click', function() { tog(card); });

  var top = document.createElement('div');
  top.className = 'card-top';
  top.innerHTML =
    '<div class="c-id">' + esc(t.id || '') + '</div>' +
    '<div><div class="c-name">' + esc(t.name || '') + '</div><div class="c-cat">' + esc(t.category || '') + '</div></div>' +
    '<span class="badge ' + pc + '">' + esc(t.priority || '') + '</span>' +
    '<span class="badge s-' + st + '">' + esc(t.status || '') + '</span>' +
    '<div class="c-ms">' + (t.duration || 0) + 'ms</div>';
  card.appendChild(top);

  var det = document.createElement('div');
  det.className = 'card-detail';
  det.innerHTML = '<div class="d-label">What this test checks</div><div class="d-desc">' + esc(t.description || 'No description.') + '</div>' +
    (detail ? '<div class="d-result ' + dc + '">' + esc(detail) + '</div>' : '');
  card.appendChild(det);

  return card;
}

function tog(card) {
  var d = card.querySelector('.card-detail');
  if (d) d.classList.toggle('open');
}

function applyFilterToCards(cardsWrap, status) {
  var cards = cardsWrap.querySelectorAll('.card');
  for (var i = 0; i < cards.length; i++) {
    var hide = status !== 'ALL' && cards[i].getAttribute('data-status') !== status;
    cards[i].classList.toggle('card-hidden', hide);
  }
  var vis = cardsWrap.querySelectorAll('.card:not(.card-hidden)').length;
  var nr = cardsWrap.querySelector('.no-results');
  if (vis === 0) {
    if (!nr) {
      var d = document.createElement('div');
      d.className = 'no-results';
      d.textContent = 'No ' + status + ' tests in this category.';
      cardsWrap.appendChild(d);
    }
  } else {
    if (nr) nr.remove();
  }
}

/* ── GLOBAL stat card filter: applies the SAME status to every category,
   expands every category that has matching results, collapses ones that don't ── */
function globalFilter(status, btn) {
  gFilter = status;
  var stats = document.querySelectorAll('.stat');
  for (var i = 0; i < stats.length; i++) stats[i].classList.remove('active');
  btn.classList.add('active');

  var rows = document.querySelectorAll('.cat-row');
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var cat = row.getAttribute('data-cat');
    var head = row.querySelector('.cat-row-head');
    var body = row.querySelector('.cat-row-body');
    var cardsWrap = row.querySelector('.cards');
    var sfBtns = row.querySelectorAll('.sf-btn');

    catFilter[cat] = status;
    applyFilterToCards(cardsWrap, status);

    // Sync the per-category filter buttons to match
    for (var b = 0; b < sfBtns.length; b++) sfBtns[b].classList.remove('sf-on');
    var map = { ALL: 'sf-all', FAIL: 'sf-fail', WARN: 'sf-warn', PASS: 'sf-pass', SKIP: 'sf-skip' };
    for (var b2 = 0; b2 < sfBtns.length; b2++) {
      if (sfBtns[b2].classList.contains(map[status])) sfBtns[b2].classList.add('sf-on');
    }

    // Auto expand categories that have matching results, collapse ones that don't (when filtering)
    var hasMatch = cardsWrap.querySelectorAll('.card:not(.card-hidden)').length > 0;
    if (status === 'ALL') {
      // leave expand state as user had it
    } else {
      expandedCats[cat] = hasMatch;
      head.classList.toggle('expanded', hasMatch);
      body.classList.toggle('open', hasMatch);
    }
  }
}

function drawDonut(s) {
  var cv = document.getElementById('donut');
  var ctx = cv.getContext('2d');
  var vals = [s.passed, s.failed, s.warnings, s.skipped];
  var cols = ['#22c55e', '#ef4444', '#f59e0b', '#475569'];
  var tot = vals.reduce(function(a, b) { return a + b; }, 0) || 1;
  var st = -Math.PI / 2, cx = 60, cy = 60, r = 52, inn = 34;
  ctx.clearRect(0, 0, 120, 120);
  for (var i = 0; i < vals.length; i++) {
    if (!vals[i]) continue;
    var sl = vals[i] / tot * 2 * Math.PI;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, st, st + sl);
    ctx.fillStyle = cols[i]; ctx.fill(); st += sl;
  }
  ctx.beginPath(); ctx.arc(cx, cy, inn, 0, 2 * Math.PI); ctx.fillStyle = '#111118'; ctx.fill();
  var pct = s.passRate || 0;
  ctx.fillStyle = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  ctx.font = 'bold 16px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(pct + '%', cx, cy);
}

function exportPDF() {
  var bodies = document.querySelectorAll('.cat-row-body');
  for (var i = 0; i < bodies.length; i++) bodies[i].classList.add('open');
  var details = document.querySelectorAll('.card-detail');
  for (var j = 0; j < details.length; j++) details[j].style.display = 'block';
  var cards = document.querySelectorAll('.card');
  for (var k = 0; k < cards.length; k++) cards[k].classList.remove('card-hidden');
  window.print();
  setTimeout(function() {
    if (allData) buildCategoryList(allData.results);
  }, 800);
}

// Wire up static buttons (manual triggers only - no auto polling)
document.getElementById('btn-refresh').addEventListener('click', load);
document.getElementById('btn-pdf').addEventListener('click', exportPDF);
document.getElementById('btn-retry').addEventListener('click', load);

var statCards = document.querySelectorAll('.stat');
for (var sc = 0; sc < statCards.length; sc++) {
  (function(card) {
    card.addEventListener('click', function() {
      globalFilter(card.getAttribute('data-status'), card);
    });
  })(statCards[sc]);
}

// Load ONCE on page open. No setInterval - user clicks Refresh when they want fresh data.
load();
</script>
</body>
</html>`;
}
module.exports = { getDashboardHTML };
