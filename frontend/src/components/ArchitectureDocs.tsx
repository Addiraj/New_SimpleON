import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, Database, Layers, ShieldCheck, Cpu, GitBranch, ArrowRight, Server, Lock, Code2, Workflow, Globe, Box, RefreshCw } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#dc2626',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#ef4444',
    lineColor: '#ef4444',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
  }
});

interface DiagramProps {
  chart: string;
  id: string;
}

const MermaidViewer: React.FC<DiagramProps> = ({ chart, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        const uniqueId = `mermaid-${id}-${Math.floor(Math.random() * 100000)}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    };
    renderDiagram();
    return () => { isMounted = false; };
  }, [chart, id]);

  return (
    <div className="w-full overflow-x-auto p-4 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner my-4 flex justify-center items-center min-h-[250px]">
      {svg ? (
        <div 
          ref={containerRef} 
          className="mermaid-svg-wrapper max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      ) : (
        <div className="flex items-center space-x-2 text-slate-400 font-mono text-xs">
          <RefreshCw className="animate-spin" size={16} />
          <span>Rendering Architecture Diagram...</span>
        </div>
      )}
    </div>
  );
};

export default function ArchitectureDocs() {
  const [activeTab, setActiveTab] = useState<'system' | 'sequence' | 'database' | 'microservices' | 'security' | 'deployment'>('system');

  // Diagrams definition
  const systemArchMermaid = `
graph TD
    subgraph ClientLayer ["Client Layer (React 19 + Vite + Tailwind + Zustand)"]
        UI["Web3 App Interface"]
        WalletModal["Wallet Modal (MetaMask/Trust)"]
        StateStore["Zustand State Store"]
        AxiosClient["Axios API Client"]
    end

    subgraph API Gateway / Express Backend ["API Gateway & Controller Layer (Express MVC)"]
        Router["Express Router (/api)"]
        AuthMiddleware["JWT Authentication Middleware"]
        AuthCtrl["Auth Controller"]
        BoosterCtrl["Booster Controller"]
        MatrixCtrl["Matrix Controller"]
    end

    subgraph ServiceLayer ["Service & Business Logic Engine"]
        AuthSvc["Auth Service (SIWE Verification)"]
        BoosterSvc["Booster Engine (3/5-Partner Tier Rules)"]
        MatrixSvc["Matrix Engine (X3/X5 Booster + Visionary Dual-Leg)"]
    end

    subgraph BlockchainLayer ["Blockchain Network (BNB Smart Chain)"]
        RPC["BSC RPC Provider (Chain ID 97 / 56)"]
        SimpleOnContract["SimpleOnBooster.sol (Smart Contract)"]
        USDTContract["Web-20 Mock USDT Token"]
    end

    subgraph StorageLayer ["Database & Persistence"]
        PrismaORM["Prisma ORM"]
        PostgresDB[("PostgreSQL Database")]
    end

    UI --> StateStore
    UI --> AxiosClient
    WalletModal --> StateStore
    AxiosClient --> Router
    Router --> AuthMiddleware
    AuthMiddleware --> AuthCtrl
    AuthMiddleware --> BoosterCtrl
    AuthMiddleware --> MatrixCtrl

    AuthCtrl --> AuthSvc
    BoosterCtrl --> BoosterSvc
    MatrixCtrl --> MatrixSvc

    BoosterSvc --> PrismaORM
    MatrixSvc --> PrismaORM
    AuthSvc --> PrismaORM
    PrismaORM --> PostgresDB

    BoosterSvc --> RPC
    RPC --> SimpleOnContract
    RPC --> USDTContract
  `;

  const authSequenceMermaid = `
sequenceDiagram
    autonumber
    actor User as Web3 User
    participant Wallet as MetaMask/Trust Wallet
    participant Frontend as React Frontend (Zustand)
    participant AuthAPI as Express Auth Controller
    participant AuthSvc as AuthService
    participant DB as PostgreSQL (Prisma)

    User->>Frontend: Click "Connect Wallet"
    Frontend->>Wallet: eth_requestAccounts
    Wallet-->>Frontend: Return Selected BSC Address
    Frontend->>AuthAPI: GET /api/auth/nonce?address=0x...
    AuthAPI->>AuthSvc: Generate SIWE Nonce
    AuthSvc->>DB: Store Nonce against Wallet
    AuthSvc-->>AuthAPI: Return Nonce string
    AuthAPI-->>Frontend: { nonce: "simpleon_nonce_xyz..." }
    Frontend->>Wallet: personal_sign(SIWE Message with Nonce)
    Wallet-->>User: Request Signature Prompt
    User->>Wallet: Confirm Signature
    Wallet-->>Frontend: Return Cryptographic Signature (0x...)
    Frontend->>AuthAPI: POST /api/auth/verify { address, signature, message }
    AuthAPI->>AuthSvc: Verify signature via ethers.verifyMessage
    AuthSvc->>DB: Validate Nonce & Upsert User Profile
    AuthSvc-->>AuthAPI: Issue JWT Token (1h expiry)
    AuthAPI-->>Frontend: Return { token, userProfile }
    Frontend->>User: Set Connected & Authenticated State
  `;

  const boosterMatrixSequenceMermaid = `
sequenceDiagram
    autonumber
    actor Partner as User Partner
    participant Contract as SimpleOnBooster.sol
    participant EventIndexer as Express Blockchain Sync Engine
    participant MatrixSvc as Matrix Service Engine
    participant DB as PostgreSQL Database

    Partner->>Contract: subscribeBooster(uint8 tierId) [Transfer USDT]
    Contract->>Contract: Validate Tier Cost & 5-Partner Matrix Capacity
    Contract-->>EventIndexer: Emit BoosterSubscribed(user, tierId, amount)
    EventIndexer->>MatrixSvc: Process New Member Subscription
    MatrixSvc->>DB: Read Upline Referral Tree
    MatrixSvc->>MatrixSvc: Calculate Auto Placement in 5-Partner Cycle
    alt Cycle Incomplete (< 5 Partners)
        MatrixSvc->>DB: Credit Direct Referral Income to Partner
    else Cycle Completed (5th Partner Joined)
        MatrixSvc->>MatrixSvc: Trigger Cycle Completion Rules
        MatrixSvc->>DB: 1st-2nd Earnings -> Wallet Ledger (Available Balance)
        MatrixSvc->>DB: 3rd Partner -> Auto Re-Topup (New Cycle)
        MatrixSvc->>DB: 4th-5th Partners -> Auto Upgrade Reserve
        alt Reserve meets Higher Tier Cost
            MatrixSvc->>Contract: Upgrade User to Next Tier (e.g., BUILDER)
            MatrixSvc->>DB: Record Tier Upgrade & Update Status
        end
    end
    MatrixSvc->>DB: On reaching Visionary, split 500 USDT into 200 USDT X3 recycling leg + 300 USDT forced 3-wide, 20-level leg
  `;

  const erDiagramMermaid = `
erDiagram
    USER ||--o{ REFERRAL : "sponsors"
    USER ||--o{ BOOSTER_SUBSCRIPTION : "purchases"
    USER ||--o{ MATRIX_POSITION : "occupies"
    USER ||--o{ LEDGER_TRANSACTION : "owns"
    
    USER {
        string id PK
        string walletAddress UK
        string referralCode UK
        string sponsorAddress FK
        datetime createdAt
    }

    BOOSTER_SUBSCRIPTION {
        string id PK
        string userId FK
        string tierName "LAUNCH|STARTER|BUILDER|LEADER|CHAMPION|VISIONARY"
        float costUSDT
        int cycleNumber
        int activePartnersCount "0 to 5"
        boolean isUpgraded
        datetime createdAt
    }

    MATRIX_POSITION {
        string id PK
        string userId FK
        string matrixType "X3|X5|HYBRID"
        int level "1 to 20 (Visionary Part 2 only)"
        string parentPositionId FK
        datetime placedAt
    }

    LEDGER_TRANSACTION {
        string id PK
        string userId FK
        string type "DIRECT|X5_BONUS|RE_TOPUP|AUTO_UPGRADE|MATRIX_LEVEL"
        float amountUSDT
        string txHash
        string status "PENDING|COMPLETED|FAILED"
        datetime timestamp
    }
  `;

  return (
    <div id="architecture-docs-wrapper" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Title & Header */}
      <div id="arch-header" className="mb-8 border-b border-border-theme pb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red">
            <Layers size={24} />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-accent-red font-bold">
              Engineering Blueprint
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-prime">
              SimpleOn Architecture Specification
            </h1>
          </div>
        </div>
        <p className="text-sm text-sub max-w-3xl mt-1">
          Complete end-to-end technical documentation for the SimpleOn Web3 Booster Plan and Matrix Engine, covering system design, database schemas, sequence diagrams, microservices, and security controls.
        </p>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'system' 
                ? 'bg-accent-red text-white shadow-md' 
                : 'bg-surface-elevated text-sub hover:text-prime border border-border-theme'
            }`}
          >
            <Network size={16} />
            <span>System & Web3 Flow</span>
          </button>

          <button
            onClick={() => setActiveTab('sequence')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'sequence' 
                ? 'bg-accent-red text-white shadow-md' 
                : 'bg-surface-elevated text-sub hover:text-prime border border-border-theme'
            }`}
          >
            <Workflow size={16} />
            <span>Sequence Diagrams</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'database' 
                ? 'bg-accent-red text-white shadow-md' 
                : 'bg-surface-elevated text-sub hover:text-prime border border-border-theme'
            }`}
          >
            <Database size={16} />
            <span>Database & ERD</span>
          </button>

          <button
            onClick={() => setActiveTab('microservices')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'microservices' 
                ? 'bg-accent-red text-white shadow-md' 
                : 'bg-surface-elevated text-sub hover:text-prime border border-border-theme'
            }`}
          >
            <Server size={16} />
            <span>Microservices & Structure</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'security' 
                ? 'bg-accent-red text-white shadow-md' 
                : 'bg-surface-elevated text-sub hover:text-prime border border-border-theme'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Security Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('deployment')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'deployment' 
                ? 'bg-accent-red text-white shadow-md' 
                : 'bg-surface-elevated text-sub hover:text-prime border border-border-theme'
            }`}
          >
            <Globe size={16} />
            <span>Deployment Architecture</span>
          </button>
        </div>
      </div>

      {/* Tab 1: System & Web3 Architecture */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h2 className="text-xl font-bold text-prime flex items-center space-x-2 mb-3">
              <Network className="text-accent-red" size={20} />
              <span>Full System Architecture Diagram</span>
            </h2>
            <p className="text-xs text-sub mb-4">
              High-level component interaction graph showing React frontend state management, Express MVC backend services, Prisma ORM PostgreSQL storage, and BNB Smart Chain smart contracts.
            </p>
            <MermaidViewer chart={systemArchMermaid} id="system-arch" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-surface border border-border-theme">
              <h3 className="text-base font-bold text-prime mb-2 flex items-center space-x-2">
                <Box className="text-accent-red" size={18} />
                <span>Frontend Architecture (Client)</span>
              </h3>
              <ul className="space-y-2 text-xs text-sub leading-relaxed list-disc list-inside">
                <li><strong className="text-prime">Framework:</strong> React 19 + Vite + Tailwind CSS for zero-latency execution.</li>
                <li><strong className="text-prime">State Store:</strong> Zustand (<code className="font-mono text-accent-red">useWeb3Store.ts</code>) managing wallet connection, SIWE tokens, and live calculations.</li>
                <li><strong className="text-prime">Web3 Client:</strong> Ethers.js v6 for BSC provider interaction and SIWE message signing.</li>
                <li><strong className="text-prime">API Layer:</strong> Centralized Axios instance with JWT auth bearer interceptors.</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border-theme">
              <h3 className="text-base font-bold text-prime mb-2 flex items-center space-x-2">
                <Server className="text-accent-red" size={18} />
                <span>Backend Architecture (Server)</span>
              </h3>
              <ul className="space-y-2 text-xs text-sub leading-relaxed list-disc list-inside">
                <li><strong className="text-prime">Runtime:</strong> Node.js + Express TypeScript MVC framework.</li>
                <li><strong className="text-prime">Controllers:</strong> Modular request handlers (<code className="font-mono text-accent-red">auth</code>, <code className="font-mono text-accent-red">booster</code>, <code className="font-mono text-accent-red">matrix</code>, <code className="font-mono text-accent-red">stats</code>).</li>
                <li><strong className="text-prime">Services:</strong> Pure business logic services (<code className="font-mono text-accent-red">AuthService</code>, <code className="font-mono text-accent-red">BoosterService</code>, <code className="font-mono text-accent-red">MatrixService</code>).</li>
                <li><strong className="text-prime">Middleware:</strong> EIP-4361 JWT token validator and global centralized error handling middleware.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sequence Diagrams */}
      {activeTab === 'sequence' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h2 className="text-xl font-bold text-prime flex items-center space-x-2 mb-3">
              <Lock className="text-accent-red" size={20} />
              <span>1. Sign-In With Ethereum (SIWE) Flow</span>
            </h2>
            <p className="text-xs text-sub mb-4">
              Cryptographic authentication flow avoiding traditional password databases while granting secure JWT session tokens verified via EIP-191 personal signatures.
            </p>
            <MermaidViewer chart={authSequenceMermaid} id="siwe-flow" />
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h2 className="text-xl font-bold text-prime flex items-center space-x-2 mb-3">
              <GitBranch className="text-accent-red" size={20} />
              <span>2. Booster Plan Subscription & Auto Upgrade Flow</span>
            </h2>
            <p className="text-xs text-sub mb-4">
              Detailed step-by-step sequence of 5-partner cycle completion, auto re-topup reserves, and automatic tier upgrades to Builder, Leader, and Champion.
            </p>
            <MermaidViewer chart={boosterMatrixSequenceMermaid} id="booster-flow" />
          </div>
        </div>
      )}

      {/* Tab 3: Database & ERD */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h2 className="text-xl font-bold text-prime flex items-center space-x-2 mb-3">
              <Database className="text-accent-red" size={20} />
              <span>Entity Relationship Diagram (ERD)</span>
            </h2>
            <p className="text-xs text-sub mb-4">
              Normalized PostgreSQL database schema managed via Prisma ORM for tracking Web3 users, referral trees, booster tiers, matrix nodes, and wallet ledger logs.
            </p>
            <MermaidViewer chart={erDiagramMermaid} id="er-diagram" />
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h3 className="text-base font-bold text-prime mb-3">Core Schema Definitions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs text-sub">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-accent-red font-bold">User Table</span>
                <p className="mt-1 text-slate-300">id, walletAddress (Unique), nonce, sponsorAddress, referralCode, createdAt</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-accent-red font-bold">BoosterSubscription Table</span>
                <p className="mt-1 text-slate-300">id, userId, tierName (LAUNCH|STARTER|BUILDER...|VISIONARY), costUSDT, activePartners, isUpgraded</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-accent-red font-bold">MatrixPosition Table</span>
                <p className="mt-1 text-slate-300">id, userId, matrixType (X3|X5|HYBRID), level (1-20), parentPositionId</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-accent-red font-bold">LedgerTransaction Table</span>
                <p className="mt-1 text-slate-300">id, userId, type (DIRECT|RE_TOPUP|LEVEL_BONUS), amountUSDT, txHash, status</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Microservices & Folder Structure */}
      {activeTab === 'microservices' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h2 className="text-xl font-bold text-prime flex items-center space-x-2 mb-3">
              <Server className="text-accent-red" size={20} />
              <span>Recommended Microservices Decomposition</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-xs font-mono font-bold text-accent-red uppercase">Service 1</span>
                <h4 className="text-sm font-bold text-prime mt-1">Auth & User Service</h4>
                <p className="text-xs text-sub mt-2 leading-relaxed">Handles SIWE authentication, wallet verification, nonce generation, and referral code assignment.</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-xs font-mono font-bold text-accent-red uppercase">Service 2</span>
                <h4 className="text-sm font-bold text-prime mt-1">Booster & Upgrade Engine</h4>
                <p className="text-xs text-sub mt-2 leading-relaxed">Computes 3- and 5-partner tier subscriptions, auto re-topup reserves, and automatic tier upgrades through Visionary.</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-xs font-mono font-bold text-accent-red uppercase">Service 3</span>
                <h4 className="text-sm font-bold text-prime mt-1">Matrix Placement Engine</h4>
                <p className="text-xs text-sub mt-2 leading-relaxed">Executes X3/X5 booster matrix placements and Visionary's dual-leg matrix logic (X3 recycling + forced 3-wide, 20-level).</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-xs font-mono font-bold text-accent-red uppercase">Service 4</span>
                <h4 className="text-sm font-bold text-prime mt-1">Blockchain Event Indexer</h4>
                <p className="text-xs text-sub mt-2 leading-relaxed">Listens to BNB Smart Chain contract events (<code className="font-mono">BoosterSubscribed</code>) and synchronizes off-chain state.</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h3 className="text-base font-bold text-prime mb-3 flex items-center space-x-2">
              <Code2 className="text-accent-red" size={18} />
              <span>Production Repository Layout</span>
            </h3>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800">
{`├── contracts/                  # OpenZeppelin Smart Contracts
│   ├── SimpleOnBooster.sol      # Main Booster & Matrix Smart Contract
│   └── MockUSDT.sol             # Web-20 USDT Token Contract
├── hardhat.config.js            # Hardhat BSC Network Config
├── prisma/                      # Database Schema & Migrations
│   └── schema.prisma            # PostgreSQL Schema
├── server/                      # Express MVC Backend
│   ├── config/                  # Chain & Environment Setup
│   ├── controllers/             # Auth, Booster, Matrix & Stats Handlers
│   ├── middlewares/             # Auth JWT & Error Middleware
│   ├── services/                # Business Logic Services
│   └── utils/                   # Logger & Helpers
├── src/                         # React 19 Frontend
│   ├── components/              # Interactive UI Views & Components
│   ├── services/                # Axios API Client
│   └── store/                   # Zustand Web3 Store
└── server.ts                    # Express + Vite Entrypoint`}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 5: Security Architecture */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h2 className="text-xl font-bold text-prime flex items-center space-x-2 mb-3">
              <ShieldCheck className="text-accent-red" size={20} />
              <span>Security Controls & Smart Contract Protection</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <h4 className="text-sm font-bold text-prime flex items-center space-x-2">
                  <Lock className="text-accent-red" size={16} />
                  <span>Smart Contract Security</span>
                </h4>
                <ul className="mt-2 space-y-2 text-xs text-sub list-disc list-inside">
                  <li><strong>Reentrancy Guard:</strong> Inherits OpenZeppelin <code className="font-mono text-accent-red">ReentrancyGuard</code> on all deposit and payout functions.</li>
                  <li><strong>SafeERC20:</strong> Enforces safe Web-20 USDT token transfers avoiding partial transfer vulnerabilities.</li>
                  <li><strong>Access Controls:</strong> <code className="font-mono text-accent-red">Ownable</code> role controls for contract parameters and pause toggles.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <h4 className="text-sm font-bold text-prime flex items-center space-x-2">
                  <ShieldCheck className="text-accent-red" size={16} />
                  <span>API & Off-Chain Security</span>
                </h4>
                <ul className="mt-2 space-y-2 text-xs text-sub list-disc list-inside">
                  <li><strong>SIWE Verification:</strong> Single-use cryptographically random nonces prevent replay attacks.</li>
                  <li><strong>JWT Signatures:</strong> Signed with HS256 algorithm and strictly validated expiration windows.</li>
                  <li><strong>Input Sanitization:</strong> Strict address checksum validation using Ethers.js <code className="font-mono text-accent-red">isAddress()</code>.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Deployment Architecture */}
      {activeTab === 'deployment' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface border border-border-theme">
            <h2 className="text-xl font-bold text-prime flex items-center space-x-2 mb-3">
              <Globe className="text-accent-red" size={20} />
              <span>Production Deployment Topology</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-xs font-mono font-bold text-accent-red uppercase">Layer 1</span>
                <h4 className="text-sm font-bold text-prime mt-1">Smart Contracts</h4>
                <p className="text-xs text-sub mt-2 leading-relaxed">Deployed on BSC Mainnet (Chain ID 56) with verified source code on BscScan.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-xs font-mono font-bold text-accent-red uppercase">Layer 2</span>
                <h4 className="text-sm font-bold text-prime mt-1">Application Container</h4>
                <p className="text-xs text-sub mt-2 leading-relaxed">Dockerized Express + Vite app running on Cloud Run on Port 3000 behind reverse proxy.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-border-theme">
                <span className="text-xs font-mono font-bold text-accent-red uppercase">Layer 3</span>
                <h4 className="text-sm font-bold text-prime mt-1">Database Cluster</h4>
                <p className="text-xs text-sub mt-2 leading-relaxed">Managed PostgreSQL cluster with SSL connections, automated backups, and read replicas.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
