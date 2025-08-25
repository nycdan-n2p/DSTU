import React, { useState, useCallback } from 'react';
import { GameButton } from './GameButton';
import { Upload, FileText, Wand2, Save, XCircle, AlertCircle, CheckCircle, Download, Edit, Image, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UploadedQuestion {
  id: string;
  prompt: string;
  correctAnswer: string;
  wrongAnswers: string[];
  sarcasmLevel: number;
  hasWrongAnswers: boolean;
  isGenerating?: boolean;
  generationError?: string;
  selectedImageFile?: File;
  previewImageUrl?: string;
  isUploadingImage?: boolean;
}

interface CsvUploadSectionProps {
  sessionId: string;
  onQuestionsUploaded: (questions: UploadedQuestion[]) => void;
  onClose: () => void;
}

export const CsvUploadSection: React.FC<CsvUploadSectionProps> = ({
  sessionId,
  onQuestionsUploaded,
  onClose
}) => {
  const [uploadedQuestions, setUploadedQuestions] = useState<UploadedQuestion[]>([]);
  const [globalSarcasmLevel, setGlobalSarcasmLevel] = useState(5);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const getSarcasmDescription = (level: number) => {
    if (level <= 2) return 'Professional & Lightweight';
    if (level <= 4) return 'Mildly Sarcastic';
    if (level <= 6) return 'Medium Sass';
    if (level <= 8) return 'Heavy Sarcasm';
    return 'Brutal & Ruthless';
  };

  // ✅ NEW: Upload image helper function
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = `${sessionId}/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      return supabase.storage.from('question-images').getPublicUrl(filePath).data.publicUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      throw err;
    }
  };

  // ✅ NEW: Handle image file change for individual questions
  const handleQuestionImageChange = (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    setUploadedQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        if (file) {
          if (!file.type.startsWith('image/')) {
            return {
              ...q,
              selectedImageFile: undefined,
              previewImageUrl: undefined,
              generationError: 'Please upload an image file (e.g., JPG, PNG, GIF).'
            };
          }
          return {
            ...q,
            selectedImageFile: file,
            previewImageUrl: URL.createObjectURL(file),
            generationError: undefined
          };
        } else {
          return {
            ...q,
            selectedImageFile: undefined,
            previewImageUrl: undefined
          };
        }
      }
      return q;
    }));
  };

  // ✅ NEW: Remove image for a specific question
  const handleRemoveQuestionImage = (questionId: string) => {
    setUploadedQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        // Clean up the preview URL
        if (q.previewImageUrl) {
          URL.revokeObjectURL(q.previewImageUrl);
        }
        return {
          ...q,
          selectedImageFile: undefined,
          previewImageUrl: undefined
        };
      }
      return q;
    }));
  };

  // ✅ NEW: Update question field
  const updateQuestionField = (questionId: string, field: keyof UploadedQuestion, value: any) => {
    setUploadedQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  // ✅ NEW: Update wrong answer
  const updateWrongAnswer = (questionId: string, answerIndex: number, value: string) => {
    setUploadedQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const newWrongAnswers = [...q.wrongAnswers];
        newWrongAnswers[answerIndex] = value;
        return { ...q, wrongAnswers: newWrongAnswers };
      }
      return q;
    }));
  };

  const parseCsvContent = (csvContent: string): UploadedQuestion[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const questions: UploadedQuestion[] = [];

    // Helper function to properly parse CSV lines with quoted fields
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Handle escaped quotes ("")
            current += '"';
            i += 2;
            continue;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
        i++;
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };

    // Skip header row if it exists
    const startIndex = lines[0]?.toLowerCase().includes('question') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Use improved CSV parsing
      const columns = parseCsvLine(line).map(col => col.replace(/^"|"$/g, ''));
      
      if (columns.length < 2) continue; // Need at least question and correct answer

      const prompt = columns[0];
      const correctAnswer = columns[1];
      const wrongAnswers = columns.slice(2, 5).filter(answer => answer && answer.trim());

      if (prompt && correctAnswer) {
        // Check if this is a True/False question
        const isCorrectAnswerTrue = correctAnswer.toLowerCase().trim() === 'true';
        const isCorrectAnswerFalse = correctAnswer.toLowerCase().trim() === 'false';
        const isTrueFalseQuestion = isCorrectAnswerTrue || isCorrectAnswerFalse;
        
        let finalWrongAnswers = wrongAnswers;
        let hasWrongAnswers = wrongAnswers.length >= 3;
        
        if (isTrueFalseQuestion) {
          // For True/False questions, set the opposite as the only wrong answer
          finalWrongAnswers = [isCorrectAnswerTrue ? 'False' : 'True'];
          hasWrongAnswers = true;
          console.log('✅ Detected True/False question:', { prompt, correctAnswer, wrongAnswer: finalWrongAnswers[0] });
        }

        questions.push({
          id: `csv-${i}-${Date.now()}`,
          prompt,
          correctAnswer,
          wrongAnswers: finalWrongAnswers,
          sarcasmLevel: globalSarcasmLevel,
          hasWrongAnswers,
          isGenerating: false,
          generationError: undefined,
          selectedImageFile: undefined,
          previewImageUrl: undefined,
          isUploadingImage: false
        });
      }
    }

    return questions;
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const text = await file.text();
      const questions = parseCsvContent(text);
      
      if (questions.length === 0) {
        setUploadError('No valid questions found in CSV. Please check the format.');
        return;
      }

      setUploadedQuestions(questions);
      console.log('✅ CSV parsed successfully:', questions.length, 'questions found');
      
    } catch (error) {
      console.error('❌ Error parsing CSV:', error);
      setUploadError('Failed to parse CSV file. Please check the format.');
    } finally {
      setIsUploading(false);
    }
  }, [globalSarcasmLevel]);

  const generateWrongAnswers = async (questionId: string) => {
    const question = uploadedQuestions.find(q => q.id === questionId);
    if (!question) return;

    // Update question state to show loading
    setUploadedQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, isGenerating: true, generationError: undefined }
        : q
    ));

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wrong-answers`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: question.prompt,
          correctAnswer: question.correctAnswer,
          sarcasmLevel: question.sarcasmLevel
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

      // Update question with generated answers
      setUploadedQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { 
              ...q, 
              wrongAnswers: data.wrongAnswers,
              hasWrongAnswers: true,
              isGenerating: false,
              generationError: undefined
            }
          : q
      ));

      console.log('✅ Generated wrong answers for question:', questionId);

    } catch (error) {
      console.error('❌ Error generating wrong answers:', error);
      setUploadedQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { 
              ...q, 
              isGenerating: false,
              generationError: error instanceof Error ? error.message : 'Failed to generate answers'
            }
          : q
      ));
    }
  };

  const generateAllMissingAnswers = async () => {
    const questionsNeedingAnswers = uploadedQuestions.filter(q => !q.hasWrongAnswers);
    
    for (const question of questionsNeedingAnswers) {
      await generateWrongAnswers(question.id);
      // Add a small delay between requests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleSaveQuestions = async () => {
    const questionsToSave = uploadedQuestions.filter(q => q.hasWrongAnswers);
    
    // Validate session ID first
    if (!sessionId || sessionId.trim() === '') {
      setSaveError('Invalid session. Please refresh the page and try again.');
      return;
    }
    
    if (questionsToSave.length === 0) {
      setSaveError('No questions with complete answers to save');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      console.log('💾 Processing questions for save:', {
        totalQuestions: questionsToSave.length,
        questionsWithImages: questionsToSave.filter(q => q.selectedImageFile).length,
        sessionId: sessionId,
        sessionIdValid: !!sessionId && sessionId.trim() !== ''
      });

      // Process each question and upload images if needed
      const processedQuestions = [];
      
      for (const question of questionsToSave) {
        let imageUrl: string | null = null;
        
        // Upload image if one is selected
        if (question.selectedImageFile) {
          console.log('📷 Uploading image for question:', question.prompt.substring(0, 50));
          
          // Set uploading state for this question
          setUploadedQuestions(prev => prev.map(q => 
            q.id === question.id ? { ...q, isUploadingImage: true } : q
          ));
          
          try {
            imageUrl = await uploadImage(question.selectedImageFile);
            console.log('✅ Image uploaded successfully:', imageUrl);
          } catch (uploadError) {
            console.error('❌ Image upload failed:', uploadError);
            setSaveError(`Failed to upload image for question: "${question.prompt.substring(0, 50)}...". Error: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
            return;
          } finally {
            // Clear uploading state
            setUploadedQuestions(prev => prev.map(q => 
              q.id === question.id ? { ...q, isUploadingImage: false } : q
            ));
          }
        }

        processedQuestions.push({
          session_id: sessionId,
          prompt: question.prompt.trim(),
          correct_answer: question.correctAnswer.trim(),
          wrong_answers: question.wrongAnswers.map(answer => answer.trim()),
          sarcasm_level: question.sarcasmLevel,
          image_url: imageUrl
        });
      }

      console.log('💾 Saving processed questions to database:', processedQuestions.length);

      // Save all questions to database
      const { data, error } = await supabase
        .from('custom_questions')
        .insert(processedQuestions)
        .select();

      if (error) {
        console.error('❌ Database error saving questions:', error);
        
        // Enhanced error handling
        let errorMessage = 'Failed to save questions to database. ';
        
        if (error.message.includes('JWT') || error.message.includes('auth')) {
          errorMessage += 'Authentication issue - please refresh the page and try again.';
        } else if (error.message.includes('permission') || error.message.includes('RLS')) {
          errorMessage += 'Permission denied - check your Supabase configuration.';
        } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage += 'Some questions may already exist in this session.';
        } else if (error.message.includes('foreign key') || error.message.includes('session_id')) {
          errorMessage += 'Invalid session - please refresh and try again.';
        } else {
          errorMessage += `Database error: ${error.message}`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Successfully saved', data.length, 'questions from CSV');
      
      // Call the callback with the original uploaded questions (for compatibility)
      onQuestionsUploaded(questionsToSave);
      
    } catch (error) {
      console.error('❌ Error in handleSaveQuestions:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save questions');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadSampleCsv = () => {
    const sampleData = [
      ['Question', 'Correct Answer', 'Wrong Answer 1', 'Wrong Answer 2', 'Wrong Answer 3'],
      ['What is the best way to handle difficult customers?', 'Listen actively and empathize', 'Ignore them completely', 'Argue back aggressively', 'Transfer them immediately'],
      ['Which communication tool is most effective for remote teams?', 'Video conferencing with screen sharing', 'Carrier pigeons', 'Smoke signals', 'Telepathy'],
      ['What is the key to successful project management?', 'Clear communication and realistic timelines', 'Panic and caffeine', 'Blame everyone else', 'Hope for the best']
    ];

    const csvContent = sampleData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-questions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const questionsNeedingAnswers = uploadedQuestions.filter(q => !q.hasWrongAnswers).length;
  const questionsReady = uploadedQuestions.filter(q => q.hasWrongAnswers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center p-8">
      <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl max-w-6xl w-full text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
            <Upload className="w-8 h-8" />
            Upload Questions via CSV
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg border border-red-400/50 transition-colors"
          >
            <XCircle className="w-6 h-6 text-red-400" />
          </button>
        </div>

        {/* Instructions and Sample Download */}
        <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/50 mb-6">
          <h3 className="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            CSV Format Instructions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-200">
            <div>
              <p className="font-semibold mb-2">Required Columns:</p>
              <ul className="space-y-1">
                <li>• Column A: Question</li>
                <li>• Column B: Correct Answer</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">Optional Columns:</p>
              <ul className="space-y-1">
                <li>• Column C: Wrong Answer 1</li>
                <li>• Column D: Wrong Answer 2</li>
                <li>• Column E: Wrong Answer 3</li>
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <GameButton
              onClick={downloadSampleCsv}
              variant="primary"
              className="bg-blue-500 hover:bg-blue-600 text-sm"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Sample CSV
              </div>
            </GameButton>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-300 mb-3">
            Select CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600 disabled:opacity-50"
          />
          {isUploading && (
            <div className="mt-2 flex items-center gap-2 text-yellow-300">
              <div className="w-4 h-4 border-2 border-yellow-300/30 border-t-yellow-300 rounded-full animate-spin"></div>
              <span className="text-sm">Parsing CSV file...</span>
            </div>
          )}
          {uploadError && (
            <div className="mt-2 bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {uploadError}
            </div>
          )}
        </div>

        {/* Global Sarcasm Level */}
        {uploadedQuestions.length > 0 && (
          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-300 mb-2">
              Global Sarcasm Level: <span className="font-bold text-yellow-300">{globalSarcasmLevel}</span>
              <span className="text-sm text-gray-400 ml-2">
                ({getSarcasmDescription(globalSarcasmLevel)})
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={globalSarcasmLevel}
              onChange={(e) => {
                const newLevel = parseInt(e.target.value);
                setGlobalSarcasmLevel(newLevel);
                // Update all questions with new sarcasm level
                setUploadedQuestions(prev => prev.map(q => ({ ...q, sarcasmLevel: newLevel })));
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 - Professional</span>
              <span>10 - Brutal</span>
            </div>
          </div>
        )}

        {/* Questions Summary */}
        {uploadedQuestions.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/50 text-center">
                <div className="text-2xl font-bold text-green-400">{uploadedQuestions.length}</div>
                <div className="text-sm text-green-300">Total Questions</div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-400/50 text-center">
                <div className="text-2xl font-bold text-yellow-400">{questionsNeedingAnswers}</div>
                <div className="text-sm text-yellow-300">Need Wrong Answers</div>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/50 text-center">
                <div className="text-2xl font-bold text-blue-400">{questionsReady}</div>
                <div className="text-sm text-blue-300">Ready to Save</div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {uploadedQuestions.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-4">
            {questionsNeedingAnswers > 0 && (
              <GameButton
                onClick={generateAllMissingAnswers}
                variant="primary"
                className="bg-purple-500 hover:bg-purple-600"
                disabled={uploadedQuestions.some(q => q.isGenerating)}
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Generate All Missing Answers ({questionsNeedingAnswers})
                </div>
              </GameButton>
            )}
            
            {questionsReady > 0 && (
              <GameButton
                onClick={handleSaveQuestions}
                variant="primary"
                className="bg-green-500 hover:bg-green-600"
                disabled={isSaving || uploadedQuestions.some(q => q.isUploadingImage)}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    Save All Questions ({questionsReady})
                  </div>
                )}
              </GameButton>
            )}
          </div>
        )}

        {saveError && (
          <div className="mb-6 bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {saveError}
          </div>
        )}

        {/* ✅ NEW: Editable Questions List */}
        {uploadedQuestions.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-yellow-400" />
              Edit Your Questions
            </h3>
            
            {uploadedQuestions.map((question, index) => (
              <div key={question.id} className="bg-white/10 rounded-lg p-6 border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold">
                    Question {index + 1}
                  </span>
                  <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">
                    Sarcasm: {question.sarcasmLevel}/10 ({getSarcasmDescription(question.sarcasmLevel)})
                  </span>
                  {question.hasWrongAnswers && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  {question.selectedImageFile && (
                    <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs border border-blue-400/50">
                      <Image className="w-3 h-3" />
                      Image Added
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* ✅ NEW: Editable Question Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Question Prompt
                    </label>
                    <textarea
                      value={question.prompt}
                      onChange={(e) => updateQuestionField(question.id, 'prompt', e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      rows={2}
                      disabled={isSaving}
                    />
                  </div>

                  {/* ✅ NEW: Editable Correct Answer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Correct Answer
                    </label>
                    <input
                      type="text"
                      value={question.correctAnswer}
                      onChange={(e) => updateQuestionField(question.id, 'correctAnswer', e.target.value)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      disabled={isSaving}
                    />
                  </div>

                  {/* ✅ NEW: Editable Wrong Answers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Wrong Answers
                    </label>
                    <div className="space-y-2">
                      {question.wrongAnswers.map((answer, answerIndex) => (
                        <div key={answerIndex} className="flex items-center gap-2">
                          <span className="text-red-400 font-bold text-sm w-8">
                            {String.fromCharCode(66 + answerIndex)}.
                          </span>
                          <input
                            type="text"
                            value={answer}
                            onChange={(e) => updateWrongAnswer(question.id, answerIndex, e.target.value)}
                            className="flex-1 p-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            placeholder={`Wrong answer ${answerIndex + 1}`}
                            disabled={isSaving}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ✅ NEW: Individual Sarcasm Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sarcasm Level: <span className="font-bold text-yellow-300">{question.sarcasmLevel}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={question.sarcasmLevel}
                      onChange={(e) => updateQuestionField(question.id, 'sarcasmLevel', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      disabled={isSaving}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Professional</span>
                      <span>Brutal</span>
                    </div>
                  </div>

                  {/* ✅ NEW: Image Upload for Individual Question */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Optional: Upload Image for This Question
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQuestionImageChange(question.id, e)}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50"
                      disabled={isSaving || question.isUploadingImage}
                    />
                    
                    {/* Image Preview */}
                    {question.previewImageUrl && (
                      <div className="mt-4 p-2 border border-white/20 rounded-lg bg-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-300">Image Preview:</p>
                          <button
                            onClick={() => handleRemoveQuestionImage(question.id)}
                            className="text-sm text-red-400 hover:text-red-500 flex items-center gap-1"
                            disabled={isSaving || question.isUploadingImage}
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </div>
                        <img 
                          src={question.previewImageUrl} 
                          alt="Question Preview" 
                          className="max-w-full h-auto max-h-48 rounded-lg mx-auto border border-white/20" 
                        />
                      </div>
                    )}
                    
                    {/* Image Upload Loading */}
                    {question.isUploadingImage && (
                      <div className="mt-2 flex items-center gap-2 text-yellow-300">
                        <div className="w-4 h-4 border-2 border-yellow-300/30 border-t-yellow-300 rounded-full animate-spin"></div>
                        <span className="text-sm">Uploading image...</span>
                      </div>
                    )}
                  </div>

                  {/* Generate Wrong Answers Button */}
                  {!question.hasWrongAnswers && (
                    <div className="flex justify-end">
                      <GameButton
                        onClick={() => generateWrongAnswers(question.id)}
                        variant="primary"
                        className="bg-purple-500 hover:bg-purple-600 text-sm"
                        disabled={question.isGenerating || isSaving}
                      >
                        {question.isGenerating ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Generating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Wand2 className="w-4 h-4" />
                            Generate Wrong Answers
                          </div>
                        )}
                      </GameButton>
                    </div>
                  )}

                  {/* Error Display */}
                  {question.generationError && (
                    <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-300 text-sm">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      {question.generationError}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};