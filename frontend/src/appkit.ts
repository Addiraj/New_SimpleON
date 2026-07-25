import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { bsc, bscTestnet } from '@reown/appkit/networks';

// 1. Get projectId from https://cloud.reown.com
export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || '21fef48091f12692cad574a6f7753643';

// 2. Create a metadata object
const metadata = {
  name: 'SimpleON',
  description: 'Web3 Booster',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// 3. Create the AppKit instance
export const appKitModal = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [bsc, bscTestnet],
  metadata,
  projectId,
  features: {
    analytics: true
  }
});
