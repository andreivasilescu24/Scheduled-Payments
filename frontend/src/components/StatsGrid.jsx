export function StatsGrid({ contractBalance, activeCount, completedCount }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Contract Balance</span>
          <span className="stat-value">{contractBalance} ETH</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Active Schedules</span>
          <span className="stat-value">{activeCount}</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Completed</span>
          <span className="stat-value">{completedCount}</span>
        </div>
      </div>
    </div>
  );
}
