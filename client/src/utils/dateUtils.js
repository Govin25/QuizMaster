/**
 * Formats a date string into a localized string representation.
 * Handles UTC dates by ensuring the 'Z' suffix is present.
 * Uses the browser's default locale.
 * 
 * @param {string} dateString - The date string to format (e.g., ISO 8601)
 * @returns {string} - The formatted date string
 */
export const formatDate = (dateString) => {
    if (!dateString) return '-';

    // Ensure UTC interpretation if missing Z (assuming backend sends UTC)
    const normalizedDate = typeof dateString === 'string' && !dateString.endsWith('Z')
        ? `${dateString}Z`
        : dateString;

    const date = new Date(normalizedDate);

    // Check for invalid date
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
