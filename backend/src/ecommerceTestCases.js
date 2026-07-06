/**
 * ecommerceTestCases.js
 * Generates smart ecommerce-specific test cases based on what was detected on the page.
 * These test REAL user journeys, not just generic element checks.
 */

async function generateEcommerceTests(page, profile, nextId) {
  const tests = [];

  // ── 1. PRODUCT LISTING TESTS ──────────────────────────────────────────
  if (profile.hasProductGrid) {
    tests.push({
      id: nextId(), name: 'Product Grid Displays Items',
      category: 'Ecommerce', priority: 'Critical',
      description: 'Verify product listing grid loads and shows products with images, names, and prices.',
      action: 'ec_product_grid_visible',
    });
    tests.push({
      id: nextId(), name: 'Product Images Load (No Broken Images)',
      category: 'Ecommerce', priority: 'High',
      description: 'Check that product images in the grid are not broken (404 errors).',
      action: 'ec_check_product_images',
    });
    tests.push({
      id: nextId(), name: 'Product Price Displayed',
      category: 'Ecommerce', priority: 'High',
      description: 'Each product card must show a price. Missing price = broken product data.',
      action: 'ec_price_visible',
    });
  }

  // ── 2. SEARCH TESTS ───────────────────────────────────────────────────
  if (profile.hasSearch && profile.searchSelector) {
    tests.push({
      id: nextId(), name: 'Search - Valid Product Name',
      category: 'Ecommerce', priority: 'Critical',
      description: 'Type a valid product search term and verify results are returned.',
      action: 'ec_search_valid',
      selector: profile.searchSelector,
      value: 'shirt',
    });
    tests.push({
      id: nextId(), name: 'Search - No Results for Gibberish',
      category: 'Ecommerce', priority: 'High',
      description: 'Search for "xyzzy12345abc" and verify a "no results" message is shown instead of a blank page.',
      action: 'ec_search_no_results',
      selector: profile.searchSelector,
      value: 'xyzzy12345abc99999',
    });
    tests.push({
      id: nextId(), name: 'Search - Empty Query',
      category: 'Ecommerce', priority: 'Medium',
      description: 'Submit the search form with empty input. Should either show all products or show a helpful message.',
      action: 'ec_search_empty',
      selector: profile.searchSelector,
    });
    tests.push({
      id: nextId(), name: 'Search - Special Characters (Security)',
      category: 'Security', priority: 'High',
      description: 'Search for "<script>alert(1)</script>" — XSS in search is one of the most common ecommerce vulnerabilities.',
      action: 'ec_search_xss',
      selector: profile.searchSelector,
      value: '<script>alert(1)</script>',
    });
    tests.push({
      id: nextId(), name: "Search - SQL Injection Attempt",
      category: 'Security', priority: 'Critical',
      description: "Search for \" ' OR 1=1 -- \" to test if search is vulnerable to SQL injection.",
      action: 'ec_search_sqli',
      selector: profile.searchSelector,
      value: "' OR 1=1 --",
    });
  }

  // ── 3. ADD TO CART TESTS ──────────────────────────────────────────────
  if (profile.hasAddToCart) {
    tests.push({
      id: nextId(), name: 'Add to Cart Button Visible and Clickable',
      category: 'Ecommerce', priority: 'Critical',
      description: 'The "Add to Cart" button must be present and clickable on the product page.',
      action: 'ec_add_to_cart_visible',
    });
    tests.push({
      id: nextId(), name: 'Add to Cart - Cart Count Updates',
      category: 'Ecommerce', priority: 'Critical',
      description: 'After clicking Add to Cart, verify the cart icon/counter updates (e.g. 0 → 1). This is the most important ecommerce test.',
      action: 'ec_add_to_cart_updates_count',
    });
  }

  // ── 4. QUANTITY INPUT TESTS ───────────────────────────────────────────
  if (profile.hasQuantityInput && profile.quantitySelector) {
    tests.push({
      id: nextId(), name: 'Quantity - Enter Valid Amount',
      category: 'Ecommerce', priority: 'High',
      description: 'Enter quantity 3 and verify the field accepts it.',
      action: 'ec_quantity_valid',
      selector: profile.quantitySelector,
      value: '3',
    });
    tests.push({
      id: nextId(), name: 'Quantity - Enter Zero',
      category: 'Ecommerce', priority: 'High',
      description: 'Enter 0 as quantity — the system should reject it or show a validation error. Ordering 0 items must not be allowed.',
      action: 'ec_quantity_zero',
      selector: profile.quantitySelector,
    });
    tests.push({
      id: nextId(), name: 'Quantity - Enter Negative Number',
      category: 'Ecommerce', priority: 'High',
      description: 'Enter -1 as quantity. The system must reject negative quantities.',
      action: 'ec_quantity_negative',
      selector: profile.quantitySelector,
    });
    tests.push({
      id: nextId(), name: 'Quantity - Enter Extremely Large Number',
      category: 'Boundary', priority: 'Medium',
      description: 'Enter 99999999 as quantity. Should either cap at max stock or show an error.',
      action: 'ec_quantity_overflow',
      selector: profile.quantitySelector,
    });
  }

  // ── 5. CART TESTS ─────────────────────────────────────────────────────
  if (profile.hasCart) {
    tests.push({
      id: nextId(), name: 'Cart Page Accessible',
      category: 'Ecommerce', priority: 'Critical',
      description: 'Cart link/icon must be visible. Clicking it should open the cart page without errors.',
      action: 'ec_cart_accessible',
    });
  }

  // ── 6. SORT & FILTER TESTS ────────────────────────────────────────────
  if (profile.hasSortDropdown && profile.sortSelector) {
    tests.push({
      id: nextId(), name: 'Sort By - Price Low to High',
      category: 'Ecommerce', priority: 'High',
      description: 'Select "Price: Low to High" from sort dropdown and verify page reloads/reorders products.',
      action: 'ec_sort_price_asc',
      selector: profile.sortSelector,
    });
    tests.push({
      id: nextId(), name: 'Sort By - Price High to Low',
      category: 'Ecommerce', priority: 'High',
      description: 'Select "Price: High to Low" and verify products reorder correctly.',
      action: 'ec_sort_price_desc',
      selector: profile.sortSelector,
    });
  }

  if (profile.hasFilters) {
    tests.push({
      id: nextId(), name: 'Product Filters Visible',
      category: 'Ecommerce', priority: 'Medium',
      description: 'Filter/category sidebar must be visible and not overlapping with product grid.',
      action: 'ec_filters_visible',
    });
  }

  // ── 7. WISHLIST TESTS ─────────────────────────────────────────────────
  if (profile.hasWishlist) {
    tests.push({
      id: nextId(), name: 'Wishlist Button Visible',
      category: 'Ecommerce', priority: 'Medium',
      description: 'Wishlist/favourite button should be present on product page.',
      action: 'ec_wishlist_visible',
    });
  }

  // ── 8. REVIEWS TESTS ─────────────────────────────────────────────────
  if (profile.hasReviews) {
    tests.push({
      id: nextId(), name: 'Product Ratings/Reviews Section Visible',
      category: 'Ecommerce', priority: 'Medium',
      description: 'Star ratings or customer reviews section must render correctly on product page.',
      action: 'ec_reviews_visible',
    });
  }

  // ── 9. LOGIN TESTS ────────────────────────────────────────────────────
  if (profile.hasLoginForm && profile.loginEmailSel && profile.loginPassSel) {
    tests.push({
      id: nextId(), name: 'Login - Empty Email and Password',
      category: 'Validation', priority: 'Critical',
      description: 'Submit login form with empty fields. Must show validation errors, not a server crash.',
      action: 'ec_login_empty',
      emailSel: profile.loginEmailSel,
      passSel: profile.loginPassSel,
    });
    tests.push({
      id: nextId(), name: 'Login - Invalid Email Format',
      category: 'Validation', priority: 'High',
      description: 'Enter "notanemail" in the email field and verify proper format validation.',
      action: 'ec_login_invalid_email',
      emailSel: profile.loginEmailSel,
      passSel: profile.loginPassSel,
    });
    tests.push({
      id: nextId(), name: 'Login - Wrong Credentials',
      category: 'Functional', priority: 'Critical',
      description: 'Enter a valid-format email with wrong password and verify "invalid credentials" error appears (not a server 500).',
      action: 'ec_login_wrong_creds',
      emailSel: profile.loginEmailSel,
      passSel: profile.loginPassSel,
    });
    tests.push({
      id: nextId(), name: 'Login - SQL Injection in Password',
      category: 'Security', priority: 'Critical',
      description: "Enter ' OR '1'='1 as password — the most common login bypass attack.",
      action: 'ec_login_sqli',
      emailSel: profile.loginEmailSel,
      passSel: profile.loginPassSel,
    });
    tests.push({
      id: nextId(), name: 'Login - XSS in Email Field',
      category: 'Security', priority: 'Critical',
      description: 'Enter <script>alert(1)</script> in email field and verify it is not executed.',
      action: 'ec_login_xss',
      emailSel: profile.loginEmailSel,
      passSel: profile.loginPassSel,
    });
    tests.push({
      id: nextId(), name: 'Login - Brute Force Rate Limiting Check',
      category: 'Security', priority: 'High',
      description: 'Submit wrong credentials 5 times rapidly. A secure site should lock or rate-limit after repeated failures.',
      action: 'ec_login_brute_force',
      emailSel: profile.loginEmailSel,
      passSel: profile.loginPassSel,
    });
  }

  // ── 10. REGISTRATION TESTS ────────────────────────────────────────────
  if (profile.hasSignup) {
    tests.push({
      id: nextId(), name: 'Registration Link Works',
      category: 'Functional', priority: 'High',
      description: 'Register/Sign Up link must be clickable and navigate to registration page.',
      action: 'ec_register_link_works',
    });
  }

  // ── 11. NEWSLETTER TESTS ──────────────────────────────────────────────
  if (profile.hasNewsletter) {
    tests.push({
      id: nextId(), name: 'Newsletter - Valid Email Subscribe',
      category: 'Functional', priority: 'Medium',
      description: 'Enter a valid email in newsletter form and submit — should show success message.',
      action: 'ec_newsletter_valid',
    });
    tests.push({
      id: nextId(), name: 'Newsletter - Invalid Email',
      category: 'Validation', priority: 'Medium',
      description: 'Enter "notanemail" in newsletter form — should show format validation error.',
      action: 'ec_newsletter_invalid',
    });
  }

  // ── 12. BREADCRUMB & NAVIGATION TESTS ────────────────────────────────
  if (profile.hasBreadcrumb) {
    tests.push({
      id: nextId(), name: 'Breadcrumb Navigation Visible',
      category: 'UI', priority: 'Low',
      description: 'Breadcrumb trail must be visible and links must be clickable for navigation.',
      action: 'ec_breadcrumb_visible',
    });
  }

  if (profile.hasPagination) {
    tests.push({
      id: nextId(), name: 'Pagination Works - Next Page',
      category: 'Functional', priority: 'High',
      description: 'Click "Next" or page 2 in pagination and verify new products load on the next page.',
      action: 'ec_pagination_next',
    });
  }

  // ── 13. COUPON / PROMO CODE ───────────────────────────────────────────
  if (profile.hasCouponField) {
    tests.push({
      id: nextId(), name: 'Coupon Field - Invalid Code',
      category: 'Functional', priority: 'Medium',
      description: 'Enter "INVALIDCOUPON123" and verify proper error message (not a server crash or blank response).',
      action: 'ec_coupon_invalid',
    });
  }

  // ── 14. PAGE PERFORMANCE ──────────────────────────────────────────────
  tests.push({
    id: nextId(), name: 'Page Load Time Under 5 Seconds',
    category: 'Performance', priority: 'High',
    description: 'Ecommerce pages must load within 5 seconds. Slow pages lose customers — 53% of users abandon after 3s.',
    action: 'ec_page_load_time',
  });

  tests.push({
    id: nextId(), name: 'No JavaScript Errors on Load',
    category: 'Functional', priority: 'High',
    description: 'Detect any JavaScript console errors — these often indicate broken cart/checkout functionality.',
    action: 'ec_no_js_errors',
  });

  tests.push({
    id: nextId(), name: 'Mobile Viewport Renders Correctly',
    category: 'UI', priority: 'High',
    description: 'Resize to 375px (iPhone) width and check key elements (cart, nav, products) are still visible — critical for mobile shoppers.',
    action: 'ec_mobile_viewport',
  });

  // ── 15. CHECKOUT PRESENCE ─────────────────────────────────────────────
  if (profile.hasCheckout) {
    tests.push({
      id: nextId(), name: 'Checkout Button/Link Present',
      category: 'Ecommerce', priority: 'Critical',
      description: 'Checkout button must be visible. If checkout is unreachable, revenue is lost.',
      action: 'ec_checkout_visible',
    });
  }

  // ── 16. CONTACT FORM ─────────────────────────────────────────────────
  if (profile.hasContactForm) {
    tests.push({
      id: nextId(), name: 'Contact Form - Empty Submission',
      category: 'Validation', priority: 'Medium',
      description: 'Submit contact form empty — all required fields must show validation errors.',
      action: 'ec_contact_empty',
    });
  }

  return tests;
}

module.exports = { generateEcommerceTests };
