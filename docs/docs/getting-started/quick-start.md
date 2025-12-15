---
sidebar_position: 2
title: Quick Start
---

# Quick Start Guide

Get up and running with Quainy in 5 minutes! This guide assumes you've already completed the [Installation](./installation.md).

## 1. Start the Application

From the Quainy root directory:

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173).

## 2. Create an Account

1. Open [http://localhost:5173](http://localhost:5173) in your browser
2. Click **Sign Up**
3. Fill in your details:
   - Username
   - Password
   - Accept Terms of Service and Privacy Policy
4. Click **Sign Up**

:::tip
You'll be automatically logged in after signup!
:::

## 3. Explore the Quiz Hub

After logging in, you'll see the **Home** page with your personal library. Let's explore public quizzes:

1. Click **Quiz Hub** in the navigation
2. Browse available public quizzes
3. Click **Add to Library** on any quiz that interests you
4. The quiz will now appear on your Home page!

## 4. Take Your First Quiz

1. Go to **Home** (your personal library)
2. Click **Start Quiz** on any quiz
3. Answer the questions:
   - You have **30 seconds** per question
   - Select your answer and click **Submit**
   - Get instant feedback!
4. View your results after completing the quiz

## 5. Create Your Own Quiz

### Manual Creation

1. Click **My Quizzes** in the navigation
2. Click **Create New Quiz**
3. Fill in quiz details:
   - Title
   - Description
   - Category (e.g., Science, History, Technology)
   - Difficulty (Easy, Medium, Hard)
   - Visibility (Public/Private)
4. Add questions:
   - Question text
   - 4 answer options
   - Mark the correct answer
   - Set time limit (default: 30 seconds)
5. Click **Save Quiz**

### AI-Powered Generation

Quainy can generate quizzes for you using AI!

1. Go to **My Quizzes**
2. Click **AI Generate** tab
3. Choose your method:

#### From Text Prompt
```
Topic: JavaScript Fundamentals
Number of Questions: 5
Difficulty: Medium
```

#### From Document Upload
- Upload a PDF, TXT, or DOCX file
- Specify number of questions
- Select difficulty level

4. Review the generated quiz
5. Edit if needed
6. Save!

## 6. View Your Analytics

Track your progress and performance:

1. Click your **username** in the top right
2. Go to **Profile**
3. Explore the tabs:
   - **Overview**: Your stats at a glance
   - **Activity**: Recent quiz attempts
   - **Trends**: Performance over time
   - **Achievements**: Unlocked badges
   - **Data & Privacy**: GDPR compliance features

## 7. Check the Leaderboard

See how you rank against other users:

1. Click **Leaderboard** in the navigation
2. Switch between views:
   - **Best Scores**: Your highest score per quiz
   - **All Attempts**: Complete attempt history
3. Use filters:
   - Filter by quiz
   - Filter by category
   - Filter by difficulty
   - Filter by score range

## Common Tasks

### Retake a Quiz

1. Go to **Home**
2. Find a completed quiz
3. Click **Retake**
4. Your attempt number will increment (#2, #3, etc.)

### Edit Your Quiz

1. Go to **My Quizzes**
2. Find your quiz
3. Click **Edit**
4. Make changes
5. Click **Save**

### Delete a Quiz

1. Go to **My Quizzes**
2. Find your quiz
3. Click **Delete**
4. Confirm deletion

### Export Your Data (GDPR)

1. Go to **Profile** → **Data & Privacy**
2. Click **Export My Data**
3. Download JSON file with all your data

### Delete Your Account

1. Go to **Profile** → **Data & Privacy**
2. Click **Delete My Account**
3. Confirm deletion
4. You have a **30-day grace period** to cancel

## Tips for Success

:::tip Pro Tips
- **Create diverse quizzes**: Mix categories and difficulties to keep things interesting
- **Use AI generation**: Save time by generating quizzes from your study materials
- **Track your progress**: Regularly check your analytics to identify weak areas
- **Compete on leaderboards**: Challenge yourself to climb the rankings
- **Retake quizzes**: Practice makes perfect! Retake quizzes to improve your scores
:::

## What's Next?

Now that you're familiar with the basics, explore more:

- **[User Guide](/docs/user-guide/authentication)**: Detailed feature documentation
- **[Creating Quizzes](/docs/user-guide/creating-quizzes)**: Advanced quiz creation techniques
- **[Analytics](/docs/user-guide/analytics)**: Understanding your performance data
- **[Developer Guide](/docs/developer-guide/architecture)**: Contribute to Quainy

## Need Help?

- **Documentation**: Browse the [User Guide](/docs/user-guide/authentication)
- **GitHub Issues**: [Report bugs or request features](https://github.com/Govin25/QuizMaster/issues)
- **API Docs**: [API Reference](/docs/api/authentication-api)

---

**Happy Quizzing! 🎉**
