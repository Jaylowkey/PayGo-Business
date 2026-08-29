import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  PAYGO_API_BASE_URL: z.string().url().optional(),
  NETSHOP_API_URL: z.string().url().optional(),
  NETSHOP_API_KEY: z.string().optional(),
  NETSHOP_WALLET_ID: z.string().optional(),
  NETSHOP_WEBHOOK_SECRET: z.string().optional(),
  DIDIT_API_KEY: z.string().optional(),
  DIDIT_KYC_WORKFLOW_ID: z.string().optional(),
  DIDIT_KYB_WORKFLOW_ID: z.string().optional(),
  DIDIT_WEBHOOK_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  PAYGO_API_BASE_URL: process.env.PAYGO_API_BASE_URL,
  NETSHOP_API_URL: process.env.NETSHOP_API_URL,
  NETSHOP_API_KEY: process.env.NETSHOP_API_KEY,
  NETSHOP_WALLET_ID: process.env.NETSHOP_WALLET_ID,
  NETSHOP_WEBHOOK_SECRET: process.env.NETSHOP_WEBHOOK_SECRET,
  DIDIT_API_KEY: process.env.DIDIT_API_KEY,
  DIDIT_KYC_WORKFLOW_ID: process.env.DIDIT_KYC_WORKFLOW_ID,
  DIDIT_KYB_WORKFLOW_ID: process.env.DIDIT_KYB_WORKFLOW_ID,
  DIDIT_WEBHOOK_SECRET: process.env.DIDIT_WEBHOOK_SECRET,
});

export function requireNetShopConfig() {
  if (!env.NETSHOP_API_URL || !env.NETSHOP_API_KEY || !env.NETSHOP_WALLET_ID) {
    throw new Error("NETSHOP_CONFIGURATION_INCOMPLETE");
  }
  return {
    baseUrl: env.NETSHOP_API_URL.replace(/\/$/, ""),
    apiKey: env.NETSHOP_API_KEY,
    walletId: env.NETSHOP_WALLET_ID,
  };
}

export function requireNetShopWebhookSecret() {
  if (!env.NETSHOP_WEBHOOK_SECRET) throw new Error("NETSHOP_WEBHOOK_SECRET_MISSING");
  return env.NETSHOP_WEBHOOK_SECRET;
}
