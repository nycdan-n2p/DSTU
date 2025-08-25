import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MultipleChoiceQuestion, TrickQuestion } from '../../types/game';
import { GameButton } from '../GameButton';
import { Timer } from '../Timer';
import { SlideTransition } from '../SlideTransition';
import { CheckCircle, Clock, Lock } from 'lucide-react';

interface PlayerQuestionSlideProps {
  question: MultipleChoiceQuestion | TrickQuestion;
  shuffledOptions: string[];
  shuffledCorrectAnswerIndex: number;
  onAnswer: (answer: number, responseTime: number, shuffledCorrectAnswerIndex: number) => void;
  questionStartTime: string;
  currentQuestionIndex: number; // ✅ NEW: Clear signal for question changes
}

export const PlayerQuestionSlide: React.FC<PlayerQuestionSlideProps> = ({
  question,
  shuffledOptions,
  shuffledCorrectAnswerIndex,
  onAnswer,
  questionStartTime,
  currentQuestionIndex
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [startTime] = useState(Date.now());
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false); // ✅ NEW: Lock state
  const submitTimeoutRef = useRef<number | null>(null);
  const submissionInProgressRef = useRef<boolean>(false); // ✅ NEW: Prevent race conditions
  const isMountedRef = useRef<boolean>(true);

  // ✅ FIXED: Declare clearSubmitTimeout before it's used in useEffect
  const clearSubmitTimeout = useCallback(() => {
    if (submitTimeoutRef.current !== null) {
      window.clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
  }, []);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ FIXED: Main effect that handles question changes and state resets
  useEffect(() => {
    console.log('🎯 PlayerQuestionSlide effect triggered:', {
      currentQuestionIndex,
      questionId: question?.id,
      prompt: question?.prompt?.substring(0, 50),
      optionsCount: shuffledOptions?.length,
      shuffledCorrectIndex: shuffledCorrectAnswerIndex
    });
    
    // ✅ CRITICAL: Reset ALL component state when question changes
    setSelectedAnswer(null);
    setHasSubmitted(false);
    setIsSubmitting(false);
    setIsLocked(false);
    setSubmitError(null);
    setRetryCount(0);
    setShowOptions(false);
    setTimerActive(false);
    submissionInProgressRef.current = false;
    
    // Clear any pending timeouts
    clearSubmitTimeout();
    
    console.log('✅ Child: Using shuffled options from parent:', {
      shuffledOptions: shuffledOptions?.slice(0, 2),
      shuffledCorrectIndex: shuffledCorrectAnswerIndex
    });
    
    // Show options and start timer after a brief delay
    const timer = window.setTimeout(() => {
      if (isMountedRef.current) {
        console.log('✅ Showing options and starting timer');
        setShowOptions(true);
        setTimerActive(true);
      }
    }, 1000);

    return () => {
      window.clearTimeout(timer);
      clearSubmitTimeout();
    };
  }, [question?.id, shuffledOptions, shuffledCorrectAnswerIndex, clearSubmitTimeout]);

  const handleAnswerSelect = useCallback(async (answerIndex: number) => {
    if (!shuffledOptions || shuffledOptions.length === 0) {
      console.log('⚠️ No shuffled options available');
      return;
    }

    console.log('🎯 Answer button clicked:', {
      answerIndex,
      hasSubmitted,
      isSubmitting,
      isLocked,
      selectedAnswer,
      submissionInProgress: submissionInProgressRef.current,
      optionText: shuffledOptions[answerIndex],
      retryCount
    });
    
    // ✅ ENHANCED: Multiple layers of protection against duplicate submissions
    if (hasSubmitted || isSubmitting || isLocked || selectedAnswer !== null || submissionInProgressRef.current || !isMountedRef.current) {
      console.log('⚠️ Answer submission blocked:', {
        hasSubmitted,
        isSubmitting,
        isLocked,
        selectedAnswer,
        submissionInProgress: submissionInProgressRef.current,
        isMounted: isMountedRef.current
      });
      return;
    }
    
    console.log('✅ Processing answer submission...');
    
    // ✅ IMMEDIATE LOCKING: Set all blocking states immediately
    setIsSubmitting(true);
    setSelectedAnswer(answerIndex);
    setIsLocked(true);
    setTimerActive(false);
    setSubmitError(null);
    submissionInProgressRef.current = true;
    
    const responseTime = Date.now() - startTime;
    
    try {
      console.log('📤 Calling onAnswer with:', { answerIndex, responseTime });
      
      // Set a timeout for the submission (10 seconds)
      submitTimeoutRef.current = window.setTimeout(() => {
        console.log('⏰ Submission timeout reached');
        if (!hasSubmitted && isMountedRef.current) {
          setSubmitError('Submission timed out. Please try refreshing the page.');
          setIsSubmitting(false);
          // Don't unlock - keep the answer locked to prevent confusion
          setRetryCount(prev => prev + 1);
        }
      }, 10000);
      
      await onAnswer(answerIndex, responseTime, shuffledCorrectAnswerIndex);
      
      // Clear timeout on success
      clearSubmitTimeout();
      
      console.log('✅ Answer submitted successfully');
      if (isMountedRef.current) {
        setHasSubmitted(true);
        setIsSubmitting(false);
        // Keep isLocked = true to prevent any further changes
      }
      
    } catch (error) {
      console.error('❌ Failed to submit answer:', error);
      
      // Clear timeout on error
      clearSubmitTimeout();
      
      if (isMountedRef.current) {
        setSubmitError(error instanceof Error ? error.message : 'Failed to submit answer');
        setIsSubmitting(false);
        setRetryCount(prev => prev + 1);
        
        // ✅ CRITICAL: Don't unlock on error to prevent multiple submissions
        // Keep the answer locked and show error message
        if (retryCount >= 2) {
          setSubmitError('Unable to submit. Your answer has been recorded locally. Please refresh if needed.');
        }
      }
    } finally {
      submissionInProgressRef.current = false;
    }
  }, [hasSubmitted, isSubmitting, isLocked, selectedAnswer, onAnswer, startTime, retryCount, clearSubmitTimeout]);

  const handleTimeUp = useCallback(() => {
    console.log('⏰ Time up! Current state:', { hasSubmitted, isSubmitting, isLocked, selectedAnswer });
    
    if (hasSubmitted || isSubmitting || isLocked || submissionInProgressRef.current || !isMountedRef.current) {
      console.log('⏰ Time up but already submitted/locked, ignoring');
      return;
    }
    
    setTimerActive(false);
    
    // Auto-submit random answer if no answer selected
    if (selectedAnswer === null && shuffledOptions && shuffledOptions.length > 0) {
      console.log('🎲 Auto-submitting random answer due to timeout');
      const randomAnswer = Math.floor(Math.random() * shuffledOptions.length);
      handleAnswerSelect(randomAnswer);
    }
  }, [hasSubmitted, isSubmitting, isLocked, selectedAnswer, handleAnswerSelect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSubmitTimeout();
    };
  }, [clearSubmitTimeout]);

  // Guard clause for missing question data
  if (!question || !shuffledOptions || !Array.isArray(shuffledOptions) || shuffledOptions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <h1 className="text-3xl font-bold mb-4">Loading Question...</h1>
          <p className="text-xl">Please wait...</p>
        </div>
      </div>
    );
  }

  // ✅ ENHANCED: Show submitted state with locked answer
  if (hasSubmitted && selectedAnswer !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <SlideTransition isVisible={true} direction="bounce" className="text-center">
            <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-8 border border-green-400/50">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-2xl font-bold text-green-400 mb-4">Answer Submitted!</h3>
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <p className="text-lg text-gray-300 mb-2">You selected:</p>
                <p className="text-xl font-bold text-white">
                  {String.fromCharCode(65 + selectedAnswer)}. {shuffledOptions[selectedAnswer] || 'Unknown option'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-yellow-300 mb-4">
                <Lock className="w-5 h-5" />
                <span>Answer locked - waiting for other players...</span>
              </div>
              <div className="animate-pulse text-4xl">⏳</div>
              <p className="text-sm text-gray-400 mt-4">
                The host will show results when everyone has answered
              </p>
            </div>
          </SlideTransition>
        </div>
      </div>
    );
  }

  // ✅ ENHANCED: Show locked state during submission
  if (isLocked && selectedAnswer !== null && !hasSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <SlideTransition isVisible={true} direction="bounce" className="text-center">
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-400/50">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-300/30 border-t-blue-300 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-2xl font-bold text-blue-400 mb-4">Submitting Answer...</h3>
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <p className="text-lg text-gray-300 mb-2">Your selection:</p>
                <p className="text-xl font-bold text-white">
                  {String.fromCharCode(65 + selectedAnswer)}. {shuffledOptions[selectedAnswer] || 'Unknown option'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-blue-300 mb-4">
                <Lock className="w-5 h-5" />
                <span>Answer locked - processing submission...</span>
              </div>
              
              {submitError && (
                <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 mt-4">
                  <p className="text-red-300 text-sm">⚠️ {submitError}</p>
                </div>
              )}
            </div>
          </SlideTransition>
        </div>
      </div>
    );
  }

  console.log('🎮 Rendering question interface:', {
    hasSubmitted,
    isSubmitting,
    isLocked,
    selectedAnswer,
    showOptions,
    timerActive,
    optionsCount: shuffledOptions.length,
    submitError,
    retryCount
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">
            {question.prompt || 'Loading question...'}
          </h2>
          
          {/* ✅ NEW: Display question image if available */}
          {question.image_url && (
            <div className="mb-6">
              <img 
                src={question.image_url} 
                alt="Question illustration"
                className="max-w-full h-auto max-h-48 object-contain mx-auto rounded-lg shadow-lg border-2 border-white/20"
                onError={(e) => {
                  console.error('Failed to load question image:', question.image_url);
                  // Hide the image if it fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {showOptions && !isLocked && question.timer && (
            <Timer 
              duration={question.timer}
              onTimeUp={handleTimeUp}
              isActive={timerActive}
              className="mb-6"
            />
          )}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="mb-6">
            <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4">
              <p className="text-red-300 text-sm">⚠️ {submitError}</p>
              {retryCount < 2 && (
                <p className="text-red-200 text-xs mt-1">
                  Your answer is saved locally. Please wait...
                </p>
              )}
            </div>
          </div>
        )}

        <SlideTransition isVisible={showOptions} direction="bounce" className="space-y-4">
          {shuffledOptions.length > 0 ? (
            shuffledOptions.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isDisabled = isLocked || hasSubmitted || isSubmitting;
              
              return (
                <button
                  key={`option-${index}`}
                  onClick={() => {
                    console.log(`🖱️ Option ${index} clicked: "${option}"`);
                    handleAnswerSelect(index);
                  }}
                  disabled={isDisabled}
                  className={`w-full text-left text-lg p-6 rounded-lg font-bold transition-all duration-200 border-2 shadow-lg ${
                    isDisabled 
                      ? 'opacity-50 cursor-not-allowed bg-gray-500 border-gray-400' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 cursor-pointer hover:scale-105 active:scale-95 border-white/20 hover:border-white/40'
                  } ${isSelected ? 'ring-4 ring-yellow-400 scale-105 border-yellow-400' : ''}`}
                >
                  <div className="flex items-center">
                    <span className="font-bold mr-3 text-xl text-white bg-black/20 rounded-full w-8 h-8 flex items-center justify-center">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-white">{option}</span>
                    {isSelected && isLocked && (
                      <Lock className="ml-2 w-5 h-5 text-yellow-400" />
                    )}
                    {isSubmitting && isSelected && (
                      <div className="ml-2 w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center">
              <div className="text-xl text-gray-300">Loading answer options...</div>
            </div>
          )}
        </SlideTransition>

        {/* Locked State Message */}
        {isLocked && !hasSubmitted && (
          <div className="text-center mt-6">
            <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-400/50">
              <div className="flex items-center justify-center gap-2 text-yellow-300">
                <Lock className="w-5 h-5" />
                <span>Answer locked - submitting...</span>
              </div>
              <p className="text-xs text-yellow-200 mt-2">
                Please wait while we process your submission
              </p>
            </div>
          </div>
        )}

        {/* Network Issues Help */}
        {submitError && retryCount >= 2 && (
          <div className="text-center mt-6">
            <div className="bg-orange-500/20 rounded-lg p-4 border border-orange-400/50">
              <p className="text-orange-300 text-sm mb-2">Having trouble submitting?</p>
              <p className="text-orange-200 text-xs mb-3">Your answer is saved. You can refresh if needed.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {/* Debug info in development */}
        {import.meta.env.DEV && (
          <div className="mt-6 bg-black/50 rounded-lg p-4 text-xs text-gray-300">
            <p>Debug Info:</p>
            <p>hasSubmitted: {hasSubmitted ? 'true' : 'false'}</p>
            <p>isSubmitting: {isSubmitting ? 'true' : 'false'}</p>
            <p>isLocked: {isLocked ? 'true' : 'false'}</p>
            <p>selectedAnswer: {selectedAnswer}</p>
            <p>showOptions: {showOptions ? 'true' : 'false'}</p>
            <p>timerActive: {timerActive ? 'true' : 'false'}</p>
            <p>submissionInProgress: {submissionInProgressRef.current ? 'true' : 'false'}</p>
            <p>optionsCount: {shuffledOptions.length}</p>
            <p>submitError: {submitError || 'none'}</p>
            <p>retryCount: {retryCount}</p>
            <p>questionPrompt: {question.prompt?.substring(0, 50)}...</p>
            <p>shuffledOptions: {shuffledOptions.map((opt, i) => `${i}:${opt.substring(0, 20)}`).join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
};