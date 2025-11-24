import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthForm from './components/AuthForm';
import QuizSetup from './components/QuizSetup';
import QuizGame from './components/QuizGame';
import Leaderboard from './components/Leaderboard';
import QuizReport from './components/QuizReport';
import QuizAttempts from './components/QuizAttempts';

const AppContent = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState('menu'); // menu, game, leaderboard, report, attempts
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeResultId, setActiveResultId] = useState(null);

  if (!user) {
    return (
      <div className="container">
        <h1>QuizMaster</h1>
        <AuthForm />
      </div>
    );
  }

  const startQuiz = (quizId) => {
    setActiveQuizId(quizId);
    setView('game');
  };

  const endGame = () => {
    setActiveQuizId(null);
    setView('menu');
  };

  const showReport = (resultId) => {
    setActiveResultId(resultId);
    setView('report');
  };

  const viewAttempts = (quizId) => {
    setActiveQuizId(quizId);
    setView('attempts');
  };

  const backToMenu = () => {
    setActiveQuizId(null);
    setActiveResultId(null);
    setView('menu');
  };

  const backToAttempts = () => {
    // Keep activeQuizId, just change view
    setActiveResultId(null);
    setView('attempts');
  };

  return (
    <div className="container">
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 10, 20, 0.95)',
        backdropFilter: 'blur(10px)',
        width: '100%',
        marginBottom: '2rem',
        padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.75rem, 3vw, 1.5rem)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          width: '100%'
        }}>
          {/* Top row: Logo and User greeting */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <h1
              onClick={() => setView('menu')}
              style={{
                fontSize: 'clamp(1.25rem, 5vw, 2rem)',
                margin: 0,
                cursor: 'pointer',
                transition: 'color 0.3s ease',
                userSelect: 'none',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.color = 'inherit'}
            >
              QuizMaster
            </h1>
            <span style={{
              fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap'
            }}>
              Hello, {user.username}
            </span>
          </div>

          {/* Bottom row: Action buttons */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setView('leaderboard')}
              style={{
                padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                minWidth: 'auto'
              }}
            >
              Leaderboard
            </button>
            <button
              onClick={logout}
              style={{
                padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                background: 'rgba(255,255,255,0.1)',
                minWidth: 'auto'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {view === 'menu' && <QuizSetup onStartQuiz={startQuiz} onViewAttempts={viewAttempts} />}
      {view === 'game' && <QuizGame quizId={activeQuizId} onEndGame={endGame} onShowReport={showReport} />}
      {view === 'leaderboard' && <Leaderboard onBack={backToMenu} />}
      {view === 'report' && <QuizReport resultId={activeResultId} onBackToMenu={backToMenu} onBackToAttempts={backToAttempts} />}
      {view === 'attempts' && <QuizAttempts quizId={activeQuizId} userId={user.id} onViewReport={showReport} onBack={backToMenu} />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
