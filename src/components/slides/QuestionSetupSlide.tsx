import React, { useEffect } from 'react';
import { GameButton } from '../GameButton';
import { SponsorManager } from '../SponsorManager';
import { CustomSponsor } from '../../types/game';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Play, List, Upload, FileText } from 'lucide-react';

interface QuestionSetupSlideProps {
  sessionId: string;
  customQuestions: any[];
  customSponsors: CustomSponsor[];
  numSponsorBreaks: number;
  onOpenQuestionCreator: () => void;
  onOpenCsvUpload: () => void;
  onStartGame: () => void;
  onRestartGame: () => void;
  onQuestionsChanged: () => void;
  onAddSponsor: (text: string) => Promise<void>;
  onDeleteSponsor: (sponsorId: string) => Promise<void>;
  onUpdateSponsorBreaks: (numBreaks: number) => Promise<void>;
  onSponsorsChanged: () => void;
}

export const QuestionSetupSlide: React.FC<QuestionSetupSlideProps> = ({
  sessionId,
  customQuestions,
  customSponsors,
  numSponsorBreaks,
  onOpenQuestionCreator,
  onOpenCsvUpload,
  onStartGame,
  onRestartGame,
  onQuestionsChanged,
  onAddSponsor,
  onDeleteSponsor,
  onUpdateSponsorBreaks,
  onSponsorsChanged
}) => {
  useEffect(() => {
    console.log('📝 Question Setup Slide loaded with questions:', customQuestions);
    console.log('📺 Question Setup Slide loaded with sponsors:', customSponsors);
  }, [customQuestions]);

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_questions')
        .delete()
        .eq('id', questionId);

      if (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question. Please try again.');
        return;
      }

      console.log('✅ Question deleted successfully');
      onQuestionsChanged(); // Refresh the questions list
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question. Please try again.');
    }
  };

  const getSarcasmDescription = (level: number) => {
    if (level <= 2) return 'Professional';
    if (level <= 4) return 'Mild';
    if (level <= 6) return 'Medium';
    if (level <= 8) return 'Heavy';
    return 'Brutal';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-yellow-400/20 rounded-full animate-bounce"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-green-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/10 rounded-full animate-ping"></div>
      </div>

      <div className="max-w-7xl w-full z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl md:text-8xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 drop-shadow-2xl animate-pulse">
            Question Setup
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-yellow-300 drop-shadow-lg">
            Create your custom quiz questions!
          </h2>
        </div>

        <div className="max-w-6xl mx-auto">
            {/* Question Creation Options */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">Create Questions</h3>
              <p className="text-gray-300 mb-6">Choose how you'd like to add questions to your game:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Manual Creation */}
                <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                  <div className="text-center">
                    <div className="bg-green-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Plus className="w-8 h-8 text-green-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Create Manually</h4>
                    <p className="text-gray-300 text-sm mb-4">
                      Create questions one by one with AI-generated wrong answers
                    </p>
                    <GameButton
                      onClick={onOpenQuestionCreator}
                      variant="primary"
                      className="bg-green-500 hover:bg-green-600 w-full"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Question
                      </div>
                    </GameButton>
                  </div>
                </div>

                {/* CSV Upload */}
                <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                  <div className="text-center">
                    <div className="bg-purple-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-purple-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Upload CSV</h4>
                    <p className="text-gray-300 text-sm mb-4">
                      Bulk upload questions from a CSV file with auto-generation
                    </p>
                    <GameButton
                      onClick={onOpenCsvUpload}
                      variant="primary"
                      className="bg-purple-500 hover:bg-purple-600 w-full"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Upload className="w-5 h-5" />
                        Upload CSV
                      </div>
                    </GameButton>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <List className="w-6 h-6 text-yellow-400" />
                  Your Questions ({customQuestions.length})
                </h3>
                <div className="flex gap-2">
                  <GameButton
                    onClick={onOpenQuestionCreator}
                    variant="primary"
                    className="bg-green-500 hover:bg-green-600 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add One
                    </div>
                  </GameButton>
                  <GameButton
                    onClick={onOpenCsvUpload}
                    variant="primary"
                    className="bg-purple-500 hover:bg-purple-600 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload CSV
                    </div>
                  </GameButton>
                </div>
              </div>

              {customQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50">📝</div>
                  <h4 className="text-xl font-bold text-gray-300 mb-2">No questions yet!</h4>
                  <p className="text-gray-400 mb-6">Create questions manually or upload a CSV file to get started.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <GameButton
                      onClick={onOpenQuestionCreator}
                      variant="primary"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Create Manually
                      </div>
                    </GameButton>
                    <GameButton
                      onClick={onOpenCsvUpload}
                      variant="primary"
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Upload CSV
                      </div>
                    </GameButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {customQuestions.map((question, index) => (
                    <div key={question.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-purple-500 text-white px-2 py-1 rounded text-sm font-bold">
                              Q{index + 1}
                            </span>
                            <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">
                              Sarcasm: {question.sarcasm_level}/10 ({getSarcasmDescription(question.sarcasm_level)})
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-white mb-2">{question.prompt}</h4>
                          <div className="mb-3">
                            <span className="text-green-400 font-semibold">Correct: </span>
                            <span className="text-gray-200">{question.correct_answer}</span>
                          </div>
                          <div>
                            <span className="text-red-400 font-semibold">Wrong answers: </span>
                            <div className="mt-1 space-y-1">
                              {question.wrong_answers?.map((answer: string, idx: number) => (
                                <div key={idx} className="text-gray-300 text-sm ml-4">
                                  • {answer}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button 
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-lg border border-blue-400/50 transition-colors"
                            title="Edit Question (Coming Soon)"
                            disabled
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </button>
                          <button 
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg border border-red-400/50 transition-colors"
                            onClick={() => handleDeleteQuestion(question.id)}
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sponsor Management Section */}
            <SponsorManager
              sessionId={sessionId}
              customSponsors={customSponsors}
              numSponsorBreaks={numSponsorBreaks}
              onAddSponsor={onAddSponsor}
              onDeleteSponsor={onDeleteSponsor}
              onUpdateSponsorBreaks={onUpdateSponsorBreaks}
              onSponsorsChanged={onSponsorsChanged}
            />

            {/* Start Game Section */}
            {customQuestions.length > 0 && (
              <div className="text-center">
                <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-6 border border-green-400/50 mb-4">
                  <h3 className="text-2xl font-bold text-green-400 mb-2">Ready to Start!</h3>
                  <p className="text-green-200 mb-4">
                    You have {customQuestions.length} custom question{customQuestions.length !== 1 ? 's' : ''} and {customSponsors.length} sponsor message{customSponsors.length !== 1 ? 's' : ''} ready to go.
                  </p>
                  <GameButton
                    onClick={onStartGame}
                    variant="primary"
                    className="bg-green-500 hover:bg-green-600 text-xl px-8 py-4"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-6 h-6" />
                      Go to Admin Control Panel
                    </div>
                  </GameButton>
                </div>
              </div>
            )}


        </div>
      </div>
    </div>
  );
};