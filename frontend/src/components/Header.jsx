import { truncateAddress } from '../utils/helpers';

export function Header({ address, isConnecting, onConnect, onDisconnect }) {
  return (
    <header className="header">
      <div className="logo">
        <span className="brand-name">skepa</span>
      </div>
      <div className="wallet-section">
        <div className={`network-badge ${address ? 'connected' : ''}`}>
          <span className="network-dot"></span>
          <span>{address ? 'Arbitrum Sepolia' : 'Not Connected'}</span>
        </div>
        {address ? (
          <>
            <span className="wallet-address">{truncateAddress(address)}</span>
            <button className="btn btn-secondary" onClick={onDisconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <div className="spinner"></div>
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        )}
      </div>
    </header>
  );
}
