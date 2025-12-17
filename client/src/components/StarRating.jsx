import React from 'react';

const StarRating = ({
    rating = 0,
    onRatingChange = null,
    size = 24,
    readOnly = false
}) => {
    const [hoverRating, setHoverRating] = React.useState(0);

    const handleClick = (star) => {
        if (!readOnly && onRatingChange) {
            onRatingChange(star);
        }
    };

    const handleMouseEnter = (star) => {
        if (!readOnly) {
            setHoverRating(star);
        }
    };

    const handleMouseLeave = () => {
        setHoverRating(0);
    };

    const displayRating = hoverRating || rating;

    return (
        <div
            className="star-rating"
            style={{
                display: 'inline-flex',
                gap: '4px',
                cursor: readOnly ? 'default' : 'pointer',
            }}
            onMouseLeave={handleMouseLeave}
        >
            {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= displayRating;

                return (
                    <span
                        key={star}
                        onClick={() => handleClick(star)}
                        onMouseEnter={() => handleMouseEnter(star)}
                        style={{
                            fontSize: `${size}px`,
                            color: isFilled ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)',
                            transition: 'all 0.15s ease',
                            transform: hoverRating === star ? 'scale(1.2)' : 'scale(1)',
                            filter: isFilled && !readOnly
                                ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))'
                                : 'none',
                        }}
                    >
                        ★
                    </span>
                );
            })}
        </div>
    );
};

export default StarRating;
