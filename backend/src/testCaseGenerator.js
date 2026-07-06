/**
 * testCaseGenerator.js
 * Generates functional + security test cases from extracted elements.
 */

// ============================================================
// SECURITY PAYLOADS
// These are standard payloads used by real QA & security teams
// ============================================================
const SECURITY = {

  // XSS (Cross-Site Scripting): attacker tries to inject JS into the page
  // If the browser EXECUTES this script, it's a vulnerability
  XSS: [
    { label: 'XSS Basic Script Tag',         payload: '<script>alert("XSS")</script>' },
    { label: 'XSS Image onerror',            payload: '<img src=x onerror=alert(1)>' },
    { label: 'XSS SVG onload',               payload: '<svg onload=alert(1)>' },
    { label: 'XSS Event Attribute',          payload: '" onmouseover="alert(1)' },
    { label: 'XSS JavaScript URL',           payload: 'javascript:alert(document.cookie)' },
    { label: 'XSS Template Literal',         payload: '${alert(1)}' },
    { label: 'XSS HTML Entity Bypass',       payload: '&lt;script&gt;alert(1)&lt;/script&gt;' },
  ],

  // SQL Injection: attacker tries to break/manipulate database queries
  // Classic example: entering ' OR '1'='1 to bypass login
  SQL: [
    { label: 'SQL Classic OR bypass',        payload: "' OR '1'='1" },
    { label: 'SQL Comment bypass',           payload: "admin'--" },
    { label: 'SQL UNION probe',              payload: "' UNION SELECT null,null--" },
    { label: 'SQL Boolean blind',            payload: "1 AND 1=1" },
    { label: 'SQL Time-based blind',         payload: "'; WAITFOR DELAY '0:0:5'--" },
    { label: 'SQL Drop table (Bobby)',       payload: "'; DROP TABLE users;--" },
    { label: 'SQL Stacked query',            payload: "1; SELECT * FROM users" },
  ],

  // Command Injection: attacker tries to run OS commands through inputs
  CMD: [
    { label: 'CMD Semicolon chain',          payload: '; ls -la' },
    { label: 'CMD Pipe to command',          payload: '| whoami' },
    { label: 'CMD Backtick execution',       payload: '`id`' },
    { label: 'CMD Windows dir',             payload: '& dir' },
    { label: 'CMD Null byte',               payload: 'file.txt%00.php' },
  ],

  // Path Traversal: attacker tries to read files outside web root
  PATH: [
    { label: 'Path Traversal Unix',         payload: '../../../etc/passwd' },
    { label: 'Path Traversal Windows',      payload: '..\\..\\..\\windows\\win.ini' },
    { label: 'Path Traversal Encoded',      payload: '%2e%2e%2f%2e%2e%2fetc%2fpasswd' },
    { label: 'Path Traversal Double Encode', payload: '..%252f..%252fetc/passwd' },
  ],

  // SSTI (Server-Side Template Injection): attacker runs code in template engine
  SSTI: [
    { label: 'SSTI Jinja/Twig probe',       payload: '{{7*7}}' },
    { label: 'SSTI FreeMarker probe',       payload: '${7*7}' },
    { label: 'SSTI Ruby/ERB probe',         payload: '<%= 7*7 %>' },
    { label: 'SSTI Velocity probe',         payload: '#set($x=7*7)$x' },
  ],

  // XXE (XML External Entity): attacker injects malicious XML
  XXE: [
    { label: 'XXE Basic entity',            payload: '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><test>&xxe;</test>' },
  ],

  // Open Redirect: attacker tricks app to redirect to malicious site
  REDIRECT: [
    { label: 'Open Redirect basic',         payload: 'https://evil.com' },
    { label: 'Open Redirect double slash',  payload: '//evil.com' },
    { label: 'Open Redirect encoded',       payload: 'https%3A%2F%2Fevil.com' },
  ],

  // LDAP Injection: attacker manipulates LDAP directory queries
  LDAP: [
    { label: 'LDAP Injection wildcard',     payload: '*)(uid=*))(|(uid=*' },
    { label: 'LDAP Injection bypass',       payload: 'admin)(&)' },
  ],

  // Buffer Overflow / large input stress
  OVERFLOW: [
    { label: 'Long string 1000 chars',      payload: 'A'.repeat(1000) },
    { label: 'Long string 10000 chars',     payload: 'A'.repeat(10000) },
    { label: 'Null bytes',                  payload: '\x00\x00\x00' },
    { label: 'Unicode stress',              payload: '\u202E\u0041\u0042\u0043' },  // RTL override
  ],

  // CSRF related headers check (no payload, header inspection)
  // Checked at page level, not per-input
};

