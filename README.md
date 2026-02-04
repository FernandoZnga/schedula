# Schedula

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

**Schedula** is a modern, full-stack to-do scheduler web application built with React, Node.js, TypeScript, PostgreSQL, and Docker.

## 🎯 Features

### Authentication & Security
- **User Registration** with email confirmation (logged to console)
- **Secure Login** with JWT access + refresh tokens
- **Password Requirements**: 8+ characters with letters, numbers, and symbols
- **Failed Login Protection**: Account blocked after 10 failed attempts
- **Password Reset** with token-based flow
- **Password History**: Cannot reuse last 5 passwords
- **Rate Limiting** on authentication endpoints

### Activity Management
- **Two Activity Types**:
  - **Scheduled Activities**: Future-only with title, notes, date/time
  - **Recorded Activities**: Past-only with completion outcome
- **Completion Outcomes**: COMPLETED_OK, NO_SHOW, DID_NOT_ANSWER, CANCELLED, FAILED
- **Activity Types**: Doctor appointment, Call, Meeting, Gym, Grocery run, Study session, Pay bills, Car maintenance, and more
- **Soft Delete**: Activities require deletion reason and can be toggled visible
- **Mark as Completed**: Convert scheduled to recorded activities

### UI Features
- **Dashboard** with summary statistics (Total, Open, Completed)
- **List View** with sorting (scheduled first, then recorded)
- **Calendar View** with Day/Week/Month modes
- **Profile Management** with editable user fields
- **Minimalistic Material UI** design
- **Responsive Layout** with top navigation bar

## 🏗️ Architecture

```
schedula/
├── backend/          # Node.js + Express + TypeScript + Prisma
├── frontend/         # React + TypeScript + Material UI
├── docker-compose.yml
├── Makefile
└── README.md
```

### Tech Stack

**Backend**
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- JWT (access + refresh tokens)
- bcrypt for password hashing
- Zod for validation
- express-rate-limit

**Frontend**
- React 18 + TypeScript
- React Router v6
- Material UI (MUI)
- React Hook Form + Zod
- MUI X Date Pickers
- React Big Calendar
- Axios

**Infrastructure**
- Docker + Docker Compose
- PostgreSQL 15
- Hot reload for development

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Make (optional, for convenient commands)

### Setup & Run

1. **Clone and navigate to the project**:
   ```bash
   git clone <repository-url>
   cd schedula
   ```

2. **Set up environment variables**:
   ```bash
   # Copy the sample env file and configure your secrets
   cp .env.sample .env
   
   # Edit .env with your values (especially secrets for production)
   ```

   > **Note**: The root `.env` file is used by Docker Compose. For local development without Docker, each service has its own `.env` file (`backend/.env`, `frontend/.env`).

3. **Start all services** (database, backend, frontend):
   ```bash
   make dev
   # OR
   docker-compose up --build
   ```

4. **Run database migrations** (in a new terminal):
   ```bash
   make migrate
   # OR
   docker-compose exec backend npm run prisma:migrate
   ```

5. **Access the application**:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3001
   - **Health Check**: http://localhost:3001/health

### Available Commands

```bash
make help          # Show all available commands
make dev           # Start all services
make down          # Stop all services
make reset-db      # Drop database and restart (WARNING: deletes all data)
make logs          # Follow logs from all services
make migrate       # Run Prisma migrations
make migrate-create # Create a new migration
make install       # Install npm dependencies in containers
```

## 📝 API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/confirm-email` - Confirm email with token
- `POST /auth/login` - Login and get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (revoke refresh token)
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/dev/unblock` - (Dev only) Unblock user account

### Profile
- `GET /me` - Get current user profile
- `PATCH /me` - Update profile (firstName, lastName)

### Activities
- `GET /activities` - List activities (supports filters)
- `POST /activities` - Create scheduled or recorded activity
- `PATCH /activities/:id` - Update activity
- `POST /activities/:id/complete` - Mark scheduled activity as completed
- `DELETE /activities/:id` - Soft delete activity (requires reason)

## 🔐 Email Functionality

The email service supports **two modes**:

### Console-Only Mode (Default)
When SMTP credentials are not configured, emails are logged to the backend console:
- Email confirmation links
- Password reset links
- All email content (To, Subject, Body, Link)

To view emails, check the backend logs:
```bash
make logs
# OR
docker-compose logs -f backend
```

### SMTP Mode (Gmail Integration)
To send real emails via Gmail SMTP:

1. **Generate a Gmail App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

2. **Configure SMTP in your `.env` file**:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-specific-password
   ```

3. **Restart the backend**:
   ```bash
   docker-compose restart backend
   ```

