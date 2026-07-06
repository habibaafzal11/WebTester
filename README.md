# 🧪 WebTester Pro — Automated QA Chrome Extension

Automatically extract all testable elements from any webpage, run Playwright-powered test cases, and get a beautiful HTML report — right from your browser.

---

## 📁 Project Structure

```
web-tester/
├── extension/               ← Chrome Extension (load this in Chrome)
│   ├── manifest.json
│   ├── icons/
│   ├── popup/
│   │   ├── popup.html       ← Extension UI
│   │   ├── popup.js
│   │   └── report.html      ← Report viewer tab
│   └── content/
│       └── content.js
│
├── backend/                 ← Node.js + Playwright server
│   └── src/
│       ├── server.js        ← Express API server
│       ├── elementExtractor.js  ← Finds all testable elements
│       ├── testCaseGenerator.js ← Creates test cases per element
│       ├── testRunner.js    ← Executes tests via Playwright
│       └── reportGenerator.js  ← Generates HTML report
│
├── start-backend.sh         ← One-click backend starter
└── README.md
```

---

## 🚀 Setup & Usage

### Step 1 — Start the Backend

```bash
cd web-tester
bash start-backend.sh
```

This will:
- Install npm dependencies
- Install Playwright + Chromium browser
- Start the server on `http://localhost:3847`

### Step 2 — Load the Chrome Extension

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer Mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select the `web-tester/extension/` folder
5. The 🧪 icon appears in your toolbar

### Step 3 — Run Tests

1. Click the 🧪 WebTester Pro icon
2. Enter the URL to test (or it auto-fills from your current tab)
3. *(Optional)* Expand "Add Login Credentials" for authenticated pages
4. Click **"Run Automated Tests"**
5. Watch the progress — then click **"View Full HTML Report"**

---

## 🔍 What Elements Are Extracted?

WebTester Pro detects **20 categories** of testable elements:

| Category | What It Covers |
|---|---|
| 🔘 Buttons | `<button>`, submit, reset, `role="button"` |
| ✏️ Text Inputs | Text, search boxes |
| 📧 Email Inputs | `type="email"` fields |
| 🔐 Password Inputs | `type="password"` — checks masking |
| 🔢 Number Inputs | Numeric fields with min/max bounds |
| 📅 Date Inputs | Date, time, datetime-local |
| 📁 File Inputs | Upload fields, accepted types |
| ☑️ Checkboxes | Toggle state verification |
| 🔴 Radio Buttons | Selection and grouping |
| 📝 Textareas | Multi-line text, char limits |
| 📋 Dropdowns | `<select>` with option validation |
| 🔗 Links | href validity, dead link detection |
| 🧭 Navigation | Nav menus and link counts |
| 📄 Forms | Submission, action, method |
| 🗂️ Tabs | `role="tab"` elements |
| 💬 Modal Triggers | Bootstrap, ARIA dialog triggers |
| 🖼️ Images | Alt text (WCAG accessibility) |
| 🎬 Media | `<video>` / `<audio>` controls |
| 🪗 Accordions | Collapse/details elements |
| 🎚️ Range Sliders | Min/max boundary testing |

---

## 🧪 Test Case Types

Each element gets multiple test cases:

| Type | Examples |
|---|---|
| **Functional** | Click buttons, type in inputs, select options |
| **Validation** | Empty submission, invalid email, XSS payloads |
| **Boundary** | Number min/max, long strings (500 chars) |
| **Security** | Password masking, XSS input detection |
| **Accessibility** | Alt text presence (WCAG 2.1 AA) |
| **UI** | Visibility, disabled states, option counts |

---

## 📊 HTML Report Includes

- 🐛 **Bug banner** — immediate pass/fail summary
- 📈 **Stats grid** — total / passed / failed / warnings / skipped
- 🍩 **Donut chart** — visual pass rate
- 🔍 **Elements breakdown** — count by category
- 📋 **Detailed results** — every test case with status, error, duration
- 📸 **Page screenshot** — captured at test time

---

## ⚙️ Architecture

```
Chrome Extension (popup)
      │
      │  POST /run-tests { url, email?, password? }
      ▼
Node.js Backend (Express :3847)
      │
      ├── Playwright launches Chromium (headless)
      ├── Navigates to URL
      ├── elementExtractor.js → finds all 20 element types
      ├── testCaseGenerator.js → creates targeted test cases
      ├── testRunner.js → executes each test case
      └── reportGenerator.js → builds HTML report
      │
      │  Returns { summary, reportHtml }
      ▼
Extension shows stats + opens report in new tab
```

---

## 🛠️ Requirements

- **Node.js** 18+ 
- **Google Chrome** (any recent version)
- **~300MB disk** for Playwright Chromium

---

## 💡 Tips

- The backend must be running before clicking "Run Tests"
- The green dot in the extension popup confirms server is online
- For login-protected pages, add credentials in the optional section
- Test runs take 30–90 seconds depending on page complexity
- Reports auto-save — reopen from the extension anytime

---

## 🔮 Coming Soon (Phase 2)

- [ ] Test history & comparison
- [ ] Export report as PDF
- [ ] Schedule recurring tests
- [ ] CI/CD integration (GitHub Actions)
- [ ] Screenshot diffs between runs
