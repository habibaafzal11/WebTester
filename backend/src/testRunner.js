/**
 * testRunner.js
 * Optimized: parallel batches, strict timeouts, deduplication, skip low-value tests.
 * Target: complete any page in under 90 seconds.
 */
const { chromium } = require('playwright');
const { extractElements }           = require('./elementExtractor');
const { generateTestCases }         = require('./testCaseGenerator');
const { detectSiteType }            = require('./ecommerceDetector');
const { generateEcommerceTests }    = require('./ecommerceTestCases');
const { runEcommerceTest }          = require('./ecommerceRunner');
const { generateAdvancedTestCases } = require('./advancedTestCases');
const { runAdvancedTest }           = require('./advancedRunner');
const { runEcommerceFlows }         = require('./ecommerceFlows');
const { log, logError }             = require('./logger');

// How many tests to run at the same time (each on its own page)
const PARALLEL = 3;

// Hard cap: never run more than this many tests total
const MAX_TESTS = 80;

// Per-test timeout in ms
const TEST_TIMEOUT = 8000;

// Security payloads - just ONE of each type per input (not 7)
// Full coverage, not repetition
const SINGLE_PAYLOADS = {
  xss:  { value: '<script>alert(1)</script>', label: 'XSS Script Tag' },
  sqli: { value: "' OR '1'='1",              label: 'SQLi OR Bypass' },
  cmdi: { value: '; ls -la',                 label: 'CMDi Semicolon' },
  ssti: { value: '{{7*7}}',                  label: 'SSTI Template' },
  overflow: { value: 'A'.repeat(500),        label: 'Long String 500' },
};

// Many real-world sites (Elementor, AOS, WOW.js, GSAP ScrollTrigger, and
// any React/Vue site using "animate on scroll into view") render sections
// with opacity:0 / hidden until the user actually scrolls to them. If we
// never scroll, those sections look "not visible" to us even though a real
// visitor sees them fine — that shows up as false FAILs ("X not visible")
// and false SKIPs (test bails early because isVisible() returned false).
// Scrolling through the page once, before we judge anything, fixes both.
async function autoScroll(page) {
  try {
    await Promise.race([
      page.evaluate(async () => {
        await new Promise((resolve) => {
          let scrolled = 0;
          const step = 400;
          const maxScroll = 15000; // safety cap for infinite-scroll pages
          const timer = setInterval(() => {
            const height = Math.min(document.body.scrollHeight, maxScroll);
            window.scrollBy(0, step);
            scrolled += step;
            if (scrolled >= height) {
              clearInterval(timer);
              resolve();
            }
          }, 120);
        });
      }),
      new Promise(resolve => setTimeout(resolve, 8000)), // hard cap either way
    ]);
    // Give scroll-triggered CSS transitions / IntersectionObserver
    // callbacks a moment to finish before we start judging visibility.
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
  } catch (e) { /* non-critical — worst case we just skip the reveal pass */ }
}

