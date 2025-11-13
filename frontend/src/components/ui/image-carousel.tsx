import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2, Download } from 'lucide-react';
import { Button } from './button';
import type { Media } from '@/types';

interface ImageCarouselProps {
  images: Media[];
  onClose?: () => void;
}

export function ImageCarousel({ images, onClose }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No hay imágenes disponibles</p>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
  };

  const currentImage = images[currentIndex];

  const CarouselContent = () => (
    <div
      className={`relative ${isFullscreen ? 'h-screen bg-black' : 'h-96 sm:h-[500px] bg-gray-100 rounded-lg'} overflow-hidden`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Imagen principal */}
      <img
        src={currentImage.url}
        alt={currentImage.filename}
        className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'} transition-transform duration-300`}
      />

      {/* Controles superiores */}
      <div className={`absolute top-4 right-4 flex gap-2 z-20 ${isFullscreen ? 'bg-black/50' : 'bg-white/80'} p-2 rounded-lg`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(currentImage.url, '_blank')}
          className={isFullscreen ? 'text-white hover:bg-white/20' : ''}
          title="Descargar"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={isFullscreen ? 'text-white hover:bg-white/20' : ''}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        {(onClose || isFullscreen) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => isFullscreen ? setIsFullscreen(false) : onClose?.()}
            className={isFullscreen ? 'text-white hover:bg-white/20' : ''}
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navegación con flechas */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="lg"
            onClick={goToPrevious}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 ${
              isFullscreen
                ? 'bg-black/50 text-white hover:bg-black/70'
                : 'bg-white/90 hover:bg-white shadow-lg'
            } rounded-full p-3`}
            title="Anterior (←)"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={goToNext}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 ${
              isFullscreen
                ? 'bg-black/50 text-white hover:bg-black/70'
                : 'bg-white/90 hover:bg-white shadow-lg'
            } rounded-full p-3`}
            title="Siguiente (→)"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Contador de imágenes */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 ${
        isFullscreen ? 'bg-black/70 text-white' : 'bg-white/90'
      } px-4 py-2 rounded-full text-sm font-medium shadow-lg`}>
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );

  return (
    <>
      {/* Vista normal */}
      {!isFullscreen && (
        <div className="space-y-4">
          <CarouselContent />

          {/* Miniaturas de navegación */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 px-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 relative rounded-lg overflow-hidden transition-all ${
                    index === currentIndex
                      ? 'ring-4 ring-blue-500 scale-105'
                      : 'ring-2 ring-gray-200 hover:ring-gray-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-20 h-20 object-cover"
                  />
                  {index === currentIndex && (
                    <div className="absolute inset-0 bg-blue-500/20" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Información de la imagen */}
          <div className="text-center space-y-1">
            <p className="font-medium text-gray-900">{currentImage.filename}</p>
            {currentImage.title && (
              <p className="text-sm text-gray-600">{currentImage.title}</p>
            )}
            {currentImage.description && (
              <p className="text-sm text-gray-500">{currentImage.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Vista pantalla completa */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black">
          <CarouselContent />
        </div>
      )}
    </>
  );
}
