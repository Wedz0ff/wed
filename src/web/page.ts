import { PRESS_START_2P_WOFF2_BASE64 } from './font';

export function renderPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>wed</title>
<style>
@font-face {
  font-family: 'WedPixel';
  src: url(data:font/woff2;base64,${PRESS_START_2P_WOFF2_BASE64}) format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
:root {
  --wed-background: #0a0e14;
  --wed-foreground: #c9d1d9;
  --wed-primary: #00f0ff;
  --wed-secondary: #ff2d95;
  --wed-info: #3dff9a;
  --wed-warning: #f5c518;
  --wed-error: #ff4d6d;
  --wed-muted: #5b6470;
  --wed-debug: #7aa2f7;
  --wed-success: #3dff9a;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  height: 100%;
  background: var(--wed-background);
  color: var(--wed-foreground);
  font-family: 'WedPixel', monospace;
  font-size: 10px;
  line-height: 1.6;
}
body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}
.window {
  border: 4px double var(--wed-primary);
  background: var(--wed-background);
  padding: 10px 12px;
}
.window-title {
  color: var(--wed-secondary);
  margin-bottom: 8px;
  letter-spacing: 1px;
}
#header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
#cmdline {
  color: var(--wed-foreground);
  word-break: break-all;
}
#status-row {
  color: var(--wed-muted);
  white-space: nowrap;
}
#status[data-status="RUNNING"] { color: var(--wed-success); }
#status[data-status="PAUSED"] { color: var(--wed-warning); }
#status[data-status="FAILED"] { color: var(--wed-error); }
#controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
label { color: var(--wed-foreground); }
input[type="text"] {
  background: var(--wed-background);
  color: var(--wed-foreground);
  border: 4px double var(--wed-muted);
  font-family: inherit;
  font-size: inherit;
  padding: 4px 6px;
  min-width: 140px;
}
button, .level {
  background: var(--wed-background);
  color: var(--wed-primary);
  border: 4px double var(--wed-primary);
  font-family: inherit;
  font-size: inherit;
  padding: 4px 8px;
  cursor: pointer;
}
.level[data-active="true"] {
  color: var(--wed-background);
  background: var(--wed-primary);
}
#copy-status { color: var(--wed-warning); }
#log-window {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
#log-list {
  flex: 1;
  overflow: auto;
  min-height: 120px;
}
.log-row {
  display: grid;
  grid-template-columns: 12ch 7ch 1fr;
  gap: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}
.log-row .ts { color: var(--wed-muted); }
.log-row[data-level="debug"] .lvl { color: var(--wed-debug); }
.log-row[data-level="info"] .lvl { color: var(--wed-info); }
.log-row[data-level="warn"] .lvl { color: var(--wed-warning); }
.log-row[data-level="error"] .lvl { color: var(--wed-error); }
.log-row.current { outline: 2px solid var(--wed-secondary); }
mark {
  background: var(--wed-secondary);
  color: var(--wed-background);
}
</style>
</head>
<body>
  <div class="window" id="header-window">
    <div class="window-title">COMMAND</div>
    <div id="header">
      <div id="cmdline"></div>
      <div id="status-row">
        <span id="mascot"></span>
        <span id="status"></span>
      </div>
    </div>
  </div>
  <div class="window" id="controls">
    <label><input type="checkbox" id="follow" checked> Follow</label>
    <input type="text" id="filter" placeholder="filter" aria-label="filter">
    <button type="button" class="level" data-level="all">ALL</button>
    <button type="button" class="level" data-level="debug">DEBUG</button>
    <button type="button" class="level" data-level="info">INFO</button>
    <button type="button" class="level" data-level="warn">WARN</button>
    <button type="button" class="level" data-level="error">ERROR</button>
    <label>Search <input type="text" id="search" aria-label="Search"></label>
    <button type="button" id="prev">Prev</button>
    <button type="button" id="next">Next</button>
    <button type="button" id="copy">Copy</button>
    <span id="copy-status"></span>
  </div>
  <div class="window" id="log-window">
    <div class="window-title">LOGS</div>
    <div id="log-list"></div>
  </div>