// ============================================================
// MAIN GENERATOR
// ============================================================
function generateTestCases(elements, { email, password } = {}) {
  const tests = [];
  let id = 1;
  const nextId = () => `TC-${String(id++).padStart(3, '0')}`;

  // Page-level security tests (run once, not per element)
  tests.push(...generatePageSecurityTests(nextId));

  for (const el of elements) {
    if (!el.visible) continue;

    switch (el.category) {
      case 'Button':       tests.push(...generateButtonTests(el, nextId)); break;
      case 'TextInput':    tests.push(...generateTextInputTests(el, nextId)); break;
      case 'EmailInput':   tests.push(...generateEmailInputTests(el, nextId, email)); break;
      case 'PasswordInput':tests.push(...generatePasswordInputTests(el, nextId, password)); break;
      case 'NumberInput':  tests.push(...generateNumberInputTests(el, nextId)); break;
      case 'DateInput':    tests.push(...generateDateInputTests(el, nextId)); break;
      case 'Checkbox':     tests.push(...generateCheckboxTests(el, nextId)); break;
      case 'RadioButton':  tests.push(...generateRadioTests(el, nextId)); break;
      case 'Textarea':     tests.push(...generateTextareaTests(el, nextId)); break;
      case 'Dropdown':     tests.push(...generateDropdownTests(el, nextId)); break;
      case 'Link':         tests.push(...generateLinkTests(el, nextId)); break;
      case 'Form':         tests.push(...generateFormTests(el, nextId)); break;
      case 'Navigation':   tests.push(...generateNavTests(el, nextId)); break;
      case 'Image':        tests.push(...generateImageTests(el, nextId)); break;
      case 'RangeSlider':  tests.push(...generateSliderTests(el, nextId)); break;
      case 'FileInput':    tests.push(...generateFileInputTests(el, nextId)); break;
      case 'Tab':          tests.push(...generateTabTests(el, nextId)); break;
      case 'MediaElement': tests.push(...generateMediaTests(el, nextId)); break;
    }
  }

  return tests;
}

