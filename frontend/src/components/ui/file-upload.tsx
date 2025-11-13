import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, File, Trash2, Eye, Star } from 'lucide-react';
import { mediaApi } from '@/lib/api';
import { Button } from './button';
import { Card, CardContent } from './card';
import type { MediaCategory, Media } from '@/types';

interface FileUploadProps {
  category: MediaCategory;
  guestId?: number;
  roomId?: number;
  staffId?: number;
  title?: string;
  description?: string;
  onUploadSuccess?: () => void;
  maxSizeMB?: number;
  accept?: string;
}

export function FileUpload({
  category,
  guestId,
  roomId,
  staffId,
  title,
  description,
  onUploadSuccess,
  maxSizeMB = 10,
  accept = 'image/*,application/pdf,.doc,.docx',
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const invalidateMediaQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['media'] });
    queryClient.invalidateQueries({ queryKey: ['room-photos'] });
    if (category === 'guest_photo') {
      queryClient.invalidateQueries({ queryKey: ['guest-photos'] });
    }
    if (category === 'staff_photo') {
      queryClient.invalidateQueries({ queryKey: ['staff-photos'] });
    }
  };
  const canMarkPrimary =
    (category === 'room_photo' && !!roomId) ||
    (category === 'guest_photo' && !!guestId) ||
    (category === 'staff_photo' && !!staffId);
  const primaryEntityLabel =
    category === 'room_photo'
      ? 'habitación'
      : category === 'guest_photo'
      ? 'huésped'
      : category === 'staff_photo'
      ? 'miembro del personal'
      : 'registro';

  // Query para obtener archivos existentes
  const { data: existingFiles } = useQuery({
    queryKey: ['media', category, guestId, roomId, staffId],
    queryFn: () =>
      mediaApi.getAll({ guest_id: guestId, room_id: roomId, staff_id: staffId, category }),
  });

  // Mutation para subir archivo
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (guestId) formData.append('guest_id', guestId.toString());
      if (roomId) formData.append('room_id', roomId.toString());
      if (staffId) formData.append('staff_id', staffId.toString());
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);

      return mediaApi.upload(formData);
    },
    onSuccess: () => {
      invalidateMediaQueries();

      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Llamar el callback del padre para que maneje refetch si es necesario
      onUploadSuccess?.();
    },
  });

  // Mutation para eliminar archivo
  const deleteMutation = useMutation({
    mutationFn: mediaApi.delete,
    onSuccess: () => {
      invalidateMediaQueries();
    },
  });
  const setPrimaryMutation = useMutation({
    mutationFn: mediaApi.setPrimary,
    onSuccess: () => {
      invalidateMediaQueries();
    },
    onError: () => {
      alert('No se pudo actualizar la foto principal. Inténtalo nuevamente.');
    },
  });
  const filesToShow = existingFiles
    ? [...existingFiles].sort(
        (a, b) => Number(b.is_primary ?? false) - Number(a.is_primary ?? false)
      )
    : [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      alert(`El archivo es muy grande. Tamaño máximo: ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);

    // Crear preview si es imagen
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCategoryLabel = (cat: MediaCategory) => {
    const labels: Record<MediaCategory, string> = {
      room_photo: 'Foto de Habitación',
      guest_photo: 'Foto de Huésped',
      staff_photo: 'Foto de Personal',
      guest_id: 'Documento de Identidad',
      payment_proof: 'Comprobante de Pago',
      other: 'Otro',
    };
    return labels[cat];
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold">{getCategoryLabel(category)}</h3>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
              id={`file-upload-${category}`}
            />

            {!selectedFile ? (
              <label
                htmlFor={`file-upload-${category}`}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click para seleccionar archivo
                </span>
                <span className="text-xs text-gray-500">
                  Máximo {maxSizeMB}MB
                </span>
              </label>
            ) : (
              <div className="space-y-3">
                {preview ? (
                  <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <File className="h-8 w-8 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="flex-1"
                  >
                    {uploadMutation.isPending ? 'Subiendo...' : 'Subir Archivo'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={uploadMutation.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Files */}
      {filesToShow.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Archivos Existentes</h4>
              {canMarkPrimary && (
                <p className="text-xs text-gray-500">
                  Marca una foto como principal para mostrarla primero.
                </p>
              )}
            </div>
            <div className="space-y-2">
              {filesToShow.map((file: Media) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {file.media_type === 'image' ? (
                      <div className="relative h-14 w-14 rounded-md overflow-hidden border bg-gray-100">
                        <img
                          src={file.url}
                          alt={file.title || file.filename}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        {file.is_primary && (
                          <span className="absolute inset-x-0 bottom-0 bg-amber-500/80 text-[10px] font-semibold text-white text-center px-1">
                            Principal
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-12 w-12 flex items-center justify-center rounded-md border bg-gray-100">
                        <File className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{file.filename}</p>
                      <p className="text-xs text-gray-500">
                        {typeof file.file_size_mb === 'number'
                          ? `${file.file_size_mb} MB • `
                          : ''}
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                      {file.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{file.description}</p>
                      )}
                      {file.is_primary && file.media_type !== 'image' && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3 fill-current" fill="currentColor" />
                          Principal
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canMarkPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!file.is_primary) {
                            setPrimaryMutation.mutate(file.id);
                          }
                        }}
                        disabled={
                          setPrimaryMutation.isPending || Boolean(file.is_primary)
                        }
                        title={
                          file.is_primary
                            ? `Esta ya es la foto principal de este ${primaryEntityLabel}`
                            : `Marcar como principal para este ${primaryEntityLabel}`
                        }
                      >
                        <Star
                          className={`h-4 w-4 ${
                            file.is_primary
                              ? 'text-amber-600 fill-current'
                              : 'text-gray-500'
                          }`}
                          fill={file.is_primary ? 'currentColor' : 'none'}
                        />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('¿Eliminar este archivo?')) {
                          deleteMutation.mutate(file.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
