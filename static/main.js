// ── Constants ─────────────────────────────────────────────────────────────────
const FONT_SIZES = ['0.75rem', '0.85rem', '0.95rem', '1.05rem', '1.15rem', '1.3rem'];
const DEFAULT_FONT_IDX = 2; // 0.95rem
const WORDS_PER_MINUTE = 200;

// ── State ─────────────────────────────────────────────────────────────────────
let currentData = null;
let viewMode = 'segment';       // 'segment' | 'paragraph'
let searchMatches = [];
let searchIndex = 0;
let currentVideoId = null;
let sideBySideMode = false;
let autoScrollEnabled = true;
let fontSizeIdx = parseInt(localStorage.getItem('transcriptFontIdx') ?? DEFAULT_FONT_IDX);
let ytPlayer = null;
let syncIntervalId = null;
let lastActiveSegIdx = -1;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const urlInput              = document.getElementById('urlInput');
const langSelect            = document.getElementById('langSelect');
const fetchBtn              = document.getElementById('fetchBtn');
const errorMsg              = document.getElementById('errorMsg');
const resultSection         = document.getElementById('resultSection');
const transcriptOutput      = document.getElementById('transcriptOutput');
const transcriptOutputSide  = document.getElementById('transcriptOutputSide');
const metaLang              = document.getElementById('metaLang');
const metaWords             = document.getElementById('metaWords');
const metaReadTime          = document.getElementById('metaReadTime');
const metaAuto              = document.getElementById('metaAuto');
const toggleViewBtn         = document.getElementById('toggleViewBtn');
const sideBySideBtn         = document.getElementById('sideBySideBtn');
const sideBySideContainer   = document.getElementById('sideBySideContainer');
const transcriptContainer   = document.getElementById('transcriptContainer');
const copyBtn               = document.getElementById('copyBtn');
const downloadBtn           = document.getElementById('downloadBtn');
const downloadMenu          = document.getElementById('downloadMenu');
const downloadTxt           = document.getElementById('downloadTxt');
const downloadSrt           = document.getElementById('downloadSrt');
const downloadPdf           = document.getElementById('downloadPdf');
const searchInput           = document.getElementById('searchInput');
const searchCount           = document.getElementById('searchCount');
const searchPrev            = document.getElementById('searchPrev');
const searchNext            = document.getElementById('searchNext');
const clearSearch           = document.getElementById('clearSearch');
const themeToggleBtn        = document.getElementById('themeToggleBtn');
const fontDecBtn            = document.getElementById('fontDecBtn');
const fontIncBtn            = document.getElementById('fontIncBtn');
const autoScrollBtn         = document.getElementById('autoScrollBtn');
const toast                 = document.getElementById('toast');

// ── Init: restore preferences ─────────────────────────────────────────────────
(function init() {
  // Theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggleBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

  // Font size
  if (fontSizeIdx < 0 || fontSizeIdx >= FONT_SIZES.length) fontSizeIdx = DEFAULT_FONT_IDX;
  applyFontSize();
})();

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  return `${m}:${String(s % 60).padStart(2,'0')}`;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.classList.add('hidden'), 300); }, 2200);
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function clearError() {
  errorMsg.classList.add('hidden');
  errorMsg.textContent = '';
}

function setLoading(on) {
  fetchBtn.disabled = on;
  if (on) {
    fetchBtn.textContent = 'Fetching...';
    fetchBtn.classList.add('loading');
  } else {
    fetchBtn.textContent = 'Get Transcript';
    fetchBtn.classList.remove('loading');
  }
}

function getActiveOutput() {
  return sideBySideMode ? transcriptOutputSide : transcriptOutput;
}

function getActiveContainer() {
  return sideBySideMode
    ? document.getElementById('transcriptContainerSide')
    : transcriptContainer;
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
themeToggleBtn.addEventListener('click', () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  themeToggleBtn.textContent = next === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('theme', next);
});

