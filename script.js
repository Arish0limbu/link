'use strict';

(function () {

  /* ============================================================
     SECTION 1 — CONSTANTS & STATE
     ============================================================ */

  const STORAGE_KEY   = 'ntd_data';
  const BACKUP_KEY    = 'ntd_backup';
  const SETTINGS_KEY  = 'ntd_settings';

  const DEFAULT_SETTINGS = {
    theme:      'auto',
    bgUrl:      '',
    bgBlur:     0,
    bgBrightness: 80,
    userName:   '',
    musicUrl:   '',
    musicVolume: 50,
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

  let appData     = null;
  let appSettings = null;
  let dragSrcId   = null;
  let contextTargetId = null;


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
    brightnessValue: $('brightnessValue'),
    bgResetBtn:       $('bgResetBtn'),
    musicUrlInput:    $('musicUrlInput'),
    musicUrlApplyBtn: $('musicUrlApplyBtn'),
    musicFileInput:   $('musicFileInput'),
    musicVolume:      $('musicVolume'),
    musicVolumeValue: $('musicVolumeValue'),
    musicResetBtn:    $('musicResetBtn'),
    musicPlayer:      $('musicPlayer'),
    audioPlayer:      $('audioPlayer'),
    musicTitle:       $('musicTitle'),
    musicTime:        $('musicTime'),
    musicPlayPauseBtn: $('musicPlayPauseBtn'),
    musicPrevBtn:     $('musicPrevBtn'),
    musicNextBtn:     $('musicNextBtn'),
    musicProgress:    $('musicProgress'),
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
    contextMenu:      $('contextMenu'),
    moveMenu:         $('moveMenu'),
  };


  /* ============================================================
     SECTION 4 — THEME MANAGEMENT
     ============================================================ */

  function applyTheme(theme) {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    document.body.setAttribute('data-theme', theme);
    syncThemeButtons(theme);
  }

  function syncThemeButtons(theme) {
    $$('[data-theme-choice]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeChoice === theme || (theme === 'auto' && btn.dataset.themeChoice === 'dark'));
    });
  }


  /* ============================================================
     SECTION 5 — CLOCK & GREETING
     ============================================================ */

  function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    if (dom.clockTime) {
      dom.clockTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (dom.greetingPrefix) {
      let greeting = 'Good day';
      if (hours < 12) greeting = 'Good morning';
      else if (hours < 18) greeting = 'Good afternoon';
      else greeting = 'Good evening';
      dom.greetingPrefix.textContent = greeting;
    }
    if (dom.greetingName && appSettings.userName) {
      dom.greetingName.textContent = appSettings.userName;
    }
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

    document.addEventListener('click', e => {
      if (!dom.searchResults) return;
      if (!dom.searchForm.contains(e.target)) {
        closeSearchResults();
      }
    });
  }

  let searchResultIndex = -1;

  function onSearchInput(e) {
    const q = e.target.value.trim();
    if (!q) {
      closeSearchResults();
      return;
    }
    renderSearchResults(q);
  }

  function onSearchKeydown(e) {
    if (!dom.searchResults || dom.searchResults.style.display === 'none') return;
    const items = dom.searchResults.querySelectorAll('.search-result-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchResultIndex = Math.min(searchResultIndex + 1, items.length - 1);
      highlightResult(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchResultIndex = Math.max(searchResultIndex - 1, 0);
      highlightResult(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResultIndex >= 0 && items[searchResultIndex]) {
        items[searchResultIndex].click();
      } else {
        performSearch(dom.searchInput.value.trim());
      }
    }
  }

  function highlightResult(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === searchResultIndex));
  }

  function renderSearchResults(q) {
    if (!dom.searchResults) return;
    const matches = appData.shortcuts.filter(sc =>
      sc.title.toLowerCase().includes(q.toLowerCase()) ||
      sc.url.toLowerCase().includes(q.toLowerCase())
    );

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
      });
    });
  }

  function performSearch(q) {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
  }

  function closeSearchResults() {
    if (dom.searchResults) dom.searchResults.style.display = 'none';
    searchResultIndex = -1;
  }

  function highlight(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  function truncateUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname;
    } catch {
      return url;
    }
  }


  /* ============================================================
     SECTION 7 — SMART SECTIONS (favorites, recent, most-used)
     ============================================================ */

  function renderSmartSections() {
    renderFavorites();
    renderRecent();
    renderMostUsed();
  }

  function renderFavorites() {
    if (!dom.favoritesGrid) return;
    const favs = appData.shortcuts.filter(sc => sc.favorite);
    if (dom.favoritesSection) dom.favoritesSection.hidden = !favs.length;
    dom.favoritesGrid.innerHTML = favs.map(sc => shortcutCardHTML(sc, 'favorites')).join('');
    attachCardListeners(dom.favoritesGrid);
  }

  function renderRecent() {
    if (!dom.recentGrid) return;
    const recent = [...appData.shortcuts]
      .filter(sc => sc.lastUsed)
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 8);
    if (dom.recentSection) dom.recentSection.hidden = !recent.length;
    dom.recentGrid.innerHTML = recent.map(sc => shortcutCardHTML(sc, 'recent')).join('');
    attachCardListeners(dom.recentGrid);
  }

  function renderMostUsed() {
    if (!dom.mostUsedGrid) return;
    const mostUsed = [...appData.shortcuts]
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 8);
    if (dom.mostUsedSection) dom.mostUsedSection.hidden = !mostUsed.length || !mostUsed[0].useCount;
    dom.mostUsedGrid.innerHTML = mostUsed.map(sc => shortcutCardHTML(sc, 'mostused')).join('');
    attachCardListeners(dom.mostUsedGrid);
  }


  /* ============================================================
     SECTION 8 — CATEGORIES
     ============================================================ */

  function renderCategories() {
    if (!dom.categoriesContainer) return;
    const sorted = [...appData.categories].sort((a, b) => a.order - b.order);
    dom.categoriesContainer.innerHTML = sorted.map(cat => categoryBlockHTML(cat)).join('');
    attachCategoryListeners();
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

  function attachCategoryListeners() {
    const sorted = [...appData.categories].sort((a, b) => a.order - b.order);
    sorted.forEach(cat => {
      const block = dom.categoriesContainer.querySelector(`[data-cat-id="${cat.id}"]`);
      if (!block) return;
      block.querySelector('.category-collapse-btn')?.addEventListener('click', () => {
        block.classList.toggle('collapsed');
      });
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
      block.querySelector('.category-menu-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        showCategoryMenu(cat.id, e.clientX, e.clientY);
      });
      attachCardListeners(block);
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


  /* ============================================================
     SECTION 9 — SHORTCUT CARDS
     ============================================================ */

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
      card.addEventListener('contextmenu', e => {
        e.preventDefault();
        showContextMenu(card.dataset.id, e.clientX, e.clientY);
      });
      let longPressTimer;
      card.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') {
          longPressTimer = setTimeout(() => showContextMenu(card.dataset.id, e.clientX, e.clientY), 600);
        }
      });
      card.addEventListener('pointerup', () => clearTimeout(longPressTimer));
      card.addEventListener('pointermove', () => clearTimeout(longPressTimer));
    });

    container.querySelectorAll('.card-fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.id);
      });
    });

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
    return appData.shortcuts.find(sc => sc.id === id);
  }

  function getCategory(id) {
    return appData.categories.find(c => c.id === id);
  }

  function recordUsage(id) {
    const sc = getShortcut(id);
    if (!sc) return;
    sc.useCount = (sc.useCount || 0) + 1;
    sc.lastUsed = new Date().toISOString();
    saveData();
  }

  function toggleFavorite(id) {
    const sc = getShortcut(id);
    if (!sc) return;
    sc.favorite = !sc.favorite;
    saveData();
    renderAll();
    showToast(sc.favorite ? 'Added to favorites' : 'Removed from favorites');
  }

  function moveShortcutToCategory(shortcutId, categoryId) {
    const sc = getShortcut(shortcutId);
    if (!sc) return;
    sc.category = categoryId;
    saveData();
    renderAll();
    showToast('Shortcut moved');
  }

  function deleteShortcut(id) {
    appData.shortcuts = appData.shortcuts.filter(sc => sc.id !== id);
    saveData();
    renderAll();
    showToast('Shortcut deleted');
  }

  function createShortcut(data) {
    const sc = {
      id: uid(),
      title: data.title,
      url: data.url,
      icon: data.icon || '',
      category: data.category || '',
      favorite: data.favorite || false,
      description: data.description || '',
      useCount: 0,
      lastUsed: null,
    };
    appData.shortcuts.push(sc);
    saveData();
    renderAll();
    showToast('Shortcut created');
  }

  function updateShortcut(id, data) {
    const sc = getShortcut(id);
    if (!sc) return;
    Object.assign(sc, data);
    saveData();
    renderAll();
    showToast('Shortcut updated');
  }


  /* ============================================================
     SECTION 11 — CATEGORY CRUD
     ============================================================ */

  function createCategory(name) {
    const cat = {
      id: uid(),
      name: name,
      order: appData.categories.length,
    };
    appData.categories.push(cat);
    saveData();
    renderAll();
    showToast('Category created');
  }

  function updateCategory(id, name) {
    const cat = getCategory(id);
    if (!cat) return;
    cat.name = name;
    saveData();
    renderAll();
    showToast('Category updated');
  }

  function deleteCategory(id) {
    appData.shortcuts.forEach(sc => {
      if (sc.category === id) sc.category = '';
    });
    appData.categories = appData.categories.filter(c => c.id !== id);
    saveData();
    renderAll();
    showToast('Category deleted');
  }


  /* ============================================================
     SECTION 12 — MODALS
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

    dom.shortcutIcon?.addEventListener('input', () => {
      updateIconPreview(dom.shortcutIcon.value.trim());
    });

    dom.fetchIconBtn?.addEventListener('click', () => {
      const url = dom.shortcutUrl.value.trim();
      if (!url) { showToast('Enter a URL first', 'error'); return; }
      const favicon = getFavicon(url);
      dom.shortcutIcon.value = favicon;
      updateIconPreview(favicon);
    });

    dom.shortcutUrl?.addEventListener('blur', () => {
      if (!dom.shortcutTitle.value.trim() && dom.shortcutUrl.value.trim()) {
        try {
          const u = new URL(dom.shortcutUrl.value.trim());
          dom.shortcutTitle.value = u.hostname.replace(/^www\./, '');
        } catch { /* ignore */ }
      }
    });

    dom.shortcutForm.addEventListener('submit', e => {
      e.preventDefault();
      let url = dom.shortcutUrl.value.trim();
      if (!url) { showToast('URL is required', 'error'); return; }
      if (!url.startsWith('http')) url = 'https://' + url;
      const data = {
        title: dom.shortcutTitle.value.trim(),
        url: url,
        icon: dom.shortcutIcon.value.trim(),
        category: dom.shortcutCategory.value,
        description: dom.shortcutDescription.value.trim(),
        favorite: dom.shortcutFavorite.checked,
      };
      const editingId = dom.shortcutEditingId.value;
      if (editingId) {
        updateShortcut(editingId, data);
      } else {
        createShortcut(data);
      }
      closeModal(dom.shortcutModal);
    });
  }

  function openCategoryModal(id) {
    if (id) {
      const cat = getCategory(id);
      if (!cat) return;
      dom.categoryModalTitle.textContent = 'Rename Category';
      dom.categoryEditingId.value = cat.id;
      dom.categoryNameInput.value = cat.name;
    } else {
      dom.categoryModalTitle.textContent = 'Add Category';
      dom.categoryEditingId.value = '';
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
      const editingId = dom.categoryEditingId.value;
      if (editingId) {
        updateCategory(editingId, name);
      } else {
        createCategory(name);
      }
      closeModal(dom.categoryModal);
    });
  }

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
     SECTION 13 — CONTEXT MENU
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

      const cat = appData.categories.find(c => c.id === contextTargetId);
      if (cat) {
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


  /* ============================================================
     SECTION 14 — MOVE MENU
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
     SECTION 15 — FAB
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
     SECTION 16 — MODALS (open/close + backdrop + data-close)
     ============================================================ */

  function openModal(modalEl) {
    if (!modalEl) return;
    closeAllModals();
    modalEl.classList.add('active');
    modalEl.setAttribute('aria-hidden', 'false');
    dom.overlayBackdrop && (dom.overlayBackdrop.classList.add('active'));
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
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.close;
        closeModal($(targetId));
      });
    });
    dom.overlayBackdrop?.addEventListener('click', () => {
      if (dom.settingsPanel?.classList.contains('open')) {
        closeSettings();
      } else {
        closeAllModals();
      }
    });
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
     SECTION 17 — SETTINGS PANEL
     ============================================================ */

  function initSettings() {
    dom.settingsToggle?.addEventListener('click', () => {
      const isOpen = dom.settingsPanel?.classList.toggle('open');
      dom.overlayBackdrop && (dom.overlayBackdrop.classList.toggle('active', isOpen));
    });

    dom.closeSettings?.addEventListener('click', closeSettings);

    $$('[data-theme-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        appSettings.theme = btn.dataset.themeChoice;
        saveSettings();
        applyTheme(appSettings.theme);
      });
    });

    dom.bgUrlApplyBtn?.addEventListener('click', () => {
      appSettings.bgUrl = dom.bgUrlInput.value.trim();
      saveSettings();
      applyBackground();
      showToast('Background applied');
    });

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

    dom.blurRange?.addEventListener('input', () => {
      appSettings.bgBlur = parseInt(dom.blurRange.value, 10);
      if (dom.blurValue) dom.blurValue.textContent = appSettings.bgBlur + 'px';
      saveSettings();
      applyBackground();
    });

    dom.brightnessRange?.addEventListener('input', () => {
      appSettings.bgBrightness = parseInt(dom.brightnessRange.value, 10);
      if (dom.brightnessValue) dom.brightnessValue.textContent = appSettings.bgBrightness + '%';
      saveSettings();
      applyBackground();
    });

    dom.bgResetBtn?.addEventListener('click', () => {
      appSettings.bgUrl = '';
      appSettings.bgBlur = 0;
      appSettings.bgBrightness = 80;
      saveSettings();
      syncSettingsUI();
      showToast('Background reset');
    });

    dom.musicUrlApplyBtn?.addEventListener('click', () => {
      const url = dom.musicUrlInput.value.trim();
      if (url) {
        appSettings.musicUrl = url;
        saveSettings();
        if (typeof loadMusic === 'function') loadMusic(url);
        showToast('Music applied');
      }
    });

    dom.musicFileInput?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        appSettings.musicUrl = ev.target.result;
        saveSettings();
        if (dom.musicUrlInput) dom.musicUrlInput.value = '';
        if (typeof loadMusic === 'function') loadMusic(ev.target.result);
        showToast('Music file loaded');
      };
      reader.readAsDataURL(file);
    });

    dom.musicVolume?.addEventListener('input', () => {
      appSettings.musicVolume = parseInt(dom.musicVolume.value, 10);
      if (dom.musicVolumeValue) dom.musicVolumeValue.textContent = appSettings.musicVolume + '%';
      saveSettings();
      if (dom.audioPlayer) dom.audioPlayer.volume = appSettings.musicVolume / 100;
    });

    dom.musicResetBtn?.addEventListener('click', () => {
      appSettings.musicUrl = '';
      saveSettings();
      if (typeof stopMusic === 'function') stopMusic();
      showToast('Music stopped');
    });

    dom.exportDataBtn?.addEventListener('click', exportData);

    dom.importFileInput?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      importData(file);
      e.target.value = '';
    });

    dom.backupNowBtn?.addEventListener('click', () => {
      const backup = { data: deepClone(appData), settings: deepClone(appSettings), timestamp: new Date().toISOString() };
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      updateLastBackupText();
      showToast('Backup saved');
    });

    dom.restoreBackupBtn?.addEventListener('click', () => {
      confirmAction('Restore Backup', 'Restore the last backup? Current data will be replaced.', restoreBackup);
    });

    dom.resetAllBtn?.addEventListener('click', () => {
      confirmAction('Reset Everything', 'Delete all shortcuts, categories, and settings? This cannot be undone.', resetAll);
    });
  }

  function closeSettings() {
    dom.settingsPanel?.classList.remove('open');
    if (dom.overlayBackdrop) dom.overlayBackdrop.classList.remove('active');
  }


  /* ============================================================
     SECTION 18 — IMPORT / EXPORT / BACKUP / RESET
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
    a.href = url;
    a.download = `link-hub-backup-${new Date().toISOString().slice(0,10)}.json`;
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
    showToast('Everything reset');
  }

  function updateLastBackupText() {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) {
      if (dom.lastBackupText) dom.lastBackupText.textContent = 'No backup saved yet.';
      if (dom.restoreBackupBtn) dom.restoreBackupBtn.disabled = true;
      return;
    }
    try {
      const backup = JSON.parse(raw);
      const date = new Date(backup.timestamp).toLocaleString();
      if (dom.lastBackupText) dom.lastBackupText.textContent = `Last backup: ${date}`;
      if (dom.restoreBackupBtn) dom.restoreBackupBtn.disabled = false;
    } catch {
      if (dom.lastBackupText) dom.lastBackupText.textContent = 'Backup corrupted';
    }
  }


  /* ============================================================
     SECTION 19 — BACKGROUND
     ============================================================ */

  function applyBackground() {
    if (!dom.bgLayer) return;
    if (appSettings.bgUrl) {
      dom.bgLayer.style.backgroundImage = `url(${appSettings.bgUrl})`;
      dom.bgLayer.style.backgroundSize = 'cover';
      dom.bgLayer.style.backgroundPosition = 'center';
    } else {
      dom.bgLayer.style.backgroundImage = '';
    }
    document.documentElement.style.setProperty('--bg-blur', appSettings.bgBlur + 'px');
    document.documentElement.style.setProperty('--bg-brightness', appSettings.bgBrightness + '%');
  }

  function syncSettingsUI() {
    if (dom.bgUrlInput) dom.bgUrlInput.value = appSettings.bgUrl || '';
    if (dom.blurRange) dom.blurRange.value = appSettings.bgBlur;
    if (dom.blurValue) dom.blurValue.textContent = appSettings.bgBlur + 'px';
    if (dom.brightnessRange) dom.brightnessRange.value = appSettings.bgBrightness;
    if (dom.brightnessValue) dom.brightnessValue.textContent = appSettings.bgBrightness + '%';
    if (dom.musicVolume) dom.musicVolume.value = appSettings.musicVolume;
    if (dom.musicVolumeValue) dom.musicVolumeValue.textContent = appSettings.musicVolume + '%';
    applyTheme(appSettings.theme);
    applyBackground();
    updateLastBackupText();
  }


  /* ============================================================
     SECTION 20 — TOASTS
     ============================================================ */

  function showToast(message, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    dom.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
  }


  /* ============================================================
     SECTION 21 — UTILITY
     ============================================================ */

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getFavicon(url) {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch {
      return '';
    }
  }

  function getIconSrc(sc) {
    if (sc.icon) return sc.icon;
    return getFavicon(sc.url);
  }

  function getInitials(title) {
    return title.slice(0, 2).toUpperCase();
  }


  /* ============================================================
     SECTION 22 — KEYBOARD SHORTCUTS
     ============================================================ */

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dom.searchInput?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        openShortcutModal(null, appData.categories[0]?.id);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        openCategoryModal(null);
      }
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        dom.settingsToggle?.click();
      }
    });
  }


  /* ============================================================
     SECTION 23 — INIT
     ============================================================ */

  function renderAll() {
    renderSmartSections();
    renderCategories();
    checkEmptyState();
  }

  function init() {
    loadData();
    loadSettings();
    syncSettingsUI();

    updateClock();
    setInterval(updateClock, 1000);

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

    renderAll();

    setInterval(renderSmartSections, 60_000);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
