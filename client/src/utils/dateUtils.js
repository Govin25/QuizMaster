/**
 * Safely parses a date string into a Date object.
 * Handles Safari/iOS strict parsing requirements.
 * 
 * @param {string} dateString - The date string to parse
 * @returns {Date|null} - The parsed Date object or null if invalid
 */
const safeParseDate = (dateString) => {
    if (!dateString) return null;

    // If already a Date object, return it
    if (dateString instanceof Date) {
        return isNaN(dateString.getTime()) ? null : dateString;
    }

    // Convert to string
    let str = String(dateString).trim();

    // Try parsing directly first (works for ISO strings)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Safari doesn't like space-separated date-time, replace with 'T'
    // e.g., "2024-01-15 10:30:00" -> "2024-01-15T10:30:00"
    if (str.includes(' ')) {
        str = str.replace(' ', 'T');
        date = new Date(str);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    // Try with Z suffix for UTC interpretation
    if (!str.includes('Z') && !str.includes('+') && !str.match(/[+-]\d{2}:\d{2}$/)) {
        date = new Date(`${str}Z`);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    // Try alternate parsing for formats like "YYYY/MM/DD"
    const altStr = str.replace(/\//g, '-');
    date = new Date(altStr);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Last resort: return null
    return null;
};

/**
 * Formats a date string into a localized string representation.
 * Handles UTC dates and Safari compatibility.
 * Uses the browser's default locale.
 * 
 * @param {string} dateString - The date string to format (e.g., ISO 8601)
 * @returns {string} - The formatted date string
 */
export const formatDate = (dateString) => {
    if (!dateString) return '-';

    const date = safeParseDate(dateString);

    if (!date) return '-';

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Formats a date string into a short date (no time).
 * Safari/iOS compatible.
 * 
 * @param {string} dateString - The date string to format
 * @returns {string} - The formatted date string (e.g., "Jan 15, 2024")
 */
export const formatDateShort = (dateString) => {
    if (!dateString) return '-';

    const date = safeParseDate(dateString);

    if (!date) return '-';

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Formats a date string into just month and year.
 * Safari/iOS compatible.
 * 
 * @param {string} dateString - The date string to format
 * @returns {string} - The formatted date string (e.g., "Jan 2024")
 */
export const formatMonthYear = (dateString) => {
    if (!dateString) return '-';

    const date = safeParseDate(dateString);

    if (!date) return '-';

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short'
    });
};

/**
 * Formats a date for relative display (e.g., "2 days ago").
 * Safari/iOS compatible.
 * 
 * @param {string} dateString - The date string to format
 * @returns {string} - The relative time string
 */
export const formatRelativeTime = (dateString) => {
    if (!dateString) return '-';

    const date = safeParseDate(dateString);

    if (!date) return '-';

    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
};

// Export the safe parser for direct use if needed
export { safeParseDate };
