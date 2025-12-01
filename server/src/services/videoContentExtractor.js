const { YoutubeTranscript } = require('youtube-transcript');
const ytdl = require('@distube/ytdl-core');
const logger = require('../utils/logger');

/**
 * Video Content Extractor Service
 * Extracts transcripts and metadata from video platforms
 * Currently supports YouTube, designed to be extensible for other platforms
 */

class VideoContentExtractor {
    constructor() {
        this.supportedPlatforms = ['youtube'];
    }

    /**
     * Validate and extract video information from URL
     * @param {string} url - Video URL
     * @returns {Promise<object>} Video information
     */
    async validateVideoUrl(url) {
        try {
            const platform = this.detectPlatform(url);

            if (!platform) {
                throw new Error('Unsupported video platform. Currently only YouTube is supported.');
            }

            if (platform === 'youtube') {
                return await this.validateYouTubeUrl(url);
            }

            throw new Error(`Platform ${platform} is not yet implemented`);
        } catch (error) {
            logger.error('Failed to validate video URL', {
                error,
                context: { url }
            });
            throw error;
        }
    }

    /**
     * Detect video platform from URL
     * @param {string} url - Video URL
     * @returns {string|null} Platform name or null
     */
    detectPlatform(url) {
        const youtubePatterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
            /youtube\.com\/playlist\?list=/
        ];

        for (const pattern of youtubePatterns) {
            if (pattern.test(url)) {
                return 'youtube';
            }
        }

        // Add more platforms here in the future
        // if (url.includes('vimeo.com')) return 'vimeo';
        // if (url.includes('dailymotion.com')) return 'dailymotion';

