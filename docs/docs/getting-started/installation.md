---
sidebar_position: 1
title: Installation
---

# Installation

This guide will walk you through setting up Quainy on your local machine for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/Govin25/QuizMaster.git
cd QuizMaster
```

### 2. Install Dependencies

Quainy has a convenient script to install all dependencies for both client and server:

```bash
npm run install:all
```

This command will:
- Install root dependencies
- Install server dependencies (`server/package.json`)
- Install client dependencies (`client/package.json`)

Alternatively, you can install dependencies manually:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Set Up Environment Variables

Quainy requires environment variables for both the server and client.

#### Server Environment Variables

Create a `.env` file in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your configuration:

```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CLIENT_URL=http://localhost:5173,http://localhost:5174
```

:::warning Important
**Never commit your `.env` file to version control!** The `.env.example` file is provided as a template.
:::

#### Client Environment Variables

Create a `.env` file in the `client/` directory:

```bash
cd ../client
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_API_URL=http://localhost:3001
```

### 4. Initialize the Database

Quainy uses SQLite for development. The database will be created automatically, but you can seed it with sample data:

```bash
cd server
npm run seed
```

This will:
- Create the database schema
- Seed sample quizzes, users, and results
- Set up initial data for testing

## Verify Installation

To verify everything is set up correctly:

### 1. Start the Backend Server

```bash
cd server
npm start
```

You should see:
```
Server running on port 3001
Database connected successfully
```

### 2. Start the Frontend Development Server

In a new terminal:

```bash
cd client
npm run dev
```

You should see:
```
VITE v7.2.4  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. Open Your Browser

Navigate to [http://localhost:5173](http://localhost:5173)

You should see the Quainy login/signup page!

## Running Both Servers Concurrently

For convenience, you can run both frontend and backend together from the root directory:

```bash
# From the QuizMaster root directory
npm run dev
```

This starts both servers concurrently:
- **Backend**: `http://localhost:3001`
- **Frontend**: `http://localhost:5173` (or `http://localhost:5174` if 5173 is in use)

## Troubleshooting

### Port Already in Use

If you see "Port 5173 is in use", Vite will automatically try port 5174. Make sure your backend CORS configuration allows both ports (already configured in `.env.example`).

### CORS Errors

Ensure your `server/.env` file has:
```env
CLIENT_URL=http://localhost:5173,http://localhost:5174
```

### Database Errors

If you encounter database errors, try resetting the database:

```bash
cd server
rm quizmaster.db  # Remove existing database
npm run seed      # Recreate and seed
```

### Module Not Found Errors

If you see module not found errors, ensure all dependencies are installed:

```bash
npm run install:all
```

## Next Steps

Now that you have QuizMaster installed, check out the [Quick Start Guide](./quick-start.md) to create your first quiz!

## Development Scripts

Here are some useful npm scripts:

### Root Directory
- `npm run dev` - Run both frontend and backend concurrently
- `npm run dev:server` - Run backend only
- `npm run dev:client` - Run frontend only
- `npm run install:all` - Install all dependencies
- `npm run seed` - Seed the database

### Server Directory (`server/`)
- `npm start` - Start the backend server
- `npm run seed` - Seed the database
- `npm run migrate` - Run database migrations
- `npm run migrate:undo` - Undo last migration

### Client Directory (`client/`)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Production Build

To build QuizMaster for production:

```bash
# Build frontend
cd client
npm run build

# The built files will be in client/dist/
```

For production deployment, see the [Deployment Guide](/docs/deployment/vercel).
