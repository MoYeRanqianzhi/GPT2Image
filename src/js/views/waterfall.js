import { renderHeader } from '../components/header.js';
import { renderInputBar } from '../components/input-bar.js';
import { showWarningPopup, hasSeenFirstTimeWarning } from '../components/warning-popup.js';
import { generateImage } from '../api.js';
import { saveConversation, generateId, getConfig } from '../store.js';
import { openLightbox } from '../components/lightbox.js';
import { showToast } from '../components/toast.js';
import { renderMarkdown } from '../markdown.js';
import { iconSave, iconDownload, iconExpand, iconChevronDown, iconRetry } from '../icons.js';
import { navigate } from '../router.js';

const TIER_PRESETS = [
  { value: 1, label: '1' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
];

const SUGGESTIONS = [
  'A serene mountain lake at sunset, oil painting',
  'Minimalist logo for a tech startup',
  'Cyberpunk city street in the rain, neon lights',
  'Watercolor portrait of a cat wearing glasses',
];

export function waterfallView(container) {
  const config = getConfig();
  if (!config) {
    navigate('settings');
    return;
  }

  renderHeader(container, { activeTab: 'waterfall' });

  let currentTier = 5;
  let currentPrompt = '';
  let currentSize = 'auto';
  let currentThinking = '';
  let activeRequests = 0;
  let sessionCount = 0;
  const milestoneShown = new Set();
  const abortControllers = [];

  const wrapper = document.createElement('div');
  wrapper.className = 'waterfall-wrapper';

  // --- Tier bar (top, always visible) ---
  const tierBar = document.createElement('div');
  tierBar.className = 'waterfall-tier-bar';

  const tierDropdown = document.createElement('div');
  tierDropdown.className = 'ghost-dropdown';
  let tierDropdownOpen = false;

  const tierTrigger = document.createElement('button');
  tierTrigger.className = 'ghost-dropdown-trigger';
  const chevron = iconChevronDown().replace('width="24" height="24"', 'width="12" height="12"');
  tierTrigger.innerHTML = `<span class="ghost-dropdown-prefix">Batch</span><span class="ghost-dropdown-value">${currentTier}</span><span class="ghost-dropdown-arrow">${chevron}</span>`;

  const tierMenu = document.createElement('div');
  tierMenu.className = 'ghost-dropdown-menu';

  for (const preset of TIER_PRESETS) {
    const item = document.createElement('div');
    item.className = 'ghost-dropdown-item' + (preset.value === currentTier ? ' active' : '');
    item.textContent = preset.label;
    item.dataset.value = preset.value;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      currentTier = preset.value;
      tierTrigger.querySelector('.ghost-dropdown-value').textContent = preset.label;
      tierMenu.querySelectorAll('.ghost-dropdown-item').forEach(el =>
        el.classList.toggle('active', Number(el.dataset.value) === preset.value)
      );
      closeTierDropdown();
    });
    tierMenu.appendChild(item);
  }

  tierDropdown.appendChild(tierTrigger);
  tierDropdown.appendChild(tierMenu);

  function closeTierDropdown() {
    tierDropdownOpen = false;
    tierMenu.classList.remove('open');
    tierTrigger.classList.remove('open');
  }

  tierTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    tierDropdownOpen = !tierDropdownOpen;
    tierMenu.classList.toggle('open', tierDropdownOpen);
    tierTrigger.classList.toggle('open', tierDropdownOpen);
  });

  document.addEventListener('click', () => {
    if (tierDropdownOpen) closeTierDropdown();
  });

  tierBar.appendChild(tierDropdown);

  // --- Landing section (centered input, idle state) ---
  const landingSection = document.createElement('div');
  landingSection.className = 'waterfall-landing';

  const title = document.createElement('h1');
  title.className = 'landing-title';
  title.textContent = 'What world will you flood with art?';

  const subtitle = document.createElement('p');
  subtitle.className = 'landing-subtitle';
  subtitle.textContent = 'One prompt, endless creations';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'landing-input';

  const inputBarResult = renderInputBar(inputWrap, {
    placeholder: 'Describe the images you want to generate...',
    onSend: handleSend,
  });

  const chips = document.createElement('div');
  chips.className = 'suggestion-chips';
  for (const s of SUGGESTIONS) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = s.length > 40 ? s.slice(0, 40) + '...' : s;
    chip.title = s;
    chip.addEventListener('click', () => {
      inputBarResult.textInput.value = s;
      inputBarResult.textInput.focus();
      inputBarResult.textInput.dispatchEvent(new Event('input'));
    });
    chips.appendChild(chip);
  }

  landingSection.appendChild(title);
  landingSection.appendChild(subtitle);
  landingSection.appendChild(inputWrap);
  landingSection.appendChild(chips);

  // --- Scroll area + grid (active state, initially hidden) ---
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'waterfall-scroll';
  scrollContainer.style.display = 'none';

  const grid = document.createElement('div');
  grid.className = 'waterfall-grid';

  const loadTrigger = document.createElement('div');
  loadTrigger.className = 'waterfall-load-trigger';
  loadTrigger.innerHTML = `<div class="waterfall-load-arrow">↓</div><div class="waterfall-load-text">Scroll to generate more</div>`;

  scrollContainer.appendChild(grid);
  scrollContainer.appendChild(loadTrigger);

  // --- Assemble ---
  wrapper.appendChild(tierBar);
  wrapper.appendChild(landingSection);
  wrapper.appendChild(scrollContainer);
  container.appendChild(wrapper);

  // --- First-time warning ---
  if (!hasSeenFirstTimeWarning()) {
    showWarningPopup({ type: 'first-time', tier: currentTier });
  }

  // --- Pull-to-load via IntersectionObserver on trigger zone ---
  let loadingMore = false;

  function setTriggerLoading(loading) {
    if (loading) {
      loadTrigger.classList.add('loading');
      loadTrigger.querySelector('.waterfall-load-text').textContent = 'Generating...';
      loadTrigger.querySelector('.waterfall-load-arrow').textContent = '⟳';
    } else {
      loadTrigger.classList.remove('loading');
      loadTrigger.querySelector('.waterfall-load-text').textContent = 'Scroll to generate more';
      loadTrigger.querySelector('.waterfall-load-arrow').textContent = '↓';
    }
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    if (!currentPrompt || loadingMore) return;
    if (activeRequests >= currentTier * 3) return;
    loadingMore = true;
    setTriggerLoading(true);
    triggerBatch().finally(() => {
      loadingMore = false;
      setTriggerLoading(false);
    });
  }, { root: scrollContainer, threshold: 0.1 });

  observer.observe(loadTrigger);

  // --- Handlers ---
  async function handleSend({ prompt, size, thinking }) {
    if (!prompt.trim()) return;
    currentPrompt = prompt.trim();
    currentSize = size || 'auto';
    currentThinking = thinking || inputBarResult.getThinking();

    landingSection.style.display = 'none';
    scrollContainer.style.display = '';

    await triggerBatch();
  }

  async function triggerBatch() {
    if (!currentPrompt) return;

    const tier = currentTier;
    const maxConcurrent = tier * 3;
    const batchSize = Math.min(tier, maxConcurrent - activeRequests);
    if (batchSize <= 0) return;

    const nextCount = sessionCount + batchSize;
    const thresholds = [tier * 10, tier * 100, tier * 1000];
    for (const t of thresholds) {
      if (sessionCount < t && nextCount >= t && !milestoneShown.has(t)) {
        milestoneShown.add(t);
        await showWarningPopup({ type: 'milestone', tier, count: nextCount });
      }
    }

    sessionCount += batchSize;

    const aspectRatios = ['1/1', '3/4', '4/3', '2/3'];

    for (let i = 0; i < batchSize; i++) {
      activeRequests++;
      const controller = new AbortController();
      abortControllers.push(controller);

      const ratio = aspectRatios[Math.floor(Math.random() * aspectRatios.length)];
      const card = createLoadingCard(ratio);
      grid.appendChild(card);

      generateImage({
        prompt: currentPrompt,
        size: currentSize,
        thinking: currentThinking,
        signal: controller.signal,
        onStream: (delta) => updateCardStream(card, delta),
      })
        .then((result) => finalizeCard(card, result, currentPrompt))
        .catch((err) => {
          if (err.name === 'AbortError') {
            card.remove();
          } else {
            showErrorCard(card, err.message);
          }
        })
        .finally(() => {
          activeRequests--;
          const idx = abortControllers.indexOf(controller);
          if (idx >= 0) abortControllers.splice(idx, 1);
        });
    }
  }

  // --- Card creation ---
  function createLoadingCard(aspectRatio) {
    const card = document.createElement('div');
    card.className = 'waterfall-card loading';
    card.style.aspectRatio = aspectRatio;
    return card;
  }

  function updateCardStream(card, delta) {
    if (delta.imageBase64) return;
    if (delta.text && !card._isTextMode) {
      card._isTextMode = true;
      card.classList.remove('loading');
      card.classList.add('text-card');
      card.style.aspectRatio = '';
      card.innerHTML = '<div class="waterfall-text-content"></div>';
    }
    if (card._isTextMode && delta.text) {
      card.querySelector('.waterfall-text-content').innerHTML = renderMarkdown(delta.text);
    }
  }

  function finalizeCard(card, result, prompt) {
    card.classList.remove('loading');
    card.style.aspectRatio = '';

    if (result.imageBase64) {
      card.innerHTML = '';
      const img = document.createElement('img');
      img.src = `data:image/png;base64,${result.imageBase64}`;
      img.alt = prompt;
      img.loading = 'lazy';
      card.appendChild(img);

      const overlay = document.createElement('div');
      overlay.className = 'waterfall-card-overlay';

      const saveBtn = createCardBtn(iconSave, 'Save to Gallery');
      const dlBtn = createCardBtn(iconDownload, 'Download');
      const fsBtn = createCardBtn(iconExpand, 'Fullscreen');

      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveToGallery(result.imageBase64, prompt);
        saveBtn.style.opacity = '0.5';
        saveBtn.style.pointerEvents = 'none';
      });

      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = img.src;
        a.download = `gpt2image-${Date.now()}.png`;
        a.click();
      });

      fsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(img.src, { prompt });
      });

      overlay.appendChild(saveBtn);
      overlay.appendChild(dlBtn);
      overlay.appendChild(fsBtn);
      card.appendChild(overlay);

      card.addEventListener('click', () => openLightbox(img.src, { prompt }));
    } else if (result.text) {
      card.classList.add('text-card');
      card.innerHTML = `<div class="waterfall-text-content">${renderMarkdown(result.text)}</div>`;
    }
  }

  function showErrorCard(card, message) {
    card.classList.remove('loading');
    card.classList.add('error-card');
    card.style.aspectRatio = '';
    card.innerHTML = `<div>${message}</div>`;

    const retryBtn = document.createElement('button');
    retryBtn.innerHTML = `${iconRetry().replace('width="24" height="24"', 'width="12" height="12"')} Retry`;
    retryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      card.className = 'waterfall-card loading';
      card.style.aspectRatio = '1/1';
      card.innerHTML = '';
      activeRequests++;
      const controller = new AbortController();
      abortControllers.push(controller);
      generateImage({
        prompt: currentPrompt,
        size: currentSize,
        thinking: currentThinking,
        signal: controller.signal,
        onStream: (delta) => updateCardStream(card, delta),
      })
        .then((result) => finalizeCard(card, result, currentPrompt))
        .catch((err) => {
          if (err.name !== 'AbortError') showErrorCard(card, err.message);
        })
        .finally(() => {
          activeRequests--;
          const idx = abortControllers.indexOf(controller);
          if (idx >= 0) abortControllers.splice(idx, 1);
        });
    });
    card.appendChild(retryBtn);
  }

  function createCardBtn(iconFn, title) {
    const btn = document.createElement('button');
    btn.className = 'waterfall-card-btn';
    btn.innerHTML = iconFn().replace('width="24" height="24"', 'width="14" height="14"');
    btn.title = title;
    return btn;
  }

  async function saveToGallery(imageBase64, prompt) {
    const now = Date.now();
    const conv = {
      id: generateId(),
      createdAt: now,
      messages: [
        { role: 'user', text: prompt, timestamp: now },
        {
          role: 'assistant',
          variants: [{ imageBase64, size: 'auto', timestamp: now }],
          activeVariant: 0,
          timestamp: now,
        },
      ],
    };
    await saveConversation(conv);
    showToast('Saved to Gallery');
  }

  // --- Cleanup on navigation ---
  function cleanup() {
    for (const ctrl of abortControllers) {
      ctrl.abort();
    }
    abortControllers.length = 0;
    observer.disconnect();
  }

  return cleanup;
}
