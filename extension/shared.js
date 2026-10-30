// Shared by the popup and the background worker.
var SARA_API = 'https://muazajmal212.app.n8n.cloud/webhook/sara-portal';
var SARA_DASHBOARD = 'https://voice-receptionist-puce.vercel.app/dashboard.html';

function saraPost(body) {
  var ctrl = new AbortController();
  var t = setTimeout(function () { ctrl.abort(); }, 30000);
  return fetch(SARA_API, { method: 'POST', body: new URLSearchParams(body), signal: ctrl.signal })
    .then(function (r) {
      clearTimeout(t);
      return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; });
    });
}

function saraKey(a) { return a.type + '|' + a.id + '|' + a.at; }

var SARA_LABEL = { appointment: 'Appointment booked', ticket: 'New ticket', transfer: 'Transfer', callback: 'Callback requested' };
