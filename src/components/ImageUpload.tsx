
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Plus, Loader2, Link, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

interface UploadingFile {
  file: File;
  preview: string;
  progress: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  images, 
  onImagesChange, 
  maxImages = 10 
}) => {
  const { user } = useAuth();
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const generateUniqueFileName = (file: File): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    return `${user?.id}/${timestamp}-${randomString}.${fileExtension}`;
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileName = generateUniqueFileName(file);
    
    const { error } = await supabase.storage
      .from('field-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Erreur d'upload: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('field-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    
    // Vérifier la limite
    if (images.length + files.length > maxImages) {
      toast.error(`Limite de ${maxImages} images dépassée`);
      return;
    }

    // Créer les previews
    const newUploadingFiles: UploadingFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload des fichiers un par un
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Simuler le progrès
        setUploadingFiles(prev => 
          prev.map(uf => 
            uf.file === file ? { ...uf, progress: 50 } : uf
          )
        );

        const publicUrl = await uploadFile(file);
        
        // Upload terminé
        setUploadingFiles(prev => 
          prev.map(uf => 
            uf.file === file ? { ...uf, progress: 100 } : uf
          )
        );

        // Ajouter l'URL aux images
        onImagesChange([...images, publicUrl]);

        // Supprimer de la liste d'upload après un délai
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
        }, 1000);

      } catch (error: any) {
        console.error('Erreur upload:', error);
        toast.error(error.message || 'Erreur lors de l\'upload');
        
        // Supprimer le fichier en erreur
        setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
      }
    }

    // Reset l'input
    event.target.value = '';
  }, [images, maxImages, onImagesChange, user?.id]);

  const addImageUrl = () => {
    if (!newImageUrl) return;
    
    try {
      new URL(newImageUrl); // Valider l'URL
      
      if (images.includes(newImageUrl)) {
        toast.error('Cette image est déjà ajoutée');
        return;
      }
      
      if (images.length >= maxImages) {
        toast.error(`Limite de ${maxImages} images atteinte`);
        return;
      }
      
      onImagesChange([...images, newImageUrl]);
      setNewImageUrl('');
    } catch {
      toast.error('URL d\'image invalide');
    }
  };

  const removeImage = (imageToRemove: string) => {
    onImagesChange(images.filter(img => img !== imageToRemove));
  };

  const isAtLimit = images.length >= maxImages;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload de fichiers</span>
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center space-x-2">
            <Link className="w-4 h-4" />
            <span>Ajouter par URL</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload"
                  disabled={isAtLimit}
                />
                <label
                  htmlFor="image-upload"
                  className={`cursor-pointer ${isAtLimit ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {isAtLimit ? `Limite de ${maxImages} images atteinte` : 'Sélectionner des images'}
                  </p>
                  <p className="text-gray-500">
                    Formats supportés: JPEG, PNG, WebP (max 5MB par image)
                  </p>
                </label>
              </div>
              
              {!isAtLimit && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir des fichiers
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="https://exemple.com/image.jpg"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
              disabled={isAtLimit}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={addImageUrl}
              disabled={isAtLimit || !newImageUrl}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {isAtLimit && (
            <p className="text-sm text-gray-500">Limite de {maxImages} images atteinte</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Files en cours d'upload */}
      {uploadingFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {uploadingFiles.map((uploadingFile, index) => (
            <div key={index} className="relative">
              <img 
                src={uploadingFile.preview} 
                alt="En cours d'upload"
                className="w-full h-32 object-cover rounded border"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                {uploadingFile.progress < 100 ? (
                  <div className="text-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <span className="text-sm">{uploadingFile.progress}%</span>
                  </div>
                ) : (
                  <div className="text-center text-white">
                    <span className="text-sm">✓ Terminé</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Images ajoutées */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Images ajoutées ({images.length}/{maxImages})</h4>
            <Badge variant="secondary">{images.length} image{images.length > 1 ? 's' : ''}</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img 
                  src={imageUrl} 
                  alt={`Image ${index + 1}`}
                  className="w-full h-32 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(imageUrl)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
