import alchemy from "../alchemy/src";

export const CLOUDFLARE_EMAIL = await alchemy.env.CLOUDFLARE_EMAIL;

export const CLOUDFLARE_ACCOUNT_ID = await alchemy.env.CLOUDFLARE_ACCOUNT_ID;

export const CLOUDFLARE_API_KEY = await alchemy.secret.env.CLOUDFLARE_API_KEY;

export const STRIPE_API_KEY = await alchemy.secret.env.STRIPE_API_KEY;

export const OPENAI_API_KEY = await alchemy.secret.env.OPENAI_API_KEY;

export const NEON_API_KEY = await alchemy.secret.env.NEON_API_KEY;
