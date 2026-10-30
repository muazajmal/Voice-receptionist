// Checks for new activity every minute, shows a badge count and a desktop notification.
importScripts('shared.js');

chrome.runtime.onInstalled.addListener(function () {
  chrome.alarms.create('sara-poll', { periodInMinutes: 1 });
  chrome.action.setBadgeBackgroundColor({ color: '#d9a65a' });
});
chrome.runtime.onStartup.addListener(function () {
  chrome.alarms.create('sara-poll', { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'sara-poll') poll();
});
chrome.runtime.onMessage.addListener(function (msg) {
  if (msg && msg.type === 'sara-seen') chrome.action.setBadgeText({ text: '' });
  if (msg && msg.type === 'sara-poll') poll();
});
chrome.notifications.onClicked.addListener(function () {
  chrome.tabs.create({ url: SARA_DASHBOARD });
});

function poll() {
  chrome.storage.local.get(['token', 'seen', 'unread', 'notify'], function (st) {
    if (!st.token) { chrome.action.setBadgeText({ text: '' }); return; }
    saraPost({ action: 'data', token: st.token }).then(function (j) {
      if (j._status === 401) {
        chrome.storage.local.remove(['token', 'data']);
        chrome.action.setBadgeText({ text: '' });
        return;
      }
      if (!j.ok) return;
      var seen = st.seen || null;
      var keys = (j.activity || []).map(saraKey);
      var fresh = seen ? (j.activity || []).filter(function (a) { return seen.indexOf(saraKey(a)) < 0; }) : [];
      var unread = (st.unread || 0) + fresh.length;
      chrome.storage.local.set({ data: j, seen: keys.slice(0, 400), unread: unread, checked_at: Date.now() });
      chrome.action.setBadgeBackgroundColor({ color: '#d9a65a' });
      chrome.action.setBadgeText({ text: unread ? String(Math.min(unread, 99)) : '' });
      if (fresh.length && st.notify !== false) {
        var a = fresh[0];
        chrome.notifications.create('sara-' + Date.now(), {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: fresh.length > 1 ? fresh.length + ' new calls handled by Sara' : (SARA_LABEL[a.type] || 'New activity') + (a.name ? ': ' + a.name : ''),
          message: fresh.length > 1 ? 'Latest: ' + (a.detail || '') : (a.detail || '') + (a.when_text ? ' (' + a.when_text + ')' : ''),
          priority: 1
        });
      }
    }).catch(function () { /* offline: try again next minute */ });
  });
}