// ── Font size ─────────────────────────────────────────────────────────────────
function applyFontSize() {
  document.documentElement.style.setProperty('--transcript-font-size', FONT_SIZES[fontSizeIdx]);
  fontDecBtn.disabled = fontSizeIdx === 0;
  fontIncBtn.disabled = fontSizeIdx === FONT_SIZES.length - 1;
  localStorage.setItem('transcriptFontIdx', fontSizeIdx);
}

fontDecBtn.addEventListener('click', () => {
  if (fontSizeIdx > 0) { fontSizeIdx--; applyFontSize(); }
});
fontIncBtn.addEventListener('click', () => {
  if (fontSizeIdx < FONT_SIZES.length - 1) { fontSizeIdx++; applyFontSize(); }
});

// ── Auto-scroll toggle ────────────────────────────────────────────────────────
autoScrollBtn.addEventListener('click', () => {
  autoScrollEnabled = !autoScrollEnabled;
  autoScrollBtn.classList.toggle('active', autoScrollEnabled);
  autoScrollBtn.textContent = autoScrollEnabled ? '↕ Sync' : '↕ Sync';
  showToast(autoScrollEnabled ? 'Auto-scroll ON' : 'Auto-scroll OFF');
});

// ── Language loader ───────────────────────────────────────────────────────────
async function loadLanguages(url) {
  try {
    const res = await fetch('/api/languages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.languages) {
      langSelect.innerHTML = '';
      data.languages.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.code;
        opt.textContent = l.code.toUpperCase() + (l.auto ? ' ✦' : '');
        langSelect.appendChild(opt);
      });
    }
  } catch (_) {}
}

// ── Fetch transcript ──────────────────────────────────────────────────────────
async function fetchTranscript() {
  clearError();
  const url = urlInput.value.trim();
  if (!url) { showError('Please paste a YouTube URL first.'); return; }

  setLoading(true);
  try {
    const res = await fetch('/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, lang: langSelect.value })
    });
    const data = await res.json();
    if (data.error) { showError(data.error); return; }
    currentData = data;
    currentVideoId = data.video_id;
    renderResult(data);
  } catch (e) {
    showError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
}

// ── Render result ─────────────────────────────────────────────────────────────
function renderResult(data) {
  metaLang.textContent = data.language || data.language_code;
  metaWords.textContent = `${data.word_count.toLocaleString()} words`;
  const readMins = Math.ceil(data.word_count / WORDS_PER_MINUTE);
  metaReadTime.textContent = `· ~${readMins} min read`;
  metaAuto.classList.toggle('hidden', !data.is_generated);
  resultSection.classList.remove('hidden');

  renderTranscript();

  searchInput.value = '';
  searchMatches = [];
  searchIndex = 0;
  searchCount.classList.add('hidden');

  // If side-by-side was already on, reload player for new video
  if (sideBySideMode) {
    renderTranscriptSide();
    reloadPlayer(currentVideoId);
  }
}

// ── Render transcript (normal mode) ──────────────────────────────────────────
function renderTranscript(highlight = '') {
  const output = transcriptOutput;
  output.innerHTML = '';
  buildSegments(output, highlight, false);
}

// ── Render transcript (side-by-side mode) ────────────────────────────────────
function renderTranscriptSide(highlight = '') {
  const output = transcriptOutputSide;
  output.innerHTML = '';
  buildSegments(output, highlight, true);
}

