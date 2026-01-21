import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { ARBITRUM_SEPOLIA_CHAIN_ID } from '../utils/constants';

export function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Helper to setup wallet state
  const setupWallet = async (account) => {
    const browserProvider = new BrowserProvider(window.ethereum);
    const walletSigner = await browserProvider.getSigner();
    setProvider(browserProvider);
    setSigner(walletSigner);
    setAddress(account);
  };

  // Helper to clear wallet state
  const clearWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
  };

  const connect = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        // Switch to Arbitrum Sepolia
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARBITRUM_SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
                chainName: 'Arbitrum Sepolia',
                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://sepolia.arbiscan.io/']
              }]
            });
          }
        }

        await setupWallet(accounts[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
      clearWallet();
    } finally {
      setIsConnecting(false);
    }
  };

  // Listen for account changes and auto-connect on mount
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length > 0) {
        try {
          await setupWallet(accounts[0]);
        } catch (err) {
          console.error('Failed to setup wallet:', err);
          clearWallet();
        }
      } else {
        clearWallet();
      }
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Auto-connect if already connected in MetaMask
    const checkExistingConnection = async () => {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await setupWallet(accounts[0]);
        }
      } catch (err) {
        console.error('Failed to check existing connection:', err);
      }
    };

    checkExistingConnection();

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const disconnect = () => {
    clearWallet();
  };

  return {
    provider,
    signer,
    address,
    isConnecting,
    error,
    connect,
    disconnect,
    isConnected: !!address
  };
}
