import React from 'react';
import { GameData } from '../types/game';
import { WelcomeSlide } from './slides/WelcomeSlide';
import { HostWaitingSlide } from './slides/HostWaitingSlide';
import { SponsorSlide } from './slides/SponsorSlide';
import { MultiplayerQuestionSlide } from './slides/MultiplayerQuestionSlide';
import { ResultsSlide } from './slides/ResultsSlide';
import { AwardSlide } from './slides/AwardSlide';
import { FinalPodiumSlide } from './slides/FinalPodiumSlide';
import { QuestionCreator } from './QuestionCreator';
import { QuestionSetupSlide } from './slides/QuestionSetupSlide';
import { CsvUploadSection } from './CsvUploadSection';
import { CustomSponsor } from '../types/game';
import { Player } from '../types/game';

type GamePhase = 'welcome' | 'waiting' | 'question_setup' | 'sponsor1' | 'question' | 'results' | 'sponsor2' | 'podium' | 'final';

interface GamePhaseRendererProps {
  currentPhase: GamePhase;
  gameData: GameData;
  selectedIntroText: string;
  sessionId: string;
  players: Player[];
  currentQuestionIndex: number;
  questionResults: any;
  shuffledHostQuestionData: {
    questionId: string;
    shuffledOptions: string[];
    shuffledCorrectAnswerIndex: number;
  } | null;
  showPoints: boolean;
  customQuestions: any[];
  customSponsors: CustomSponsor[];
  numSponsorBreaks: number;
  showQuestionCreator: boolean;
  showCsvUpload: boolean;
  isJumbotron?: boolean; // NEW: Flag to indicate if this is the jumbotron display
  
  // Callbacks
  onStartQuiz: () => void;
  onStartGameWithCustomQuestions: () => void;
  onStartGame: () => void;
  onRestartGame: () => void;
  onNextPhase: () => void;
  onTogglePoints: () => void;
  onOpenQuestionCreator: () => void;
  onCloseQuestionCreator: () => void;
  onQuestionAdded: () => void;
  onOpenCsvUpload: () => void;
  onCloseCsvUpload: () => void;
  onCsvQuestionsUploaded: (questions: any[]) => void;
  onQuestionsChanged: () => void;
  onAddSponsor: (text: string) => Promise<void>;
  onAddSponsor: (text: string, imageUrl?: string | null) => Promise<void>;
  onDeleteSponsor: (sponsorId: string) => Promise<void>;
  onUpdateSponsorBreaks: (numBreaks: number) => Promise<void>;
  onSponsorsChanged: () => void;
  
  // Functions
  getCurrentQuestions: () => any[];
  getAllStreaks: () => any[];
  currentSponsorIndex: number;
  onNextSponsor: () => void;
  getQuestionResults?: (questionIndex: number) => Promise<any>; // NEW: Optional for jumbotron
  // ✅ NEW: Connection status
  isConnected?: boolean;
  isHealthy?: boolean;
  fallbackPolling?: boolean;
  reconnectAttempts?: number;
  // ✅ NEW: Manual refresh function
  onRefreshPlayers?: () => void;
}