async function runTests({ url, email, password }) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const startTime = Date.now();
  let pageTitle = '', pageScreenshot = null, elements = [];
  let responseHeaders = {};

  // ── Main page for detection + extraction ────────────────────────────
  const mainCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ignoreHTTPSErrors: true,
  });
  mainCtx.on('response', r => {
    try { if (r.url().startsWith(url.split('?')[0])) responseHeaders = r.headers(); } catch(e){}
  });

  const mainPage = await mainCtx.newPage();
  const consoleErrors = [];
  mainPage.on('console', m => { if (m.type()==='error') consoleErrors.push(m.text()); });
  mainPage.on('pageerror', e => consoleErrors.push(e.message));

  let allTests = [];
  let idCounter = 1;
  const nextId = () => 'TC-' + String(idCounter++).padStart(3,'0');
  let isEcommerceDetected = false;

  try {
    log('\n  Loading page:', url);
    const navResponse = await mainPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await mainPage.waitForTimeout(1500);

    // Detect blocked/failed page loads early - this is the #1 cause of
    // "0 elements found, no ecommerce detected" on sites with bot protection
    const httpStatus = navResponse ? navResponse.status() : null;
    pageTitle = await mainPage.title();
    const bodyLength = await mainPage.evaluate(() => document.body ? document.body.innerHTML.length : 0).catch(() => 0);

    if (httpStatus && httpStatus >= 400) {
      log('  WARNING: Page returned HTTP', httpStatus, '- site may be blocking automated access.');
      await mainCtx.close();
      await browser.close();
      return errorResult(
        url,
        'The website returned HTTP ' + httpStatus + ' and blocked the page load. ' +
        'This usually means the site has bot/automation protection (e.g. Cloudflare) ' +
        'that is rejecting the automated browser. This is a site-side block, not a bug in WebTester Pro. ' +
        'Try testing from a different network, or the site may require a real residential IP address.',
        startTime
      );
    }

    if (bodyLength < 500) {
      log('  WARNING: Page body is nearly empty (' + bodyLength + ' chars). Site may be blocking automation or showing a challenge page.');
    }

    // Reveal scroll-triggered content (Elementor/AOS/WOW.js/etc.) before we
    // screenshot or extract elements, so we're testing what a real visitor sees.
    await autoScroll(mainPage);

    pageScreenshot = (await mainPage.screenshot({ type: 'png' })).toString('base64');
    log('  Title:', pageTitle, '| HTTP:', httpStatus, '| Body size:', bodyLength, 'chars');

    // Detect + extract
    const siteProfile = await detectSiteType(mainPage, url);
    elements          = await extractElements(mainPage);
    log('  Elements found:', elements.length, '| Ecommerce:', !!(siteProfile.hasProductGrid || siteProfile.hasCart));

    const isEcommerce = siteProfile.hasProductGrid || siteProfile.hasAddToCart ||
                        siteProfile.hasCart         || siteProfile.hasCheckout;
    isEcommerceDetected = isEcommerce;

    // ── Generate all tests ───────────────────────────────────────────
    // Phase 1: Ecommerce (most important — run first)
    if (isEcommerce) {
      const ecTests = await generateEcommerceTests(mainPage, siteProfile, nextId);
      allTests.push(...ecTests.map(t => ({ ...t, _phase: 'ecommerce' })));
    }

    // Phase 2: Advanced UI
    const advTests = generateAdvancedTestCases(elements, nextId);
    allTests.push(...advTests.map(t => ({ ...t, _phase: 'advanced' })));

    // Phase 3: Generic — but DEDUPLICATED and limited
    const genericRaw = generateTestCases(elements, { email, password });
    const genericDeduped = deduplicateGeneric(genericRaw, nextId);
    allTests.push(...genericDeduped.map(t => ({ ...t, _phase: 'generic' })));

    // ── Prioritise and cap ───────────────────────────────────────────
    allTests = prioritiseAndCap(allTests, MAX_TESTS);
    log('  Tests to run:', allTests.length, '(capped at', MAX_TESTS + ')');

  } catch(err) {
    logError('  Setup error:', err.message);
    await browser.close();
    return errorResult(url, err.message, startTime);
  }

  // ── Run page-level checks on main page (instant, no navigation) ─────
  const pageResults = await runPageLevelChecks(mainPage, { url, responseHeaders, consoleErrors }, nextId);

  // ── Run complete ecommerce USER JOURNEY flows (listing -> product -> cart -> checkout) ──
  // These are sequential, multi-page-navigation tests and must run on their OWN page,
  // separate from the parallel element-level tests below, because each flow step
  // depends on the page state left behind by the previous step.
  let flowResults = [];
  if (isEcommerceDetected) {
    log('  Running full ecommerce user journey tests (listing -> cart -> checkout)...');
    try {
      flowResults = await Promise.race([
        runEcommerceFlows(mainPage, url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ecommerce flows timed out')), 60000))
      ]);
      log('  Ecommerce flow tests complete:', flowResults.length, 'journey tests run.');
    } catch (e) {
      log('  Ecommerce flow tests failed/timed out:', e.message);
    }
  }

  await mainCtx.close();

  // ── Run remaining tests in parallel batches ─────────────────────────
  const elementTests = allTests.filter(t => t._phase !== 'page');
  const batchResults = await runInParallel(browser, url, elementTests, TEST_TIMEOUT, PARALLEL);

  await browser.close();

  const results = [...pageResults, ...flowResults, ...batchResults];
  const passed   = results.filter(r => r.status === 'PASS').length;
  const failed   = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const skipped  = results.filter(r => r.status === 'SKIP').length;

  log(`\n  DONE in ${((Date.now()-startTime)/1000).toFixed(1)}s`);
  log(`  ${passed} passed | ${failed} failed | ${warnings} warnings | ${skipped} skipped`);

  return {
    url, pageTitle, pageScreenshot, elements, results,
    summary: {
      total: results.length, passed, failed, warnings, skipped,
      duration: Date.now() - startTime,
      elementCount: elements.length,
      categories: [...new Set(results.map(r => r.category))],
      passRate: results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
    },
  };
}

