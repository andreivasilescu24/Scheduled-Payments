import { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useContract } from './hooks/useContract';
import { useToast } from './hooks/useToast';
import { useFavorites } from './hooks/useFavorites';
import {
  Header,
  StatsGrid,
  PaymentsList,
  NewPaymentModal,
  Toast
} from './components';

function App() {
  const [currentTab, setCurrentTab] = useState('active');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { toast, showToast } = useToast();
  const wallet = useWallet();
  const contract = useContract(wallet.provider, wallet.signer, wallet.address);
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  const handleConnect = async () => {
    await wallet.connect();
    if (wallet.error) {
      showToast(wallet.error, 'error');
    }
  };

  const handleCreateSchedule = async (recipient, amount, interval, startTime, executions) => {
    try {
      showToast('Transaction submitted...', 'success');
      await contract.createSchedule(recipient, amount, interval, startTime, executions);
      showToast('Schedule created successfully!', 'success');
    } catch (error) {
      showToast(error.reason || error.message || 'Failed to create schedule', 'error');
      throw error;
    }
  };

  const handleCancelSchedule = async (id) => {
    try {
      showToast('Transaction submitted...', 'success');
      await contract.cancelSchedule(id);
      showToast('Schedule cancelled successfully!', 'success');
    } catch (error) {
      showToast(error.reason || error.message || 'Failed to cancel schedule', 'error');
    }
  };

  return (
    <div className="app">
      <Header
        address={wallet.address}                                                                                                                                                                    
        isConnecting={wallet.isConnecting}
        onConnect={handleConnect}
        onDisconnect={wallet.disconnect}                                                                                                                                                                                                                                                                                                                                           
      />                                                                                                                                                                        

      <main className="main">
        <StatsGrid
          contractBalance={contract.contractBalance}
          activeCount={contract.activeSchedules.length}
          completedCount={contract.completedSchedules.length}
        />

        <div className="actions-bar">
          <div className="tabs">
            <button
              className={`tab ${currentTab === 'active' ? 'active' : ''}`}
              onClick={() => setCurrentTab('active')}
            >
              Active Payments
            </button>
            <button
              className={`tab ${currentTab === 'completed' ? 'active' : ''}`}
              onClick={() => setCurrentTab('completed')}
            >
              Completed
            </button>
          </div>
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Payment
            </button>
          </div>
        </div>

        <PaymentsList
          schedules={contract.schedules}
          currentTab={currentTab}
          onCancel={handleCancelSchedule}
        />
      </main>

      <NewPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleCreateSchedule}
        previewTotalCost={contract.previewTotalCost}
        favorites={favorites}
        onAddFavorite={addFavorite}
        onRemoveFavorite={removeFavorite}
        isFavorite={isFavorite}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}

export default App;
