import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area } from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, Check } from 'lucide-react';
import { getCroppedImageBlob, blobToFile } from '../../lib/cropImage';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  cropShape: 'round' | 'rect';
  aspect?: number;
  fileName?: string;
  title?: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  cropShape,
  aspect = 1,
  fileName = 'cropped.jpg',
  title = 'Recortar imagen',
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const mimeType = cropShape === 'round' ? 'image/png' : 'image/jpeg';
      const ext = cropShape === 'round' ? 'png' : 'jpg';
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, cropShape, mimeType);
      onConfirm(blobToFile(blob, fileName.replace(/\.\w+$/, `.${ext}`)));
    } catch (err) {
      console.error('Error al recortar imagen:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-graphite rounded-2xl border border-white/10 shadow-premium overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="font-serif text-lg text-white font-semibold">{title}</h3>
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cancelar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative w-full h-72 bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape={cropShape}
                showGrid={cropShape === 'rect'}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <ZoomIn size={16} className="text-accent shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-accent h-1.5 cursor-pointer"
                  aria-label="Zoom"
                />
                <span className="text-xs text-text-light w-10 text-right">{Math.round(zoom * 100)}%</span>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={onCancel} className="btn-outline text-sm py-2 px-5">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={processing || !croppedAreaPixels}
                  className="btn-primary text-sm py-2 px-5 flex items-center gap-2 disabled:opacity-60"
                >
                  <Check size={16} />
                  {processing ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