// ── Run a batch of tests in parallel across N pages ──────────────────────────
async function runInParallel(browser, url, tests, timeout, concurrency) {
  const results = [];
  const queue = [...tests];
  const workers = Array.from({ length: concurrency }, () => null);

  async function worker() {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);
      await autoScroll(page);
    } catch(e) {
      await ctx.close();
      return;
    }

    while (queue.length > 0) {
      const tc = queue.shift();
      if (!tc) break;

      let result;
      try {
        const testPromise = tc._phase === 'ecommerce'
          ? runEcommerceTest(page, tc, [])
          : tc._phase === 'advanced'
            ? runAdvancedTest(page, tc)
            : runGenericTest(page, tc, { url });

        result = await Promise.race([
          testPromise,
          new Promise(resolve => setTimeout(() => resolve({
            id: tc.id, name: tc.name, category: tc.category,
            priority: tc.priority, description: tc.description,
            status: 'SKIP', error: null,
            details: 'Skipped — test took too long (>' + (timeout/1000) + 's)',
            duration: timeout,
            element: { tagName: tc.element?.tagName, selector: tc.element?.selector, category: tc.element?.category },
          }), timeout))
        ]);
      } catch(err) {
        result = {
          id: tc.id, name: tc.name, category: tc.category,
          priority: tc.priority, description: tc.description || '',
          status: 'FAIL', error: err.message.slice(0, 150), details: null,
          duration: 0,
          element: { tagName: tc.element?.tagName, selector: tc.element?.selector, category: tc.element?.category },
        };
      }

      results.push(result);
      const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : result.status === 'WARN' ? '!' : '-';
      log(`  [${icon}] ${result.id} ${result.name.slice(0,55)}`);
    }

    await ctx.close();
  }

  // Run all workers concurrently
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Sort by ID so report is in order
  results.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  return results;
}

