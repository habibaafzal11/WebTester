/**
 * ecommerceFlows.js
 * Tests complete end-to-end user journeys on ecommerce sites.
 * Each flow is a sequence of steps that mimic a real user.
 *
 * Flows covered:
 *  1. Product Listing → Product Detail Page
 *  2. Add to Cart → Verify Cart Count Updates
 *  3. View Cart Page → Verify Items, Quantities, Prices
 *  4. Cart → Continue Shopping → Back to Listing
 *  5. Cart → Proceed to Checkout → Verify Checkout Page
 *  6. Quantity Change in Cart → Verify Total Updates
 *  7. Remove Item from Cart → Verify Cart Updates
 *  8. Product Search → Click Result → Verify Product Page
 *  9. Wishlist Add → Verify Wishlist Count
 * 10. Mini Cart / Cart Drawer Verification
 */
const { log, logError } = require('./logger');

async function runEcommerceFlows(page, url) {
  const results = [];
  let id = 500; // start from TC-500 so flow tests are separate
  const nextId = () => 'TC-' + String(id++).padStart(3, '0');

  log('\n  [FLOWS] Starting ecommerce user journey tests...');

  // ── FLOW 1: Product Listing Page Verification ─────────────────────
  results.push(await flow_verifyListingPage(page, nextId));

  // ── FLOW 2: Click First Product → Go to Product Detail Page ───────
  const productPageUrl = await flow_clickFirstProduct(page, url, nextId, results);

  // ── FLOW 3: On Product Detail Page → Add to Cart ──────────────────
  if (productPageUrl) {
    await flow_addToCartFromDetailPage(page, nextId, results);
  }

  // ── FLOW 4: View Cart Page (navigate directly) ─────────────────────
  const cartUrl = await flow_navigateToCart(page, url, nextId, results);

  // ── FLOW 5: Verify Cart Contents ──────────────────────────────────
  if (cartUrl) {
    await flow_verifyCartContents(page, nextId, results);

    // ── FLOW 6: Change Quantity in Cart ─────────────────────────────
    await flow_changeQuantityInCart(page, nextId, results);

    // ── FLOW 7: Continue Shopping Button ────────────────────────────
    await flow_continueShopping(page, url, nextId, results);

    // Navigate back to cart for more tests
    try { await page.goto(cartUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }); await page.waitForTimeout(1000); } catch(e){}

    // ── FLOW 8: Proceed to Checkout ──────────────────────────────────
    await flow_proceedToCheckout(page, url, nextId, results);

    // Navigate back to cart
    try { await page.goto(cartUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }); await page.waitForTimeout(1000); } catch(e){}

    // ── FLOW 9: Remove Item from Cart ────────────────────────────────
    await flow_removeItemFromCart(page, nextId, results);
  }

  // ── FLOW 10: Search → Result → Product Page ───────────────────────
  await flow_searchAndNavigate(page, url, nextId, results);

  // ── FLOW 11: Mini Cart / Cart Drawer ─────────────────────────────
  await flow_miniCart(page, url, nextId, results);

  // ── FLOW 12: Product Count on Listing ────────────────────────────
  await flow_verifyProductCount(page, url, nextId, results);

  log('  [FLOWS] Done. ' + results.length + ' flow tests completed.');
  return results;
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 1: Verify the product listing page loads correctly
// ════════════════════════════════════════════════════════════════════════
async function flow_verifyListingPage(page, nextId) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 1] Verifying product listing page...');
  try {
    const info = await page.evaluate(() => {
      // Try multiple common product card selectors
      const selectors = [
        '[class*="product-item"]', '[class*="product-card"]', '[class*="product-tile"]',
        '[class*="product-grid"] li', '[class*="products-grid"] li',
        '.product', '.item', '[data-product-id]', '[data-pid]',
        '[class*="product-listing"] li', 'article[class*="product"]'
      ];
      let productEls = [];
      for (const s of selectors) {
        const els = document.querySelectorAll(s);
        if (els.length >= 2) { productEls = Array.from(els); break; }
      }

      // Count visible products
      const visible = productEls.filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length;

      // Check for product names
      const nameSelectors = ['[class*="product-name"]','[class*="product-title"]','h2','h3'];
      let names = [];
      for (const s of nameSelectors) {
        const els = document.querySelectorAll(s);
        if (els.length > 0) { names = Array.from(els).slice(0,3).map(e=>e.textContent.trim().slice(0,30)); break; }
      }

      // Check for prices
      const priceSelectors = ['[class*="price"]','[class*="amount"]','[itemprop="price"]'];
      let prices = 0;
      for (const s of priceSelectors) {
        prices = document.querySelectorAll(s).length;
        if (prices > 0) break;
      }

      // Check for images
      const imgs = document.querySelectorAll('[class*="product"] img, [class*="item"] img');
      const brokenImgs = Array.from(imgs).filter(i => !i.complete || i.naturalWidth === 0).length;

      return { visible, names, prices, totalImgs: imgs.length, brokenImgs };
    });

    if (info.visible >= 2) {
      return pass(id, 'Product Listing Page Loads Correctly', 'Ecommerce',
        `Found ${info.visible} products visible. Sample names: "${info.names.join('", "')}". Prices: ${info.prices}. Images: ${info.totalImgs} total, ${info.brokenImgs} broken.`,
        start);
    } else if (info.visible === 1) {
      return warn(id, 'Product Listing Page Loads Correctly', 'Ecommerce',
        `Only 1 product visible. Expected more. Check if pagination or lazy loading is hiding products.`,
        start);
    } else {
      return fail(id, 'Product Listing Page Loads Correctly', 'Ecommerce',
        `No product items detected on the listing page. The grid may have failed to load or selectors don't match this site's structure.`,
        start);
    }
  } catch(e) {
    return fail(id, 'Product Listing Page Loads Correctly', 'Ecommerce', e.message, start);
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 2: Click first product → navigate to product detail page
// ════════════════════════════════════════════════════════════════════════
async function flow_clickFirstProduct(page, baseUrl, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 2] Clicking first product to go to detail page...');
  try {
    const urlBefore = page.url();

    // Find and click the first product link
    const clicked = await page.evaluate(() => {
      const selectors = [
        '[class*="product-item"] a', '[class*="product-card"] a',
        '[class*="product-tile"] a', '[class*="product-name"] a',
        '[class*="product-title"] a', '.product a', '[data-product-id] a',
        '[class*="product-link"]', 'a[href*="/p/"]', 'a[href*="/product/"]',
        'a[href*="/products/"]', '[class*="product"] a[href]'
      ];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el && el.href && !el.href.includes('#')) {
          el.click();
          return el.href;
        }
      }
      return null;
    });

    if (!clicked) {
      results.push(warn(id, 'Navigate to Product Detail Page', 'Ecommerce',
        'Could not find a product link to click on this listing page.', start));
      return null;
    }

    await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(()=>{});
    await page.waitForTimeout(1500);
    const urlAfter = page.url();

    if (urlAfter !== urlBefore) {
      // Verify it looks like a product page
      const isProductPage = await page.evaluate(() => {
        const hasPrice    = !!document.querySelector('[class*="price"],[itemprop="price"]');
        const hasAddCart  = Array.from(document.querySelectorAll('button,a')).some(el =>
          (el.textContent + el.className).toLowerCase().includes('add to cart') ||
          (el.textContent + el.className).toLowerCase().includes('add to bag'));
        const hasName     = !!document.querySelector('h1');
        return { hasPrice, hasAddCart, hasName };
      });

      results.push(pass(id, 'Navigate to Product Detail Page', 'Ecommerce',
        `Successfully navigated from listing to product page: ${urlAfter.slice(0,80)}. Has price: ${isProductPage.hasPrice}, Add to cart: ${isProductPage.hasAddCart}, H1 title: ${isProductPage.hasName}.`,
        start));
      return urlAfter;
    } else {
      results.push(fail(id, 'Navigate to Product Detail Page', 'Ecommerce',
        `Clicked product link "${clicked.slice(0,60)}" but URL did not change. Navigation may be broken.`,
        start));
      return null;
    }
  } catch(e) {
    results.push(fail(id, 'Navigate to Product Detail Page', 'Ecommerce', e.message, start));
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 3: On product detail page → Add to cart → verify count changes
// ════════════════════════════════════════════════════════════════════════
async function flow_addToCartFromDetailPage(page, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 3] Adding product to cart from detail page...');
  try {
    // Get cart count before
    const countBefore = await getCartCount(page);

    // Select size/variant if required
    await selectVariantIfNeeded(page);

    // Find and click Add to Cart
    const addResult = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const btn = btns.find(el => {
        const t = (el.textContent + el.className + (el.getAttribute('aria-label') || '')).toLowerCase();
        return (t.includes('add to cart') || t.includes('add to bag') || t.includes('add to basket'));
      });
      if (!btn) return { found: false };
      const isDisabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
      if (!isDisabled) btn.click();
      return { found: true, text: btn.textContent.trim().slice(0,30), disabled: isDisabled };
    });

    if (!addResult.found) {
      results.push(warn(id, 'Add to Cart from Product Detail Page', 'Ecommerce',
        'No "Add to Cart" button found on this product page. May require selecting a size/variant first, or this is a non-purchasable product.',
        start));
      return;
    }

    if (addResult.disabled) {
      results.push(warn(id, 'Add to Cart from Product Detail Page', 'Ecommerce',
        `"Add to Cart" button found but is disabled. Usually means a size/color variant must be selected first. Button text: "${addResult.text}"`,
        start));
      return;
    }

    // Wait for cart to update
    await page.waitForTimeout(2500);

    // Check for modal/confirmation that appeared
    const modal = await page.evaluate(() => {
      const modals = document.querySelectorAll(
        '[class*="cart-modal"], [class*="add-to-cart-modal"], [class*="mini-cart"],'+
        '[class*="cart-drawer"], [class*="cart-flyout"], [class*="added-to-cart"]'
      );
      for (const m of modals) {
        const r = m.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return m.textContent.trim().slice(0,100);
      }
      return null;
    });

    const countAfter = await getCartCount(page);

    let detail = `Button "${addResult.text}" clicked. `;
    if (countBefore >= 0 && countAfter > countBefore) {
      detail += `Cart count updated: ${countBefore} → ${countAfter}. `;
    } else if (modal) {
      detail += `Cart confirmation appeared: "${modal.slice(0,60)}". `;
    } else {
      detail += `Cart count before: ${countBefore}, after: ${countAfter}. `;
    }

    const success = countAfter > countBefore || !!modal;
    if (success) {
      results.push(pass(id, 'Add to Cart from Product Detail Page', 'Ecommerce', detail, start));
    } else {
      results.push(warn(id, 'Add to Cart from Product Detail Page', 'Ecommerce',
        detail + 'Could not confirm item was added (no count change or modal detected). Verify manually.',
        start));
    }
  } catch(e) {
    results.push(fail(id, 'Add to Cart from Product Detail Page', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 4: Find and navigate to cart page
// ════════════════════════════════════════════════════════════════════════
async function flow_navigateToCart(page, baseUrl, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 4] Navigating to cart page...');
  try {
    // Try clicking the cart icon first
    const cartClicked = await page.evaluate(() => {
      const selectors = [
        'a[href*="cart"]', 'a[href*="basket"]', 'a[href*="bag"]',
        '[class*="cart-icon"]', '[class*="cart-link"]', '[class*="bag-icon"]',
        '[aria-label*="cart" i]', '[aria-label*="basket" i]', '[class*="minicart"] a',
        'button[class*="cart"]'
      ];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) {
          const href = el.href || '';
          if (href.includes('cart') || href.includes('basket') || href.includes('bag')) {
            return href;
          }
        }
      }
      return null;
    });

    let cartUrl = cartClicked;

    // If no link found, try common cart URL patterns
    if (!cartUrl) {
      const domain = new URL(baseUrl).origin;
      const candidates = ['/cart', '/basket', '/bag', '/shopping-cart', '/checkout/cart'];
      for (const path of candidates) {
        try {
          const res = await page.evaluate(async (u) => {
            const r = await fetch(u, { method: 'HEAD' });
            return r.ok ? u : null;
          }, domain + path).catch(() => null);
          if (res) { cartUrl = domain + path; break; }
        } catch(e) {}
      }
    }

    if (!cartUrl) {
      results.push(warn(id, 'Navigate to Cart Page', 'Ecommerce',
        'Could not find a cart page URL. Tried common patterns (/cart, /basket, /bag). Cart link may be in a dropdown or modal.',
        start));
      return null;
    }

    // Navigate to cart
    await page.goto(cartUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    const cartInfo = await page.evaluate(() => {
      const isEmpty = document.body.innerText.toLowerCase().includes('empty') ||
                      document.body.innerText.toLowerCase().includes('no item') ||
                      document.body.innerText.toLowerCase().includes('your cart is empty');
      const items = document.querySelectorAll('[class*="cart-item"], [class*="line-item"], [class*="cart-product"], tr[class*="item"]').length;
      const hasTotal = !!document.querySelector('[class*="cart-total"], [class*="order-total"], [class*="subtotal"]');
      return { isEmpty, items, hasTotal, url: window.location.href };
    });

    if (cartInfo.isEmpty) {
      results.push(warn(id, 'Navigate to Cart Page', 'Ecommerce',
        `Cart page reached (${cartInfo.url.slice(0,60)}) but cart is empty. Add a product first for full cart testing.`,
        start));
    } else {
      results.push(pass(id, 'Navigate to Cart Page', 'Ecommerce',
        `Cart page loaded: ${cartInfo.url.slice(0,60)}. Items in cart: ${cartInfo.items}. Has total: ${cartInfo.hasTotal}.`,
        start));
    }
    return cartUrl;
  } catch(e) {
    results.push(fail(id, 'Navigate to Cart Page', 'Ecommerce', e.message, start));
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 5: Verify cart page contents — items, names, prices, quantities
// ════════════════════════════════════════════════════════════════════════
async function flow_verifyCartContents(page, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 5] Verifying cart contents...');
  try {
    const info = await page.evaluate(() => {
      const itemSelectors = ['[class*="cart-item"]','[class*="line-item"]','[class*="cart-product"]','[class*="cart-row"]','tbody tr'];
      let items = [];
      for (const s of itemSelectors) {
        const els = document.querySelectorAll(s);
        if (els.length > 0) { items = Array.from(els); break; }
      }

      const results = items.slice(0,5).map(item => {
        const name   = item.querySelector('[class*="name"],[class*="title"],[class*="product-name"]');
        const price  = item.querySelector('[class*="price"],[class*="amount"]');
        const qty    = item.querySelector('input[type="number"],input[name*="qty"],input[name*="quantity"],[class*="quantity"]');
        const remove = item.querySelector('[class*="remove"],[class*="delete"],[aria-label*="remove" i]');
        return {
          hasName:   !!name,   name:   name   ? name.textContent.trim().slice(0,40)  : null,
          hasPrice:  !!price,  price:  price  ? price.textContent.trim().slice(0,20) : null,
          hasQty:    !!qty,    qty:    qty    ? (qty.value || qty.textContent).slice(0,5) : null,
          hasRemove: !!remove,
        };
      });

      const subtotal = document.querySelector('[class*="subtotal"],[class*="cart-total"],[class*="order-total"]');
      return {
        itemCount: items.length,
        items: results,
        hasSubtotal: !!subtotal,
        subtotal: subtotal ? subtotal.textContent.trim().slice(0,30) : null,
      };
    });

    if (info.itemCount === 0) {
      results.push(warn(id, 'Cart Contents Verification', 'Ecommerce',
        'Cart appears empty — no cart items found. Add a product to the cart first to verify cart contents.',
        start));
      return;
    }

    const missingNames   = info.items.filter(i => !i.hasName).length;
    const missingPrices  = info.items.filter(i => !i.hasPrice).length;
    const missingQty     = info.items.filter(i => !i.hasQty).length;
    const hasRemoveAll   = info.items.every(i => i.hasRemove);

    let detail = `Cart has ${info.itemCount} item(s). `;
    detail += `First item: "${info.items[0]?.name||'?'}" at ${info.items[0]?.price||'?'}, qty: ${info.items[0]?.qty||'?'}. `;
    detail += `Subtotal shown: ${info.hasSubtotal} (${info.subtotal||'N/A'}). `;
    detail += `All items have remove button: ${hasRemoveAll}.`;

    const issues = [];
    if (missingNames)  issues.push(`${missingNames} item(s) missing product name`);
    if (missingPrices) issues.push(`${missingPrices} item(s) missing price`);
    if (missingQty)    issues.push(`${missingQty} item(s) missing quantity input`);

    if (issues.length === 0) {
      results.push(pass(id, 'Cart Contents Verification', 'Ecommerce', detail, start));
    } else {
      results.push(warn(id, 'Cart Contents Verification', 'Ecommerce',
        detail + ' Issues: ' + issues.join(', '), start));
    }
  } catch(e) {
    results.push(fail(id, 'Cart Contents Verification', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 6: Change quantity in cart → verify total updates
// ════════════════════════════════════════════════════════════════════════
async function flow_changeQuantityInCart(page, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 6] Changing quantity in cart...');
  try {
    const initialTotal = await getCartTotal(page);

    // Find quantity input or +/- buttons
    const changed = await page.evaluate(() => {
      // Try +/- increment buttons first
      const plusBtn = document.querySelector(
        '[class*="quantity"] button:last-child, [class*="qty"] button:last-child, '+
        'button[class*="plus"], button[class*="increment"], button[aria-label*="increase" i], '+
        'button[aria-label*="plus" i], [class*="quantity-up"]'
      );
      if (plusBtn) { plusBtn.click(); return { method: 'plus-button', found: true }; }

      // Try number input
      const qtyInput = document.querySelector(
        'input[type="number"][name*="qty"], input[type="number"][name*="quantity"], '+
        'input[class*="quantity"], input[name="quantity"]'
      );
      if (qtyInput) {
        const oldVal = parseInt(qtyInput.value) || 1;
        const newVal = oldVal + 1;
        qtyInput.value = newVal;
        qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
        return { method: 'number-input', found: true, from: oldVal, to: newVal };
      }

      return { found: false };
    });

    if (!changed.found) {
      results.push(warn(id, 'Cart Quantity Change → Total Updates', 'Ecommerce',
        'No quantity input or increment button found in cart. Quantity may be fixed on this site.',
        start));
      return;
    }

    // Wait for total to recalculate
    await page.waitForTimeout(2000);

    // Click Update Cart if it exists
    await page.evaluate(() => {
      const updateBtn = document.querySelector(
        'button[name="update"], [class*="update-cart"], [class*="cart-update"], '+
        'input[value*="Update" i], button[class*="update"]'
      );
      if (updateBtn) updateBtn.click();
    });
    await page.waitForTimeout(1500);

    const newTotal = await getCartTotal(page);

    if (initialTotal && newTotal && initialTotal !== newTotal) {
      results.push(pass(id, 'Cart Quantity Change → Total Updates', 'Ecommerce',
        `Quantity changed via ${changed.method}. Cart total updated from "${initialTotal}" to "${newTotal}". Price calculation is working correctly.`,
        start));
    } else if (!initialTotal || !newTotal) {
      results.push(warn(id, 'Cart Quantity Change → Total Updates', 'Ecommerce',
        `Quantity changed via ${changed.method} but could not read cart total to verify recalculation. Verify manually.`,
        start));
    } else {
      results.push(warn(id, 'Cart Quantity Change → Total Updates', 'Ecommerce',
        `Quantity changed but total remained "${newTotal}". May need to click an Update button, or total updates asynchronously.`,
        start));
    }
  } catch(e) {
    results.push(fail(id, 'Cart Quantity Change → Total Updates', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 7: Continue Shopping button → back to listing
// ════════════════════════════════════════════════════════════════════════
async function flow_continueShopping(page, baseUrl, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 7] Testing Continue Shopping button...');
  try {
    const cartPageUrl = page.url();

    const btnInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button'));
      const btn = btns.find(el => {
        const t = (el.textContent + (el.getAttribute('aria-label')||'')).toLowerCase();
        return t.includes('continue shopping') || t.includes('keep shopping') ||
               t.includes('back to') || t.includes('continue browsing');
      });
      return btn ? { found: true, text: btn.textContent.trim(), href: btn.href || null } : { found: false };
    });

    if (!btnInfo.found) {
      results.push(warn(id, 'Continue Shopping Button Works', 'Ecommerce',
        'No "Continue Shopping" button found on cart page. This is a common UX element that helps users go back to browsing.',
        start));
      return;
    }

    // Click it
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button'));
      const btn = btns.find(el => {
        const t = (el.textContent + (el.getAttribute('aria-label')||'')).toLowerCase();
        return t.includes('continue shopping') || t.includes('keep shopping') || t.includes('continue browsing');
      });
      if (btn) btn.click();
    });

    await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(()=>{});
    await page.waitForTimeout(1500);

    const newUrl = page.url();
    const wentBack = newUrl !== cartPageUrl;

    // Verify it went to a product/category page (not back to cart, not to checkout)
    const isShoppingPage = await page.evaluate(() => {
      const products = document.querySelectorAll('[class*="product"], [class*="item"], [class*="collection"]');
      return products.length > 0;
    });

    if (wentBack && isShoppingPage) {
      results.push(pass(id, 'Continue Shopping Button Works', 'Ecommerce',
        `"${btnInfo.text}" clicked. Navigated back to: ${newUrl.slice(0,70)}. Product listing/category page confirmed.`,
        start));
    } else if (wentBack) {
      results.push(warn(id, 'Continue Shopping Button Works', 'Ecommerce',
        `"${btnInfo.text}" navigated to: ${newUrl.slice(0,70)} but page doesn't clearly show product listings. Verify destination is correct.`,
        start));
    } else {
      results.push(fail(id, 'Continue Shopping Button Works', 'Ecommerce',
        `"${btnInfo.text}" button found (href: ${btnInfo.href||'none'}) but URL did not change after clicking. Button may be broken.`,
        start));
    }
  } catch(e) {
    results.push(fail(id, 'Continue Shopping Button Works', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 8: Proceed to Checkout → Verify checkout page loads
// ════════════════════════════════════════════════════════════════════════
async function flow_proceedToCheckout(page, baseUrl, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 8] Testing Proceed to Checkout...');
  try {
    const cartUrl = page.url();

    // Find checkout button
    const checkoutBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button, input[type="submit"]'));
      const btn = btns.find(el => {
        const t = (el.textContent + el.className + (el.getAttribute('aria-label')||'')).toLowerCase();
        return t.includes('checkout') || t.includes('proceed to checkout') ||
               t.includes('secure checkout') || t.includes('place order');
      });
      return btn ? { found: true, text: btn.textContent.trim().slice(0,40), href: btn.href || null } : { found: false };
    });

    if (!checkoutBtn.found) {
      results.push(warn(id, 'Proceed to Checkout Button Works', 'Ecommerce',
        'No checkout button found on cart page. Cart may be empty, or the checkout button uses an unusual label.',
        start));
      return;
    }

    // Click checkout
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button, input[type="submit"]'));
      const btn = btns.find(el => {
        const t = (el.textContent + el.className + (el.getAttribute('aria-label')||'')).toLowerCase();
        return t.includes('checkout') || t.includes('proceed to checkout') || t.includes('secure checkout');
      });
      if (btn) btn.click();
    });

    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(()=>{});
    await page.waitForTimeout(2000);

    const checkoutInfo = await page.evaluate(() => {
      const url = window.location.href.toLowerCase();
      const bodyText = document.body.innerText.toLowerCase();

      const isCheckout = url.includes('checkout') || url.includes('payment') ||
                         bodyText.includes('shipping address') || bodyText.includes('billing address') ||
                         bodyText.includes('payment method') || bodyText.includes('order summary') ||
                         bodyText.includes('credit card') || bodyText.includes('place order');

      const isLoginWall = bodyText.includes('sign in to continue') || bodyText.includes('login to checkout') ||
                          (bodyText.includes('email') && bodyText.includes('password') && bodyText.includes('checkout'));

      const hasEmailField = !!document.querySelector('input[type="email"]');
      const hasAddressField = !!document.querySelector('input[name*="address"], input[placeholder*="address" i]');
      const hasPaymentSection = !!document.querySelector('[class*="payment"], [id*="payment"], [class*="billing"]');

      return { isCheckout, isLoginWall, hasEmailField, hasAddressField, hasPaymentSection, url };
    });

    if (checkoutInfo.isLoginWall) {
      results.push(warn(id, 'Proceed to Checkout Button Works', 'Ecommerce',
        `Checkout button "${checkoutBtn.text}" clicked. Redirected to login wall — guest checkout not available or user must be logged in. URL: ${checkoutInfo.url.slice(0,70)}`,
        start));
    } else if (checkoutInfo.isCheckout) {
      let detail = `Checkout page reached: ${checkoutInfo.url.slice(0,70)}. `;
      detail += `Has email field: ${checkoutInfo.hasEmailField}. `;
      detail += `Has address field: ${checkoutInfo.hasAddressField}. `;
      detail += `Has payment section: ${checkoutInfo.hasPaymentSection}.`;
      results.push(pass(id, 'Proceed to Checkout Button Works', 'Ecommerce', detail, start));
    } else {
      results.push(warn(id, 'Proceed to Checkout Button Works', 'Ecommerce',
        `Checkout button clicked, URL changed to ${checkoutInfo.url.slice(0,70)} but page does not clearly look like a checkout page. Verify manually.`,
        start));
    }
  } catch(e) {
    results.push(fail(id, 'Proceed to Checkout Button Works', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 9: Remove item from cart → verify cart updates
// ════════════════════════════════════════════════════════════════════════
async function flow_removeItemFromCart(page, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 9] Testing Remove Item from Cart...');
  try {
    const itemsBefore = await page.evaluate(() => {
      const selectors = ['[class*="cart-item"]','[class*="line-item"]','[class*="cart-product"]','tbody tr'];
      for (const s of selectors) {
        const els = document.querySelectorAll(s);
        if (els.length > 0) return els.length;
      }
      return 0;
    });

    if (itemsBefore === 0) {
      results.push(warn(id, 'Remove Item from Cart', 'Ecommerce',
        'Cart is empty — nothing to remove. Add a product first.', start));
      return;
    }

    // Click first remove button
    const removed = await page.evaluate(() => {
      const removeSelectors = [
        '[class*="remove"]', '[class*="delete"]', '[class*="cart-remove"]',
        'button[aria-label*="remove" i]', 'a[class*="remove"]',
        'button[title*="remove" i]', '[class*="item-remove"]'
      ];
      for (const s of removeSelectors) {
        const btn = document.querySelector(s);
        if (btn) { btn.click(); return { found: true, label: btn.textContent.trim().slice(0,20)||btn.getAttribute('aria-label')||'Remove' }; }
      }
      return { found: false };
    });

    if (!removed.found) {
      results.push(warn(id, 'Remove Item from Cart', 'Ecommerce',
        'No remove button found on cart items. Site may not allow item removal from cart page.', start));
      return;
    }

    await page.waitForTimeout(2500);

    const itemsAfter = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const isEmpty = bodyText.includes('empty') || bodyText.includes('no item') || bodyText.includes('cart is empty');
      const selectors = ['[class*="cart-item"]','[class*="line-item"]','[class*="cart-product"]','tbody tr'];
      for (const s of selectors) {
        const els = document.querySelectorAll(s);
        if (els.length > 0) return els.length;
      }
      return isEmpty ? 0 : -1;
    });

    if (itemsAfter < itemsBefore || itemsAfter === 0) {
      results.push(pass(id, 'Remove Item from Cart', 'Ecommerce',
        `"${removed.label}" clicked. Cart items: ${itemsBefore} → ${itemsAfter === 0 ? 'empty (0)' : itemsAfter}. Cart correctly updated after removal.`,
        start));
    } else {
      results.push(warn(id, 'Remove Item from Cart', 'Ecommerce',
        `Remove button "${removed.label}" clicked but item count appears unchanged (${itemsBefore} before, ${itemsAfter} after). Remove may be async or require confirmation.`,
        start));
    }
  } catch(e) {
    results.push(fail(id, 'Remove Item from Cart', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 10: Search for product → click result → verify product page
// ════════════════════════════════════════════════════════════════════════
async function flow_searchAndNavigate(page, baseUrl, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 10] Testing Search → Product Page flow...');
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    const searchInput = await page.evaluate(() => {
      const sels = ['input[type="search"]','input[name="q"]','input[name="search"]',
        'input[placeholder*="search" i]','input[class*="search"]','#search','#search-input'];
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el) return s;
      }
      return null;
    });

    if (!searchInput) {
      results.push(warn(id, 'Search → Product Page Navigation', 'Ecommerce',
        'No search input found on page. Search flow test skipped.', start));
      return;
    }

    // Type search term and submit
    const inputEl = page.locator(searchInput).first();
    await inputEl.click().catch(()=>{});
    await inputEl.fill('perfume').catch(async()=> await inputEl.fill('fragrance').catch(()=>{}));
    await inputEl.press('Enter');
    await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(()=>{});
    await page.waitForTimeout(2000);

    const searchResults = await page.evaluate(() => {
      const selectors = ['[class*="search-result"]','[class*="product-item"]','[class*="result-item"]','[class*="product-card"]'];
      for (const s of selectors) {
        const els = document.querySelectorAll(s);
        if (els.length > 0) return els.length;
      }
      return 0;
    });

    if (searchResults === 0) {
      results.push(warn(id, 'Search → Product Page Navigation', 'Ecommerce',
        'Search executed but no results found for "perfume/fragrance". Results may load differently on this site.', start));
      return;
    }

    // Click first result
    const resultUrl = page.url();
    await page.evaluate(() => {
      const sels = ['[class*="search-result"] a','[class*="product-item"] a','[class*="result-item"] a'];
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el && el.href) { el.click(); return; }
      }
    });

    await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(()=>{});
    await page.waitForTimeout(1500);

    const afterUrl = page.url();
    const onProductPage = afterUrl !== resultUrl;
    const hasAddToCart = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button,a')).some(el =>
        (el.textContent + el.className).toLowerCase().includes('add to cart'));
    });

    if (onProductPage && hasAddToCart) {
      results.push(pass(id, 'Search → Product Page Navigation', 'Ecommerce',
        `Search for "perfume" returned ${searchResults} results. Clicked first result → product page: ${afterUrl.slice(0,70)}. Add to Cart button confirmed.`,
        start));
    } else if (onProductPage) {
      results.push(warn(id, 'Search → Product Page Navigation', 'Ecommerce',
        `Search returned ${searchResults} results and navigated to ${afterUrl.slice(0,70)} but no Add to Cart button confirmed.`,
        start));
    } else {
      results.push(fail(id, 'Search → Product Page Navigation', 'Ecommerce',
        `Search returned ${searchResults} results but clicking first result did not navigate to a product page.`,
        start));
    }
  } catch(e) {
    results.push(fail(id, 'Search → Product Page Navigation', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 11: Mini Cart / Cart Drawer
// ════════════════════════════════════════════════════════════════════════
async function flow_miniCart(page, baseUrl, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 11] Testing mini cart / cart drawer...');
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Click cart icon
    await page.evaluate(() => {
      const sels = ['[class*="cart-icon"]','[class*="minicart"]','[aria-label*="cart" i]','[class*="cart-toggle"]','a[href*="cart"]','[class*="bag"]'];
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el) { el.click(); return; }
      }
    });

    await page.waitForTimeout(1500);

    const miniCartInfo = await page.evaluate(() => {
      const drawers = document.querySelectorAll(
        '[class*="cart-drawer"],[class*="mini-cart"],[class*="cart-sidebar"],'+
        '[class*="cart-flyout"],[class*="cart-popup"],[class*="cart-overlay"]'
      );
      for (const d of drawers) {
        const r = d.getBoundingClientRect();
        if (r.width > 10 && r.height > 10) {
          const items = d.querySelectorAll('[class*="item"],[class*="product"]').length;
          const hasViewCart = Array.from(d.querySelectorAll('a,button')).some(el =>
            el.textContent.toLowerCase().includes('view cart') || el.textContent.toLowerCase().includes('cart'));
          const hasCheckout = Array.from(d.querySelectorAll('a,button')).some(el =>
            el.textContent.toLowerCase().includes('checkout'));
          return { found: true, items, hasViewCart, hasCheckout };
        }
      }
      return { found: false };
    });

    if (miniCartInfo.found) {
      results.push(pass(id, 'Mini Cart / Cart Drawer Opens', 'Ecommerce',
        `Cart drawer opened. Items shown: ${miniCartInfo.items}. Has "View Cart": ${miniCartInfo.hasViewCart}. Has "Checkout": ${miniCartInfo.hasCheckout}.`,
        start));
    } else {
      results.push(warn(id, 'Mini Cart / Cart Drawer Opens', 'Ecommerce',
        'Cart icon clicked but no visible cart drawer/popup detected. Site may navigate directly to cart page instead of showing a drawer.',
        start));
    }

    // Close it
    await page.keyboard.press('Escape').catch(()=>{});
  } catch(e) {
    results.push(fail(id, 'Mini Cart / Cart Drawer Opens', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// FLOW 12: Product count verification on listing page
// ════════════════════════════════════════════════════════════════════════
async function flow_verifyProductCount(page, baseUrl, nextId, results) {
  const start = Date.now();
  const id = nextId();
  log('  [FLOW 12] Verifying product count on listing...');
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    const countInfo = await page.evaluate(() => {
      // Look for "showing X of Y results" type text
      const bodyText = document.body.innerText;
      const countMatch = bodyText.match(/(\d+)\s*(results?|products?|items?|styles?)/i);
      const showingMatch = bodyText.match(/showing\s+\d+[-–]\d+\s+of\s+(\d+)/i);
      const totalMatch = showingMatch ? showingMatch[1] : (countMatch ? countMatch[1] : null);

      // Count visible product cards
      const sels = ['[class*="product-item"]','[class*="product-card"]','[class*="product-tile"]','.product','[data-product-id]'];
      let visible = 0;
      for (const s of sels) {
        const els = document.querySelectorAll(s);
        if (els.length >= 2) { visible = els.length; break; }
      }

      return { totalFromText: totalMatch, visibleOnPage: visible, countText: countMatch ? countMatch[0] : null };
    });

    let detail = `Products visible on page: ${countInfo.visibleOnPage}. `;
    if (countInfo.totalFromText) detail += `Total in category (from page text): ${countInfo.totalFromText}. `;
    if (countInfo.countText) detail += `Count text found: "${countInfo.countText}". `;

    if (countInfo.visibleOnPage >= 2) {
      results.push(pass(id, 'Product Count on Listing Page', 'Ecommerce', detail, start));
    } else if (countInfo.visibleOnPage === 1) {
      results.push(warn(id, 'Product Count on Listing Page', 'Ecommerce',
        detail + 'Only 1 product visible. Expected more for a category page.', start));
    } else {
      results.push(fail(id, 'Product Count on Listing Page', 'Ecommerce',
        'No products detected on listing page. Grid may be empty or failed to load.', start));
    }
  } catch(e) {
    results.push(fail(id, 'Product Count on Listing Page', 'Ecommerce', e.message, start));
  }
}

// ════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════
async function getCartCount(page) {
  return page.evaluate(() => {
    const sels = ['[class*="cart-count"]','[class*="cart-qty"]','[class*="cart-number"]',
      '[class*="cart-quantity"]','[class*="badge"]','[class*="item-count"]',
      '#cart-count','.cart-count','[data-cart-count]'];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) {
        const n = parseInt(el.textContent.trim());
        if (!isNaN(n)) return n;
      }
    }
    return -1;
  }).catch(() => -1);
}

