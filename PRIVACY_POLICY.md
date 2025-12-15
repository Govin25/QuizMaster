# Privacy Policy

**Last Updated: November 29, 2025**

## Introduction

Welcome to Quainy. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our quiz application.

## Information We Collect

### Account Information
- **Username**: Required for account creation and identification
- **Password**: Stored securely using bcrypt hashing (we never store plain text passwords)
- **Account Creation Date**: Timestamp of when you created your account

### Usage Data
- **Quiz Results**: Your scores, completion times, and quiz attempts
- **Quiz Creation Data**: Quizzes you create, including questions and answers
- **User Progress**: Level, XP, achievements, and statistics
- **Avatar**: Optional profile picture URL if you choose to add one

### Technical Data
- **Authentication Tokens**: JWT tokens stored in your browser's localStorage for session management
- **IP Address**: Logged for security purposes (rate limiting, abuse prevention)
- **Request Timestamps**: For performance monitoring and security

## How We Use Your Information

We use your data to:
- Provide and maintain the Quainy service
- Authenticate your account and manage sessions
- Track your quiz progress and display leaderboards
- Generate personalized statistics and achievements
- Prevent abuse and ensure platform security
- Improve our service through analytics

## Data Storage and Security

### Security Measures
- Passwords are hashed using bcrypt (10 rounds)
- JWT tokens with 7-day expiration
- Rate limiting on authentication endpoints (5 attempts per 15 minutes)
- Input validation and sanitization on all endpoints
- SQL injection protection through parameterized queries
- XSS protection via helmet and xss-clean middleware

### Data Location
- Data is stored in a SQLite database on our servers
- No data is shared with third parties
- No external analytics or tracking services are used

## Your Rights (GDPR Compliance)

You have the right to:

### Access Your Data
Request a copy of all personal data we hold about you through the "Export My Data" feature in your profile settings.

### Delete Your Data
Request permanent deletion of your account and all associated data through the "Delete My Account" feature. Note:
- Public quizzes you created may be preserved for community benefit (anonymized)
- Deletion is permanent and cannot be undone
- A 30-day grace period applies before permanent deletion

### Rectify Your Data
Update your username, password, and avatar through your profile settings.

### Data Portability
Export your data in JSON format for use with other services.

## Cookies and Local Storage

Quainy uses browser localStorage (not cookies) to store:
- JWT authentication token
- User session information

No third-party cookies or tracking cookies are used.

## Data Retention

- **Active Accounts**: Data retained indefinitely while account is active
- **Inactive Accounts**: Accounts inactive for 2+ years may be deleted after email notification
- **Deleted Accounts**: Permanently removed after 30-day grace period
- **Quiz Results**: Retained as long as your account exists

## Children's Privacy

Quainy is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected data from a child under 13, please contact us immediately.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted on this page with an updated "Last Updated" date. Continued use of Quainy after changes constitutes acceptance of the updated policy.

## Third-Party Services

Quainy does not currently integrate with third-party services. If this changes, we will update this policy accordingly.

## International Data Transfers

Your data may be processed in countries outside your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy.

## Contact Us

If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at:

**Email**: [Your contact email - to be added]

## Legal Basis for Processing (GDPR)

We process your personal data based on:
- **Consent**: You agree to our terms when creating an account
- **Contract**: Processing necessary to provide the Quainy service
- **Legitimate Interests**: Security, fraud prevention, and service improvement

## Your Consent

By using Quainy, you consent to this Privacy Policy and agree to its terms.
