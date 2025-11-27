import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AuthForm from './components/AuthForm';
import Home from './components/Home';
// import QuizSetup from './components/QuizSetup'; // Removed as per user request
import QuizGame from './components/QuizGame';
import Leaderboard from './components/Leaderboard';
import QuizReport from './components/QuizReport';
import QuizAttempts from './components/QuizAttempts';
import MyQuizzes from './components/MyQuizzes';
import QuizCreator from './components/QuizCreator';
import QuizHub from './components/QuizHub';
import AIGenerator from './components/AIGenerator';
import QuizReview from './components/QuizReview';
import UserProfile from './components/UserProfile';
import Logo from './components/Logo';

const AppContent = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState('home'); // home, menu, game, leaderboard, report, attempts, my-quizzes, creator, hub, ai-generator, review, profile
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeResultId, setActiveResultId] = useState(null);
  const [editQuizId, setEditQuizId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

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
    setView('home');
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
    setView('home');
  };

  const backToAttempts = (quizId) => {
    if (quizId) setActiveQuizId(quizId);
    setActiveResultId(null);
    setView('attempts');
  };

  return (
    <div className="container">
      <style>
        {`
          .nav-menu {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-start;
            flex-wrap: wrap;
            overflow-x: auto;
            padding-bottom: 0.5rem;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .nav-menu::-webkit-scrollbar {
            display: none;
          }
          .menu-toggle {
            display: none;
          }
          
          @media (max-width: 768px) {
            .nav-menu {
              display: ${isMenuOpen ? 'flex' : 'none'};
              flex-direction: column;
              width: 100%;
              overflow-x: visible;
              padding-bottom: 0;
            }
            .menu-toggle {
              display: block;
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: white;
              padding: 0.5rem;
              border-radius: 8px;
              cursor: pointer;
              font-size: 1.2rem;
            }
            .user-greeting {
              display: none; /* Hide greeting in top row on mobile to save space */
            }
            .mobile-greeting {
              display: block;
              color: var(--text-muted);
              font-size: 0.9rem;
              padding: 0.5rem 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              margin-bottom: 0.5rem;
            }
          }
          @media (min-width: 769px) {
            .mobile-greeting {
              display: none;
            }
          }
        `}
      </style>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 10, 20, 0.95)',
        backdropFilter: 'blur(10px)',
        width: '100%',
        marginBottom: '2rem',
        padding: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Top row: Logo, Greeting, Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div
              onClick={() => { setView('home'); closeMenu(); }}
              className="hover-scale"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                userSelect: 'none',
                padding: '0.5rem',
                borderRadius: '12px',
                transition: 'background 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Logo size={40} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  fontSize: '1.5rem',
                  margin: 0,
                  fontWeight: '800',
                  letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1
                }}>
                  QuizMaster
                </h1>
                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginTop: '0.2rem'
                }}>
                  Master Every Topic
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="user-greeting" style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.5rem 1rem',
                borderRadius: '20px'
              }}>
                Hello, {user.username}
              </span>
              <button className="menu-toggle" onClick={toggleMenu}>
                {isMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>

          {/* Bottom row: Action buttons (Collapsible) */}
          <div className="nav-menu">
            <div className="mobile-greeting">
              Hello, {user.username}
            </div>
            <button
              onClick={() => { setView('home'); closeMenu(); }}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: view === 'home' ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              🏠 Home
            </button>
            <button
              onClick={() => { setView('hub'); closeMenu(); }}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: view === 'hub' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              🌐 Quiz Hub
            </button>
            <button
              onClick={() => { setView('my-quizzes'); closeMenu(); }}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: view === 'my-quizzes' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              My Quizzes
            </button>
            <button
              onClick={() => { setView('ai-generator'); closeMenu(); }}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: view === 'ai-generator'
                  ? 'linear-gradient(45deg, #ff00cc, #3333ff)'
                  : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: view === 'ai-generator' ? 1 : 0.7
              }}
            >
              ✨ AI Generate
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => { setView('review'); closeMenu(); }}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: view === 'review' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                Review Quizzes
              </button>
            )}
            <button
              onClick={() => { setView('profile'); closeMenu(); }}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: view === 'profile'
                  ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                  : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              👤 Profile
            </button>
            <button
              onClick={() => { setView('leaderboard'); closeMenu(); }}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: view === 'leaderboard'
                  ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                  : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={logout}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                marginLeft: 'auto'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {view === 'home' && (
        <Home
          onStartQuiz={startQuiz}
          onViewReport={showReport}
        />
      )}
      {/* {view === 'menu' && <QuizSetup onStartQuiz={startQuiz} onViewAttempts={viewAttempts} />} */}
      {view === 'game' && <QuizGame quizId={activeQuizId} onEndGame={endGame} onShowReport={showReport} />}
      {view === 'leaderboard' && <Leaderboard onBack={backToMenu} />}
      {view === 'report' && <QuizReport resultId={activeResultId} onBackToMenu={() => setView('home')} onBackToAttempts={backToAttempts} />}
      {view === 'attempts' && <QuizAttempts quizId={activeQuizId} userId={user.id} onViewReport={showReport} onBack={() => setView('home')} />}

      {view === 'my-quizzes' && (
        <MyQuizzes
          onEdit={(id) => {
            setEditQuizId(id);
            setView('creator');
          }}
          onCreate={() => {
            setEditQuizId(null);
            setView('creator');
          }}
          onBack={backToMenu}
        />
      )}
      {view === 'creator' && (
        <QuizCreator
          editQuizId={editQuizId}
          onBack={() => {
            setEditQuizId(null);
            setView('my-quizzes');
          }}
          onCreated={() => {
            setEditQuizId(null);
            setView('my-quizzes');
          }}
        />
      )}
      {view === 'hub' && (
        <QuizHub
          onBack={backToMenu}
        />
      )}
      {view === 'ai-generator' && (
        <AIGenerator
          onBack={backToMenu}
          onCreated={() => setView('my-quizzes')}
        />
      )}
      {view === 'review' && (
        <QuizReview
          onBack={backToMenu}
        />
      )}
      {view === 'profile' && (
        <UserProfile
          onBack={backToMenu}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
