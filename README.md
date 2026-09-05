# SimpleOn Web3 Booster Plan Platform

SimpleOn is a enterprise-grade Web3 Booster Plan and Matrix Income Platform built on BNB Smart Chain. It features a 6-tier Booster ladder (Launch, Starter, Builder, Leader, Champion, Visionary) that auto-cycles through X3/X5 matrices with automatic re-topup, culminating in Visionary's hybrid structure — an uncapped X3 pool plus a 20-level 3×3 matrix.

---

## Architecture Overview & Folder Structure

The repository follows clean MVC (Model-View-Controller) architecture, SOLID software design principles, and strict separation of concerns across Web3 frontend, backend API, smart contracts, and database schema:

```
├── contracts/
│   ├── SimpleOnBooster.sol          # Production OpenZeppelin Solidity smart contract
│   └── MockUSDT.sol                 # Testnet Web-20 Tether USD token contract
├── hardhat.config.js                # Hardhat network configuration (BNB Testnet 97 / Mainnet 56)
├── prisma/
│   ├── schema.prisma                # Enterprise PostgreSQL Prisma ORM schema
│   └── migrations/
│       └── 20260722_init/
│           └── migration.sql        # Migration SQL file
├── server/                           # Express.js Backend MVC Architecture
│   ├── config/                      # Environment & chain configuration
│   ├── controllers/                 # Express route request handlers
│   │   ├── auth.controller.ts       # SIWE Nonce & Signature verification
│   │   ├── booster.controller.ts    # Booster math & tier upgrades
│   │   ├── contract.controller.ts   # Contract address & ABI info
│   │   ├── matrix.controller.ts     # Matrix cycle summary, tree & position queries
│   │   ├── stats.controller.ts      # Global stats & network counters
│   │   └── user.controller.ts       # Web3 Profile & referral links
│   ├── middlewares/                 # Auth JWT, validation & Error Handling
│   │   ├── authMiddleware.ts
│   │   └── errorHandler.ts
│   ├── routes/                      # API Route Definitions
│   ├── services/                    # Reusable Business Logic Services
│   │   ├── AuthService.ts
│   │   ├── BoosterService.ts
│   │   ├── MatrixService.ts
│   │   └── UserService.ts
│   └── utils/                       # System Logger & Helpers
├── src/                             # React 19 + Vite Web3 Frontend
│   ├── components/
│   │   ├── ApiDocs.tsx              # Interactive REST API console
│   │   ├── ContractDocs.tsx         # Smart contract inspector & ABI viewer
│   │   ├── Dashboard.tsx            # Live Web3 User Dashboard
│   │   ├── MatrixVisualizer.tsx     # Visionary hybrid X3 + 3x3 matrix visualizer
│   │   ├── Navbar.tsx               # Web3 Wallet button & Navigation
│   │   ├── Plans.tsx                # Booster tiers and plan activation UI
│   │   └── WalletModal.tsx          # MetaMask, WalletConnect, Trust Wallet modal
│   ├── services/
│   │   └── api.ts                   # Centralized Axios client with JWT interceptor
│   ├── store/
│   │   └── useWeb3Store.ts          # Zustand Web3 state store
│   └── types/                       # TypeScript interfaces
├── postman_collection.json          # Complete Postman API collection
├── server.ts                        # Express server entry point with Vite middleware
└── package.json
```

---

## Key Technical Features

### 1. Smart Contracts
- **`SimpleOnBooster.sol`**: Implements 4 Booster Tiers (`STARTER`, `BUILDER`, `LEADER`, `CHAMPION`) and 100x `MAIN_PLAN`. Includes OpenZeppelin `ReentrancyGuard`, `Ownable`, and `SafeERC20`.
- **`MockUSDT.sol`**: Web-20 testnet stablecoin contract for deposit and payout testing.

### 2. Web3 Wallet Authentication (SIWE)
- Cryptographic **Sign-In With Ethereum (EIP-4361 / EIP-191)** nonce-challenge authentication flow using `ethers.verifyMessage`.
- Returns JWT session token for authenticated REST requests without gas fees or password requirements.

### 3. Backend MVC Services
- **`AuthService`**: Manages Web3 wallet nonces and verifies cryptographic signatures.
- **`BoosterService`**: Calculates exact 5-partner tier collections, re-subscriptions, auto-upgrades, and net earnings.
- **`MatrixCycleService` / `MatrixPlacementService` / `MatrixCompletionService`**: Manage X3/X5 Booster matrix cycle placement, completion, and automatic re-topup.

---

## Getting Started

### Environment Variables setup
Copy `.env.example` to `.env` and fill in necessary keys:
```bash
cp .env.example .env
```

### Installation
```bash
npm install
```

### Development Server
Run the full-stack Express server with integrated Vite dev middleware:
```bash
npm run dev
```

### Build & Production Output
```bash
npm run build
npm start
```
