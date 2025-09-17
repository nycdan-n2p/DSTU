import React, { useState } from 'react';
import { GameButton } from './GameButton';
import { CustomSponsor } from '../types/game';
import { Trash2, Wand2, Save, Plus, Tv, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SponsorManagerProps {
  sessionId: string;
  customSponsors: CustomSponsor[];
  numSponsorBreaks: number;
  onAddSponsor: (text: string, imageUrl?: string | null) => Promise<void>;
  onDeleteSponsor: (sponsorId: string) => Promise<void>;
  onUpdateSponsorBreaks: (numBreaks: number) => Promise<void>;
  onSponsorsChanged: () => void;
}

export const SponsorManager: React.FC<SponsorManagerProps> = ({
  sessionId,
  customSponsors,
  numSponsorBreaks,
  onAddSponsor,
  onDeleteSponsor,
  onUpdateSponsorBreaks,
  onSponsorsChanged
}) => {
  const [productFocus, setProductFocus] = useState('');
  const [tone, setTone] = useState('professional');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showAddAnotherPrompt, setShowAddAnotherPrompt] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'fun', label: 'Fun & Energetic' },
    { value: 'casual', label: 'Casual' },
    { value: 'humorous', label: 'Humorous' },
    { value: 'inspiring', label: 'Inspiring' }
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (e.g., JPG, PNG, GIF).');
        setSelectedImageFile(null);
        setPreviewImageUrl(null);
        return;
      }
      setSelectedImageFile(file);
      setPreviewImageUrl(URL.createObjectURL(file));
      setError(null); // Clear any previous file errors
    } else {
      setSelectedImageFile(null);
      setPreviewImageUrl(null);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImageFile) return null;

    setIsUploadingImage(true);
    setError(null);
    try {
      const fileExtension = selectedImageFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = `sponsors/${fileName}`; // Store images in sponsors folder

      const { data, error: uploadError } = await supabase.storage
        .from('sponsor-images') // Ensure this bucket exists and has public read/write policies
        .upload(filePath, selectedImageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      return supabase.storage.from('sponsor-images').getPublicUrl(filePath).data.publicUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown upload error';
      setError(`Failed to upload image: ${errorMessage}`);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };
  const handleGenerateSponsorMessage = async () => {
    if (!productFocus.trim()) {
      setGenerationError('Please enter a product focus before generating.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setError(null);

    try {
      console.log('📺 Generating sponsor message:', { productFocus, tone });
      
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sponsor-message`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productFocus: productFocus.trim(),
          tone: tone
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate sponsor message`);
      }

      const data = await response.json();
      if (!data.sponsorMessage) {
        throw new Error('Invalid response format from AI service');
      }

      setGeneratedMessage(data.sponsorMessage);
      console.log('✅ Generated sponsor message:', data.sponsorMessage);

    } catch (err) {
      console.error('❌ Error generating sponsor message:', err);
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate sponsor message.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSponsor = async () => {
    // Validate session ID first
    if (!sessionId || sessionId.trim() === '') {
      setError('Invalid session. Please refresh the page and try again.');
      return;
    }
    
    if (!generatedMessage.trim()) {
      setError('Please generate or enter a sponsor message before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let imageUrl: string | null = null;
      if (selectedImageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl) return; // Stop if image upload failed
      }

      console.log('💾 Saving sponsor with session ID:', sessionId);
      await onAddSponsor(generatedMessage.trim(), imageUrl);
      
      // Clear form after successful save
      setProductFocus('');
      setTone('professional');
      setGeneratedMessage('');
      setSelectedImageFile(null);
      setPreviewImageUrl(null);
      setShowAddAnotherPrompt(true);
      
      console.log('✅ Sponsor message saved successfully');
      // Real-time sync will handle the UI update automatically
      
    } catch (err) {
      console.error('❌ Error saving sponsor message:', err);
      setError(err instanceof Error ? err.message : 'Failed to save sponsor message.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAnotherSponsor = () => {
    setShowAddAnotherPrompt(false);
    setProductFocus('');
    setTone('professional');
    setGeneratedMessage('');
    setSelectedImageFile(null);
    setPreviewImageUrl(null);
    setError(null);
    setGenerationError(null);
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!confirm('Are you sure you want to delete this sponsor message?')) {
      return;
    }

    try {
      await onDeleteSponsor(sponsorId);
      console.log('✅ Sponsor message deleted successfully');
      // Real-time sync will handle the UI update automatically
    } catch (err) {
      console.error('❌ Error deleting sponsor message:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete sponsor message.');
    }
  };

  const handleSponsorBreaksChange = async (value: number) => {
    try {
      await onUpdateSponsorBreaks(value);
      console.log('✅ Sponsor breaks updated:', value);
    } catch (err) {
      console.error('❌ Error updating sponsor breaks:', err);
      setError(err instanceof Error ? err.message : 'Failed to update sponsor breaks.');
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Tv className="w-6 h-6 text-purple-400" />
        Sponsor Management
      </h3>

      {/* Sponsor Breaks Configuration */}
      <div className="mb-6 bg-white/10 rounded-lg p-4 border border-white/20">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-5 h-5 text-yellow-400" />
          <h4 className="text-lg font-bold text-white">Sponsor Break Configuration</h4>
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="sponsorBreaks" className="text-gray-300 font-medium">
            Number of sponsor breaks during game:
          </label>
          <input
            type="number"
            id="sponsorBreaks"
            min="0"
            max="10"
            value={numSponsorBreaks}
            onChange={(e) => handleSponsorBreaksChange(parseInt(e.target.value) || 0)}
            className="w-20 p-2 bg-white/10 border border-white/20 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <span className="text-gray-400 text-sm">
            (0 = no sponsor breaks, distributed evenly throughout game)
          </span>
        </div>
      </div>

      {/* Create New Sponsor Message */}
      <div className="mb-6 bg-white/10 rounded-lg p-4 border border-white/20">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-green-400" />
          Create New Sponsor Message
        </h4>
        
        {showAddAnotherPrompt ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <h5 className="text-xl font-bold text-green-400 mb-2">Sponsor Message Saved!</h5>
            <p className="text-gray-300 mb-6">
              Your sponsor message has been added successfully. You now have {customSponsors.length} sponsor message{customSponsors.length !== 1 ? 's' : ''}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GameButton
                onClick={handleCreateAnotherSponsor}
                variant="primary"
                className="bg-green-500 hover:bg-green-600"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Another Sponsor Message
                </div>
              </GameButton>
              <GameButton
                onClick={() => setShowAddAnotherPrompt(false)}
                variant="primary"
                className="bg-gray-500 hover:bg-gray-600"
              >
                Done Adding Messages
              </GameButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Product Focus Input */}
            <div>
              <label htmlFor="productFocus" className="block text-sm font-medium text-gray-300 mb-2">
                Product/Service Focus
              </label>
              <input
                type="text"
                id="productFocus"
                value={productFocus}
                onChange={(e) => setProductFocus(e.target.value)}
                placeholder="e.g., net2phone communication tools, workplace productivity, team collaboration"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                disabled={isGenerating || isSaving}
              />
            </div>

            {/* Tone Selection */}
            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-300 mb-2">
                Tone
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                disabled={isGenerating || isSaving}
              >
                {toneOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload Input */}
            <div>
              <label htmlFor="imageUpload" className="block text-sm font-medium text-gray-300 mb-2">
                Optional: Upload Image for Sponsor Message
              </label>
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600 disabled:opacity-50"
                disabled={isGenerating || isSaving || isUploadingImage}
              />
              {previewImageUrl && (
                <div className="mt-4 p-2 border border-white/20 rounded-lg bg-white/5">
                  <p className="text-sm text-gray-300 mb-2">Image Preview:</p>
                  <img src={previewImageUrl} alt="Image Preview" className="max-w-full h-auto max-h-48 rounded-lg mx-auto" />
                  <button
                    onClick={() => { setSelectedImageFile(null); setPreviewImageUrl(null); }}
                    className="mt-2 text-sm text-red-400 hover:text-red-500"
                    disabled={isGenerating || isSaving || isUploadingImage}
                  >
                    Remove Image
                  </button>
                </div>
              )}
              {isUploadingImage && (
                <div className="mt-2 flex items-center gap-2 text-yellow-300">
                  <div className="w-4 h-4 border-2 border-yellow-300/30 border-t-yellow-300 rounded-full animate-spin"></div>
                  <span className="text-sm">Uploading image...</span>
                </div>
              )}
            </div>
            {/* Generate Button */}
            <GameButton
              onClick={handleGenerateSponsorMessage}
              disabled={isGenerating || isSaving || !productFocus.trim()}
              variant="primary"
              className="bg-purple-500 hover:bg-purple-600"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Generating AI Message...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Generate with AI
                </div>
              )}
            </GameButton>

            {generationError && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-300 text-sm">
                ⚠️ {generationError}
              </div>
            )}

            {/* Generated Message Display/Edit */}
            {generatedMessage && (
              <div>
                <label htmlFor="generatedMessage" className="block text-sm font-medium text-gray-300 mb-2">
                  Generated Message (you can edit this)
                </label>
                <textarea
                  id="generatedMessage"
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  disabled={isSaving}
                />
                
                <div className="mt-3">
                  <GameButton
                    onClick={handleSaveSponsor}
                    disabled={isSaving || isUploadingImage || !generatedMessage.trim()}
                    variant="primary"
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {isSaving || isUploadingImage ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {isUploadingImage ? 'Uploading Image...' : 'Saving...'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        Save Sponsor Message
                      </div>
                    )}
                  </GameButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing Sponsor Messages */}
      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
        <h4 className="text-lg font-bold text-white mb-4">
          Your Sponsor Messages ({customSponsors.length})
        </h4>
        
        {customSponsors.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 opacity-50">📺</div>
            <p className="text-gray-300 mb-2">No sponsor messages yet!</p>
            <p className="text-gray-400 text-sm">Create your first sponsor message above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customSponsors.map((sponsor, index) => (
              <div key={sponsor.id} className="bg-black/30 rounded-lg p-4 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-purple-500 text-white px-2 py-1 rounded text-sm font-bold">
                        Sponsor {index + 1}
                      </span>
                      {sponsor.image_url && (
                        <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs border border-green-400/50">
                          📷 Has Image
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Created {new Date(sponsor.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {sponsor.image_url && (
                      <div className="mb-3">
                        <img 
                          src={sponsor.image_url} 
                          alt="Sponsor image"
                          className="max-w-full h-auto max-h-32 rounded-lg border border-white/20"
                          onError={(e) => {
                            console.error('Failed to load sponsor image:', sponsor.image_url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <p className="text-white leading-relaxed">{sponsor.text}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteSponsor(sponsor.id)}
                    className="ml-4 p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg border border-red-400/50 transition-colors"
                    title="Delete Sponsor Message"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};