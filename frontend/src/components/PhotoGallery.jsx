import { useEffect, useRef, useState } from 'react';
import downloadIcon from '../assets/images/download_icon.png';

export default function PhotoGallery({ photos }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const isOpen = expandedIndex !== null;
  const modalRef = useRef(null);

  function showNext() {
    setExpandedIndex((i) => (i + 1) % photos.length);
  }

  function showPrev() {
    setExpandedIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';

    // Best-effort: real OS-level fullscreen where the browser supports requesting it
    // on an arbitrary element (most desktop/Android browsers). iOS Safari doesn't
    // support this on non-video elements, so it silently no-ops there and the viewer
    // just falls back to the full-viewport CSS layout - still edge to edge, just
    // without hiding the browser chrome.
    if (modalRef.current?.requestFullscreen) {
      modalRef.current.requestFullscreen().catch(() => {});
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') setExpandedIndex(null);
      else if (e.key === 'ArrowRight') showNext();
      else if (e.key === 'ArrowLeft') showPrev();
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, photos.length]);

  return (
    <>
      <div className="fb-gallery-grid">
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Event photo ${i + 1}`}
            className="expandable-photo"
            draggable="false"
            onDragStart={(e) => e.preventDefault()}
            onClick={() => setExpandedIndex(i)}
          />
        ))}
      </div>

      <div
        ref={modalRef}
        className="photo-modal"
        style={{ display: isOpen ? 'flex' : 'none' }}
        onClick={() => setExpandedIndex(null)}
      >
        <button type="button" className="photo-modal-close" onClick={() => setExpandedIndex(null)} aria-label="Close">
          &times;
        </button>

        {isOpen && (
          <>
            {photos.length > 1 && (
              <button type="button" className="photo-modal-nav prev" onClick={(e) => { e.stopPropagation(); showPrev(); }} aria-label="Previous photo">
                &#10094;
              </button>
            )}

            {/* Deliberately swallow clicks on the photo itself: with the image filling
                the full screen, a click here is indistinguishable from the tail end of
                a drag/swipe gesture (the browser still fires click after mousedown+move+
                mouseup on the same element), so letting it bubble to the "close" handler
                would dismiss the viewer every time someone drags across the photo. */}
            <img
              className="photo-modal-content"
              src={photos[expandedIndex]}
              alt={`Event photo ${expandedIndex + 1}`}
              draggable="false"
              onDragStart={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            />

            {photos.length > 1 && (
              <button type="button" className="photo-modal-nav next" onClick={(e) => { e.stopPropagation(); showNext(); }} aria-label="Next photo">
                &#10095;
              </button>
            )}

            <div className="photo-modal-bar" onClick={(e) => e.stopPropagation()}>
              {photos.length > 1 && (
                <p className="photo-modal-counter">{expandedIndex + 1} / {photos.length}</p>
              )}
              <a className="modal-download-btn" href={photos[expandedIndex]} download>
                <img src={downloadIcon} alt="" /> Download
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
