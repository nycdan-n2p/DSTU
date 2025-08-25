import React, { useState } from 'react';
import { GameButton } from './GameButton';
import { supabase } from '../lib/supabase'; // Ensure supabase is imported
import { Brain, Save, Wand2, XCircle } from 'lucide-react';

interface QuestionCreatorProps {
  sessionId: string;
  onQuestionAdded: () => void; // Callback when a question is successfully added
  onCancel: () => void; // Callback to close the creator
}

export const QuestionCreator: React.FC<QuestionCreatorProps> = ({ sessionId, onQuestionAdded, onCancel }) => {
  const [prompt, setPrompt] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [sarcasmLevel, setSarcasmLevel] = useState(5); // Default to medium sarcasm
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasGeneratedAnswers, setHasGeneratedAnswers] = useState(false);

  const handleGenerateWrongAnswers = async () => {
    setError(null);
    setAiError(null);
    setWrongAnswers([]); // Clear previous generated answers
    setHasGeneratedAnswers(false);
    if (!prompt.trim() || !correctAnswer.trim()) {
      setAiError('Please enter a question and a correct answer to generate wrong answers.');
      return;
    }

    // Check if this is a True/False question
    const isCorrectAnswerTrue = correctAnswer.toLowerCase().trim() === 'true';
    const isCorrectAnswerFalse = correctAnswer.toLowerCase().trim() === 'false';
    const isTrueFalseQuestion = isCorrectAnswerTrue || isCorrectAnswerFalse;
    
    if (isTrueFalseQuestion) {
      // For True/False questions, just set the opposite as the wrong answer
      const oppositeAnswer = isCorrectAnswerTrue ? 'False' : 'True';
      setWrongAnswers([oppositeAnswer]);
      setHasGeneratedAnswers(true);
      console.log('✅ Created True/False question:', { correctAnswer, wrongAnswer: oppositeAnswer });
      return;
    }

    setIsLoadingAI(true);
    try {
      console.log('Generating AI answers for:', { prompt, correctAnswer, sarcasmLevel });
      
      // Call the Supabase Edge Function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wrong-answers`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          correctAnswer: correctAnswer.trim(),
          sarcasmLevel: sarcasmLevel
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate answers`);
      }

      const data = await response.json();
      if (!data.wrongAnswers || !Array.isArray(data.wrongAnswers)) {
        throw new Error('Invalid response format from AI service');
      }

      setWrongAnswers(data.wrongAnswers);
      setHasGeneratedAnswers(true);
      console.log('Generated AI wrong answers:', data.wrongAnswers);

    } catch (err) {
      console.error('Error generating wrong answers:', err);
      setAiError(err instanceof Error ? err.message : 'Failed to generate wrong answers.');
    } finally {
      setIsLoadingAI(false);
    }
  };

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
      const filePath = `${sessionId}/${fileName}`; // Store images per session

      const { data, error: uploadError } = await supabase.storage
        .from('question-images') // Ensure this bucket exists and has public read/write policies
        .upload(filePath, selectedImageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      return supabase.storage.from('question-images').getPublicUrl(filePath).data.publicUrl;
    } catch (err) {
      setError(`Failed to upload image: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleWrongAnswerChange = (index: number, value: string) => {
    const updatedAnswers = [...wrongAnswers];
    updatedAnswers[index] = value;
    setWrongAnswers(updatedAnswers);
  };

  const handleRegenerateAnswer = async (index: number) => {
    if (!prompt.trim() || !correctAnswer.trim()) return;
    
    setIsLoadingAI(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wrong-answers`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          correctAnswer: correctAnswer.trim(),
          sarcasmLevel: sarcasmLevel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate answer');
      }

      const data = await response.json();
      if (data.wrongAnswers && Array.isArray(data.wrongAnswers) && data.wrongAnswers.length > 0) {
        // Use the first generated answer to replace the selected one
        const updatedAnswers = [...wrongAnswers];
        updatedAnswers[index] = data.wrongAnswers[0];
        setWrongAnswers(updatedAnswers);
      }
    } catch (err) {
      console.error('Error regenerating answer:', err);
      setAiError('Failed to regenerate answer. Please try again.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSaveQuestion = async () => {
    setError(null);
    if (!prompt.trim() || !correctAnswer.trim() || wrongAnswers.length === 0) {
      setError('Please generate wrong answers before saving the question.');
      return;
    }

    // Validate that all wrong answers have content
    const emptyAnswers = wrongAnswers.filter(answer => !answer.trim());
    if (emptyAnswers.length > 0) {
      setError('Please fill in all wrong answers before saving.');
      return;
    }

    let imageUrl: string | null = null;
    if (selectedImageFile) {
      imageUrl = await uploadImage();
      if (!imageUrl) return; // Stop if image upload failed
    }

    setIsSaving(true);
    try {
      const { data, error: dbError } = await supabase
        .from('custom_questions')
        .insert({
          session_id: sessionId,
          prompt: prompt.trim(),
          correct_answer: correctAnswer.trim(),
          wrong_answers: wrongAnswers.map(answer => answer.trim()), // Store the array of edited wrong answers
          sarcasm_level: sarcasmLevel,
          image_url: imageUrl, // Include the uploaded image URL
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error saving question:', dbError);
        throw new Error(`Failed to save question: ${dbError.message}`);
      }

      console.log('Question saved successfully:', data);
      onQuestionAdded(); // Notify parent component that a question was added
      // Optionally clear form fields after successful save
      setPrompt('');
      setCorrectAnswer('');
      setWrongAnswers([]);
      setSelectedImageFile(null);
      setPreviewImageUrl(null);
      setHasGeneratedAnswers(false);
      setSarcasmLevel(5);

    } catch (err) {
      console.error('Error saving question:', err);
      setError(err instanceof Error ? err.message : 'Failed to save question.');
    } finally {
      setIsSaving(false);
    }
  };

  const getSarcasmDescription = (level: number) => {
    if (level <= 2) return 'Lightweight & Professional';
    if (level <= 4) return 'Mildly Sarcastic';
    if (level <= 6) return 'Medium Sass';
    if (level <= 8) return 'Heavy Sarcasm';
    return 'Hold on for dear life!';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center p-8">
      <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl max-w-3xl w-full text-white">
        <h2 className="text-3xl font-bold mb-6 text-center text-yellow-400">Create Custom Question</h2>

        <div className="space-y-6">
          {/* Question Prompt Input */}
          <div>
            <label htmlFor="prompt" className="block text-lg font-medium text-gray-300 mb-2">Question Prompt</label>
            <textarea
              id="prompt"
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., What's the REAL reason most people check their work email on weekends?"
              disabled={isLoadingAI || isSaving || isUploadingImage}
            ></textarea>
          </div>

          {/* Correct Answer Input */}
          <div>
            <label htmlFor="correctAnswer" className="block text-lg font-medium text-gray-300 mb-2">Correct Answer</label>
            <input
              type="text"
              id="correctAnswer"
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="e.g., All of the above, and it's depressing"
              disabled={isLoadingAI || isSaving || isUploadingImage}
            />
          </div>

          {/* Sarcasm Level Slider */}
          <div>
            <label htmlFor="sarcasmLevel" className="block text-lg font-medium text-gray-300 mb-2">
              Sarcasm Level: <span className="font-bold text-yellow-300">{sarcasmLevel}</span>
              <span className="text-sm text-gray-400 ml-2">
                ({getSarcasmDescription(sarcasmLevel)})
              </span>
            </label>
            <input
              type="range"
              id="sarcasmLevel"
              min="1"
              max="10"
              value={sarcasmLevel}
              onChange={(e) => setSarcasmLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              disabled={isLoadingAI || isSaving || isUploadingImage}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 - Professional</span>
              <span>10 - Brutal</span>
            </div>
          </div>

          {/* Image Upload Input */}
          <div>
            <label htmlFor="imageUpload" className="block text-lg font-medium text-gray-300 mb-2">
              Optional: Upload Image for Question
            </label>
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50"
              disabled={isLoadingAI || isSaving || isUploadingImage}
            />
            {previewImageUrl && (
              <div className="mt-4 p-2 border border-white/20 rounded-lg bg-white/5">
                <p className="text-sm text-gray-300 mb-2">Image Preview:</p>
                <img src={previewImageUrl} alt="Image Preview" className="max-w-full h-auto rounded-lg mx-auto" />
                <button
                  onClick={() => { setSelectedImageFile(null); setPreviewImageUrl(null); }}
                  className="mt-2 text-sm text-red-400 hover:text-red-500"
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

          {/* Generate Wrong Answers Button */}
          <GameButton
            onClick={handleGenerateWrongAnswers}
            disabled={isLoadingAI || isSaving || !prompt.trim() || !correctAnswer.trim()}
            className="w-full mt-6"
          >
            {isLoadingAI ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generating AI Answers...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Brain className="w-5 h-5" />
                {hasGeneratedAnswers ? 'Regenerate All Wrong Answers' : 'Generate Wrong Answers with AI'}
              </div>
            )}
          </GameButton>

          {aiError && (
            <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-300 text-sm">
              ⚠️ {aiError}
            </div>
          )}

          {/* Display and Edit Generated Wrong Answers */}
          {wrongAnswers.length > 0 && (
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="text-xl font-bold text-gray-200 mb-3 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-400" />
                Edit Wrong Answers:
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                You can edit these AI-generated answers or regenerate individual ones.
              </p>
              <div className="space-y-2">
                {wrongAnswers.map((ans, index) => (
                  <div key={index} className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-purple-300">Option {String.fromCharCode(66 + index)}:</span>
                      <button
                        onClick={() => handleRegenerateAnswer(index)}
                        disabled={isLoadingAI || isSaving}
                        className="text-xs bg-purple-500/20 hover:bg-purple-500/40 px-2 py-1 rounded border border-purple-400/50 transition-colors disabled:opacity-50"
                        title="Regenerate this answer"
                      >
                        <Wand2 className="w-3 h-3 inline mr-1" />
                        Regenerate
                      </button>
                    </div>
                    <textarea
                      value={ans}
                      onChange={(e) => handleWrongAnswerChange(index, e.target.value)}
                      disabled={isLoadingAI || isSaving}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                      rows={2}
                      placeholder={`Wrong answer ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <GameButton // Save Question button
              onClick={handleSaveQuestion}
              disabled={isSaving || isLoadingAI || wrongAnswers.length === 0 || wrongAnswers.some(answer => !answer.trim())}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Question to Game
                </div>
              )}
            </GameButton>

            <GameButton // Cancel button
              onClick={onCancel}
              variant="primary"
              className="flex-1 bg-gray-500 hover:bg-gray-600"
              disabled={isLoadingAI || isSaving}
            >
              <div className="flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5" />
                Cancel
              </div>
            </GameButton>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};