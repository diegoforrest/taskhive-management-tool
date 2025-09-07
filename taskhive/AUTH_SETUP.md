# TaskHive Authentication Setup

## Overview
This document describes the complete authentication system setup for TaskHive with integrated backend API using axios.

## Backend Setup (NestJS)

### API Endpoints
- **POST /testlogin** - User authentication
- **POST /test01/create_member** - User registration
- **GET /test01/get_all_member** - Get all users
- **GET /test01/get_member** - Get specific user
- **PATCH /test01/update_member** - Update user information

### Database Integration
- Uses TypeORM with MySQL
- Password hashing with bcryptjs (12 salt rounds)
- User entity with id, user_id, email, password, timestamps

### Security Features
- Password validation and hashing
- Duplicate user/email prevention
- Proper error handling with meaningful messages

## Frontend Setup (Next.js)

### Components
1. **SignInForm** (`src/app/auth/sign-in-form.tsx`)
   - User ID and password fields
   - Remember me functionality
   - Form validation and error handling
   - Redirects to `/task` on successful login
   - Stores user data in localStorage if "Remember Me" is checked

2. **RegisterForm** (`src/app/auth/register-form.tsx`)
   - First name, last name, email, password fields
   - Password confirmation validation
   - Terms of service agreement
   - Auto-generates user_id from firstName_lastName
   - Redirects to sign-in page on success

3. **AuthLayout** (`src/app/auth/auth-layout.tsx`)
   - Responsive design with branded left panel
   - Theme toggle functionality
   - Navigation back to home page

### API Integration
- **Location**: `src/lib/api.ts`
- **HTTP Client**: Axios with 10-second timeout
- **Base URL**: `https://m-backend.dowinnsys.com`
- **Error Handling**: Comprehensive error catching with user-friendly messages
- **Response Parsing**: Structured response handling for success/error states

### Pages
- **Sign In**: `/auth/sign-in`
- **Register**: `/auth/register`

## Features

### Authentication Flow
1. **Registration**:
   - User fills form with firstName, lastName, email, password
   - System generates user_id as "firstname_lastname"
   - Backend validates uniqueness of user_id and email
   - Password hashed before storage
   - Success redirects to sign-in page

2. **Sign In**:
   - User enters user_id and password
   - Backend validates credentials
   - Success stores user info and redirects to `/task`
   - Remember me stores user data in localStorage

### Form Validation
- Password confirmation matching
- Minimum password length (8 characters)
- Email format validation
- Required field validation
- Terms of service agreement requirement

### UI/UX Features
- Password visibility toggle
- Loading states during API calls
- Error message display
- Responsive design
- Dark/light theme support
- Logo and branding integration

### Security Considerations
- Client-side form validation
- Server-side validation and sanitization
- Password hashing with bcrypt
- JWT tokens (configured but not yet implemented in frontend)
- CORS configuration for frontend domain

## API Request/Response Examples

### Registration Request
```json
{
  "user_id": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Registration Response (Success)
```json
{
  "data": {
    "success": true,
    "message": "Member created successfully",
    "user_id": "john_doe",
    "email": "john@example.com"
  }
}
```

### Login Request
```json
{
  "user_id": "john_doe",
  "password": "securepassword123"
}
```

### Login Response (Success)
```json
{
  "data": {
    "success": true,
    "user_id": "john_doe",
    "email": "john@example.com"
  }
}
```

## Error Handling
- Network errors display generic "Please check your connection" message
- Server errors show specific error messages from backend
- Form validation errors show field-specific messages
- Loading states prevent multiple submissions

## Next Steps for Enhancement
1. Add JWT token handling for persistent authentication
2. Implement email verification for new accounts
3. Add password reset functionality
4. Implement role-based access control
5. Add user profile management
6. Enhance security with rate limiting
7. Add OAuth integration (Google, GitHub, etc.)

## Files Modified/Created
- `src/lib/api.ts` - Updated with axios integration
- `src/app/auth/sign-in-form.tsx` - Complete sign-in form
- `src/app/auth/register-form.tsx` - Complete registration form
- `src/app/auth/auth-layout.tsx` - Authentication layout
- Backend controllers and services already configured

The authentication system is now fully functional and ready for testing.
