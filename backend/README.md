# Backend Authentication System

A comprehensive Node.js/Express authentication system with JWT tokens, PostgreSQL database, and secure cookie-based session management.

## 🏗️ Architecture Overview

This backend implements a robust authentication system using:
- **Express.js** for the web framework
- **PostgreSQL** for data persistence
- **JWT** for token-based authentication
- **bcrypt** for password hashing
- **HttpOnly cookies** for secure token storage

## 📁 Project Structure

```
backend/
├── config/
│   └── db.js              # PostgreSQL connection pool setup
├── middleware/
│   └── auth.js            # JWT authentication middleware with auto-refresh
├── routes/
│   └── auth.js            # Authentication endpoints (register, login, logout, me)
├── utils/
│   ├── apiUtils.js        # Standardized API response utility
│   └── jwtUtils.js        # JWT token generation and verification
├── index.js               # Main server file with middleware setup
├── package.json           # Dependencies and scripts
└── .env                   # Environment variables
```

## 🔐 Authentication Flow

### 1. User Registration
- **Endpoint**: `POST /api/auth/register`
- **Process**:
  1. Validate required fields (name, email, password)
  2. Check if user already exists
  3. Hash password with bcrypt (10 rounds)
  4. Create user in database
  5. Generate access and refresh tokens
  6. Store refresh token in database
  7. Set access token as HttpOnly cookie
  8. Return success response

### 2. User Login
- **Endpoint**: `POST /api/auth/login`
- **Process**:
  1. Validate email and password fields
  2. Find user by email
  3. Verify password with bcrypt
  4. Generate new access and refresh tokens
  5. Update refresh token in database
  6. Set access token as HttpOnly cookie
  7. Return success response

### 3. Token Verification & Auto-Refresh
- **Middleware**: `authMiddleware` (applied to protected routes)
- **Process**:
  1. Extract access token from HttpOnly cookie
  2. Verify token with JWT secret
  3. If valid: attach user data to request and continue
  4. If expired: attempt automatic refresh
  5. Decode expired token to get user ID
  6. Fetch refresh token from database
  7. Verify refresh token validity
  8. Generate new access token
  9. Set new token via `x-new-access-token` header
  10. `createApiResponse` automatically sets it as cookie

### 4. User Profile Access
- **Endpoint**: `GET /api/auth/me`
- **Process**:
  1. Authentication middleware verifies token
  2. Return user data and current token

### 5. User Logout
- **Endpoint**: `POST /api/auth/logout`
- **Process**:
  1. Authentication middleware verifies token
  2. Clear refresh token from database
  3. Clear access token cookie
  4. Return success response

## 🛡️ Security Features

### Token Security
- **Access Tokens**: Short-lived (1 minute) for API access
- **Refresh Tokens**: Long-lived (3 minutes) stored in database
- **HttpOnly Cookies**: Prevent XSS attacks
- **Secure Flag**: HTTPS-only in production
- **SameSite**: Strict CSRF protection

### Password Security
- **bcrypt hashing**: 10 rounds of salting
- **No plain text storage**: All passwords hashed

### Session Management
- **Automatic refresh**: Seamless token renewal
- **Session cleanup**: Invalid tokens cleared on expiry
- **Database-backed**: Refresh tokens stored securely

## 🗄️ Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Environment Variables

```env
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=root
DB_NAME=pern_auth

# JWT Configuration
ACCESS_TOKEN_JWT_SECRET=your_access_token_secret
ACCESS_TOKEN_JWT_EXPIRY=60000
REFRESH_TOKEN_JWT_SECRET=your_refresh_token_secret
REFRESH_TOKEN_JWT_EXPIRY=180000

# Client Configuration
CLIENT_URL=http://localhost:5173
```

## 📡 API Endpoints

### Public Endpoints
- `GET /` - Health check endpoint

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - User logout (protected)

## 🏃‍♂️ Running the Application

### Prerequisites
- Node.js (v16+)
- PostgreSQL database
- npm or yarn

### Installation
```bash
cd backend
npm install
```

### Database Setup
1. Create PostgreSQL database
2. Update `.env` with your database credentials
3. Run the schema SQL to create tables

### Development
```bash
npm start  # Uses nodemon for auto-restart
```

### Production
```bash
npm run build  # If you have a build script
npm start
```

## 🔄 Request/Response Flow

### Successful Authentication Flow
1. Client sends login/register request
2. Server validates credentials
3. Server generates tokens and sets HttpOnly cookie
4. Client receives success response
5. Subsequent requests include the cookie automatically
6. Server validates token on each protected request
7. Expired tokens are automatically refreshed

### Error Handling
- **400**: Bad Request (missing fields, invalid credentials)
- **401**: Unauthorized (invalid/expired tokens)
- **500**: Internal Server Error (database/server issues)

## 🧩 Key Components

### createApiResponse Utility
Standardizes all API responses and handles automatic cookie setting for token refresh:

```javascript
export const createApiResponse = (res, statusCode, data) => {
  if (res.getHeader("x-new-access-token")) {
    res.cookie("token", res.getHeader("x-new-access-token"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }
  return res.status(statusCode).json(data);
};
```

### Authentication Middleware
Handles token verification and automatic refresh:

```javascript
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return createApiResponse(res, 401, { error: "Unauthorized" });

  try {
    const decoded = verifyToken(token, process.env.ACCESS_TOKEN_JWT_SECRET);
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
    if (user.rows.length === 0) return createApiResponse(res, 401, { error: "Unauthorized" });

    req.user = user.rows[0];
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      // Automatic token refresh logic
    }
    return createApiResponse(res, 401, { error: "Unauthorized" });
  }
};
```

## 🚀 Features

- ✅ JWT-based authentication
- ✅ Automatic token refresh
- ✅ Secure cookie storage
- ✅ Password hashing
- ✅ PostgreSQL integration
- ✅ CORS support
- ✅ Environment-based configuration
- ✅ Comprehensive error handling
- ✅ Session management
- ✅ Protected routes

## 🔍 Monitoring & Debugging

- Console logging for database connections
- Error logging for failed operations
- Token expiry handling with user feedback
- Database connection status monitoring

## 📝 Development Notes

- Uses ES6 modules (`"type": "module"`)
- PostgreSQL connection pooling for performance
- Short token expiry times for security
- Refresh tokens stored in database for revocation capability
- Cookie-based storage prevents token theft via XSS

## 🤝 Contributing

This is a learning project demonstrating authentication best practices. Key concepts covered:
- Secure token management
- Database integration
- Middleware patterns
- Error handling
- Security best practices</content>
<parameter name="filePath">c:\Users\User\Documents\Code\Authentication\backend\README.md