// ============================================================
// PAGE-LEVEL SECURITY TESTS
// These test the whole page, not individual elements
// ============================================================
function generatePageSecurityTests(nextId) {
  return [
    // HTTPS
    {
      id: nextId(), element: { selector: null, tagName: 'page', category: 'Page' },
      name: 'HTTPS Enforcement Check',
      category: 'Security', priority: 'Critical',
      description: 'Verify the page is served over HTTPS (encrypted connection). HTTP pages expose user data in plaintext.',
      action: 'check_https',
    },
    // Security headers
    {
      id: nextId(), element: { selector: null, tagName: 'page', category: 'Page' },
      name: 'Security Headers Check',
      category: 'Security', priority: 'High',
      description: 'Check for important HTTP security headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Missing headers are common vulnerabilities.',
      action: 'check_security_headers',
    },
    // Mixed content
    {
      id: nextId(), element: { selector: null, tagName: 'page', category: 'Page' },
      name: 'Mixed Content Check',
      category: 'Security', priority: 'High',
      description: 'Detect HTTP resources (images, scripts, iframes) loaded on an HTTPS page. Mixed content weakens SSL protection.',
      action: 'check_mixed_content',
    },
    // Clickjacking
    {
      id: nextId(), element: { selector: null, tagName: 'page', category: 'Page' },
      name: 'Clickjacking Protection',
      category: 'Security', priority: 'High',
      description: 'Check X-Frame-Options or CSP frame-ancestors header. Without this, attackers can embed your page in an iframe and trick users into clicking hidden elements.',
      action: 'check_clickjacking',
    },
    // Sensitive data in URL
    {
      id: nextId(), element: { selector: null, tagName: 'page', category: 'Page' },
      name: 'Sensitive Data in URL',
      category: 'Security', priority: 'High',
      description: 'Check if URL contains sensitive keywords like password, token, apikey, sessionid, secret in query parameters. These get stored in browser history and server logs.',
      action: 'check_sensitive_url',
    },
    // Console errors
    {
      id: nextId(), element: { selector: null, tagName: 'page', category: 'Page' },
      name: 'JavaScript Console Errors',
      category: 'Functional', priority: 'Medium',
      description: 'Detect JavaScript errors thrown on page load. Errors can indicate broken functionality or security misconfigurations.',
      action: 'check_console_errors',
    },
    // Autocomplete on forms
    {
      id: nextId(), element: { selector: null, tagName: 'page', category: 'Page' },
      name: 'Password Autocomplete Control',
      category: 'Security', priority: 'Medium',
      description: 'Check password fields have autocomplete="off" or autocomplete="new-password". Prevents browsers from caching passwords on shared computers.',
      action: 'check_autocomplete',
    },
    // Cookie security
    {
      id: nextId(), element: { selector: null, tagName: 'page', category: 'Page' },
      name: 'Cookie Security Flags',
      category: 'Security', priority: 'High',
      description: 'Inspect cookies for Secure and HttpOnly flags. Missing Secure means cookies sent over HTTP. Missing HttpOnly means JavaScript can steal them via XSS.',
      action: 'check_cookies',
    },
  ];
}

// ============================================================
// INPUT SECURITY TESTS (XSS, SQLi, etc.)
// Applied to every text-accepting input field
// ============================================================
function generateInputSecurityTests(el, nextId) {
  const label = el.placeholder || el.ariaLabel || el.name || el.id || 'field';
  const tests = [];

  // XSS tests on this input
  for (const xss of SECURITY.XSS) {
    tests.push({
      id: nextId(), element: el,
      name: `XSS - ${xss.label} on "${label}"`,
      category: 'Security', priority: 'Critical',
      description: `Inject XSS payload into input. If the page executes JavaScript after submission, it is vulnerable. Payload: ${xss.payload.slice(0,60)}`,
      action: 'security_xss',
      value: xss.payload,
      securityType: 'XSS',
    });
  }

  // SQL Injection tests on this input
  for (const sql of SECURITY.SQL) {
    tests.push({
      id: nextId(), element: el,
      name: `SQLi - ${sql.label} on "${label}"`,
      category: 'Security', priority: 'Critical',
      description: `Inject SQL payload into input. Look for database errors, unexpected data, or bypass behavior. Payload: ${sql.payload.slice(0,60)}`,
      action: 'security_sqli',
      value: sql.payload,
      securityType: 'SQLi',
    });
  }

  // Command Injection
  for (const cmd of SECURITY.CMD) {
    tests.push({
      id: nextId(), element: el,
      name: `CMDi - ${cmd.label} on "${label}"`,
      category: 'Security', priority: 'Critical',
      description: `Inject OS command payload. If the server runs this as a shell command, it is a critical vulnerability. Payload: ${cmd.payload}`,
      action: 'security_cmdi',
      value: cmd.payload,
      securityType: 'CMDi',
    });
  }

  // SSTI
  for (const ssti of SECURITY.SSTI) {
    tests.push({
      id: nextId(), element: el,
      name: `SSTI - ${ssti.label} on "${label}"`,
      category: 'Security', priority: 'High',
      description: `Inject template expression. If the page returns "49" (7*7 evaluated), the template engine is executing user input. Payload: ${ssti.payload}`,
      action: 'security_ssti',
      value: ssti.payload,
      securityType: 'SSTI',
    });
  }

  // Buffer overflow / stress
  for (const buf of SECURITY.OVERFLOW) {
    tests.push({
      id: nextId(), element: el,
      name: `Overflow - ${buf.label} on "${label}"`,
      category: 'Security', priority: 'Medium',
      description: `Send oversized/malformed input to test server stability and input length enforcement.`,
      action: 'security_overflow',
      value: buf.payload,
      securityType: 'Overflow',
    });
  }

  return tests;
}

