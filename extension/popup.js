(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KIND = { appointment: ['Appointment', '#7fd1ad'], ticket: ['Ticket', '#f0968a'], transfer: ['Transfer', '#b3a8f5'], callback: ['Callback', '#f0cd8f'] };
  var email = '';
  var lastSeen = [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ago(iso) {
    var t = Date.parse(iso); if (isNaN(t)) return '';
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 86400 * 30) return Math.floor(s / 86400) + 'd';
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  function msg(text, err) { $('si-msg').textContent = text || ''; $('si-msg').className = 'msg' + (err ? ' error' : ''); }

  // ---------- sign in ----------
  function showSignin(note) {
    $('feedview').hidden = true; $('refresh').hidden = true; $('signin').hidden = false;
    $('form-email').hidden = false; $('form-code').hidden = true;
    $('si-title').textContent = 'Sign in';
    $('si-lead').textContent = "Use the email your business signed up to Sara with. We'll email you a 6-digit code.";
    $('biz').textContent = 'Sara'; $('status').textContent = 'Live call feed'; $('status').className = '';
    $('si-email').value = email;
    msg(note || '');
    setTimeout(function () { $('si-email').focus(); }, 30);
  }
  function requestCode(btn) {
    var e = $('si-email').value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { msg('Please enter a valid email address.', true); return; }
    email = e; chrome.storage.local.set({ email: e });
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    saraPost({ action: 'request_code', email: e }).then(function (j) {
      if (btn) { btn.disabled = false; btn.textContent = 'Email me a code'; }
      if (j._status === 429) { msg('Too many tries. Please wait a few minutes.', true); return; }
      if (!j.ok) { msg("That didn't work. Check the email and try again.", true); return; }
      $('form-email').hidden = true; $('form-code').hidden = false;
      $('si-title').textContent = 'Check your email';
      $('si-lead').textContent = 'If ' + e + ' has a Sara account, a 6-digit code is on its way.';
      $('si-code').value = ''; msg('');
      setTimeout(function () { $('si-code').focus(); }, 30);
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Email me a code'; }
      msg("Couldn't reach Sara. Check your connection.", true);
    });
  }
  $('form-email').addEventListener('submit', function (ev) { ev.preventDefault(); requestCode(ev.target.querySelector('button')); });
  $('si-back').addEventListener('click', function () { showSignin(); });
  $('si-resend').addEventListener('click', function () { requestCode(null); msg('A new code is on its way.'); });
  $('si-code').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
    if (this.value.length === 6) $('form-code').requestSubmit();
  });
  $('form-code').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var code = $('si-code').value.replace(/\D/g, '');
    if (code.length !== 6) { msg('Enter the 6 digits from the email.', true); return; }
    var btn = ev.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Signing in…';
    saraPost({ action: 'verify', email: email, code: code }).then(function (j) {
      btn.disabled = false; btn.textContent = 'Sign in';
      if (j.ok && j.token) {
        chrome.storage.local.set({ token: j.token, seen: null, unread: 0 }, function () { showFeed(null); load(); });
        return;
      }
      msg(j.error === 'wrong_code' ? "That code isn't right." : j.error === 'too_many' ? 'Too many tries. Ask for a new code.' : 'That code has expired. Ask for a new one.', true);
      $('si-code').select();
    }).catch(function () { btn.disabled = false; btn.textContent = 'Sign in'; msg("Couldn't reach Sara. Please try again.", true); });
  });

  // ---------- feed ----------
  function showFeed(data) {
    $('signin').hidden = true; $('feedview').hidden = false; $('refresh').hidden = false;
    if (!data) { $('feed').innerHTML = '<li class="empty">Loading your activity…</li>'; return; }
    $('biz').textContent = data.business || 'Your business';
    var s = data.stats || {};
    $('s-upcoming').textContent = s.upcoming || 0; $('s-tickets').textContent = s.open_tickets || 0;
    $('s-xfers').textContent = s.transfers || 0; $('s-cbs').textContent = s.pending_callbacks || 0;
    var list = (data.activity || []).slice(0, 25);
    if (!list.length) { $('feed').innerHTML = '<li class="empty">No calls yet. New calls show up here.</li>'; return; }
    $('feed').innerHTML = list.map(function (a) {
      var k = KIND[a.type] || ['Activity', '#f0cd8f'];
      var isNew = lastSeen.length && lastSeen.indexOf(saraKey(a)) < 0;
      var when = a.type === 'appointment' && a.when_text ? 'For ' + a.when_text : a.type === 'callback' && a.when_text ? 'Call back: ' + a.when_text : '';
      var act = actionFor(a);
      var btn = act ? '<button class="act' + (act.undo ? ' undo' : '') + '" type="button" data-type="' + a.type + '" data-row="' + a.row + '" data-status="' + act.status + '">' + act.label + '</button>' : '';
      return '<li class="item' + (isNew ? ' new' : '') + (act && act.undo ? ' done' : '') + '" style="--k:' + k[1] + '"><span class="dot"></span><div class="body">' +
        '<div class="row1"><b>' + esc(a.name || 'Unknown caller') + '</b><time>' + ago(a.at) + '</time></div>' +
        '<span class="kind">' + k[0] + (a.status ? ' · ' + esc(a.status) : '') + '</span>' +
        '<p class="detail">' + esc(a.detail) + '</p>' + (when ? '<p class="when">' + esc(when) + '</p>' : '') + btn + '</div></li>';
    }).join('');
  }

  // ---------- mark done ----------
  var ACTIONS = {
    appointment: { done: 'completed', open: 'booked', label: 'Mark completed', from: ['booked', 'confirmed', ''] },
    ticket: { done: 'resolved', open: 'open', label: 'Mark resolved' },
    transfer: { done: 'done', open: 'pending', label: 'Mark handled' },
    callback: { done: 'done', open: 'pending', label: 'Mark called back' }
  };
  function actionFor(a) {
    var c = ACTIONS[a.type];
    if (!c || !(a.row >= 2)) return null;
    var st = String(a.status || '').toLowerCase();
    if (st === c.done) return { status: c.open, label: 'Reopen', undo: true };
    if (c.from && c.from.indexOf(st) < 0) return null;
    return { status: c.done, label: c.label };
  }
  $('feed').addEventListener('click', function (ev) {
    var b = ev.target.closest('.act');
    if (!b || b.disabled) return;
    b.disabled = true; b.textContent = 'Saving…';
    chrome.storage.local.get(['token'], function (st) {
      if (!st.token) { showSignin(); return; }
      saraPost({ action: 'set_status', token: st.token, type: b.getAttribute('data-type'), row: parseInt(b.getAttribute('data-row'), 10), status: b.getAttribute('data-status') }).then(function (j) {
        if (j._status === 401) { chrome.storage.local.remove(['token', 'data']); showSignin('Your session ended. Please sign in again.'); return; }
        if (!j.ok) throw new Error('bad');
        showFeed(j); setStatus(Date.now());
        chrome.storage.local.set({ data: j, checked_at: Date.now() });
      }).catch(function () {
        b.disabled = false; b.textContent = 'Try again';
        $('status').textContent = "Couldn't save that change"; $('status').className = '';
      });
    });
  });
  function setStatus(ts) {
    var el = $('status');
    if (!ts) { el.textContent = 'Live call feed'; el.className = ''; return; }
    var m = Math.round((Date.now() - ts) / 60000);
    el.textContent = 'Live · updated ' + (m < 1 ? 'just now' : m + ' min ago');
    el.className = 'live';
  }
  function load() {
    $('refresh').classList.add('spin');
    chrome.storage.local.get(['token', 'seen'], function (st) {
      if (!st.token) { $('refresh').classList.remove('spin'); showSignin(); return; }
      saraPost({ action: 'data', token: st.token }).then(function (j) {
        $('refresh').classList.remove('spin');
        if (j._status === 401) { chrome.storage.local.remove(['token', 'data']); showSignin('Your session ended. Please sign in again.'); return; }
        if (!j.ok) throw new Error('bad');
        lastSeen = st.seen || [];
        showFeed(j); setStatus(Date.now());
        chrome.storage.local.set({ data: j, seen: (j.activity || []).map(saraKey).slice(0, 400), unread: 0, checked_at: Date.now() });
        chrome.action.setBadgeText({ text: '' });
      }).catch(function () {
        $('refresh').classList.remove('spin');
        $('status').textContent = "Can't reach Sara right now"; $('status').className = '';
      });
    });
  }

  $('refresh').addEventListener('click', load);
  $('open-dash').href = SARA_DASHBOARD;
  $('notify').addEventListener('change', function () { chrome.storage.local.set({ notify: this.checked }); });
  $('signout').addEventListener('click', function () {
    chrome.storage.local.get(['token'], function (st) {
      if (st.token) saraPost({ action: 'sign_out', token: st.token }).catch(function () {});
      chrome.storage.local.remove(['token', 'data', 'seen', 'unread']);
      chrome.action.setBadgeText({ text: '' });
      showSignin();
    });
  });

  chrome.storage.local.get(['token', 'data', 'email', 'notify', 'checked_at', 'seen'], function (st) {
    email = st.email || '';
    $('notify').checked = st.notify !== false;
    chrome.runtime.sendMessage({ type: 'sara-seen' }).catch(function () {});
    if (!st.token) { showSignin(); return; }
    lastSeen = st.seen || [];
    showFeed(st.data || null);   // show the last snapshot instantly, then refresh
    if (st.checked_at) setStatus(st.checked_at);
    load();
  });
})();
