import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageModalProps {
  /** URL of the image to display */
  src: string;
  /** Alt text for the image */
  alt?: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
}

/**
 * Reusable full-screen image viewer modal with zoom support.
 * Used for enlarging post images, ad images, and comment images.
 */
export const ImageModal: React.FC<ImageModalProps> = ({
  src,
  alt = 'Image',
  isOpen,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom and position when modal opens or image changes
  useEffect(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, [isOpen, src]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  // Drag for panning when zoomed
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoomLevel, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, zoomLevel, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support for mobile pinch-to-zoom
  const handleDoubleClick = useCallback(() => {
    if (zoomLevel > 1) {
      handleResetZoom();
    } else {
      setZoomLevel(2);
    }
  }, [zoomLevel, handleResetZoom]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[101] w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Zoom controls */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[101] flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                zoomLevel <= 1 ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-white/20'
              }`}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-white text-xs font-bold min-w-[48px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                zoomLevel >= 4 ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-white/20'
              }`}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-white/30 mx-1" />
            <button
              onClick={handleResetZoom}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Image container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[85vh] rounded-lg object-contain select-none"
              style={{
                transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              }}
              draggable={false}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Convenience hook to manage ImageModal state.
 * Returns the modal component and a function to open it with an image URL.
 */
export const useImageModal = () => {
  const [modalState, setModalState] = useState<{ isOpen: boolean; src: string; alt: string }>({
    isOpen: false,
    src: '',
    alt: '',
  });

  const openImageModal = (src: string, alt?: string) => {
    setModalState({ isOpen: true, src, alt: alt || 'Image' });
  };

  const closeImageModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const imageModalElement = (
    <ImageModal
      src={modalState.src}
      alt={modalState.alt}
      isOpen={modalState.isOpen}
      onClose={closeImageModal}
    />
  );

  return { openImageModal, imageModalElement };
};
