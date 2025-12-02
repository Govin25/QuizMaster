# QuizMaster - AI-Powered Quiz Generation Setup

## Overview

QuizMaster now supports AI-powered quiz generation from YouTube video transcripts using Google Gemini API. This provides high-quality, context-aware questions that are highly relevant to the video content.

## Setup Instructions

### 1. Get a Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variables

Add the following to your `server/.env` file:

```bash
GEMINI_API_KEY=your_actual_api_key_here
```

Alternatively, you can use:
```bash
GOOGLE_API_KEY=your_actual_api_key_here
```

### 3. Verify Setup

The system will automatically detect the API key and use Gemini for question generation. If no API key is found, it will fall back to the mock generator with a warning in the logs.

## Features

### High-Quality Question Generation

- **Context-Aware**: Questions are generated based on the actual content of the video transcript
- **Difficulty Calibration**: 
  - **Easy**: Direct recall, definitions, basic facts
  - **Medium**: Understanding, application, comparisons
  - **Hard**: Analysis, synthesis, implications, critical thinking
- **Plausible Distractors**: Wrong answers are believable but clearly incorrect based on the content
- **Variety**: Questions cover different parts of the video for comprehensive coverage

### Supported Question Types

- Multiple Choice (4 options)
- True/False statements

## API Limits

Google Gemini offers a generous free tier:
- **Free Tier**: 15 requests per minute, 1500 requests per day
- **Model**: gemini-1.5-flash (fast and efficient)

For production use with higher volumes, consider upgrading to a paid plan.

## Troubleshooting

### "No AI API key found" Warning

If you see this warning in the logs, it means:
1. The `GEMINI_API_KEY` or `GOOGLE_API_KEY` environment variable is not set
2. The system is using the mock generator (static questions)

**Solution**: Add your API key to the `.env` file and restart the server.

### Questions Are Still Generic

If questions remain generic after adding the API key:
1. Verify the API key is correct
2. Check server logs for any Gemini API errors
3. Ensure the server was restarted after adding the key
4. Verify your API key has not exceeded quota limits

### API Errors

Common errors:
- **Invalid API Key**: Double-check your key from Google AI Studio
- **Quota Exceeded**: Wait for the quota to reset or upgrade your plan
- **Network Issues**: Check your internet connection

## Migration Path

This implementation uses Google Gemini as the free/open-source option. The architecture is designed to be flexible:

- **Current**: Google Gemini (free tier available)
- **Future Options**: 
  - OpenAI GPT-4 (paid, higher quality)
  - Anthropic Claude (paid, excellent reasoning)
  - Custom fine-tuned models

To switch providers, update the `generateWithGemini` method in `server/src/services/aiQuizGenerator.js`.
