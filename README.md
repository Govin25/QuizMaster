# QuizMaster 🎯

An advanced, feature-rich quiz application built with React, Node.js, Express, and Socket.IO. Features a stunning glassmorphism UI, AI-powered quiz generation, comprehensive analytics, GDPR compliance, and real-time gameplay.

![QuizMaster](https://img.shields.io/badge/React-19.2.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-orange) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎮 Core Functionality
- **User Authentication**: Secure JWT-based auth with bcrypt password hashing
- **Real-time Quiz Experience**: Live scoring and instant feedback using Socket.IO
- **AI Quiz Generation**: Generate quizzes from text prompts or document uploads (PDF, TXT, DOCX)
- **Quiz Hub**: Browse and discover public quizzes from the community
- **My Quizzes**: Create, edit, and manage your own quizzes
- **Personal Library**: Curated home page with recently added and completed quizzes
- **Smart Leaderboard**: 
  - Best Scores view (highest score per user per quiz)
  - All Attempts view (complete history with attempt numbering)
  - Advanced filtering by quiz, category, difficulty, score range, and attempts
- **Comprehensive Analytics**: Detailed performance tracking and insights
- **Achievement System**: Unlock achievements as you progress
- **User Profiles**: Track stats, view trends, and manage your account

### 🎨 UI/UX
- **Glassmorphism Design**: Modern, premium aesthetic with blur effects and gradients
- **Gradient Accents**: Vibrant purple-pink color scheme throughout
- **Fully Responsive**: Mobile-first design that works on all screen sizes
- **Interactive Elements**: Smooth animations, hover effects, and micro-interactions
- **Real-time Timer**: 30-second countdown per question with visual feedback
- **Dark Mode**: Sleek dark theme optimized for extended use

### 🤖 AI-Powered Features
- **Text-to-Quiz**: Generate quizzes from any text description
- **Document Upload**: Extract quiz content from PDF, TXT, and DOCX files
- **Smart Question Generation**: AI creates relevant multiple-choice questions
- **Customizable**: Specify number of questions and difficulty level

### 📊 Analytics & Insights
- **Performance Dashboard**: Track your progress over time
- **Category Mastery**: See your strengths and weaknesses by category
- **Trend Charts**: Visualize score improvements with interactive graphs
- **Personalized Recommendations**: Get suggestions based on your performance
- **Streak Tracking**: Monitor daily quiz-taking streaks
- **Global Rankings**: See how you stack up against other users

### 🔒 Legal & Compliance
- **GDPR Compliant**: Full data export and deletion capabilities
- **Privacy Policy**: Comprehensive privacy policy available in-app
- **Terms of Service**: Clear terms with mandatory acceptance during signup
- **Data Export**: Download all your data in JSON format
- **Account Deletion**: 30-day grace period for deletion requests
- **Secure Storage**: Passwords hashed with bcrypt, JWT authentication

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd QuizMaster
   ```

2. **Install all dependencies (root, server, and client)**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   **Server** (`server/.env`):
   ```env
   PORT=3001
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   CLIENT_URL=http://localhost:5173,http://localhost:5174
   ```

   **Client** (`client/.env`):
   ```env
   VITE_API_URL=http://localhost:3001
   ```

   *Note: `.env.example` files are provided in both directories as templates.*

### Running the Application

**Development Mode** (runs both frontend and backend concurrently):
```bash
npm run dev
```
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173` or `http://localhost:5174`

**Production Build**:
```bash
npm run build    # Build frontend
npm start        # Start backend server
```

**Seed the Database**:
```bash
npm run seed
```

### Individual Commands

If you prefer to run frontend and backend separately:

```bash
# Backend only
npm run dev:server

# Frontend only  
npm run dev:client
```

## 📁 Project Structure

```
QuizMaster/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── AuthForm.jsx           # Login/Signup
│   │   │   ├── Home.jsx               # Personal library
│   │   │   ├── QuizHub.jsx            # Browse public quizzes
│   │   │   ├── MyQuizzes.jsx          # Manage your quizzes
│   │   │   ├── QuizCreator.jsx        # Create/edit quizzes
│   │   │   ├── AIGenerator.jsx        # AI quiz generation
│   │   │   ├── QuizGame.jsx           # Quiz gameplay
│   │   │   ├── QuizReport.jsx         # Detailed results
│   │   │   ├── QuizAttempts.jsx       # Attempt history
│   │   │   ├── Leaderboard.jsx        # Global rankings
│   │   │   ├── UserProfile.jsx        # User stats & settings
│   │   │   ├── DataManagement.jsx     # GDPR compliance
│   │   │   ├── LegalFooter.jsx        # Legal links
│   │   │   └── ...
│   │   ├── context/            # React context
│   │   │   ├── AuthContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── routes/             # API routes
│   │   │   ├── auth.js                # Authentication
│   │   │   ├── quiz.js                # Quiz CRUD
│   │   │   ├── results.js             # Quiz results
│   │   │   ├── leaderboard.js         # Leaderboard
│   │   │   ├── profile.js             # User profiles
│   │   │   └── legal.js               # Legal/GDPR endpoints
│   │   ├── models/             # Database models (Sequelize)
│   │   │   └── sequelize/
│   │   ├── services/           # Business logic
│   │   │   ├── aiQuizGenerator.js     # AI quiz generation
│   │   │   ├── documentParser.js      # Document parsing
│   │   │   ├── analyticsService.js    # Analytics
│   │   │   ├── achievementService.js  # Achievements
│   │   │   ├── dataExport.js          # GDPR data export
│   │   │   └── accountDeletion.js     # GDPR deletion
│   │   ├── repositories/       # Data access layer
│   │   ├── middleware/         # Express middleware
│   │   │   ├── authMiddleware.js
│   │   │   ├── rateLimiter.js
│   │   │   └── inputValidator.js
│   │   ├── managers/           # Game state management
│   │   ├── utils/              # Utilities
│   │   ├── db.js               # Database setup
│   │   └── index.js            # Express server
│   └── package.json
│
├── PRIVACY_POLICY.md           # Privacy policy
├── TERMS_OF_SERVICE.md         # Terms of service
├── CODE_OF_CONDUCT.md          # Contributor guidelines
├── LICENSE                     # MIT License
└── README.md
```

## 🎯 How to Use

### Getting Started
1. **Sign Up / Login**: Create an account or log in (must accept Terms & Privacy Policy)
2. **Browse Quiz Hub**: Discover public quizzes from the community
3. **Add to Library**: Add quizzes to your home page for quick access
4. **Create Quizzes**: Build your own quizzes manually or with AI
5. **Take Quizzes**: Answer questions with 30-second timer per question
6. **View Results**: See detailed reports with question-by-question analysis
7. **Track Progress**: Monitor your stats, achievements, and rankings

### AI Quiz Generation
1. Navigate to **AI Generate** tab
2. Choose generation method:
   - **Text Prompt**: Describe the quiz topic
   - **Document Upload**: Upload PDF, TXT, or DOCX file
3. Specify number of questions and difficulty
4. Review and edit generated quiz
5. Save to your quizzes

### Managing Your Data
1. Go to **Profile** → **Data & Privacy** tab
2. **Export Data**: Download all your data in JSON format
3. **Delete Account**: Request account deletion (30-day grace period)

## 🏆 Leaderboard Features

### Best Scores Mode
- Shows your highest score for each quiz
- One entry per user per quiz
- Sorted by score (highest first)
- Filter by quiz, category, difficulty, score range

### All Attempts Mode
- Complete history of all quiz attempts
- Attempt numbering (#1, #2, #3, etc.)
- Sorted by date (most recent first)
- Filter by number of attempts

## 🛠️ Technology Stack

### Frontend
- **React 19.2.0**: UI library with hooks
- **Vite 7.2.4**: Lightning-fast build tool and dev server
- **Socket.IO Client 4.8.1**: Real-time communication
- **Recharts 3.5.0**: Data visualization and charts
- **CSS3**: Custom glassmorphism styling

### Backend
- **Node.js**: Runtime environment
- **Express 5.1.0**: Web framework
- **Socket.IO 4.8.1**: WebSocket library for real-time features
- **Sequelize 6.37.7**: ORM for database management
- **SQLite3 5.1.7**: Embedded database
- **PostgreSQL**: Production database support
- **JWT**: Token-based authentication
- **bcrypt 6.0.0**: Password hashing
- **Multer 2.0.2**: File upload handling
- **Helmet 8.1.0**: Security headers
- **Express Rate Limit 8.2.1**: Rate limiting
- **Compression 1.8.1**: Response compression

### Security & Performance
- **Helmet**: Security headers (CSP, XSS protection)
- **Rate Limiting**: Protect against abuse
  - Auth endpoints: 5 requests per 15 minutes
  - File uploads: 10 per hour
  - Quiz creation: 20 per hour
  - General API: 100 per 15 minutes
- **Input Validation**: Express-validator on all endpoints
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: xss-clean middleware
- **Compression**: Gzip compression for responses
- **Caching**: In-memory caching for frequently accessed data

## 📊 Database Schema

### Core Tables
- **users**: User accounts and authentication
- **quizzes**: Quiz metadata and settings
- **questions**: Quiz questions and answers
- **results**: Quiz attempt results
- **question_attempts**: Individual question responses
- **user_quiz_library**: Personal quiz library
- **user_stats**: Aggregated user statistics
- **user_achievements**: Unlocked achievements
- **quiz_reviews**: Admin quiz review queue

### Key Relationships
- Users → Results (one-to-many)
- Quizzes → Questions (one-to-many)
- Results → Question Attempts (one-to-many)
- Users → Quizzes (creator relationship)
- Users → User Quiz Library (many-to-many with quizzes)

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup`: Create new user (requires terms acceptance)
- `POST /api/auth/login`: User login

### Quizzes
- `GET /api/quizzes`: Get all public quizzes
- `GET /api/quizzes/:id`: Get specific quiz with questions
- `POST /api/quizzes`: Create new quiz
- `PUT /api/quizzes/:id`: Update quiz
- `DELETE /api/quizzes/:id`: Delete quiz
- `GET /api/quizzes/my-library`: Get user's personal library
- `POST /api/quizzes/:id/add-to-library`: Add quiz to library
- `DELETE /api/quizzes/:id/remove-from-library`: Remove from library
- `POST /api/quizzes/generate-ai`: AI quiz generation
- `POST /api/quizzes/generate-from-document`: Document-based generation

### Results & Analytics
- `GET /api/results/:userId`: Get user's quiz results
- `GET /api/quizzes/results/:resultId/report`: Detailed quiz report
- `GET /api/quizzes/:quizId/attempts/:userId`: Quiz attempt history

### Leaderboard
- `GET /api/leaderboard?filter=best`: Best scores
- `GET /api/leaderboard?filter=all`: All attempts
- `GET /api/leaderboard?quiz=:id&category=:cat&difficulty=:diff`: Filtered leaderboard

### Profile & Analytics
- `GET /api/profile/stats/:userId`: User statistics
- `GET /api/profile/activity/:userId`: Recent activity
- `GET /api/profile/trends/:userId`: Performance trends
- `GET /api/profile/achievements/:userId`: Achievements
- `GET /api/profile/recommendations/:userId`: Personalized recommendations

### Legal & GDPR
- `GET /api/legal/privacy-policy`: Privacy policy content
- `GET /api/legal/terms-of-service`: Terms of service content
- `POST /api/legal/accept-terms`: Record terms acceptance
- `GET /api/legal/user/data-export`: Export all user data (JSON)
- `POST /api/legal/user/request-deletion`: Request account deletion
- `POST /api/legal/user/cancel-deletion`: Cancel deletion request
- `DELETE /api/legal/user/account`: Permanent account deletion
- `GET /api/legal/user/deletion-status`: Check deletion status

## 🎨 Design Philosophy

- **Premium Aesthetics**: Glassmorphism with gradient accents creates a modern, sophisticated look
- **User-Centric**: Intuitive navigation and clear feedback at every step
- **Performance**: Optimized queries, caching, and efficient rendering
- **Accessibility**: Semantic HTML, readable typography, and keyboard navigation
- **Privacy-First**: GDPR compliant with full user data control
- **Mobile-First**: Responsive design that works beautifully on all devices

## 🔒 Legal & Compliance

### Privacy & Data Protection
- **GDPR Compliant**: Full data export and deletion capabilities
- **Privacy Policy**: Comprehensive privacy policy available in-app
- **Terms of Service**: Clear terms of service with user acceptance
- **Data Export**: Users can download all their data in JSON format
- **Account Deletion**: 30-day grace period for account deletion requests
- **Secure Storage**: Passwords hashed with bcrypt, JWT authentication

### User Rights
Users have the right to:
- Access their personal data
- Export their data in portable format
- Request account deletion
- Update their information
- Withdraw consent

### Legal Documents
- [Privacy Policy](PRIVACY_POLICY.md)
- [Terms of Service](TERMS_OF_SERVICE.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [MIT License](LICENSE)

### Data Collected
- Username and hashed password
- Quiz results and attempts
- User-created quizzes
- Progress and achievements
- Timestamps for activity tracking

## 🚀 Deployment

### Docker Deployment (Recommended)

The easiest way to deploy QuizMaster is using Docker containers. Both client and server can be deployed independently or together using docker-compose.

**Quick Start with Docker Compose:**
```bash
# Create environment file
cp .env.example .env
# Edit .env with your secrets

# Start both services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Or use the interactive script:**
```bash
./docker-commands.sh
```

For detailed Docker deployment instructions, including:
- Individual container deployment
- Production configuration
- Backup and restore procedures
- Troubleshooting
- Resource management

See the comprehensive [Docker Deployment Guide](DOCKER.md).

### Vercel Deployment


This project is configured for easy deployment to Vercel.

**Quick Deploy:**
1. Push to GitHub
2. Import to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

**Environment Variables for Production:**
- `JWT_SECRET`: Strong secret key for JWT tokens
- `CLIENT_URL`: Your frontend URL
- `DATABASE_URL`: PostgreSQL connection string (for production)

**Note:** For production use with Socket.IO, consider deploying the backend separately on Railway, Render, or Heroku for better WebSocket support.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

See the [LICENSE](LICENSE) file for full details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues & Troubleshooting

### Port Already in Use
If you see "Port 5173 is in use", Vite will automatically try port 5174. Make sure your backend CORS configuration allows both ports.

### CORS Errors
Ensure your `server/.env` file has:
```env
CLIENT_URL=http://localhost:5173,http://localhost:5174
```

### Database Errors
If you encounter database errors, try:
```bash
npm run seed  # Reset and seed the database
```

## 👨‍💻 Author

Built with ❤️ using React, Node.js, and modern web technologies

## 🙏 Acknowledgments

- React team for the amazing library
- Socket.IO for real-time capabilities
- Recharts for beautiful data visualization
- The open-source community

---

**Happy Quizzing! 🎉**

*Master every topic, track your progress, and compete with others in this feature-rich quiz platform.*
