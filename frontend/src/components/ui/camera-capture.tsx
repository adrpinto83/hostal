import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, X, RotateCw, Send, Upload as UploadIcon } from 'lucide-react';
import { mediaApi } from '@/lib/api';
import { Button } from './button';
import { Card, CardContent } from './card';
import type { MediaCategory } from '@/types';

interface CameraCaptureProps {
  category: MediaCategory;
  guestId?: number;
  staffId?: number;
  title?: string;
  description?: string;
  onUploadSuccess?: () => void;
}

export function CameraCapture({
  category,
  guestId,
  staffId,
  title,
  description,
  onUploadSuccess,
}: CameraCaptureProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview' | 'upload'>('select');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const queryClient = useQueryClient();

  // Mutation para subir archivo
  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');
      formData.append('category', category);
      if (guestId) formData.append('guest_id', guestId.toString());
      if (staffId) formData.append('staff_id', staffId.toString());
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);

      return mediaApi.upload(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', category, guestId || staffId] });
      queryClient.invalidateQueries({ queryKey: ['guest-photos'] });
      queryClient.invalidateQueries({ queryKey: ['staff-photos'] });
      setCapturedImage(null);
      stopCamera();
      setMode('select');
      onUploadSuccess?.();
    },
    onError: (error) => {
      console.error('Error uploading:', error);
      setCameraError('Error al subir la foto. Intenta de nuevo.');
    },
  });

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setMode('camera');
      }
    } catch (error) {
      let errorMessage = 'No se pudo acceder a la cámara';
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permiso denegado. Permite acceso a la cámara en la configuración del navegador.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No se encontró ninguna cámara en este dispositivo.';
        }
      }
      setCameraError(errorMessage);
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
        setMode('preview');
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (capturedImage) {
      try {
        const blob = await fetch(capturedImage).then((res) => res.blob());
        uploadMutation.mutate(blob);
      } catch (error) {
        console.error('Error converting image:', error);
        setCameraError('Error al procesar la imagen.');
      }
    }
  };

  const handleCancel = () => {
    setCapturedImage(null);
    stopCamera();
    setMode('select');
    setCameraError(null);
  };

  return (
    <div className="space-y-4">
      {/* Selección de modo */}
      {mode === 'select' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Button onClick={startCamera} className="w-full h-12 text-base">
                <Camera className="h-5 w-5 mr-2" />
                Abrir Cámara
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 text-base"
              >
                <UploadIcon className="h-5 w-5 mr-2" />
                Subir Imagen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de cámara */}
      {mode === 'camera' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {cameraError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  {cameraError}
                </div>
              )}

              <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1 bg-green-600 hover:bg-green-700 h-10">
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 h-10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista previa y subida */}
      {mode === 'preview' && capturedImage && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="relative w-full rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={capturedImage}
                  alt="Preview"
                  className="w-full aspect-video object-cover"
                />
              </div>

              <div className="flex gap-2 flex-col">
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {uploadMutation.isPending ? 'Subiendo...' : 'Subir Foto'}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCapturedImage(null);
                      startCamera();
                    }}
                    disabled={uploadMutation.isPending}
                    className="flex-1 h-10"
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Retomar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={uploadMutation.isPending}
                    className="w-10 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {cameraError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  {cameraError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canvas oculto */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