<script>
(function () {
  var MASCOT = {
    RUNNING: '(•‿•)',
    PAUSED: '(-‿-)z',
    FAILED: '(>=A<=)',
    EXITED: '(x_x)',
    STARTING: '(·ω·)',
    TERMINATING: '(o_o)'
  };
  var logs = [];
  var seen = {};
  var lastId = 0;
  var status = 'STARTING';
  var command = '';
  var args = [];
  var follow = true;
  var filterQuery = '';
  var filterLevel = 'all';
  var searchQuery = '';
  var searchIndex = 0;
  var source = null;

  function $(id) { return document.getElementById(id); }

  function applyTheme(theme) {
    var root = document.documentElement.style;
    root.setProperty('--wed-background', theme.background);
    root.setProperty('--wed-foreground', theme.foreground);
    root.setProperty('--wed-primary', theme.primary);
    root.setProperty('--wed-secondary', theme.secondary);
    root.setProperty('--wed-info', theme.info);
    root.setProperty('--wed-warning', theme.warning);
    root.setProperty('--wed-error', theme.error);
    root.setProperty('--wed-muted', theme.muted);
    root.setProperty('--wed-debug', theme.debug);
    root.setProperty('--wed-success', theme.success);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlight(text, query) {
    var q = query.trim();
    if (!q) return escapeHtml(text);
    var lower = text.toLowerCase();
    var qLower = q.toLowerCase();
    var out = '';
    var i = 0;
    while (i < text.length) {
      var hit = lower.indexOf(qLower, i);
      if (hit === -1) {
        out += escapeHtml(text.slice(i));
        break;
      }
      out += escapeHtml(text.slice(i, hit));
      out += '<mark>' + escapeHtml(text.slice(hit, hit + q.length)) + '</mark>';
      i = hit + q.length;
    }
    return out;
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString();
    } catch (e) {
      return String(ts);
    }
  }

  function visibleLogs() {
    var q = filterQuery.trim().toLowerCase();
    var out = [];
    for (var i = 0; i < logs.length; i++) {
      var entry = logs[i];
      if (filterLevel !== 'all' && entry.level !== filterLevel) continue;
      if (q && entry.message.toLowerCase().indexOf(q) === -1) continue;
      out.push(entry);
    }
    return out;
  }

  function matchIndexes(rows, query) {
    var q = query.trim().toLowerCase();
    var idx = [];
    if (!q) return idx;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].message.toLowerCase().indexOf(q) !== -1) idx.push(i);
    }
    return idx;
  }

  function render() {
    $('cmdline').textContent = [command].concat(args).join(' ');
    $('mascot').textContent = MASCOT[status] || MASCOT.RUNNING;
    $('status').textContent = ' ' + status;
    $('status').setAttribute('data-status', status);
    var rows = visibleLogs();
    var hits = matchIndexes(rows, searchQuery);
    if (hits.length === 0) searchIndex = 0;
    else if (searchIndex >= hits.length) searchIndex = 0;
    else if (searchIndex < 0) searchIndex = hits.length - 1;
    var current = hits.length ? hits[searchIndex] : -1;
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var entry = rows[i];
      var cls = 'log-row' + (i === current ? ' current' : '');
      var msg = searchQuery.trim()
        ? highlight(entry.message, searchQuery)
        : escapeHtml(entry.message);
      html += '<div class="' + cls + '" data-level="' + escapeHtml(entry.level) + '">';
      html += '<span class="ts">' + escapeHtml(formatTime(entry.timestamp)) + '</span>';
      html += '<span class="lvl">' + escapeHtml(entry.level) + '</span>';
      html += '<span class="msg">' + msg + '</span></div>';
    }
    var list = $('log-list');
    list.innerHTML = html;
    if (follow) list.scrollTop = list.scrollHeight;
    var levels = document.querySelectorAll('.level');
    for (var j = 0; j < levels.length; j++) {
      var btn = levels[j];
      btn.setAttribute(
        'data-active',
        btn.getAttribute('data-level') === filterLevel ? 'true' : 'false',
      );
    }
  }

  function addLog(entry) {
    if (!entry || seen[entry.id]) return;
    seen[entry.id] = true;
    logs.push(entry);
    if (entry.id > lastId) lastId = entry.id;
  }

  function connect() {
    if (source) {
      source.onerror = null;
      source.close();
    }
    source = new EventSource('/api/events?afterId=' + lastId);
    source.addEventListener('log', function (ev) {
      addLog(JSON.parse(ev.data));
      render();
    });
    source.addEventListener('status', function (ev) {
      var data = JSON.parse(ev.data);
      status = data.status;
      render();
    });
    source.addEventListener('cleared', function () {
      logs = [];
      seen = {};
      lastId = 0;
      render();
    });
    source.addEventListener('theme', function (ev) {
      applyTheme(JSON.parse(ev.data));
    });
    source.onerror = function () {
      source.close();
      source = null;
      setTimeout(connect, 500);
    };
  }

  function cycleSearch(dir) {
    var hits = matchIndexes(visibleLogs(), searchQuery);
    if (!hits.length) return;
    searchIndex = (searchIndex + dir + hits.length) % hits.length;
    follow = false;
    $('follow').checked = false;
    render();
    var current = document.querySelector('.log-row.current');
    if (current) current.scrollIntoView({ block: 'nearest' });
  }

  $('follow').addEventListener('change', function (ev) {
    follow = ev.target.checked;
    if (follow) render();
  });
  $('filter').addEventListener('input', function (ev) {
    filterQuery = ev.target.value;
    render();
  });
  document.querySelectorAll('.level').forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterLevel = btn.getAttribute('data-level') || 'all';
      render();
    });
  });
  $('search').addEventListener('input', function (ev) {
    searchQuery = ev.target.value;
    searchIndex = 0;
    render();
  });
  $('prev').addEventListener('click', function () { cycleSearch(-1); });
  $('next').addEventListener('click', function () { cycleSearch(1); });
  $('copy').addEventListener('click', function () {
    var lines = visibleLogs().map(function (entry) {
      var time;
      try { time = new Date(entry.timestamp).toISOString(); }
      catch (e) { time = String(entry.timestamp); }
      return time + ' ' + entry.level + ' ' + entry.message;
    }).join('\\n');
    navigator.clipboard.writeText(lines).then(function () {
      $('copy-status').textContent = 'copied';
    }).catch(function () {
      $('copy-status').textContent = 'copy failed';
    });
  });

  fetch('/api/snapshot').then(function (res) { return res.json(); }).then(function (snap) {
    command = snap.command || '';
    args = snap.args || [];
    status = snap.status || status;
    if (snap.theme) applyTheme(snap.theme);
    var initial = snap.logs || [];
    for (var i = 0; i < initial.length; i++) addLog(initial[i]);
    render();
    connect();
  });
})();
</script>
</body>
</html>`;
}