// ============================================================
// ELEMENT-SPECIFIC TEST GENERATORS
// ============================================================

function generateButtonTests(el, nextId) {
  const label = el.text || el.ariaLabel || 'Button';
  return [
    { id: nextId(), element: el, name: `Button Visible - "${label}"`, category: 'UI', priority: 'High', description: 'Button must be visible and rendered on page', action: 'visibility_check' },
    { id: nextId(), element: el, name: `Button Clickable - "${label}"`, category: 'Functional', priority: 'High', description: 'Button click must not throw JS errors', action: 'click' },
    { id: nextId(), element: el, name: `Button Disabled State - "${label}"`, category: 'UI', priority: 'Medium', description: 'Verify correct enabled/disabled state', action: 'disabled_check' },
  ];
}

function generateTextInputTests(el, nextId) {
  const label = el.placeholder || el.ariaLabel || el.name || 'text input';
  return [
    { id: nextId(), element: el, name: `TextInput Valid Entry - "${label}"`, category: 'Functional', priority: 'High', description: 'Type valid text and verify input accepts it', action: 'type_valid', value: 'TestValue123' },
    { id: nextId(), element: el, name: `TextInput Empty - "${label}"`, category: 'Validation', priority: 'High', description: 'Leave empty and check required validation', action: 'type_empty' },
    { id: nextId(), element: el, name: `TextInput Long String 500 chars - "${label}"`, category: 'Boundary', priority: 'Medium', description: 'Test input with 500 character string', action: 'type_valid', value: 'A'.repeat(500) },
    // Security tests for every text input
    ...generateInputSecurityTests(el, nextId),
  ];
}

function generateEmailInputTests(el, nextId, email) {
  const label = el.placeholder || el.ariaLabel || 'email';
  return [
    { id: nextId(), element: el, name: `Email Valid Format - "${label}"`, category: 'Functional', priority: 'High', description: 'Enter valid email and verify acceptance', action: 'type_valid', value: email || 'test@example.com' },
    { id: nextId(), element: el, name: `Email Invalid Format - "${label}"`, category: 'Validation', priority: 'High', description: 'Enter "notanemail" and check browser validation rejects it', action: 'type_invalid_email', value: 'notanemail' },
    { id: nextId(), element: el, name: `Email Empty - "${label}"`, category: 'Validation', priority: 'High', description: 'Submit empty email and check required error', action: 'type_empty' },
    { id: nextId(), element: el, name: `Email XSS in field - "${label}"`, category: 'Security', priority: 'Critical', description: 'Inject XSS into email field — some apps skip sanitizing email fields', action: 'security_xss', value: '<script>alert(1)</script>@evil.com', securityType: 'XSS' },
    { id: nextId(), element: el, name: `Email SQLi in field - "${label}"`, category: 'Security', priority: 'Critical', description: "SQL injection via email: ' OR '1'='1'--", action: 'security_sqli', value: "' OR '1'='1'--@evil.com", securityType: 'SQLi' },
  ];
}

function generatePasswordInputTests(el, nextId, password) {
  return [
    { id: nextId(), element: el, name: 'Password Masking (type=password)', category: 'Security', priority: 'Critical', description: 'Verify input type is "password" so characters are masked. If type is "text", passwords are exposed on screen.', action: 'check_type_password' },
    { id: nextId(), element: el, name: 'Password Valid Strong Entry', category: 'Functional', priority: 'High', description: 'Enter a strong password and verify field accepts it', action: 'type_valid', value: password || 'Str0ng@Pass#2024!' },
    { id: nextId(), element: el, name: 'Password Weak (1 char)', category: 'Validation', priority: 'High', description: 'Enter single character — app should reject or warn', action: 'type_valid', value: 'a' },
    { id: nextId(), element: el, name: 'Password SQLi Bypass Attempt', category: 'Security', priority: 'Critical', description: "Classic login bypass: enter ' OR '1'='1 as password", action: 'security_sqli', value: "' OR '1'='1'--", securityType: 'SQLi' },
    { id: nextId(), element: el, name: 'Password Autocomplete Attribute', category: 'Security', priority: 'Medium', description: 'Check autocomplete attribute — should be "new-password" or "off" to prevent browser caching', action: 'check_autocomplete_field' },
  ];
}

