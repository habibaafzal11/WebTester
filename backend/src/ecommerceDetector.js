/**
 * ecommerceDetector.js
 * Detects what kind of website this is and what ecommerce features exist.
 * Returns a "site profile" that testRunner uses to generate smart tests.
 */

async function detectSiteType(page, url) {
  const profile = await page.evaluate(() => {

    const text  = document.body.innerText.toLowerCase();
    const html  = document.body.innerHTML.toLowerCase();
    const links = Array.from(document.querySelectorAll('a')).map(a => (a.href + ' ' + a.textContent).toLowerCase());
    const allText = text + ' ' + links.join(' ');

    function has(...keywords) {
      return keywords.some(k => allText.includes(k));
    }

    function findSelector(...selectors) {
      for (const s of selectors) {
        try { if (document.querySelector(s)) return s; } catch(e) {}
      }
      return null;
    }

    function findByText(tag, ...words) {
      const els = Array.from(document.querySelectorAll(tag));
      for (const w of words) {
        const found = els.find(el => el.textContent.toLowerCase().includes(w.toLowerCase()));
        if (found) return found;
      }
      return null;
    }

    const features = {};

    // ── ECOMMERCE FEATURES ─────────────────────────────────────────────────

    // Product listings
    features.hasProductGrid = !!(
      document.querySelector('.product, .products, [class*="product-item"], [class*="product-card"], [class*="item-card"], .card') &&
      has('add to cart', 'buy now', 'shop now', 'price', 'rs.', '$', '£', '€')
    );

    // Add to cart button
    const addToCartSel = findSelector(
      '[class*="add-to-cart"]','[class*="addtocart"]','[id*="add-to-cart"]',
      'button[class*="cart"]','[data-button-action="add-to-cart"]'
    );
    const addToCartBtn = addToCartSel || (findByText('button','add to cart') ? 'button' : null);
    features.hasAddToCart = !!addToCartBtn;
    features.addToCartSelector = addToCartSel;

    // Cart / basket
    features.hasCart = !!(
      findSelector('[class*="cart"],[href*="cart"],[class*="basket"],[href*="basket"],[class*="shopping-bag"]') ||
      has('view cart', 'your cart', 'shopping cart', 'basket')
    );

    // Wishlist
    features.hasWishlist = !!(
      findSelector('[class*="wishlist"],[href*="wishlist"],[class*="favourite"],[class*="favorite"]') ||
      has('wishlist', 'add to wishlist', 'save for later')
    );

    // Search bar
    const searchSel = findSelector(
      'input[type="search"]','input[name="search"]','input[name="q"]',
      'input[placeholder*="search" i]','input[class*="search"]','#search','#search-input','.search-input'
    );
    features.hasSearch = !!searchSel;
    features.searchSelector = searchSel;

    // Login / signup
    features.hasLogin = !!(
      findSelector('[href*="login"],[href*="signin"],[href*="sign-in"],[href*="account"]') ||
      has('login', 'sign in', 'log in')
    );
    features.hasSignup = !!(
      findSelector('[href*="register"],[href*="signup"],[href*="sign-up"],[href*="create-account"]') ||
      has('register', 'sign up', 'create account')
    );

    // Login form on page
    const loginForm = document.querySelector('form[action*="login"],form[action*="signin"],form[id*="login"],form[class*="login"]');
    features.hasLoginForm = !!loginForm;
    features.loginEmailSel = loginForm ? (findSelector('#email,input[name="email"],input[type="email"]')) : null;
    features.loginPassSel  = loginForm ? (findSelector('#password,input[name="password"],input[type="password"]')) : null;

    // Checkout
    features.hasCheckout = !!(
      findSelector('[href*="checkout"],[class*="checkout"],[id*="checkout"]') ||
      has('checkout', 'place order', 'proceed to checkout', 'buy now')
    );

    // Product detail page
    features.isProductPage = !!(
      (has('add to cart') || has('buy now')) &&
      (document.querySelector('[class*="product-detail"],[class*="product-info"],[class*="product-name"],[class*="product-price"]') ||
       document.querySelector('h1') && has('price','quantity','stock','availability'))
    );

    // Product quantity input
    features.hasQuantityInput = !!findSelector(
      'input[name="quantity"],input[id*="quantity"],input[class*="quantity"],input[type="number"][min="1"]'
    );
    features.quantitySelector = findSelector('input[name="quantity"],input[id*="quantity"],input[class*="quantity"]');

    // Category/filter sidebar
    features.hasFilters = !!(
      findSelector('[class*="filter"],[class*="sidebar"],[class*="facet"],[id*="filter"]') ||
      has('filter by', 'sort by', 'price range', 'category', 'brand')
    );

    // Sort dropdown
    const sortSel = findSelector(
      'select[name*="sort"],select[id*="sort"],select[class*="sort"],[class*="sort-by"] select'
    );
    features.hasSortDropdown = !!sortSel;
    features.sortSelector = sortSel;

    // Reviews / ratings
    features.hasReviews = !!(
      findSelector('[class*="review"],[class*="rating"],[class*="star"],[itemprop="ratingValue"]') ||
      has('write a review', 'customer review', 'ratings', 'out of 5')
    );

    // Newsletter subscription
    features.hasNewsletter = !!(
      findSelector('[class*="newsletter"],[id*="newsletter"],[name*="newsletter"]') ||
      has('subscribe', 'newsletter', 'email updates', 'get offers')
    );

    // Contact form
    features.hasContactForm = !!(
      findSelector('form[action*="contact"],form[id*="contact"],#contact-form') ||
      has('contact us', 'send message', 'get in touch')
    );

    // Pagination
    features.hasPagination = !!(
      findSelector('.pagination,[class*="pagination"],[class*="pager"],nav[aria-label*="page"]') ||
      document.querySelector('a[href*="page="]')
    );

    // Image gallery / zoom
    features.hasImageGallery = !!(
      findSelector('[class*="gallery"],[class*="carousel"],[class*="slider"],[class*="thumbnail"]')
    );

    // Breadcrumbs
    features.hasBreadcrumb = !!(
      findSelector('[class*="breadcrumb"],nav[aria-label*="breadcrumb"],[itemtype*="BreadcrumbList"]')
    );

    // Price display
    const priceEl = findSelector('[class*="price"],[class*="amount"],[itemprop="price"]');
    features.hasPriceDisplay = !!priceEl;
    features.priceSelector = priceEl;

    // Coupon/promo code
    features.hasCouponField = !!(
      findSelector('[name*="coupon"],[name*="promo"],[name*="discount"],[id*="coupon"],[placeholder*="coupon" i]') ||
      has('coupon code', 'promo code', 'discount code', 'voucher')
    );

    return features;
  });

  // Detect page type from URL
  const urlLower = url.toLowerCase();
  profile.pageType =
    urlLower.includes('/product/') || urlLower.includes('/item/') || urlLower.includes('/p/') ? 'product' :
    urlLower.includes('/cart')    ? 'cart' :
    urlLower.includes('/checkout')? 'checkout' :
    urlLower.includes('/login')   || urlLower.includes('/signin') ? 'login' :
    urlLower.includes('/register')|| urlLower.includes('/signup') ? 'register' :
    urlLower.includes('/search')  ? 'search' :
    urlLower.includes('/category')|| urlLower.includes('/shop')   ? 'category' :
    urlLower.includes('/contact') ? 'contact' :
    urlLower.includes('/account') ? 'account' : 'generic';

  return profile;
}

module.exports = { detectSiteType };
