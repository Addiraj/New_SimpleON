import { useEffect } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useWeb3Store } from '../store/useWeb3Store';
import { ethers } from 'ethers';

export default function AppKitSync() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');

  // Reset the prompt flag if the wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      useWeb3Store.getState().setHasPromptedSiwe(false);
    }
  }, [isConnected]);

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
      
      if (isConnected && address && browserProvider && !state.isAuthenticated && !state.isConnecting && !state.hasPromptedSiwe) {
        // Mark as prompted to prevent infinite signature popups if user cancels
        state.setHasPromptedSiwe(true);
        
        // Wait briefly to see if initAuth (which checks localStorage on app load) restores the session.
        // If not restored, then pop up the wallet signature request exactly ONCE.
        setTimeout(async () => {
          const freshState = useWeb3Store.getState();
          if (!freshState.isAuthenticated && !freshState.isConnecting) {
            await freshState.signSiweAndLogin();
          }
        }, 1000);
      }
    };
    
    syncState();
  }, [address, isConnected, walletProvider]);

  return null;
}
