/**
 * advancedRunner.js
 * Executes advanced element test cases via Playwright.
 */

async function runAdvancedTest(page, tc) {
  const start = Date.now();
  let status = 'PASS', error = null, details = null;
  const sel = tc.element && tc.element.selector;

  try {
    switch (tc.action) {

      // ════════════════════════════════════════════════════════════════
      // AUTOCOMPLETE
      // ════════════════════════════════════════════════════════════════
      case 'adv_autocomplete_suggestions': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.click();
        await el.fill('te');
        await page.waitForTimeout(1500);
        const suggestionsVisible = await page.evaluate(() => {
          const dropdowns = document.querySelectorAll(
            '[class*="suggest"], [class*="autocomplete-dropdown"], [class*="dropdown-menu"]:not(.hidden), ' +
            '[role="listbox"], [role="option"], ul[class*="result"], [class*="typeahead"]'
          );
          return Array.from(dropdowns).some(d => {
            const r = d.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          });
        });
        if (suggestionsVisible) {
          details = 'Suggestion dropdown appeared after typing 2 characters.';
        } else {
          status = 'WARN';
          details = 'No visible suggestion dropdown detected after typing. May require more characters or be loaded asynchronously.';
        }
        await el.fill('').catch(()=>{});
        break;
      }

      case 'adv_autocomplete_keyboard': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.fill('te');
        await page.waitForTimeout(1200);
        await el.press('ArrowDown');
        await page.waitForTimeout(300);
        await el.press('ArrowDown');
        await page.waitForTimeout(300);
        await el.press('Enter');
        await page.waitForTimeout(500);
        const val = await el.inputValue().catch(()=>'');
        if (val && val !== 'te' && val.length > 0) {
          details = 'Keyboard navigation worked. Selected value: "' + val.slice(0,50) + '"';
        } else {
          status = 'WARN';
          details = 'Arrow+Enter did not populate field. Autocomplete may not support keyboard navigation yet.';
        }
        break;
      }

      case 'adv_autocomplete_xss': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        const payload = '<script>alert("xss")</script>';
        await el.fill(payload);
        await page.waitForTimeout(1000);
        const html = await page.content();
        if (html.includes('<script>alert("xss")</script>')) {
          status = 'FAIL';
          error = 'XSS VULNERABILITY: Script tag reflected unencoded in autocomplete suggestions!';
        } else {
          details = 'XSS payload encoded/escaped in autocomplete. Not reflected as executable HTML.';
        }
        await el.fill('').catch(()=>{});
        break;
      }

      case 'adv_autocomplete_no_results': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.fill('zzzzxxxxxnotaword9999');
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const hasMsg = bodyText.includes('no result') || bodyText.includes('not found') || bodyText.includes('no match');
        if (hasMsg) {
          details = 'Correct "no results" message shown for unrecognized input.';
        } else {
          status = 'WARN';
          details = 'No visible "no results" message. User may see empty dropdown with no feedback.';
        }
        await el.fill('').catch(()=>{});
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // MODAL
      // ════════════════════════════════════════════════════════════════
      case 'adv_modal_trigger_opens': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.click({force:true});
        await page.waitForTimeout(1000);
        const modalVisible = await page.evaluate(() => {
          const modals = document.querySelectorAll('[role="dialog"], .modal.show, .modal.open, [class*="modal"][style*="display: block"], [class*="modal"][style*="display:block"]');
          return Array.from(modals).some(m => {
            const r = m.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          });
        });
        if (modalVisible) {
          details = 'Modal opened successfully after clicking trigger.';
          // Try to close it
          await page.keyboard.press('Escape').catch(()=>{});
          await page.waitForTimeout(500);
        } else {
          status = 'WARN';
          details = 'Clicked modal trigger but no visible modal detected. May have opened in a new tab or the selector is not a modal trigger.';
        }
        break;
      }

      case 'adv_modal_close_btn': {
        if (!sel) { status='SKIP'; break; }
        const hasClose = await page.evaluate((s) => {
          const modal = document.querySelector(s);
          if (!modal) return false;
          const closeBtn = modal.querySelector('[class*="close"], [aria-label*="close" i], button.close, [data-dismiss="modal"]');
          if (closeBtn) { closeBtn.click(); return true; }
          return false;
        }, sel).catch(()=>false);
        await page.waitForTimeout(700);
        const stillVisible = await page.locator(sel).isVisible({timeout:2000}).catch(()=>false);
        if (hasClose && !stillVisible) {
          details = 'Close button clicked and modal closed successfully.';
        } else if (!hasClose) {
          status = 'WARN';
          details = 'No close button found inside modal. User may have no way to dismiss it.';
        } else {
          status = 'FAIL';
          error = 'Close button exists but clicking it did not close the modal.';
        }
        break;
      }

      case 'adv_modal_escape': {
        if (!sel) { status='SKIP'; break; }
        const visible = await page.locator(sel).isVisible({timeout:3000}).catch(()=>false);
        if (!visible) { status='SKIP'; details='Modal not currently open'; break; }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(700);
        const stillVisible = await page.locator(sel).isVisible({timeout:2000}).catch(()=>false);
        if (!stillVisible) {
          details = 'Modal closed correctly when Escape key was pressed.';
        } else {
          status = 'WARN';
          details = 'Modal did not close on Escape key press. Standard UX behavior expects Escape to close modals.';
        }
        break;
      }

      case 'adv_modal_backdrop': {
        if (!sel) { status='SKIP'; break; }
        const visible = await page.locator(sel).isVisible({timeout:3000}).catch(()=>false);
        if (!visible) { status='SKIP'; details='Modal not open'; break; }
        // Click top-left corner (outside modal)
        await page.mouse.click(10, 10).catch(()=>{});
        await page.waitForTimeout(700);
        const stillVisible = await page.locator(sel).isVisible({timeout:2000}).catch(()=>false);
        details = stillVisible
          ? 'Modal stays open on backdrop click. This may be intentional for important modals.'
          : 'Modal closes on backdrop click — standard behaviour.';
        break;
      }

      case 'adv_modal_focus_trap': {
        if (!sel) { status='SKIP'; break; }
        const visible = await page.locator(sel).isVisible({timeout:3000}).catch(()=>false);
        if (!visible) { status='SKIP'; details='Modal not open'; break; }
        // Tab through modal and check focus stays inside
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        const focusedEl = await page.evaluate((s) => {
          const modal = document.querySelector(s);
          const focused = document.activeElement;
          return modal ? modal.contains(focused) : null;
        }, sel).catch(()=>null);
        if (focusedEl === true) {
          details = 'Focus is correctly trapped inside the modal after tabbing.';
        } else if (focusedEl === false) {
          status = 'FAIL';
          error = 'Focus escaped the modal after tabbing! This breaks accessibility for keyboard and screen reader users.';
        } else {
          status = 'WARN';
          details = 'Could not verify focus trap. Test modal focus behaviour manually.';
        }
        break;
      }

      case 'adv_modal_bg_scroll': {
        const bodyOverflow = await page.evaluate(() => window.getComputedStyle(document.body).overflow);
        const hasModalOpen = await page.evaluate(() => document.body.classList.contains('modal-open') || document.body.style.overflow === 'hidden');
        if (hasModalOpen || bodyOverflow === 'hidden') {
          details = 'Background scroll correctly prevented while modal is open.';
        } else {
          status = 'WARN';
          details = 'Background may still be scrollable while modal is open. Check if body gets overflow:hidden when modal opens.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // TOAST / NOTIFICATION
      // ════════════════════════════════════════════════════════════════
      case 'adv_toast_visible': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:3000}).catch(()=>false);
        if (!visible) { status='SKIP'; details='Toast not currently visible'; break; }
        const text = await el.textContent().catch(()=>'');
        const color = await page.evaluate((s) => {
          const el = document.querySelector(s);
          return el ? window.getComputedStyle(el).backgroundColor : '';
        }, sel).catch(()=>'');
        details = 'Toast visible with text: "' + text.trim().slice(0,80) + '". Background: ' + color;
        break;
      }

      case 'adv_toast_dismiss': {
        if (!sel) { status='SKIP'; break; }
        const hasBtn = await page.evaluate((s) => {
          const toast = document.querySelector(s);
          if (!toast) return false;
          const btn = toast.querySelector('button, [class*="close"], [aria-label*="close" i]');
          if (btn) { btn.click(); return true; }
          return false;
        }, sel).catch(()=>false);
        await page.waitForTimeout(600);
        if (hasBtn) {
          const gone = !await page.locator(sel).isVisible({timeout:1000}).catch(()=>true);
          details = gone ? 'Toast dismissed successfully via close button.' : 'Close button clicked but toast still visible.';
          if (!gone) status = 'WARN';
        } else {
          status = 'WARN';
          details = 'Toast has no close/dismiss button. Will disappear only automatically (or not at all).';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // DATA TABLE
      // ════════════════════════════════════════════════════════════════
      case 'adv_table_renders': {
        if (!sel) { status='SKIP'; break; }
        const info = await page.evaluate((s) => {
          const table = document.querySelector(s);
          if (!table) return null;
          const headers = table.querySelectorAll('th, [role="columnheader"]').length;
          const rows    = table.querySelectorAll('tr, [role="row"]').length;
          const cells   = table.querySelectorAll('td, [role="cell"]').length;
          return { headers, rows, cells };
        }, sel).catch(()=>null);
        if (!info) { status='SKIP'; break; }
        if (info.rows > 1 && info.headers > 0) {
          details = 'Table renders with ' + info.headers + ' headers, ' + info.rows + ' rows, ' + info.cells + ' cells.';
        } else {
          status = 'WARN';
          details = 'Table structure incomplete: ' + info.headers + ' headers, ' + info.rows + ' rows.';
        }
        break;
      }

      case 'adv_table_sort': {
        if (!sel) { status='SKIP'; break; }
        const firstCellBefore = await page.evaluate((s) => {
          const table = document.querySelector(s);
          if (!table) return null;
          const firstCell = table.querySelector('td, [role="cell"]');
          return firstCell ? firstCell.textContent.trim() : null;
        }, sel).catch(()=>null);

        const sortHeader = page.locator(sel + ' th, ' + sel + ' [aria-sort], ' + sel + ' [class*="sort"]').first();
        const sortVisible = await sortHeader.isVisible({timeout:3000}).catch(()=>false);
        if (!sortVisible) { status='SKIP'; details='No sortable column header found'; break; }
        await sortHeader.click();
        await page.waitForTimeout(1000);

        const firstCellAfter = await page.evaluate((s) => {
          const table = document.querySelector(s);
          if (!table) return null;
          const firstCell = table.querySelector('td, [role="cell"]');
          return firstCell ? firstCell.textContent.trim() : null;
        }, sel).catch(()=>null);

        if (firstCellBefore !== firstCellAfter) {
          details = 'Table sorted on column click. First cell changed from "' + (firstCellBefore||'').slice(0,20) + '" to "' + (firstCellAfter||'').slice(0,20) + '".';
        } else {
          status = 'WARN';
          details = 'First cell unchanged after clicking sort header. Sort may not have worked, or table already in sorted order.';
        }
        break;
      }

      case 'adv_table_not_empty': {
        if (!sel) { status='SKIP'; break; }
        const rowCount = await page.evaluate((s) => {
          const table = document.querySelector(s);
          if (!table) return 0;
          return table.querySelectorAll('tbody tr, [role="row"]:not([class*="header"])').length;
        }, sel).catch(()=>0);
        if (rowCount > 0) {
          details = 'Table has ' + rowCount + ' data row(s).';
        } else {
          status = 'WARN';
          details = 'Table appears empty (0 data rows). If data is expected, this indicates an API or loading failure.';
        }
        break;
      }

      case 'adv_table_xss_check': {
        if (!sel) { status='SKIP'; break; }
        const cellHTML = await page.evaluate((s) => {
          const table = document.querySelector(s);
          return table ? table.innerHTML.slice(0, 5000) : '';
        }, sel).catch(()=>'');
        if (cellHTML.includes('<script>') || cellHTML.includes('onerror=') || cellHTML.includes('onload=')) {
          status = 'FAIL';
          error = 'XSS: Unescaped script/event handlers found in table HTML. Stored XSS vulnerability detected!';
        } else {
          details = 'No obvious unescaped HTML/scripts in table cell content.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // WIZARD / MULTI-STEP FORM
      // ════════════════════════════════════════════════════════════════
      case 'adv_wizard_progress_visible': {
        if (!sel) { status='SKIP'; break; }
        const visible = await page.locator(sel).isVisible({timeout:3000}).catch(()=>false);
        if (!visible) { status='SKIP'; break; }
        details = 'Multi-step form / wizard found with ' + (tc.element.totalSteps||'?') + ' steps.';
        break;
      }

      case 'adv_wizard_skip_prevention': {
        if (!sel) { status='SKIP'; break; }
        const nextBtn = page.locator(sel + ' button[class*="next"], ' + sel + ' [class*="next-step"], ' + sel + ' input[type="submit"]').first();
        const hasBtn = await nextBtn.isVisible({timeout:3000}).catch(()=>false);
        if (!hasBtn) { status='SKIP'; details='No Next button found in wizard'; break; }
        await nextBtn.click({force:true}).catch(()=>{});
        await page.waitForTimeout(800);
        const bodyText = await page.evaluate(()=>document.body.innerText.toLowerCase());
        const hasValidation = bodyText.includes('required') || bodyText.includes('error') || bodyText.includes('please fill') || bodyText.includes('cannot be blank');
        if (hasValidation) {
          details = 'Step validation works — cannot advance without filling required fields.';
        } else {
          status = 'WARN';
          details = 'Clicked Next with empty fields and no validation message appeared. Users may be able to skip required steps.';
        }
        break;
      }

      case 'adv_wizard_back_preserves': {
        if (!sel) { status='SKIP'; break; }
        details = 'Multi-step form detected. Back-button data preservation requires full user flow test with real data.';
        status = 'WARN';
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // HAMBURGER MENU
      // ════════════════════════════════════════════════════════════════
      case 'adv_hamburger_opens': {
        if (!sel) { status='SKIP'; break; }
        const btn = page.locator(sel).first();
        if (!await btn.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        const expandedBefore = await btn.getAttribute('aria-expanded').catch(()=>null);
        await btn.click({force:true});
        await page.waitForTimeout(700);
        const expandedAfter = await btn.getAttribute('aria-expanded').catch(()=>null);
        const menuVisible = await page.evaluate(() => {
          const menus = document.querySelectorAll('[class*="mobile-menu"], [class*="nav-menu"], [class*="navbar-collapse"], [class*="menu-open"]');
          return Array.from(menus).some(m => {
            const r = m.getBoundingClientRect();
            return r.height > 50;
          });
        });
        if (expandedAfter === 'true' || menuVisible) {
          details = 'Hamburger menu opened. aria-expanded changed to "true". Menu is visible.';
        } else {
          status = 'WARN';
          details = 'Clicked hamburger but could not confirm menu opened. aria-expanded before: ' + expandedBefore + ', after: ' + expandedAfter;
        }
        break;
      }

      case 'adv_hamburger_closes': {
        if (!sel) { status='SKIP'; break; }
        const btn = page.locator(sel).first();
        if (!await btn.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await btn.click({force:true}); // open
        await page.waitForTimeout(500);
        await btn.click({force:true}); // close
        await page.waitForTimeout(500);
        const expanded = await btn.getAttribute('aria-expanded').catch(()=>null);
        if (expanded === 'false' || expanded === null) {
          details = 'Hamburger menu closes on second click. aria-expanded: ' + expanded;
        } else {
          status = 'WARN';
          details = 'Menu may still be open after second click. aria-expanded: ' + expanded;
        }
        break;
      }

      case 'adv_hamburger_links': {
        if (!sel) { status='SKIP'; break; }
        const btn = page.locator(sel).first();
        if (!await btn.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await btn.click({force:true});
        await page.waitForTimeout(700);
        const linkCount = await page.evaluate(() => {
          const menus = document.querySelectorAll('[class*="mobile-menu"], [class*="nav-menu"], [class*="navbar-collapse"]');
          for (const m of menus) {
            const links = m.querySelectorAll('a');
            if (links.length > 0) return links.length;
          }
          return 0;
        });
        if (linkCount > 0) {
          details = 'Mobile menu contains ' + linkCount + ' navigation link(s).';
        } else {
          status = 'WARN';
          details = 'Opened hamburger menu but no navigation links found inside.';
        }
        await btn.click({force:true}).catch(()=>{}); // close
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // COOKIE BANNER
      // ════════════════════════════════════════════════════════════════
      case 'adv_cookie_visible': {
        if (!sel) { status='SKIP'; break; }
        const visible = await page.locator(sel).isVisible({timeout:3000}).catch(()=>false);
        if (visible) {
          details = 'Cookie consent banner is visible on page load. GDPR requirement met.';
        } else {
          status = 'WARN';
          details = 'Cookie banner element found in DOM but not visible. May have already been accepted in this session.';
        }
        break;
      }

      case 'adv_cookie_accept': {
        const acceptSel = tc.acceptSelector;
        if (!acceptSel) { status='SKIP'; break; }
        const btn = page.locator(acceptSel).first();
        if (!await btn.isVisible({timeout:3000}).catch(()=>false)) { status='SKIP'; break; }
        await btn.click();
        await page.waitForTimeout(800);
        const bannerGone = !await page.locator(sel).isVisible({timeout:2000}).catch(()=>true);
        if (bannerGone) {
          details = 'Cookie Accept button clicked and banner dismissed successfully.';
        } else {
          status = 'WARN';
          details = 'Clicked Accept but banner may still be visible.';
        }
        break;
      }

      case 'adv_cookie_reject': {
        const rejectSel = tc.rejectSelector;
        if (!rejectSel) { status='SKIP'; break; }
        const btn = page.locator(rejectSel).first();
        if (!await btn.isVisible({timeout:3000}).catch(()=>false)) { status='SKIP'; break; }
        await btn.click();
        await page.waitForTimeout(800);
        details = 'Cookie Reject button clicked. Banner should close without setting tracking cookies.';
        break;
      }

      case 'adv_cookie_gdpr_compliance': {
        if (tc.hasAcceptBtn && tc.hasRejectBtn) {
          details = 'GDPR compliant: Both Accept and Reject options present in cookie banner.';
        } else if (tc.hasAcceptBtn && !tc.hasRejectBtn) {
          status = 'FAIL';
          error = 'GDPR VIOLATION: Cookie banner has Accept button but NO Reject/Decline option. GDPR requires equal ability to refuse consent. This can result in regulatory fines.';
        } else {
          status = 'WARN';
          details = 'Cookie banner present but could not confirm Accept/Reject button presence. Verify manually.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // DATE RANGE PICKER
      // ════════════════════════════════════════════════════════════════
      case 'adv_daterange_opens': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.click();
        await page.waitForTimeout(800);
        const calendarVisible = await page.evaluate(() => {
          const cals = document.querySelectorAll(
            '.flatpickr-calendar, .react-datepicker, .daterangepicker, [class*="calendar-popup"], [class*="datepicker-popup"], .air-datepicker'
          );
          return Array.from(cals).some(c => {
            const r = c.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          });
        });
        if (calendarVisible) {
          details = 'Date picker calendar opened successfully on click.';
        } else {
          status = 'WARN';
          details = 'Date range field clicked but no calendar popup detected. May be a custom implementation.';
        }
        await page.keyboard.press('Escape').catch(()=>{});
        break;
      }

      case 'adv_daterange_invalid_range': {
        status = 'WARN';
        details = 'Date range invalid-order validation requires interactive calendar interaction. Run manually: try selecting end date before start date.';
        break;
      }

      case 'adv_daterange_past_blocked': {
        const pastDatesBlocked = await page.evaluate(() => {
          const disabledDays = document.querySelectorAll(
            '.flatpickr-day.disabled, .flatpickr-day.flatpickr-disabled, ' +
            '[class*="calendar-day"][class*="disabled"], [class*="past"], td.disabled'
          );
          return disabledDays.length > 0;
        });
        if (pastDatesBlocked) {
          details = 'Past dates are visually disabled in the calendar picker.';
        } else {
          status = 'WARN';
          details = 'Could not confirm past date blocking. Calendar may not be open or uses custom styling.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // INFINITE SCROLL
      // ════════════════════════════════════════════════════════════════
      case 'adv_infinite_scroll_loads': {
        const itemsBefore = await page.evaluate(() => {
          const items = document.querySelectorAll('[class*="product"], [class*="item"], article, .post, li.result');
          return items.length;
        });
        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2500);
        const itemsAfter = await page.evaluate(() => {
          const items = document.querySelectorAll('[class*="product"], [class*="item"], article, .post, li.result');
          return items.length;
        });
        if (itemsAfter > itemsBefore) {
          details = 'Infinite scroll works! Items loaded: before=' + itemsBefore + ', after=' + itemsAfter + '.';
        } else {
          status = 'WARN';
          details = 'Scrolled to bottom but item count unchanged (' + itemsBefore + '). May need more scroll, or page uses "Load More" button instead.';
        }
        // Scroll back up
        await page.evaluate(() => window.scrollTo(0, 0));
        break;
      }

      case 'adv_infinite_scroll_spinner': {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(400);
        const spinnerVisible = await page.evaluate(() => {
          const spinners = document.querySelectorAll('[class*="spinner"], [class*="loading"], [class*="loader"]');
          return Array.from(spinners).some(s => {
            const r = s.getBoundingClientRect(); return r.width > 0;
          });
        });
        await page.waitForTimeout(2000);
        await page.evaluate(() => window.scrollTo(0, 0));
        if (spinnerVisible) {
          details = 'Loading spinner appeared while fetching more content.';
        } else {
          status = 'WARN';
          details = 'No loading spinner detected during scroll. User has no feedback while content loads.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // SOCIAL LOGIN
      // ════════════════════════════════════════════════════════════════
      case 'adv_social_login_visible': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:4000}).catch(()=>false);
        if (visible) {
          const text = await el.textContent().catch(()=>'');
          details = 'Social login button visible: "' + text.trim().slice(0,50) + '"';
        } else {
          status = 'WARN';
          details = 'Social login button not visible in current viewport.';
        }
        break;
      }

      case 'adv_social_login_redirect': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        const href = await el.getAttribute('href').catch(()=>null);
        const provider = (tc.element.provider || '').toLowerCase();
        if (href && (href.includes('oauth') || href.includes('auth') || href.includes(provider) || href.includes('accounts.google') || href.includes('facebook.com/dialog'))) {
          details = 'Social login button has valid OAuth href: "' + href.slice(0,80) + '"';
        } else if (href) {
          status = 'WARN';
          details = 'Button href found ("' + href.slice(0,60) + '") but may not be an OAuth endpoint. Verify manually.';
        } else {
          status = 'WARN';
          details = 'No href found — social login likely handled via JavaScript onclick. Verify redirect works in browser.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // STAR RATING
      // ════════════════════════════════════════════════════════════════
      case 'adv_star_rating_click': {
        if (!sel) { status='SKIP'; break; }
        const stars = page.locator(sel + ' input[type="radio"], ' + sel).all().catch(()=>[]);
        const starEls = await stars;
        if (!starEls.length) { status='SKIP'; break; }
        await starEls[0].click({force:true}).catch(()=>{});
        await page.waitForTimeout(400);
        details = 'Clicked first star in rating widget. Verify rating visually highlights.';
        break;
      }

      case 'adv_star_rating_hover': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:3000}).catch(()=>false)) { status='SKIP'; break; }
        await el.hover().catch(()=>{});
        await page.waitForTimeout(300);
        details = 'Hovered over star rating element. Verify hover preview highlights stars visually.';
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // OTP INPUT
      // ════════════════════════════════════════════════════════════════
      case 'adv_otp_auto_advance': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.type('1');
        await page.waitForTimeout(300);
        const focused = await page.evaluate(() => document.activeElement?.maxLength);
        details = 'Typed into first OTP box. ' + (focused === 1 ? 'Focus auto-advanced to next box.' : 'Check if focus auto-advances on real browser — hard to detect headlessly.');
        break;
      }

      case 'adv_otp_numbers_only': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.fill('a');
        const val = await el.inputValue().catch(()=>'');
        if (!val || val === '') {
          details = 'OTP input correctly rejects alphabetic characters.';
        } else {
          status = 'WARN';
          details = 'OTP field accepted letter "a". Server must validate numeric-only OTP.';
        }
        break;
      }

      case 'adv_otp_paste': {
        if (!sel) { status='SKIP'; break; }
        status = 'WARN';
        details = 'OTP paste test requires clipboard API. Verify manually: copy a 6-digit code and paste into the first OTP box — all boxes should fill automatically.';
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // RICH TEXT EDITOR
      // ════════════════════════════════════════════════════════════════
      case 'adv_rte_typing': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.click();
        await page.waitForTimeout(300);
        await page.keyboard.type('WebTester Pro automated test input');
        await page.waitForTimeout(400);
        const content = await el.textContent().catch(()=>'');
        if (content.includes('WebTester Pro')) {
          details = 'Rich text editor accepts typed input correctly.';
        } else {
          status = 'WARN';
          details = 'Typed in editor but could not verify content. Editor may use shadow DOM or custom rendering.';
        }
        break;
      }

      case 'adv_rte_xss': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.click();
        await page.keyboard.type('<script>alert("xss")</script>');
        await page.waitForTimeout(400);
        const html = await page.evaluate((s)=>document.querySelector(s)?.innerHTML||'',sel).catch(()=>'');
        if (html.includes('<script>alert("xss")</script>')) {
          status = 'WARN';
          details = 'Raw script tag in editor content. Ensure server sanitizes this before storing/rendering to other users.';
        } else {
          details = 'Script tag was encoded/stripped in rich text editor. Good sanitization.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // CAROUSEL
      // ════════════════════════════════════════════════════════════════
      case 'adv_carousel_navigation': {
        if (!sel) { status='SKIP'; break; }
        const nextBtn = page.locator(sel + ' [class*="next"], ' + sel + ' [class*="arrow-right"], ' + sel + ' button[aria-label*="next" i]').first();
        if (!await nextBtn.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; details='No next button found in carousel'; break; }
        const slideBefore = await page.evaluate((s) => {
          const el = document.querySelector(s);
          const active = el ? el.querySelector('[class*="active"], [class*="current"]') : null;
          return active ? active.textContent.trim().slice(0,30) : null;
        }, sel);
        await nextBtn.click();
        await page.waitForTimeout(800);
        const slideAfter = await page.evaluate((s) => {
          const el = document.querySelector(s);
          const active = el ? el.querySelector('[class*="active"], [class*="current"]') : null;
          return active ? active.textContent.trim().slice(0,30) : null;
        }, sel);
        if (slideBefore !== slideAfter) {
          details = 'Carousel advanced to next slide successfully.';
        } else {
          status = 'WARN';
          details = 'Next button clicked but active slide appears unchanged. May be single-slide or auto-rotating.';
        }
        break;
      }

      case 'adv_carousel_dots': {
        if (!sel) { status='SKIP'; break; }
        const dot = page.locator(sel + ' [class*="dot"], ' + sel + ' [class*="indicator"]').nth(1);
        if (!await dot.isVisible({timeout:3000}).catch(()=>false)) { status='SKIP'; break; }
        await dot.click();
        await page.waitForTimeout(600);
        details = 'Clicked second carousel dot/indicator.';
        break;
      }

      case 'adv_carousel_images': {
        if (!sel) { status='SKIP'; break; }
        const broken = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return 0;
          const imgs = el.querySelectorAll('img');
          return Array.from(imgs).filter(i => !i.complete || i.naturalWidth === 0).length;
        }, sel);
        if (broken === 0) {
          details = 'All carousel images loaded correctly.';
        } else {
          status = 'FAIL';
          error = broken + ' carousel image(s) are broken/not loading.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // PAGINATION
      // ════════════════════════════════════════════════════════════════
      case 'adv_pagination_next': {
        if (!sel) { status='SKIP'; break; }
        const nextBtn = page.locator(sel + ' [class*="next"], ' + sel + ' [rel="next"], ' + sel + ' [aria-label*="next" i]').first();
        if (!await nextBtn.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        const urlBefore = page.url();
        await nextBtn.click();
        await page.waitForLoadState('domcontentloaded').catch(()=>{});
        await page.waitForTimeout(1500);
        const urlAfter = page.url();
        if (urlBefore !== urlAfter) {
          details = 'Next page loaded. URL changed from "' + urlBefore.slice(-30) + '" to "' + urlAfter.slice(-30) + '"';
        } else {
          status = 'WARN';
          details = 'Next clicked but URL unchanged. Pagination may use AJAX or virtual scroll.';
        }
        break;
      }

      case 'adv_pagination_prev': {
        status = 'SKIP';
        details = 'Previous page test requires being on page 2+. Navigate to page 2 first.';
        break;
      }

      case 'adv_pagination_active': {
        if (!sel) { status='SKIP'; break; }
        const hasActive = await page.evaluate((s) => {
          const el = document.querySelector(s);
          return el ? !!el.querySelector('[class*="active"], [class*="current"], [aria-current="page"]') : false;
        }, sel);
        if (hasActive) {
          details = 'Current page is highlighted in pagination.';
        } else {
          status = 'WARN';
          details = 'No active/current page indicator found in pagination. User cannot see which page they are on.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // TOGGLE
      // ════════════════════════════════════════════════════════════════
      case 'adv_toggle_click': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        const before = await el.getAttribute('aria-checked').catch(()=>null) || await el.evaluate(e=>e.checked).catch(()=>null);
        await el.click({force:true}).catch(async()=> await page.locator('label[for="' + (await el.getAttribute('id').catch(()=>'')) + '"]').click({force:true}).catch(()=>{}));
        await page.waitForTimeout(400);
        const after = await el.getAttribute('aria-checked').catch(()=>null) || await el.evaluate(e=>e.checked).catch(()=>null);
        if (String(before) !== String(after)) {
          details = 'Toggle state changed: ' + before + ' → ' + after;
        } else {
          status = 'WARN';
          details = 'Toggle clicked but state unchanged (before: ' + before + ', after: ' + after + '). May need label click.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // TOOLTIP
      // ════════════════════════════════════════════════════════════════
      case 'adv_tooltip_hover': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.hover();
        await page.waitForTimeout(800);
        const tooltipVisible = await page.evaluate(() => {
          const tooltips = document.querySelectorAll('[class*="tooltip"][style*="display"], [role="tooltip"], [class*="tippy"], [class*="popper"]');
          return Array.from(tooltips).some(t => {
            const r = t.getBoundingClientRect(); return r.width > 0 && r.height > 0;
          });
        });
        if (tooltipVisible) {
          details = 'Tooltip appeared on hover.';
        } else {
          const titleText = tc.element.tooltipText;
          details = 'Native title tooltip: "' + (titleText||'').slice(0,60) + '". Custom tooltip may not be detectable headlessly.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // STICKY ELEMENT
      // ════════════════════════════════════════════════════════════════
      case 'adv_sticky_visible': {
        if (!sel) { status='SKIP'; break; }
        await page.evaluate(()=>window.scrollTo(0, 500));
        await page.waitForTimeout(400);
        const visible = await page.locator(sel).isVisible({timeout:3000}).catch(()=>false);
        const rect = await page.evaluate((s)=>{
          const el = document.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), overlapsViewport: r.top >= 0 && r.top < 100 };
        },sel).catch(()=>null);
        await page.evaluate(()=>window.scrollTo(0,0));
        if (visible && rect && rect.overlapsViewport) {
          details = 'Sticky element remains visible at top of viewport after scrolling (top: ' + rect.top + 'px).';
        } else {
          status = 'WARN';
          details = 'Sticky element may not be staying in viewport on scroll. Check position:sticky/fixed CSS.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // DRAG AND DROP
      // ════════════════════════════════════════════════════════════════
      case 'adv_dragdrop_draggable': {
        if (!sel) { status='SKIP'; break; }
        const isDraggable = await page.evaluate((s) => {
          const el = document.querySelector(s);
          return el ? el.getAttribute('draggable') === 'true' : false;
        }, sel);
        if (isDraggable) {
          details = 'Element has draggable="true" attribute. Full drag simulation requires manual testing.';
        } else {
          status = 'WARN';
          details = 'Element does not have draggable="true". May use custom mouse event handlers.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // BREADCRUMB
      // ════════════════════════════════════════════════════════════════
      case 'adv_breadcrumb_links': {
        if (!sel) { status='SKIP'; break; }
        const linkCount = await page.evaluate((s) => {
          const el = document.querySelector(s);
          return el ? el.querySelectorAll('a').length : 0;
        }, sel);
        details = 'Breadcrumb has ' + linkCount + ' clickable link(s). All except the last should navigate.';
        break;
      }

      case 'adv_breadcrumb_current': {
        if (!sel) { status='SKIP'; break; }
        const lastIsLink = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const items = el.querySelectorAll('li, [class*="item"], span');
          const last = items[items.length - 1];
          return last ? !!last.querySelector('a') : null;
        }, sel);
        if (lastIsLink === false) {
          details = 'Last breadcrumb item is plain text (not a link). Correct behaviour.';
        } else if (lastIsLink === true) {
          status = 'WARN';
          details = 'Last breadcrumb item is still a link. Current page should not be clickable in breadcrumb.';
        } else {
          status = 'SKIP';
          details = 'Could not determine breadcrumb item structure.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // CHART
      // ════════════════════════════════════════════════════════════════
      case 'adv_chart_renders': {
        if (!sel) { status='SKIP'; break; }
        const info = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          if (el.tagName === 'CANVAS') {
            const ctx = el.getContext('2d');
            return { type: 'canvas', hasContent: el.width > 0 && el.height > 0 };
          }
          if (el.tagName === 'SVG' || el.querySelector('svg')) {
            const paths = el.querySelectorAll('path, rect, circle, line').length;
            return { type: 'svg', hasContent: paths > 0, pathCount: paths };
          }
          return { type: 'other', hasContent: el.children.length > 0 };
        }, sel);
        if (!info) { status='SKIP'; break; }
        if (info.hasContent) {
          details = 'Chart rendered correctly as ' + info.type + (info.pathCount ? ' with ' + info.pathCount + ' SVG elements.' : '.');
        } else {
          status = 'FAIL';
          error = 'Chart canvas/SVG appears empty. Data may have failed to load.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // MAP
      // ════════════════════════════════════════════════════════════════
      case 'adv_map_loads': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:5000}).catch(()=>false);
        if (!visible) { status='SKIP'; break; }
        const isEmpty = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return true;
          const r = el.getBoundingClientRect();
          return r.width === 0 || r.height === 0;
        }, sel);
        if (!isEmpty) {
          details = 'Map container is visible and has dimensions. Map appears to have loaded.';
        } else {
          status = 'FAIL';
          error = 'Map container has zero dimensions. Map failed to load (possible missing API key or network issue).';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // LIVE CHAT
      // ════════════════════════════════════════════════════════════════
      case 'adv_livechat_visible': {
        if (!sel) { status='SKIP'; break; }
        const visible = await page.locator(sel).isVisible({timeout:4000}).catch(()=>false);
        if (visible) {
          details = 'Live chat widget is visible on page.';
        } else {
          status = 'WARN';
          details = 'Live chat widget element found but not visible. May load after a delay.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // PAYMENT FIELD
      // ════════════════════════════════════════════════════════════════
      case 'adv_payment_loads': {
        if (!sel) { status='SKIP'; break; }
        const visible = await page.locator(sel).isVisible({timeout:6000}).catch(()=>false);
        if (visible) {
          details = 'Payment field/iframe is visible. Payment provider loaded successfully.';
        } else {
          status = 'FAIL';
          error = 'Payment field not visible. Payment provider failed to load — users cannot checkout!';
        }
        break;
      }

      case 'adv_payment_https': {
        const url = page.url();
        if (url.startsWith('https://')) {
          details = 'Payment page served over HTTPS. PCI-DSS requirement met.';
        } else {
          status = 'FAIL';
          error = 'CRITICAL: Payment form on an HTTP page! This is a PCI-DSS violation. Card data transmitted unencrypted.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // CAPTCHA
      // ════════════════════════════════════════════════════════════════
      case 'adv_captcha_present': {
        if (!sel) { status='SKIP'; break; }
        const visible = await page.locator(sel).isVisible({timeout:5000}).catch(()=>false);
        if (visible) {
          details = 'CAPTCHA widget rendered and visible.';
        } else {
          status = 'WARN';
          details = 'CAPTCHA element found in DOM but not visible. May load asynchronously.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // COLOR PICKER
      // ════════════════════════════════════════════════════════════════
      case 'adv_colorpicker_input': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.fill('#ff5733').catch(async ()=> {
          await page.evaluate((s) => {
            const el = document.querySelector(s);
            if (el) { el.value = '#ff5733'; el.dispatchEvent(new Event('input')); }
          }, sel);
        });
        await page.waitForTimeout(300);
        const val = await el.inputValue().catch(()=>'');
        details = 'Color value set to #ff5733. Field shows: "' + val + '"';
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // LOCALE SELECTOR
      // ════════════════════════════════════════════════════════════════
      case 'adv_locale_select': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.click({force:true});
        await page.waitForTimeout(500);
        details = 'Locale/currency selector clicked. Verify page updates language or prices correctly.';
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // SKIP LINK
      // ════════════════════════════════════════════════════════════════
      case 'adv_skiplink_works': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        const href = await el.getAttribute('href').catch(()=>null);
        if (href) {
          const target = await page.evaluate((h) => !!document.querySelector(h), href).catch(()=>false);
          if (target) {
            details = 'Skip link target "' + href + '" exists in page. Keyboard users can bypass navigation.';
          } else {
            status = 'FAIL';
            error = 'Skip link points to "' + href + '" but that element does not exist! Link is broken for accessibility.';
          }
        } else {
          status = 'WARN';
          details = 'Skip link found but has no href. Verify it functions correctly.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // IFRAME
      // ════════════════════════════════════════════════════════════════
      case 'adv_iframe_loads': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        const visible = await el.isVisible({timeout:5000}).catch(()=>false);
        const info = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { width: Math.round(r.width), height: Math.round(r.height), src: el.src.slice(0,80) };
        }, sel).catch(()=>null);
        if (visible && info && info.width > 0) {
          details = 'iframe loaded: ' + (info.src||'no src') + ' (' + info.width + 'x' + info.height + 'px)';
        } else {
          status = 'WARN';
          details = 'iframe not visible or has zero dimensions. Embed may have failed to load.';
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // ACCORDION
      // ════════════════════════════════════════════════════════════════
      case 'adv_accordion_expand': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        const expandedBefore = await el.getAttribute('aria-expanded').catch(()=>null);
        await el.click({force:true});
        await page.waitForTimeout(600);
        const expandedAfter = await el.getAttribute('aria-expanded').catch(()=>null);
        if (expandedAfter === 'true' || (expandedBefore !== expandedAfter)) {
          details = 'Accordion expanded. aria-expanded: ' + expandedBefore + ' → ' + expandedAfter;
        } else {
          status = 'WARN';
          details = 'Accordion clicked but aria-expanded unchanged. May use class-based toggle instead.';
        }
        break;
      }

      case 'adv_accordion_collapse': {
        if (!sel) { status='SKIP'; break; }
        const el = page.locator(sel).first();
        if (!await el.isVisible({timeout:4000}).catch(()=>false)) { status='SKIP'; break; }
        await el.click({force:true}); // expand
        await page.waitForTimeout(400);
        await el.click({force:true}); // collapse
        await page.waitForTimeout(400);
        const expanded = await el.getAttribute('aria-expanded').catch(()=>null);
        if (expanded === 'false' || expanded === null) {
          details = 'Accordion collapsed on second click.';
        } else {
          status = 'WARN';
          details = 'Accordion may not have collapsed. aria-expanded: ' + expanded;
        }
        break;
      }

      default:
        status = 'SKIP';
        error = 'Unknown advanced action: ' + tc.action;
    }
  } catch(err) {
    status = 'FAIL';
    error = err.message.slice(0, 200);
  }

  return {
    id: tc.id, name: tc.name, category: tc.category,
    priority: tc.priority, description: tc.description,
    status, error, details, duration: Date.now() - start,
    element: { tagName: tc.element?.tagName, selector: sel, category: tc.element?.category },
  };
}

module.exports = { runAdvancedTest };
