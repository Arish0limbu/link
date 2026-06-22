'use strict';

(function () {

  /* ============================================================
     SECTION 1 — CONSTANTS & STATE
  ============================================================ */

  const STORAGE_KEY   = 'ntd_data';
  const BACKUP_KEY    = 'ntd_backup';
  const SETTINGS_KEY  = 'ntd_settings';

  const DEFAULT_SETTINGS = {
    theme:      'auto',   // 'light' | 'dark' | 'auto'
    bgUrl:      '',
    bgBlur:     0,
    bgBrightness: 80,
    userName:   '',
  };

  const DEFAULT_DATA = {
    categories: [
      { id: 'cat-work',    name: 'Work',    order: 0 },
      { id: 'cat-social',  name: 'Social',  order: 1 },
      { id: 'cat-tools',   name: 'Tools',   order: 2 },
    ],
    shortcuts: [
      { id: 'sc-1', title: 'GitHub',    url: 'https://github.com',          icon: '', category: 'cat-work',   favorite: false, description: '', useCount: 0, lastUsed: null },
      { id: 'sc-2', title: 'Gmail',     url: 'https://mail.google.com',     icon: '', category: 'cat-social', favorite: true,  description: '', useCount: 0, lastUsed: null },
      { id: 'sc-3', title: 'YouTube',   url: 'https://youtube.com',         icon: '', category: 'cat-social', favorite: false, description: '', useCount: 0, lastUsed: null },
      { id: 'sc-4', title: 'ChatGPT',   url: 'https://chat.openai.com',     icon: '', category: 'cat-tools',  favorite: false, description: '', useCount: 0, lastUsed: null },
    ],
  };

  let appData     = null;   // { categories, shortcuts }
  let appSettings = null;

  // Track the shortcut being dragged
  let dragSrcId   = null;
  let contextTargetId = null;   // id for context menu / move menu


  /* ============================================================
     SECTION 2 — STORAGE HELPERS
  ============================================================ */

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      appData = raw ? JSON.parse(raw) : deepClone(DEFAULT_DATA);
    } catch {
      appData = deepClone(DEFAULT_DATA);
    }
    // Ensure arrays exist
    appData.categories = appData.categories || [];
    appData.shortcuts  = appData.shortcuts  || [];
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      appSettings = raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : deepClone(DEFAULT_SETTINGS);
    } catch {
      appSettings = deepClone(DEFAULT_SETTINGS);
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }


  /* ============================================================
     SECTION 3 — DOM REFERENCES
  ============================================================ */

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const dom = {
    bgLayer:          $('bgLayer'),
    bgOverlay:        $('bgOverlay'),
    toastContainer:   $('toastContainer'),
    clockTime:        $('clockTime'),
    greetingPrefix:   $('greetingPrefix'),
    greetingName:     $('greetingName'),
    searchForm:       $('searchForm'),
    searchInput:      $('searchInput'),
    voiceBtn:         $('voiceBtn'),
    searchResults:    $('searchResults'),
    settingsToggle:   $('settingsToggle'),
    favoritesSection: $('favoritesSection'),
    favoritesGrid:    $('favoritesGrid'),
    recentSection:    $('recentSection'),
    recentGrid:       $('recentGrid'),
    mostUsedSection:  $('mostUsedSection'),
    mostUsedGrid:     $('mostUsedGrid'),
    categoriesContainer: $('categoriesContainer'),
    emptyState:       $('emptyState'),
    emptyAddBtn:      $('emptyAddBtn'),
    fabMenu:          $('fabMenu'),
    fabAddShortcut:   $('fabAddShortcut'),
    fabAddCategory:   $('fabAddCategory'),
    fabAdd:           $('fabAdd'),
    overlayBackdrop:  $('overlayBackdrop'),
    settingsPanel:    $('settingsPanel'),
    closeSettings:    $('closeSettings'),
    bgUrlInput:       $('bgUrlInput'),
    bgUrlApplyBtn:    $('bgUrlApplyBtn'),
    bgFileInput:      $('bgFileInput'),
    blurRange:        $('blurRange'),
    blurValue:        $('blurValue'),
    brightnessRange:  $('brightnessRange'),
    brightnessValue:  $('brightnessValue'),
    bgResetBtn:       $('bgResetBtn'),
    exportDataBtn:    $('exportDataBtn'),
    importFileInput:  $('importFileInput'),
    backupNowBtn:     $('backupNowBtn'),
    restoreBackupBtn: $('restoreBackupBtn'),
    lastBackupText:   $('lastBackupText'),
    resetAllBtn:      $('resetAllBtn'),
    shortcutModal:    $('shortcutModal'),
    shortcutModalTitle: $('shortcutModalTitle'),
    shortcutForm:     $('shortcutForm'),
    shortcutEditingId: $('shortcutEditingId'),
    iconPreview:      $('iconPreview'),
    fetchIconBtn:     $('fetchIconBtn'),
    shortcutTitle:    $('shortcutTitle'),
    shortcutUrl:      $('shortcutUrl'),
    shortcutIcon:     $('shortcutIcon'),
    shortcutCategory: $('shortcutCategory'),
    shortcutDescription: $('shortcutDescription'),
    shortcutFavorite: $('shortcutFavorite'),
    categoryModal:    $('categoryModal'),
    categoryModalTitle: $('categoryModalTitle'),
    categoryForm:     $('categoryForm'),
    categoryEditingId: $('categoryEditingId'),
    categoryNameInput: $('categoryNameInput'),
    confirmModal:     $('confirmModal'),
    confirmTitle:     $('confirmTitle'),
    confirmMessage:   $('confirmMessage'),
    confirmOkBtn:     $('confirmOkBtn'),
    moveMenu:         $('moveMenu'),
    contextMenu:      $('contextMenu'),
  };


  /* ============================================================
     SECTION 4 — THEME & APPEARANCE
  ============================================================ */

  function applyTheme(theme) {
    document.documentElement.removeAttribute('data-theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    // 'auto' → let prefers-color-scheme CSS handle it
    $$('[data-theme-choice]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeChoice === theme);
    });
  }

  function applyBackground() {
    const { bgUrl, bgBlur, bgBrightness } = appSettings;
    if (bgUrl) {
      dom.bgLayer.style.backgroundImage = `url(${bgUrl})`;
      dom.bgLayer.style.filter = `blur(${bgBlur}px) brightness(${bgBrightness / 100})`;
      dom.bgLayer.style.display = 'block';
    } else {
      dom.bgLayer.style.backgroundImage = '';
      dom.bgLayer.style.display = 'none';
    }
  }

  function syncSettingsUI() {
    const s = appSettings;
    applyTheme(s.theme);
    if (dom.bgUrlInput)       dom.bgUrlInput.value         = s.bgUrl || '';
    if (dom.blurRange)        dom.blurRange.value          = s.bgBlur;
    if (dom.blurValue)        dom.blurValue.textContent    = s.bgBlur + 'px';
    if (dom.brightnessRange)  dom.brightnessRange.value    = s.bgBrightness;
    if (dom.brightnessValue)  dom.brightnessValue.textContent = s.bgBrightness + '%';
    applyBackground();
    updateLastBackupText();
  }


  /* ============================================================
     SECTION 5 — CLOCK & GREETING
  ============================================================ */

  function updateClock() {
    const now  = new Date();
    const h    = now.getHours();
    const m    = now.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = ((h % 12) || 12);
    if (dom.clockTime) dom.clockTime.textContent = `${h12}:${m} ${ampm}`;
    updateGreeting(h);
  }

  function updateGreeting(h) {
    let prefix;
    if (h < 12)      prefix = 'Good morning';
    else if (h < 17) prefix = 'Good afternoon';
    else             prefix = 'Good evening';
    if (dom.greetingPrefix) dom.greetingPrefix.textContent = prefix + (appSettings.userName ? ',' : '');
    if (dom.greetingName)   dom.greetingName.textContent   = appSettings.userName ? ' ' + appSettings.userName : '';
  }


  /* ============================================================
     SECTION 6 — SEARCH
  ============================================================ */

  function initSearch() {
    if (!dom.searchForm) return;

    dom.searchInput.addEventListener('input', onSearchInput);
    dom.searchInput.addEventListener('keydown', onSearchKeydown);
    dom.searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = dom.searchInput.value.trim();
      if (q) performSearch(q);
    });

    // Voice search
    if (dom.voiceBtn) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        dom.voiceBtn.style.display = '';
        dom.voiceBtn.addEventListener('click', () => {
          const rec = new SpeechRec();
          rec.lang = 'en-US';
          rec.start();
          dom.voiceBtn.classList.add('listening');
          rec.onresult = ev => {
            dom.searchInput.value = ev.results[0][0].transcript;
            dom.searchInput.dispatchEvent(new Event('input'));
          };
          rec.onend = () => dom.voiceBtn.classList.remove('listening');
        });
      } else {
        dom.voiceBtn.style.display = 'none';
      }
    }

    // Close results on outside click
    document.addEventListener('click', e => {
      if (!dom.searchResults) return;
      if (!dom.searchForm.contains(e.target)) {
        closeSearchResults();
      }
    });
  }

  function onSearchInput() {
    const q = dom.searchInput.value.trim().toLowerCase();
    if (!q) { closeSearchResults(); return; }
    const matches = appData.shortcuts.filter(sc =>
      sc.title.toLowerCase().includes(q) ||
      sc.url.toLowerCase().includes(q) ||
      (sc.description || '').toLowerCase().includes(q)
    ).slice(0, 8);
    renderSearchResults(matches, q);
  }

  let searchResultIndex = -1;

  function onSearchKeydown(e) {
    if (!dom.searchResults || dom.searchResults.style.display === 'none') return;
    const items = dom.searchResults.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchResultIndex = Math.min(searchResultIndex + 1, items.length - 1);
      highlightResult(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchResultIndex = Math.max(searchResultIndex - 1, -1);
      highlightResult(items);
    } else if (e.key === 'Escape') {
      closeSearchResults();
    } else if (e.key === 'Enter' && searchResultIndex >= 0) {
      e.preventDefault();
      items[searchResultIndex]?.click();
    }
  }

  function highlightResult(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === searchResultIndex));
  }

  function renderSearchResults(matches, q) {
    if (!dom.searchResults) return;
    searchResultIndex = -1;
    if (!matches.length) {
      dom.searchResults.innerHTML = `<div class="search-result-empty">No shortcuts found — press Enter to search the web</div>`;
    } else {
      dom.searchResults.innerHTML = matches.map(sc => {
        const favicon = getFavicon(sc.url);
        const highlightedTitle = highlight(sc.title, q);
        return `<div class="search-result-item" data-url="${esc(sc.url)}" data-id="${sc.id}" tabindex="-1">
          <img src="${favicon}" onerror="this.style.display='none'" alt="">
          <div class="sr-text">
            <span class="sr-title">${highlightedTitle}</span>
            <span class="sr-meta">${truncateUrl(sc.url)}</span>
          </div>
        </div>`;
      }).join('');
    }
    dom.searchResults.style.display = 'block';
    dom.searchResults.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const url = el.dataset.url;
        recordUsage(id);
        window.open(url, '_blank');
        closeSearchResults();
        dom.searchInput.value = '';
      });
    });
  }

  function closeSearchResults() {
    if (dom.searchResults) dom.searchResults.style.display = 'none';
    searchResultIndex = -1;
  }

  function performSearch(q) {
    closeSearchResults();
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
  }

  function highlight(text, q) {
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return esc(text);
    return esc(text.slice(0, idx)) + '<mark>' + esc(text.slice(idx, idx + q.length)) + '</mark>' + esc(text.slice(idx + q.length));
  }

  function truncateUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname;
    } catch { return url; }
  }


  /* ============================================================
     SECTION 7 — FAVICON & ICON HELPERS
  ============================================================ */

  function getFavicon(url) {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
    } catch {
      return '';
    }
  }

  function getIconSrc(sc) {
    if (sc.icon) return sc.icon;
    return getFavicon(sc.url);
  }

  function getInitials(title) {
    return (title || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }


  /* ============================================================
     SECTION 8 — RENDER: SMART SECTIONS (Favorites, Recent, Most Used)
  ============================================================ */

  function renderSmartSections() {
    renderFavorites();
    renderRecent();
    renderMostUsed();
  }

  function renderFavorites() {
    const favs = appData.shortcuts.filter(sc => sc.favorite);
    if (!dom.favoritesSection || !dom.favoritesGrid) return;
    dom.favoritesSection.style.display = favs.length ? '' : 'none';
    dom.favoritesGrid.innerHTML = favs.map(sc => shortcutCardHTML(sc, 'favorites')).join('');
    attachCardListeners(dom.favoritesGrid);
  }

  function renderRecent() {
    const recent = appData.shortcuts
      .filter(sc => sc.lastUsed)
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 8);
    if (!dom.recentSection || !dom.recentGrid) return;
    dom.recentSection.style.display = recent.length ? '' : 'none';
    dom.recentGrid.innerHTML = recent.map(sc => shortcutCardHTML(sc, 'recent')).join('');
    attachCardListeners(dom.recentGrid);
  }

  function renderMostUsed() {
    const top = appData.shortcuts
      .filter(sc => sc.useCount > 0)
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 8);
    if (!dom.mostUsedSection || !dom.mostUsedGrid) return;
    dom.mostUsedSection.style.display = top.length ? '' : 'none';
    dom.mostUsedGrid.innerHTML = top.map(sc => shortcutCardHTML(sc, 'mostused')).join('');
    attachCardListeners(dom.mostUsedGrid);
  }


  /* ============================================================
     SECTION 9 — RENDER: CATEGORIES & SHORTCUTS
  ============================================================ */

  function renderAll() {
    renderSmartSections();
    renderCategories();
    checkEmptyState();
  }

  function renderCategories() {
    if (!dom.categoriesContainer) return;
    const sorted = [...appData.categories].sort((a, b) => a.order - b.order);
    dom.categoriesContainer.innerHTML = sorted.map(cat => categoryBlockHTML(cat)).join('');

    // Attach listeners for each category block
    sorted.forEach(cat => {
      const block = dom.categoriesContainer.querySelector(`[data-cat-id="${cat.id}"]`);
      if (!block) return;
      // Collapse/expand
      block.querySelector('.category-collapse-btn')?.addEventListener('click', () => {
        block.classList.toggle('collapsed');
      });
      // Category title edit
      const titleEl = block.querySelector('.category-title');
      titleEl?.addEventListener('blur', () => {
        const newName = titleEl.textContent.trim();
        if (newName && newName !== cat.name) {
          cat.name = newName;
          saveData();
          showToast('Category renamed');
        } else {
          titleEl.textContent = cat.name;
        }
      });
      titleEl?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          titleEl.blur();
        }
      });
      // Category menu
      block.querySelector('.category-menu-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        showCategoryMenu(cat.id, e.clientX, e.clientY);
      });
      // Card listeners
      attachCardListeners(block);
      // Drag-over for drop zone
      block.addEventListener('dragover', e => {
        e.preventDefault();
        block.classList.add('drag-target');
      });
      block.addEventListener('dragleave', () => block.classList.remove('drag-target'));
      block.addEventListener('drop', e => {
        e.preventDefault();
        block.classList.remove('drag-target');
        if (dragSrcId) {
          moveShortcutToCategory(dragSrcId, cat.id);
        }
      });
    });
  }

  function categoryBlockHTML(cat) {
    const shortcuts = appData.shortcuts.filter(sc => sc.category === cat.id);
    const cards = shortcuts.map(sc => shortcutCardHTML(sc, 'category')).join('');
    return `
    <section class="category" data-cat-id="${cat.id}">
      <div class="category-header">
        <svg class="icon drag-handle"><use href="#icon-grip"/></svg>
        <button class="category-collapse-btn" aria-label="Toggle category">
          <svg class="icon"><use href="#icon-chevron"/></svg>
        </button>
        <h2 class="category-title" contenteditable="true">${esc(cat.name)}</h2>
        <span class="category-count">${shortcuts.length}</span>
        <button class="category-menu-btn" aria-label="Category options">
          <svg class="icon"><use href="#icon-kebab"/></svg>
        </button>
      </div>
      <div class="category-body">
        ${cards}
        ${shortcuts.length === 0 ? '<div class="category-empty-hint">No shortcuts yet. Click + to add one.</div>' : ''}
      </div>
    </section>`;
  }

  function shortcutCardHTML(sc, context) {
    const iconSrc = getIconSrc(sc);
    const initials = getInitials(sc.title);
    return `
    <div class="shortcut-card" data-id="${sc.id}" data-context="${context}"
         draggable="true" tabindex="0" role="button" aria-label="${esc(sc.title)}">
      <div class="shortcut-icon-wrap">
        ${iconSrc
          ? `<img src="${esc(iconSrc)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <div style="${iconSrc ? 'display:none' : ''}">${initials}</div>
        ${sc.favorite ? '<div class="shortcut-pin-badge"><svg class="icon"><use href="#icon-star"/></svg></div>' : ''}
      </div>
      <span class="shortcut-title">${esc(sc.title)}</span>
      <button class="card-fav-btn" data-id="${sc.id}" title="${sc.favorite ? 'Unfavorite' : 'Favorite'}" aria-label="Toggle favorite">
        <svg class="icon"><use href="${sc.favorite ? '#icon-star' : '#icon-star'}"/></svg>
      </button>
      <button class="card-menu-btn" data-id="${sc.id}" title="More options" aria-label="More options">
        <svg class="icon"><use href="#icon-kebab"/></svg>
      </button>
    </div>`;
  }

  function attachCardListeners(container) {
    // Navigate on card click (not on buttons)
    container.querySelectorAll('.shortcut-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.card-fav-btn') || e.target.closest('.card-menu-btn')) return;
        const sc = getShortcut(card.dataset.id);
        if (!sc) return;
        recordUsage(sc.id);
        window.open(sc.url, '_blank');
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
      // Drag
      card.addEventListener('dragstart', e => {
        dragSrcId = card.dataset.id;
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => {
        dragSrcId = null;
        card.classList.remove('dragging');
        $$('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
      // Context menu
      card.addEventListener('contextmenu', e => {
        e.preventDefault();
        showContextMenu(card.dataset.id, e.clientX, e.clientY);
      });
      // Long press (mobile)
      let longPressTimer;
      card.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') {
          longPressTimer = setTimeout(() => showContextMenu(card.dataset.id, e.clientX, e.clientY), 600);
        }
      });
      card.addEventListener('pointerup', () => clearTimeout(longPressTimer));
      card.addEventListener('pointermove', () => clearTimeout(longPressTimer));
    });

    // Favorite toggle
    container.querySelectorAll('.card-fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.id);
      });
    });

    // Card menu button
    container.querySelectorAll('.card-menu-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const rect = btn.getBoundingClientRect();
        showContextMenu(btn.dataset.id, rect.left, rect.bottom);
      });
    });
  }

  function checkEmptyState() {
    const hasContent = appData.categories.length > 0 || appData.shortcuts.length > 0;
    if (dom.emptyState) dom.emptyState.style.display = hasContent ? 'none' : '';
  }


  /* ============================================================
     SECTION 10 — SHORTCUT CRUD
  ============================================================ */

  function getShortcut(id) {
    return appData.shortcuts.find(sc => sc.id === id) || null;
  }

  function recordUsage(id) {
    const sc = getShortcut(id);
    if (!sc) return;
    sc.useCount = (sc.useCount || 0) + 1;
    sc.lastUsed = new Date().toISOString();
    saveData();
    // No full re-render needed here — smart sections update next open
  }

  function toggleFavorite(id) {
    const sc = getShortcut(id);
    if (!sc) return;
    sc.favorite = !sc.favorite;
    saveData();
    renderAll();
    showToast(sc.favorite ? `★ Added "${sc.title}" to favorites` : `Removed "${sc.title}" from favorites`);
  }

  function deleteShortcut(id) {
    const sc = getShortcut(id);
    if (!sc) return;
    appData.shortcuts = appData.shortcuts.filter(s => s.id !== id);
    saveData();
    renderAll();
    showToast(`Deleted "${sc.title}"`);
  }

  function moveShortcutToCategory(id, catId) {
    const sc = getShortcut(id);
    if (!sc || sc.category === catId) return;
    const catName = appData.categories.find(c => c.id === catId)?.name || '';
    sc.category = catId;
    saveData();
    renderAll();
    showToast(`Moved "${sc.title}" to "${catName}"`);
  }

  function saveShortcut(data) {
    if (data.id) {
      // Edit
      const sc = getShortcut(data.id);
      if (sc) Object.assign(sc, data);
    } else {
      // New
      appData.shortcuts.push({
        id: uid(),
        title: data.title,
        url:   data.url,
        icon:  data.icon || '',
        category: data.category,
        description: data.description || '',
        favorite: data.favorite || false,
        useCount: 0,
        lastUsed: null,
      });
    }
    saveData();
    renderAll();
  }


  /* ============================================================
     SECTION 11 — CATEGORY CRUD
  ============================================================ */

  function saveCategory(data) {
    if (data.id) {
      const cat = appData.categories.find(c => c.id === data.id);
      if (cat) cat.name = data.name;
    } else {
      appData.categories.push({
        id: uid(),
        name: data.name,
        order: appData.categories.length,
      });
    }
    saveData();
    renderAll();
  }

  function deleteCategory(id) {
    appData.categories    = appData.categories.filter(c => c.id !== id);
    appData.shortcuts     = appData.shortcuts.filter(sc => sc.category !== id);
    saveData();
    renderAll();
    showToast('Category deleted');
  }


  /* ============================================================
     SECTION 12 — SHORTCUT MODAL
  ============================================================ */

  function openShortcutModal(id, defaultCategoryId) {
    populateCategorySelect();
    if (id) {
      const sc = getShortcut(id);
      if (!sc) return;
      dom.shortcutModalTitle.textContent   = 'Edit Shortcut';
      dom.shortcutEditingId.value          = sc.id;
      dom.shortcutTitle.value              = sc.title;
      dom.shortcutUrl.value                = sc.url;
      dom.shortcutIcon.value               = sc.icon || '';
      dom.shortcutCategory.value           = sc.category || '';
      dom.shortcutDescription.value        = sc.description || '';
      dom.shortcutFavorite.checked         = sc.favorite || false;
      updateIconPreview(sc.icon || getFavicon(sc.url));
    } else {
      dom.shortcutModalTitle.textContent   = 'Add Shortcut';
      dom.shortcutEditingId.value          = '';
      dom.shortcutForm.reset();
      if (defaultCategoryId) dom.shortcutCategory.value = defaultCategoryId;
      dom.iconPreview.src = '';
      dom.iconPreview.style.display = 'none';
    }
    openModal(dom.shortcutModal);
  }

  function populateCategorySelect() {
    const sel = dom.shortcutCategory;
    if (!sel) return;
    sel.innerHTML = '<option value="">— No category —</option>' +
      appData.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  }

  function updateIconPreview(src) {
    if (!dom.iconPreview) return;
    if (src) {
      dom.iconPreview.src = src;
      dom.iconPreview.style.display = 'block';
    } else {
      dom.iconPreview.src = '';
      dom.iconPreview.style.display = 'none';
    }
  }

  function initShortcutModal() {
    if (!dom.shortcutForm) return;

    // Icon preview on input change
    dom.shortcutIcon?.addEventListener('input', () => {
      updateIconPreview(dom.shortcutIcon.value.trim());
    });

    // Auto-fetch icon from URL
    dom.fetchIconBtn?.addEventListener('click', () => {
      const url = dom.shortcutUrl.value.trim();
      if (!url) { showToast('Enter a URL first', 'error'); return; }
      const favicon = getFavicon(url);
      dom.shortcutIcon.value = favicon;
      updateIconPreview(favicon);
    });

    // Auto-fill title from URL
    dom.shortcutUrl?.addEventListener('blur', () => {
      if (!dom.shortcutTitle.value.trim() && dom.shortcutUrl.value.trim()) {
        try {
          const u = new URL(dom.shortcutUrl.value.trim());
          dom.shortcutTitle.value = u.hostname.replace(/^www\./, '');
        } catch { /* ignore */ }
        const favicon = getFavicon(dom.shortcutUrl.value.trim());
        if (!dom.shortcutIcon.value) updateIconPreview(favicon);
      }
    });

    dom.shortcutForm.addEventListener('submit', e => {
      e.preventDefault();
      let url = dom.shortcutUrl.value.trim();
      if (!url) { showToast('URL is required', 'error'); return; }
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      saveShortcut({
        id:          dom.shortcutEditingId.value || null,
        title:       dom.shortcutTitle.value.trim() || url,
        url,
        icon:        dom.shortcutIcon.value.trim(),
        category:    dom.shortcutCategory.value,
        description: dom.shortcutDescription.value.trim(),
        favorite:    dom.shortcutFavorite.checked,
      });
      closeModal(dom.shortcutModal);
      showToast(dom.shortcutEditingId.value ? 'Shortcut updated' : 'Shortcut added');
    });
  }


  /* ============================================================
     SECTION 13 — CATEGORY MODAL
  ============================================================ */

  function openCategoryModal(id) {
    if (id) {
      const cat = appData.categories.find(c => c.id === id);
      if (!cat) return;
      dom.categoryModalTitle.textContent = 'Edit Category';
      dom.categoryEditingId.value        = cat.id;
      dom.categoryNameInput.value        = cat.name;
    } else {
      dom.categoryModalTitle.textContent = 'Add Category';
      dom.categoryEditingId.value        = '';
      dom.categoryForm.reset();
    }
    openModal(dom.categoryModal);
  }

  function initCategoryModal() {
    if (!dom.categoryForm) return;
    dom.categoryForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = dom.categoryNameInput.value.trim();
      if (!name) { showToast('Category name required', 'error'); return; }
      saveCategory({ id: dom.categoryEditingId.value || null, name });
      closeModal(dom.categoryModal);
      showToast(dom.categoryEditingId.value ? 'Category updated' : 'Category added');
    });
  }


  /* ============================================================
     SECTION 14 — CONFIRM MODAL
  ============================================================ */

  let confirmCallback = null;

  function confirmAction(title, message, onOk) {
    if (dom.confirmTitle)   dom.confirmTitle.textContent   = title;
    if (dom.confirmMessage) dom.confirmMessage.textContent = message;
    confirmCallback = onOk;
    openModal(dom.confirmModal);
  }

  function initConfirmModal() {
    dom.confirmOkBtn?.addEventListener('click', () => {
      closeModal(dom.confirmModal);
      if (typeof confirmCallback === 'function') confirmCallback();
      confirmCallback = null;
    });
  }


  /* ============================================================
     SECTION 15 — CONTEXT MENU
  ============================================================ */

  function showContextMenu(id, x, y) {
    contextTargetId = id;
    const sc = getShortcut(id);
    if (!sc || !dom.contextMenu) return;

    dom.contextMenu.innerHTML = `
      <button class="context-menu-item" data-action="open">Open</button>
      <button class="context-menu-item" data-action="open-new">Open in New Tab</button>
      <button class="context-menu-item" data-action="edit">Edit</button>
      <button class="context-menu-item" data-action="favorite">${sc.favorite ? 'Remove from Favorites' : 'Add to Favorites'}</button>
      <button class="context-menu-item" data-action="move">Move to Category…</button>
      <div class="context-menu-sep"></div>
      <button class="context-menu-item danger" data-action="delete">Delete</button>`;

    positionFloatingMenu(dom.contextMenu, x, y);
    dom.contextMenu.style.display = 'block';
    document.addEventListener('click', hideContextMenu, { once: true });
  }

  function hideContextMenu() {
    if (dom.contextMenu) dom.contextMenu.style.display = 'none';
  }

  function initContextMenu() {
    if (!dom.contextMenu) return;
    dom.contextMenu.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      hideContextMenu();
      
      // Check if it's a category menu or shortcut menu
      const cat = appData.categories.find(c => c.id === contextTargetId);
      if (cat) {
        // Category menu actions
        switch (btn.dataset.action) {
          case 'add-shortcut':
            openShortcutModal(null, cat.id);
            break;
          case 'edit':
            openCategoryModal(cat.id);
            break;
          case 'delete':
            confirmAction('Delete Category', `Delete "${cat.name}" and all its shortcuts? This cannot be undone.`, () => deleteCategory(cat.id));
            break;
        }
        return;
      }
      
      // Shortcut menu actions
      const sc = getShortcut(contextTargetId);
      if (!sc) return;
      switch (btn.dataset.action) {
        case 'open':
          recordUsage(sc.id);
          window.location.href = sc.url;
          break;
        case 'open-new':
          recordUsage(sc.id);
          window.open(sc.url, '_blank');
          break;
        case 'edit':
          openShortcutModal(sc.id);
          break;
        case 'favorite':
          toggleFavorite(sc.id);
          break;
        case 'move':
          showMoveMenu(sc.id);
          break;
        case 'delete':
          confirmAction('Delete Shortcut', `Delete "${sc.title}"?`, () => deleteShortcut(sc.id));
          break;
      }
    });
  }


  /* ============================================================
     SECTION 16 — MOVE MENU
  ============================================================ */

  function showMoveMenu(id) {
    if (!dom.moveMenu) return;
    contextTargetId = id;
    dom.moveMenu.innerHTML = appData.categories.map(cat =>
      `<button class="context-menu-item" data-cat-id="${cat.id}">${esc(cat.name)}</button>`
    ).join('') || '<span class="context-menu-item muted">No categories</span>';
    dom.moveMenu.style.display = 'block';
    const card = document.querySelector(`.shortcut-card[data-id="${id}"]`);
    if (card) {
      const rect = card.getBoundingClientRect();
      positionFloatingMenu(dom.moveMenu, rect.right, rect.top);
    }
    document.addEventListener('click', hideMoveMenu, { once: true });
  }

  function hideMoveMenu() {
    if (dom.moveMenu) dom.moveMenu.style.display = 'none';
  }

  function initMoveMenu() {
    if (!dom.moveMenu) return;
    dom.moveMenu.addEventListener('click', e => {
      const btn = e.target.closest('[data-cat-id]');
      if (!btn) return;
      hideMoveMenu();
      moveShortcutToCategory(contextTargetId, btn.dataset.catId);
    });
  }

  function showCategoryMenu(catId, x, y) {
    contextTargetId = catId;
    const cat = appData.categories.find(c => c.id === catId);
    if (!cat || !dom.contextMenu) return;

    dom.contextMenu.innerHTML = `
      <button class="context-menu-item" data-action="add-shortcut">Add Shortcut</button>
      <button class="context-menu-item" data-action="edit">Rename Category</button>
      <div class="context-menu-sep"></div>
      <button class="context-menu-item danger" data-action="delete">Delete Category</button>`;

    positionFloatingMenu(dom.contextMenu, x, y);
    dom.contextMenu.style.display = 'block';
    document.addEventListener('click', hideContextMenu, { once: true });
  }

  function positionFloatingMenu(el, x, y) {
    el.style.left = '0px';
    el.style.top  = '0px';
    el.style.display = 'block';
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w  = el.offsetWidth;
    const h  = el.offsetHeight;
    el.style.left = Math.min(x, vw - w - 8) + 'px';
    el.style.top  = Math.min(y, vh - h - 8) + 'px';
  }


  /* ============================================================
     SECTION 17 — FAB MENU
  ============================================================ */

  function initFab() {
    if (!dom.fabAdd) return;
    dom.fabAdd.addEventListener('click', e => {
      e.stopPropagation();
      const open = dom.fabMenu?.classList.toggle('open');
      dom.fabAdd.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    dom.fabAddShortcut?.addEventListener('click', () => {
      closeFab();
      openShortcutModal(null, appData.categories[0]?.id);
    });
    dom.fabAddCategory?.addEventListener('click', () => {
      closeFab();
      openCategoryModal(null);
    });
    document.addEventListener('click', e => {
      if (dom.fabMenu?.classList.contains('open') && !dom.fabMenu.contains(e.target) && e.target !== dom.fabAdd) {
        closeFab();
      }
    });
    dom.emptyAddBtn?.addEventListener('click', () => openShortcutModal(null, null));
  }

  function closeFab() {
    dom.fabMenu?.classList.remove('open');
    dom.fabAdd?.setAttribute('aria-expanded', 'false');
  }


  /* ============================================================
     SECTION 18 — MODALS (open/close + backdrop + data-close)
  ============================================================ */

  function openModal(modalEl) {
    if (!modalEl) return;
    closeAllModals();
    modalEl.classList.add('active');
    modalEl.setAttribute('aria-hidden', 'false');
    dom.overlayBackdrop && (dom.overlayBackdrop.classList.add('active'));
    // Focus first input
    setTimeout(() => {
      const first = modalEl.querySelector('input, select, textarea, button');
      first?.focus();
    }, 50);
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    dom.overlayBackdrop && (dom.overlayBackdrop.classList.remove('active'));
  }

  function closeAllModals() {
    $$('.modal').forEach(m => {
      m.classList.remove('active');
      m.setAttribute('aria-hidden', 'true');
    });
    if (dom.overlayBackdrop) dom.overlayBackdrop.classList.remove('active');
  }

  function initModalDismiss() {
    // data-close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.close;
        closeModal($(targetId));
      });
    });
    // Backdrop click
    dom.overlayBackdrop?.addEventListener('click', () => {
      if (dom.settingsPanel?.classList.contains('open')) {
        closeSettings();
      } else {
        closeAllModals();
      }
    });
    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (dom.settingsPanel?.classList.contains('open')) {
          closeSettings();
        } else {
          closeAllModals();
        }
        hideContextMenu();
        hideMoveMenu();
        closeFab();
      }
    });
  }


  /* ============================================================
     SECTION 19 — SETTINGS PANEL
  ============================================================ */

  function initSettings() {
    dom.settingsToggle?.addEventListener('click', () => {
      const isOpen = dom.settingsPanel?.classList.toggle('open');
      dom.overlayBackdrop && (dom.overlayBackdrop.classList.toggle('active', isOpen));
    });

    dom.closeSettings?.addEventListener('click', closeSettings);

    // Theme buttons
    $$('[data-theme-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        appSettings.theme = btn.dataset.themeChoice;
        saveSettings();
        applyTheme(appSettings.theme);
      });
    });

    // BG URL
    dom.bgUrlApplyBtn?.addEventListener('click', () => {
      appSettings.bgUrl = dom.bgUrlInput.value.trim();
      saveSettings();
      applyBackground();
      showToast('Background applied');
    });

    // BG file upload
    dom.bgFileInput?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        appSettings.bgUrl = ev.target.result;
        saveSettings();
        if (dom.bgUrlInput) dom.bgUrlInput.value = '';
        applyBackground();
        showToast('Background image set');
      };
      reader.readAsDataURL(file);
    });

    // Blur slider
    dom.blurRange?.addEventListener('input', () => {
      appSettings.bgBlur = parseInt(dom.blurRange.value, 10);
      if (dom.blurValue) dom.blurValue.textContent = appSettings.bgBlur + 'px';
      saveSettings();
      applyBackground();
    });

    // Brightness slider
    dom.brightnessRange?.addEventListener('input', () => {
      appSettings.bgBrightness = parseInt(dom.brightnessRange.value, 10);
      if (dom.brightnessValue) dom.brightnessValue.textContent = appSettings.bgBrightness + '%';
      saveSettings();
      applyBackground();
    });

    // BG reset
    dom.bgResetBtn?.addEventListener('click', () => {
      appSettings.bgUrl = '';
      appSettings.bgBlur = 0;
      appSettings.bgBrightness = 80;
      saveSettings();
      syncSettingsUI();
      showToast('Background reset');
    });

    // Export
    dom.exportDataBtn?.addEventListener('click', exportData);

    // Import
    dom.importFileInput?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      importData(file);
      e.target.value = '';
    });

    // Backup now
    dom.backupNowBtn?.addEventListener('click', () => {
      const backup = { data: deepClone(appData), settings: deepClone(appSettings), timestamp: new Date().toISOString() };
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      updateLastBackupText();
      showToast('Backup saved');
    });

    // Restore backup
    dom.restoreBackupBtn?.addEventListener('click', () => {
      confirmAction('Restore Backup', 'Restore the last backup? Current data will be replaced.', restoreBackup);
    });

    // Reset all
    dom.resetAllBtn?.addEventListener('click', () => {
      confirmAction('Reset Everything', 'Delete all shortcuts, categories, and settings? This cannot be undone.', resetAll);
    });
  }

  function closeSettings() {
    dom.settingsPanel?.classList.remove('open');
    if (dom.overlayBackdrop) dom.overlayBackdrop.classList.remove('active');
  }


  /* ============================================================
     SECTION 20 — IMPORT / EXPORT / BACKUP / RESET
  ============================================================ */

  function exportData() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: appData,
      settings: appSettings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `newtab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const payload = JSON.parse(ev.target.result);
        if (payload.data) {
          appData     = payload.data;
          if (payload.settings) appSettings = Object.assign({}, DEFAULT_SETTINGS, payload.settings);
          saveData();
          saveSettings();
          syncSettingsUI();
          renderAll();
          showToast('Data imported successfully');
        } else {
          showToast('Invalid backup file', 'error');
        }
      } catch {
        showToast('Could not parse file', 'error');
      }
    };
    reader.readAsText(file);
  }

  function restoreBackup() {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) { showToast('No backup found', 'error'); return; }
    try {
      const backup = JSON.parse(raw);
      appData     = backup.data;
      appSettings = Object.assign({}, DEFAULT_SETTINGS, backup.settings);
      saveData();
      saveSettings();
      syncSettingsUI();
      renderAll();
      showToast('Backup restored');
    } catch {
      showToast('Backup corrupted', 'error');
    }
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    appData     = deepClone(DEFAULT_DATA);
    appSettings = deepClone(DEFAULT_SETTINGS);
    saveData();
    saveSettings();
    syncSettingsUI();
    renderAll();
    showToast('Everything reset to defaults');
  }

  function updateLastBackupText() {
    if (!dom.lastBackupText) return;
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) { dom.lastBackupText.textContent = 'No backup yet'; return; }
    try {
      const b = JSON.parse(raw);
      dom.lastBackupText.textContent = 'Last backup: ' + new Date(b.timestamp).toLocaleString();
    } catch {
      dom.lastBackupText.textContent = 'Backup data invalid';
    }
  }


  /* ============================================================
     SECTION 21 — TOAST NOTIFICATIONS
  ============================================================ */

  function showToast(message, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    dom.toastContainer.appendChild(toast);
    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
  }


  /* ============================================================
     SECTION 22 — UTILITY
  ============================================================ */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  /* ============================================================
     SECTION 23 — KEYBOARD SHORTCUTS (global)
  ============================================================ */

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Ignore when typing in inputs
      if (e.target.matches('input, textarea, select')) return;

      // Ctrl/Cmd + K → focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dom.searchInput?.focus();
      }
      // Ctrl/Cmd + Shift + A → add shortcut
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        openShortcutModal(null, appData.categories[0]?.id);
      }
      // Ctrl/Cmd + Shift + C → add category
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        openCategoryModal(null);
      }
      // Ctrl/Cmd + , → settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        dom.settingsToggle?.click();
      }
    });
  }


  /* ============================================================
     SECTION 24 — INIT
  ============================================================ */

  function init() {
    loadData();
    loadSettings();
    syncSettingsUI();

    // Clock — tick every second
    updateClock();
    setInterval(updateClock, 1000);

    // Init modules
    initSearch();
    initShortcutModal();
    initCategoryModal();
    initConfirmModal();
    initContextMenu();
    initMoveMenu();
    initFab();
    initModalDismiss();
    initSettings();
    initKeyboardShortcuts();

    // First render
    renderAll();

    // Update smart sections every minute (recent, most-used stay fresh)
    setInterval(renderSmartSections, 60_000);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
