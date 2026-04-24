import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { InputBar } from '../components/InputBar';
import type { InputBarHandle, SendData } from '../components/InputBar';
import { useLightbox } from '../components/Lightbox';
import { useConversationStore } from '../lib/store';
import type { GalleryImage } from '../types';

const SUGGESTIONS = [
  'A serene mountain lake at sunset, oil painting',
  'Minimalist logo for a tech startup',
  'Cyberpunk city street in the rain, neon lights',
  'Watercolor portrait of a cat wearing glasses',
];

export default function Landing() {
  const navigate = useNavigate();
  const { open: openLightbox } = useLightbox();
  const getAllImages = useConversationStore((s) => s.getAllImages);

  const inputRef = useRef<InputBarHandle>(null);
  const [recentImages, setRecentImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAllImages().then((all) => {
      if (cancelled) return;
      setRecentImages(all.slice(0, 6));
    });
    return () => {
      cancelled = true;
    };
  }, [getAllImages]);

  function handleSend(data: SendData) {
    navigate('/chat', {
      state: {
        prompt: data.prompt,
        size: data.size,
        thinking: data.thinking,
        images: data.images,
        autoSend: true,
      },
    });
  }

  function handleChip(text: string) {
    const input = inputRef.current?.textInput;
    if (input) {
      inputRef.current?.setText(text);
      input.focus();
    }
  }

  return (
    <>
      <Header activeTab="create" />
      <div className="landing fade-in">
        <img src="assets/logo.png" alt="GPT2IMAGE" className="landing-logo" />
        <h1 className="landing-title">What would you like to create?</h1>
        <p className="landing-subtitle">Describe any image and bring it to life</p>
        <div className="landing-input">
          <InputBar
            ref={inputRef}
            placeholder="Describe the image you want..."
            onSend={handleSend}
          />
        </div>
        <div className="suggestion-chips">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chip"
              title={s}
              onClick={() => handleChip(s)}
            >
              {s.length > 40 ? s.slice(0, 40) + '...' : s}
            </button>
          ))}
        </div>
        {recentImages.length > 0 && (
          <div className="recent-row">
            <div className="recent-label">Recent creations</div>
            <div className="recent-grid">
              {recentImages.map((img, i) => (
                <div
                  key={i}
                  className="recent-thumb"
                  onClick={() =>
                    openLightbox(`data:image/png;base64,${img.imageBase64}`, {
                      prompt: img.prompt,
                    })
                  }
                >
                  <img
                    src={`data:image/png;base64,${img.imageBase64}`}
                    alt={img.prompt}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
