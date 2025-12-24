/**
 * Environment variables.
 */
export const {
  NODE_ENV,
  PORT = 4000,
  HOST = "0.0.0.0",
  DATABASE_URL,
  AUTH_BASE_URL,
  CORS_ALLOWED_ORIGINS,
  PROTECT_ROUTES,
  AUTH_DEBUG,
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET,
} = process.env;

export const isDevEnv = NODE_ENV === "development",
  isProdEnv = NODE_ENV === "production",
  protectRoutes = isProdEnv || PROTECT_ROUTES === "true";
