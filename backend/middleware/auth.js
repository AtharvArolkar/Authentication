import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { generateToken, verifyToken } from "../utils/jwtUtils.js";
import { createApiResponse } from "../utils/apiUtils.js";

// Cookie options for secure token storage
const cookiesOptions = {
  httpOnly: true, // Prevents JavaScript access to cookies
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "strict", // CSRF protection
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
};

// Authentication middleware to verify JWT tokens and handle token refresh
const authMiddleware = async (req, res, next) => {
  // Extract access token from HttpOnly cookie
  const token = req.cookies.token;

  // If no token is present, return unauthorized error
  if (!token) {
    return createApiResponse(res, 401, { error: "Unauthorized" });
  }

  try {
    // Verify the access token with the secret
    const decoded = verifyToken(token, process.env.ACCESS_TOKEN_JWT_SECRET);

    // Fetch user data from database using the decoded user ID
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [
      decoded.id,
    ]);

    // If user doesn't exist in database, return unauthorized
    if (user.rows.length === 0) {
      return createApiResponse(res, 401, { error: "Unauthorized" });
    }

    // Attach user data to request object for use in protected routes
    req.user = user.rows[0];

    // Continue to the next middleware/route handler
    next();
  } catch (err) {
    // Handle token verification errors
    if (err.name === "TokenExpiredError") {
      try {
        // Decode the expired token without verification to extract user ID
        const decoded = jwt.decode(token);

        // Fetch user data using the extracted ID
        const user = await pool.query("SELECT * FROM users WHERE id=$1", [
          decoded.id,
        ]);

        // If user doesn't exist, return unauthorized
        if (user.rows.length === 0) {
          return createApiResponse(res, 401, { error: "Unauthorized" });
        }

        // Check if user has a refresh token stored
        if (user.rows[0].refresh_token) {
          // Optional: Uncomment below to rotate refresh tokens on each access token refresh
          // This provides additional security but requires updating the database
          // const refreshDecoded = verifyToken(
          //   user.rows[0].refresh_token,
          //   process.env.REFRESH_TOKEN_JWT_SECRET,
          // );

          // Verify the refresh token is still valid
          verifyToken(
            user.rows[0].refresh_token,
            process.env.REFRESH_TOKEN_JWT_SECRET,
          );

          // Generate a new access token for the user
          const newAccessToken = generateToken(
            { id: user.rows[0].id },
            process.env.ACCESS_TOKEN_JWT_SECRET,
            process.env.ACCESS_TOKEN_JWT_EXPIRY,
          );

          // Set the new token in response header for createApiResponse to handle
          res.setHeader("x-new-access-token", newAccessToken);

          // Attach user data to request and continue to protected route
          req.user = user.rows[0];
          return next();
        }
      } catch (error) {
        // Handle refresh token errors (expired, invalid, etc.)
        if (error.name === "TokenExpiredError") {
          // Decode expired token to get user ID for cleanup
          const decoded = jwt.decode(token);

          // Clear the refresh token from database (force re-login)
          await pool.query("UPDATE users SET refresh_token=$1 WHERE id=$2", [
            null,
            decoded.id,
          ]);

          // Clear the access token cookie and redirect to login
          return res
            .clearCookie("token", { ...cookiesOptions, maxAge: 1 })
            .redirect(
              `${process.env.CLIENT_URL}/login?message=Session expired, please log in again`,
            );
        }
        // Return unauthorized for other refresh token errors
        return createApiResponse(res, 401, { error: "Unauthorized" });
      }
    }
    // Return unauthorized for other token verification errors
    return createApiResponse(res, 401, { error: "Unauthorized" });
  }
};

export default authMiddleware;
