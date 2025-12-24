const { NODE_ENV } = process.env;

/**
 * Port to run the server on.
 */
export const PORT = process.env.PORT || 4000;

/**
 * Host to run the server on.
 */
export const HOST = process.env.HOST || "0.0.0.0";

/**
 * Database connection URL.
 */
export const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Allowed origins for CORS.
 */
export const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS;

/**
 * Whether the current environment is development.
 */
export const isDevEnv = NODE_ENV === "development";

/**
 * Whether the current environment is production.
 */
export const isProdEnv = NODE_ENV === "production";
