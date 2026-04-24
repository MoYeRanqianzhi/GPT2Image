import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'gpt2image_waterfall_warned';

type WarningType = 'first-time' | 'milestone';
type Lang = 'en' | 'zh';

interface WarningPopupProps {
  type: WarningType;
  tier?: number;
  count?: number;
  onClose: () => void;
}

const TEXTS = {
  en: {
    'first-time': {
      title: 'Credit Consumption Warning',
      body: (tier: number, _count: number) =>
        `Waterfall mode generates <strong>${tier}</strong> images per batch simultaneously. This consumes API credits much faster than single generation. Scroll down to automatically generate more batches.`,
      btn: 'I Understand, Continue',
    },
    milestone: {
      title: 'Usage Reminder',
      body: (_tier: number, count: number) =>
        `You have generated <strong>${count}</strong> images in this session. API credits are being consumed rapidly. Continue?`,
      btn: 'Continue',
    },
  },
  zh: {
    'first-time': {
      title: '额度消耗提醒',
      body: (tier: number, _count: number) =>
        `瀑布流模式每批次同时生成 <strong>${tier}</strong> 张图片，API 额度消耗远高于单张生成。向下滚动将自动生成更多批次。`,
      btn: '我已了解，继续使用',
    },
    milestone: {
      title: '用量提醒',
      body: (_tier: number, count: number) =>
        `本次会话已生成 <strong>${count}</strong> 张图片，API 额度正在快速消耗。是否继续？`,
      btn: '继续',
    },
  },
};

function detectLang(): Lang {
  return (navigator.language || '').startsWith('zh') ? 'zh' : 'en';
}

export function hasSeenFirstTimeWarning(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function WarningPopup({
  type,
  tier = 5,
  count = 0,
  onClose,
}: WarningPopupProps) {
  const [lang, setLang] = useState<Lang>(detectLang());
  const t = TEXTS[lang][type];

  function handleConfirm() {
    if (type === 'first-time') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    onClose();
  }

  return (
    <div className="warning-popup-overlay">
      <div className="warning-popup-card">
        <div className="warning-popup-lang">
          <button
            className={`warning-popup-lang-btn${lang === 'en' ? ' active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            className={`warning-popup-lang-btn${lang === 'zh' ? ' active' : ''}`}
            onClick={() => setLang('zh')}
          >
            中
          </button>
        </div>
        <div className="warning-popup-icon">
          <AlertTriangle size={36} />
        </div>
        <div className="warning-popup-title">{t.title}</div>
        <div
          className="warning-popup-body"
          dangerouslySetInnerHTML={{ __html: t.body(tier, count) }}
        />
        <button className="warning-popup-btn" onClick={handleConfirm}>
          {t.btn}
        </button>
      </div>
    </div>
  );
}
