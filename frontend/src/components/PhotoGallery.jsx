import { useState } from 'react';
import downloadIcon from '../assets/images/download_icon.png';

export default function PhotoGallery({ photos }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <>
      <div className="fb-gallery-grid">
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Event photo ${i + 1}`}
            className="expandable-photo"
            onClick={() => setExpanded(src)}
          />
        ))}
      </div>

      <div className="photo-modal" style={{ display: expanded ? 'block' : 'none' }}>
        <span className="photo-modal-close" onClick={() => setExpanded(null)}>&times;</span>
        {expanded && (
          <>
            <img className="photo-modal-content" src={expanded} alt="Expanded view" />
            <a className="modal-download-btn" href={expanded} download>
              <img src={downloadIcon} alt="Download" /> Download
            </a>
          </>
        )}
      </div>
    </>
  );
}