        return null;
    }

    /**
     * Validate YouTube URL and extract video information
     * @param {string} url - YouTube URL
     * @returns {Promise<object>} Video information
     */
    async validateYouTubeUrl(url) {
        try {
            const videoId = this.extractYouTubeVideoId(url);
            const playlistId = this.extractYouTubePlaylistId(url);

            if (!videoId && !playlistId) {
                throw new Error('Invalid YouTube URL. Could not extract video or playlist ID.');
            }

            // If it's a playlist, return playlist info
            if (playlistId) {
                return {
                    type: 'playlist',
                    platform: 'youtube',
                    playlistId,
                    url
                };
            }

            // Get video metadata
            const metadata = await this.getYouTubeVideoMetadata(videoId);

            // Check transcript availability early
            let hasTranscript = false;
            let transcriptError = null;

            try {
                logger.info('Checking transcript availability during validation', { videoId });
                const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
                hasTranscript = transcriptItems && transcriptItems.length > 0;

                if (!hasTranscript) {
                    transcriptError = 'No transcript available for this video. Please choose a video with captions enabled.';
                }
            } catch (error) {
                logger.warn('Transcript check failed during validation', {
                    videoId,
                    error: error.message
                });

                // Provide specific error messages
                if (error.message.includes('Transcript is disabled')) {
                    transcriptError = 'Transcripts are disabled for this video. Please choose a video with captions enabled.';
                } else if (error.message.includes('Could not retrieve') || error.message.includes('No transcript')) {
                    transcriptError = 'No transcript available for this video. Please choose a video with captions enabled.';
                } else {
                    transcriptError = 'Unable to access transcript for this video. Please try a different video.';
                }
                hasTranscript = false;
            }

            return {
                type: 'video',
                platform: 'youtube',
                videoId,
                url,
                hasTranscript,
                transcriptError,
                ...metadata
            };
        } catch (error) {
            logger.error('Failed to validate YouTube URL', {
                error,
                context: { url }
            });
            throw new Error('Failed to validate YouTube URL: ' + error.message);
        }
    }


    /**
     * Extract YouTube video ID from various URL formats
     * @param {string} url - YouTube URL
     * @returns {string|null} Video ID or null
     */
    extractYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Extract YouTube playlist ID from URL
     * @param {string} url - YouTube URL
     * @returns {string|null} Playlist ID or null
     */
    extractYouTubePlaylistId(url) {
        const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    /**
     * Get YouTube video metadata
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<object>} Video metadata
     */
    async getYouTubeVideoMetadata(videoId) {
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const info = await ytdl.getInfo(videoUrl);

            const videoDetails = info.videoDetails;

            // Extract language from video details
            const language = videoDetails.languageCode || 'en';

            // Check if video is in English
            if (!language.startsWith('en')) {
                logger.warn('Non-English video detected', {
                    videoId,
                    language
                });
            }

            return {
                title: videoDetails.title,
                duration: parseInt(videoDetails.lengthSeconds),
                thumbnail: videoDetails.thumbnails?.[0]?.url || null,
                author: videoDetails.author?.name || 'Unknown',
                description: videoDetails.description || '',
                language,
                isEnglish: language.startsWith('en'),
                viewCount: parseInt(videoDetails.viewCount) || 0,
                publishDate: videoDetails.publishDate || null
            };
        } catch (error) {
            logger.error('Failed to get YouTube video metadata', {
                error,
                context: { videoId }
            });
            throw new Error('Failed to fetch video metadata: ' + error.message);
        }
    }

    /**
     * Extract transcript from YouTube video
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<object>} Transcript data
     */
    async extractYouTubeTranscript(videoId) {
        try {
            logger.info('Extracting transcript for video', { videoId });

            // Fetch transcript
            const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

            if (!transcriptItems || transcriptItems.length === 0) {
                throw new Error('No transcript available for this video');
            }

            // Format transcript
            const fullText = transcriptItems
                .map(item => item.text)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            // Create timestamped segments (every ~2 minutes)
            const segments = this.createTranscriptSegments(transcriptItems, 120);

            logger.info('Transcript extracted successfully', {
                videoId,
                wordCount: fullText.split(' ').length,
                segmentCount: segments.length
            });

            return {
                fullText,
                segments,
                rawTranscript: transcriptItems,
                wordCount: fullText.split(' ').length,
                duration: transcriptItems[transcriptItems.length - 1]?.offset || 0
            };
        } catch (error) {
            logger.error('Failed to extract YouTube transcript', {
                error,
                context: { videoId }
            });

            // Provide helpful error messages
            if (error.message.includes('Transcript is disabled')) {
                throw new Error('Transcripts are disabled for this video. Please choose a video with captions enabled.');
            } else if (error.message.includes('No transcript')) {
                throw new Error('No transcript available for this video. Please choose a video with captions.');
            }

            throw new Error('Failed to extract transcript: ' + error.message);
        }
    }

    /**
     * Create transcript segments based on time intervals
     * @param {Array} transcriptItems - Raw transcript items
     * @param {number} segmentDuration - Duration of each segment in seconds
     * @returns {Array} Segmented transcript
     */
    createTranscriptSegments(transcriptItems, segmentDuration = 120) {
        const segments = [];
        let currentSegment = {
            startTime: 0,
            endTime: segmentDuration,
            text: ''
        };

        for (const item of transcriptItems) {
            const itemTime = item.offset / 1000; // Convert to seconds

            if (itemTime >= currentSegment.endTime) {
                // Save current segment
                if (currentSegment.text.trim()) {
                    segments.push({
                        ...currentSegment,
                        text: currentSegment.text.trim(),
                        wordCount: currentSegment.text.trim().split(' ').length
                    });
                }

                // Start new segment
                currentSegment = {
                    startTime: currentSegment.endTime,
                    endTime: currentSegment.endTime + segmentDuration,
                    text: item.text + ' '
                };
            } else {
                currentSegment.text += item.text + ' ';
            }
        }

        // Add last segment
        if (currentSegment.text.trim()) {
            segments.push({
                ...currentSegment,
                text: currentSegment.text.trim(),
                wordCount: currentSegment.text.trim().split(' ').length
            });
        }

        return segments;
    }

    /**
     * Extract playlist videos (placeholder for future implementation)
     * @param {string} playlistId - YouTube playlist ID
     * @returns {Promise<Array>} Array of video IDs
     */
    async extractPlaylistVideos(playlistId) {
        // This would require YouTube Data API or web scraping
        // For now, return an error message
        throw new Error('Playlist support is not yet implemented. Please use individual video URLs.');
    }

    /**
     * Get video preview information (for UI display)
     * @param {string} url - Video URL
     * @returns {Promise<object>} Preview information
     */
    async getVideoPreview(url) {
        const validation = await this.validateVideoUrl(url);

        if (validation.type === 'playlist') {
            return {
                type: 'playlist',
                platform: validation.platform,
                playlistId: validation.playlistId,
                message: 'Playlist support coming soon. Please use individual video URLs.'
            };
        }

        return {
            type: 'video',
            platform: validation.platform,
            videoId: validation.videoId,
            title: validation.title,
            duration: validation.duration,
            thumbnail: validation.thumbnail,
            author: validation.author,
            language: validation.language,
            isEnglish: validation.isEnglish,
            canExtractTranscript: true
        };
    }

    /**
     * Format duration in seconds to readable format
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

module.exports = new VideoContentExtractor();
