import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  PAYGO_API_BASE_URL: z.string().url().optional(),
  NETSHOP_API_URL: z.string().url().optional(),
  NETSHOP_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  PAYGO_API_BASE_URL: process.env.PAYGO_API_BASE_URL,
  NETSHOP_API_URL: process.env.NETSHOP_API_URL,
  NETSHOP_API_KEY: process.env.NETSHOP_API_KEY,
});
