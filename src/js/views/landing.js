import { renderHeader } from '../components/header.js';
import { renderInputBar } from '../components/input-bar.js';
import { getAllImages } from '../store.js';
import { navigate } from '../router.js';
import { openLightbox } from '../components/lightbox.js';

const SUGGESTIONS = [
  'A serene mountain lake at sunset, oil painting',
  'Minimalist logo for a tech startup',
  'Cyberpunk city street in the rain, neon lights',
  'Watercolor portrait of a cat wearing glasses',
];

export function landingView(container) {
  renderHeader(container, { activeTab: 'create' });

  const main = document.createElement('div');
  main.className = 'landing fade-in';

  const logoImg = document.createElement('img');
  logoImg.src = 'assets/logo.png';
  logoImg.alt = 'GPT2IMAGE';
  logoImg.className = 'landing-logo';

  const title = document.createElement('h1');
  title.className = 'landing-title';
  title.textContent = 'What would you like to create?';

  const subtitle = document.createElement('p');
  subtitle.className = 'landing-subtitle';
  subtitle.textContent = 'Describe any image and bring it to life';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'landing-input';

  let inputBarRef = null;

  function handleSend({ prompt, size, thinking, images }) {
    navigate('create', { prompt, size, thinking, images, autoSend: true });
  }

  inputBarRef = renderInputBar(inputWrap, {
    placeholder: 'Describe the image you want...',
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
      inputBarRef.textInput.value = s;
      inputBarRef.textInput.focus();
      inputBarRef.textInput.dispatchEvent(new Event('input'));
    });
    chips.appendChild(chip);
  }

  main.appendChild(logoImg);
  main.appendChild(title);
  main.appendChild(subtitle);
  main.appendChild(inputWrap);
  main.appendChild(chips);

  const recentImages = getAllImages().slice(0, 6);
  if (recentImages.length) {
    const recentRow = document.createElement('div');
    recentRow.className = 'recent-row';
    const label = document.createElement('div');
    label.className = 'recent-label';
    label.textContent = 'Recent creations';
    const grid = document.createElement('div');
    grid.className = 'recent-grid';
    for (const img of recentImages) {
      const thumb = document.createElement('div');
      thumb.className = 'recent-thumb';
      thumb.innerHTML = `<img src="data:image/png;base64,${img.imageBase64}" alt="${img.prompt}">`;
      thumb.addEventListener('click', () => {
        openLightbox(`data:image/png;base64,${img.imageBase64}`, { prompt: img.prompt });
      });
      grid.appendChild(thumb);
    }
    recentRow.appendChild(label);
    recentRow.appendChild(grid);
    main.appendChild(recentRow);
  }

  container.appendChild(main);
}
