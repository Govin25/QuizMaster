import React, { useState, useEffect, useRef } from 'react';
import AuthForm from './AuthForm';

const LandingPage = () => {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [counters, setCounters] = useState({ users: 0, quizzes: 0, attempts: 0 });
    const [hasAnimated, setHasAnimated] = useState(false);
    const statsRef = useRef(null);

    // Testimonials data
    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Computer Science Student",
            avatar: "👩‍💻",
            text: "QuizMaster transformed how I study! The AI-generated quizzes are incredibly accurate, and the 1v1 challenges make learning competitive and fun.",
            rating: 5
        },
        {
            name: "Michael Chen",
            role: "High School Teacher",
            avatar: "👨‍🏫",
            text: "I use QuizMaster to create engaging quizzes for my students. The analytics help me identify areas where they need more support. Absolutely fantastic!",
            rating: 5
        },
        {
            name: "Emily Rodriguez",
            role: "Medical Student",
            avatar: "👩‍⚕️",
            text: "The comprehensive analytics and achievement system keep me motivated. I've improved my retention rate by 40% since using QuizMaster!",
            rating: 5
        },
        {
            name: "David Park",
            role: "Software Engineer",
            avatar: "👨‍💼",
            text: "Perfect for interview prep! The real-time feedback and detailed reports help me track my progress across different topics.",
            rating: 5
        }
    ];

    // FAQ data
    const faqs = [
        {
            question: "Is QuizMaster really free?",
            answer: "Yes! QuizMaster is completely free to use with all core features including AI quiz generation, real-time gameplay, analytics, and challenges. We're planning premium features for the future, but the current platform is 100% free."
        },
        {
            question: "How does the AI quiz generation work?",
            answer: "Our AI analyzes your text input or uploaded documents (PDF, TXT, DOCX) to generate relevant multiple-choice questions. You can specify the number of questions and difficulty level, then review and edit before saving."
        },
        {
            question: "Is my data secure and private?",
            answer: "Absolutely! We're GDPR compliant with full data encryption. You have complete control over your data with options to export or delete your account at any time. We never share your personal information with third parties."
        },
        {
            question: "Can I use QuizMaster offline?",
            answer: "Yes! QuizMaster is a Progressive Web App (PWA) that works offline. You can install it on your device and access your quizzes even without an internet connection."
        },
        {
            question: "How do 1v1 challenges work?",
            answer: "Challenge other users to compete on the same quiz in real-time! Both players answer questions simultaneously, and the highest score wins. It's a great way to make learning competitive and engaging."
        },
        {
            question: "Can I create my own quizzes?",
            answer: "Yes! You can create quizzes manually or use our AI generator. Add questions, set difficulty levels, and choose whether to make them public or private. You have full control over your content."
        }
    ];

    // Features data
    const features = [
        {
            icon: "✨",
            title: "AI Quiz Generation",
            description: "Generate quizzes instantly from text or documents using advanced AI technology"
        },
        {
            icon: "⚡",
            title: "Real-time Gameplay",
            description: "Live scoring and instant feedback with 30-second timer per question"
        },
        {
            icon: "📊",
            title: "Comprehensive Analytics",
            description: "Track performance, identify strengths, and get personalized recommendations"
        },
        {
            icon: "⚔️",
            title: "1v1 Challenges",
            description: "Compete with friends in real-time quiz battles and climb the leaderboard"
        },
        {
            icon: "🏆",
            title: "Achievement System",
            description: "Unlock badges and achievements as you progress through your learning journey"
        },
        {
            icon: "🌐",
            title: "Quiz Hub",
            description: "Discover and share quizzes with a global community of learners"
        },
        {
            icon: "🔒",
            title: "GDPR Compliant",
            description: "Your data is secure with full export and deletion capabilities"
        },
        {
            icon: "📱",
            title: "PWA Support",
            description: "Install on any device and use offline - works like a native app"
        }
    ];

    // How it works steps
    const steps = [
        {
            number: "1",
            title: "Sign Up Free",
            description: "Create your account in seconds - no credit card required",
            icon: "👤"
        },
        {
            number: "2",
            title: "Create or Browse",
            description: "Generate AI quizzes, create your own, or explore the Quiz Hub",
            icon: "🎯"
        },
        {
            number: "3",
            title: "Play & Learn",
            description: "Take quizzes, challenge friends, and track your progress",
            icon: "🚀"
        },
        {
            number: "4",
            title: "Master Topics",
            description: "Use analytics to improve and unlock achievements",
            icon: "🎓"
        }
    ];

    // Pricing tiers
    const pricingTiers = [
        {
            name: "Free",
            price: "$0",
            period: "forever",
            description: "Perfect for individual learners",
            features: [
                "Unlimited quiz attempts",
                "AI quiz generation",
                "Create custom quizzes",
                "Real-time challenges",
                "Comprehensive analytics",
                "Achievement system",
                "Quiz Hub access",
                "PWA support"
            ],
            cta: "Get Started",
            highlighted: false,
            available: true
        },
        {
            name: "Pro",
            price: "$9",
            period: "per month",
            description: "For power users and educators",
            badge: "Coming Soon",
            features: [
                "Everything in Free",
                "Advanced AI models",
                "Custom branding",
                "Priority support",
                "Advanced analytics",
                "Team collaboration",
                "Export to PDF",
                "Ad-free experience"
            ],
            cta: "Join Waitlist",
            highlighted: true,
            available: false
        },
        {
            name: "Enterprise",
            price: "Custom",
            period: "contact us",
            description: "For organizations and institutions",
            features: [
                "Everything in Pro",
                "Dedicated support",
                "Custom integrations",
                "SSO authentication",
                "Advanced security",
                "SLA guarantee",
                "Training sessions",
                "Custom features"
            ],
            cta: "Contact Sales",
            highlighted: false,
            available: false
        }
    ];

    // Animate counters on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    animateCounters();
                }
            },
            { threshold: 0.5 }
        );

        if (statsRef.current) {
            observer.observe(statsRef.current);
        }

        return () => observer.disconnect();
    }, [hasAnimated]);

    const animateCounters = () => {
        const duration = 2000;
        const steps = 60;
        const interval = duration / steps;

        const targets = { users: 10000, quizzes: 50000, attempts: 500000 };
        let current = { users: 0, quizzes: 0, attempts: 0 };

        const timer = setInterval(() => {
            current.users += targets.users / steps;
            current.quizzes += targets.quizzes / steps;
            current.attempts += targets.attempts / steps;

            if (current.users >= targets.users) {
                current = targets;
                clearInterval(timer);
            }

            setCounters({
                users: Math.floor(current.users),
                quizzes: Math.floor(current.quizzes),
                attempts: Math.floor(current.attempts)
            });
        }, interval);
    };

    // Auto-rotate testimonials
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const scrollToAuth = () => {
        setShowAuthModal(true);
    };

    const formatNumber = (num) => {
        if (num >= 1000000) {
            const millions = num / 1000000;
            return (millions % 1 === 0 ? millions : millions.toFixed(1)) + 'M';
        }
        if (num >= 1000) {
            const thousands = num / 1000;
            return (thousands % 1 === 0 ? thousands : thousands.toFixed(1)) + 'K';
        }
        return num.toString();
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="floating-badge">🎯 #1 Memory Retention Platform</div>
                    <h1 className="hero-title">
                        Retain More, Learn Smarter with
                        <span className="gradient-text"> AI-Powered Quizzes</span>
                    </h1>
                    <p className="hero-subtitle">
                        Boost your memory retention through personalized quizzes. Track your progress with comprehensive analytics and challenge friends in real-time battles.
                    </p>
                    <div className="hero-cta">
                        <button className="cta-primary" onClick={scrollToAuth}>
                            Get Started Free
                            <span className="arrow">→</span>
                        </button>
                        <button className="cta-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                            Explore Features
                        </button>
                    </div>
                    <div className="hero-badges">
                        <span className="badge-item">✓ No Credit Card Required</span>
                        <span className="badge-item">✓ Free Forever</span>
                        <span className="badge-item">✓ GDPR Compliant</span>
                    </div>
                </div>

                {/* Floating Elements */}
                <div className="floating-elements">
                    <div className="float-card float-1">
                        <div className="mini-quiz-card">
                            <div className="quiz-icon">🧠</div>
                            <div className="quiz-info">
                                <div className="quiz-title">AI Generated</div>
                                <div className="quiz-meta">15 Questions</div>
                            </div>
                        </div>
                    </div>
                    <div className="float-card float-2">
                        <div className="mini-stat-card">
                            <div className="stat-icon">⚡</div>
                            <div className="stat-value">98%</div>
                            <div className="stat-label">Accuracy</div>
                        </div>
                    </div>
                    <div className="float-card float-3">
                        <div className="mini-achievement">
                            <div className="achievement-icon">🏆</div>
                            <div className="achievement-text">Achievement Unlocked!</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Statistics Bar */}
            <section className="stats-bar" ref={statsRef}>
                <div className="stat-item">
                    <div className="stat-number">{formatNumber(counters.users)}+</div>
                    <div className="stat-label">Active Users</div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                    <div className="stat-number">{formatNumber(counters.quizzes)}+</div>
                    <div className="stat-label">Quizzes Created</div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                    <div className="stat-number">{formatNumber(counters.attempts)}+</div>
                    <div className="stat-label">Quiz Attempts</div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" id="features">
                <div className="section-header">
                    <h2 className="section-title">Powerful Features for Effective Learning</h2>
                    <p className="section-subtitle">Everything you need to create, play, and master quizzes</p>
                </div>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works-section">
                <div className="section-header">
                    <h2 className="section-title">How It Works</h2>
                    <p className="section-subtitle">Get started in 4 simple steps</p>
                </div>
                <div className="steps-container">
                    {steps.map((step, index) => (
                        <React.Fragment key={index}>
                            <div className="step-card">
                                <div className="step-number">{step.number}</div>
                                <div className="step-icon">{step.icon}</div>
                                <h3 className="step-title">{step.title}</h3>
                                <p className="step-description">{step.description}</p>
                            </div>
                            {index < steps.length - 1 && <div className="step-arrow">→</div>}
                        </React.Fragment>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section className="pricing-section" id="pricing">
                <div className="section-header">
                    <h2 className="section-title">Simple, Transparent Pricing</h2>
                    <p className="section-subtitle">Choose the plan that's right for you</p>
                </div>
                <div className="pricing-grid">
                    {pricingTiers.map((tier, index) => (
                        <div key={index} className={`pricing-card ${tier.highlighted ? 'highlighted' : ''}`}>
                            {tier.badge && <div className="pricing-badge">{tier.badge}</div>}
                            {tier.highlighted && <div className="recommended-badge">Recommended</div>}
                            <h3 className="pricing-name">{tier.name}</h3>
                            <div className="pricing-price">
                                {tier.price}
                                <span className="pricing-period">/{tier.period}</span>
                            </div>
                            <p className="pricing-description">{tier.description}</p>
                            <ul className="pricing-features">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx}>
                                        <span className="check-icon">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button
                                className={`pricing-cta ${tier.highlighted ? 'cta-primary' : 'cta-secondary'}`}
                                onClick={tier.available ? scrollToAuth : null}
                                disabled={!tier.available}
                            >
                                {tier.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trust Indicators */}
            <section className="trust-section">
                <div className="section-header">
                    <h2 className="section-title">Loved by Learners Worldwide</h2>
                    <p className="section-subtitle">See what our users have to say</p>
                </div>

                {/* Testimonials Carousel */}
                <div className="testimonials-container">
                    <div className="testimonial-carousel">
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={index}
                                className={`testimonial-card ${index === activeTestimonial ? 'active' : ''}`}
                                style={{ display: index === activeTestimonial ? 'block' : 'none' }}
                            >
                                <div className="testimonial-stars">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <span key={i}>⭐</span>
                                    ))}
                                </div>
                                <p className="testimonial-text">"{testimonial.text}"</p>
                                <div className="testimonial-author">
                                    <div className="author-avatar">{testimonial.avatar}</div>
                                    <div className="author-info">
                                        <div className="author-name">{testimonial.name}</div>
                                        <div className="author-role">{testimonial.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="testimonial-dots">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                className={`dot ${index === activeTestimonial ? 'active' : ''}`}
                                onClick={() => setActiveTestimonial(index)}
                            />
                        ))}
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="trust-badges">
                    <div className="trust-badge">
                        <div className="trust-icon">🔒</div>
                        <div className="trust-text">SSL Secured</div>
                    </div>
                    <div className="trust-badge">
                        <div className="trust-icon">✓</div>
                        <div className="trust-text">GDPR Compliant</div>
                    </div>
                    <div className="trust-badge">
                        <div className="trust-icon">📱</div>
                        <div className="trust-text">PWA Certified</div>
                    </div>
                    <div className="trust-badge">
                        <div className="trust-icon">⚡</div>
                        <div className="trust-text">99.9% Uptime</div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="faq-section" id="faq">
                <div className="section-header">
                    <h2 className="section-title">Frequently Asked Questions</h2>
                    <p className="section-subtitle">Everything you need to know about QuizMaster</p>
                </div>
                <div className="faq-container">
                    {faqs.map((faq, index) => (
                        <div key={index} className="faq-item">
                            <button
                                className={`faq-question ${expandedFaq === index ? 'active' : ''}`}
                                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                            >
                                <span>{faq.question}</span>
                                <span className="faq-icon">{expandedFaq === index ? '−' : '+'}</span>
                            </button>
                            <div className={`faq-answer ${expandedFaq === index ? 'expanded' : ''}`}>
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta-section">
                <div className="final-cta-content">
                    <h2 className="final-cta-title">Ready to Master Every Topic?</h2>
                    <p className="final-cta-subtitle">
                        Join thousands of learners who are already improving their memory retention with Quainy
                    </p>
                    <button className="cta-primary large" onClick={scrollToAuth}>
                        Start Learning for Free
                        <span className="arrow">→</span>
                    </button>
                    <p className="final-cta-note">No credit card required • Free forever • Cancel anytime</p>
                </div>
            </section>

            {/* Auth Modal */}
            {showAuthModal && (
                <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
                    <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowAuthModal(false)}>×</button>
                        <h2 style={{ marginBottom: '1rem' }}>Get Started with Quainy</h2>
                        <AuthForm />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
