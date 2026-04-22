import { renderHeader } from '../components/header.js';
import { renderImageCard } from '../components/image-card.js';
import { openLightbox } from '../components/lightbox.js';
import { getAllImages } from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export function galleryView(container) {
  renderHeader(container, { activeTab: 'gallery' });

  const images = getAllImages();

  if (!images.length) {
    const empty = document.createElement('div');
    empty.className = 'landing fade-in';
    empty.innerHTML = `
      <div style="color:var(--text-muted);font-size:48px;margin-bottom:16px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </div>
      <p style="color:var(--text-tertiary);font-size:15px;">No images yet</p>
      <p style="color:var(--text-muted);font-size:13px;margin-top:4px;">Create your first image to see it here</p>
    `;
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gallery-grid fade-in';

  for (const img of images) {
    const card = renderImageCard(img.imageBase64, {
      size: img.size,
      onEdit: (src) => {
        navigate('create', { images: [src] });
        showToast('Reference image attached');
      },
      onFullscreen: (src) => {
        openLightbox(src, { prompt: img.prompt });
      },
    });
    grid.appendChild(card);
  }

  container.appendChild(grid);
}