function buildSegments(output, highlight, isSide) {
  if (!currentData) return;

  if (viewMode === 'segment') {
    currentData.segments.forEach((seg, idx) => {
      const div = document.createElement('div');
      div.className = 'segment';
      div.dataset.idx = idx;
      div.dataset.start = seg.start;

      const a = document.createElement('a');
      a.className = 'timestamp';
      a.textContent = formatTime(seg.start);

      if (isSide) {
        // In side-by-side: clicking timestamp seeks the player
        a.href = '#';
        a.addEventListener('click', e => {
          e.preventDefault();
          if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(seg.start, true);
        });
      } else {
        a.href = `https://www.youtube.com/watch?v=${currentVideoId}&t=${Math.floor(seg.start)}s`;
        a.target = '_blank';
        a.rel = 'noopener';
      }

      const span = document.createElement('span');
      span.className = 'seg-text';
      span.innerHTML = highlight ? highlightText(seg.text, highlight) : seg.text;

      div.appendChild(a);
      div.appendChild(span);
      output.appendChild(div);
    });
  } else {
    currentData.paragraphs.forEach((para, idx) => {
      const div = document.createElement('div');
      div.className = 'paragraph';
      div.dataset.idx = idx;
      div.dataset.start = para.start;

      if (isSide) {
        div.addEventListener('click', () => {
          if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(para.start, true);
        });
      } else {
        div.onclick = () => {
          window.open(`https://www.youtube.com/watch?v=${currentVideoId}&t=${Math.floor(para.start)}s`, '_blank');
        };
      }

      const ts = document.createElement('span');
      ts.className = 'para-ts';
      ts.textContent = '▶ ' + formatTime(para.start);

      const p = document.createElement('p');
      p.className = 'para-text';
      p.innerHTML = highlight ? highlightText(para.text, highlight) : para.text;

      div.appendChild(ts);
      div.appendChild(p);
      output.appendChild(div);
    });
  }
}

// ── Side-by-side mode ─────────────────────────────────────────────────────────
sideBySideBtn.addEventListener('click', () => {
  sideBySideMode = !sideBySideMode;
  sideBySideBtn.classList.toggle('active', sideBySideMode);
  sideBySideBtn.textContent = sideBySideMode ? '✅ Video Sync' : '⬛ Video Sync';

  if (sideBySideMode) {
    // Show side-by-side, hide normal
    sideBySideContainer.classList.remove('hidden');
    transcriptContainer.classList.add('hidden');
    if (currentData) {
      renderTranscriptSide();
      loadYTPlayer(currentVideoId);
    }
  } else {
    // Back to normal
    sideBySideContainer.classList.add('hidden');
    transcriptContainer.classList.remove('hidden');
    stopSync();
    destroyPlayer();
  }
});

// ── YouTube IFrame API ────────────────────────────────────────────────────────
function loadYTPlayer(videoId) {
  if (!videoId) return;
  destroyPlayer();

  // onYouTubeIframeAPIReady may have already fired; create player directly
  ytPlayer = new YT.Player('ytPlayer', {
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      rel: 0,
      modestbranding: 1,
      origin: window.location.origin
    },
    events: {
      onReady: () => startSync(),
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) startSync();
        else stopSync();
      }
    }
  });
}

function reloadPlayer(videoId) {
  if (ytPlayer && ytPlayer.loadVideoById) {
    ytPlayer.loadVideoById(videoId);
  } else {
    loadYTPlayer(videoId);
  }
}

function destroyPlayer() {
  stopSync();
  if (ytPlayer) {
    try { ytPlayer.destroy(); } catch (_) {}
    ytPlayer = null;
  }
  // Re-create the div (destroy removes it)
  const container = document.getElementById('ytPlayerContainer');
  if (container && !document.getElementById('ytPlayer')) {
    const div = document.createElement('div');
    div.id = 'ytPlayer';
    container.appendChild(div);
  }
}

// ── Sync loop ─────────────────────────────────────────────────────────────────
function startSync() {
  stopSync();
  syncIntervalId = setInterval(syncHighlight, 500);
}

function stopSync() {
  if (syncIntervalId) { clearInterval(syncIntervalId); syncIntervalId = null; }
}

function syncHighlight() {
  if (!ytPlayer || !ytPlayer.getCurrentTime || !currentData) return;
  const currentTime = ytPlayer.getCurrentTime();
  const segs = currentData.segments;

  // Binary search for current segment
  let lo = 0, hi = segs.length - 1, activeIdx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid].start <= currentTime) { activeIdx = mid; lo = mid + 1; }
    else hi = mid - 1;
  }

  if (activeIdx === lastActiveSegIdx) return;
  lastActiveSegIdx = activeIdx;

  const output = transcriptOutputSide;
  const allSegs = output.querySelectorAll('.segment');
  allSegs.forEach((el, i) => el.classList.toggle('active-seg', i === activeIdx));

  if (autoScrollEnabled && allSegs[activeIdx]) {
    allSegs[activeIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Global callback required by YouTube IFrame API
window.onYouTubeIframeAPIReady = function () {
  // Player will be created on demand when side-by-side is activated
};

// ── Search ────────────────────────────────────────────────────────────────────
function highlightText(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), m => `<mark>${m}</mark>`);
}

