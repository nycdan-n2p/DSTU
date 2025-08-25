import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { UserDashboard } from './UserDashboard';
import { HostGame } from '../pages/HostGame';
import { useSearchParams } from 'react-router-dom';

export const AuthenticatedApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');
  const [showCreateQuiz, setShowCreateQuiz] = useState(!!sessionParam);
  const [quizTitle, setQuizTitle] = useState<string>('');

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Loading...</h2>
          <p className="text-gray-300">Checking your authentication status</p>
        </div>
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!user) {
    return <AuthForm />;
  }

  // If user is authenticated and wants to create/host a quiz
  if (showCreateQuiz) {
    return (
      <HostGame 
        onBackToDashboard={() => setShowCreateQuiz(false)}
        existingSessionId={sessionParam}
        startInQuestionCreator={true}
        quizTitle={quizTitle}
      />
    );
  }

  // Show user dashboard by default
  return (
    <UserDashboard 
      onCreateNewQuiz={() => {
        const title = prompt('Name your quiz:', 'My Fun Quiz');
        if (title === null) return; // cancelled
        setQuizTitle(title || 'Untitled Quiz');
        setShowCreateQuiz(true);
      }}
    />
  );
};