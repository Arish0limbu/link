
  /* ============================================================
     SECTION 20 — MUSIC PLAYER
     ============================================================ */

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

  function stopMusic() {
    if (dom.audioPlayer) {
      dom.audioPlayer.pause();
      dom.audioPlayer.src = '';
    }
    if (dom.musicPlayer) dom.musicPlayer.hidden = true;
  }

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

  function updatePlayPauseIcon(isPlaying) {
    if (!dom.musicPlayPauseBtn) return;
    const icon = dom.musicPlayPauseBtn.querySelector('.icon use');
    if (icon) {
      icon.setAttribute('href', isPlaying ? '#icon-arrow-up' : '#icon-arrow-up');
      icon.setAttribute('style', isPlaying ? 'transform: rotate(90deg)' : 'transform: rotate(-90deg)');
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function updateMusicProgress() {
    if (!dom.audioPlayer || !dom.musicProgress || !dom.musicTime) return;
    const { currentTime, duration } = dom.audioPlayer;
    if (duration) {
      const percent = (currentTime / duration) * 100;
      dom.musicProgress.value = percent;
      dom.musicTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }
  }

  function seekMusic(e) {
    if (!dom.audioPlayer || !dom.musicProgress) return;
    const percent = dom.musicProgress.value;
    const duration = dom.audioPlayer.duration;
    if (duration) {
      dom.audioPlayer.currentTime = (percent / 100) * duration;
    }
  }

  function initMusicPlayer() {
    if (!dom.audioPlayer) return;

    dom.musicPlayPauseBtn?.addEventListener('click', togglePlayPause);
    dom.musicProgress?.addEventListener('input', seekMusic);
    dom.audioPlayer.addEventListener('timeupdate', updateMusicProgress);
    dom.audioPlayer.addEventListener('ended', () => updatePlayPauseIcon(false));

    if (appSettings.musicUrl) {
      loadMusic(appSettings.musicUrl);
      dom.audioPlayer.pause();
      updatePlayPauseIcon(false);
    }
  }

