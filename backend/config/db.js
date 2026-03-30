import { config } from "dotenv";
import { Pool } from "pg";

// Load environment variables from .env file
config();

// Create a PostgreSQL connection pool for efficient database connections
// Connection pooling allows multiple concurrent database operations
const pool = new Pool({
  host: process.env.DB_HOST, // Database server hostname
  port: process.env.DB_PORT, // Database server port
  user: process.env.DB_USER, // Database username
  password: process.env.DB_PASSWORD, // Database password
  database: process.env.DB_NAME, // Database name
});

// Test the database connection on startup
pool.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Connected to the database successfully");
  }
});

export default pool;
