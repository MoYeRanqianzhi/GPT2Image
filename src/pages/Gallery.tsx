import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import { Header } from '../components/Header';
import { ImageCard } from '../components/ImageCard';
import { useLightbox } from '../components/Lightbox';
import { useToast } from '../components/Toast';
import { useConversationStore } from '../lib/store';
import type { GalleryImage } from '../types';

export default function Gallery() {
  const navigate = useNavigate();
  const { open: openLightbox } = useLightbox();
  const { show: showToast } = useToast();
  const getAllImages = useConversationStore((s) => s.getAllImages);

  const [images, setImages] = useState<GalleryImage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllImages().then((list) => {
      if (!cancelled) setImages(list);
    });
    return () => {
      cancelled = true;
    };
  }, [getAllImages]);

  return (
    <>
      <Header activeTab="gallery" />
      {images !== null && images.length === 0 && (
        <div className="landing fade-in">
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 48,
              marginBottom: 16,
            }}
          >
            <ImageIcon size={48} strokeWidth={1} />
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 15 }}>
            No images yet
          </p>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Create your first image to see it here
          </p>
        </div>
      )}
      {images && images.length > 0 && (
        <div className="gallery-grid fade-in">
          {images.map((img, i) => (
            <ImageCard
              key={i}
              imageBase64={img.imageBase64}
              size={img.size}
              prompt={img.prompt}
              timestamp={img.timestamp}
              onEdit={(src) => {
                navigate('/chat', { state: { images: [src] } });
                showToast('Reference image attached');
              }}
              onFullscreen={(src) => openLightbox(src, { prompt: img.prompt })}
            />
          ))}
        </div>
      )}
    </>
  );
}
