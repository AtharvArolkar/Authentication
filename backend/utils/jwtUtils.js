import jwt from "jsonwebtoken";

// Generate a JWT token with the provided payload, secret, and expiration time
export const generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};

// Verify and decode a JWT token using the provided secret
// Throws an error if token is invalid or expired
export const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};
