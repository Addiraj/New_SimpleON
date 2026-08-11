import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(8).default('simpleon_production_jwt_secret_key_99887766'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BSC_TESTNET_RPC: z.string().default('https://data-seed-prebsc-1-s1.binance.org:8545/'),
  BSC_MAINNET_RPC: z.string().default('https://bsc-dataseed.binance.org/'),
  BSC_TESTNET_WSS: z.string().default('wss://bsc-testnet-rpc.publicnode.com'),
  BSC_MAINNET_WSS: z.string().default('wss://bsc-rpc.publicnode.com'),
  SIMPLEON_BOOSTER_ADDRESS: z.string().default('0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5'),
  MOCK_USDT_ADDRESS: z.string().default('0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'),
  MOCK_PAYMENT_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .or(z.boolean())
    .default(true),
  APP_PUBLIC_URL: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