function doSearch(query) {
  if (!currentData || !query.trim()) {
    renderTranscript();
    if (sideBySideMode) renderTranscriptSide();
    searchCount.classList.add('hidden');
    searchMatches = [];
    return;
  }

  renderTranscript(query);
  if (sideBySideMode) renderTranscriptSide(query);

  const output = getActiveOutput();
  const marks = output.querySelectorAll('mark');
  searchMatches = Array.from(marks);
  searchIndex = 0;

  if (searchMatches.length === 0) {
    searchCount.textContent = 'No results';
    searchCount.classList.remove('hidden');
    return;
  }

  highlightActive();
  searchCount.classList.remove('hidden');
}

function highlightActive() {
  searchMatches.forEach((m, i) => m.classList.toggle('active', i === searchIndex));
  if (searchMatches[searchIndex]) {
    searchMatches[searchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  searchCount.textContent = `${searchIndex + 1} / ${searchMatches.length}`;
}

// ── Events ────────────────────────────────────────────────────────────────────
fetchBtn.addEventListener('click', fetchTranscript);
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchTranscript(); });

urlInput.addEventListener('blur', () => {
  const url = urlInput.value.trim();
  if (url) loadLanguages(url);
});

toggleViewBtn.addEventListener('click', () => {
  viewMode = viewMode === 'segment' ? 'paragraph' : 'segment';
  toggleViewBtn.textContent = viewMode === 'segment' ? '📄 Paragraphs' : '🔖 Segments';
  toggleViewBtn.classList.toggle('active', viewMode === 'paragraph');
  renderTranscript(searchInput.value.trim());
  if (sideBySideMode) renderTranscriptSide(searchInput.value.trim());
});

copyBtn.addEventListener('click', () => {
  if (!currentData) return;
  navigator.clipboard.writeText(currentData.full_text).then(() => showToast('Copied to clipboard!'));
});

// ── Export dropdown ───────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentData) return;
  downloadMenu.classList.toggle('hidden');
});

document.addEventListener('click', () => downloadMenu.classList.add('hidden'));

downloadTxt.addEventListener('click', () => {
  if (!currentData) return;
  const blob = new Blob([currentData.full_text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `transcript_${currentVideoId}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('TXT downloaded!');
  downloadMenu.classList.add('hidden');
});

downloadSrt.addEventListener('click', async () => {
  if (!currentData) return;
  showToast('Generating SRT...');
  downloadMenu.classList.add('hidden');
  try {
    const res = await fetch('/api/export/srt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.value.trim(), lang: langSelect.value })
    });
    if (!res.ok) { const d = await res.json(); showToast('Error: ' + d.error); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `transcript_${currentVideoId}.srt`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('SRT downloaded!');
  } catch (e) {
    showToast('SRT export failed.');
  }
});

downloadPdf.addEventListener('click', async () => {
  if (!currentData) return;
  showToast('Generating PDF...');
  downloadMenu.classList.add('hidden');
  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.value.trim(), lang: langSelect.value })
    });
    if (!res.ok) { const d = await res.json(); showToast('Error: ' + d.error); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `transcript_${currentVideoId}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('PDF downloaded!');
  } catch (e) {
    showToast('PDF export failed.');
  }
});

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => doSearch(searchInput.value), 250);
});

searchNext.addEventListener('click', () => {
  if (!searchMatches.length) return;
  searchIndex = (searchIndex + 1) % searchMatches.length;
  highlightActive();
});

searchPrev.addEventListener('click', () => {
  if (!searchMatches.length) return;
  searchIndex = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
  highlightActive();
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  doSearch('');
});
