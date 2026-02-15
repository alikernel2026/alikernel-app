// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { cloudflareAdapter } from "better-auth/adapters/cloudflare";

export const auth = betterAuth({
    database: cloudflareAdapter({
        // سيتم الربط بـ D1 في الخطوات القادمة
    }),
    socialProviders: {
        google: {
            clientId: "617149480177-aimcujc67q4307sk43li5m6pr54vj1jv.apps.googleusercontent.com",
            // هكذا نقوم بإخفاء السر عن جيتهاب وجعله يقرأ من "البيئة"
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
});