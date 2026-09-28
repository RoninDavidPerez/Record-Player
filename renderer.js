const record = document.getElementById('record');
const tonearm = document.getElementById('tonearm');
const audio = document.getElementById('audioPlayer');
const seekBar = document.getElementById('seekBar');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const menuBtn = document.getElementById('menuBtn');
const chooseFolderBtn = document.getElementById('chooseFolderBtn');
const trackList = document.getElementById('trackList');
const playlistName = document.getElementById('playlistName');
const nowPlayingName = document.getElementById('nowPlayingName');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsChooseFolderBtn = document.getElementById('settingsChooseFolderBtn');
const lightThemeBtn = document.getElementById('lightThemeBtn');
const darkThemeBtn = document.getElementById('darkThemeBtn');
const glowOnBtn = document.getElementById('glowOnBtn');
const glowOffBtn = document.getElementById('glowOffBtn');

let tracks = [];
let currentIndex = -1;
let isSeeking = false;

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderTrackList() {
  trackList.innerHTML = '';
  if (tracks.length === 0) {
    trackList.innerHTML = '<li class="empty-hint">Click the menu icon or "choose folder" to load your MP3s.</li>';
    return;
  }
  tracks.forEach((track, index) => {
    const li = document.createElement('li');
    li.dataset.index = String(index);
    if (index === currentIndex) li.classList.add('active');

    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${track.displayName}`;

    const duration = document.createElement('span');
    duration.className = 'track-duration';
    duration.textContent = formatDuration(track.duration);

    li.appendChild(label);
    li.appendChild(duration);
    li.addEventListener('click', () => loadTrack(index, true));
    trackList.appendChild(li);
  });

  capVisibleTracks(2);
}

function capVisibleTracks(visibleCount) {
  const items = trackList.querySelectorAll('li:not(.empty-hint)');
  if (items.length === 0) {
    trackList.style.maxHeight = '';
    return;
  }
  let height = 0;
  for (let i = 0; i < Math.min(visibleCount, items.length); i++) {
    height += items[i].getBoundingClientRect().height;
  }
  trackList.style.maxHeight = `${Math.ceil(height)}px`;
}

async function enrichTrackMetadata(track) {
  const meta = await window.musicAPI.getTrackMetadata(track.filePath);
  track.title = meta.title;
  track.artist = meta.artist;
  track.duration = meta.duration;
  track.displayName = meta.title
    ? `${meta.title}${meta.artist ? ' - ' + meta.artist : ''}`
    : track.fileName.replace(/\.[^/.]+$/, '');
}

async function loadFolderResult(result) {
  if (!result) return;
  playlistName.textContent = result.folderPath.split(/[\\/]/).pop();
  tracks = result.tracks.map((t) => ({ ...t, displayName: t.fileName.replace(/\.[^/.]+$/, '') }));
  renderTrackList();

  for (const track of tracks) {
    await enrichTrackMetadata(track);
  }
  renderTrackList();
}

function loadTrack(index, autoplay) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];
  audio.src = `file://${track.filePath}`;
  nowPlayingName.textContent = track.displayName;
  renderTrackList();
  if (autoplay) audio.play().catch(() => {});
}

function setPlayingUI(playing) {
  record.classList.toggle('spinning', playing);
  playIcon.style.display = playing ? 'none' : 'block';
  pauseIcon.style.display = playing ? 'block' : 'none';
  updateTonearmPosition();
}

function updateTonearmPosition() {
  tonearm.classList.toggle('playing', !audio.paused || isDragging);
}

playPauseBtn.addEventListener('click', () => {
  if (currentIndex === -1) {
    if (tracks.length > 0) loadTrack(0, true);
    return;
  }
  if (audio.paused) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
});

prevBtn.addEventListener('click', () => {
  if (tracks.length === 0) return;
  const newIndex = (currentIndex - 1 + tracks.length) % tracks.length;
  loadTrack(newIndex, true);
});

nextBtn.addEventListener('click', () => {
  if (tracks.length === 0) return;
  const newIndex = (currentIndex + 1) % tracks.length;
  loadTrack(newIndex, true);
});

audio.addEventListener('play', () => setPlayingUI(true));
audio.addEventListener('pause', () => setPlayingUI(false));
audio.addEventListener('ended', () => nextBtn.click());

const DEGREES_PER_SECOND = 60;
let isDragging = false;
let dragLastAngle = 0;
let dragAccumulatedDegrees = 0;
let dragStartTime = 0;
let wasPlayingBeforeDrag = false;

function getAngleFromCenter(clientX, clientY) {
  const rect = record.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
}

let scratchAudioCtx = null;
let scratchNoiseBuffer = null;
let scratchSource = null;
let scratchGain = null;

function ensureScratchAudio() {
  if (scratchAudioCtx) return;
  scratchAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const bufferSeconds = 2;
  scratchNoiseBuffer = scratchAudioCtx.createBuffer(
    1,
    scratchAudioCtx.sampleRate * bufferSeconds,
    scratchAudioCtx.sampleRate
  );
  const data = scratchNoiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
}

function startScratchSound() {
  ensureScratchAudio();
  if (scratchAudioCtx.state === 'suspended') scratchAudioCtx.resume();
  scratchGain = scratchAudioCtx.createGain();
  scratchGain.gain.value = 0;
  const filter = scratchAudioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;
  scratchSource = scratchAudioCtx.createBufferSource();
  scratchSource.buffer = scratchNoiseBuffer;
  scratchSource.loop = true;
  scratchSource.connect(filter).connect(scratchGain).connect(scratchAudioCtx.destination);
  scratchSource.start();
}

function updateScratchSound(speed) {
  if (!scratchGain) return;
  const volume = Math.min(Math.abs(speed) / 25, 0.5);
  scratchGain.gain.setTargetAtTime(volume, scratchAudioCtx.currentTime, 0.03);
}

function stopScratchSound() {
  if (!scratchGain || !scratchSource) return;
  const ctx = scratchAudioCtx;
  const gain = scratchGain;
  const source = scratchSource;
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  setTimeout(() => source.stop(), 150);
  scratchSource = null;
  scratchGain = null;
}

record.addEventListener('pointerdown', (event) => {
  if (currentIndex === -1 || !Number.isFinite(audio.duration)) return;
  isDragging = true;
  dragAccumulatedDegrees = 0;
  dragLastAngle = getAngleFromCenter(event.clientX, event.clientY);
  dragStartTime = audio.currentTime;
  wasPlayingBeforeDrag = !audio.paused;
  audio.pause();
  record.classList.add('dragging');
  record.setPointerCapture(event.pointerId);
  updateTonearmPosition();
  startScratchSound();
});

record.addEventListener('pointermove', (event) => {
  if (!isDragging) return;
  const angleNow = getAngleFromCenter(event.clientX, event.clientY);
  let step = angleNow - dragLastAngle;
  if (step > 180) step -= 360;
  if (step < -180) step += 360;
  dragAccumulatedDegrees += step;
  dragLastAngle = angleNow;

  const newTime = Math.min(
    Math.max(dragStartTime + dragAccumulatedDegrees / DEGREES_PER_SECOND, 0),
    audio.duration
  );
  audio.currentTime = newTime;
  seekBar.value = String((newTime / audio.duration) * 100);
  record.style.transform = `rotate(${dragAccumulatedDegrees}deg)`;
  updateScratchSound(step);
});

function endRecordDrag(event) {
  if (!isDragging) return;
  isDragging = false;
  record.classList.remove('dragging');
  record.style.transform = '';
  record.releasePointerCapture(event.pointerId);
  stopScratchSound();
  if (wasPlayingBeforeDrag) {
    audio.play().catch(() => {});
  } else {
    updateTonearmPosition();
  }
}

record.addEventListener('pointerup', endRecordDrag);
record.addEventListener('pointercancel', endRecordDrag);

audio.addEventListener('timeupdate', () => {
  if (isSeeking || !audio.duration) return;
  seekBar.value = String((audio.currentTime / audio.duration) * 100);
});

seekBar.addEventListener('input', () => {
  isSeeking = true;
});

seekBar.addEventListener('change', () => {
  if (audio.duration) {
    audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
  }
  isSeeking = false;
});

async function pickFolder() {
  const result = await window.musicAPI.pickMusicFolder();
  await loadFolderResult(result);
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
  lightThemeBtn.classList.toggle('active', theme !== 'dark');
  darkThemeBtn.classList.toggle('active', theme === 'dark');
}

async function setTheme(theme) {
  applyTheme(theme);
  await window.musicAPI.setTheme(theme);
}

function applyGlow(enabled) {
  document.body.classList.toggle('glow-off', !enabled);
  glowOnBtn.classList.toggle('active', enabled);
  glowOffBtn.classList.toggle('active', !enabled);
}

async function setGlow(enabled) {
  applyGlow(enabled);
  await window.musicAPI.setGlow(enabled);
}

function openSettings() {
  settingsOverlay.classList.add('open');
}

function closeSettings() {
  settingsOverlay.classList.remove('open');
}

menuBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (event) => {
  if (event.target === settingsOverlay) closeSettings();
});
chooseFolderBtn.addEventListener('click', pickFolder);
settingsChooseFolderBtn.addEventListener('click', pickFolder);
lightThemeBtn.addEventListener('click', () => setTheme('light'));
darkThemeBtn.addEventListener('click', () => setTheme('dark'));
glowOnBtn.addEventListener('click', () => setGlow(true));
glowOffBtn.addEventListener('click', () => setGlow(false));

function updateMiniMode() {
  const isMini = window.innerWidth < 260 || window.innerHeight < 320;
  document.body.classList.toggle('mini-mode', isMini);
}

window.addEventListener('resize', updateMiniMode);

(async function init() {
  const [saved, theme, glowEnabled] = await Promise.all([
    window.musicAPI.getSavedFolder(),
    window.musicAPI.getTheme(),
    window.musicAPI.getGlow(),
  ]);
  await loadFolderResult(saved);
  applyTheme(theme);
  applyGlow(glowEnabled);
  updateMiniMode();
})();
