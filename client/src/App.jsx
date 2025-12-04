import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
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
import AIGenerator from './components/AIGenerator';
import QuizReview from './components/QuizReview';
import UserProfile from './components/UserProfile';
import PublicUserProfile from './components/PublicUserProfile';
import ChallengeHub from './components/ChallengeHub';
import ChallengeGame from './components/ChallengeGame';
import ChallengeCreator from './components/ChallengeCreator';
import ChallengeResults from './components/ChallengeResults';
import Logo from './components/Logo';
import UserAvatar from './components/UserAvatar';
import LegalFooter from './components/LegalFooter';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import InstallPWA from './components/InstallPWA';

const AppContent = () => {
  const { user, logout } = useAuth();

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

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  if (!user) {
    return (
      <>
        <LandingPage />
      </>
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

  const viewUserProfile = (userId, fromView = 'leaderboard') => {
    setViewedUserId(userId);
    setPreviousView(fromView);
    setView('public-profile');
  };

  const startChallenge = (challengeId, quizId) => {
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
      <header className="app-header">
        <div className="header-container">
          {/* Logo and Brand */}
          <div
            className="header-logo-section"
            onClick={() => { setView('home'); closeMenu(); }}
          >
            <Logo size={40} />
            <h1 className="brand-name">Quainy</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="header-nav desktop-nav">
            <button
              onClick={() => setView('home')}
              className={`nav-item ${view === 'home' ? 'active' : ''}`}
            >
              🏠 Home
            </button>
            <button
              onClick={() => setView('hub')}
              className={`nav-item ${view === 'hub' ? 'active' : ''}`}
            >
              🌐 Quiz Hub
            </button>
            <button
              onClick={() => setView('my-quizzes')}
              className={`nav-item ${view === 'my-quizzes' ? 'active' : ''}`}
            >
              📝 My Quizzes
            </button>
            <button
              onClick={() => setView('ai-generator')}
              className={`nav-item ${view === 'ai-generator' ? 'active' : ''}`}
            >
              ✨ AI Generate
            </button>
            <button
              onClick={() => setView('challenges')}
              className={`nav-item ${view === 'challenges' ? 'active' : ''}`}
            >
              ⚔️ Challenges
            </button>
            <button
              onClick={() => setView('leaderboard')}
              className={`nav-item ${view === 'leaderboard' ? 'active' : ''}`}
            >
              🏆 Leaderboard
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setView('review')}
                className={`nav-item ${view === 'review' ? 'active' : ''}`}
              >
                👁️ Review
              </button>
            )}
          </nav>

          {/* User Section */}
          <div className="header-user-section">
            <div className="user-info" onClick={() => setView('profile')}>
              <UserAvatar username={user.username} size={32} />
              <span className="username">{user.username}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
            <button className="mobile-menu-toggle" onClick={toggleMenu}>
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="mobile-nav">
            <button
              onClick={() => { setView('home'); closeMenu(); }}
              className={`nav-item ${view === 'home' ? 'active' : ''}`}
            >
              🏠 Home
            </button>
            <button
              onClick={() => { setView('hub'); closeMenu(); }}
              className={`nav-item ${view === 'hub' ? 'active' : ''}`}
            >
              🌐 Quiz Hub
            </button>
            <button
              onClick={() => { setView('my-quizzes'); closeMenu(); }}
              className={`nav-item ${view === 'my-quizzes' ? 'active' : ''}`}
            >
              📝 My Quizzes
            </button>
            <button
              onClick={() => { setView('ai-generator'); closeMenu(); }}
              className={`nav-item ${view === 'ai-generator' ? 'active' : ''}`}
            >
              ✨ AI Generate
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => { setView('review'); closeMenu(); }}
                className={`nav-item ${view === 'review' ? 'active' : ''}`}
              >
                👁️ Review
              </button>
            )}
            <button
              onClick={() => { setView('challenges'); closeMenu(); }}
              className={`nav-item ${view === 'challenges' ? 'active' : ''}`}
            >
              ⚔️ Challenges
            </button>
            <button
              onClick={() => { setView('leaderboard'); closeMenu(); }}
              className={`nav-item ${view === 'leaderboard' ? 'active' : ''}`}
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => { setView('profile'); closeMenu(); }}
              className={`nav-item ${view === 'profile' ? 'active' : ''}`}
            >
              👤 Profile
            </button>
            <button
              onClick={() => { handleLogout(); closeMenu(); }}
              className="nav-item logout-mobile"
            >
              🚪 Logout
            </button>
          </nav>
        )}
      </header>

      {view === 'home' && (
        <Home
          onStartQuiz={startQuiz}
          onViewReport={showReport}
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
          onViewProfile={(userId) => viewUserProfile(userId, 'hub')}
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
