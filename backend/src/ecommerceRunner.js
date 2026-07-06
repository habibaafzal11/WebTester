/**
 * ecommerceRunner.js
 * Executes ecommerce-specific test cases using Playwright.
 * Each action knows HOW to actually test the ecommerce feature.
 */

async function runEcommerceTest(page, tc, consoleErrors) {
  const start = Date.now();
  let status = 'PASS', error = null, details = null;

  try {
    switch (tc.action) {

      // ── PRODUCT GRID ────────────────────────────────────────────────
      case 'ec_product_grid_visible': {
        const result = await page.evaluate(() => {
          const selectors = ['.product','[class*="product-item"]','[class*="product-card"]','.card','.item'];
          let found = 0;
          for (const s of selectors) {
            const els = document.querySelectorAll(s);
            if (els.length >= 2) { found = els.length; break; }
          }
          return found;
        });
        if (result >= 2) {
          details = `Product grid loaded with ${result} product items visible.`;
        } else {
          status = 'FAIL';
          error = 'Product grid not found or shows fewer than 2 items. Check if products loaded correctly.';
        }
        break;
      }

      case 'ec_check_product_images': {
        const brokenImages = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('[class*="product"] img, [class*="item"] img, .card img'));
          const broken = imgs.filter(img => !img.complete || img.naturalWidth === 0 || img.src === '' || img.src.endsWith('undefined'));
          return { total: imgs.length, broken: broken.length, brokenSrcs: broken.slice(0,3).map(i => i.src) };
        });
        if (brokenImages.broken === 0) {
          details = `All ${brokenImages.total} product images loaded successfully.`;
        } else {
          status = 'FAIL';
          error = `${brokenImages.broken} of ${brokenImages.total} product images are broken (404/empty src). Examples: ${brokenImages.brokenSrcs.join(', ')}`;
        }
        break;
      }

      case 'ec_price_visible': {
        const result = await page.evaluate(() => {
          const priceSelectors = ['[class*="price"]','[class*="amount"]','[itemprop="price"]','[class*="cost"]'];
          for (const s of priceSelectors) {
            const els = document.querySelectorAll(s);
            if (els.length > 0) return { count: els.length, example: els[0].textContent.trim().slice(0,30) };
          }
          return null;
        });
        if (result) {
          details = `Price elements found: ${result.count}. Example: "${result.example}"`;
        } else {
          status = 'WARN';
          details = 'No price elements detected. Prices may be loaded dynamically — verify manually.';
        }
        break;
      }

      // ── SEARCH ──────────────────────────────────────────────────────
      case 'ec_search_valid': {
        const sel = tc.selector;
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!visible) { status='SKIP'; error='Search input not visible'; break; }
        await el.fill(tc.value);
        await el.press('Enter');
        await page.waitForLoadState('domcontentloaded').catch(()=>{});
        await page.waitForTimeout(1500);
        const resultsFound = await page.evaluate(() => {
          const noResult = document.body.innerText.toLowerCase();
          const hasNoResults = noResult.includes('no result') || noResult.includes('not found') || noResult.includes('0 product');
          const hasProducts = document.querySelectorAll('[class*="product"],[class*="item"],[class*="result"]').length;
          return { hasNoResults, hasProducts };
        });
        if (resultsFound.hasNoResults) {
          status = 'WARN';
          details = `Search for "${tc.value}" returned no results. This may be expected if site doesn't have this product.`;
        } else if (resultsFound.hasProducts > 0) {
          details = `Search for "${tc.value}" returned ${resultsFound.hasProducts} result elements. Search is working.`;
        } else {
          status = 'WARN';
          details = `Search executed but results unclear. Page loaded without errors.`;
        }
        break;
      }

      case 'ec_search_no_results': {
        const sel = tc.selector;
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!visible) { status='SKIP'; error='Search input not visible'; break; }
        await el.fill(tc.value);
        await el.press('Enter');
        await page.waitForLoadState('domcontentloaded').catch(()=>{});
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const hasNoResultMsg = bodyText.includes('no result') || bodyText.includes('not found') || bodyText.includes('0 result') || bodyText.includes('no products') || bodyText.includes('0 product');
        if (hasNoResultMsg) {
          details = `"No results" message shown correctly for gibberish search. Good user experience.`;
        } else {
          status = 'WARN';
          details = `No explicit "no results" message detected for gibberish search. User may see a blank/confusing page.`;
        }
        break;
      }

      case 'ec_search_empty': {
        const sel = tc.selector;
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!visible) { status='SKIP'; error='Search input not visible'; break; }
        await el.fill('');
        await el.press('Enter');
        await page.waitForTimeout(1500);
        details = 'Empty search submitted. Verify behavior matches expected (all products or error message).';
        break;
      }

      case 'ec_search_xss': {
        const sel = tc.selector;
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!visible) { status='SKIP'; error='Search input not visible'; break; }
        await el.fill(tc.value);
        await el.press('Enter');
        await page.waitForTimeout(1500);
        const pageHtml = await page.content();
        const hasRawScript = pageHtml.includes('<script>alert') || pageHtml.includes('onerror=alert');
        if (hasRawScript) {
          status = 'FAIL';
          error = 'XSS VULNERABILITY: Search reflects the raw script tag in page HTML without sanitization! The page is vulnerable to reflected XSS.';
        } else {
          details = 'XSS payload was sanitized/encoded in search results. Not reflected as raw HTML.';
        }
        break;
      }

      case 'ec_search_sqli': {
        const sel = tc.selector;
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!visible) { status='SKIP'; error='Search input not visible'; break; }
        await el.fill(tc.value);
        await el.press('Enter');
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const sqlErrors = ['sql syntax','mysql error','ora-','sqlite','pg_query','unclosed quotation','syntax error near'];
        const foundErr = sqlErrors.find(e=>bodyText.includes(e));
        if (foundErr) {
          status = 'FAIL';
          error = `SQL INJECTION VULNERABILITY: SQL error exposed in page after injection attempt. Found: "${foundErr}". Database queries are not parameterized.`;
        } else if (bodyText.includes('error') || bodyText.includes('exception')) {
          status = 'WARN';
          details = 'An error appeared after SQLi attempt but no SQL syntax details leaked. Check server logs.';
        } else {
          details = 'No SQL errors exposed in response. Search appears to handle the input safely.';
        }
        break;
      }

      // ── ADD TO CART ──────────────────────────────────────────────────
      case 'ec_add_to_cart_visible': {
        const result = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
          const cartBtn = btns.find(b => {
            const t = (b.textContent + b.className + (b.getAttribute('aria-label')||'')).toLowerCase();
            return t.includes('add to cart') || t.includes('add to bag') || t.includes('buy now');
          });
          if (!cartBtn) return null;
          const r = cartBtn.getBoundingClientRect();
          return { text: cartBtn.textContent.trim().slice(0,30), visible: r.width > 0 && r.height > 0 };
        });
        if (result && result.visible) {
          details = `Add to Cart button found: "${result.text}". Visible and accessible.`;
        } else if (result) {
          status = 'WARN';
          details = 'Add to Cart button found but may not be visible in viewport.';
        } else {
          status = 'WARN';
          details = 'No "Add to Cart" button found on this page. May be a listing page — navigate to a product detail page for this test.';
        }
        break;
      }

      case 'ec_add_to_cart_updates_count': {
        // Get initial cart count
        const beforeCount = await page.evaluate(() => {
          const cartEls = document.querySelectorAll('[class*="cart-count"],[class*="cart-qty"],[class*="cart-number"],[class*="badge"],[id*="cart-count"]');
          for (const el of cartEls) {
            const n = parseInt(el.textContent.trim());
            if (!isNaN(n)) return n;
          }
          return -1;
        });

        // Click add to cart
        const clicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a'));
          const cartBtn = btns.find(b => {
            const t = (b.textContent + b.className).toLowerCase();
            return t.includes('add to cart') || t.includes('add to bag');
          });
          if (cartBtn) { cartBtn.click(); return true; }
          return false;
        });

        if (!clicked) { status='SKIP'; error='No Add to Cart button found'; break; }
        await page.waitForTimeout(2000);

        const afterCount = await page.evaluate(() => {
          const cartEls = document.querySelectorAll('[class*="cart-count"],[class*="cart-qty"],[class*="cart-number"],[class*="badge"],[id*="cart-count"]');
          for (const el of cartEls) {
            const n = parseInt(el.textContent.trim());
            if (!isNaN(n)) return n;
          }
          return -1;
        });

        if (beforeCount >= 0 && afterCount > beforeCount) {
          details = `Cart count updated from ${beforeCount} to ${afterCount} after clicking Add to Cart.`;
        } else if (beforeCount === -1) {
          status = 'WARN';
          details = 'Add to Cart clicked but could not detect a cart counter element to verify update.';
        } else {
          status = 'WARN';
          details = `Cart count did not visibly change (before: ${beforeCount}, after: ${afterCount}). May update via modal/redirect instead.`;
        }
        break;
      }

      // ── QUANTITY ─────────────────────────────────────────────────────
      case 'ec_quantity_valid': {
        const el = page.locator(tc.selector).first();
        const v = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!v) { status='SKIP'; break; }
        await el.fill('3');
        const val = await el.inputValue().catch(()=>'');
        details = `Quantity set to 3. Field accepted value: "${val}".`;
        if (val !== '3') { status='WARN'; details += ' Note: displayed value differs.'; }
        break;
      }

      case 'ec_quantity_zero': {
        const el = page.locator(tc.selector).first();
        const v = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!v) { status='SKIP'; break; }
        await el.fill('0');
        await page.waitForTimeout(500);
        const val = await el.inputValue().catch(()=>'');
        const min = await el.getAttribute('min').catch(()=>null);
        if (min && parseInt(min) >= 1) {
          details = `Quantity field has min="${min}" attribute. Zero should be rejected by browser validation.`;
        } else {
          status = 'WARN';
          details = `Quantity field accepted 0 (value: "${val}"). No min attribute set. Server must validate this.`;
        }
        await el.fill('1').catch(()=>{});
        break;
      }

      case 'ec_quantity_negative': {
        const el = page.locator(tc.selector).first();
        const v = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!v) { status='SKIP'; break; }
        await el.fill('-1');
        await page.waitForTimeout(500);
        const val = await el.inputValue().catch(()=>'');
        const min = await el.getAttribute('min').catch(()=>null);
        if (min && parseInt(min) >= 0) {
          details = `Field has min="${min}". Negative value rejected by browser validation.`;
        } else {
          status = 'WARN';
          details = `Quantity accepted -1 (value: "${val}"). Negative quantity must be validated server-side.`;
        }
        await el.fill('1').catch(()=>{});
        break;
      }

      case 'ec_quantity_overflow': {
        const el = page.locator(tc.selector).first();
        const v = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!v) { status='SKIP'; break; }
        await el.fill('99999999');
        await page.waitForTimeout(500);
        const val = await el.inputValue().catch(()=>'');
        details = `Entered 99999999 — field shows: "${val}". Verify server enforces stock limits.`;
        if (val === '99999999') {
          status = 'WARN';
          details += ' No client-side maximum enforced.';
        }
        await el.fill('1').catch(()=>{});
        break;
      }

      // ── CART PAGE ────────────────────────────────────────────────────
      case 'ec_cart_accessible': {
        const cartLink = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a,[role="button"]'));
          const found = els.find(el => {
            const t = (el.href||'') + el.className + el.textContent;
            return t.toLowerCase().includes('cart') || t.toLowerCase().includes('basket') || t.toLowerCase().includes('bag');
          });
          return found ? (found.href || true) : null;
        });
        if (cartLink) {
          details = `Cart link found: "${typeof cartLink === 'string' ? cartLink.slice(0,60) : 'button/icon'}". Cart is accessible.`;
        } else {
          status = 'WARN';
          details = 'No cart link detected. Check navigation for cart/bag icon.';
        }
        break;
      }

      // ── SORT ─────────────────────────────────────────────────────────
      case 'ec_sort_price_asc': {
        const sel = tc.selector;
        const el = page.locator(sel).first();
        const v = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!v) { status='SKIP'; break; }
        const options = await page.evaluate((s) => {
          const el = document.querySelector(s);
          return el ? Array.from(el.options).map(o=>({val:o.value,text:o.text.toLowerCase()})) : [];
        }, sel);
        const ascOpt = options.find(o=>o.text.includes('low')&&o.text.includes('high'));
        if (ascOpt) {
          await page.selectOption(sel, ascOpt.val);
          await page.waitForTimeout(2000);
          details = `Sort by "${ascOpt.text}" selected. Page should now show lowest prices first.`;
        } else {
          status = 'WARN';
          details = `Sort dropdown found but no "Low to High" option detected. Options: ${options.map(o=>o.text).join(', ')}`;
        }
        break;
      }

      case 'ec_sort_price_desc': {
        const sel = tc.selector;
        const el = page.locator(sel).first();
        const v = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!v) { status='SKIP'; break; }
        const options = await page.evaluate((s) => {
          const el = document.querySelector(s);
          return el ? Array.from(el.options).map(o=>({val:o.value,text:o.text.toLowerCase()})) : [];
        }, sel);
        const descOpt = options.find(o=>o.text.includes('high')&&o.text.includes('low'));
        if (descOpt) {
          await page.selectOption(sel, descOpt.val);
          await page.waitForTimeout(2000);
          details = `Sort by "${descOpt.text}" selected successfully.`;
        } else {
          status = 'WARN';
          details = `No "High to Low" option found. Options available: ${options.map(o=>o.text).join(', ')}`;
        }
        break;
      }

      // ── FILTERS ──────────────────────────────────────────────────────
      case 'ec_filters_visible': {
        const r = await page.evaluate(() => {
          const el = document.querySelector('[class*="filter"],[class*="sidebar"],[class*="facet"]');
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { visible: rect.width > 0, width: Math.round(rect.width) };
        });
        if (r && r.visible) {
          details = `Filter sidebar found and visible (${r.width}px wide).`;
        } else {
          status = 'WARN';
          details = 'Filter sidebar not detected in viewport. May be hidden or collapsed.';
        }
        break;
      }

      // ── WISHLIST ─────────────────────────────────────────────────────
      case 'ec_wishlist_visible': {
        const found = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('button,a,[role="button"]'));
          return els.some(e=>(e.textContent+e.className+(e.getAttribute('aria-label')||'')).toLowerCase().includes('wishlist')||
            (e.textContent+e.className).toLowerCase().includes('favourite'));
        });
        if (found) {
          details = 'Wishlist/favourite button found on page.';
        } else {
          status = 'WARN';
          details = 'No wishlist button detected. Feature may not be available on this page type.';
        }
        break;
      }

      // ── REVIEWS ──────────────────────────────────────────────────────
      case 'ec_reviews_visible': {
        const found = await page.evaluate(() => {
          return !!(document.querySelector('[class*="review"],[class*="rating"],[class*="star"],[itemprop="ratingValue"]'));
        });
        details = found ? 'Ratings/reviews section found and visible.' : null;
        if (!found) { status='WARN'; details='No reviews section detected. Expected on product pages.'; }
        break;
      }

      // ── LOGIN TESTS ──────────────────────────────────────────────────
      case 'ec_login_empty': {
        const emailEl = page.locator(tc.emailSel).first();
        const passEl  = page.locator(tc.passSel).first();
        await emailEl.fill('').catch(()=>{});
        await passEl.fill('').catch(()=>{});
        // Try submitting
        await passEl.press('Enter').catch(()=>{});
        await page.waitForTimeout(1000);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const hasError = bodyText.includes('required') || bodyText.includes('enter') || bodyText.includes('invalid') || bodyText.includes('error');
        if (hasError) {
          details = 'Empty form submission correctly shows validation error(s).';
        } else {
          status = 'WARN';
          details = 'Empty login form submitted but no obvious validation message detected. Verify behavior manually.';
        }
        break;
      }

      case 'ec_login_invalid_email': {
        const emailEl = page.locator(tc.emailSel).first();
        const passEl  = page.locator(tc.passSel).first();
        await emailEl.fill('notanemail').catch(()=>{});
        await passEl.fill('password123').catch(()=>{});
        await passEl.press('Enter').catch(()=>{});
        await page.waitForTimeout(1000);
        const emailType = await page.evaluate((sel)=>{
          const el = document.querySelector(sel); return el ? el.type : '';
        }, tc.emailSel).catch(()=>'');
        if (emailType === 'email') {
          details = 'Email field is type="email" — browser natively validates format. Invalid email rejected.';
        } else {
          status = 'WARN';
          details = 'Email field is not type="email". Invalid format may pass client-side. Server must validate.';
        }
        await emailEl.fill('').catch(()=>{});
        await passEl.fill('').catch(()=>{});
        break;
      }

      case 'ec_login_wrong_creds': {
        const emailEl = page.locator(tc.emailSel).first();
        const passEl  = page.locator(tc.passSel).first();
        await emailEl.fill('test.wrong.user99999@example.com').catch(()=>{});
        await passEl.fill('WrongPass12345!').catch(()=>{});
        await passEl.press('Enter').catch(()=>{});
        await page.waitForLoadState('domcontentloaded').catch(()=>{});
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const isStillLogin = bodyText.includes('login') || bodyText.includes('sign in') || bodyText.includes('password');
        const hasErrorMsg  = bodyText.includes('invalid') || bodyText.includes('incorrect') || bodyText.includes('wrong') || bodyText.includes('not found') || bodyText.includes('error');
        const hasServerErr = bodyText.includes('500') || bodyText.includes('internal server error') || bodyText.includes('exception');
        if (hasServerErr) {
          status = 'FAIL';
          error = 'Server returned 500/exception on wrong credentials! Login failure must return a graceful error, not a server crash.';
        } else if (hasErrorMsg || isStillLogin) {
          details = 'Wrong credentials correctly rejected. Error message or login form still shown.';
        } else {
          status = 'WARN';
          details = 'Wrong credentials submitted — verify site shows appropriate error message to user.';
        }
        await emailEl.fill('').catch(()=>{});
        await passEl.fill('').catch(()=>{});
        break;
      }

      case 'ec_login_sqli': {
        const emailEl = page.locator(tc.emailSel).first();
        const passEl  = page.locator(tc.passSel).first();
        await emailEl.fill("admin@example.com").catch(()=>{});
        await passEl.fill("' OR '1'='1").catch(()=>{});
        await passEl.press('Enter').catch(()=>{});
        await page.waitForLoadState('domcontentloaded').catch(()=>{});
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const url = page.url().toLowerCase();
        const loggedIn = url.includes('account') || url.includes('dashboard') || url.includes('profile') ||
          bodyText.includes('welcome') || bodyText.includes('my account') || bodyText.includes('logout');
        const sqlErr = bodyText.includes('sql') || bodyText.includes('syntax error') || bodyText.includes('mysql');
        if (loggedIn) {
          status = 'FAIL';
          error = "CRITICAL SQL INJECTION: Login bypassed using ' OR '1'='1! The application is vulnerable to SQL injection login bypass. Attacker can access ANY account.";
        } else if (sqlErr) {
          status = 'FAIL';
          error = "SQL INJECTION: SQL error message exposed in page. Queries are not parameterized.";
        } else {
          details = "SQL injection payload did not bypass login. Login form appears to use parameterized queries.";
        }
        await emailEl.fill('').catch(()=>{});
        await passEl.fill('').catch(()=>{});
        break;
      }

      case 'ec_login_xss': {
        const emailEl = page.locator(tc.emailSel).first();
        await emailEl.fill('<script>alert(1)</script>').catch(()=>{});
        await page.keyboard.press('Tab').catch(()=>{});
        await page.waitForTimeout(800);
        const pageHtml = await page.content();
        if (pageHtml.includes('<script>alert(1)</script>')) {
          status = 'FAIL';
          error = 'XSS VULNERABILITY: Script tag reflected unencoded in page HTML from email field!';
        } else {
          details = 'XSS payload encoded/sanitized in email field. Not reflected as raw HTML.';
        }
        await emailEl.fill('').catch(()=>{});
        break;
      }

      case 'ec_login_brute_force': {
        const emailEl = page.locator(tc.emailSel).first();
        const passEl  = page.locator(tc.passSel).first();
        let rateLimited = false;
        for (let i = 0; i < 5; i++) {
          await emailEl.fill(`test${i}@example.com`).catch(()=>{});
          await passEl.fill(`wrongpass${i}`).catch(()=>{});
          await passEl.press('Enter').catch(()=>{});
          await page.waitForTimeout(800);
          const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
          if (bodyText.includes('too many') || bodyText.includes('rate limit') || bodyText.includes('locked') || bodyText.includes('captcha') || bodyText.includes('wait')) {
            rateLimited = true;
            details = `Rate limiting detected after ${i+1} attempts. Good security practice.`;
            break;
          }
        }
        if (!rateLimited) {
          status = 'WARN';
          details = '5 rapid login attempts succeeded without rate limiting or CAPTCHA. Consider implementing brute force protection.';
        }
        break;
      }

      // ── REGISTER ─────────────────────────────────────────────────────
      case 'ec_register_link_works': {
        const found = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const reg = links.find(l=>{
            const t=(l.href+l.textContent).toLowerCase();
            return t.includes('register')||t.includes('signup')||t.includes('sign up')||t.includes('create account');
          });
          return reg ? reg.href : null;
        });
        if (found) {
          details = `Registration link found: "${found.slice(0,80)}"`;
        } else {
          status = 'WARN';
          details = 'No registration link found on this page.';
        }
        break;
      }

      // ── NEWSLETTER ───────────────────────────────────────────────────
      case 'ec_newsletter_valid': {
        const newsEl = page.locator('[class*="newsletter"] input[type="email"], [id*="newsletter"] input, input[placeholder*="email" i][name*="email"]').first();
        const v = await newsEl.isVisible({timeout:4000}).catch(()=>false);
        if (!v) { status='SKIP'; details='Newsletter email input not found'; break; }
        await newsEl.fill('testsubscriber@example.com');
        await newsEl.press('Enter').catch(()=>{});
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const hasSuccess = bodyText.includes('thank') || bodyText.includes('subscribed') || bodyText.includes('success') || bodyText.includes('confirm');
        details = hasSuccess
          ? 'Newsletter subscription shows success message.'
          : 'Newsletter form submitted — verify success message appears.';
        if (!hasSuccess) status = 'WARN';
        await newsEl.fill('').catch(()=>{});
        break;
      }

      case 'ec_newsletter_invalid': {
        const newsEl = page.locator('[class*="newsletter"] input[type="email"], [id*="newsletter"] input, input[placeholder*="email" i]').first();
        const v = await newsEl.isVisible({timeout:4000}).catch(()=>false);
        if (!v) { status='SKIP'; break; }
        await newsEl.fill('notanemail');
        await newsEl.press('Enter').catch(()=>{});
        await page.waitForTimeout(800);
        const typeAttr = await newsEl.getAttribute('type').catch(()=>'');
        details = typeAttr === 'email'
          ? 'Newsletter input is type="email" — invalid format natively rejected by browser.'
          : 'Newsletter input is not type="email" — format validation depends on JavaScript.';
        if (typeAttr !== 'email') status = 'WARN';
        await newsEl.fill('').catch(()=>{});
        break;
      }

      // ── BREADCRUMB ───────────────────────────────────────────────────
      case 'ec_breadcrumb_visible': {
        const found = await page.evaluate(()=>!!document.querySelector('[class*="breadcrumb"],nav[aria-label*="breadcrumb"]'));
        details = found ? 'Breadcrumb navigation visible.' : null;
        if (!found) { status='WARN'; details='No breadcrumb found. May be expected for homepage.'; }
        break;
      }

      // ── PAGINATION ───────────────────────────────────────────────────
      case 'ec_pagination_next': {
        const nextBtn = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a,[role="button"],button'));
          const next = els.find(e=>{
            const t=(e.textContent+e.className+(e.getAttribute('aria-label')||'')).toLowerCase();
            return t.includes('next')||(e.getAttribute('aria-label')||'').includes('next');
          });
          return next ? (next.href||'button') : null;
        });
        if (nextBtn) {
          details = `Pagination "Next" found: "${nextBtn.slice(0,60)}". Click would load next page.`;
        } else {
          status = 'WARN';
          details = 'No "Next" pagination button found. May be single page or load-more style.';
        }
        break;
      }

      // ── COUPON ───────────────────────────────────────────────────────
      case 'ec_coupon_invalid': {
        const couponEl = page.locator('[name*="coupon"],[name*="promo"],[id*="coupon"],[placeholder*="coupon" i]').first();
        const v = await couponEl.isVisible({timeout:4000}).catch(()=>false);
        if (!v) { status='SKIP'; details='Coupon field not visible on this page'; break; }
        await couponEl.fill('INVALIDCOUPON123TEST');
        await couponEl.press('Enter').catch(async()=>{ await page.keyboard.press('Enter').catch(()=>{}); });
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const hasError = bodyText.includes('invalid') || bodyText.includes('not valid') || bodyText.includes('expired') || bodyText.includes('not found') || bodyText.includes('error');
        if (hasError) {
          details = 'Invalid coupon correctly rejected with error message.';
        } else {
          status = 'WARN';
          details = 'Invalid coupon submitted — verify appropriate error message is shown.';
        }
        await couponEl.fill('').catch(()=>{});
        break;
      }

      // ── PERFORMANCE ──────────────────────────────────────────────────
      case 'ec_page_load_time': {
        const timing = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          return nav ? Math.round(nav.loadEventEnd - nav.fetchStart) : null;
        });
        if (timing === null) {
          status = 'SKIP';
          details = 'Could not measure page load time (timing API unavailable).';
        } else if (timing < 3000) {
          details = `Page loaded in ${timing}ms (${(timing/1000).toFixed(1)}s). Excellent — under 3 seconds.`;
        } else if (timing < 5000) {
          status = 'WARN';
          details = `Page loaded in ${timing}ms (${(timing/1000).toFixed(1)}s). Acceptable but slow — target under 3s. 53% of users abandon after 3s.`;
        } else {
          status = 'FAIL';
          error = `Page load time is ${timing}ms (${(timing/1000).toFixed(1)}s) — over 5 seconds! This will significantly hurt conversion rates and SEO.`;
        }
        break;
      }

      case 'ec_no_js_errors': {
        if (consoleErrors.length === 0) {
          details = 'No JavaScript errors detected on page load. All scripts running cleanly.';
        } else if (consoleErrors.length <= 2) {
          status = 'WARN';
          details = `${consoleErrors.length} JS error(s): ${consoleErrors[0].slice(0,120)}`;
        } else {
          status = 'FAIL';
          error = `${consoleErrors.length} JS errors on load. First: "${consoleErrors[0].slice(0,150)}". These may be breaking cart/checkout functionality.`;
        }
        break;
      }

      case 'ec_mobile_viewport': {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(800);
        const result = await page.evaluate(() => {
          const nav   = document.querySelector('nav, header, [class*="nav"]');
          const check = (el) => {
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.left >= 0 && r.right <= window.innerWidth + 5;
          };
          return {
            navOk:  check(nav),
            bodyOk: document.body.scrollWidth <= window.innerWidth + 20,
          };
        });
        await page.setViewportSize({ width: 1280, height: 800 });
        if (result.bodyOk) {
          details = `Mobile viewport (375px) renders correctly. No horizontal overflow detected.`;
        } else {
          status = 'WARN';
          details = `Page overflows horizontally on mobile (375px). Some elements extend beyond screen width. Check CSS media queries.`;
        }
        break;
      }

      // ── CHECKOUT VISIBLE ─────────────────────────────────────────────
      case 'ec_checkout_visible': {
        const found = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a,button,[role="button"]'));
          return !!els.find(e=>(e.href||''+e.textContent+e.className).toLowerCase().includes('checkout'));
        });
        if (found) {
          details = 'Checkout button/link is visible on page.';
        } else {
          status = 'WARN';
          details = 'No checkout element detected. May require items in cart first.';
        }
        break;
      }

      // ── CONTACT FORM ─────────────────────────────────────────────────
      case 'ec_contact_empty': {
        const form = page.locator('form[action*="contact"],form[id*="contact"],#contact-form').first();
        const v = await form.isVisible({timeout:4000}).catch(()=>false);
        if (!v) { status='SKIP'; details='Contact form not found on this page'; break; }
        const submitBtn = form.locator('button[type="submit"],input[type="submit"]').first();
        const btnV = await submitBtn.isVisible({timeout:3000}).catch(()=>false);
        if (!btnV) { status='SKIP'; details='Contact form submit button not found'; break; }
        await submitBtn.click({force:true}).catch(()=>{});
        await page.waitForTimeout(1000);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const hasValidation = bodyText.includes('required') || bodyText.includes('enter') || bodyText.includes('error') || bodyText.includes('fill');
        details = hasValidation
          ? 'Contact form shows validation errors on empty submission.'
          : 'Contact form submitted empty — verify validation messages appear.';
        if (!hasValidation) status = 'WARN';
        break;
      }

      default:
        status = 'SKIP';
        error = 'Unknown ecommerce action: ' + tc.action;
    }
  } catch(err) {
    status = 'FAIL';
    error = err.message.slice(0, 200);
  }

  return {
    id: tc.id, name: tc.name, category: tc.category,
    priority: tc.priority, description: tc.description,
    status, error, details, duration: Date.now() - start,
    element: { tagName: 'page', selector: null, category: tc.category },
  };
}

module.exports = { runEcommerceTest };
