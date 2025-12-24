import React, { useRef, useState } from 'react';

/**
 * QuizPDFExport - Generate printable question paper from quiz data
 * Uses CSS print styles for professional output
 */
const QuizPDFExport = ({ quiz, onClose }) => {
    const printRef = useRef(null);
    const [showAnswerKey, setShowAnswerKey] = useState(false);
    const [includeInstructions, setIncludeInstructions] = useState(true);

    const handlePrint = () => {
        const printContent = printRef.current;
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${quiz.title} - Question Paper</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 12pt;
                        line-height: 1.6;
                        color: #000;
                        background: #fff;
                        padding: 15mm 20mm;
                    }
                    
                    .watermark {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 80pt;
                        color: rgba(0, 0, 0, 0.04);
                        font-weight: bold;
                        letter-spacing: 8px;
                        pointer-events: none;
                        z-index: 0;
                        font-family: Arial, sans-serif;
                    }
                    
                    .paper-header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .logo-container {
                        margin-bottom: 8px;
                    }
                    
                    .logo-img {
                        width: 50px;
                        height: 50px;
                        object-fit: contain;
                    }
                    
                    .brand-text {
                        font-size: 9pt;
                        color: #666;
                        letter-spacing: 2px;
                        margin-top: 4px;
                    }
                    
                    .brand-text {
                        font-size: 9pt;
                        color: #666;
                        letter-spacing: 2px;
                        margin-top: 4px;
                    }
                    
                    .paper-header h2 {
                        font-size: 16pt;
                        font-weight: bold;
                        margin: 8px 0;
                    }
                    
                    .meta-info {
                        font-size: 11pt;
                    }
                    
                    .student-info {
                        display: flex;
                        justify-content: space-between;
                        border: 1px solid #000;
                        padding: 10px 15px;
                        margin-bottom: 20px;
                        font-size: 11pt;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .instructions {
                        background: #fffbeb;
                        border: 1px solid #d4a574;
                        padding: 12px 15px;
                        margin-bottom: 20px;
                        font-size: 10pt;
                        text-align: left;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .instructions h3 {
                        font-size: 11pt;
                        margin-bottom: 8px;
                        text-align: left;
                    }
                    
                    .instructions ul {
                        margin-left: 20px;
                        text-align: left;
                    }
                    
                    .question {
                        margin-bottom: 20px;
                        page-break-inside: avoid;
                        break-inside: avoid;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .options {
                        margin-left: 25px;
                        margin-top: 8px;
                    }
                    
                    .option {
                        display: flex;
                        align-items: flex-start;
                        margin-bottom: 6px;
                        gap: 8px;
                    }
                    
                    .checkbox {
                        width: 12px;
                        height: 12px;
                        border: 1.5px solid #000;
                        flex-shrink: 0;
                        margin-top: 4px;
                    }
                    
                    .circle {
                        width: 14px;
                        height: 14px;
                        border: 1.5px solid #000;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }
                    
                    .true-false-options {
                        display: flex;
                        gap: 30px;
                        margin-left: 25px;
                        margin-top: 8px;
                    }
                    
                    .tf-option {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    
                    .answer-key {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 2px dashed #000;
                        page-break-before: always;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .answer-key h3 {
                        text-align: center;
                        margin-bottom: 20px;
                        font-size: 14pt;
                    }
                    
                    .answer-key-grid {
                        display: grid;
                        grid-template-columns: repeat(5, 1fr);
                        gap: 8px;
                    }
                    
                    .answer-key-item {
                        font-size: 11pt;
                        padding: 4px 8px;
                        background: #f0f0f0;
                    }
                    
                    @media print {
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                        
                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .answer-key-item {
                            background: #f0f0f0 !important;
                        }
                        
                        .question {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        
                        .answer-key {
                            page-break-before: always;
                        }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    const getOptionLabel = (index) => {
        return String.fromCharCode(65 + index);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Control Bar */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.95)',
                padding: '1rem 2rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                flexShrink: 0
            }}>
                {/* Top row - Title left, Buttons right */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem'
                }}>
                    <h3 style={{ margin: 0, color: 'white' }}>📄 Export Question Paper</h3>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handlePrint}
                            style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.9rem'
                            }}
                        >
                            🖨️ Print / Save PDF
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            ✕ Close
                        </button>
                    </div>
                </div>

                {/* Second row - Checkbox options */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}>
                        <input
                            type="checkbox"
                            checked={includeInstructions}
                            onChange={(e) => setIncludeInstructions(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                        />
                        Instructions
                    </label>

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}>
                        <input
                            type="checkbox"
                            checked={showAnswerKey}
                            onChange={(e) => setShowAnswerKey(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                        />
                        Answer Key
                    </label>
                </div>
            </div>

            {/* Preview Area - Scrollable */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '2rem',
                background: '#333',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start'
            }}>
                {/* Paper Preview - Height expands with content */}
                <div
                    ref={printRef}
                    style={{
                        background: 'white',
                        color: 'black',
                        width: '210mm',
                        padding: '15mm 20mm',
                        fontFamily: "'Times New Roman', Times, serif",
                        fontSize: '12pt',
                        lineHeight: '1.6',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        position: 'relative',
                        marginBottom: '2rem',
                        flexShrink: 0
                    }}
                >
                    {/* Watermark */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                        fontSize: '80pt',
                        color: 'rgba(0, 0, 0, 0.04)',
                        fontWeight: 'bold',
                        letterSpacing: '8px',
                        pointerEvents: 'none',
                        zIndex: 0,
                        fontFamily: 'Arial, sans-serif',
                        whiteSpace: 'nowrap'
                    }}>
                        QUAINY
                    </div>

                    {/* Header with Logo */}
                    <div style={{
                        textAlign: 'center',
                        borderBottom: '2px solid #000',
                        paddingBottom: '15px',
                        marginBottom: '20px',
                        position: 'relative',
                        zIndex: 1
                    }}>
                        <div style={{ marginBottom: '8px' }}>
                            <img
                                src="/logo.png"
                                alt="Quainy"
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    objectFit: 'contain',
                                    borderRadius: '12px'
                                }}
                            />
                            <div style={{
                                fontSize: '9pt',
                                color: '#666',
                                letterSpacing: '2px',
                                marginTop: '4px'
                            }}>
                                QUAINY
                            </div>
                        </div>
                        <h2 style={{
                            fontSize: '16pt',
                            fontWeight: 'bold',
                            margin: '8px 0'
                        }}>{quiz.title}</h2>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '25px',
                            fontSize: '11pt',
                            marginTop: '8px'
                        }}>
                            <span><strong>Category:</strong> {quiz.category || 'General'}</span>
                            <span><strong>Difficulty:</strong> {quiz.difficulty || 'Medium'}</span>
                            <span><strong>Total Marks:</strong> {quiz.questions?.length || 0}</span>
                        </div>
                    </div>

                    {/* Student Info */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        border: '1px solid #000',
                        padding: '10px 15px',
                        marginBottom: '20px',
                        fontSize: '11pt',
                        position: 'relative',
                        zIndex: 1
                    }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <strong>Name:</strong>
                            <span style={{ borderBottom: '1px solid #000', minWidth: '180px', display: 'inline-block' }}>&nbsp;</span>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <strong>Date:</strong>
                            <span style={{ borderBottom: '1px solid #000', minWidth: '100px', display: 'inline-block' }}>&nbsp;</span>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <strong>Score:</strong>
                            <span style={{ borderBottom: '1px solid #000', minWidth: '50px', display: 'inline-block' }}>&nbsp;</span>
                            <span>/ {quiz.questions?.length || 0}</span>
                        </div>
                    </div>

                    {/* Instructions - Left aligned with pencil/cream background */}
                    {includeInstructions && (
                        <div style={{
                            background: '#fffbeb',
                            border: '1px solid #d4a574',
                            padding: '12px 15px',
                            marginBottom: '20px',
                            fontSize: '10pt',
                            textAlign: 'left',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <h3 style={{
                                fontSize: '11pt',
                                marginBottom: '8px',
                                textAlign: 'left'
                            }}>INSTRUCTIONS</h3>
                            <ul style={{ marginLeft: '20px', textAlign: 'left' }}>
                                <li>Read each question carefully before answering.</li>
                                <li>Mark your answer by filling in the checkbox or circle completely.</li>
                                <li>Each question carries 1 mark.</li>
                                <li>There is no negative marking.</li>
                            </ul>
                        </div>
                    )}

                    {/* Questions */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {quiz.questions?.map((q, idx) => (
                            <div key={q.id || idx} style={{
                                marginBottom: '20px',
                                pageBreakInside: 'avoid',
                                breakInside: 'avoid'
                            }}>
                                {/* Question Text */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{ fontWeight: '500', textAlign: 'left', flex: 1 }}>
                                        <span style={{ fontWeight: 'bold', marginRight: '8px' }}>
                                            Q{idx + 1}.
                                        </span>
                                        {q.text}
                                    </div>
                                    <span style={{ fontSize: '10pt', color: '#666', marginLeft: '10px', whiteSpace: 'nowrap' }}>
                                        [1 mark]
                                    </span>
                                </div>

                                {/* Options */}
                                {q.type === 'true_false' ? (
                                    <div style={{
                                        display: 'flex',
                                        gap: '30px',
                                        marginLeft: '25px',
                                        marginTop: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{
                                                width: '14px',
                                                height: '14px',
                                                border: '1.5px solid #000',
                                                borderRadius: '50%',
                                                flexShrink: 0
                                            }} />
                                            <span>True</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{
                                                width: '14px',
                                                height: '14px',
                                                border: '1.5px solid #000',
                                                borderRadius: '50%',
                                                flexShrink: 0
                                            }} />
                                            <span>False</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginLeft: '25px', marginTop: '8px' }}>
                                        {q.options?.map((opt, optIdx) => (
                                            <div key={optIdx} style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                marginBottom: '6px',
                                                gap: '8px'
                                            }}>
                                                <div style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    border: '1.5px solid #000',
                                                    flexShrink: 0,
                                                    marginTop: '4px'
                                                }} />
                                                <span>
                                                    <strong>{getOptionLabel(optIdx)}.</strong> {opt}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Answer Key */}
                    {showAnswerKey && (
                        <div style={{
                            marginTop: '30px',
                            paddingTop: '20px',
                            borderTop: '2px dashed #000',
                            pageBreakBefore: 'always',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <h3 style={{
                                textAlign: 'center',
                                marginBottom: '20px',
                                fontSize: '14pt'
                            }}>ANSWER KEY</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                gap: '8px'
                            }}>
                                {quiz.questions?.map((q, idx) => {
                                    let answer = q.correctAnswer || q.correct_answer || '';

                                    // Handle multiple choice - convert to letter if it's the full option text
                                    if ((q.type === 'multiple_choice' || !q.type) && q.options && q.options.length > 0) {
                                        const answerIdx = q.options.indexOf(answer);
                                        if (answerIdx >= 0) {
                                            answer = getOptionLabel(answerIdx);
                                        } else if (typeof answer === 'number' && answer >= 0 && answer < q.options.length) {
                                            // If answer is an index number
                                            answer = getOptionLabel(answer);
                                        } else if (['A', 'B', 'C', 'D', 'E'].includes(answer?.toUpperCase?.())) {
                                            answer = answer.toUpperCase();
                                        } else {
                                            // Try to find partial match
                                            const foundIdx = q.options.findIndex(opt =>
                                                opt?.toLowerCase?.().includes(answer?.toLowerCase?.()) ||
                                                answer?.toLowerCase?.().includes(opt?.toLowerCase?.())
                                            );
                                            if (foundIdx >= 0) {
                                                answer = getOptionLabel(foundIdx);
                                            }
                                        }
                                    }

                                    // Handle true/false
                                    if (q.type === 'true_false') {
                                        answer = answer === true || answer === 'true' || answer === 'True' ? 'True' : 'False';
                                    }

                                    return (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            gap: '5px',
                                            fontSize: '11pt',
                                            padding: '4px 8px',
                                            background: '#f0f0f0'
                                        }}>
                                            <strong style={{ minWidth: '25px' }}>{idx + 1}.</strong>
                                            <span>{answer || '-'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizPDFExport;
