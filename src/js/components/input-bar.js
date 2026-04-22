import { iconPlus, iconSend, iconChevronDown } from '../icons.js';

const SIZE_PRESETS = [
  { value: 'auto', label: 'Auto' },
  { value: '1024x1024', label: '1024 × 1024 (1:1)' },
  { value: '1536x1024', label: '1536 × 1024 (3:2)' },
  { value: '1024x1536', label: '1024 × 1536 (2:3)' },
  { value: '1792x1024', label: '1792 × 1024 (16:9)' },
  { value: '1024x1792', label: '1024 × 1792 (9:16)' },
  { value: '2560x1440', label: '2560 × 1440 (2K)' },
  { value: '3840x2160', label: '3840 × 2160 (4K)' },
  { value: 'custom', label: 'Custom...' },
];

const THINKING_PRESETS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'xHigh' },
];

export function renderInputBar(container, { placeholder = 'Describe the image you want...', onSend, initialThinking = 'low' }) {
  let selectedSize = 'auto';
  let selectedLabel = 'Auto';
  let selectedThinking = initialThinking;
  let attachedImages = [];
  let sizeDropdownOpen = false;
  let thinkingDropdownOpen = false;

  const wrapper = document.createElement('div');

  // --- Options row (above input bar) ---
  const optionsRow = document.createElement('div');
  optionsRow.className = 'options-row';

  // --- Thinking dropdown (ghost style, left side) ---
  const thinkingDropdown = document.createElement('div');
  thinkingDropdown.className = 'ghost-dropdown';

  const thinkingTrigger = document.createElement('button');
  thinkingTrigger.className = 'ghost-dropdown-trigger';
  const chevronSmall = iconChevronDown().replace('width="24" height="24"', 'width="12" height="12"');
  const initialThinkingLabel = THINKING_PRESETS.find(p => p.value === selectedThinking)?.label || 'Low';
  thinkingTrigger.innerHTML = `<span class="ghost-dropdown-prefix">Thinking</span><span class="ghost-dropdown-value">${initialThinkingLabel}</span><span class="ghost-dropdown-arrow">${chevronSmall}</span>`;

  const thinkingMenu = document.createElement('div');
  thinkingMenu.className = 'ghost-dropdown-menu';

  for (const preset of THINKING_PRESETS) {
    const item = document.createElement('div');
    item.className = 'ghost-dropdown-item' + (preset.value === selectedThinking ? ' active' : '');
    item.textContent = preset.label;
    item.dataset.value = preset.value;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedThinking = preset.value;
      thinkingTrigger.querySelector('.ghost-dropdown-value').textContent = preset.label;
      thinkingMenu.querySelectorAll('.ghost-dropdown-item').forEach(el => el.classList.toggle('active', el.dataset.value === preset.value));
      closeThinkingDropdown();
    });
    thinkingMenu.appendChild(item);
  }

  thinkingDropdown.appendChild(thinkingTrigger);
  thinkingDropdown.appendChild(thinkingMenu);

  function openThinkingDropdown() {
    thinkingDropdownOpen = true;
    thinkingMenu.classList.add('open');
    thinkingTrigger.classList.add('open');
  }

  function closeThinkingDropdown() {
    thinkingDropdownOpen = false;
    thinkingMenu.classList.remove('open');
    thinkingTrigger.classList.remove('open');
  }

  thinkingTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sizeDropdownOpen) closeSizeDropdown();
    thinkingDropdownOpen ? closeThinkingDropdown() : openThinkingDropdown();
  });

  // --- Size dropdown ---
  const sizeDropdown = document.createElement('div');
  sizeDropdown.className = 'size-dropdown';

  const sizeTrigger = document.createElement('button');
  sizeTrigger.className = 'size-dropdown-trigger';
  sizeTrigger.innerHTML = `<span class="size-dropdown-label">${selectedLabel}</span><span class="size-dropdown-arrow">${iconChevronDown().replace('width="24" height="24"', 'width="14" height="14"')}</span>`;

  const sizeMenu = document.createElement('div');
  sizeMenu.className = 'size-dropdown-menu';

  for (const preset of SIZE_PRESETS) {
    const item = document.createElement('div');
    item.className = 'size-dropdown-item' + (preset.value === selectedSize ? ' active' : '');
    item.textContent = preset.label;
    item.dataset.value = preset.value;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (preset.value === 'custom') {
        selectedSize = 'custom';
        selectedLabel = 'Custom';
        customRow.style.display = 'flex';
      } else {
        selectedSize = preset.value;
        selectedLabel = preset.label;
        customRow.style.display = 'none';
      }
      sizeTrigger.querySelector('.size-dropdown-label').textContent = selectedLabel;
      sizeMenu.querySelectorAll('.size-dropdown-item').forEach(el => el.classList.toggle('active', el.dataset.value === preset.value));
      closeSizeDropdown();
    });
    sizeMenu.appendChild(item);
  }

  sizeDropdown.appendChild(sizeTrigger);
  sizeDropdown.appendChild(sizeMenu);

  function openSizeDropdown() {
    sizeDropdownOpen = true;
    sizeMenu.classList.add('open');
    sizeTrigger.classList.add('open');
  }

  function closeSizeDropdown() {
    sizeDropdownOpen = false;
    sizeMenu.classList.remove('open');
    sizeTrigger.classList.remove('open');
  }

  sizeTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (thinkingDropdownOpen) closeThinkingDropdown();
    sizeDropdownOpen ? closeSizeDropdown() : openSizeDropdown();
  });

  document.addEventListener('click', () => {
    if (sizeDropdownOpen) closeSizeDropdown();
    if (thinkingDropdownOpen) closeThinkingDropdown();
  });

  // Custom size inputs
  const customRow = document.createElement('div');
  customRow.className = 'size-custom-row';
  customRow.style.display = 'none';

  const customW = document.createElement('input');
  customW.type = 'number';
  customW.className = 'size-custom-input';
  customW.placeholder = 'W';
  customW.min = 256;
  customW.max = 4096;
  customW.step = 16;

  const customX = document.createElement('span');
  customX.className = 'size-custom-x';
  customX.textContent = '×';

  const customH = document.createElement('input');
  customH.type = 'number';
  customH.className = 'size-custom-input';
  customH.placeholder = 'H';
  customH.min = 256;
  customH.max = 4096;
  customH.step = 16;

  const customHint = document.createElement('span');
  customHint.className = 'size-custom-hint';
  customHint.textContent = 'Divisible by 16';

  customRow.appendChild(customW);
  customRow.appendChild(customX);
  customRow.appendChild(customH);
  customRow.appendChild(customHint);

  function getSize() {
    if (selectedSize === 'custom') {
      const w = parseInt(customW.value) || 1024;
      const h = parseInt(customH.value) || 1024;
      return `${w}x${h}`;
    }
    return selectedSize;
  }

  function getThinking() {
    return selectedThinking;
  }

  optionsRow.appendChild(thinkingDropdown);
  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  optionsRow.appendChild(spacer);
  optionsRow.appendChild(sizeDropdown);

  // --- Preview row ---
  const previewRow = document.createElement('div');
  previewRow.style.cssText = 'display:none;flex-wrap:wrap;gap:6px;padding:0 0 8px;';

  // --- Input bar ---
  const bar = document.createElement('div');
  bar.className = 'input-bar';

  const attachBtn = document.createElement('button');
  attachBtn.className = 'input-bar-attach';
  attachBtn.innerHTML = iconPlus().replace('width="24" height="24"', 'width="16" height="16"');
  attachBtn.title = 'Attach reference image';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.style.display = 'none';

  const textInput = document.createElement('textarea');
  textInput.className = 'input-bar-text';
  textInput.placeholder = placeholder;
  textInput.rows = 1;

  const sendBtn = document.createElement('button');
  sendBtn.className = 'input-bar-send';
  sendBtn.innerHTML = iconSend().replace('width="24" height="24"', 'width="16" height="16"');
  sendBtn.disabled = true;

  function updateSendState() {
    sendBtn.disabled = !textInput.value.trim();
  }

  function doSend() {
    const prompt = textInput.value.trim();
    if (!prompt) return;
    onSend({ prompt, size: getSize(), thinking: getThinking(), images: [...attachedImages] });
    textInput.value = '';
    attachedImages = [];
    previewRow.innerHTML = '';
    previewRow.style.display = 'none';
    updateSendState();
    textInput.style.height = 'auto';
  }

  textInput.addEventListener('input', () => {
    updateSendState();
    textInput.style.height = 'auto';
    textInput.style.height = textInput.scrollHeight + 'px';
  });

  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  sendBtn.addEventListener('click', doSend);
  attachBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    for (const file of fileInput.files) {
      const reader = new FileReader();
      reader.onload = () => {
        attachedImages.push(reader.result);
        const thumb = document.createElement('div');
        thumb.style.cssText = 'width:40px;height:40px;border-radius:6px;overflow:hidden;position:relative;cursor:pointer;';
        thumb.innerHTML = `<img src="${reader.result}" style="width:100%;height:100%;object-fit:cover;">`;
        thumb.title = 'Click to remove';
        thumb.addEventListener('click', () => {
          const idx = attachedImages.indexOf(reader.result);
          if (idx >= 0) attachedImages.splice(idx, 1);
          thumb.remove();
          if (!attachedImages.length) previewRow.style.display = 'none';
        });
        previewRow.appendChild(thumb);
        previewRow.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    }
    fileInput.value = '';
  });

  bar.appendChild(attachBtn);
  bar.appendChild(fileInput);
  bar.appendChild(textInput);
  bar.appendChild(sendBtn);

  wrapper.appendChild(optionsRow);
  wrapper.appendChild(customRow);
  wrapper.appendChild(previewRow);
  wrapper.appendChild(bar);
  container.appendChild(wrapper);

  return { textInput, getThinking, setImages(imgs) { attachedImages = imgs; } };
}
