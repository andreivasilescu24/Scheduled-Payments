import { useState } from 'react';
import { formatEther } from 'ethers';
import { truncateAddress, formatInterval, formatDate } from '../utils/helpers';

export function PaymentCard({ schedule, onCancel }) {
  const [isCancelling, setIsCancelling] = useState(false);

  const amount = formatEther(schedule.amount);
  const remainingBalance = formatEther(schedule.remainingBalance);
  const isOneTime = Number(schedule.interval) === 0;
  const interval = isOneTime ? 'One-time' : formatInterval(Number(schedule.interval));
  const nextExec = new Date(Number(schedule.nextExecution) * 1000);
  
  // Determine if cancelled (has executions left but inactive) vs completed (no executions left)
  const wasCancelled = !schedule.active && schedule.executionsLeft > 0;
  const wasCompleted = !schedule.active && schedule.executionsLeft === 0;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await onCancel(schedule.id);
    } finally {
      setIsCancelling(false);
    }
  };

  // Get status text and class
  const getStatusInfo = () => {
    if (schedule.active) return { text: '● Active', class: 'active' };
    if (wasCancelled) return { text: '✕ Cancelled', class: 'cancelled' };
    return { text: '✓ Completed', class: 'completed' };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`payment-card ${wasCancelled ? 'cancelled' : ''}`}>
      <div className="payment-info">
        <div className="payment-header">
          <span className="payment-id">#{schedule.id}</span>
          <span className="payment-amount">{parseFloat(amount).toFixed(4)} ETH</span>
        </div>
        <div className="payment-details">
          <div className="payment-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="address">{truncateAddress(schedule.recipient)}</span>
          </div>
          <div className="payment-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{interval}</span>
          </div>
          {!isOneTime && schedule.active && (
            <div className="payment-detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
              <span>{schedule.executionsLeft} payments left</span>
            </div>
          )}
          <div className="payment-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>
              {schedule.active 
                ? `Next: ${formatDate(nextExec)}` 
                : wasCancelled 
                  ? `Cancelled (${schedule.executionsLeft} payments remaining)`
                  : 'All payments completed'}
            </span>
          </div>
          {schedule.active && (
            <div className="payment-detail balance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              </svg>
              <span>Balance: {parseFloat(remainingBalance).toFixed(4)} ETH</span>
            </div>
          )}
        </div>
      </div>
      <div className="payment-status">
        <span className={`status-badge ${statusInfo.class}`}>
          {statusInfo.text}
        </span>
        {schedule.active && (
          <button
            className="btn btn-danger"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? <div className="spinner"></div> : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}
