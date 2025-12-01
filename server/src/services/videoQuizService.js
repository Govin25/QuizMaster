const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const videoContentExtractor = require('./videoContentExtractor');
const aiQuizGenerator = require('./aiQuizGenerator');

/**
 * Video Quiz Service
 * Orchestrates the video-to-quiz workflow
 * Handles video URL validation, transcript extraction, and quiz generation
 */

class VideoQuizService {
    constructor() {
        // Cache for video metadata and transcripts (TTL: 1 hour)
        this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    }

    /**
     * Validate video URL and get preview information
     * @param {string} url - Video URL
     * @returns {Promise<object>} Video preview information
     */
    async validateVideoUrl(url) {
        try {
            logger.info('Validating video URL', { url });

            // Check cache first
            const cacheKey = `preview_${url}`;
            const cached = this.cache.get(cacheKey);
            if (cached) {
                logger.info('Returning cached video preview', { url });
                return cached;
            }

            // Validate and get preview
            const preview = await videoContentExtractor.getVideoPreview(url);

            // Validate language (English only for now)
            if (preview.type === 'video' && !preview.isEnglish) {
                throw new Error(
                    `This video is in ${preview.language}. Currently, only English videos are supported.`
                );
            }

            // Cache the preview
            this.cache.set(cacheKey, preview);

            logger.info('Video URL validated successfully', {
                url,
                type: preview.type,
                videoId: preview.videoId
            });

            return preview;
        } catch (error) {
            logger.error('Failed to validate video URL', {
                error,
                context: { url }
            });
            throw error;
        }
    }

    /**
     * Extract transcript from video
     * @param {string} url - Video URL
     * @returns {Promise<object>} Transcript data
     */
    async extractTranscript(url) {
        try {
            logger.info('Extracting transcript from video', { url });

            // Validate URL first
            const validation = await videoContentExtractor.validateVideoUrl(url);

            if (validation.type === 'playlist') {
                throw new Error('Playlist support is not yet implemented. Please use individual video URLs.');
            }

            const videoId = validation.videoId;

            // Check cache first
            const cacheKey = `transcript_${videoId}`;
            const cached = this.cache.get(cacheKey);
            if (cached) {
                logger.info('Returning cached transcript', { videoId });
                return cached;
            }

            // Extract transcript
            const transcript = await videoContentExtractor.extractYouTubeTranscript(videoId);

            // Cache the transcript
            this.cache.set(cacheKey, transcript);

            logger.info('Transcript extracted successfully', {
                videoId,
                wordCount: transcript.wordCount,
                segmentCount: transcript.segments.length
            });

            return transcript;
        } catch (error) {
            logger.error('Failed to extract transcript', {
                error,
                context: { url }
            });
            throw error;
        }
    }

    /**
     * Generate quiz from video URL
     * @param {string} url - Video URL
     * @param {object} config - Quiz configuration
     * @param {number} userId - User ID creating the quiz
     * @returns {Promise<object>} Generated quiz data
     */
    async generateQuizFromVideo(url, config, userId) {
        try {
            logger.info('Generating quiz from video', {
                url,
                config,
                userId
            });

            // Step 1: Validate video URL
            const validation = await this.validateVideoUrl(url);

            if (validation.type === 'playlist') {
                throw new Error('Playlist support is not yet implemented. Please use individual video URLs.');
            }

            // Step 2: Extract transcript
            const transcript = await this.extractTranscript(url);

            // Step 3: Generate quiz questions
            const questions = await aiQuizGenerator.generateFromVideoTranscript(
                transcript,
                config
            );

            if (!questions || questions.length === 0) {
                throw new Error('Failed to generate questions from video transcript');
            }

            // Step 4: Prepare quiz data
            const quizData = {
                title: validation.title || 'Quiz from Video',
                category: config.category || 'General',
                difficulty: config.difficulty || 'medium',
                source: 'video',
                videoUrl: url,
                videoPlatform: validation.platform,
                videoId: validation.videoId,
                videoTitle: validation.title,
                videoDuration: validation.duration,
                videoThumbnail: validation.thumbnail,
                questions: aiQuizGenerator.formatQuestionsForDB(questions),
                creatorId: userId,
                status: 'draft', // Will be reviewed before publishing
                metadata: {
                    transcriptWordCount: transcript.wordCount,
                    videoAuthor: validation.author,
                    generatedAt: new Date().toISOString()
                }
            };

            logger.info('Quiz generated successfully from video', {
                url,
                questionCount: questions.length,
                userId
            });

            return quizData;
        } catch (error) {
            logger.error('Failed to generate quiz from video', {
                error,
                context: { url, config, userId }
            });
            throw error;
        }
    }

    /**
     * Process playlist (future implementation)
     * @param {string} playlistUrl - YouTube playlist URL
     * @param {object} config - Quiz configuration
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Array of generated quizzes
     */
    async processPlaylist(playlistUrl, config, userId) {
        throw new Error('Playlist support is not yet implemented. Please use individual video URLs.');
    }

    /**
     * Get cached transcript if available
     * @param {string} videoId - Video ID
     * @returns {object|null} Cached transcript or null
     */
    getCachedTranscript(videoId) {
        const cacheKey = `transcript_${videoId}`;
        return this.cache.get(cacheKey) || null;
    }

    /**
     * Clear cache for a specific video
     * @param {string} videoId - Video ID
     */
    clearVideoCache(videoId) {
        const transcriptKey = `transcript_${videoId}`;
        const previewKey = `preview_${videoId}`;
        this.cache.del([transcriptKey, previewKey]);
        logger.info('Cleared cache for video', { videoId });
    }

    /**
     * Get cache statistics
     * @returns {object} Cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }
}

module.exports = new VideoQuizService();
