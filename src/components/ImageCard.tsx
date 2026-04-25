import { Download, Pencil, Maximize2 } from 'lucide-react';
import { buildImageFilename } from '../lib/filename';

interface ImageCardProps {
  imageBase64: string;
  size?: string;
  prompt?: string;
  timestamp?: number;
  onEdit?: (src: string) => void;
  onFullscreen?: (src: string) => void;
}

export function ImageCard({
  imageBase64,
  size = '1024x1024',
  prompt,
  timestamp,
  onEdit,
  onFullscreen,
}: ImageCardProps) {
  const src = `data:image/png;base64,${imageBase64}`;

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = src;
    a.download = buildImageFilename(prompt, timestamp);
    a.click();
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit?.(src);
  }

  function handleFullscreen(e: React.MouseEvent) {
    e.stopPropagation();
    onFullscreen?.(src);
  }

  function handleCardClick() {
    onFullscreen?.(src);
  }

  return (
    <div className="image-card" onClick={handleCardClick}>
      <img src={src} alt="Generated image" loading="lazy" />
      <div className="image-card-overlay">
        <span className="image-card-badge">{size}</span>
        <button
          className="image-card-btn download"
          title="Download"
          onClick={handleDownload}
        >
          <Download size={14} />
        </button>
        <button
          className="image-card-btn edit"
          title="Edit with this image as reference"
          onClick={handleEdit}
        >
          <Pencil size={12} /> Edit
        </button>
        <button
          className="image-card-btn fullscreen"
          title="Fullscreen"
          onClick={handleFullscreen}
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
