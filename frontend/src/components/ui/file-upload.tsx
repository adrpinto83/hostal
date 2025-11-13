import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, File, Image as ImageIcon, Trash2, Eye } from 'lucide-react';
import { mediaApi } from '@/lib/api';
import { Button } from './button';
import { Card, CardContent } from './card';
import type { MediaCategory, Media } from '@/types';

interface FileUploadProps {
  category: MediaCategory;
  guestId?: number;
  roomId?: number;
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

  // Query para obtener archivos existentes
  const { data: existingFiles } = useQuery({
    queryKey: ['media', category, guestId, roomId],
    queryFn: () => mediaApi.getAll({ guest_id: guestId, room_id: roomId, category }),
  });

  // Mutation para subir archivo
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (guestId) formData.append('guest_id', guestId.toString());
      if (roomId) formData.append('room_id', roomId.toString());
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);

      return mediaApi.upload(formData);
    },
    onSuccess: () => {
      // Invalidar queries de media
      queryClient.invalidateQueries({ queryKey: ['media'] });

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
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });

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
      {existingFiles && existingFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3">Archivos Existentes</h4>
            <div className="space-y-2">
              {existingFiles.map((file: Media) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {file.media_type === 'image' ? (
                      <ImageIcon className="h-6 w-6 text-blue-600" />
                    ) : (
                      <File className="h-6 w-6 text-gray-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{file.filename}</p>
                      <p className="text-xs text-gray-500">
                        {file.file_size_mb} MB • {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
