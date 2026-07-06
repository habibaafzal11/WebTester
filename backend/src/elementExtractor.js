/**
 * elementExtractor.js
 * Extracts ALL testable elements from a webpage.
 * Covers: basic HTML, ecommerce, advanced UI components, accessibility, responsive
 */

async function extractElements(page) {
  const elements = await page.evaluate(() => {
    const results = [];
    const seen = new Set();

    // Safely escape any string for use inside a CSS selector. Without this,
    // classes containing characters that are extremely common in modern
    // frameworks — e.g. Tailwind's "sm:w-1/2", "hover:bg-blue-500",
    // "lg:grid-cols-3" — produce a syntactically INVALID selector. Playwright
    // throws when it's used, which every call site here swallows with
    // .catch(()=>false)/.catch(()=>{}), silently turning the test into a
    // false "SKIP". This was the single biggest cause of skipped tests.
    function cssEscape(str) {
      if (window.CSS && CSS.escape) return CSS.escape(str);
      return String(str).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    }

    // Build a structural (nth-of-type) path as a fallback when there's no
    // id/name and no class combination that uniquely identifies the element.
    // This is still 100% valid CSS and, unlike a bare tag name, actually
    // points at the specific element instead of "whichever <button> happens
    // to be first in the DOM" (which is often a hidden/unrelated one and
    // was the other major source of false skips/incorrect results).
    function buildPath(el, maxDepth) {
      const parts = [];
      let node = el, depth = 0;
      while (node && node.nodeType === 1 && depth < maxDepth) {
        if (node.id) { parts.unshift('#' + cssEscape(node.id)); break; }
        const tag = node.tagName.toLowerCase();
        const parent = node.parentElement;
        if (!parent) { parts.unshift(tag); break; }
        const siblings = Array.from(parent.children).filter(c => c.tagName === node.tagName);
        const idx = siblings.indexOf(node) + 1;
        parts.unshift(siblings.length > 1 ? tag + ':nth-of-type(' + idx + ')' : tag);
        node = parent;
        depth++;
      }
      return parts.join(' > ');
    }

    function getSelector(el) {
      try {
        if (el.id) return '#' + cssEscape(el.id);
        if (el.name) return el.tagName.toLowerCase() + '[name="' + String(el.name).replace(/"/g, '\\"') + '"]';

        const cls = Array.from(el.classList)
          .filter(c => c.length > 1 && !c.match(/^(active|open|visible|hidden|show|fade|selected|focus(ed)?|disabled)$/i))
          .slice(0, 3);

        if (cls.length) {
          const sel = el.tagName.toLowerCase() + cls.map(c => '.' + cssEscape(c)).join('');
          try {
            // Only trust the class-based selector if it's actually unique —
            // otherwise it may silently bind to the wrong (e.g. hidden) element.
            if (document.querySelectorAll(sel).length === 1) return sel;
          } catch (e) { /* fall through to structural path */ }
        }

        return buildPath(el, 6);
      } catch (e) {
        return el.tagName ? el.tagName.toLowerCase() : '*';
      }
    }

    function isVisible(el) {
      try {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 &&
               style.visibility !== 'hidden' &&
               style.display !== 'none' &&
               style.opacity !== '0';
      } catch(e) { return false; }
    }

    function add(category, el, extra = {}) {
      try {
        const sel = getSelector(el);
        const key = category + '::' + sel + '::' + (el.textContent || '').trim().slice(0, 20);
        if (seen.has(key)) return;
        seen.add(key);
        results.push({
          category,
          tagName:    el.tagName.toLowerCase(),
          selector:   sel,
          id:         el.id || null,
          name:       el.name || null,
          type:       el.type || null,
          text:       (el.textContent || '').trim().slice(0, 80),
          placeholder: el.placeholder || null,
          ariaLabel:  el.getAttribute('aria-label') || null,
          required:   el.required || false,
          disabled:   el.disabled || false,
          visible:    isVisible(el),
          href:       el.href || null,
          alt:        el.alt || null,
          ...extra,
        });
      } catch(e) {}
    }

    // ── 1. BUTTONS ──────────────────────────────────────────────────────
    document.querySelectorAll('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]')
      .forEach(el => add('Button', el));

    // ── 2. TEXT INPUTS ──────────────────────────────────────────────────
    document.querySelectorAll('input[type="text"], input[type="search"], input:not([type])')
      .forEach(el => add('TextInput', el));

    // ── 3. EMAIL INPUTS ─────────────────────────────────────────────────
    document.querySelectorAll('input[type="email"]').forEach(el => add('EmailInput', el));

    // ── 4. PASSWORD INPUTS ──────────────────────────────────────────────
    document.querySelectorAll('input[type="password"]').forEach(el => add('PasswordInput', el));

    // ── 5. NUMBER INPUTS ────────────────────────────────────────────────
    document.querySelectorAll('input[type="number"]').forEach(el => add('NumberInput', el, {
      min: el.min || null, max: el.max || null
    }));

    // ── 6. DATE / TIME INPUTS ───────────────────────────────────────────
    document.querySelectorAll('input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"]')
      .forEach(el => add('DateInput', el));

    // ── 7. FILE INPUTS ──────────────────────────────────────────────────
    document.querySelectorAll('input[type="file"]').forEach(el => add('FileInput', el, {
      accept: el.accept || null, multiple: el.multiple || false
    }));

    // ── 8. CHECKBOXES ───────────────────────────────────────────────────
    document.querySelectorAll('input[type="checkbox"]').forEach(el => add('Checkbox', el, { checked: el.checked }));

    // ── 9. RADIO BUTTONS ────────────────────────────────────────────────
    document.querySelectorAll('input[type="radio"]').forEach(el => add('RadioButton', el, { checked: el.checked }));

    // ── 10. TEXTAREAS ───────────────────────────────────────────────────
    document.querySelectorAll('textarea').forEach(el => add('Textarea', el, {
      maxLength: el.maxLength > 0 ? el.maxLength : null
    }));

    // ── 11. SELECT DROPDOWNS ────────────────────────────────────────────
    document.querySelectorAll('select').forEach(el => add('Dropdown', el, {
      multiple: el.multiple,
      optionCount: el.options.length,
      options: Array.from(el.options).slice(0, 10).map(o => o.text)
    }));

    // ── 12. RANGE SLIDERS ───────────────────────────────────────────────
    document.querySelectorAll('input[type="range"]').forEach(el => add('RangeSlider', el, {
      min: el.min, max: el.max, value: el.value
    }));

    // ── 13. LINKS ───────────────────────────────────────────────────────
    document.querySelectorAll('a[href]').forEach(el => {
      const href = el.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:'))
        add('Link', el);
    });

    // ── 14. NAVIGATION ──────────────────────────────────────────────────
    document.querySelectorAll('nav, [role="navigation"]').forEach(el => {
      add('Navigation', el, { linkCount: el.querySelectorAll('a').length });
    });

    // ── 15. FORMS ───────────────────────────────────────────────────────
    document.querySelectorAll('form').forEach(el => {
      add('Form', el, {
        action: el.action || null,
        method: el.method || 'get',
        fieldCount: el.querySelectorAll('input, select, textarea').length
      });
    });

    // ── 16. IMAGES ──────────────────────────────────────────────────────
    document.querySelectorAll('img').forEach(el => add('Image', el, {
      alt: el.alt || null, src: (el.src || '').slice(0, 60),
      // hasAltAttr: whether the attribute exists at all (alt="" on a
      // decorative image is valid WCAG and must NOT count as missing).
      hasAlt: !!el.alt, hasAltAttr: el.hasAttribute('alt')
    }));

    // ── 17. TABS ────────────────────────────────────────────────────────
    document.querySelectorAll('[role="tab"], .tab, .nav-tab, [class*="tab-item"]').forEach(el => add('Tab', el));

    // ── 18. MEDIA ───────────────────────────────────────────────────────
    document.querySelectorAll('video, audio').forEach(el => add('MediaElement', el, {
      controls: el.controls, autoplay: el.autoplay
    }));

    // ── 19. TOGGLE SWITCHES ─────────────────────────────────────────────
    document.querySelectorAll(
      'input[type="checkbox"][class*="toggle"], input[type="checkbox"][class*="switch"], ' +
      '[class*="toggle-switch"], [class*="toggle_switch"], [role="switch"]'
    ).forEach(el => add('Toggle', el, { checked: el.checked || el.getAttribute('aria-checked') === 'true' }));

    // ── 20. AUTOCOMPLETE / TYPEAHEAD ────────────────────────────────────
    document.querySelectorAll(
      '[class*="autocomplete"], [class*="typeahead"], [class*="autosuggest"], ' +
      '[class*="combobox"], [role="combobox"], [aria-autocomplete],' +
      'input[list], datalist'
    ).forEach(el => add('Autocomplete', el, {
      listId: el.getAttribute('list') || null,
      ariaAutocomplete: el.getAttribute('aria-autocomplete') || null
    }));

    // ── 21. MODAL TRIGGERS ──────────────────────────────────────────────
    document.querySelectorAll(
      '[data-toggle="modal"], [data-bs-toggle="modal"], [aria-haspopup="dialog"], ' +
      '[data-modal], [class*="modal-trigger"], [class*="open-modal"]'
    ).forEach(el => add('ModalTrigger', el));

    // Detect actual open modals
    document.querySelectorAll(
      '[role="dialog"], .modal, [class*="modal"][class*="show"], [class*="modal"][class*="open"], ' +
      '[class*="dialog"], [class*="lightbox"], [class*="overlay"][style*="display: block"]'
    ).forEach(el => {
      if (isVisible(el)) add('Modal', el, {
        hasCloseBtn: !!el.querySelector('[class*="close"], [aria-label*="close" i], button.close')
      });
    });

    // ── 22. ACCORDIONS ──────────────────────────────────────────────────
    document.querySelectorAll(
      '[data-bs-toggle="collapse"], details, summary, ' +
      '[class*="accordion-header"], [class*="accordion-button"], ' +
      '[class*="collapsible"], [aria-expanded]'
    ).forEach(el => add('Accordion', el, {
      expanded: el.getAttribute('aria-expanded') === 'true' || (el.tagName === 'DETAILS' && el.open)
    }));

    // ── 23. TOOLTIPS ────────────────────────────────────────────────────
    document.querySelectorAll(
      '[title], [data-tooltip], [data-tip], [data-bs-toggle="tooltip"], ' +
      '[aria-describedby], [class*="tooltip-trigger"]'
    ).forEach(el => {
      if (el.tagName !== 'HTML' && el.tagName !== 'BODY' && (el.getAttribute('title') || el.getAttribute('data-tooltip'))) {
        add('Tooltip', el, {
          tooltipText: el.getAttribute('title') || el.getAttribute('data-tooltip') || el.getAttribute('data-tip') || null
        });
      }
    });

    // ── 24. TOAST / NOTIFICATION CONTAINERS ─────────────────────────────
    document.querySelectorAll(
      '[class*="toast"], [class*="notification"], [class*="snackbar"], ' +
      '[class*="alert"]:not(script), [role="alert"], [role="status"], ' +
      '[class*="flash-message"], [class*="flash_message"]'
    ).forEach(el => {
      if (isVisible(el)) add('Toast', el, {
        alertType: el.className.toLowerCase().includes('error') || el.className.toLowerCase().includes('danger') ? 'error' :
                   el.className.toLowerCase().includes('success') ? 'success' :
                   el.className.toLowerCase().includes('warn') ? 'warning' : 'info'
      });
    });

    // ── 25. DATA TABLES ─────────────────────────────────────────────────
    document.querySelectorAll('table, [role="grid"], [class*="data-table"], [class*="datatable"]').forEach(el => {
      const rows    = el.querySelectorAll('tr').length;
      const headers = el.querySelectorAll('th').length;
      const sortable = !!el.querySelector('[class*="sort"], [aria-sort]');
      add('DataTable', el, { rows, headers, sortable });
    });

    // ── 26. PAGINATION ──────────────────────────────────────────────────
    document.querySelectorAll(
      '.pagination, [class*="pagination"], [class*="pager"], ' +
      'nav[aria-label*="page" i], [class*="page-numbers"]'
    ).forEach(el => {
      const pages = el.querySelectorAll('a, button, li').length;
      const hasNext = !!el.querySelector('[class*="next"], [aria-label*="next" i], [rel="next"]');
      const hasPrev = !!el.querySelector('[class*="prev"], [aria-label*="prev" i], [rel="prev"]');
      add('Pagination', el, { pages, hasNext, hasPrev });
    });

    // ── 27. INFINITE SCROLL ─────────────────────────────────────────────
    const hasInfiniteScroll = !!(
      document.querySelector('[class*="infinite"], [class*="load-more"], [data-infinite]') ||
      document.querySelector('button[class*="more"], a[class*="load-more"], [class*="loadmore"]')
    );
    if (hasInfiniteScroll) {
      const el = document.querySelector('[class*="infinite"], [class*="load-more"], [data-infinite], button[class*="more"]');
      if (el) add('InfiniteScroll', el, { type: el.tagName.toLowerCase() === 'button' ? 'button' : 'auto' });
    }

    // ── 28. MULTI-STEP FORMS / WIZARDS ──────────────────────────────────
    document.querySelectorAll(
      '[class*="wizard"], [class*="multi-step"], [class*="step-form"], ' +
      '[class*="stepper"], [class*="steps"], [data-step]'
    ).forEach(el => {
      const totalSteps  = el.querySelectorAll('[class*="step"], [data-step]').length;
      const currentStep = el.querySelector('[class*="active"], [class*="current"]');
      add('WizardForm', el, { totalSteps, currentStepText: currentStep ? currentStep.textContent.trim().slice(0, 30) : null });
    });

    // ── 29. HAMBURGER / MOBILE MENU ─────────────────────────────────────
    document.querySelectorAll(
      '[class*="hamburger"], [class*="menu-toggle"], [class*="nav-toggle"], ' +
      '[class*="navbar-toggler"], [aria-label*="menu" i][role="button"], ' +
      '[class*="burger"], [class*="menu-btn"]'
    ).forEach(el => add('HamburgerMenu', el, {
      expanded: el.getAttribute('aria-expanded') === 'true'
    }));

    // ── 30. COOKIE CONSENT BANNER ────────────────────────────────────────
    document.querySelectorAll(
      '[class*="cookie"], [id*="cookie"], [class*="gdpr"], [id*="gdpr"], ' +
      '[class*="consent"], [id*="consent"], [class*="cc-banner"]'
    ).forEach(el => {
      if (isVisible(el)) {
        const acceptBtn = el.querySelector('button[class*="accept"], a[class*="accept"], button[class*="allow"]');
        const rejectBtn = el.querySelector('button[class*="reject"], button[class*="decline"], a[class*="reject"]');
        add('CookieBanner', el, {
          hasAcceptBtn: !!acceptBtn,
          hasRejectBtn: !!rejectBtn,
          acceptSelector: acceptBtn ? getSelector(acceptBtn) : null,
          rejectSelector: rejectBtn ? getSelector(rejectBtn) : null,
        });
      }
    });

    // ── 31. SOCIAL LOGIN BUTTONS ─────────────────────────────────────────
    const socialProviders = ['google', 'facebook', 'twitter', 'github', 'apple', 'linkedin', 'microsoft'];
    document.querySelectorAll('a, button, [role="button"]').forEach(el => {
      const text = (el.textContent + el.className + (el.getAttribute('aria-label') || '') + (el.href || '')).toLowerCase();
      const provider = socialProviders.find(p => text.includes(p));
      if (provider && (text.includes('login') || text.includes('sign') || text.includes('continue') || text.includes('connect'))) {
        add('SocialLogin', el, { provider });
      }
    });

    // ── 32. STAR RATING INPUT ────────────────────────────────────────────
    document.querySelectorAll(
      '[class*="star-rating"], [class*="rating-input"], [class*="rate"], ' +
      'input[type="radio"][class*="star"], [class*="star"][role="radio"]'
    ).forEach(el => add('StarRating', el, {
      maxStars: el.querySelectorAll ? el.querySelectorAll('input[type="radio"], [class*="star"]').length : null
    }));

    // ── 33. OTP / PIN INPUTS ────────────────────────────────────────────
    const otpCandidates = document.querySelectorAll(
      '[class*="otp"], [class*="pin-input"], [class*="verification-code"], ' +
      'input[maxlength="1"][type="text"], input[maxlength="1"][type="number"]'
    );
    if (otpCandidates.length >= 4) {
      add('OTPInput', otpCandidates[0], {
        digitCount: otpCandidates.length,
        selector: getSelector(otpCandidates[0])
      });
    }

    // ── 34. RICH TEXT EDITOR ────────────────────────────────────────────
    document.querySelectorAll(
      '.ql-editor, .tox-edit-area, .mce-content-body, .ProseMirror, ' +
      '[contenteditable="true"]:not(input):not([class*="search"]), ' +
      '[class*="rich-text"], [class*="wysiwyg"], .fr-element, .CodeMirror'
    ).forEach(el => add('RichTextEditor', el, {
      editorType: el.classList.contains('ql-editor') ? 'Quill' :
                  el.classList.contains('ProseMirror') ? 'ProseMirror' :
                  el.classList.contains('mce-content-body') ? 'TinyMCE' : 'Generic'
    }));

    // ── 35. CUSTOM DATE RANGE PICKER ─────────────────────────────────────
    document.querySelectorAll(
      '[class*="daterangepicker"], [class*="date-range"], [class*="date_range"], ' +
      '[class*="datepicker"]:not(input), [class*="calendar"], ' +
      '.flatpickr-calendar, .react-datepicker, .air-datepicker'
    ).forEach(el => {
      if (isVisible(el)) add('DateRangePicker', el);
    });
    // Also look for date range trigger inputs
    document.querySelectorAll(
      'input[class*="daterange"], input[class*="date-range"], ' +
      'input[placeholder*="check-in" i], input[placeholder*="check in" i], ' +
      'input[placeholder*="arrival" i], input[placeholder*="departure" i]'
    ).forEach(el => add('DateRangePicker', el, { isInput: true }));

    // ── 36. DRAG AND DROP ZONES ─────────────────────────────────────────
    document.querySelectorAll(
      '[draggable="true"], [class*="drag-drop"], [class*="dropzone"], ' +
      '[class*="drop-zone"], [class*="droppable"], [class*="draggable"]'
    ).forEach(el => add('DragDrop', el, {
      isDraggable: el.getAttribute('draggable') === 'true',
      isDropZone: !!el.getAttribute('data-dropzone') || el.className.toLowerCase().includes('dropzone')
    }));

    // ── 37. LIVE CHAT WIDGET ────────────────────────────────────────────
    const liveChatSelectors = [
      '[id*="intercom"], [class*="intercom"]',
      '[id*="zendesk"], [class*="zopim"]',
      '[id*="tawk"], [class*="tawk"]',
      '[id*="livechat"], [class*="live-chat"]',
      '[id*="freshchat"], [class*="freshchat"]',
      '[id*="drift"], [class*="drift"]',
      'iframe[src*="tawk"], iframe[src*="intercom"], iframe[src*="zendesk"]'
    ];
    for (const s of liveChatSelectors) {
      try {
        const el = document.querySelector(s);
        if (el && isVisible(el)) { add('LiveChat', el, { provider: s.split('*')[1].split('"')[0] }); break; }
      } catch(e) {}
    }

    // ── 38. CHART / GRAPH ───────────────────────────────────────────────
    document.querySelectorAll(
      'canvas[class*="chart"], svg[class*="chart"], [class*="recharts"], ' +
      '[class*="highcharts"], [class*="chartjs"], [class*="d3-"], ' +
      '[class*="apexcharts"], [class*="echarts"]'
    ).forEach(el => add('Chart', el, {
      chartType: el.getAttribute('data-type') || el.className.match(/bar|line|pie|donut|area/i)?.[0] || 'unknown'
    }));

    // ── 39. MAP ─────────────────────────────────────────────────────────
    document.querySelectorAll(
      '[class*="google-map"], [class*="leaflet-map"], [class*="mapbox"], ' +
      '#map, .map, [id*="map"][class*="map"], iframe[src*="maps.google"]'
    ).forEach(el => add('Map', el, {
      provider: el.className.includes('leaflet') ? 'Leaflet' : el.className.includes('mapbox') ? 'Mapbox' : 'Google Maps'
    }));

    // ── 40. STICKY ELEMENTS ─────────────────────────────────────────────
    document.querySelectorAll('[class*="sticky"], [class*="fixed-top"], [class*="back-to-top"], header')
      .forEach(el => {
        const pos = window.getComputedStyle(el).position;
        if (pos === 'sticky' || pos === 'fixed') {
          add('StickyElement', el, { position: pos });
        }
      });

    // ── 41. PROGRESS BAR ────────────────────────────────────────────────
    document.querySelectorAll(
      '[role="progressbar"], [class*="progress-bar"], [class*="progress_bar"], ' +
      'progress, [class*="progress"][style*="width"]'
    ).forEach(el => add('ProgressBar', el, {
      value: el.getAttribute('aria-valuenow') || el.value || null,
      max:   el.getAttribute('aria-valuemax') || el.max || null
    }));

    // ── 42. SEARCH WITH FILTER (advanced search) ─────────────────────────
    document.querySelectorAll('[class*="search-filter"], [class*="advanced-search"], [class*="filter-search"]')
      .forEach(el => add('AdvancedSearch', el));

    // ── 43. LANGUAGE / CURRENCY SELECTOR ────────────────────────────────
    document.querySelectorAll('select, a, button, [role="button"]').forEach(el => {
      const text = (el.textContent + el.className + (el.getAttribute('aria-label') || '')).toLowerCase();
      if ((text.includes('language') || text.includes('lang') || text.includes('locale')) ||
          (text.includes('currency') || text.includes('usd') || text.includes('gbp') || text.includes('eur'))) {
        if (!['nav', 'header', 'footer', 'body'].includes(el.tagName.toLowerCase()))
          add('LocaleSelector', el, {
            type: text.includes('currency') ? 'currency' : 'language'
          });
      }
    });

    // ── 44. CAPTCHA ──────────────────────────────────────────────────────
    document.querySelectorAll(
      '.g-recaptcha, [class*="recaptcha"], iframe[src*="recaptcha"], ' +
      'iframe[src*="hcaptcha"], [class*="hcaptcha"], [class*="captcha"]'
    ).forEach(el => add('Captcha', el, {
      provider: el.className.includes('recaptcha') ? 'reCAPTCHA' :
                el.className.includes('hcaptcha') ? 'hCaptcha' : 'Unknown'
    }));

    // ── 45. CAROUSEL / SLIDER ────────────────────────────────────────────
    document.querySelectorAll(
      '[class*="carousel"], [class*="slider"], [class*="slick"], ' +
      '.swiper, [class*="glide"], [class*="splide"]'
    ).forEach(el => {
      const slides = el.querySelectorAll('[class*="slide"], [class*="item"]').length;
      const hasNav = !!el.querySelector('[class*="prev"], [class*="next"], [class*="arrow"]');
      const hasDots = !!el.querySelector('[class*="dot"], [class*="indicator"]');
      add('Carousel', el, { slides, hasNav, hasDots });
    });

    // ── 46. PAYMENT FORM FIELDS ──────────────────────────────────────────
    document.querySelectorAll(
      'iframe[src*="stripe"], iframe[src*="paypal"], iframe[src*="braintree"], ' +
      '[class*="card-number"], [class*="card-expiry"], [class*="card-cvc"], ' +
      '[data-stripe], #card-element, .stripe-element'
    ).forEach(el => add('PaymentField', el, {
      provider: (el.src || el.className || '').toLowerCase().includes('stripe') ? 'Stripe' :
                (el.src || '').includes('paypal') ? 'PayPal' : 'Unknown'
    }));

    // ── 47. COLOR PICKER ────────────────────────────────────────────────
    document.querySelectorAll(
      'input[type="color"], [class*="color-picker"], [class*="colorpicker"], ' +
      '[class*="color-swatch"], [class*="colour-picker"]'
    ).forEach(el => add('ColorPicker', el));

    // ── 48. BREADCRUMB ───────────────────────────────────────────────────
    document.querySelectorAll('[class*="breadcrumb"], nav[aria-label*="breadcrumb" i], [itemtype*="BreadcrumbList"]')
      .forEach(el => add('Breadcrumb', el, { linkCount: el.querySelectorAll('a').length }));

    // ── 49. IFRAME EMBEDS ───────────────────────────────────────────────
    document.querySelectorAll('iframe').forEach(el => {
      const src = el.src || '';
      const isYoutube  = src.includes('youtube') || src.includes('youtu.be');
      const isVimeo    = src.includes('vimeo');
      const isMaps     = src.includes('maps.google');
      const type = isYoutube ? 'YouTube' : isVimeo ? 'Vimeo' : isMaps ? 'Google Maps' : 'Generic';
      add('Iframe', el, { src: src.slice(0, 80), embedType: type });
    });

    // ── 50. SKIP LINKS (accessibility) ──────────────────────────────────
    document.querySelectorAll('a[href="#main"], a[href="#content"], [class*="skip-link"], [class*="skip-nav"]')
      .forEach(el => add('SkipLink', el));

    return results;
  });

  return elements;
}

module.exports = { extractElements };
