import express from "express";

import bycrypt from "bcrypt";

import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";
import { generateToken } from "../utils/jwtUtils.js";
import { createApiResponse } from "../utils/apiUtils.js";

const authRouter = express.Router();

// Cookie configuration for secure token storage
const cookiesOptions = {
  httpOnly: true, // Prevents JavaScript access to cookies
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "strict", // CSRF protection
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
};

// POST /api/auth/register - User registration endpoint
authRouter.post("/register", async (req, res) => {
  // Extract user registration data from request body
  const { name, email, password } = req.body;

  // Validate that all required fields are provided
  if (!name || !email || !password) {
    return createApiResponse(res, 400, { error: "All fields are required" });
  }

  try {
    // Check if user with this email already exists
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    // If user exists, return error
    if (userExists.rows.length > 0) {
      return createApiResponse(res, 400, { error: "User already exists" });
    }

    // Hash the password for secure storage
    const hashedPassword = await bycrypt.hash(password, 10);

    // Insert new user into database and return the created user data
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashedPassword],
    );

    // Generate access token for immediate authentication
    const accessToken = generateToken(
      { id: newUser.rows[0].id },
      process.env.ACCESS_TOKEN_JWT_SECRET,
      process.env.ACCESS_TOKEN_JWT_EXPIRY,
    );

    // Generate refresh token for long-term session management
    const refreshToken = generateToken(
      { id: newUser.rows[0].id },
      process.env.REFRESH_TOKEN_JWT_SECRET,
      process.env.REFRESH_TOKEN_JWT_EXPIRY,
    );

    // Store refresh token in database for future token refresh
    await pool.query("UPDATE users SET refresh_token=$1 WHERE id=$2", [
      refreshToken,
      newUser.rows[0].id,
    ]);

    // Set access token as HttpOnly cookie
    res.cookie("token", accessToken, cookiesOptions);

    // Return success response
    return createApiResponse(res, 201, {
      message: "User registered successfully",
    });
  } catch (err) {
    // Handle any database or server errors
    return createApiResponse(res, 500, { error: "Internal server error" });
  }
});

// POST /api/auth/login - User login endpoint
authRouter.post("/login", async (req, res) => {
  // Extract login credentials from request body
  const { email, password } = req.body;

  // Validate that email and password are provided
  if (!email || !password) {
    return createApiResponse(res, 400, { error: "All fields are required" });
  }

  try {
    // Find user by email in database
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    // If user doesn't exist, return invalid credentials error
    if (user.rows.length === 0) {
      return createApiResponse(res, 400, { error: "Invalid credentials" });
    }

    // Compare provided password with stored hashed password
    const validPassword = await bycrypt.compare(
      password,
      user.rows[0].password,
    );

    // If password is invalid, return error
    if (!validPassword) {
      return createApiResponse(res, 400, { error: "Invalid credentials" });
    }

    // Generate new access token for the session
    const accessToken = generateToken(
      { id: user.rows[0].id },
      process.env.ACCESS_TOKEN_JWT_SECRET,
      process.env.ACCESS_TOKEN_JWT_EXPIRY,
    );

    // Generate new refresh token
    const refreshToken = generateToken(
      { id: user.rows[0].id },
      process.env.REFRESH_TOKEN_JWT_SECRET,
      process.env.REFRESH_TOKEN_JWT_EXPIRY,
    );

    // Update refresh token in database
    await pool.query("UPDATE users SET refresh_token=$1 WHERE id=$2", [
      refreshToken,
      user.rows[0].id,
    ]);

    // Set access token as HttpOnly cookie
    res.cookie("token", accessToken, cookiesOptions);

    // Return success response
    return createApiResponse(res, 200, {
      message: "User logged in successfully",
    });
  } catch (err) {
    // Handle any database or server errors
    return createApiResponse(res, 500, { error: "Internal server error" });
  }
});

// GET /api/auth/me - Get current user information (protected route)
authRouter.get("/me", authMiddleware, async (req, res) => {
  // authMiddleware has already verified the token and attached user data to req.user
  // Return user information and current token
  return createApiResponse(res, 200, {
    user: req.user,
    token: req.cookies.token,
  });
});

// POST /api/auth/logout - User logout endpoint (protected route)
authRouter.post("/logout", authMiddleware, async (req, res) => {
  try {
    // Clear refresh token from database to invalidate the session
    await pool.query("UPDATE users SET refresh_token=$1 WHERE id=$2", [
      null,
      req.user.id,
    ]);

    // Clear the access token cookie by setting maxAge to 1 (immediate expiration)
    res.clearCookie("token", { ...cookiesOptions, maxAge: 1 });

    // Return success response
    return createApiResponse(res, 200, {
      message: "User logged out successfully",
    });
  } catch (error) {
    // Handle any database errors during logout
    return createApiResponse(res, 501, { message: "Something went wrong" });
  }
});

export default authRouter;