function generateNumberInputTests(el, nextId) {
  const label = el.placeholder || el.ariaLabel || 'number';
  return [
    { id: nextId(), element: el, name: `Number Valid - "${label}"`, category: 'Functional', priority: 'High', description: 'Enter valid number within range', action: 'type_valid', value: '42' },
    { id: nextId(), element: el, name: `Number Below Min - "${label}"`, category: 'Boundary', priority: 'High', description: `Enter value below minimum (${el.min || 0})`, action: 'type_valid', value: String(Number(el.min || 0) - 9999) },
    { id: nextId(), element: el, name: `Number Above Max - "${label}"`, category: 'Boundary', priority: 'High', description: `Enter value above maximum (${el.max || 'none'})`, action: 'type_valid', value: String(Number(el.max || 9999) + 9999) },
    { id: nextId(), element: el, name: `Number Alphabetic Input - "${label}"`, category: 'Validation', priority: 'Medium', description: 'Enter letters in number field — browser should reject', action: 'type_valid', value: 'abcdef' },
    { id: nextId(), element: el, name: `Number Negative - "${label}"`, category: 'Boundary', priority: 'Medium', description: 'Enter negative number to test handling', action: 'type_valid', value: '-1' },
    { id: nextId(), element: el, name: `Number SQLi - "${label}"`, category: 'Security', priority: 'High', description: 'Inject SQL into numeric field — some backends cast without sanitizing', action: 'security_sqli', value: "1 OR 1=1", securityType: 'SQLi' },
  ];
}

function generateDateInputTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: 'Date Valid', category: 'Functional', priority: 'High', description: 'Enter valid date value (2024-06-15)', action: 'type_valid', value: '2024-06-15' },
    { id: nextId(), element: el, name: 'Date Past (1900)', category: 'Boundary', priority: 'Medium', description: 'Enter very old date — check if app handles historic dates', action: 'type_valid', value: '1900-01-01' },
    { id: nextId(), element: el, name: 'Date Future (2099)', category: 'Boundary', priority: 'Medium', description: 'Enter far future date — app should accept or show validation', action: 'type_valid', value: '2099-12-31' },
  ];
}

function generateCheckboxTests(el, nextId) {
  const label = el.ariaLabel || el.name || 'checkbox';
  return [
    { id: nextId(), element: el, name: `Checkbox Toggle - "${label}"`, category: 'Functional', priority: 'High', description: 'Click checkbox to toggle state', action: 'click' },
    { id: nextId(), element: el, name: `Checkbox Default State - "${label}"`, category: 'UI', priority: 'Medium', description: `Default should be: ${el.checked ? 'CHECKED' : 'UNCHECKED'}`, action: 'check_state' },
  ];
}

function generateRadioTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: `Radio Select - "${el.name || 'radio'}"`, category: 'Functional', priority: 'High', description: 'Click radio button and verify selection', action: 'click' },
  ];
}

function generateTextareaTests(el, nextId) {
  const label = el.placeholder || el.ariaLabel || 'textarea';
  return [
    { id: nextId(), element: el, name: `Textarea Valid Input - "${label}"`, category: 'Functional', priority: 'High', description: 'Enter multi-line text and verify acceptance', action: 'type_valid', value: 'Line one of test input.\nLine two of test input.' },
    { id: nextId(), element: el, name: `Textarea Empty - "${label}"`, category: 'Validation', priority: 'Medium', description: 'Leave empty and check required validation', action: 'type_empty' },
    // Textareas are a prime XSS/SQLi target
    ...generateInputSecurityTests(el, nextId),
  ];
}

