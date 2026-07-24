import { env } from './env.js';

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  
  chains: {
    bscTestnet: {
      chainId: 97,
      name: 'BNB Smart Chain Testnet',
      rpcUrl: env.BSC_TESTNET_RPC,
      explorerUrl: 'https://testnet.bscscan.com',
      symbol: 'tBNB',
    },
    bscMainnet: {
      chainId: 56,
      name: 'BNB Smart Chain Mainnet',
      rpcUrl: env.BSC_MAINNET_RPC,
      explorerUrl: 'https://bscscan.com',
      symbol: 'BNB',
    },
  },
  
  contracts: {
    boosterAddress: env.SIMPLEON_BOOSTER_ADDRESS,
    usdtAddress: env.MOCK_USDT_ADDRESS,
  },
  
  boosterMultipliers: {
    starter: 1,    // 1x Base Plan
    builder: 4,    // 4x Base Plan
    leader: 16,   // 16x Base Plan
    champion: 64,  // 64x Base Plan
    mainPlan: 100, // 100x Base Plan
  }
};
