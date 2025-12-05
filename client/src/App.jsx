import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { RbacProvider } from './context/RbacContext'; // Added RbacProvider import
import AuthForm from './components/AuthForm'; // This will be replaced by Login/Register in a later step, keeping for now
import LandingPage from './components/LandingPage';
import Home from './components/Home';
import QuizGame from './components/QuizGame';
import Leaderboard from './components/Leaderboard';
import QuizReport from './components/QuizReport';
import QuizAttempts from './components/QuizAttempts';
import MyQuizzes from './components/MyQuizzes';
import QuizCreator from './components/QuizCreator';
import QuizHub from './components/QuizHub';
import QuizCreationHub from './components/QuizCreationHub';
import QuizReview from './components/QuizReview';
import UserProfile from './components/UserProfile';
import PublicUserProfile from './components/PublicUserProfile';
import ChallengeHub from './components/ChallengeHub';
import ChallengeGame from './components/ChallengeGame';
import ChallengeCreator from './components/ChallengeCreator';
import ChallengeResults from './components/ChallengeResults';
import Logo from './components/Logo';
import LegalFooter from './components/LegalFooter';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import InstallPWA from './components/InstallPWA';
import quizSessionManager from './utils/quizSessionManager';

const AppContent = () => {
  const { user, logout, fetchWithAuth } = useAuth();
  const { showError } = useToast();

  // Helper to get persisted state
  const getPersistedState = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    try {
      return JSON.parse(saved);
    } catch (e) {
      return defaultValue;
    }
  };

  // Initialize state from localStorage
  const [view, setView] = useState(() => getPersistedState('app_view', 'home'));
  const [activeQuizId, setActiveQuizId] = useState(() => getPersistedState('app_activeQuizId', null));
  const [activeResultId, setActiveResultId] = useState(() => getPersistedState('app_activeResultId', null));
  const [editQuizId, setEditQuizId] = useState(() => getPersistedState('app_editQuizId', null));
  const [activeChallengeId, setActiveChallengeId] = useState(() => getPersistedState('app_activeChallengeId', null));
  const [viewedUserId, setViewedUserId] = useState(() => getPersistedState('app_viewedUserId', null));
  const [previousView, setPreviousView] = useState(() => getPersistedState('app_previousView', 'leaderboard'));

  const [showChallengeCreator, setShowChallengeCreator] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // Persist state changes
  React.useEffect(() => {
    localStorage.setItem('app_view', JSON.stringify(view));
    localStorage.setItem('app_activeQuizId', JSON.stringify(activeQuizId));
    localStorage.setItem('app_activeResultId', JSON.stringify(activeResultId));
    localStorage.setItem('app_editQuizId', JSON.stringify(editQuizId));
    localStorage.setItem('app_activeChallengeId', JSON.stringify(activeChallengeId));
    localStorage.setItem('app_viewedUserId', JSON.stringify(viewedUserId));
    localStorage.setItem('app_previousView', JSON.stringify(previousView));
  }, [view, activeQuizId, activeResultId, editQuizId, activeChallengeId, viewedUserId, previousView]);

  const handleLogout = () => {
    // Clear app state on logout
    localStorage.removeItem('app_view');
    localStorage.removeItem('app_activeQuizId');
    localStorage.removeItem('app_activeResultId');
    localStorage.removeItem('app_editQuizId');
    localStorage.removeItem('app_activeChallengeId');
    localStorage.removeItem('app_viewedUserId');
    localStorage.removeItem('app_previousView');

    logout();
    setView('home');
  };

  // Handle hash-based routing for legal documents
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#privacy-policy') {
        setShowPrivacyPolicy(true);
      } else if (hash === '#terms-of-service') {
        setShowTermsOfService(true);
      }
    };

    handleHashChange(); // Check on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle browser back/forward navigation
  React.useEffect(() => {
    // Push initial state
    if (!window.history.state) {
      window.history.replaceState({ view, activeQuizId, activeResultId, editQuizId, activeChallengeId, viewedUserId }, '');
    }

    const handlePopState = (event) => {
      if (event.state) {
        // Restore state from history
        setView(event.state.view || 'home');
        setActiveQuizId(event.state.activeQuizId || null);
        setActiveResultId(event.state.activeResultId || null);
        setEditQuizId(event.state.editQuizId || null);
        setActiveChallengeId(event.state.activeChallengeId || null);
        setViewedUserId(event.state.viewedUserId || null);
      } else {
        // No state means we're at the beginning - go to home
        setView('home');
        setActiveQuizId(null);
        setActiveResultId(null);
        setEditQuizId(null);
        setActiveChallengeId(null);
        setViewedUserId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Push state to history when view changes
  React.useEffect(() => {
    const state = { view, activeQuizId, activeResultId, editQuizId, activeChallengeId, viewedUserId };
    window.history.pushState(state, '');
  }, [view, activeQuizId, activeResultId, editQuizId, activeChallengeId, viewedUserId]);

  // Scroll to top when view changes
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  if (!user) {
    return (
      <>
        <LandingPage />
      </>
    );
  }

  const startQuiz = async (quizId) => {
    // Check if quiz can be started (server-side check across all devices)
    const canStart = await quizSessionManager.canStartQuiz(quizId, fetchWithAuth);

    if (!canStart) {
      showError('This quiz is already active in another session. Please close it first.');
      return;
    }

    setActiveQuizId(quizId);
    setView('game');
  };

  const endGame = async () => {
    // Release quiz session and notify other tabs
    if (activeQuizId) {
      await quizSessionManager.releaseQuiz(activeQuizId, fetchWithAuth);
      quizSessionManager.notifyQuizCompleted(activeQuizId);
    }

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

  const viewUserProfile = (userId, fromView = 'leaderboard') => {
    setViewedUserId(userId);
    setPreviousView(fromView);
    setView('public-profile');
  };

  const startChallenge = async (challengeId, quizId) => {
    // Check if challenge can be started (server-side check across all devices)
    const canStart = await quizSessionManager.canStartChallenge(challengeId, fetchWithAuth);

    if (!canStart) {
      showError('This challenge is already active in another session. Please close it first.');
      return;
    }

    setActiveChallengeId(challengeId);
    setActiveQuizId(quizId);
    setView('challenge-game');
  };

  const viewChallengeResults = (challengeId) => {
    setActiveChallengeId(challengeId);
    setView('challenge-results');
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
              display: none;
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
              <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Quainy</h1>
            </div>
            <div className="user-greeting" style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>👋</span>
              <span>Welcome, <strong style={{ color: 'white' }}>{user.username}</strong></span>
            </div>
            <button className="menu-toggle" onClick={toggleMenu}>
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="nav-menu">
            <div className="mobile-greeting">
              👋 Welcome, <strong>{user.username}</strong>
            </div>
            <button onClick={() => { setView('home'); closeMenu(); }} className={view === 'home' ? 'active' : ''}>
              🏠 Home
            </button>
            <button onClick={() => { setView('hub'); closeMenu(); }} className={view === 'hub' ? 'active' : ''}>
              🌐 Quiz Hub
            </button>
            <button onClick={() => { setView('my-quizzes'); closeMenu(); }} className={view === 'my-quizzes' ? 'active' : ''}>
              📝 My Quizzes
            </button>
            <button onClick={() => { setView('create-quiz'); closeMenu(); }} className={view === 'create-quiz' ? 'active' : ''}>
              ✨ Create Quiz
            </button>
            <button onClick={() => { setView('challenges'); closeMenu(); }} className={view === 'challenges' ? 'active' : ''}>
              ⚔️ Challenges
            </button>
            <button onClick={() => { setView('leaderboard'); closeMenu(); }} className={view === 'leaderboard' ? 'active' : ''}>
              🏆 Leaderboard
            </button>
            {user.role === 'admin' && (
              <button onClick={() => { setView('review'); closeMenu(); }} className={view === 'review' ? 'active' : ''}>
                👁️ Review
              </button>
            )}
            <button onClick={() => { setView('profile'); closeMenu(); }} className={view === 'profile' ? 'active' : ''}>
              👤 Profile
            </button>
            <button onClick={() => { handleLogout(); closeMenu(); }} style={{ marginLeft: 'auto' }}>
              🚪 Logout
            </button>
          </nav>
        </div>
      </header>

      {view === 'home' && (
        <Home
          onStartQuiz={startQuiz}
          onViewReport={showReport}
          onViewAllAttempts={backToAttempts}
        />
      )}
      {view === 'game' && <QuizGame quizId={activeQuizId} onEndGame={endGame} onShowReport={showReport} />}
      {view === 'leaderboard' && (
        <Leaderboard
          onBack={backToMenu}
          onViewProfile={(userId) => viewUserProfile(userId, 'leaderboard')}
        />
      )}
      {view === 'report' && <QuizReport resultId={activeResultId} onBackToMenu={() => setView('home')} onBackToAttempts={backToAttempts} />}
      {view === 'attempts' && <QuizAttempts quizId={activeQuizId} userId={user.id} onViewReport={showReport} onBack={() => setView('home')} />}

      {view === 'my-quizzes' && (
        <MyQuizzes
          onEdit={(id) => {
            setEditQuizId(id);
            setView('creator');
          }}
          onCreate={() => {
            setView('create-quiz');
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
          onViewProfile={(userId) => viewUserProfile(userId, 'hub')}
        />
      )}
      {view === 'create-quiz' && (
        <QuizCreationHub
          onBack={backToMenu}
          onCreated={() => setView('my-quizzes')}
          onManualCreate={() => {
            setEditQuizId(null);
            setView('creator');
          }}
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
      {view === 'public-profile' && viewedUserId && (
        <PublicUserProfile
          userId={viewedUserId}
          onBack={() => setView(previousView)}
        />
      )}
      {view === 'challenges' && (
        <>
          <ChallengeHub
            key={showChallengeCreator ? 'creating' : 'viewing'}
            onStartChallenge={startChallenge}
            onViewResults={viewChallengeResults}
            onCreateChallenge={() => setShowChallengeCreator(true)}
          />
          {showChallengeCreator && (
            <ChallengeCreator
              onClose={() => setShowChallengeCreator(false)}
              onChallengeCreated={() => {
                setShowChallengeCreator(false);
                // Force re-render of ChallengeHub to refresh the list
                // The key change will trigger useEffect to fetch challenges again
              }}
            />
          )}
        </>
      )}
      {view === 'challenge-game' && activeChallengeId && activeQuizId && (
        <ChallengeGame
          challengeId={activeChallengeId}
          quizId={activeQuizId}
          onEndGame={() => setView('challenges')}
          onShowResults={viewChallengeResults}
        />
      )}
      {view === 'challenge-results' && activeChallengeId && (
        <ChallengeResults
          challengeId={activeChallengeId}
          onClose={() => setView('challenges')}
        />
      )}

      {/* Legal Document Modals */}
      {showPrivacyPolicy && (
        <PrivacyPolicy onClose={() => {
          setShowPrivacyPolicy(false);
          window.location.hash = '';
        }} />
      )}
      {showTermsOfService && (
        <TermsOfService onClose={() => {
          setShowTermsOfService(false);
          window.location.hash = '';
        }} />
      )}

      <LegalFooter />
      <InstallPWA />
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