// ── Instant page-level checks (no navigation needed) ─────────────────────────
async function runPageLevelChecks(page, { url, responseHeaders, consoleErrors }, nextId) {
  const checks = [
    {
      id: nextId(), name: 'HTTPS Enforcement',
      category: 'Security', priority: 'Critical',
      description: 'Page must be served over HTTPS.',
      fn: async () => {
        if (url.startsWith('https://')) return { status:'PASS', details:'HTTPS confirmed.' };
        return { status:'FAIL', error:'Page uses HTTP — data transmitted in plaintext.' };
      }
    },
    {
      id: nextId(), name: 'Security Headers Check',
      category: 'Security', priority: 'High',
      description: 'Check CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.',
      fn: async () => {
        const expected = [
          { key:'content-security-policy',   short:'CSP' },
          { key:'x-frame-options',            short:'X-Frame-Options' },
          { key:'x-content-type-options',     short:'X-Content-Type-Options' },
          { key:'strict-transport-security',  short:'HSTS' },
          { key:'referrer-policy',            short:'Referrer-Policy' },
        ];
        const missing=[], found=[];
        expected.forEach(h => responseHeaders[h.key] ? found.push(h.short) : missing.push(h.short));
        if (!missing.length) return { status:'PASS', details:'All headers present: '+found.join(', ') };
        if (missing.length<=2) return { status:'WARN', details:'Missing: '+missing.join(', ')+'. Present: '+found.join(', ') };
        return { status:'FAIL', error:'Missing '+missing.length+' security headers: '+missing.join(', ') };
      }
    },
    {
      id: nextId(), name: 'Clickjacking Protection',
      category: 'Security', priority: 'High',
      description: 'X-Frame-Options or CSP frame-ancestors must be set.',
      fn: async () => {
        const xfo=responseHeaders['x-frame-options'], csp=responseHeaders['content-security-policy'];
        if (xfo||(csp&&csp.includes('frame-ancestors'))) return { status:'PASS', details:'Clickjacking protection present.' };
        return { status:'FAIL', error:'No clickjacking protection. Missing X-Frame-Options and CSP frame-ancestors.' };
      }
    },
    {
      id: nextId(), name: 'Cookie Security Flags',
      category: 'Security', priority: 'High',
      description: 'All cookies must have Secure and HttpOnly flags.',
      fn: async () => {
        const cookies = await page.context().cookies().catch(()=>[]);
        if (!cookies.length) return { status:'PASS', details:'No cookies set.' };
        const issues=[];
        cookies.forEach(c=>{ if(!c.secure)issues.push('"'+c.name+'" missing Secure'); if(!c.httpOnly)issues.push('"'+c.name+'" missing HttpOnly'); });
        if (!issues.length) return { status:'PASS', details:cookies.length+' cookie(s) all secure.' };
        return { status:'WARN', details:'Issues: '+issues.slice(0,4).join(' | ') };
      }
    },
    {
      id: nextId(), name: 'JavaScript Console Errors',
      category: 'Functional', priority: 'Medium',
      description: 'No JS errors should appear on page load.',
      fn: async () => {
        if (!consoleErrors.length) return { status:'PASS', details:'No JS errors on page load.' };
        if (consoleErrors.length<=2) return { status:'WARN', details:consoleErrors.length+' error(s): '+consoleErrors[0].slice(0,100) };
        return { status:'FAIL', error:consoleErrors.length+' JS errors. First: '+consoleErrors[0].slice(0,100) };
      }
    },
    {
      id: nextId(), name: 'Page Load Performance',
      category: 'Performance', priority: 'High',
      description: 'Page should load in under 5 seconds.',
      fn: async () => {
        const timing = await page.evaluate(()=>{
          const n=performance.getEntriesByType('navigation')[0];
          return n ? Math.round(n.loadEventEnd - n.fetchStart) : null;
        }).catch(()=>null);
        if (!timing) return { status:'SKIP', details:'Timing API unavailable.' };
        if (timing<3000) return { status:'PASS', details:`Loaded in ${timing}ms. Excellent.` };
        if (timing<5000) return { status:'WARN', details:`Loaded in ${timing}ms. Slow — target under 3s.` };
        return { status:'FAIL', error:`Page load ${timing}ms (${(timing/1000).toFixed(1)}s) — over 5s! Hurts conversions.` };
      }
    },
    {
      id: nextId(), name: 'Sensitive Data in URL',
      category: 'Security', priority: 'High',
      description: 'URL must not contain passwords, tokens, or API keys.',
      fn: async () => {
        const found=['password','token','apikey','secret','sessionid'].filter(p=>url.toLowerCase().includes(p));
        if (found.length) return { status:'FAIL', error:'Sensitive keywords in URL: '+found.join(', ') };
        return { status:'PASS', details:'No sensitive keywords in URL.' };
      }
    },
    {
      id: nextId(), name: 'Mixed Content Check',
      category: 'Security', priority: 'Medium',
      description: 'HTTPS pages must not load HTTP resources.',
      fn: async () => {
        const mc = await page.evaluate(()=>{
          const ins=[];
          document.querySelectorAll('img[src],script[src],link[href]').forEach(el=>{
            const s=el.src||el.href; if(s&&s.startsWith('http://'))ins.push(s.slice(0,60));
          });
          return ins;
        }).catch(()=>[]);
        if (!mc.length) return { status:'PASS', details:'No mixed content.' };
        return { status:'WARN', details:mc.length+' HTTP resource(s) on HTTPS page: '+mc[0] };
      }
    },
    {
      id: nextId(), name: 'Password Autocomplete Control',
      category: 'Security', priority: 'Medium',
      description: 'Password fields should have autocomplete="off" or "new-password".',
      fn: async () => {
        const r=await page.evaluate(()=>Array.from(document.querySelectorAll('input[type="password"]')).map(e=>e.getAttribute('autocomplete')||'NOT SET')).catch(()=>[]);
        if (!r.length) return { status:'PASS', details:'No password fields on this page.' };
        const unsafe=r.filter(ac=>!['off','new-password','current-password'].includes(ac));
        if (!unsafe.length) return { status:'PASS', details:'All password fields have autocomplete control.' };
        return { status:'WARN', details:unsafe.length+' password field(s) without autocomplete attribute.' };
      }
    },
    {
      id: nextId(), name: 'Images Have Alt Text (Accessibility)',
      category: 'Accessibility', priority: 'High',
      description: 'All images must have alt text for screen readers (WCAG 2.1).',
      fn: async () => {
        const r=await page.evaluate(()=>{
          const imgs=Array.from(document.querySelectorAll('img'));
          // alt="" (decorative image) is valid WCAG — only a fully MISSING
          // alt attribute is a violation. el.alt alone can't tell these
          // apart (both read as ''), so check the attribute directly.
          const missing=imgs.filter(i=>!i.hasAttribute('alt')).length;
          return { total:imgs.length, missing };
        }).catch(()=>({total:0,missing:0}));
        if (!r.total) return { status:'SKIP', details:'No images found.' };
        if (!r.missing) return { status:'PASS', details:`All ${r.total} images have an alt attribute (empty alt="" is valid for decorative images).` };
        return { status:'FAIL', error:`${r.missing} of ${r.total} images have no alt attribute at all. WCAG 2.1 violation.` };
      }
    },
    {
      id: nextId(), name: 'Mobile Viewport (375px)',
      category: 'UI', priority: 'High',
      description: 'Page must not overflow horizontally on mobile screen width.',
      fn: async () => {
        await page.setViewportSize({width:375,height:812});
        await page.waitForTimeout(500);
        const overflow=await page.evaluate(()=>document.body.scrollWidth>window.innerWidth+10).catch(()=>false);
        await page.setViewportSize({width:1280,height:800});
        if (!overflow) return { status:'PASS', details:'No horizontal overflow at 375px (mobile).' };
        return { status:'WARN', details:'Page overflows horizontally on mobile. Check CSS media queries.' };
      }
    },
    {
      id: nextId(), name: 'Broken Links on Page',
      category: 'Functional', priority: 'Medium',
      description: 'Check for links with empty, #, or javascript: href.',
      fn: async () => {
        const broken=await page.evaluate(()=>{
          const links=Array.from(document.querySelectorAll('a'));
          return links.filter(l=>{const h=l.getAttribute('href');return !h||h==='#'||h.startsWith('javascript:');}).length;
        }).catch(()=>0);
        if (!broken) return { status:'PASS', details:'No obviously broken links found.' };
        return { status:'WARN', details:`${broken} link(s) with empty/# href found. May be placeholders.` };
      }
    },
  ];

  const results = [];
  for (const check of checks) {
    const start = Date.now();
    try {
      const r = await Promise.race([
        check.fn(),
        new Promise(res => setTimeout(()=>res({status:'SKIP',details:'Check timed out'}),5000))
      ]);
      results.push({
        id: check.id, name: check.name, category: check.category,
        priority: check.priority, description: check.description,
        status: r.status, error: r.error||null, details: r.details||null,
        duration: Date.now()-start,
        element: { tagName:'page', selector:null, category:'Page' },
      });
    } catch(e) {
      results.push({
        id: check.id, name: check.name, category: check.category,
        priority: check.priority, description: check.description,
        status:'FAIL', error:e.message.slice(0,150), details:null,
        duration: Date.now()-start,
        element: { tagName:'page', selector:null, category:'Page' },
      });
    }
    log(`  [${results[results.length-1].status}] ${check.id} ${check.name}`);
  }
  return results;
}

