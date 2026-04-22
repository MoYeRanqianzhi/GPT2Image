import { iconPlus, iconSend, iconChevronDown } from '../icons.js';

const SIZES = ['1024x1024', '1024x1536', '1536x1024'];

export function renderInputBar(container, { placeholder = 'Describe the image you want...', onSend }) {
  let selectedSize = SIZES[0];
  let attachedImages = [];

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

  const previewRow = document.createElement('div');
  previewRow.style.cssText = 'display:none;flex-wrap:wrap;gap:4px;width:100%;';

  const sizeBtn = document.createElement('button');
  sizeBtn.className = 'size-selector';
  sizeBtn.textContent = '1024²';
  sizeBtn.title = 'Image size';

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
    onSend({ prompt, size: selectedSize, images: [...attachedImages] });
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
    textInput.style.height = Math.min(textInput.scrollHeight, 120) + 'px';
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
        thumb.style.cssText = 'width:36px;height:36px;border-radius:4px;overflow:hidden;position:relative;cursor:pointer;';
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

  sizeBtn.addEventListener('click', () => {
    const idx = SIZES.indexOf(selectedSize);
    selectedSize = SIZES[(idx + 1) % SIZES.length];
    const labels = { '1024x1024': '1024²', '1024x1536': '1024×1536', '1536x1024': '1536×1024' };
    sizeBtn.textContent = labels[selectedSize];
  });

  bar.appendChild(attachBtn);
  bar.appendChild(fileInput);
  bar.appendChild(textInput);
  bar.appendChild(sizeBtn);
  bar.appendChild(sendBtn);

  const wrapper = document.createElement('div');
  wrapper.appendChild(previewRow);
  wrapper.appendChild(bar);
  container.appendChild(wrapper);

  return { textInput, setImages(imgs) { attachedImages = imgs; } };
}
