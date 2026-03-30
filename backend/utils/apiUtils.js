// Utility function to create standardized API responses
// Handles automatic cookie setting for new access tokens when present
export const createApiResponse = (res, statusCode, data) => {
  // Check if a new access token was set in the response headers
  // This is used by the auth middleware when refreshing expired tokens
  if (res.getHeader("x-new-access-token")) {
    // Set the new access token as an HttpOnly cookie for security
    // HttpOnly prevents JavaScript access, secure flag for HTTPS in production
    res.cookie("token", res.getHeader("x-new-access-token"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }
  // Return the response with the specified status code and JSON data
  return res.status(statusCode).json(data);
};
