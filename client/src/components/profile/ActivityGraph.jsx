import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import './ActivityGraph.css';

const ActivityGraph = ({ heatmap, loading, error }) => {
    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Generate calendar data for the past year
    const calendarData = useMemo(() => {
        if (!heatmap || heatmap.length === 0) return { weeks: [], months: [] };

        // Create a map of dates to counts
        const dateMap = new Map();
        heatmap.forEach(entry => {
            dateMap.set(entry.date, entry.count);
        });

        // Calculate start date (365 days ago) and end date (today)
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364); // 365 days including today

        // Round to the previous Sunday for start
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);

        const weeks = [];
        const months = [];
        let currentDate = new Date(startDate);
        let weekIndex = 0;
        let lastMonth = -1;

        // Generate weeks
        while (currentDate <= today) {
            const week = [];

            // Track month changes for labels
            const month = currentDate.getMonth();
            if (month !== lastMonth) {
                months.push({
                    name: currentDate.toLocaleDateString('en-US', { month: 'short' }),
                    weekIndex: weekIndex
                });
                lastMonth = month;
            }

            // Generate 7 days for this week
            for (let day = 0; day < 7; day++) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const count = dateMap.get(dateStr) || 0;
                const isFuture = currentDate > today;

                week.push({
                    date: new Date(currentDate),
                    dateStr,
                    count: isFuture ? null : count,
                    dayOfWeek: currentDate.getDay()
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            weeks.push(week);
            weekIndex++;
        }

        return { weeks, months };
    }, [heatmap]);

    // Get color based on quiz count
    const getColor = (count) => {
        if (count === null) return 'transparent';
        if (count === 0) return '#161b22';
        if (count <= 2) return '#0e4429';
        if (count <= 5) return '#006d32';
        if (count <= 10) return '#26a641';
        return '#39d353';
    };

    // Get intensity level for accessibility
    const getIntensity = (count) => {
        if (count === null || count === 0) return 'none';
        if (count <= 2) return 'low';
        if (count <= 5) return 'medium';
        if (count <= 10) return 'high';
        return 'very-high';
    };

    if (loading) {
        return (
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>📅 Quiz Activity (Past Year)</h3>
                <div className="skeleton" style={{ height: '150px' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>📅 Quiz Activity (Past Year)</h3>
                <div style={{ color: '#ef4444' }}>Failed to load activity data</div>
            </div>
        );
    }

    if (!heatmap || heatmap.length === 0) {
        return (
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>📅 Quiz Activity (Past Year)</h3>
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                    No quiz activity yet. Start taking quizzes to see your contribution graph!
                </div>
            </div>
        );
    }

    const { weeks, months } = calendarData;
    const totalQuizzes = heatmap.reduce((sum, entry) => sum + entry.count, 0);

    return (
        <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>📅 Quiz Activity</h3>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="activity-graph-wrapper">
                    <div style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {totalQuizzes} {totalQuizzes === 1 ? 'quiz' : 'quizzes'} in the last year
                    </div>

                    <div className="activity-graph-container">
                        {/* Month labels */}
                        <div className="activity-months">
                            {months.map((month, idx) => (
                                <div
                                    key={idx}
                                    className="activity-month-label"
                                    style={{ gridColumn: month.weekIndex + 1 }}
                                >
                                    {month.name}
                                </div>
                            ))}
                        </div>

                        <div className="activity-content">
                            {/* Day labels */}
                            <div className="activity-days">
                                <div className="activity-day-label">Mon</div>
                                <div className="activity-day-label"></div>
                                <div className="activity-day-label">Wed</div>
                                <div className="activity-day-label"></div>
                                <div className="activity-day-label">Fri</div>
                                <div className="activity-day-label"></div>
                                <div className="activity-day-label"></div>
                            </div>

                            {/* Calendar grid */}
                            <div className="activity-grid">
                                {weeks.map((week, weekIdx) => (
                                    <div key={weekIdx} className="activity-week">
                                        {week.map((day, dayIdx) => (
                                            <div
                                                key={dayIdx}
                                                className={`activity-cell ${day.count !== null ? 'activity-cell-active' : ''}`}
                                                style={{ backgroundColor: getColor(day.count) }}
                                                data-intensity={getIntensity(day.count)}
                                                onMouseEnter={(e) => {
                                                    if (day.count !== null) {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setTooltipPos({
                                                            x: rect.left + rect.width / 2,
                                                            y: rect.top + rect.height / 2
                                                        });
                                                        setHoveredCell(day);
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredCell(null);
                                                }}
                                                aria-label={
                                                    day.count !== null
                                                        ? `${day.count} ${day.count === 1 ? 'quiz' : 'quizzes'} on ${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                        : ''
                                                }
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="activity-legend">
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                                Less
                            </span>
                            <div className="activity-legend-cell" style={{ backgroundColor: '#161b22' }} />
                            <div className="activity-legend-cell" style={{ backgroundColor: '#0e4429' }} />
                            <div className="activity-legend-cell" style={{ backgroundColor: '#006d32' }} />
                            <div className="activity-legend-cell" style={{ backgroundColor: '#26a641' }} />
                            <div className="activity-legend-cell" style={{ backgroundColor: '#39d353' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                More
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltip - rendered at body level via portal to ensure proper z-index */}
            {hoveredCell && ReactDOM.createPortal(
                <div
                    className="activity-tooltip"
                    style={{
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`,
                        transform: 'translate(-50%, calc(-100% - 16px))'
                    }}
                >
                    <div className="activity-tooltip-count">
                        {hoveredCell.count} {hoveredCell.count === 1 ? 'quiz' : 'quizzes'}
                    </div>
                    <div className="activity-tooltip-date">
                        {hoveredCell.date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ActivityGraph;
