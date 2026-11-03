/* Sara settings editor: the business details, opening hours, holidays and FAQs Sara uses on calls.
   Shared by admin.html (owner) and dashboard.html (each business). No network code here:
   the page loads settings, calls SaraSettings.mount(el, settings) and later SaraSettings.read(). */
(function () {
  'use strict';
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var FIELDS = [
    { k: 'business_name', label: 'Business name', req: true },
    { k: 'phone_number', label: 'Business phone', hint: 'Shown to callers who ask for your number.' },
    { k: 'address', label: 'Address', wide: true },
    { k: 'timezone', label: 'Time zone', type: 'tz' },
    { k: 'hours', label: 'Hours in words', hint: 'How Sara describes your hours, e.g. "Mon–Fri 8am–6pm, Sat 9am–2pm".', wide: true },
    { k: 'services_offered', label: 'Services and prices', type: 'area', wide: true },
    { k: 'booking_policy', label: 'Booking policy', type: 'area' },
    { k: 'cancellation_policy', label: 'Cancellation policy', type: 'area' },
    { k: 'escalation_phone', label: 'Transfer calls to', hint: 'The number Sara transfers urgent calls to.' },
    { k: 'escalation_email', label: 'Alerts email', hint: 'Where tickets and callback requests are emailed.' },
    { k: 'greeting_script', label: 'Greeting', type: 'area', wide: true, hint: 'The first thing Sara says when she answers.' }
  ];
  var TZ = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
    'America/Toronto', 'America/Vancouver', 'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Istanbul',
    'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'Africa/Johannesburg', 'Africa/Lagos'];

  var css = [
    '.se{display:block}',
    '.se-sec{margin-top:26px;padding:22px 22px 20px;border-radius:22px;background:var(--card);border:1px solid var(--line)}',
    '.se-sec:first-child{margin-top:0}',
    '.se-sec h2{font-family:var(--display);font-weight:800;font-size:20px;letter-spacing:-0.01em}',
    '.se-sec>p{color:var(--muted);font-size:14.5px;margin:4px 0 16px}',
    '.se-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 18px}',
    '.se-f.wide{grid-column:1/-1}',
    '.se-f label{margin-bottom:6px}',
    '.se-f small{display:block;color:var(--dim);font-size:13px;margin-top:5px}',
    '.se .field{padding:11px 14px;font-size:15px;border-radius:12px}',
    '.se textarea.field{min-height:84px;resize:vertical;line-height:1.45}',
    '.se select.field{appearance:auto}',
    '.se input[type=time].field,.se input[type=date].field{color-scheme:dark}',
    '.se-day{display:grid;grid-template-columns:120px 110px minmax(0,1fr);align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)}',
    '.se-day:first-of-type{border-top:0}',
    '.se-day b{font-size:15px}',
    '.se-times{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.se-times span{color:var(--dim);font-size:14px}',
    '.se-times .field{width:132px}',
    '.se-closed{color:var(--dim);font-size:14.5px}',
    '.se-tog{display:inline-flex;align-items:center;gap:8px;font-size:14.5px;font-weight:600;cursor:pointer;margin:0}',
    '.se-tog input{width:18px;height:18px;accent-color:var(--gold-deep)}',
    '.se-row{display:grid;gap:10px;padding:14px;border-radius:16px;background:var(--card-2);border:1px solid var(--line);margin-bottom:10px;position:relative}',
    '.se-hol{grid-template-columns:160px minmax(0,1fr) auto}',
    '.se-hol .se-times{grid-column:1/-1}',
    '.se-faq{grid-template-columns:minmax(0,1fr) auto}',
    '.se-faq textarea{grid-column:1/-1}',
    '.se-x{width:36px;height:36px;border-radius:10px;border:1px solid var(--line-strong);background:none;color:var(--muted);cursor:pointer;font-size:18px;line-height:1}',
    '.se-x:hover{color:#ff9b9b;border-color:rgba(239,107,107,0.5)}',
    '.se-add{margin-top:4px}',
    '.se-none{color:var(--dim);font-size:14.5px;padding:6px 0 12px}',
    '.se .bad{border-color:rgba(239,107,107,0.8)!important;box-shadow:0 0 0 3px rgba(239,107,107,0.15)}',
    '@media (max-width:640px){.se-sec{padding:18px 16px}.se-grid{grid-template-columns:1fr}.se-day{grid-template-columns:1fr auto}.se-day .se-times,.se-day .se-closed{grid-column:1/-1}',
    '.se-hol{grid-template-columns:1fr auto}.se-hol .se-hname{grid-column:1/-1;order:3}.se-day .se-times{flex-wrap:nowrap}.se-day .se-times .field{flex:1 1 0;width:auto;min-width:0;padding:11px 10px}.se-hhours .field{width:128px;padding:11px 10px}}'
  ].join('\n');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  var uid = 0;
  function id(p) { uid += 1; return 'se-' + p + '-' + uid; }

  var root = null, extra = {};

  function injectCss() {
    if (document.getElementById('se-css')) return;
    var s = document.createElement('style'); s.id = 'se-css'; s.textContent = css; document.head.appendChild(s);
  }

  function fieldHtml(f, val) {
    var i = id(f.k), input;
    if (f.type === 'area') input = '<textarea class="field" id="' + i + '" data-k="' + f.k + '" maxlength="1500">' + esc(val) + '</textarea>';
    else if (f.type === 'tz') {
      var opts = TZ.slice(); if (val && opts.indexOf(val) < 0) opts.unshift(val);
      input = '<select class="field" id="' + i + '" data-k="' + f.k + '"><option value="">Choose…</option>' + opts.map(function (z) { return '<option' + (z === val ? ' selected' : '') + '>' + esc(z) + '</option>'; }).join('') + '</select>';
    } else input = '<input class="field" id="' + i + '" data-k="' + f.k + '" maxlength="' + (f.k === 'business_name' ? 120 : 300) + '" value="' + esc(val) + '"' + (f.req ? ' required' : '') + '>';
    return '<div class="se-f' + (f.wide ? ' wide' : '') + '"><label for="' + i + '">' + esc(f.label) + (f.req ? ' *' : '') + '</label>' + input + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</div>';
  }

  function dayHtml(d, h) {
    var open = h && !h.closed && h.open && h.close;
    var t = id('d');
    return '<div class="se-day" data-day="' + d + '"><b>' + d + '</b>' +
      '<label class="se-tog" for="' + t + '"><input type="checkbox" id="' + t + '" class="se-open"' + (open ? ' checked' : '') + '> Open</label>' +
      '<div class="se-times"' + (open ? '' : ' hidden') + '><input class="field se-o" type="time" aria-label="' + d + ' opens" value="' + esc(open ? h.open : '09:00') + '"><span>to</span>' +
      '<input class="field se-c" type="time" aria-label="' + d + ' closes" value="' + esc(open ? h.close : '17:00') + '"></div>' +
      '<div class="se-closed"' + (open ? ' hidden' : '') + '>Closed</div></div>';
  }

  function holHtml(h) {
    h = h || { date: '', name: '', closed_all_day: true, open: '', close: '' };
    var t = id('h');
    return '<div class="se-row se-hol"><input class="field se-hd" type="date" aria-label="Date" value="' + esc(h.date) + '">' +
      '<input class="field se-hn se-hname" aria-label="Holiday name" placeholder="e.g. Christmas Day" maxlength="80" value="' + esc(h.name) + '">' +
      '<button type="button" class="se-x" aria-label="Remove this holiday">×</button>' +
      '<div class="se-times"><label class="se-tog" for="' + t + '"><input type="checkbox" id="' + t + '" class="se-hc"' + (h.closed_all_day ? ' checked' : '') + '> Closed all day</label>' +
      '<span class="se-hhours"' + (h.closed_all_day ? ' hidden' : '') + '> · open <input class="field se-ho" type="time" aria-label="Opens" value="' + esc(h.open || '10:00') + '"> to <input class="field se-hcl" type="time" aria-label="Closes" value="' + esc(h.close || '14:00') + '"></span></div></div>';
  }

  function faqHtml(f) {
    f = f || { question: '', answer: '' };
    return '<div class="se-row se-faq"><input class="field se-q" aria-label="Question" placeholder="Question, e.g. Do you have parking?" maxlength="300" value="' + esc(f.question) + '">' +
      '<button type="button" class="se-x" aria-label="Remove this question">×</button>' +
      '<textarea class="field se-a" aria-label="Answer" placeholder="The answer Sara should give" maxlength="1500">' + esc(f.answer) + '</textarea></div>';
  }

  function emptyNote(list, text) {
    var has = list.querySelector('.se-row');
    var n = list.querySelector('.se-none');
    if (!has && !n) list.insertAdjacentHTML('afterbegin', '<p class="se-none">' + esc(text) + '</p>');
    if (has && n) n.remove();
  }

  function mount(container, s) {
    injectCss();
    s = s || {};
    var bi = s.business_info || {};
    extra = {};
    Object.keys(bi).forEach(function (k) { if (!FIELDS.some(function (f) { return f.k === k; })) extra[k] = bi[k]; });
    var hoursByDay = {};
    (s.hours || []).forEach(function (h) { hoursByDay[h.day] = h; });
    var otherKeys = Object.keys(extra);
    container.innerHTML =
      '<div class="se">' +
      '<section class="se-sec"><h2>Business details</h2><p>What Sara tells callers about the business.</p><div class="se-grid">' +
      FIELDS.map(function (f) { return fieldHtml(f, bi[f.k] || ''); }).join('') +
      otherKeys.map(function (k) { return fieldHtml({ k: k, label: k.replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }), wide: true }, extra[k]); }).join('') +
      '</div></section>' +
      '<section class="se-sec"><h2>Opening hours</h2><p>Sara checks these when someone asks if you\'re open, and only books inside them.</p><div class="se-days">' +
      DAYS.map(function (d) { return dayHtml(d, hoursByDay[d]); }).join('') + '</div></section>' +
      '<section class="se-sec"><h2>Holidays and special days</h2><p>Days you\'re closed or keep different hours. These override the weekly hours.</p><div class="se-list" id="se-hols">' +
      (s.holidays || []).map(holHtml).join('') + '</div><button type="button" class="btn small se-add" id="se-add-hol">+ Add a day</button></section>' +
      '<section class="se-sec"><h2>Questions callers ask</h2><p>Sara answers from these. If a question isn\'t here, she offers a callback instead of guessing.</p><div class="se-list" id="se-faqs">' +
      (s.faqs || []).map(faqHtml).join('') + '</div><button type="button" class="btn small se-add" id="se-add-faq">+ Add a question</button></section>' +
      '</div>';
    root = container.querySelector('.se');
    var hols = root.querySelector('#se-hols'), faqs = root.querySelector('#se-faqs');
    emptyNote(hols, 'No holidays added.'); emptyNote(faqs, 'No questions yet. Add the ones callers ask most.');
    root.querySelector('#se-add-hol').addEventListener('click', function () { var r = el(holHtml()); hols.appendChild(r); emptyNote(hols, 'No holidays added.'); r.querySelector('.se-hd').focus(); });
    root.querySelector('#se-add-faq').addEventListener('click', function () { var r = el(faqHtml()); faqs.appendChild(r); emptyNote(faqs, ''); r.querySelector('.se-q').focus(); });
    root.addEventListener('click', function (ev) {
      var x = ev.target.closest('.se-x'); if (!x) return;
      var list = x.closest('.se-list'); x.closest('.se-row').remove();
      emptyNote(list, list.id === 'se-hols' ? 'No holidays added.' : 'No questions yet. Add the ones callers ask most.');
    });
    root.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.classList.contains('se-open')) { var d = t.closest('.se-day'); d.querySelector('.se-times').hidden = !t.checked; d.querySelector('.se-closed').hidden = t.checked; }
      if (t.classList.contains('se-hc')) t.closest('.se-row').querySelector('.se-hhours').hidden = t.checked;
    });
    root.addEventListener('input', function (ev) { ev.target.classList.remove('bad'); });
  }

  function mins(t) { var p = String(t).split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function okTime(t) { return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t || ''); }
  function fail(node, msg) { if (node) { node.classList.add('bad'); node.focus(); } return { error: msg }; }

  // Returns { settings } or { error } (and highlights the field to fix).
  function read() {
    if (!root) return { error: 'Settings are still loading.' };
    root.querySelectorAll('.bad').forEach(function (n) { n.classList.remove('bad'); });
    var bi = {};
    root.querySelectorAll('.se-grid [data-k]').forEach(function (n) { bi[n.getAttribute('data-k')] = n.value.trim(); });
    if (!bi.business_name) return fail(root.querySelector('[data-k="business_name"]'), 'Business name is required.');
    var hours = [];
    var days = root.querySelectorAll('.se-day');
    for (var i = 0; i < days.length; i++) {
      var d = days[i], day = d.getAttribute('data-day');
      if (!d.querySelector('.se-open').checked) { hours.push({ day: day, closed: true, open: 'Closed', close: 'Closed' }); continue; }
      var o = d.querySelector('.se-o'), c = d.querySelector('.se-c');
      if (!okTime(o.value)) return fail(o, day + ': enter an opening time.');
      if (!okTime(c.value)) return fail(c, day + ': enter a closing time.');
      if (mins(c.value) <= mins(o.value)) return fail(c, day + ': closing time must be after opening time.');
      hours.push({ day: day, open: o.value, close: c.value });
    }
    var holidays = [], rows = root.querySelectorAll('.se-hol');
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j], date = r.querySelector('.se-hd'), name = r.querySelector('.se-hn').value.trim(), closed = r.querySelector('.se-hc').checked;
      if (!date.value && !name) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return fail(date, (name || 'Holiday') + ': pick a date.');
      var ho = r.querySelector('.se-ho'), hc = r.querySelector('.se-hcl');
      if (!closed && (!okTime(ho.value) || !okTime(hc.value) || mins(hc.value) <= mins(ho.value))) return fail(ho, (name || date.value) + ': enter the special opening hours, or tick "Closed all day".');
      holidays.push({ date: date.value, name: name || 'Holiday', closed_all_day: closed, open: closed ? '' : ho.value, close: closed ? '' : hc.value });
    }
    var faqs = [], fr = root.querySelectorAll('.se-faq');
    for (var k = 0; k < fr.length; k++) {
      var q = fr[k].querySelector('.se-q'), a = fr[k].querySelector('.se-a');
      if (!q.value.trim() && !a.value.trim()) continue;
      if (!q.value.trim()) return fail(q, 'This answer needs its question.');
      if (!a.value.trim()) return fail(a, 'This question needs an answer.');
      faqs.push({ question: q.value.trim(), answer: a.value.trim() });
    }
    return { settings: { business_info: bi, hours: hours, holidays: holidays, faqs: faqs } };
  }

  window.SaraSettings = { mount: mount, read: read };
})();
