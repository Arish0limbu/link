// Music Player Module
(function() {
  // DOM references
  const dom = {
    musicUrlInput: document.getElementById('musicUrlInput'),
    musicUrlApplyBtn: document.getElementById('musicUrlApplyBtn'),
    musicFileInput: document.getElementById('musicFileInput'),
    musicVolume: document.getElementById('musicVolume'),
    musicVolumeValue: document.getElementById('musicVolumeValue'),
    musicResetBtn: document.getElementById('musicResetBtn'),
    musicPlayer: document.getElementById('musicPlayer'),
    audioPlayer: document.getElementById('audioPlayer'),
    musicTitle: document.getElementById('musicTitle'),
    musicTime: document.getElementById('musicTime'),
    musicPlayPauseBtn: document.getElementById('musicPlayPauseBtn'),
    musicPrevBtn: document.getElementById('musicPrevBtn'),
    musicNextBtn: document.getElementById('musicNextBtn'),
    musicProgress: document.getElementById('musicProgress'),
  };

  // Settings key
  const SETTINGS_KEY = 'ntd_settings';
  let appSettings = {
    musicUrl: '',
    musicVolume: 50,
  };

  // Load settings
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        appSettings.musicUrl = parsed.musicUrl || '';
        appSettings.musicVolume = parsed.musicVolume || 50;
      }
    } catch (e) {
      console.error('Failed to load music settings:', e);
    }
  }

  // Save settings
  function saveSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      existing.musicUrl = appSettings.musicUrl;
      existing.musicVolume = appSettings.musicVolume;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to save music settings:', e);
    }
  }

  // Load music
  function loadMusic(url) {
    if (!dom.audioPlayer) return;
    dom.audioPlayer.src = url;
    dom.audioPlayer.volume = (appSettings.musicVolume || 50) / 100;
    dom.audioPlayer.play().catch(() => {
      showToast('Click play to start music');
    });
    if (dom.musicPlayer) dom.musicPlayer.hidden = false;
    if (dom.musicTitle) dom.musicTitle.textContent = 'Background Music';
  }

  // Stop music
  function stopMusic() {
    if (dom.audioPlayer) {
      dom.audioPlayer.pause();
      dom.audioPlayer.src = '';
    }
    if (dom.musicPlayer) dom.musicPlayer.hidden = true;
  }

  // Toggle play/pause
  function togglePlayPause() {
    if (!dom.audioPlayer) return;
    if (dom.audioPlayer.paused) {
      dom.audioPlayer.play();
      updatePlayPauseIcon(true);
    } else {
      dom.audioPlayer.pause();
      updatePlayPauseIcon(false);
    }
  }

  // Update play/pause icon
  function updatePlayPauseIcon(isPlaying) {
    if (!dom.musicPlayPauseBtn) return;
    const icon = dom.musicPlayPauseBtn.querySelector('.icon use');
    if (icon) {
      icon.setAttribute('href', '#icon-arrow-up');
      icon.setAttribute('style', isPlaying ? 'transform: rotate(90deg)' : 'transform: rotate(-90deg)');
    }
  }

  // Format time
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Update music progress
  function updateMusicProgress() {
    if (!dom.audioPlayer || !dom.musicProgress || !dom.musicTime) return;
    const { currentTime, duration } = dom.audioPlayer;
    if (duration) {
      const percent = (currentTime / duration) * 100;
      dom.musicProgress.value = percent;
      dom.musicTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }
  }

  // Seek music
  function seekMusic() {
    if (!dom.audioPlayer || !dom.musicProgress) return;
    const percent = dom.musicProgress.value;
    const duration = dom.audioPlayer.duration;
    if (duration) {
      dom.audioPlayer.currentTime = (percent / 100) * duration;
    }
  }

  // Show toast notification
  function showToast(message) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Initialize music player
  function initMusicPlayer() {
    if (!dom.audioPlayer) return;

    loadSettings();

    // Music URL
    dom.musicUrlApplyBtn?.addEventListener('click', () => {
      const url = dom.musicUrlInput.value.trim();
      if (url) {
        appSettings.musicUrl = url;
        saveSettings();
        loadMusic(url);
        showToast('Music applied');
      }
    });

    // Music file upload
    dom.musicFileInput?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        appSettings.musicUrl = ev.target.result;
        saveSettings();
        if (dom.musicUrlInput) dom.musicUrlInput.value = '';
        loadMusic(ev.target.result);
        showToast('Music file loaded');
      };
      reader.readAsDataURL(file);
    });

    // Music volume
    dom.musicVolume?.addEventListener('input', () => {
      appSettings.musicVolume = parseInt(dom.musicVolume.value, 10);
      if (dom.musicVolumeValue) dom.musicVolumeValue.textContent = appSettings.musicVolume + '%';
      saveSettings();
      if (dom.audioPlayer) dom.audioPlayer.volume = appSettings.musicVolume / 100;
    });

    // Music reset
    dom.musicResetBtn?.addEventListener('click', () => {
      appSettings.musicUrl = '';
      saveSettings();
      stopMusic();
      showToast('Music stopped');
    });

    // Play/pause button
    dom.musicPlayPauseBtn?.addEventListener('click', togglePlayPause);

    // Progress bar seek
    dom.musicProgress?.addEventListener('input', seekMusic);

    // Update progress while playing
    dom.audioPlayer.addEventListener('timeupdate', updateMusicProgress);

    // Update play/pause icon when audio ends
    dom.audioPlayer.addEventListener('ended', () => {
      updatePlayPauseIcon(false);
    });

    // Load saved music on startup
    if (appSettings.musicUrl) {
      loadMusic(appSettings.musicUrl);
      dom.audioPlayer.pause();
      updatePlayPauseIcon(false);
    }

    // Sync volume UI
    if (dom.musicVolume && dom.musicVolumeValue) {
      dom.musicVolume.value = appSettings.musicVolume;
      dom.musicVolumeValue.textContent = appSettings.musicVolume + '%';
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusicPlayer);
  } else {
    initMusicPlayer();
  }
})();
