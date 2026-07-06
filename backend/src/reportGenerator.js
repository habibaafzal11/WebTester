/**
 * reportGenerator.js
 * Generates a self-contained HTML test report.
 * Fixed: no emoji in JS strings, safe template literals, no storage size issues.
 */

function generateReport(data) {
  const { url, pageTitle, pageScreenshot, elements, results, summary } = data;
  const now = new Date().toLocaleString();

  // Group results by category
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
  }

  // Element category breakdown
  const elCategories = {};
  for (const el of elements) {
    elCategories[el.category] = (elCategories[el.category] || 0) + 1;
  }

  const statusColor = { PASS: '#10b981', FAIL: '#ef4444', WARN: '#f59e0b', SKIP: '#6b7280' };
  const statusBg    = { PASS: '#d1fae5', FAIL: '#fee2e2', WARN: '#fef3c7', SKIP: '#f3f4f6' };
  const statusText  = { PASS: 'PASS', FAIL: 'FAIL', WARN: 'WARN', SKIP: 'SKIP' };
  const priorityColor = { Critical: '#7c3aed', High: '#dc2626', Medium: '#d97706', Low: '#6b7280' };
  const priorityBg    = { Critical: '#f5f3ff', High: '#fef2f2', Medium: '#fffbeb', Low: '#f9fafb' };

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function badge(text, color, bg) {
    return '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;color:' +
      color + ';background:' + bg + ';border:1px solid ' + color + '">' + esc(text) + '</span>';
  }

  function catLabel(cat) {
    const labels = {
      Button: 'Button', TextInput: 'Text Input', EmailInput: 'Email Input',
      PasswordInput: 'Password', NumberInput: 'Number Input', DateInput: 'Date Input',
      FileInput: 'File Input', Checkbox: 'Checkbox', RadioButton: 'Radio Button',
      Textarea: 'Textarea', Dropdown: 'Dropdown', Link: 'Link',
      Navigation: 'Navigation', Form: 'Form', Tab: 'Tab',
      ModalTrigger: 'Modal Trigger', Image: 'Image', MediaElement: 'Media',
      Accordion: 'Accordion', RangeSlider: 'Range Slider', Page: 'Page',
      Functional: 'Functional', Validation: 'Validation', UI: 'UI',
      Security: 'Security', Accessibility: 'Accessibility',
      Boundary: 'Boundary', Infrastructure: 'Infrastructure',
    };
    return labels[cat] || cat;
  }

  // Build results rows HTML
  function buildRows(items) {
    return items.map(function(r) {
      const sc = statusColor[r.status] || '#6b7280';
      const sb = statusBg[r.status] || '#f3f4f6';
      const pc = priorityColor[r.priority] || '#6b7280';
      const pb = priorityBg[r.priority] || '#f9fafb';
      const detail = esc(r.error || r.details || '-');
      const detailColor = r.error ? '#dc2626' : '#059669';
      return '<tr style="border-bottom:1px solid #f3f4f6">' +
        '<td style="padding:9px 12px;font-family:monospace;font-size:12px;color:#9ca3af;white-space:nowrap">' + esc(r.id) + '</td>' +
        '<td style="padding:9px 12px;font-size:13px;font-weight:500;color:#111827">' + esc(r.name) + '</td>' +
        '<td style="padding:9px 12px"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:' + pc + ';background:' + pb + '">' + esc(r.priority) + '</span></td>' +
        '<td style="padding:9px 12px;text-align:center"><span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;color:' + sc + ';background:' + sb + '">' + (statusText[r.status] || r.status) + '</span></td>' +
        '<td style="padding:9px 12px;font-size:12px;color:' + detailColor + ';max-width:320px;word-break:break-word">' + detail + '</td>' +
        '<td style="padding:9px 12px;font-size:12px;color:#9ca3af;text-align:right;white-space:nowrap">' + (r.duration || 0) + 'ms</td>' +
        '</tr>';
    }).join('');
  }

  // Build category sections
  let categorySections = '';
  for (const [cat, items] of Object.entries(byCategory)) {
    const catPassed  = items.filter(function(r){ return r.status === 'PASS'; }).length;
    const catFailed  = items.filter(function(r){ return r.status === 'FAIL'; }).length;
    const catWarn    = items.filter(function(r){ return r.status === 'WARN'; }).length;
    const catSkipped = items.filter(function(r){ return r.status === 'SKIP'; }).length;

    const headerBg = catFailed > 0 ? '#fef2f2' : catWarn > 0 ? '#fffbeb' : '#f0fdf4';
    const headerBorder = catFailed > 0 ? '#fecaca' : catWarn > 0 ? '#fde68a' : '#bbf7d0';

    let countBadges = '';
    if (catPassed)  countBadges += badge(catPassed + ' passed', '#059669', '#d1fae5') + ' ';
    if (catFailed)  countBadges += badge(catFailed + ' failed', '#dc2626', '#fee2e2') + ' ';
    if (catWarn)    countBadges += badge(catWarn + ' warnings', '#d97706', '#fef3c7') + ' ';
    if (catSkipped) countBadges += badge(catSkipped + ' skipped', '#6b7280', '#f3f4f6') + ' ';

    categorySections +=
      '<div style="margin-bottom:28px;border:1px solid ' + headerBorder + ';border-radius:10px;overflow:hidden">' +
        '<div style="background:' + headerBg + ';border-bottom:1px solid ' + headerBorder + ';padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
          '<div style="font-size:14px;font-weight:700;color:#111827">' +
            esc(catLabel(cat)) +
            '<span style="font-size:12px;font-weight:400;color:#6b7280;margin-left:8px">' + items.length + ' test' + (items.length !== 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' + countBadges + '</div>' +
        '</div>' +
        '<div style="overflow-x:auto">' +
          '<table style="width:100%;border-collapse:collapse;background:#fff">' +
            '<thead>' +
              '<tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">' +
                '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;width:80px">ID</th>' +
                '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">Test Name</th>' +
                '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;width:90px">Priority</th>' +
                '<th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;width:90px">Status</th>' +
                '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">Details / Error</th>' +
                '<th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;width:70px">Time</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + buildRows(items) + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  // Element breakdown rows
  let elementRows = '';
  for (const [cat, count] of Object.entries(elCategories)) {
    elementRows +=
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f3f4f6">' +
        '<span style="font-size:13px;color:#374151">' + esc(catLabel(cat)) + '</span>' +
        '<span style="font-size:13px;font-weight:700;color:#111827">' + count + '</span>' +
      '</div>';
  }

  // Screenshot section
  const screenshotSection = pageScreenshot
    ? '<div class="card">' +
        '<div class="card-header"><h2>Page Screenshot</h2></div>' +
        '<div class="card-body">' +
          '<img src="data:image/png;base64,' + pageScreenshot + '" style="width:100%;border-radius:6px;border:1px solid #e5e7eb;display:block" alt="Page screenshot"/>' +
        '</div>' +
      '</div>'
    : '';

  // Bug/pass banner
  const banner = summary.failed > 0
    ? '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:flex-start;gap:14px">' +
        '<div style="font-size:28px;line-height:1">&#128027;</div>' +
        '<div><div style="font-size:15px;font-weight:700;color:#dc2626">' + summary.failed + ' Bug' + (summary.failed !== 1 ? 's' : '') + ' / Failure' + (summary.failed !== 1 ? 's' : '') + ' Found</div>' +
        '<div style="font-size:13px;color:#6b7280;margin-top:4px">' + (summary.warnings > 0 ? summary.warnings + ' warning' + (summary.warnings !== 1 ? 's' : '') + ' also need review. ' : '') + 'See detailed results below.</div></div>' +
      '</div>'
    : '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:flex-start;gap:14px">' +
        '<div style="font-size:28px;line-height:1">&#127881;</div>' +
        '<div><div style="font-size:15px;font-weight:700;color:#059669">All Tests Passed!</div>' +
        '<div style="font-size:13px;color:#6b7280;margin-top:4px">No failures detected in this test run.</div></div>' +
      '</div>';

  // Inline donut chart data for the script
  const chartData = JSON.stringify({
    passed: summary.passed,
    failed: summary.failed,
    warnings: summary.warnings,
    skipped: summary.skipped,
    passRate: summary.passRate
  });

  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>Test Report - ' + esc(pageTitle || url) + '</title>\n' +
'<style>\n' +
'*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f3f4f6;color:#111827}\n' +
'.header{background:linear-gradient(135deg,#1e1b4b,#312e81,#4338ca);color:#fff;padding:28px 36px}\n' +
'.header h1{margin:0 0 6px;font-size:22px;font-weight:800}\n' +
'.header p{margin:0;font-size:13px;opacity:.75}\n' +
'.header a{color:#a5b4fc}\n' +
'.container{max-width:1100px;margin:0 auto;padding:24px 20px}\n' +
'.stat-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px}\n' +
'.stat-box{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center}\n' +
'.stat-num{font-size:30px;font-weight:800;margin-bottom:4px}\n' +
'.stat-label{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em}\n' +
'.two-col{display:grid;grid-template-columns:1fr 250px;gap:20px;margin-bottom:20px}\n' +
'.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px}\n' +
'.card-header{padding:14px 18px;border-bottom:1px solid #e5e7eb;background:#f9fafb}\n' +
'.card-header h2{margin:0;font-size:14px;font-weight:700;color:#111827}\n' +
'.card-body{padding:18px}\n' +
'@media(max-width:700px){.stat-grid{grid-template-columns:repeat(2,1fr)}.two-col{grid-template-columns:1fr}}\n' +
'/* Filter buttons */\n' +
'.filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}\n' +
'.filter-btn{padding:5px 14px;border-radius:20px;border:1px solid #e5e7eb;background:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}\n' +
'.filter-btn.active{background:#4f46e5;color:#fff;border-color:#4f46e5}\n' +
'.filter-btn:hover{border-color:#4f46e5;color:#4f46e5}\n' +
'tr.hidden{display:none}\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +

'<div class="header">\n' +
'<h1>&#129514; Automated Test Report</h1>\n' +
'<p><strong>' + esc(pageTitle || 'Untitled Page') + '</strong> &nbsp;&middot;&nbsp; <a href="' + esc(url) + '" target="_blank">' + esc(url) + '</a> &nbsp;&middot;&nbsp; Generated ' + esc(now) + '</p>\n' +
'</div>\n' +

'<div class="container">\n' +

banner +

'<div class="stat-grid">\n' +
'<div class="stat-box"><div class="stat-num" style="color:#4f46e5">' + summary.total + '</div><div class="stat-label">Total Tests</div></div>\n' +
'<div class="stat-box"><div class="stat-num" style="color:#10b981">' + summary.passed + '</div><div class="stat-label">Passed</div></div>\n' +
'<div class="stat-box"><div class="stat-num" style="color:#ef4444">' + summary.failed + '</div><div class="stat-label">Failed</div></div>\n' +
'<div class="stat-box"><div class="stat-num" style="color:#f59e0b">' + summary.warnings + '</div><div class="stat-label">Warnings</div></div>\n' +
'<div class="stat-box"><div class="stat-num" style="color:#6b7280">' + summary.skipped + '</div><div class="stat-label">Skipped</div></div>\n' +
'</div>\n' +

'<div class="two-col">\n' +

'<div class="card">\n' +
'<div class="card-header"><h2>Elements Found on Page</h2></div>\n' +
'<div style="padding:4px 0">' + elementRows +
'<div style="padding:10px 14px;font-size:13px;font-weight:700;color:#374151;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between"><span>Total Testable Elements</span><span>' + summary.elementCount + '</span></div>' +
'</div></div>\n' +

'<div>\n' +
'<div class="card" style="padding:20px;text-align:center;margin-bottom:14px">\n' +
'<div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px">Pass Rate</div>\n' +
'<canvas id="donut" width="120" height="120" style="display:block;margin:0 auto 12px"></canvas>\n' +
'<div style="display:flex;flex-direction:column;gap:5px;font-size:12px;text-align:left">\n' +
'<div style="display:flex;align-items:center;gap:7px"><span style="width:10px;height:10px;border-radius:2px;background:#10b981;display:inline-block"></span>Passed (' + summary.passed + ')</div>\n' +
'<div style="display:flex;align-items:center;gap:7px"><span style="width:10px;height:10px;border-radius:2px;background:#ef4444;display:inline-block"></span>Failed (' + summary.failed + ')</div>\n' +
'<div style="display:flex;align-items:center;gap:7px"><span style="width:10px;height:10px;border-radius:2px;background:#f59e0b;display:inline-block"></span>Warnings (' + summary.warnings + ')</div>\n' +
'<div style="display:flex;align-items:center;gap:7px"><span style="width:10px;height:10px;border-radius:2px;background:#9ca3af;display:inline-block"></span>Skipped (' + summary.skipped + ')</div>\n' +
'</div></div>\n' +

'<div class="card" style="padding:16px">\n' +
'<div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Run Info</div>\n' +
'<div style="font-size:13px;display:flex;flex-direction:column;gap:7px">\n' +
'<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Duration</span><strong>' + (summary.duration/1000).toFixed(1) + 's</strong></div>\n' +
'<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Elements</span><strong>' + summary.elementCount + '</strong></div>\n' +
'<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Categories</span><strong>' + summary.categories.length + '</strong></div>\n' +
'<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Pass Rate</span><strong style="color:' + (summary.passRate >= 80 ? '#10b981' : summary.passRate >= 50 ? '#f59e0b' : '#ef4444') + '">' + summary.passRate + '%</strong></div>\n' +
'</div></div>\n' +
'</div>\n' + // end right col
'</div>\n' + // end two-col

'<div class="card">\n' +
'<div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">\n' +
'<h2>Detailed Test Results</h2>\n' +
'<div class="filter-bar" id="filter-bar" style="margin-bottom:0">\n' +
'<button class="filter-btn active" onclick="filterResults(\'ALL\',this)">All (' + summary.total + ')</button>\n' +
'<button class="filter-btn" onclick="filterResults(\'FAIL\',this)" style="color:#dc2626">Failures (' + summary.failed + ')</button>\n' +
'<button class="filter-btn" onclick="filterResults(\'WARN\',this)" style="color:#d97706">Warnings (' + summary.warnings + ')</button>\n' +
'<button class="filter-btn" onclick="filterResults(\'PASS\',this)" style="color:#059669">Passed (' + summary.passed + ')</button>\n' +
'<button class="filter-btn" onclick="filterResults(\'Security\',this)">Security</button>\n' +
'</div>\n' +
'</div>\n' +
'<div class="card-body">\n' +
categorySections +
'</div></div>\n' +

screenshotSection +

'</div>\n' + // end container

'<div style="text-align:center;padding:20px;font-size:12px;color:#9ca3af">Generated by <strong>WebTester Pro</strong> — Automated QA Testing</div>\n' +

'<script>\n' +
'// Donut chart\n' +
'(function(){\n' +
'  var d = ' + chartData + ';\n' +
'  var canvas = document.getElementById("donut");\n' +
'  if (!canvas) return;\n' +
'  var ctx = canvas.getContext("2d");\n' +
'  var vals = [d.passed, d.failed, d.warnings, d.skipped];\n' +
'  var cols = ["#10b981","#ef4444","#f59e0b","#9ca3af"];\n' +
'  var total = vals.reduce(function(a,b){return a+b;},0);\n' +
'  var start = -Math.PI/2;\n' +
'  var cx=60, cy=60, r=52, inner=33;\n' +
'  if(total===0){ctx.beginPath();ctx.arc(cx,cy,r,0,2*Math.PI);ctx.fillStyle="#e5e7eb";ctx.fill();}\n' +
'  else{\n' +
'    vals.forEach(function(val,i){\n' +
'      if(!val)return;\n' +
'      var slice=(val/total)*2*Math.PI;\n' +
'      ctx.beginPath();ctx.moveTo(cx,cy);\n' +
'      ctx.arc(cx,cy,r,start,start+slice);\n' +
'      ctx.fillStyle=cols[i];ctx.fill();\n' +
'      start+=slice;\n' +
'    });\n' +
'  }\n' +
'  ctx.beginPath();ctx.arc(cx,cy,inner,0,2*Math.PI);ctx.fillStyle="#f9fafb";ctx.fill();\n' +
'  ctx.fillStyle="#111827";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";\n' +
'  ctx.fillText(d.passRate+"%",cx,cy);\n' +
'})();\n' +
'\n' +
'// Filter rows\n' +
'function filterResults(filter, btn) {\n' +
'  document.querySelectorAll(".filter-btn").forEach(function(b){b.classList.remove("active");});\n' +
'  btn.classList.add("active");\n' +
'  var rows = document.querySelectorAll("tbody tr");\n' +
'  rows.forEach(function(row){\n' +
'    if(filter==="ALL"){row.classList.remove("hidden");return;}\n' +
'    if(filter==="Security"){\n' +
'      var section = row.closest("div[style*=\'margin-bottom:28px\']");\n' +
'      var header = section ? section.querySelector("div div") : null;\n' +
'      var isSecCat = header && header.textContent.indexOf("Security")>=0;\n' +
'      row.classList.toggle("hidden", !isSecCat);\n' +
'      return;\n' +
'    }\n' +
'    var statusCell = row.querySelector("td:nth-child(4) span");\n' +
'    var status = statusCell ? statusCell.textContent.trim() : "";\n' +
'    row.classList.toggle("hidden", status !== filter);\n' +
'  });\n' +
'}\n' +
'</script>\n' +
'</body>\n</html>';
}

module.exports = { generateReport };