export const GamePhaseRenderer: React.FC<GamePhaseRendererProps> = ({
  currentPhase,
  gameData,
  selectedIntroText,
  sessionId,
  players,
  currentQuestionIndex,
  questionResults,
  shuffledHostQuestionData,
  showPoints,
  customQuestions,
  customSponsors,
  numSponsorBreaks,
  showQuestionCreator,
  showCsvUpload,
  isJumbotron = false,
  onStartQuiz,
  onStartGameWithCustomQuestions,
  onStartGame,
  onRestartGame,
  onNextPhase,
  onTogglePoints,
  onOpenQuestionCreator,
  onCloseQuestionCreator,
  onQuestionAdded,
  onOpenCsvUpload,
  onCloseCsvUpload,
  onCsvQuestionsUploaded,
  onQuestionsChanged,
  onAddSponsor,
  onDeleteSponsor,
  onUpdateSponsorBreaks,
  onSponsorsChanged,
  getCurrentQuestions,
  getAllStreaks,
  currentSponsorIndex,
  onNextSponsor,
  getQuestionResults,
  isConnected = true,
  isHealthy = true,
  fallbackPolling = false,
  reconnectAttempts = 0,
  onRefreshPlayers
}) => {
  switch (currentPhase) {
    case 'welcome':
      return (
        <WelcomeSlide 
          intro={{
            ...gameData.intro,
            text: selectedIntroText
          }}
          onStartQuiz={onStartQuiz}
        />
      );

    case 'question_setup':
      // Don't show question setup on jumbotron
      if (isJumbotron) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">⚙️</div>
              <h1 className="text-4xl font-bold mb-4">Setting Up Questions...</h1>
              <p className="text-xl">The host is preparing the game</p>
            </div>
          </div>
        );
      }
      
      if (showQuestionCreator) {
        return (
          <QuestionCreator
            sessionId={sessionId}
            onQuestionAdded={onQuestionAdded}
            onCancel={onCloseQuestionCreator}
          />
        );
      }
      if (showCsvUpload) {
        return (
          <CsvUploadSection
            sessionId={sessionId}
            onQuestionsUploaded={onCsvQuestionsUploaded}
            onClose={onCloseCsvUpload}
          />
        );
      }
      return (
        <QuestionSetupSlide
          sessionId={sessionId}
          customQuestions={customQuestions}
          customSponsors={customSponsors}
          numSponsorBreaks={numSponsorBreaks}
          onOpenQuestionCreator={onOpenQuestionCreator}
          onOpenCsvUpload={onOpenCsvUpload}
          onStartGame={onStartGameWithCustomQuestions}
          onRestartGame={onRestartGame}
          onQuestionsChanged={onQuestionsChanged}
          onAddSponsor={onAddSponsor}
          onDeleteSponsor={onDeleteSponsor}
          onUpdateSponsorBreaks={onUpdateSponsorBreaks}
          onSponsorsChanged={onSponsorsChanged}
          showPoints={showPoints}
          onTogglePoints={onTogglePoints}
        />
      );

    case 'waiting':
      return (
        <HostWaitingSlide 
          intro={{
            ...gameData.intro,
            text: selectedIntroText
          }}
          sessionId={sessionId}
          players={players || []}
          onStartGame={onStartGame}
          onRestartGame={onRestartGame}
          totalQuestions={gameData.questions?.length || 0}
          showPoints={showPoints}
          onTogglePoints={onTogglePoints}
          isJumbotron={isJumbotron}
          isConnected={isConnected}
          isHealthy={isHealthy}
          fallbackPolling={fallbackPolling}
          reconnectAttempts={reconnectAttempts}
          onRefreshPlayers={onRefreshPlayers}
        />
      );
    
    case 'sponsor1':
    case 'sponsor2':
      // Use custom sponsors with cycling, otherwise fall back to default
      let sponsorToShow;
      if (customSponsors && customSponsors.length > 0) {
        // Cycle through custom sponsors
        const sponsorData = customSponsors[currentSponsorIndex % customSponsors.length];
        sponsorToShow = { text: sponsorData.text, image_url: sponsorData.image_url };
      } else {
        // Fall back to default sponsors
        const defaultIndex = currentPhase === 'sponsor1' ? 0 : 1;
        sponsorToShow = gameData.sponsors?.[defaultIndex];
      }
      
      return sponsorToShow ? (
        <SponsorSlide 
          sponsor={sponsorToShow} 
          onNext={() => { onNextSponsor(); onNextPhase(); }}
          isJumbotron={isJumbotron}
        />
      ) : (
        <div className="min-h-screen bg-red-600 flex items-center justify-center text-white">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Sponsor Data Missing</h1>
            {!isJumbotron && (
              <button onClick={onNextPhase} className="bg-white text-red-600 px-6 py-3 rounded">
                {currentPhase === 'sponsor1' ? 'Skip to Question' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      )
    
    case 'question':
      const currentQuestions = getCurrentQuestions();
      const currentQuestion = currentQuestions[currentQuestionIndex];
      if (!currentQuestion) {
        console.error('❌ Question not found at index:', currentQuestionIndex);
        return (
          <div className="min-h-screen bg-red-600 flex items-center justify-center text-white">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">Question Not Found</h1>
              <p>Question {currentQuestionIndex + 1} doesn't exist</p>
              <p className="text-sm mt-2">Available questions: {currentQuestions.length}</p>
              {!isJumbotron && (
                <button onClick={onRestartGame} className="mt-4 bg-white text-red-600 px-6 py-3 rounded">
                  Restart Game
                </button>
              )}
            </div>
          </div>
        );
      }
      
      // Only render question slide when shuffled data is available
      if (!shuffledHostQuestionData) {
        return (
          <div className="min-h-screen bg-blue-600 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">🔄</div>
              <div className="text-2xl">Preparing Question...</div>
              <p className="text-lg mt-2">Setting up question {currentQuestionIndex + 1}</p>
            </div>
          </div>
        );
      }
      
      console.log('🎯 Rendering question slide for question:', currentQuestionIndex, currentQuestion.prompt);
      
      return (
        <MultiplayerQuestionSlide 
          question={currentQuestion}
          shuffledOptions={shuffledHostQuestionData.shuffledOptions}
          shuffledCorrectAnswerIndex={shuffledHostQuestionData.shuffledCorrectAnswerIndex}
          players={players || []}
          onTimeUp={onNextPhase}
          onNextQuestion={onNextPhase}
          onRestartGame={onRestartGame}
          currentQuestion={currentQuestionIndex}
          totalQuestions={currentQuestions.length}
          isHost={!isJumbotron}
          showPoints={showPoints}
          onTogglePoints={onTogglePoints}
          streakTracker={{ getAllStreaks }}
          isJumbotron={isJumbotron}
          isConnected={isConnected}
          isHealthy={isHealthy}
          fallbackPolling={fallbackPolling}
          reconnectAttempts={reconnectAttempts}
        />
      );
    
    case 'results':
      if (!questionResults) {
        // For jumbotron, we need to fetch results
        if (isJumbotron && getQuestionResults) {
          // This will be handled by the jumbotron component
          return (
            <div className="min-h-screen bg-blue-600 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-6xl mb-4 animate-pulse">📊</div>
                <div className="text-2xl">Loading results...</div>
              </div>
            </div>
          );
        }
        
        return (
          <div className="min-h-screen bg-blue-600 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">📊</div>
              <div className="text-2xl">Loading results...</div>
            </div>
          </div>
        );
      }
      return (
        <ResultsSlide
          correctPlayers={questionResults.correct?.map((a: any) => a?.players).filter(Boolean) || []}
          wrongPlayers={questionResults.wrong?.map((a: any) => a?.players).filter(Boolean) || []}
          fastestPlayer={questionResults.fastest?.players}
          slowestPlayer={questionResults.slowest?.players}
          groupFeedback={gameData.group_feedback}
          onNext={onNextPhase}
          onRestartGame={onRestartGame}
          currentQuestion={currentQuestionIndex}
          totalQuestions={getCurrentQuestions().length}
          isHost={!isJumbotron}
          showPoints={showPoints}
          onTogglePoints={onTogglePoints}
          streakTracker={{ getAllStreaks }}
          isJumbotron={isJumbotron}
        />
      );
    
    case 'podium':
      // Pass the latest players data to podium
      console.log('🏆 Rendering final podium with players:', players?.map(p => ({ name: p.name, score: p.score })));
      return (
        <FinalPodiumSlide
          players={players || []}
          onRestart={onRestartGame}
          streakTracker={{ getAllStreaks }}
          isJumbotron={isJumbotron}
        />
      );
    
    case 'final':
      const randomAward = gameData.awards?.[Math.floor(Math.random() * (gameData.awards?.length || 1))];
      return randomAward ? (
        <AwardSlide award={randomAward} onRestart={onRestartGame} isJumbotron={isJumbotron} />
      ) : (
        <div className="min-h-screen bg-red-600 flex items-center justify-center text-white">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Game Complete!</h1>
            {!isJumbotron && (
              <button onClick={onRestartGame} className="bg-white text-red-600 px-6 py-3 rounded">
                Play Again
              </button>
            )}
          </div>
        </div>
      );
    
    default:
      return (
        <div className="min-h-screen bg-red-600 flex items-center justify-center text-white">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Unknown Phase</h1>
            <p>Phase: {currentPhase}</p>
            {!isJumbotron && (
              <button onClick={onRestartGame} className="mt-4 bg-white text-red-600 px-6 py-3 rounded">
                Restart Game
              </button>
            )}
          </div>
        </div>
      );
  }
};