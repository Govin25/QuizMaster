import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API_URL from '../config';
import StarRating from './StarRating';
import ReportModal from './ReportModal';
import UserAvatar from './UserAvatar';
import { formatDate } from '../utils/dateUtils';

const QuizComments = ({ quizId, isQuizCreator = false }) => {
    const { user, fetchWithAuth } = useAuth();
    const { showSuccess, showError } = useToast();

    const [comments, setComments] = useState([]);
    const [ratingSummary, setRatingSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [canView, setCanView] = useState(false);
    const [message, setMessage] = useState('');
    const [isCreator, setIsCreator] = useState(isQuizCreator);

    // Form state
    const [newComment, setNewComment] = useState('');
    const [newRating, setNewRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyContent, setReplyContent] = useState('');

    // Sort and pagination
    const [sortBy, setSortBy] = useState('newest');
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');

    // Report modal
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportingCommentId, setReportingCommentId] = useState(null);

    // Delete confirmation modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState(null);

    // Track if user has already rated
    const [hasUserRated, setHasUserRated] = useState(false);

    useEffect(() => {
        fetchComments();
        fetchRatingSummary();
    }, [quizId]);

    // Sort comments locally when sortBy changes (avoids refetch and scroll)
    useEffect(() => {
        if (comments.length > 0) {
            const sortedComments = [...comments].sort((a, b) => {
                // Pinned comments always first
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;

                if (sortBy === 'top_rated') {
                    return (b.rating || 0) - (a.rating || 0);
                }
                // Default: newest
                return new Date(b.created_at) - new Date(a.created_at);
            });
            setComments(sortedComments);
        }
    }, [sortBy]);

    const fetchComments = async (offset = 0) => {
        try {
            if (offset === 0) setLoading(true);
            else setLoadingMore(true);

            const response = await fetchWithAuth(
                `${API_URL}/api/comments/quiz/${quizId}?sortBy=${sortBy}&offset=${offset}&limit=20`
            );
            const data = await response.json();

            if (!data.canView) {
                setCanView(false);
                setMessage(data.message);
                return;
            }

            setCanView(true);
            setIsCreator(data.isCreator);

            if (offset === 0) {
                setComments(data.comments || []);
                // Check if user has already rated
                const userRating = (data.comments || []).find(
                    c => c.user_id === user?.id && c.rating !== null
                );
                setHasUserRated(!!userRating);
            } else {
                setComments(prev => [...prev, ...(data.comments || [])]);
            }
            setHasMore(data.hasMore);
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchRatingSummary = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/api/comments/quiz/${quizId}/rating`
            );
            const data = await response.json();
            if (data.canView) {
                setRatingSummary(data);
            }
        } catch (err) {
            console.error('Error fetching rating summary:', err);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/api/comments/quiz/${quizId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newComment,
                    rating: newRating || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to post comment');
            }

            setNewComment('');
            setNewRating(0);
            showSuccess('Review posted successfully!');

            // Refresh all comments to show new ones from other users too
            await fetchComments();
            fetchRatingSummary();
        } catch (err) {
            showError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitReply = async (parentId) => {
        if (!replyContent.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/api/comments/quiz/${quizId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: replyContent,
                    parentId,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to post reply');
            }

            setReplyingTo(null);
            setReplyContent('');
            showSuccess('Reply posted!');

            // Refresh all comments to show new ones from other users too
            await fetchComments();
        } catch (err) {
            showError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpvote = async (commentId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/comments/${commentId}/upvote`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to upvote');

            const result = await response.json();
            setComments(prev => prev.map(c => {
                if (c.id === commentId) {
                    return { ...c, upvotes: result.upvotes, hasUpvoted: result.upvoted };
                }
                // Also check replies
                if (c.replies) {
                    return {
                        ...c,
                        replies: c.replies.map(r =>
                            r.id === commentId
                                ? { ...r, upvotes: result.upvotes, hasUpvoted: result.upvoted }
                                : r
                        ),
                    };
                }
                return c;
            }));
        } catch (err) {
            showError('Failed to upvote');
        }
    };

    const handlePin = async (commentId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/comments/${commentId}/pin`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to pin comment');

            const result = await response.json();
            setComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, is_pinned: result.pinned } : c
            ));
            showSuccess(result.pinned ? 'Comment pinned!' : 'Comment unpinned');
        } catch (err) {
            showError('Failed to pin comment');
        }
    };

    const openDeleteModal = (commentId) => {
        setDeletingCommentId(commentId);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingCommentId) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/api/comments/${deletingCommentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete');

            showSuccess('Comment deleted');

            // Refresh all comments to show latest state from all users
            await fetchComments();
            fetchRatingSummary();
        } catch (err) {
            showError('Failed to delete comment');
        } finally {
            setDeleteModalOpen(false);
            setDeletingCommentId(null);
        }
    };

    const handleEdit = async (commentId) => {
        if (!editContent.trim()) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/api/comments/${commentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editContent }),
            });

            if (!response.ok) throw new Error('Failed to edit');

            setComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, content: editContent } : c
            ));
            setEditingId(null);
            setEditContent('');
            showSuccess('Comment updated');
        } catch (err) {
            showError('Failed to edit comment');
        }
    };

    const handleReport = async (commentId, reason) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/comments/${commentId}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });

            if (!response.ok) throw new Error('Failed to report');

            showSuccess('Comment reported. Thank you for helping keep our community safe.');
            setReportModalOpen(false);
        } catch (err) {
            showError('Failed to report comment');
        }
    };

    const openReportModal = (commentId) => {
        setReportingCommentId(commentId);
        setReportModalOpen(true);
    };

    // Render loading skeleton
    if (loading) {
        return (
            <div className="glass-card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>💬 Reviews & Comments</h3>
                <div className="skeleton" style={{ height: '150px', marginBottom: '1rem' }} />
                <div className="skeleton" style={{ height: '100px', marginBottom: '1rem' }} />
                <div className="skeleton" style={{ height: '100px' }} />
            </div>
        );
    }

    // User hasn't completed the quiz
    if (!canView) {
        return (
            <div className="glass-card" style={{
                marginTop: '2rem',
                textAlign: 'center',
                padding: '3rem 2rem',
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                <h3 style={{ marginBottom: '0.5rem' }}>Reviews Locked</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                    {message || 'Complete this quiz to view and leave reviews'}
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card" style={{ marginTop: '2rem' }}>
            {/* Header with Rating Summary */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem',
            }}>
                <h3 style={{ margin: 0 }}>💬 Reviews & Comments</h3>
                {ratingSummary && ratingSummary.totalRatings > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        padding: '0.5rem 1rem',
                        borderRadius: '12px',
                    }}>
                        <StarRating rating={Math.round(ratingSummary.averageRating)} readOnly size={20} />
                        <span style={{
                            fontWeight: 'bold',
                            color: '#fbbf24',
                            fontSize: '1.1rem',
                        }}>
                            {ratingSummary.averageRating}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            ({ratingSummary.totalRatings} {ratingSummary.totalRatings === 1 ? 'review' : 'reviews'})
                        </span>
                    </div>
                )}
            </div>

            {/* Rating Distribution */}
            {ratingSummary && ratingSummary.totalRatings > 0 && (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Rating Distribution
                    </div>
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = ratingSummary.distribution[star] || 0;
                        const percentage = ratingSummary.totalRatings > 0
                            ? (count / ratingSummary.totalRatings) * 100
                            : 0;
                        return (
                            <div key={star} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.35rem',
                            }}>
                                <span style={{ width: '20px', color: '#fbbf24' }}>{star}★</span>
                                <div style={{
                                    flex: 1,
                                    height: '8px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${percentage}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                                        borderRadius: '4px',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <span style={{
                                    width: '40px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    textAlign: 'right',
                                }}>
                                    {Math.round(percentage)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Comment Form - only show if user hasn't posted a review yet */}
            {!hasUserRated ? (
                <form onSubmit={handleSubmitComment} style={{ marginBottom: '2rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                    }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontSize: '0.9rem',
                                color: 'var(--text-muted)',
                            }}>
                                Rate this quiz (optional):
                            </label>
                            <StarRating
                                rating={newRating}
                                onRatingChange={setNewRating}
                                size={28}
                            />
                        </div>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your thoughts about this quiz..."
                            maxLength={1000}
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                background: 'rgba(15, 23, 42, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                color: 'white',
                                fontSize: '0.95rem',
                                resize: 'vertical',
                                marginBottom: '0.75rem',
                            }}
                        />
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {newComment.length}/1000
                            </span>
                            <button
                                type="submit"
                                disabled={submitting || !newComment.trim()}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: submitting || !newComment.trim() ? 'not-allowed' : 'pointer',
                                    opacity: submitting || !newComment.trim() ? 0.6 : 1,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {submitting ? 'Posting...' : '📝 Post Review'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                }}>
                    <span style={{ fontSize: '1.25rem' }}>✅</span>
                    <span style={{ color: 'rgba(34, 197, 94, 0.9)', fontWeight: '500' }}>
                        You've already submitted a review for this quiz
                    </span>
                </div>
            )}

            {/* Sort Options */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
            }}>
                {[
                    { id: 'newest', label: 'Newest' },
                    { id: 'top_rated', label: 'Top Rated' },
                ].map(option => (
                    <button
                        key={option.id}
                        onClick={() => setSortBy(option.id)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: sortBy === option.id
                                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                : 'rgba(255, 255, 255, 0.05)',
                            border: sortBy === option.id
                                ? 'none'
                                : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {comments.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '2rem',
                        color: 'var(--text-muted)',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                        <p>No comments yet. Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <CommentCard
                            key={comment.id}
                            comment={comment}
                            currentUserId={user.id}
                            isQuizCreator={isCreator}
                            onUpvote={handleUpvote}
                            onPin={handlePin}
                            onDelete={openDeleteModal}
                            onEdit={(id, content) => {
                                setEditingId(id);
                                setEditContent(content);
                            }}
                            onReport={openReportModal}
                            onReply={(id) => {
                                setReplyingTo(id);
                                setReplyContent('');
                            }}
                            editingId={editingId}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            handleEditSave={handleEdit}
                            cancelEdit={() => {
                                setEditingId(null);
                                setEditContent('');
                            }}
                            replyingTo={replyingTo}
                            replyContent={replyContent}
                            setReplyContent={setReplyContent}
                            handleSubmitReply={handleSubmitReply}
                            cancelReply={() => {
                                setReplyingTo(null);
                                setReplyContent('');
                            }}
                            submitting={submitting}
                        />
                    ))
                )}
            </div>

            {/* Load More */}
            {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => fetchComments(comments.length)}
                        disabled={loadingMore}
                        style={{
                            padding: '0.75rem 2rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            fontWeight: '500',
                            cursor: loadingMore ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loadingMore ? 'Loading...' : 'Load More Comments'}
                    </button>
                </div>
            )}

            {/* Report Modal */}
            <ReportModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                onSubmit={handleReport}
                commentId={reportingCommentId}
            />

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1rem',
                    }}
                    onClick={() => setDeleteModalOpen(false)}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            padding: '2rem',
                            maxWidth: '400px',
                            width: '100%',
                            textAlign: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
                        <h3 style={{ marginBottom: '0.5rem' }}>Delete Comment?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes commentSlideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

// Individual Comment Card Component
const CommentCard = ({
    comment,
    currentUserId,
    isQuizCreator,
    onUpvote,
    onPin,
    onDelete,
    onEdit,
    onReport,
    onReply,
    editingId,
    editContent,
    setEditContent,
    handleEditSave,
    cancelEdit,
    replyingTo,
    replyContent,
    setReplyContent,
    handleSubmitReply,
    cancelReply,
    submitting,
    isReply = false,
}) => {
    const isOwner = comment.user_id === currentUserId;

    return (
        <div style={{
            background: comment.is_pinned
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.08))'
                : 'rgba(255, 255, 255, 0.03)',
            border: comment.is_pinned
                ? '1px solid rgba(251, 191, 36, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: isReply ? '1rem' : '1.25rem',
            animation: 'commentSlideIn 0.3s ease',
            marginLeft: isReply ? '2rem' : 0,
        }}>
            {/* Pinned Badge */}
            {comment.is_pinned && (
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    color: '#fbbf24',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    marginBottom: '0.75rem',
                }}>
                    📌 Pinned by Creator
                </div>
            )}

            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <UserAvatar username={comment.user?.username} size={36} />
                    <div>
                        <div style={{
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            {comment.user?.username}
                            {comment.user_id === currentUserId && (
                                <span style={{
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    color: '#a5b4fc',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                }}>
                                    You
                                </span>
                            )}
                        </div>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            {formatDate(comment.created_at)}
                        </div>
                    </div>
                </div>
                {comment.rating && (
                    <StarRating rating={comment.rating} readOnly size={16} />
                )}
            </div>

            {/* Content */}
            {editingId === comment.id ? (
                <div style={{ marginBottom: '0.75rem' }}>
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{
                            width: '100%',
                            minHeight: '80px',
                            background: 'rgba(15, 23, 42, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'white',
                            resize: 'vertical',
                            marginBottom: '0.5rem',
                        }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => handleEditSave(comment.id)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                            }}
                        >
                            Save
                        </button>
                        <button
                            onClick={cancelEdit}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <p style={{
                    margin: '0 0 1rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                }}>
                    {comment.content}
                </p>
            )}

            {/* Actions */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
            }}>
                {/* Upvote */}
                <button
                    onClick={() => onUpvote(comment.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.75rem',
                        background: comment.hasUpvoted
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'transparent',
                        border: comment.hasUpvoted
                            ? '1px solid rgba(34, 197, 94, 0.4)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: comment.hasUpvoted ? '#22c55e' : 'var(--text-muted)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    👍 {comment.upvotes || 0}
                </button>

                {/* Reply (only for top-level comments) */}
                {!isReply && (
                    <button
                        onClick={() => onReply(comment.id)}
                        style={{
                            padding: '0.4rem 0.75rem',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                        }}
                    >
                        💬 Reply
                    </button>
                )}

                {/* Pin (only for quiz creator) */}
                {isQuizCreator && !isReply && (
                    <button
                        onClick={() => onPin(comment.id)}
                        style={{
                            padding: '0.4rem 0.75rem',
                            background: comment.is_pinned
                                ? 'rgba(251, 191, 36, 0.2)'
                                : 'transparent',
                            border: comment.is_pinned
                                ? '1px solid rgba(251, 191, 36, 0.4)'
                                : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: comment.is_pinned ? '#fbbf24' : 'var(--text-muted)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                        }}
                    >
                        📌 {comment.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                )}

                {/* Edit (only for owner) */}
                {isOwner && (
                    <button
                        onClick={() => onEdit(comment.id, comment.content)}
                        style={{
                            padding: '0.4rem 0.75rem',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                        }}
                    >
                        ✏️ Edit
                    </button>
                )}

                {/* Delete (owner or admin) */}
                {isOwner && (
                    <button
                        onClick={() => onDelete(comment.id)}
                        style={{
                            padding: '0.4rem 0.75rem',
                            background: 'transparent',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                        }}
                    >
                        🗑️ Delete
                    </button>
                )}

                {/* Report (not for owner) */}
                {!isOwner && (
                    <button
                        onClick={() => onReport(comment.id)}
                        style={{
                            padding: '0.4rem 0.75rem',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                        }}
                    >
                        🚩 Report
                    </button>
                )}
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
                <div style={{ marginTop: '1rem' }}>
                    <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        style={{
                            width: '100%',
                            minHeight: '60px',
                            background: 'rgba(15, 23, 42, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'white',
                            resize: 'vertical',
                            marginBottom: '0.5rem',
                        }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={submitting || !replyContent.trim()}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '0.85rem',
                                cursor: submitting || !replyContent.trim() ? 'not-allowed' : 'pointer',
                                opacity: submitting || !replyContent.trim() ? 0.6 : 1,
                            }}
                        >
                            {submitting ? 'Posting...' : 'Post Reply'}
                        </button>
                        <button
                            onClick={cancelReply}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    {comment.replies.map(reply => (
                        <CommentCard
                            key={reply.id}
                            comment={reply}
                            currentUserId={currentUserId}
                            isQuizCreator={isQuizCreator}
                            onUpvote={onUpvote}
                            onPin={onPin}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onReport={onReport}
                            onReply={onReply}
                            editingId={editingId}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            handleEditSave={handleEditSave}
                            cancelEdit={cancelEdit}
                            isReply={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizComments;
