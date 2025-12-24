/**
 * Environment variables.
 */
export const { NODE_ENV, PORT = 4000, CORS_ALLOWED_ORIGINS } = process.env;

export const isDevEnv = NODE_ENV === "development";
