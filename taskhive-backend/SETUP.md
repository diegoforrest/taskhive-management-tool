# TaskHive Backend - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation Steps

1. **Navigate to Backend Directory**
```bash
cd backend
```

2. **Install Dependencies** (Already done)
```bash
npm install
```

3. **Database Setup**
Create a MySQL database named `taskhive_db`:
```sql
CREATE DATABASE taskhive_db;
CREATE USER 'taskhive_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON taskhive_db.* TO 'taskhive_user'@'localhost';
FLUSH PRIVILEGES;
```

4. **Environment Configuration**
Update the `.env` file with your MySQL credentials:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=taskhive_user
DB_PASSWORD=your_password
DB_NAME=taskhive_db

# JWT Configuration (Change this in production!)
JWT_SECRET=your-very-secure-jwt-secret-key-here
JWT_EXPIRATION=24h
```

5. **Start the Application**
```bash
# Development mode (recommended)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## 📡 API Endpoints

### Authentication
- `POST /testlogin` - User login
- `POST /test01/create_member` - User registration

### Health Check
- `GET /` - Welcome message
- `GET /health` - Backend health status

## 🗄️ Database Schema

The application will automatically create these tables when you first run it:

- **users** - User accounts and authentication
- **projects** - Project management data
- **tasks** - Individual tasks within projects  
- **change_logs** - Activity and change tracking

## 🔗 Frontend Integration

The backend is configured with CORS to work with:
- http://localhost:3000 (Next.js default)
- http://localhost:3001 (Alternative port)

## 🏗️ Architecture Overview

```
src/
├── auth/               # Authentication module
│   ├── dto/           # Data transfer objects
│   ├── strategies/    # JWT strategy
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── config/            # Configuration files
│   └── database.config.ts
├── entities/          # Database entities (TypeORM)
│   ├── user.entity.ts
│   ├── project.entity.ts
│   ├── task.entity.ts
│   └── changelog.entity.ts
├── app.controller.ts  # Main app controller
├── app.module.ts      # Main app module
├── app.service.ts     # Main app service
└── main.ts           # Application entry point
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with 12 salt rounds
- **Input Validation**: class-validator for request validation
- **CORS**: Configured for frontend communication
- **Environment Variables**: Sensitive data in .env file

## 🧪 Testing the Backend

1. **Health Check**
```bash
curl http://localhost:3001/health
```

2. **Register a User**
```bash
curl -X POST http://localhost:3001/test01/create_member \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "john.doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

3. **Login**
```bash
curl -X POST http://localhost:3001/testlogin \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "john.doe",
    "password": "securepassword123"
  }'
```

## ❗ Important Notes

- Database tables are created automatically on first run
- Change JWT_SECRET in production
- Make sure MySQL is running before starting the backend
- The backend runs on port 3001 by default

## 🛠️ Development Commands

```bash
npm run start:dev     # Watch mode for development
npm run build         # Build for production
npm run test          # Run tests
npm run lint          # Run ESLint
```

## Next Steps

1. ✅ Backend setup complete
2. 🔄 Update frontend to use real API (next step)
3. 📝 Add project and task management endpoints
4. 🔍 Add proper error handling
5. 📊 Add logging and monitoring