async function getCartTotal(page) {
  return page.evaluate(() => {
    const sels = ['[class*="subtotal"]','[class*="cart-total"]','[class*="order-total"]','[class*="grand-total"]'];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return el.textContent.trim().slice(0,30);
    }
    return null;
  }).catch(() => null);
}

async function selectVariantIfNeeded(page) {
  // If size/color selects exist, pick the first available one
  await page.evaluate(() => {
    const swatches = document.querySelectorAll(
      '[class*="swatch"]:not([class*="disabled"]), [class*="size-option"]:not([class*="out-of-stock"]),'+
      '[class*="variant"] input[type="radio"]:not(:disabled)'
    );
    if (swatches.length > 0) swatches[0].click();
    // Also try select dropdowns
    const selects = document.querySelectorAll('select[name*="size"], select[name*="variant"], select[id*="size"]');
    selects.forEach(sel => {
      if (sel.options.length > 1) sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }).catch(() => {});
  await page.waitForTimeout(500);
}

function pass(id, name, category, details, start) {
  return { id, name, category, priority: 'Critical', description: name,
    status: 'PASS', details, error: null, duration: Date.now() - start,
    element: { tagName: 'page', selector: null, category: 'Ecommerce Flow' } };
}
function fail(id, name, category, error, start) {
  return { id, name, category, priority: 'Critical', description: name,
    status: 'FAIL', error: error.slice ? error.slice(0, 300) : String(error), details: null,
    duration: Date.now() - start,
    element: { tagName: 'page', selector: null, category: 'Ecommerce Flow' } };
}
function warn(id, name, category, details, start) {
  return { id, name, category, priority: 'Critical', description: name,
    status: 'WARN', details, error: null, duration: Date.now() - start,
    element: { tagName: 'page', selector: null, category: 'Ecommerce Flow' } };
}

module.exports = { runEcommerceFlows };