4. **Verify**: You should see `✓ Email service initialized with SMTP credentials` in the logs.

Emails will now be sent to real addresses. Failed sends automatically fall back to console logging.

## 🗄️ Database Schema

### Models
- **User**: Authentication and profile data
- **PasswordHistory**: Stores last 5 password hashes
- **EmailToken**: Email confirmation and password reset tokens
- **RefreshToken**: JWT refresh tokens
- **Activity**: Scheduled and recorded activities

### Activity Types
DOCTOR_APPOINTMENT, CALL, MEETING, GYM, GROCERY_RUN, STUDY_SESSION, PAY_BILLS, CAR_MAINTENANCE, DENTIST_APPOINTMENT, HAIRCUT, WORKOUT, LUNCH_MEETING, TEAM_STANDUP, CLIENT_CALL, PERSONAL_TIME, OTHER

### Completion Outcomes
COMPLETED_OK, NO_SHOW, DID_NOT_ANSWER, CANCELLED, FAILED

## 🧪 Testing

### Test User Workflow

1. **Sign up**:
   ```bash
   curl -X POST http://localhost:3001/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@schedula.dev",
       "password": "Test123!@#",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```

2. **Check backend logs** for the confirmation email link

3. **Extract the token** from the log and confirm email:
   ```bash
   curl -X POST http://localhost:3001/auth/confirm-email \
     -H "Content-Type: application/json" \
     -d '{"token": "YOUR_TOKEN_HERE"}'
   ```

4. **Login**:
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@schedula.dev",
       "password": "Test123!@#"
     }'
   ```

### Unblock a Blocked Account (Dev Only)

```bash
curl -X POST http://localhost:3001/auth/dev/unblock \
  -H "Content-Type: application/json" \
  -d '{"email": "test@schedula.dev"}'
```

## 🛠️ Development

### Environment Files

The project uses multiple `.env` files for different contexts:

| File | Purpose |
|------|--------|
| `/.env` | Used by Docker Compose for container environment variables |
| `/.env.sample` | Template with all required variables (copy to `.env`) |
| `/backend/.env` | Used when running backend locally without Docker |
| `/backend/.env.example` | Template for backend local development |
| `/frontend/.env` | Used when running frontend locally without Docker |
| `/frontend/.env.example` | Template for frontend local development |

### Backend Development

```bash
cd backend
cp .env.example .env   # First time setup
npm install
npm run dev            # Run with hot reload
npm run prisma:studio  # Open Prisma Studio (database GUI)
```

### Frontend Development

```bash
cd frontend
cp .env.example .env   # First time setup
npm install
npm run dev            # Run with hot reload
```

### Database Migrations

Create a new migration:
```bash
make migrate-create
# OR
docker-compose exec backend npm run prisma:migrate:create
```

Apply migrations:
```bash
make migrate
# OR
docker-compose exec backend npm run prisma:migrate
```

## 📦 Project Structure

```
backend/
├── prisma/
│   └── schema.prisma           # Database schema
├── src/
│   ├── config/                 # Configuration (env, database)
│   ├── middleware/             # Express middleware (auth)
│   ├── routes/                 # API routes
│   ├── services/               # Business logic (email)
│   ├── utils/                  # Utilities (jwt, password, validation)
│   └── index.ts               # Server entry point
├── Dockerfile
└── package.json

frontend/
├── src/
│   ├── components/            # React components
│   ├── pages/                 # Page components
│   ├── context/               # React context (auth)
│   ├── services/              # API client
│   └── App.tsx                # Main app component
├── Dockerfile
└── package.json
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Separate access (15min) and refresh (7 days) tokens
- **Token Storage**: Refresh tokens hashed in database
- **Rate Limiting**: 10 requests per 15 minutes on auth endpoints
- **Failed Login Protection**: Auto-block after 10 failed attempts
- **Password History**: Last 5 passwords tracked and prevented from reuse
- **Input Validation**: Zod schemas on both frontend and backend
- **SQL Injection Protection**: Prisma ORM with parameterized queries

## 🐛 Troubleshooting

### Database connection issues
```bash
make reset-db
```

### Port already in use
Stop all services and remove containers:
```bash
make down
docker-compose down -v
```

### Frontend can't reach backend
Ensure backend is running and check the VITE_API_URL in frontend:
```bash
echo $VITE_API_URL
# Should be: http://localhost:3001
```

### Migrations not applying
Ensure database is running:
```bash
docker-compose ps
docker-compose up db -d
make migrate
```

## 📄 License

MIT

---

**Project Name**: Schedula  
**Version**: 1.0.0  
**Created**: 2025
