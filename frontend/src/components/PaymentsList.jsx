import { PaymentCard } from './PaymentCard';

export function PaymentsList({ schedules, currentTab, onCancel }) {
  const filtered = schedules.filter(s =>
    currentTab === 'active' ? s.active : !s.active
  );

  if (filtered.length === 0) {
    return (
      <div className="payments-panel">
        <div className="payments-list">
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3>{currentTab === 'active' ? 'No active payments' : 'No completed payments'}</h3>
            <p>
              {currentTab === 'active'
                ? 'Create your first scheduled payment to get started'
                : 'Your cancelled payments will appear here'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-panel">
      <div className="payments-list">
        {filtered.map(schedule => (
          <PaymentCard
            key={schedule.id}
            schedule={schedule}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  );
}
