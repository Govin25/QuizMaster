import React from 'react';

const LegalFooter = () => {
    const currentYear = new Date().getFullYear();

    const footerStyle = {
        marginTop: 'auto',
        padding: '2rem 1rem 1rem',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
    };

    const linkContainerStyle = {
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
        marginBottom: '1rem'
    };

    const linkStyle = {
        color: '#818cf8',
        textDecoration: 'none',
        transition: 'color 0.2s',
        cursor: 'pointer'
    };

    const handleLinkClick = (path) => {
        window.location.hash = path;
    };

    return (
        <footer style={footerStyle}>
            <div style={linkContainerStyle}>
                <a
                    style={linkStyle}
                    onClick={() => handleLinkClick('#privacy-policy')}
                    onMouseEnter={(e) => e.target.style.color = '#c084fc'}
                    onMouseLeave={(e) => e.target.style.color = '#818cf8'}
                >
                    Privacy Policy
                </a>
                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                <a
                    style={linkStyle}
                    onClick={() => handleLinkClick('#terms-of-service')}
                    onMouseEnter={(e) => e.target.style.color = '#c084fc'}
                    onMouseLeave={(e) => e.target.style.color = '#818cf8'}
                >
                    Terms of Service
                </a>
                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                <a
                    style={linkStyle}
                    href="https://github.com/Govin25/QuizMaster/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={(e) => e.target.style.color = '#c084fc'}
                    onMouseLeave={(e) => e.target.style.color = '#818cf8'}
                >
                    MIT License
                </a>
                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                <a
                    style={linkStyle}
                    href="https://github.com/Govin25/QuizMaster/blob/main/CODE_OF_CONDUCT.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={(e) => e.target.style.color = '#c084fc'}
                    onMouseLeave={(e) => e.target.style.color = '#818cf8'}
                >
                    Code of Conduct
                </a>
            </div>
            <div style={{ opacity: 0.7 }}>
                © {currentYear} Quainy. Open source under MIT License.
            </div>
        </footer>
    );
};

export default LegalFooter;
