---
sidebar_position: 1
title: Authentication
---

# Authentication

Quainy uses secure JWT-based authentication with bcrypt password hashing to protect user accounts.

## Sign Up

### Creating a New Account

1. Navigate to the Quainy homepage
2. Click **Sign Up**
3. Fill in the registration form:
   - **Username**: Choose a unique username (3-50 characters)
   - **Password**: Create a strong password (minimum 6 characters)
4. **Accept Terms**: You must accept the Terms of Service and Privacy Policy
5. Click **Sign Up**

:::info
After successful signup, you'll be automatically logged in and redirected to your Home page.
:::

### Password Requirements

- Minimum 6 characters
- No maximum length
- Can include letters, numbers, and special characters

:::tip Security Tip
Use a strong, unique password for your Quainy account. Consider using a password manager!
:::

## Login

### Signing In

1. Navigate to the Quainy homepage
2. Enter your credentials:
   - **Username**
   - **Password**
3. Click **Login**

### Successful Login

After logging in, you'll be redirected to your **Home** page, which shows:
- Recently added quizzes
- Completed quizzes with your scores
- Quick access to start quizzes

## Session Management

### How Sessions Work

Quainy uses **JWT (JSON Web Tokens)** for session management:

- Tokens are stored in `localStorage`
- Tokens are automatically included in API requests
- Sessions persist across browser refreshes
- Tokens expire after a period of inactivity

### Logout

To log out of your account:

1. Click your **username** in the top right corner
2. Click **Logout**

This will:
- Clear your authentication token
- Redirect you to the login page
- End your session

## Security Features

### Password Hashing

- Passwords are hashed using **bcrypt** before storage
- Original passwords are never stored in the database
- Hashing includes salt for additional security

### JWT Authentication

- Secure token-based authentication
- Tokens are signed with a secret key
- Tokens include user ID and expiration time
- Middleware validates tokens on protected routes

### Protected Routes

The following features require authentication:
- Creating quizzes
- Taking quizzes
- Viewing results
- Accessing profile and analytics
- Managing your library
- Leaderboard participation

## Troubleshooting

### Can't Log In

If you're having trouble logging in:

1. **Check your credentials**: Ensure username and password are correct
2. **Clear browser cache**: Try clearing your browser's cache and cookies
3. **Try a different browser**: Test if the issue is browser-specific

### Forgot Password

:::warning
Quainy currently does not have a password reset feature. If you forget your password, you'll need to create a new account.
:::

### Session Expired

If your session expires:
- You'll be automatically redirected to the login page
- Simply log in again to continue

## Privacy & Data Protection

### What Data is Collected

During signup, Quainy collects:
- Username
- Hashed password
- Timestamp of account creation

### GDPR Compliance

Quainy is GDPR compliant. You have the right to:
- **Access your data**: View all data associated with your account
- **Export your data**: Download a JSON file with all your information
- **Delete your account**: Request permanent account deletion

See the [Data & Privacy Guide](./data-privacy.md) for more information.

## Next Steps

Now that you're authenticated, explore Quainy's features:

- **[Quiz Hub](./quiz-hub.md)**: Browse and discover public quizzes
- **[Creating Quizzes](./creating-quizzes.md)**: Build your own quizzes
- **[Taking Quizzes](./taking-quizzes.md)**: Start answering questions
- **[Analytics](./analytics.md)**: Track your performance
