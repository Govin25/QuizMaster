import React, { useState, useEffect, useRef } from 'react';
import AuthForm from './AuthForm';
import API_URL from '../config';

const LandingPage = () => {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [counters, setCounters] = useState({ users: 0, quizzes: 0, attempts: 0, challenges: 0 });
    const [hasAnimated, setHasAnimated] = useState(false);
    const statsRef = useRef(null);

    // Testimonials data
    const testimonials = [
        {
            name: "Rahul Meena",
            role: "Software Engineer",
            avatar: "👨‍💼",
            text: "I'd learn a new framework, then blank on it in interviews. Now I quiz myself right after tutorials. No more 'I knew this yesterday' moments.",
            rating: 5
        },
        {
            name: "Amrita Priya",
            role: "Computer Science Student",
            avatar: "👩‍💻",
            text: "I used to study for hours and forget everything by exam day. Quainy's instant quizzes helped me actually retain what I learned. My grades improved from B's to A's.",
            rating: 5
        },
        {
            name: "Shanti Nareda",
            role: "High School Teacher",
            avatar: "👨‍🏫",
            text: "My students would watch tutorials and forget them a week later. Now they quiz themselves right after learning, and the knowledge actually sticks!",
            rating: 5
        }
    ];

    // FAQ data
    const faqs = [
        {
            question: "Is Quainy really free?",
            answer: "Yes! Quainy is completely free to use with all core features including quiz generation, real-time gameplay, analytics, and challenges. We're planning premium features for the future, but the current platform is 100% free."
        },
        {
            question: "How does the AI quiz generation work?",
            answer: "Our AI analyzes your text input or uploaded documents (PDF, TXT) to generate relevant multiple-choice questions. You can specify the number of questions and difficulty level, then review and edit before saving."
        },
        {
            question: "Is my data secure and private?",
            answer: "Absolutely! We're GDPR compliant with full data encryption. You have complete control over your data with options to export or delete your account at any time. We never share your personal information with third parties."
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
            icon: "🧠",
            title: "Instant Active Recall",
            description: "Turn any topic into a quiz in seconds. Test yourself before you forget."
        },
        {
            icon: "✨",
            title: "AI Quiz Generation",
            description: "Paste notes, upload PDFs, or describe a topic. AI creates targeted questions that expose your blind spots"
        },
        {
            icon: "📊",
            title: "Know What You Don't Know",
            description: "Analytics reveal exactly where you're weak, so you stop wasting time on what you already know"
        },
        {
            icon: "⚔️",
            title: "Compete to Remember",
            description: "Challenge friends in real-time. Competition triggers emotion, and emotion creates lasting memories"
        },
        {
            icon: "⚡",
            title: "30-Second Pressure",
            description: "Timed questions force active retrieval. If you can't recall it fast, you don't really know it"
        },
        {
            icon: "🎯",
            title: "Spaced Repetition Ready",
            description: "Retake quizzes at intervals to move knowledge from short-term to long-term memory"
        },
        {
            icon: "🌐",
            title: "Community Quiz Hub",
            description: "Don't create from scratch. Use quizzes from others studying the same topics"
        },
        {
            icon: "📱",
            title: "Install & Quiz Anytime",
            description: "Install like an app on any device. One tap to open and start quizzing instantly"
        }
    ];

    // How it works steps
    const steps = [
        {
            number: "1",
            title: "Learn Something",
            description: "Watch a video, read notes, attend a lecture. Any learning counts.",
            icon: "📚"
        },
        {
            number: "2",
            title: "Quiz Yourself Immediately",
            description: "Paste your notes or topic → AI generates questions in seconds",
            icon: "⚡"
        },
        {
            number: "3",
            title: "Discover Gaps",
            description: "See exactly what you thought you knew vs. what you actually remember",
            icon: "🔍"
        },
        {
            number: "4",
            title: "Retain Forever",
            description: "Retake quizzes over time. Move knowledge to long-term memory",
            icon: "🧠"
        }
    ];

    // Pricing tiers
    const pricingTiers = [
        {
            name: "Free",
            price: "₹0",
            period: "forever",
            description: "Perfect for getting started",
            features: [
                "3 AI quiz generations/month",
                "2 document quiz generations/month",
                "Unlimited manual quizzes",
                "Unlimited quiz attempts",
                "Unlimited 1v1 challenges",
                "Group challenges (up to 8 players)",
                "10 quiz publishes/month",
                "Basic analytics",
                "Achievements & leaderboards"
            ],
            cta: "Get Started",
            highlighted: false,
            available: true
        },
        {
            name: "Premium",
            price: "₹499",
            period: "per month",
            description: "For power users & educators",
            badge: "Best Value",
            features: [
                "100 AI quiz generations/month",
                "50 document quiz generations/month",
                "Unlimited manual quizzes",
                "Unlimited quiz attempts",
                "Unlimited 1v1 challenges",
                "Group challenges (up to 100 players)",
                "Unlimited quiz publishing",
                "Advanced analytics",
                "Priority AI processing",
                "Export to PDF",
                "Priority support",
                "Early feature access"
            ],
            cta: "Coming Soon",
            highlighted: true,
            available: false
        }
    ];


    // Animate counters on scroll - optimized with passive listener
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    // Defer animation to next frame for better performance
                    requestAnimationFrame(() => {
                        animateCounters();
                    });
                }
            },
            { threshold: 0.3, rootMargin: '50px' } // Start earlier for smoother UX
        );

        if (statsRef.current) {
            observer.observe(statsRef.current);
        }

        return () => observer.disconnect();
    }, [hasAnimated]);

    const animateCounters = async () => {
        try {
            // Fetch real statistics from backend
            const response = await fetch(`${API_URL}/api/public/stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');

            const data = await response.json();
            const targets = {
                users: data.totalUsers || 0,
                quizzes: data.totalQuizzes || 0,
                attempts: data.totalAttempts || 0,
                challenges: data.totalChallenges || 0
            };

            const duration = 1500; // Reduced from 2000ms for faster animation
            const steps = 40; // Reduced from 60 for better performance
            const interval = duration / steps;

            let current = { users: 0, quizzes: 0, attempts: 0, challenges: 0 };

            const timer = setInterval(() => {
                current.users += targets.users / steps;
                current.quizzes += targets.quizzes / steps;
                current.attempts += targets.attempts / steps;
                current.challenges += targets.challenges / steps;

                if (current.users >= targets.users) {
                    current = targets;
                    clearInterval(timer);
                }

                setCounters({
                    users: Math.floor(current.users),
                    quizzes: Math.floor(current.quizzes),
                    attempts: Math.floor(current.attempts),
                    challenges: Math.floor(current.challenges)
                });
            }, interval);
        } catch (error) {
            console.error('Error fetching statistics:', error);
            // Fallback to default values if API fails
            setCounters({
                users: 10000,
                quizzes: 50000,
                attempts: 500000,
                challenges: 1000
            });
        }
    };

    // Auto-rotate testimonials - optimized
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [testimonials.length]);

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
                    <div className="floating-badge">🧠 Stop Forgetting What You Study</div>
                    <h1 className="hero-title">
                        You Studied for Hours.
                        <span className="gradient-text"> Can You Actually Recall It?</span>
                    </h1>
                    <p className="hero-subtitle">
                        Most people forget 70% of what they learn within 24 hours. Quainy uses instant active recall to make knowledge stick. Generate quizzes from any topic, test yourself, and actually remember what you learn.
                    </p>
                    <div className="hero-cta">
                        <button className="cta-primary" onClick={scrollToAuth}>
                            Start Retaining More
                            <span className="arrow">→</span>
                        </button>
                        <button className="cta-secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                            See How It Works
                        </button>
                    </div>
                    <div className="hero-badges">
                        <span className="badge-item">✓ Quiz yourself in 30 seconds</span>
                        <span className="badge-item">✓ Works with any topic</span>
                        <span className="badge-item">✓ Free forever</span>
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
                    <div className="stat-label">Total Users</div>
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
                <div className="stat-divider"></div>
                <div className="stat-item">
                    <div className="stat-number">{formatNumber(counters.challenges)}+</div>
                    <div className="stat-label">Challenges Completed</div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" id="features">
                <div className="section-header">
                    <h2 className="section-title">Built for How Your Brain Actually Works</h2>
                    <p className="section-subtitle">Active recall is the #1 scientifically-proven method to retain information. We make it effortless.</p>
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
                    <h2 className="section-title">From Learning to Lasting Memory</h2>
                    <p className="section-subtitle">Turn passive consumption into active retention in minutes</p>
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
                    <h2 className="section-title">They Were Forgetting Everything Too</h2>
                    <p className="section-subtitle">See how learners stopped wasting study time</p>
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

                {/* Trust Badges
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
                </div> */}
            </section>

            {/* FAQ Section */}
            <section className="faq-section" id="faq">
                <div className="section-header">
                    <h2 className="section-title">Frequently Asked Questions</h2>
                    <p className="section-subtitle">Everything you need to know about Quainy</p>
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
                    <h2 className="final-cta-title">Stop Wasting Hours on Forgotten Knowledge</h2>
                    <p className="final-cta-subtitle">
                        Every hour you spend learning without active recall is time half-wasted. Start retaining today.
                    </p>
                    <button className="cta-primary large" onClick={scrollToAuth}>
                        Start Retaining for Free
                        <span className="arrow">→</span>
                    </button>
                    <p className="final-cta-note">Free forever • Quiz yourself in 30 seconds • Works with any topic</p>
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
