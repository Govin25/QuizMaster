import React, { useState, useEffect } from 'react';
import { promptInstall, isAppInstalled } from '../utils/pwa';

const InstallPWA = () => {
    const [showInstall, setShowInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        setIsInstalled(isAppInstalled());

        // Listen for install prompt availability
        const handleInstallAvailable = () => {
            if (!isAppInstalled()) {
                setShowInstall(true);
            }
        };

        const handleInstallCompleted = () => {
            setShowInstall(false);
            setIsInstalled(true);
        };

        window.addEventListener('pwa-install-available', handleInstallAvailable);
        window.addEventListener('pwa-install-completed', handleInstallCompleted);

        return () => {
            window.removeEventListener('pwa-install-available', handleInstallAvailable);
            window.removeEventListener('pwa-install-completed', handleInstallCompleted);
        };
    }, []);

    const handleInstallClick = async () => {
        const accepted = await promptInstall();
        if (accepted) {
            setShowInstall(false);
            setIsInstalled(true);
        }
    };

    // Don't show if already installed or prompt not available
    if (isInstalled || !showInstall) {
        return null;
    }

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.icon}>📱</div>
                <div style={styles.text}>
                    <h3 style={styles.title}>Install Quainy</h3>
                    <p style={styles.description}>
                        Install our app for a better experience with offline access and faster loading!
                    </p>
                </div>
                <div style={styles.buttons}>
                    <button
                        onClick={handleInstallClick}
                        style={styles.installButton}
                    >
                        Install
                    </button>
                    <button
                        onClick={() => setShowInstall(false)}
                        style={styles.dismissButton}
                    >
                        Not Now
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        maxWidth: '500px',
        width: 'calc(100% - 40px)',
        animation: 'slideUp 0.3s ease-out'
    },
    content: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    icon: {
        fontSize: '40px',
        textAlign: 'center'
    },
    text: {
        textAlign: 'center'
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '700'
    },
    description: {
        margin: 0,
        fontSize: '14px',
        opacity: 0.95,
        lineHeight: '1.5'
    },
    buttons: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'center'
    },
    installButton: {
        flex: 1,
        background: 'white',
        color: '#667eea',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    dismissButton: {
        flex: 1,
        background: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s',
        backdropFilter: 'blur(10px)'
    }
};

// Add animation keyframes via style tag
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(100px);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(styleSheet);
}

export default InstallPWA;
