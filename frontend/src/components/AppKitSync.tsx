import { useEffect } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useWeb3Store } from '../store/useWeb3Store';
import { ethers } from 'ethers';

export default function AppKitSync() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');

  useEffect(() => {
    const syncState = async () => {
      let browserProvider = null;
      if (walletProvider) {
        browserProvider = new ethers.BrowserProvider(walletProvider as any);
      }
      
      useWeb3Store.setState({ 
        address: address ? address.toLowerCase() : null, 
        isConnected: !!isConnected,
        provider: browserProvider
      });

      // Trigger SIWE login if connected but not authenticated
      const state = useWeb3Store.getState();
      if (isConnected && address && browserProvider && !state.isAuthenticated && !state.isConnecting) {
        await state.signSiweAndLogin();
      }
    };
    
    syncState();
  }, [address, isConnected, walletProvider]);

  return null;
}
