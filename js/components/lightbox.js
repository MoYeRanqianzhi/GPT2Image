import { iconClose } from '../icons.js';

let current = null;

export function openLightbox(imageSrc, { prompt = '' } = {}) {
  closeLightbox();

  const lb = document.createElement('div');
  lb.className = 'lightbox fade-in';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox-close';
  closeBtn.innerHTML = iconClose().replace('width="24" height="24"', 'width="20" height="20"');

  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = prompt || 'Generated image';

  lb.appendChild(closeBtn);
  lb.appendChild(img);

  if (prompt) {
    const p = document.createElement('p');
    p.className = 'lightbox-prompt';
    p.textContent = prompt;
    lb.appendChild(p);
  }

  closeBtn.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });

  function onKey(e) {
    if (e.key === 'Escape') closeLightbox();
  }
  document.addEventListener('keydown', onKey);
  lb._onKey = onKey;

  document.body.appendChild(lb);
  current = lb;
}

export function closeLightbox() {
  if (current) {
    document.removeEventListener('keydown', current._onKey);
    current.remove();
    current = null;
  }
}
