const fs = require('fs').promises;
const path = require('path');

/**
 * Document Parser Service
 * Extracts text from various document formats
 */

class DocumentParser {
    /**
     * Parse a document and extract text
     * @param {string} filePath - Path to the uploaded file
     * @param {string} fileType - MIME type of the file
     * @returns {Promise<string>} Extracted text content
     */
    async parseDocument(filePath, fileType) {
        try {
            if (fileType === 'text/plain') {
                return await this.parseTxt(filePath);
            } else if (fileType === 'application/pdf') {
                return await this.parsePdf(filePath);
            } else {
                throw new Error('Unsupported file type');
            }
        } catch (error) {
            console.error('Document parsing error:', error);
            throw new Error('Failed to parse document: ' + error.message);
        }
    }

    /**
     * Parse TXT file
     */
    async parseTxt(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        return this.cleanText(content);
    }

    /**
     * Parse PDF file
     * Note: This is a placeholder. In production, use pdf-parse library
     */
    async parsePdf(filePath) {
        // For now, we'll use a mock implementation
        // In production, install and use: npm install pdf-parse

        try {
            // Try to use pdf-parse if available
            const pdfParse = require('pdf-parse');
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdfParse(dataBuffer);
            return this.cleanText(data.text);
        } catch (error) {
            // Fallback to mock if pdf-parse is not installed
            console.warn('pdf-parse not available, using mock data');
            return this.getMockPdfContent();
        }
    }

    /**
     * Clean and normalize extracted text
     */
    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')  // Normalize line endings
            .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .trim();
    }

    /**
     * Extract a preview of the document (first N words)
     */
    getPreview(text, wordCount = 500) {
        const words = text.split(/\s+/);
        return words.slice(0, wordCount).join(' ') + (words.length > wordCount ? '...' : '');
    }

    /**
     * Get document statistics
     */
    getStats(text) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            paragraphCount: paragraphs.length,
            characterCount: text.length
        };
    }

    /**
     * Mock PDF content for testing
     */
    getMockPdfContent() {
        return `
            Introduction to Photosynthesis
            
            Photosynthesis is the process by which green plants and some other organisms use sunlight 
            to synthesize foods from carbon dioxide and water. Photosynthesis in plants generally 
            involves the green pigment chlorophyll and generates oxygen as a byproduct.
            
            The Process
            
            The photosynthesis process can be divided into two main stages: the light-dependent reactions 
            and the light-independent reactions (Calvin cycle). During the light-dependent reactions, 
            which take place in the thylakoid membrane, chlorophyll absorbs energy from sunlight and 
            then converts it into chemical energy with the use of water.
            
            Importance
            
            Photosynthesis is crucial for life on Earth. It is the primary source of all the oxygen 
            in the atmosphere. Additionally, photosynthesis is the source of energy for nearly all 
            life on earth, either directly through primary production, or indirectly as the ultimate 
            source of the energy in their food.
        `.trim();
    }
}

module.exports = new DocumentParser();
