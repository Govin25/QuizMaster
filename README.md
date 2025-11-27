# QuizMaster 🎯

An interactive, real-time quiz application built with React, Node.js, Express, and Socket.IO. Features a beautiful glassmorphism UI, user authentication, live scoring, and comprehensive leaderboards.

![QuizMaster](https://img.shields.io/badge/React-19.2.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-orange)

## ✨ Features

### 🎮 Core Functionality
- **User Authentication**: Secure login/signup with JWT and bcrypt password hashing
- **Real-time Quiz Experience**: Live scoring and instant feedback using Socket.IO
- **Multiple Quiz Categories**: Programming, Science, History, Web Frameworks, Tools, Databases, and DevOps
- **10 Python Learning Levels**: Progressive curriculum from Beginner to Expert
- **Smart Leaderboard**: 
  - Best Scores view (highest score per user per quiz)
  - All Attempts view (complete history with attempt numbering)
- **Quiz Filtering**: Search by title/category and filter by completion status

### 🎨 UI/UX
- **Glassmorphism Design**: Modern, premium aesthetic with blur effects
- **Gradient Accents**: Vibrant purple-pink color scheme
- **Responsive Layout**: Works seamlessly on all screen sizes
- **Interactive Elements**: Smooth animations and hover effects
- **Real-time Timer**: 30-second countdown per question

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
   CLIENT_URL=http://localhost:5173
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
- Frontend: `http://localhost:5173`

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
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── AuthForm.jsx
│   │   │   ├── QuizGame.jsx
│   │   │   └── Leaderboard.jsx
│   │   ├── context/        # React context
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   │   ├── auth.js
│   │   │   ├── quizzes.js
│   │   │   ├── results.js
│   │   │   └── leaderboard.js
│   │   ├── models/         # Database models
│   │   │   ├── User.js
│   │   │   └── Quiz.js
│   │   ├── db.js           # SQLite database setup
│   │   └── index.js        # Express server
│   ├── seed_expanded.js    # Database seeding script
│   └── package.json
│
└── README.md
```

## 🎯 How to Play

1. **Sign Up / Login**: Create an account or log in
2. **Browse Quizzes**: View available quizzes by category
3. **Select a Quiz**: Choose difficulty level and topic
4. **Answer Questions**: 30 seconds per question, real-time scoring
5. **View Results**: See your score and rank on the leaderboard
6. **Track Progress**: Monitor your attempts and improvements

## 🏆 Leaderboard Features

### Best Scores Mode
- Shows your highest score for each quiz
- One entry per user per quiz
- Sorted by score (highest first)

### All Attempts Mode
- Complete history of all quiz attempts
- Attempt numbering (#1, #2, #3, etc.)
- Sorted by date (most recent first)

## 🛠️ Technology Stack

### Frontend
- **React 19.2.0**: UI library
- **Vite**: Build tool and dev server
- **Socket.IO Client**: Real-time communication
- **CSS3**: Glassmorphism styling

### Backend
- **Node.js**: Runtime environment
- **Express 5.1.0**: Web framework
- **Socket.IO 4.8.1**: WebSocket library
- **SQLite3**: Database
- **JWT**: Authentication
- **bcrypt**: Password hashing

## 📊 Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `password`: Hashed password
- `created_at`: Timestamp

### Quizzes Table
- `id`: Primary key
- `title`: Quiz title
- `category`: Category name
- `difficulty`: Easy/Medium/Hard/Beginner/Intermediate/Advanced/Expert

### Questions Table
- `id`: Primary key
- `quiz_id`: Foreign key to quizzes
- `type`: multiple_choice/true_false
- `text`: Question text
- `options`: JSON array of options
- `correct_answer`: Correct answer

### Results Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `quiz_id`: Foreign key to quizzes
- `score`: Score achieved
- `completed_at`: Timestamp

## 🎓 Python Learning Path

10 progressive levels covering:
1. **Syntax & Basics**: Variables, data types, I/O
2. **Control Flow**: Conditionals, loops, boolean logic
3. **Functions & Modules**: Scopes, imports, lambdas
4. **Data Structures**: Lists, dicts, sets, comprehensions
5. **File & Exception Handling**: I/O operations, try/except
6. **OOP**: Classes, inheritance, polymorphism
7. **Advanced Functions**: Decorators, generators, closures
8. **Standard Library**: datetime, os, json, unittest
9. **Concurrency**: Threading, multiprocessing, asyncio
10. **Internals & Advanced**: Metaclasses, bytecode, GC

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup`: Create new user
- `POST /api/auth/login`: User login

### Quizzes
- `GET /api/quizzes`: Get all quizzes
- `GET /api/quizzes/:id`: Get specific quiz with questions

### Results
- `GET /api/results/:userId`: Get user's quiz results

### Leaderboard
- `GET /api/leaderboard?filter=best`: Best scores
- `GET /api/leaderboard?filter=all`: All attempts

## 🎨 Design Philosophy

- **Premium Aesthetics**: Glassmorphism with gradient accents
- **User-Centric**: Intuitive navigation and clear feedback
- **Performance**: Optimized queries and efficient rendering
- **Accessibility**: Semantic HTML and readable typography

## 🚀 Deployment

### Vercel Deployment

This project is configured for easy deployment to Vercel. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Quick Deploy:**
1. Push to GitHub
2. Import to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

**Note:** For production use with Socket.IO, consider deploying the backend separately on Railway or Render for better WebSocket support.

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 👨‍💻 Author

Built with ❤️ using React and Node.js

---

**Happy Quizzing! 🎉**
