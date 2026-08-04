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
      
      const state = useWeb3Store.getState();
      const connectedAddr = address ? address.toLowerCase() : null;
      
      // If the authenticated user does not match the currently connected wallet, log them out
      if (state.isAuthenticated && connectedAddr && state.userProfile) {
        const authAddr = (state.userProfile as any).walletAddress || (state.userProfile as any).address;
        if (authAddr && authAddr.toLowerCase() !== connectedAddr) {
          localStorage.removeItem('simpleon_web3_jwt');
          localStorage.removeItem('simpleon_web3_refresh_token');
          useWeb3Store.setState({ isAuthenticated: false, jwtToken: null, userProfile: null, hasPromptedSiwe: false });
        }
      }

      useWeb3Store.setState({ 
        address: connectedAddr, 
        isConnected: !!isConnected,
        provider: browserProvider
      });

      // Trigger SIWE login if connected but not authenticated
      const freshState = useWeb3Store.getState();
      
      if (isConnected && connectedAddr && browserProvider && !freshState.isAuthenticated && !freshState.isConnecting && !freshState.hasPromptedSiwe) {
        // Mark as prompted to prevent infinite signature popups if user cancels
        freshState.setHasPromptedSiwe(true);
        
        // Wait briefly to see if initAuth (which checks localStorage on app load) restores the session.
        // If not restored, then pop up the wallet signature request exactly ONCE.
        setTimeout(async () => {
          const finalState = useWeb3Store.getState();
          if (!finalState.isAuthenticated && !finalState.isConnecting) {
            await finalState.signSiweAndLogin();
          }
        }, 1000);
      }
    };
    
    syncState();
  }, [address, isConnected, walletProvider]);

  return null;
}
