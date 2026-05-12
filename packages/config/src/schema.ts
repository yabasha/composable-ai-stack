import { z } from "zod";

export type Mode = "development" | "test" | "production";

const optionalUrl = z.string().url().optional();
const optionalStr = z.string().optional();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    STRIPE_SECRET_KEY: optionalStr,
    STRIPE_WEBHOOK_SECRET: optionalStr,
    CONVEX_DEPLOYMENT: optionalStr,
    NEXT_PUBLIC_CONVEX_URL: optionalUrl,
    NEXT_PUBLIC_APP_URL: optionalUrl,
    API_BEARER_TOKEN: z.string().min(32).optional(),

    WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    const requiredInProd: Array<keyof typeof env> = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "CONVEX_DEPLOYMENT",
      "NEXT_PUBLIC_CONVEX_URL",
      "NEXT_PUBLIC_APP_URL",
      "API_BEARER_TOKEN"
    ];
    for (const key of requiredInProd) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Required when NODE_ENV=production`
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, unknown>, mode: Mode | string): Env {
  const candidate = { ...input, NODE_ENV: mode };
  const result = envSchema.safeParse(candidate);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${detail}`);
  }
  return result.data;
}
