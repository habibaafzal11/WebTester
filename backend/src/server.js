const express  = require('express');
const cors     = require('cors');
const { runTests }           = require('./testRunner');
const { getDashboardHTML }   = require('./dashboard');
const { log, logError }      = require('./logger');

// CRITICAL: without these handlers, ANY unhandled error anywhere
// (including inside Playwright) kills the entire server silently
// with zero output, which makes the dashboard look "stuck" forever.
process.on('uncaughtException', (err) => {
  logError('\n[UNCAUGHT EXCEPTION] Server caught a fatal error but is staying alive:');
  logError(err.stack || err.message || err);
  logError('');
});
process.on('unhandledRejection', (reason) => {
  logError('\n[UNHANDLED REJECTION] Server caught a fatal promise rejection but is staying alive:');
  logError(reason);
  logError('');
});

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

let latestResults = null;
let runStatus     = { running: false, message: 'Idle', progress: 0 };

app.get('/health',    (req, res) => res.json({ status: 'ok' }));
app.get('/dashboard', (req, res) => { res.setHeader('Content-Type','text/html;charset=utf-8'); res.send(getDashboardHTML()); });
app.get('/api/latest-results', (req, res) => res.json(latestResults));
app.get('/api/status',         (req, res) => res.json(runStatus));

app.post('/run-tests', async (req, res) => {
  const { url, email, password } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (runStatus.running) return res.status(429).json({ error: 'A test is already running. Please wait.' });

  runStatus = { running: true, message: 'Starting...', progress: 5 };

  // Respond immediately so extension does not timeout
  res.json({ accepted: true, message: 'Test started. Poll /api/status for progress, /api/latest-results for results.' });

  // Run in background
  try {
    runStatus = { running: true, message: 'Loading page...', progress: 15 };
    log('\n========================================');
    log(' Testing:', url);
    log('========================================');

    const data = await runTests({ url, email, password });

    const elementCategories = {};
    for (const el of data.elements) {
      elementCategories[el.category] = (elementCategories[el.category] || 0) + 1;
    }

    latestResults = {
      url:               data.url,
      pageTitle:         data.pageTitle,
      testedAt:          new Date().toLocaleString(),
      summary:           data.summary,
      results:           data.results,
      elementCategories: elementCategories,
    };

    runStatus = { running: false, message: 'Complete', progress: 100, summary: data.summary };
    log(' Done:', data.summary.passed, 'passed,', data.summary.failed, 'failed,', data.summary.warnings, 'warnings');
    log(' Dashboard: http://localhost:3847/dashboard');
    log('========================================\n');
  } catch(err) {
    runStatus = { running: false, message: 'Error: ' + err.message, progress: 0 };
    logError(' Test failed:', err.message);
  }
});

const PORT = process.env.PORT || 3847;
app.listen(PORT, async () => {
  log('\n==========================================');
  log(' WebTester Pro Backend');
  log(' http://localhost:' + PORT);
  log(' Dashboard: http://localhost:' + PORT + '/dashboard');
  log('==========================================\n');

  // Self-check: verify Playwright's browser is actually installed.
  // This is the #1 cause of "backend looks running but tests never work".
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    await browser.close();
    log(' [OK] Playwright browser check passed.\n');
  } catch (err) {
    log(' [WARNING] Playwright browser is NOT installed correctly!');
    log(' Tests will fail until you run this command:');
    log('');
    log('     npx playwright install chromium');
    log('');
    log(' (The server will keep running so the dashboard still loads.)\n');
  }
});
