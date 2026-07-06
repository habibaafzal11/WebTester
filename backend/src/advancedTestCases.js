/**
 * advancedTestCases.js
 * Generates test cases for all 10 advanced element types:
 * Autocomplete, Modal, Toast, DataTable, MultiStepForm,
 * HamburgerMenu, CookieBanner, DateRangePicker, InfiniteScroll, SocialLogin
 * Plus: StarRating, OTPInput, RichTextEditor, Carousel, Chart, Map,
 *       LiveChat, PaymentField, Captcha, ColorPicker, Pagination,
 *       DragDrop, Tooltip, Toggle, StickyElement, Breadcrumb
 */

function generateAdvancedTestCases(elements, nextId) {
  const tests = [];

  for (const el of elements) {
    if (!el.visible) continue;

    switch (el.category) {

      // ── AUTOCOMPLETE ─────────────────────────────────────────────────
      case 'Autocomplete':
        tests.push({
          id: nextId(), element: el,
          name: 'Autocomplete - Suggestions Appear After Typing',
          category: 'Functional', priority: 'High',
          description: 'Type 2+ characters and verify suggestion dropdown appears within 2 seconds.',
          action: 'adv_autocomplete_suggestions',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Autocomplete - Keyboard Navigation (Arrow + Enter)',
          category: 'Functional', priority: 'High',
          description: 'Use arrow keys to navigate suggestions and Enter to select. Field should populate with selected value.',
          action: 'adv_autocomplete_keyboard',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Autocomplete - XSS in Typeahead Input',
          category: 'Security', priority: 'Critical',
          description: 'Type <script>alert(1)</script> in autocomplete field. Suggestions must not execute it as HTML.',
          action: 'adv_autocomplete_xss',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Autocomplete - No Results Message',
          category: 'Functional', priority: 'Medium',
          description: 'Type "zzzzxxxxxnotaword9999" and verify a "no results" message appears instead of a blank dropdown.',
          action: 'adv_autocomplete_no_results',
        });
        break;

      // ── MODAL ────────────────────────────────────────────────────────
      case 'Modal':
        tests.push({
          id: nextId(), element: el,
          name: 'Modal - Close Button Works',
          category: 'Functional', priority: 'High',
          description: 'Click the X/close button inside the modal. Modal must close and page must be interactive again.',
          action: 'adv_modal_close_btn',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Modal - Close on Escape Key',
          category: 'Functional', priority: 'High',
          description: 'Press Escape key while modal is open. Modal should close (standard UX behavior).',
          action: 'adv_modal_escape',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Modal - Close on Backdrop Click',
          category: 'Functional', priority: 'Medium',
          description: 'Click outside the modal (on the dark overlay). Modal should close.',
          action: 'adv_modal_backdrop',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Modal - Focus Trapped Inside',
          category: 'Accessibility', priority: 'High',
          description: 'Tab key must stay trapped inside the modal while it is open. Tab should not reach elements behind the modal.',
          action: 'adv_modal_focus_trap',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Modal - Background Not Scrollable',
          category: 'UI', priority: 'Medium',
          description: 'While modal is open, the background page must not scroll. Body should have overflow:hidden or similar.',
          action: 'adv_modal_bg_scroll',
        });
        break;

      // ── MODAL TRIGGER ────────────────────────────────────────────────
      case 'ModalTrigger':
        tests.push({
          id: nextId(), element: el,
          name: `Modal Trigger Opens Modal - "${(el.text || '').slice(0, 40)}"`,
          category: 'Functional', priority: 'High',
          description: 'Click this trigger and verify a modal/dialog appears on the page.',
          action: 'adv_modal_trigger_opens',
        });
        break;

      // ── TOAST / NOTIFICATION ─────────────────────────────────────────
      case 'Toast':
        tests.push({
          id: nextId(), element: el,
          name: `Toast Notification Visible - Type: ${el.alertType || 'info'}`,
          category: 'UI', priority: 'High',
          description: 'A toast/notification is currently visible on the page. Verify it has readable text and correct color (red=error, green=success).',
          action: 'adv_toast_visible',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Toast - Dismissible (Has Close Button)',
          category: 'Functional', priority: 'Medium',
          description: 'If toast has a close/dismiss button, it must work. Clicking it should remove the notification.',
          action: 'adv_toast_dismiss',
        });
        break;

      // ── DATA TABLE ───────────────────────────────────────────────────
      case 'DataTable':
        tests.push({
          id: nextId(), element: el,
          name: `Table Renders Correctly - ${el.rows} rows, ${el.headers} headers`,
          category: 'UI', priority: 'High',
          description: 'Data table must render with correct structure — headers visible, rows populated, no empty cells where data is expected.',
          action: 'adv_table_renders',
        });
        if (el.sortable) {
          tests.push({
            id: nextId(), element: el,
            name: 'Table Column Sorting Works',
            category: 'Functional', priority: 'High',
            description: 'Click a sortable column header. Table rows must reorder. Click again for reverse sort.',
            action: 'adv_table_sort',
          });
        }
        tests.push({
          id: nextId(), element: el,
          name: 'Table Data Not Empty',
          category: 'Functional', priority: 'High',
          description: 'Table must contain data rows. An empty table when data is expected indicates a loading/API failure.',
          action: 'adv_table_not_empty',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Table XSS in Cell Content',
          category: 'Security', priority: 'High',
          description: 'Check that table cell content does not contain unescaped HTML or script tags — a sign that stored XSS data is being rendered.',
          action: 'adv_table_xss_check',
        });
        break;

      // ── WIZARD / MULTI-STEP FORM ─────────────────────────────────────
      case 'WizardForm':
        tests.push({
          id: nextId(), element: el,
          name: `Multi-Step Form - Step Progress Visible (${el.totalSteps} steps)`,
          category: 'UI', priority: 'High',
          description: 'Step indicator/progress bar must be visible and show current step correctly.',
          action: 'adv_wizard_progress_visible',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Multi-Step Form - Cannot Skip Required Steps',
          category: 'Validation', priority: 'Critical',
          description: 'Clicking Next on an incomplete step must show validation errors, not advance to the next step.',
          action: 'adv_wizard_skip_prevention',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Multi-Step Form - Back Button Preserves Data',
          category: 'Functional', priority: 'High',
          description: 'Fill step 1, go to step 2, click Back. Step 1 data must still be there — not wiped.',
          action: 'adv_wizard_back_preserves',
        });
        break;

      // ── HAMBURGER MENU ───────────────────────────────────────────────
      case 'HamburgerMenu':
        tests.push({
          id: nextId(), element: el,
          name: 'Hamburger Menu - Opens on Click',
          category: 'Functional', priority: 'Critical',
          description: 'Click the hamburger/menu icon. Navigation menu must open/expand. aria-expanded must change to true.',
          action: 'adv_hamburger_opens',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Hamburger Menu - Closes on Second Click',
          category: 'Functional', priority: 'High',
          description: 'Click hamburger once to open, click again to close. Menu must collapse.',
          action: 'adv_hamburger_closes',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Hamburger Menu - Links Work Inside',
          category: 'Functional', priority: 'High',
          description: 'After opening the menu, all navigation links inside must be visible and clickable.',
          action: 'adv_hamburger_links',
        });
        break;

      // ── COOKIE BANNER ────────────────────────────────────────────────
      case 'CookieBanner':
        tests.push({
          id: nextId(), element: el,
          name: 'Cookie Banner - Visible on First Visit',
          category: 'Functional', priority: 'High',
          description: 'Cookie consent banner must be visible. Required by GDPR for EU users.',
          action: 'adv_cookie_visible',
        });
        if (el.hasAcceptBtn) {
          tests.push({
            id: nextId(), element: el,
            name: 'Cookie Banner - Accept Button Closes Banner',
            category: 'Functional', priority: 'High',
            description: 'Clicking Accept/Allow must close the cookie banner. Banner must not reappear immediately.',
            action: 'adv_cookie_accept',
            acceptSelector: el.acceptSelector,
          });
        }
        if (el.hasRejectBtn) {
          tests.push({
            id: nextId(), element: el,
            name: 'Cookie Banner - Reject Button Works',
            category: 'Functional', priority: 'High',
            description: 'Clicking Reject/Decline must close the banner without setting tracking cookies.',
            action: 'adv_cookie_reject',
            rejectSelector: el.rejectSelector,
          });
        }
        tests.push({
          id: nextId(), element: el,
          name: 'Cookie Banner - Has Both Accept and Reject Options (GDPR)',
          category: 'Compliance', priority: 'Critical',
          description: 'GDPR requires equal prominence for Accept and Reject. A banner with only Accept button is non-compliant.',
          action: 'adv_cookie_gdpr_compliance',
          hasAcceptBtn: el.hasAcceptBtn,
          hasRejectBtn: el.hasRejectBtn,
        });
        break;

      // ── DATE RANGE PICKER ────────────────────────────────────────────
      case 'DateRangePicker':
        tests.push({
          id: nextId(), element: el,
          name: 'Date Range Picker - Opens on Click',
          category: 'Functional', priority: 'High',
          description: 'Click the date range field. A calendar picker must appear.',
          action: 'adv_daterange_opens',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Date Range Picker - Invalid Range (End Before Start)',
          category: 'Validation', priority: 'Critical',
          description: 'Select a checkout/end date BEFORE the checkin/start date. System must reject this and show an error.',
          action: 'adv_daterange_invalid_range',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Date Range Picker - Past Date Blocked (if applicable)',
          category: 'Validation', priority: 'High',
          description: 'For booking sites, past dates should be grayed out and unselectable.',
          action: 'adv_daterange_past_blocked',
        });
        break;

      // ── INFINITE SCROLL ──────────────────────────────────────────────
      case 'InfiniteScroll':
        tests.push({
          id: nextId(), element: el,
          name: 'Infinite Scroll - More Content Loads on Scroll',
          category: 'Functional', priority: 'High',
          description: 'Scroll to the bottom of the page. New items must load automatically (or "Load More" button appears).',
          action: 'adv_infinite_scroll_loads',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Infinite Scroll - Loading Indicator Appears',
          category: 'UI', priority: 'Medium',
          description: 'A spinner or loading message must appear while more content is being fetched.',
          action: 'adv_infinite_scroll_spinner',
        });
        break;

      // ── SOCIAL LOGIN ─────────────────────────────────────────────────
      case 'SocialLogin':
        tests.push({
          id: nextId(), element: el,
          name: `Social Login Button Visible - ${el.provider || 'Provider'}`,
          category: 'UI', priority: 'High',
          description: `"Continue with ${el.provider}" button must be visible, readable, and have the provider logo.`,
          action: 'adv_social_login_visible',
        });
        tests.push({
          id: nextId(), element: el,
          name: `Social Login Redirect - ${el.provider || 'Provider'}`,
          category: 'Functional', priority: 'High',
          description: `Clicking the ${el.provider} login button must redirect to ${el.provider}'s OAuth page, not show a JS error.`,
          action: 'adv_social_login_redirect',
        });
        break;

      // ── STAR RATING ──────────────────────────────────────────────────
      case 'StarRating':
        tests.push({
          id: nextId(), element: el,
          name: 'Star Rating - Clickable and Selectable',
          category: 'Functional', priority: 'Medium',
          description: 'Click on a star to select a rating. Selected star and previous stars should highlight.',
          action: 'adv_star_rating_click',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Star Rating - Hover Preview Works',
          category: 'UI', priority: 'Low',
          description: 'Hovering over stars should preview the rating visually before clicking.',
          action: 'adv_star_rating_hover',
        });
        break;

      // ── OTP INPUT ────────────────────────────────────────────────────
      case 'OTPInput':
        tests.push({
          id: nextId(), element: el,
          name: `OTP Input - Auto-Advances to Next Box (${el.digitCount} digits)`,
          category: 'Functional', priority: 'High',
          description: 'Typing a digit in one OTP box should automatically focus the next box.',
          action: 'adv_otp_auto_advance',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'OTP Input - Only Accepts Numbers',
          category: 'Validation', priority: 'High',
          description: 'Typing letters in OTP boxes must be rejected. Only 0-9 should be accepted.',
          action: 'adv_otp_numbers_only',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'OTP Input - Paste Full Code Works',
          category: 'Functional', priority: 'High',
          description: 'Pasting a full 6-digit code should distribute digits across all boxes automatically.',
          action: 'adv_otp_paste',
        });
        break;

      // ── RICH TEXT EDITOR ─────────────────────────────────────────────
      case 'RichTextEditor':
        tests.push({
          id: nextId(), element: el,
          name: `Rich Text Editor (${el.editorType}) - Accepts Typing`,
          category: 'Functional', priority: 'High',
          description: 'Click inside the editor and type text. Content must appear correctly.',
          action: 'adv_rte_typing',
        });
        tests.push({
          id: nextId(), element: el,
          name: `Rich Text Editor - XSS via Paste`,
          category: 'Security', priority: 'Critical',
          description: 'Rich text editors are a common XSS vector. Pasting HTML with script tags must be sanitized before saving.',
          action: 'adv_rte_xss',
        });
        break;

      // ── CAROUSEL ────────────────────────────────────────────────────
      case 'Carousel':
        tests.push({
          id: nextId(), element: el,
          name: `Carousel - Next/Prev Navigation (${el.slides} slides)`,
          category: 'Functional', priority: 'High',
          description: 'Click next/previous arrows. Slides must change. Must not get stuck or show blank slide.',
          action: 'adv_carousel_navigation',
        });
        if (el.hasDots) {
          tests.push({
            id: nextId(), element: el,
            name: 'Carousel - Dot Navigation Works',
            category: 'Functional', priority: 'Medium',
            description: 'Click indicator dots to jump to specific slides directly.',
            action: 'adv_carousel_dots',
          });
        }
        tests.push({
          id: nextId(), element: el,
          name: 'Carousel - No Broken Images',
          category: 'UI', priority: 'High',
          description: 'All slide images must load without broken image icons.',
          action: 'adv_carousel_images',
        });
        break;

      // ── PAGINATION ───────────────────────────────────────────────────
      case 'Pagination':
        if (el.hasNext) {
          tests.push({
            id: nextId(), element: el,
            name: 'Pagination - Next Page Loads New Content',
            category: 'Functional', priority: 'High',
            description: 'Click Next. Page must load new unique content, not repeat same items.',
            action: 'adv_pagination_next',
          });
        }
        if (el.hasPrev) {
          tests.push({
            id: nextId(), element: el,
            name: 'Pagination - Previous Page Works',
            category: 'Functional', priority: 'Medium',
            description: 'On page 2+, click Previous. Must go back to previous page correctly.',
            action: 'adv_pagination_prev',
          });
        }
        tests.push({
          id: nextId(), element: el,
          name: 'Pagination - Active Page Highlighted',
          category: 'UI', priority: 'Medium',
          description: 'Current page number must be visually highlighted/active so user knows where they are.',
          action: 'adv_pagination_active',
        });
        break;

      // ── TOGGLE SWITCH ─────────────────────────────────────────────────
      case 'Toggle':
        tests.push({
          id: nextId(), element: el,
          name: `Toggle Switch - Clicks and Changes State`,
          category: 'Functional', priority: 'High',
          description: 'Click the toggle. It must switch between ON and OFF states. aria-checked must update.',
          action: 'adv_toggle_click',
        });
        break;

      // ── TOOLTIP ──────────────────────────────────────────────────────
      case 'Tooltip':
        tests.push({
          id: nextId(), element: el,
          name: `Tooltip Appears on Hover - "${(el.tooltipText || '').slice(0, 40)}"`,
          category: 'UI', priority: 'Low',
          description: 'Hover over element. Tooltip must appear and be readable. Must not be hidden behind other elements.',
          action: 'adv_tooltip_hover',
        });
        break;

      // ── STICKY ELEMENT ───────────────────────────────────────────────
      case 'StickyElement':
        tests.push({
          id: nextId(), element: el,
          name: 'Sticky Element - Stays Visible on Scroll',
          category: 'UI', priority: 'Medium',
          description: 'Scroll down the page. Sticky header/element must remain visible and not overlap main content.',
          action: 'adv_sticky_visible',
        });
        break;

      // ── DRAG AND DROP ────────────────────────────────────────────────
      case 'DragDrop':
        tests.push({
          id: nextId(), element: el,
          name: 'Drag and Drop - Element Is Draggable',
          category: 'Functional', priority: 'High',
          description: 'Verify draggable elements can be picked up (mousedown + mousemove). Drop zones must accept them.',
          action: 'adv_dragdrop_draggable',
        });
        break;

      // ── BREADCRUMB ───────────────────────────────────────────────────
      case 'Breadcrumb':
        tests.push({
          id: nextId(), element: el,
          name: `Breadcrumb - Links Are Clickable (${el.linkCount} links)`,
          category: 'Functional', priority: 'Medium',
          description: 'All breadcrumb links except the last (current page) must be clickable and navigate correctly.',
          action: 'adv_breadcrumb_links',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Breadcrumb - Current Page Not a Link',
          category: 'UI', priority: 'Low',
          description: 'The last item in the breadcrumb (current page) should be plain text, not a clickable link.',
          action: 'adv_breadcrumb_current',
        });
        break;

      // ── CHART ────────────────────────────────────────────────────────
      case 'Chart':
        tests.push({
          id: nextId(), element: el,
          name: `Chart Renders Without Error - ${el.chartType}`,
          category: 'Functional', priority: 'High',
          description: 'Chart canvas/SVG must have content. A blank chart indicates a data loading error.',
          action: 'adv_chart_renders',
        });
        break;

      // ── MAP ──────────────────────────────────────────────────────────
      case 'Map':
        tests.push({
          id: nextId(), element: el,
          name: `Map Loads Correctly - ${el.provider}`,
          category: 'Functional', priority: 'High',
          description: 'Map container must have visible content. A blank/gray map means the API key is missing or invalid.',
          action: 'adv_map_loads',
        });
        break;

      // ── LIVE CHAT ────────────────────────────────────────────────────
      case 'LiveChat':
        tests.push({
          id: nextId(), element: el,
          name: `Live Chat Widget Visible - ${el.provider || 'Chat'}`,
          category: 'UI', priority: 'Medium',
          description: 'Chat widget bubble must be visible in the corner. Clicking it must open the chat window.',
          action: 'adv_livechat_visible',
        });
        break;

      // ── PAYMENT FIELD ─────────────────────────────────────────────────
      case 'PaymentField':
        tests.push({
          id: nextId(), element: el,
          name: `Payment Field Loads - ${el.provider}`,
          category: 'Functional', priority: 'Critical',
          description: 'Payment iframe/field must load without errors. A broken payment form means zero revenue.',
          action: 'adv_payment_loads',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Payment Field - Served Over HTTPS',
          category: 'Security', priority: 'Critical',
          description: 'Payment fields must always be served over HTTPS. HTTP payment forms are a serious PCI-DSS violation.',
          action: 'adv_payment_https',
        });
        break;

      // ── CAPTCHA ──────────────────────────────────────────────────────
      case 'Captcha':
        tests.push({
          id: nextId(), element: el,
          name: `CAPTCHA Present - ${el.provider}`,
          category: 'Security', priority: 'High',
          description: 'CAPTCHA widget must render on the form. Missing CAPTCHA allows bot attacks.',
          action: 'adv_captcha_present',
        });
        break;

      // ── COLOR PICKER ─────────────────────────────────────────────────
      case 'ColorPicker':
        tests.push({
          id: nextId(), element: el,
          name: 'Color Picker - Accepts Hex Input',
          category: 'Functional', priority: 'Medium',
          description: 'Color picker must accept a valid hex color value and update the preview.',
          action: 'adv_colorpicker_input',
        });
        break;

      // ── LOCALE SELECTOR ───────────────────────────────────────────────
      case 'LocaleSelector':
        tests.push({
          id: nextId(), element: el,
          name: `${el.type === 'currency' ? 'Currency' : 'Language'} Selector - Changes on Selection`,
          category: 'Functional', priority: 'High',
          description: `Selecting a different ${el.type} must update the page content accordingly.`,
          action: 'adv_locale_select',
        });
        break;

      // ── SKIP LINK ─────────────────────────────────────────────────────
      case 'SkipLink':
        tests.push({
          id: nextId(), element: el,
          name: 'Skip Navigation Link Works (Accessibility)',
          category: 'Accessibility', priority: 'High',
          description: 'Skip-to-content link must move focus to main content area. Required for keyboard and screen reader users.',
          action: 'adv_skiplink_works',
        });
        break;

      // ── IFRAME ───────────────────────────────────────────────────────
      case 'Iframe':
        if (el.embedType !== 'Generic') {
          tests.push({
            id: nextId(), element: el,
            name: `Iframe Loads - ${el.embedType}`,
            category: 'Functional', priority: 'Medium',
            description: `${el.embedType} embed must load without showing an error message or blank content.`,
            action: 'adv_iframe_loads',
          });
        }
        break;

      // ── ACCORDION ────────────────────────────────────────────────────
      case 'Accordion':
        tests.push({
          id: nextId(), element: el,
          name: `Accordion - Expands on Click`,
          category: 'Functional', priority: 'High',
          description: 'Clicking an accordion header must expand its content panel. aria-expanded must change to true.',
          action: 'adv_accordion_expand',
        });
        tests.push({
          id: nextId(), element: el,
          name: 'Accordion - Collapses on Second Click',
          category: 'Functional', priority: 'Medium',
          description: 'Clicking the same header again must collapse the panel.',
          action: 'adv_accordion_collapse',
        });
        break;
    }
  }

  return tests;
}

module.exports = { generateAdvancedTestCases };
