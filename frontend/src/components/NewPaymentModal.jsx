import { useState, useEffect } from 'react';
import { getDefaultStartTime, getMinDateTime } from '../utils/helpers';
import { INTERVAL_OPTIONS, FEE_BPS } from '../utils/constants';
import { truncateAddress } from '../utils/helpers';

export function NewPaymentModal({ isOpen, onClose, onSubmit, previewTotalCost, favorites, onAddFavorite, onRemoveFavorite, isFavorite }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState('0');
  const [executions, setExecutions] = useState('1');
  const [startTime, setStartTime] = useState(getDefaultStartTime());
  const [minDateTime, setMinDateTime] = useState(getMinDateTime());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [costPreview, setCostPreview] = useState(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [newFavoriteLabel, setNewFavoriteLabel] = useState('');
  const [showAddFavorite, setShowAddFavorite] = useState(false);

  // Reset min datetime and start time when modal opens
  useEffect(() => {
    if (isOpen) {
      const newMin = getMinDateTime();
      setMinDateTime(newMin);
      // Reset start time to 5 minutes from now when modal opens
      setStartTime(getDefaultStartTime());
    }
  }, [isOpen]);

  // Update cost preview when amount or executions change
  useEffect(() => {
    if (amount && executions && parseFloat(amount) > 0 && parseInt(executions) > 0) {
      const preview = previewTotalCost(amount, parseInt(executions));
      setCostPreview(preview);
    } else {
      setCostPreview(null);
    }
  }, [amount, executions, previewTotalCost]);

  // Reset executions to 1 when switching to one-time
  useEffect(() => {
    if (interval === '0') {
      setExecutions('1');
    }
  }, [interval]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
      await onSubmit(recipient, amount, parseInt(interval), startTimestamp, parseInt(executions));
      
      // Reset form
      setRecipient('');
      setAmount('');
      setInterval('0');
      setExecutions('1');
      setStartTime(getDefaultStartTime());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectFavorite = (address) => {
    setRecipient(address);
    setShowFavorites(false);
  };

  const handleAddToFavorites = () => {
    if (recipient && recipient.startsWith('0x')) {
      onAddFavorite(recipient, newFavoriteLabel);
      setNewFavoriteLabel('');
      setShowAddFavorite(false);
    }
  };

  const isCurrentFavorite = recipient && isFavorite(recipient);

  if (!isOpen) return null;

  const isOneTime = interval === '0';

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Scheduled Payment</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="recipient">Recipient Address</label>
            <div className="recipient-input-wrapper">
              <input
                type="text"
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                required
              />
              <div className="recipient-actions">
                {favorites.length > 0 && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowFavorites(!showFavorites)}
                    title="Select from favorites"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                )}
                {recipient && !isCurrentFavorite && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowAddFavorite(!showAddFavorite)}
                    title="Add to favorites"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                )}
                {isCurrentFavorite && (
                  <button
                    type="button"
                    className="icon-btn favorite"
                    onClick={() => onRemoveFavorite(recipient)}
                    title="Remove from favorites"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Favorites dropdown */}
            {showFavorites && favorites.length > 0 && (
              <div className="favorites-dropdown">
                {favorites.map((fav, index) => (
                  <div
                    key={index}
                    className="favorite-item"
                    onClick={() => handleSelectFavorite(fav.address)}
                  >
                    <span className="favorite-label">{fav.label}</span>
                    <span className="favorite-address">{truncateAddress(fav.address)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add to favorites form */}
            {showAddFavorite && (
              <div className="add-favorite-form">
                <input
                  type="text"
                  placeholder="Label (e.g., Alice, Rent)"
                  value={newFavoriteLabel}
                  onChange={e => setNewFavoriteLabel(e.target.value)}
                />
                <button type="button" className="btn btn-sm" onClick={handleAddToFavorites}>
                  Save
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="amount">Amount per Payment (ETH)</label>
            <input
              type="number"
              id="amount"
              step="0.0001"
              min="0.0001"
              placeholder="0.1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="interval">Payment Frequency</label>
            <select
              id="interval"
              value={interval}
              onChange={e => setInterval(e.target.value)}
            >
              {INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {!isOneTime && (
            <div className="form-group">
              <label htmlFor="executions">Number of Payments</label>
              <input
                type="number"
                id="executions"
                min="1"
                max="100"
                placeholder="1"
                value={executions}
                onChange={e => setExecutions(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="startTime">Start Date & Time</label>
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              min={minDateTime}
              onChange={e => setStartTime(e.target.value)}
              required
            />
          </div>
          
          {costPreview && (
            <div className="cost-preview">
              <div className="cost-row">
                <span>Principal ({executions}x {amount} ETH)</span>
                <span>{parseFloat(costPreview.principal).toFixed(6)} ETH</span>
              </div>
              <div className="cost-row fee">
                <span>Protocol Fee ({FEE_BPS / 100}%)</span>
                <span>{parseFloat(costPreview.fee).toFixed(6)} ETH</span>
              </div>
              <div className="cost-row total">
                <span>Total Cost</span>
                <span>{parseFloat(costPreview.total).toFixed(6)} ETH</span>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  Creating...
                </>
              ) : (
                'Create Schedule'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
