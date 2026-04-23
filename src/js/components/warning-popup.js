import { iconAlertTriangle } from '../icons.js';

const STORAGE_KEY = 'gpt2image_waterfall_warned';

const TEXTS = {
  en: {
    'first-time': {
      title: 'Credit Consumption Warning',
      body: (tier) => `Waterfall mode generates <strong>${tier}</strong> images per batch simultaneously. This consumes API credits much faster than single generation. Scroll down to automatically generate more batches.`,
      btn: 'I Understand, Continue',
    },
    milestone: {
      title: 'Usage Reminder',
      body: (_, count) => `You have generated <strong>${count}</strong> images in this session. API credits are being consumed rapidly. Continue?`,
      btn: 'Continue',
    },
  },
  zh: {
    'first-time': {
      title: '额度消耗提醒',
      body: (tier) => `瀑布流模式每批次同时生成 <strong>${tier}</strong> 张图片，API 额度消耗远高于单张生成。向下滚动将自动生成更多批次。`,
      btn: '我已了解，继续使用',
    },
    milestone: {
      title: '用量提醒',
      body: (_, count) => `本次会话已生成 <strong>${count}</strong> 张图片，API 额度正在快速消耗。是否继续？`,
      btn: '继续',
    },
  },
};

function detectLang() {
  return (navigator.language || '').startsWith('zh') ? 'zh' : 'en';
}

export function hasSeenFirstTimeWarning() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function showWarningPopup({ type = 'first-time', tier = 5, count = 0 }) {
  return new Promise((resolve) => {
    let lang = detectLang();

    const overlay = document.createElement('div');
    overlay.className = 'warning-popup-overlay';

    const card = document.createElement('div');
    card.className = 'warning-popup-card';

    function render() {
      const t = TEXTS[lang][type];
      card.innerHTML = `
        <div class="warning-popup-lang">
          <button class="warning-popup-lang-btn${lang === 'en' ? ' active' : ''}" data-lang="en">EN</button>
          <button class="warning-popup-lang-btn${lang === 'zh' ? ' active' : ''}" data-lang="zh">中</button>
        </div>
        <div class="warning-popup-icon">${iconAlertTriangle().replace('width="24" height="24"', 'width="36" height="36"')}</div>
        <div class="warning-popup-title">${t.title}</div>
        <div class="warning-popup-body">${t.body(tier, count)}</div>
        <button class="warning-popup-btn">${t.btn}</button>
      `;
    }

    render();

    card.addEventListener('click', (e) => {
      const langBtn = e.target.closest('[data-lang]');
      if (langBtn) {
        lang = langBtn.dataset.lang;
        render();
        return;
      }
      if (e.target.closest('.warning-popup-btn')) {
        if (type === 'first-time') {
          localStorage.setItem(STORAGE_KEY, '1');
        }
        overlay.remove();
        resolve();
      }
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}
