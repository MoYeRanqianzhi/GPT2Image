import { iconDownload, iconEdit, iconExpand } from '../icons.js';

export function renderImageCard(imageBase64, { size = '1024x1024', onEdit, onFullscreen } = {}) {
  const card = document.createElement('div');
  card.className = 'image-card';

  const img = document.createElement('img');
  img.src = `data:image/png;base64,${imageBase64}`;
  img.alt = 'Generated image';
  img.loading = 'lazy';

  const overlay = document.createElement('div');
  overlay.className = 'image-card-overlay';

  const badge = document.createElement('span');
  badge.className = 'image-card-badge';
  badge.textContent = size;

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'image-card-btn download';
  downloadBtn.innerHTML = iconDownload().replace('width="24" height="24"', 'width="14" height="14"');
  downloadBtn.title = 'Download';

  const editBtn = document.createElement('button');
  editBtn.className = 'image-card-btn edit';
  editBtn.innerHTML = `${iconEdit().replace('width="24" height="24"', 'width="12" height="12"')} Edit`;
  editBtn.title = 'Edit with this image as reference';

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'image-card-btn fullscreen';
  fullscreenBtn.innerHTML = iconExpand().replace('width="24" height="24"', 'width="14" height="14"');
  fullscreenBtn.title = 'Fullscreen';

  overlay.appendChild(badge);
  overlay.appendChild(downloadBtn);
  overlay.appendChild(editBtn);
  overlay.appendChild(fullscreenBtn);

  card.appendChild(img);
  card.appendChild(overlay);

  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `gpt2image-${Date.now()}.png`;
    a.click();
  });

  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(img.src);
  });

  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onFullscreen) onFullscreen(img.src);
  });

  card.addEventListener('click', () => {
    if (onFullscreen) onFullscreen(img.src);
  });

  return card;
}