function generateDropdownTests(el, nextId) {
  const label = el.ariaLabel || el.name || 'dropdown';
  return [
    { id: nextId(), element: el, name: `Dropdown Select Option - "${label}"`, category: 'Functional', priority: 'High', description: `Select option 2 of ${el.optionCount} available`, action: 'select_option', index: 1 },
    { id: nextId(), element: el, name: `Dropdown Has Options - "${label}"`, category: 'UI', priority: 'Medium', description: `Verify dropdown has options (found: ${el.optionCount})`, action: 'check_options' },
  ];
}

function generateLinkTests(el, nextId) {
  const label = el.text || el.ariaLabel || el.href?.slice(0, 40) || 'link';
  return [
    { id: nextId(), element: el, name: `Link Visible - "${label}"`, category: 'UI', priority: 'High', description: 'Link must be visible on page', action: 'visibility_check' },
    { id: nextId(), element: el, name: `Link Has Valid href - "${label}"`, category: 'Functional', priority: 'High', description: 'Link must have non-empty, non-# href', action: 'check_href' },
    { id: nextId(), element: el, name: `Link Open Redirect - "${label}"`, category: 'Security', priority: 'High', description: 'Check if link href could be used for open redirect attack (redirecting users to external malicious sites)', action: 'check_open_redirect' },
  ];
}

function generateFormTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: 'Form Empty Submission', category: 'Validation', priority: 'High', description: `Submit form with ${el.fieldCount} fields empty — check validation messages`, action: 'form_empty_submit' },
    { id: nextId(), element: el, name: 'Form Action Exists', category: 'Functional', priority: 'Medium', description: `Form action: ${el.action || 'none (posts to current URL)'}. Method: ${el.method}`, action: 'check_form_action' },
    { id: nextId(), element: el, name: 'Form CSRF Token Present', category: 'Security', priority: 'Critical', description: 'Check form has a CSRF token hidden input. Without CSRF protection, attackers can trick logged-in users into submitting forms from other websites.', action: 'check_csrf_token' },
    { id: nextId(), element: el, name: 'Form Method Safety', category: 'Security', priority: 'High', description: 'Forms that modify data (login, register, delete) should use POST not GET. GET requests appear in URLs and browser history.', action: 'check_form_method' },
  ];
}

function generateNavTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: 'Navigation Visible', category: 'UI', priority: 'Medium', description: `Navigation has ${el.linkCount} links — verify it renders correctly`, action: 'visibility_check' },
  ];
}

function generateImageTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: 'Image Alt Text (WCAG 2.1)', category: 'Accessibility', priority: 'High', description: `All images must have alt text for screen readers. Current: "${el.alt || 'MISSING'}"`, action: 'check_alt' },
  ];
}

function generateSliderTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: `Slider Visible - range ${el.min}-${el.max}`, category: 'Functional', priority: 'Medium', description: 'Range slider must be visible and accessible', action: 'visibility_check' },
  ];
}

function generateFileInputTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: `File Input Visible - "${el.name || 'file'}"`, category: 'UI', priority: 'Medium', description: `File upload accepts: ${el.accept || 'any type'}`, action: 'visibility_check' },
    { id: nextId(), element: el, name: `File Input Type Restriction - "${el.name || 'file'}"`, category: 'Security', priority: 'High', description: 'Check if file input restricts types via "accept" attribute. Unrestricted uploads can allow malicious file uploads (.php, .exe, .sh).', action: 'check_file_accept' },
  ];
}

function generateTabTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: `Tab Clickable - "${el.text || 'Tab'}"`, category: 'Functional', priority: 'High', description: 'Click tab and verify it activates', action: 'click' },
  ];
}

function generateMediaTests(el, nextId) {
  return [
    { id: nextId(), element: el, name: `${el.tagName} Has Controls`, category: 'UI', priority: 'Medium', description: `Media element must have controls so users can play/pause. Controls present: ${el.controls}`, action: 'check_media_controls' },
  ];
}

module.exports = { generateTestCases, SECURITY };