// ── Deduplicate generic tests: 1 XSS, 1 SQLi, 1 CMDi per unique input ────────
function deduplicateGeneric(tests, nextId) {
  // Keep only page-level security checks + one of each security type per unique selector
  const seen = {}; // "action::selector" -> true
  const kept = [];

  // Priority order: page checks first, then Critical, High, Medium, Low
  const priorityOrder = { Critical:0, High:1, Medium:2, Low:3 };

  // Only keep these action types (drop repetitive ones)
  const allowedActions = new Set([
    'check_https','check_security_headers','check_clickjacking','check_cookies',
    'check_sensitive_url','check_console_errors','check_mixed_content','check_autocomplete',
    'check_csrf_token','check_form_method','check_type_password','check_alt','check_href',
    // Security - one per selector
    'security_xss','security_sqli','security_cmdi','security_ssti','security_overflow',
    // Functional - limit per category
    'visibility_check','click','type_valid','type_empty','select_option','disabled_check',
    'check_options','form_empty_submit','check_form_action',
  ]);

  // Group security tests: keep only BEST one per selector per type
  const securityBySelector = {}; // "xss::#selector" -> test

  for (const t of tests) {
    if (!allowedActions.has(t.action)) continue;

    const sel = t.element?.selector || 'page';

    // For security actions: keep only 1 per type per selector
    if (['security_xss','security_sqli','security_cmdi','security_ssti','security_overflow'].includes(t.action)) {
      const key = t.action + '::' + sel;
      if (!securityBySelector[key]) {
        securityBySelector[key] = t;
      }
      continue;
    }

    // For functional/page checks: deduplicate by action+selector
    const key = t.action + '::' + sel;
    if (!seen[key]) {
      seen[key] = true;
      kept.push(t);
    }
  }

  // Add the best security test per selector per type
  kept.push(...Object.values(securityBySelector));

  return kept;
}

