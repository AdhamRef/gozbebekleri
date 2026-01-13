import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    type: 'image' | 'video';
    src: string;
    alt?: string;
  } | null;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, content }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !content) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
      <div
        ref={modalRef}
        className="bg-stone-900 rounded-lg overflow-hidden shadow-lg max-w-2xl w-full transition-transform transform"
        style={{ cursor: 'move' }} // Indicate that the modal can be dragged
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-red-600 bg-white rounded-full w-6 h-6 flex items-center justify-center hover:text-gray-800 transition-colors"
        >
          &times;
        </button>
        <div className="flex justify-center items-center">
          {content.type === 'image' ? (
            <img
              src={content.src}
              alt={content.alt}
              className="max-h-[80vh] max-w-full object-contain"
            />
          ) : (
            <iframe
              width="100%"
              height="415"
              src={content.src}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className=""
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal; 