// ── Prioritise tests and cap total ────────────────────────────────────────────
function prioritiseAndCap(tests, cap) {
  const order = { Critical:0, High:1, Medium:2, Low:3 };
  const phaseOrder = { ecommerce:0, advanced:1, generic:2, page:3 };

  // Sort: by phase first, then priority
  tests.sort((a,b) => {
    const pd = (phaseOrder[a._phase]||9) - (phaseOrder[b._phase]||9);
    if (pd !== 0) return pd;
    return (order[a.priority]||9) - (order[b.priority]||9);
  });

  // Always keep Critical + High, then fill with Medium/Low up to cap
  const critical = tests.filter(t => t.priority === 'Critical' || t.priority === 'High');
  const lower    = tests.filter(t => t.priority !== 'Critical' && t.priority !== 'High');

  const result = [...critical];
  const remaining = cap - result.length;
  if (remaining > 0) result.push(...lower.slice(0, remaining));

  return result.slice(0, cap);
}

// ── Generic test executor ─────────────────────────────────────────────────────
// Not everything that's invisible right now is broken. Modals, dropdown
// panels, mobile off-canvas menus, and popups (very common on sites like
// Elementor/WordPress builds) are *supposed* to be hidden until something
// opens them — that's not a bug, it's the element doing its job. Flagging
// every one of those as "FAIL — not visible" produces a wall of false
// failures on almost any real site. This walks up the DOM and checks
// whether the invisibility comes from a closed container rather than the
// element itself being broken.
async function isHiddenByClosedContainer(page, selector) {
  return await page.evaluate((sel) => {
    let node;
    try { node = document.querySelector(sel); } catch (e) { return false; }
    if (!node) return false;
    node = node.parentElement;
    while (node) {
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return true;
      if (node.getAttribute('aria-hidden') === 'true') return true;
      const cls = (node.className || '').toString().toLowerCase();
      const looksLikeClosablePanel = /modal|popup|dialog|offcanvas|off-canvas|drawer|dropdown-menu|submenu/.test(cls);
      const looksOpen = /show|open|active|visible|expanded/.test(cls);
      if (looksLikeClosablePanel && !looksOpen) return true;
      node = node.parentElement;
    }
    return false;
  }, selector).catch(() => false);
}

// If an element is only invisible because it's inside a closed modal/
// dropdown/accordion, try clicking that container's actual trigger to open
// it — the same thing a real tester would do — instead of just giving up.
// Only clicks well-defined "this opens that container" trigger patterns
// (data-bs-target/data-target/aria-controls/href="#id"), so it won't
// accidentally submit a form or navigate away.
async function tryRevealElement(page, selector) {
  try {
    const opened = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;

      let container = el.parentElement;
      while (container) {
        const style = window.getComputedStyle(container);
        const hidden = style.display === 'none' || style.visibility === 'hidden' ||
                       container.getAttribute('aria-hidden') === 'true';
        if (hidden) break;
        container = container.parentElement;
      }
      if (!container) return false;

      const id = container.id;
      let toggle = null;
      if (id) {
        toggle = document.querySelector(
          `[data-bs-target="#${id}"], [data-target="#${id}"], [aria-controls="${id}"], a[href="#${id}"]`
        );
      }
      if (!toggle) {
        const prev = container.previousElementSibling;
        if (prev && prev.matches('[aria-expanded], [class*="toggle"], button, a, [role="button"]')) {
          toggle = prev;
        }
      }
      if (!toggle) return false;
      toggle.click();
      return true;
    }, selector).catch(() => false);

    if (!opened) return false;
    await page.waitForTimeout(400);
    return await page.locator(selector).first().isVisible({ timeout: 1500 }).catch(() => false);
  } catch (e) {
    return false;
  }
}

// Standard visibility gate used across test actions: check visible, and if
// not, try to reveal it (see above) before treating it as unavailable.
async function ensureVisible(page, locator, selector) {
  if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) return true;
  if (await isHiddenByClosedContainer(page, selector).catch(() => false)) {
    if (await tryRevealElement(page, selector)) return true;
  }
  return false;
}

async function runGenericTest(page, tc, ctx) {
  const start = Date.now();
  const { element: el, action } = tc;
  const { url='' } = ctx;
  let status='PASS', error=null, details=null;

  try {
    const selector = el?.selector;
    const locator  = selector ? page.locator(selector).first() : null;

    switch (action) {
      case 'security_xss': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        const payload = SINGLE_PAYLOADS.xss.value;
        await locator.fill(payload, {timeout:3000}).catch(()=>{});
        const hit = await page.evaluate(p=>document.body.innerHTML.includes(p), payload).catch(()=>false);
        status = hit ? 'FAIL' : 'WARN';
        if (hit) error = 'XSS reflected unescaped in DOM on selector: '+selector;
        else details = 'XSS payload entered on "'+selector+'". Not reflected in DOM — good.';
        await locator.fill('').catch(()=>{});
        break;
      }
      case 'security_sqli': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        const payload = SINGLE_PAYLOADS.sqli.value;
        await locator.fill(payload, {timeout:3000}).catch(()=>{});
        const pt = await page.evaluate(()=>document.body.innerText.toLowerCase()).catch(()=>'');
        const sqlErr = ['sql syntax','mysql','ora-','sqlite','syntax error'].find(e=>pt.includes(e));
        if (sqlErr) { status='FAIL'; error='SQL error in page after SQLi on "'+selector+'": "'+sqlErr+'"'; }
        else { status='WARN'; details='SQLi payload entered on "'+selector+'". No SQL error visible.'; }
        await locator.fill('').catch(()=>{});
        break;
      }
      case 'security_cmdi': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        await locator.fill(SINGLE_PAYLOADS.cmdi.value, {timeout:3000}).catch(()=>{});
        const pt = await page.evaluate(()=>document.body.innerText).catch(()=>'');
        const found = ['root:','/bin/','uid='].find(s=>pt.includes(s));
        if (found) { status='FAIL'; error='Command injection output detected: "'+found+'"'; }
        else { details='CMDi payload on "'+selector+'". No command output visible.'; }
        await locator.fill('').catch(()=>{});
        break;
      }
      case 'security_ssti': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        await locator.fill(SINGLE_PAYLOADS.ssti.value, {timeout:3000}).catch(()=>{});
        const pt = await page.evaluate(()=>document.body.innerText).catch(()=>'');
        if (pt.includes('49')) { status='FAIL'; error='SSTI: template evaluated {{7*7}}=49 on "'+selector+'"'; }
        else { details='SSTI payload on "'+selector+'". "49" not in response.'; }
        await locator.fill('').catch(()=>{});
        break;
      }
      case 'security_overflow': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        await locator.fill(SINGLE_PAYLOADS.overflow.value, {timeout:3000}).catch(()=>{});
        const val = await locator.inputValue().catch(()=>'');
        details = 'Overflow 500 chars on "'+selector+'" — accepted '+val.length+' chars.';
        await locator.fill('').catch(()=>{});
        break;
      }
      case 'visibility_check': {
        if (!locator) { status='SKIP'; break; }
        const v = await locator.isVisible({timeout:3000}).catch(()=>false);
        if (v) { details='Visible.'; break; }
        if (await isHiddenByClosedContainer(page, selector)) {
          if (await tryRevealElement(page, selector)) {
            details='Visible after opening its modal/dropdown/off-canvas panel.';
          } else {
            status='SKIP';
            details='Inside a modal/dropdown/off-canvas panel that isn\'t open right now — couldn\'t open it automatically, so not tested in its closed state.';
          }
        } else {
          status='FAIL'; error='"'+selector+'" not visible.';
        }
        break;
      }
      case 'click': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        if (await locator.isDisabled({timeout:2000}).catch(()=>false)) { status='WARN'; details='Disabled.'; break; }
        await locator.click({timeout:3000,force:true}).catch(()=>{});
        details='Clicked.';
        await page.waitForTimeout(300);
        break;
      }
      case 'type_valid': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        await locator.fill(tc.value||'Test123', {timeout:3000});
        const val = await locator.inputValue().catch(()=>null);
        details = val ? 'Entered: "'+val.slice(0,40)+'"' : 'Value set.';
        await locator.fill('').catch(()=>{});
        break;
      }
      case 'type_empty': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        await locator.fill('', {timeout:3000});
        const req = await page.evaluate(s=>{const e=document.querySelector(s);return e?e.required:false;},selector).catch(()=>false);
        details = req?'Required field — validation on submit.':'Not required — empty accepted.';
        break;
      }
      case 'check_type_password': {
        if (!locator) { status='SKIP'; break; }
        const t = await locator.getAttribute('type').catch(()=>'');
        if (t==='password') { details='type="password" — masked.'; }
        else { status='FAIL'; error='Password field type="'+t+'" — visible!'; }
        break;
      }
      case 'check_alt': {
        if (!el.hasAltAttr) { status='FAIL'; error='Image has no alt attribute at all (WCAG).'; }
        else if (!el.alt) { details='alt="" — marked decorative. Valid WCAG if truly decorative.'; }
        else { details='Alt: "'+el.alt+'"'; }
        break;
      }
      case 'check_href': {
        if (!el.href||el.href==='#') { status='FAIL'; error='Dead link: "'+el.href+'"'; }
        else { details='href: "'+el.href.slice(0,60)+'"'; }
        break;
      }
      case 'select_option': {
        if (!locator) { status='SKIP'; break; }
        if (!await ensureVisible(page, locator, selector)) { status='SKIP'; details='Not visible — inside a closed modal/dropdown that could not be opened automatically, or genuinely hidden.'; break; }
        const count = await page.evaluate(s=>{const e=document.querySelector(s);return e?.options?.length||0;},selector).catch(()=>0);
        if (count>1) { await page.selectOption(selector,{index:1},{timeout:3000}).catch(()=>{}); details='Selected option 1 of '+count; }
        else { status='WARN'; details='Only '+count+' option(s).'; }
        break;
      }
      case 'check_csrf_token': {
        if (!locator) { status='SKIP'; break; }
        const has=await page.evaluate(s=>{const f=document.querySelector(s);if(!f)return false;const ins=f.querySelectorAll('input[type="hidden"]');for(const i of ins){const n=(i.name||'').toLowerCase();if(n.includes('csrf')||n.includes('token'))return true;}return!!document.querySelector('meta[name="csrf-token"]');},selector).catch(()=>false);
        if (has){details='CSRF token found.';}else{status='WARN';details='No CSRF token in form.';}
        break;
      }
      case 'check_form_method': {
        const m=(el.method||'get').toUpperCase();
        if (m==='POST'){details='POST method.';}else{status='WARN';details='GET method — data may appear in URL.';}
        break;
      }
      case 'disabled_check': {
        if (!locator) { status='SKIP'; break; }
        const d=await locator.isDisabled({timeout:2000}).catch(()=>false);
        details=d?'Disabled.':'Enabled.';
        break;
      }
      default:
        status='SKIP';
        details='N/A: '+action;
    }
  } catch(err) {
    status='FAIL';
    error=err.message.slice(0,150);
  }

  return {
    id:tc.id, name:tc.name, category:tc.category,
    priority:tc.priority, description:tc.description||'',
    status, error, details, duration:Date.now()-start,
    element:{tagName:el?.tagName, selector:el?.selector, category:el?.category},
  };
}

function errorResult(url, msg, startTime) {
  return {
    url, pageTitle:'Error', pageScreenshot:null, elements:[],
    results:[{
      id:'TC-001', name:'Page Load', category:'Infrastructure', priority:'Critical',
      description:'Navigate to target URL',
      status:'FAIL', error:msg, details:null, duration:Date.now()-startTime,
      element:{tagName:'page',selector:null,category:'Page'},
    }],
    summary:{ total:1, passed:0, failed:1, warnings:0, skipped:0,
      duration:Date.now()-startTime, elementCount:0, categories:['Infrastructure'], passRate:0 },
  };
}

module.exports = { runTests };
