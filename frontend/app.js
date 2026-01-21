// Contract Configuration
const CONTRACT_ADDRESS = "0x337e46e80a245a7272B7aAf40b8844B82df9Ef0c"; // Replace with deployed contract address
const ARBITRUM_SEPOLIA_CHAIN_ID = "0x66eee"; // 421614 in hex

const CONTRACT_ABI = [
    "function createSchedule(address recipient, uint256 amount, uint256 interval, uint256 startTime) external returns (uint256 id)",
    "function cancelSchedule(uint256 id) external",
    "function schedules(uint256) external view returns (address payer, address recipient, uint256 amount, uint256 interval, uint256 nextExecution, bool active)",
    "function schedulesCount() external view returns (uint256)",
    "event ScheduleCreated(uint256 indexed id, address indexed payer)",
    "event ScheduleCancelled(uint256 indexed id)",
    "event PaymentExecuted(uint256 indexed id, address indexed recipient, uint256 amount)"
];

// App State
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let currentTab = 'active';
let allSchedules = [];

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const networkBadge = document.getElementById('networkBadge');
const networkName = document.getElementById('networkName');
const contractBalance = document.getElementById('contractBalance');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');
const paymentsList = document.getElementById('paymentsList');
const emptyState = document.getElementById('emptyState');
const newPaymentBtn = document.getElementById('newPaymentBtn');
const fundBtn = document.getElementById('fundBtn');
const newPaymentModal = document.getElementById('newPaymentModal');
const fundModal = document.getElementById('fundModal');
const closeModal = document.getElementById('closeModal');
const closeFundModal = document.getElementById('closeFundModal');
const cancelBtn = document.getElementById('cancelBtn');
const cancelFundBtn = document.getElementById('cancelFundBtn');
const paymentForm = document.getElementById('paymentForm');
const fundForm = document.getElementById('fundForm');
const tabs = document.querySelectorAll('.tab');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    setDefaultStartTime();
});

function initApp() {
    // Check if already connected
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
        
        // Check if already connected
        window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    connectWallet();
                }
            });
    }
}

function setupEventListeners() {
    connectBtn.addEventListener('click', connectWallet);
    newPaymentBtn.addEventListener('click', () => openModal(newPaymentModal));
    fundBtn.addEventListener('click', () => openModal(fundModal));
    closeModal.addEventListener('click', () => closeModalFn(newPaymentModal));
    closeFundModal.addEventListener('click', () => closeModalFn(fundModal));
    cancelBtn.addEventListener('click', () => closeModalFn(newPaymentModal));
    cancelFundBtn.addEventListener('click', () => closeModalFn(fundModal));
    paymentForm.addEventListener('submit', handleCreateSchedule);
    fundForm.addEventListener('submit', handleFundContract);
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Close modal on overlay click
    newPaymentModal.addEventListener('click', (e) => {
        if (e.target === newPaymentModal) closeModalFn(newPaymentModal);
    });
    fundModal.addEventListener('click', (e) => {
        if (e.target === fundModal) closeModalFn(fundModal);
    });
}

function setDefaultStartTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const dateStr = now.toISOString().slice(0, 16);
    document.getElementById('startTime').value = dateStr;
    document.getElementById('startTime').min = new Date().toISOString().slice(0, 16);
}

// Wallet Connection
async function connectWallet() {
    if (!window.ethereum) {
        showToast('Please install MetaMask!', 'error');
        return;
    }
    
    try {
        connectBtn.innerHTML = '<div class="spinner"></div> Connecting...';
        connectBtn.disabled = true;
        
        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        // Check and switch to Arbitrum Sepolia
        await switchToArbitrumSepolia();
        
        // Setup ethers
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = accounts[0];
        
        // Setup contract
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // Update UI
        updateWalletUI();
        await refreshData();
        
        showToast('Wallet connected successfully!', 'success');
    } catch (error) {
        console.error('Connection error:', error);
        showToast(error.message || 'Failed to connect wallet', 'error');
    } finally {
        connectBtn.disabled = false;
    }
}

async function switchToArbitrumSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARBITRUM_SEPOLIA_CHAIN_ID }],
        });
    } catch (switchError) {
        // Chain not added, add it
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
                    chainName: 'Arbitrum Sepolia',
                    nativeCurrency: {
                        name: 'Ethereum',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                    blockExplorerUrls: ['https://sepolia.arbiscan.io/']
                }]
            });
        } else {
            throw switchError;
        }
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // Disconnected
        userAddress = null;
        updateWalletUI();
        allSchedules = [];
        renderPayments();
    } else if (accounts[0] !== userAddress) {
        userAddress = accounts[0];
        updateWalletUI();
        refreshData();
    }
}

function updateWalletUI() {
    if (userAddress) {
        connectBtn.textContent = truncateAddress(userAddress);
        networkBadge.classList.add('connected');
        networkName.textContent = 'Arbitrum Sepolia';
    } else {
        connectBtn.textContent = 'Connect Wallet';
        networkBadge.classList.remove('connected');
        networkName.textContent = 'Not Connected';
    }
}

// Data Fetching
async function refreshData() {
    if (!contract || !provider) return;
    
    try {
        // Get contract balance
        const balance = await provider.getBalance(CONTRACT_ADDRESS);
        contractBalance.textContent = `${parseFloat(ethers.formatEther(balance)).toFixed(4)} ETH`;
        
        // Get all schedules
        const count = await contract.schedulesCount();
        allSchedules = [];
        
        for (let i = 0; i < count; i++) {
            const schedule = await contract.schedules(i);
            allSchedules.push({
                id: i,
                payer: schedule[0],
                recipient: schedule[1],
                amount: schedule[2],
                interval: schedule[3],
                nextExecution: schedule[4],
                active: schedule[5]
            });
        }
        
        // Update counts
        const userSchedules = allSchedules.filter(s => 
            s.payer.toLowerCase() === userAddress.toLowerCase()
        );
        activeCount.textContent = userSchedules.filter(s => s.active).length;
        completedCount.textContent = userSchedules.filter(s => !s.active).length;
        
        renderPayments();
    } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Error loading data', 'error');
    }
}

// Render Payments
function renderPayments() {
    const userSchedules = allSchedules.filter(s => 
        s.payer.toLowerCase() === userAddress?.toLowerCase()
    );
    
    const filtered = userSchedules.filter(s => 
        currentTab === 'active' ? s.active : !s.active
    );
    
    if (filtered.length === 0) {
        paymentsList.innerHTML = '';
        paymentsList.appendChild(createEmptyState());
        return;
    }
    
    paymentsList.innerHTML = filtered.map(schedule => createPaymentCard(schedule)).join('');
    
    // Add cancel button listeners
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => handleCancelSchedule(btn.dataset.id));
    });
}

function createPaymentCard(schedule) {
    const amount = ethers.formatEther(schedule.amount);
    const interval = formatInterval(Number(schedule.interval));
    const nextExec = new Date(Number(schedule.nextExecution) * 1000);
    const now = new Date();
    
    return `
        <div class="payment-card">
            <div class="payment-info">
                <div class="payment-header">
                    <span class="payment-id">#${schedule.id}</span>
                    <span class="payment-amount">${parseFloat(amount).toFixed(4)} ETH</span>
                </div>
                <div class="payment-details">
                    <div class="payment-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span class="address">${truncateAddress(schedule.recipient)}</span>
                    </div>
                    <div class="payment-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>${interval}</span>
                    </div>
                    <div class="payment-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>${schedule.active ? 'Next: ' + formatDate(nextExec) : 'Cancelled'}</span>
                    </div>
                </div>
            </div>
            <div class="payment-status">
                <span class="status-badge ${schedule.active ? 'active' : 'inactive'}">
                    ${schedule.active ? '● Active' : '○ Inactive'}
                </span>
                ${schedule.active ? `
                    <button class="btn btn-danger cancel-btn" data-id="${schedule.id}">
                        Cancel
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function createEmptyState() {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <h3>${currentTab === 'active' ? 'No active payments' : 'No completed payments'}</h3>
        <p>${currentTab === 'active' ? 'Create your first scheduled payment to get started' : 'Your cancelled payments will appear here'}</p>
    `;
    return div;
}

// Actions
async function handleCreateSchedule(e) {
    e.preventDefault();
    
    if (!contract) {
        showToast('Please connect your wallet first', 'error');
        return;
    }
    
    const recipient = document.getElementById('recipient').value;
    const amount = document.getElementById('amount').value;
    const interval = document.getElementById('interval').value;
    const startTimeInput = document.getElementById('startTime').value;
    
    // Validate address
    if (!ethers.isAddress(recipient)) {
        showToast('Invalid recipient address', 'error');
        return;
    }
    
    const startTime = Math.floor(new Date(startTimeInput).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    
    if (startTime < now) {
        showToast('Start time must be in the future', 'error');
        return;
    }
    
    try {
        const submitBtn = paymentForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<div class="spinner"></div> Creating...';
        submitBtn.disabled = true;
        
        const amountWei = ethers.parseEther(amount);
        
        const tx = await contract.createSchedule(
            recipient,
            amountWei,
            interval,
            startTime
        );
        
        showToast('Transaction submitted...', 'success');
        await tx.wait();
        
        showToast('Schedule created successfully!', 'success');
        closeModalFn(newPaymentModal);
        paymentForm.reset();
        setDefaultStartTime();
        await refreshData();
    } catch (error) {
        console.error('Create schedule error:', error);
        showToast(error.reason || error.message || 'Failed to create schedule', 'error');
    } finally {
        const submitBtn = paymentForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = 'Create Schedule';
        submitBtn.disabled = false;
    }
}

async function handleFundContract(e) {
    e.preventDefault();
    
    if (!signer) {
        showToast('Please connect your wallet first', 'error');
        return;
    }
    
    const amount = document.getElementById('fundAmount').value;
    
    try {
        const submitBtn = fundForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<div class="spinner"></div> Sending...';
        submitBtn.disabled = true;
        
        const tx = await signer.sendTransaction({
            to: CONTRACT_ADDRESS,
            value: ethers.parseEther(amount)
        });
        
        showToast('Transaction submitted...', 'success');
        await tx.wait();
        
        showToast('Contract funded successfully!', 'success');
        closeModalFn(fundModal);
        fundForm.reset();
        await refreshData();
    } catch (error) {
        console.error('Fund error:', error);
        showToast(error.reason || error.message || 'Failed to fund contract', 'error');
    } finally {
        const submitBtn = fundForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = 'Send ETH';
        submitBtn.disabled = false;
    }
}

async function handleCancelSchedule(id) {
    if (!contract) {
        showToast('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        const btn = document.querySelector(`.cancel-btn[data-id="${id}"]`);
        btn.innerHTML = '<div class="spinner"></div>';
        btn.disabled = true;
        
        const tx = await contract.cancelSchedule(id);
        showToast('Transaction submitted...', 'success');
        await tx.wait();
        
        showToast('Schedule cancelled successfully!', 'success');
        await refreshData();
    } catch (error) {
        console.error('Cancel error:', error);
        showToast(error.reason || error.message || 'Failed to cancel schedule', 'error');
        await refreshData();
    }
}

// Tab Switching
function switchTab(tab) {
    currentTab = tab;
    tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    renderPayments();
}

// Modal Functions
function openModal(modal) {
    modal.classList.add('active');
}

function closeModalFn(modal) {
    modal.classList.remove('active');
}

// Toast Notification
function showToast(message, type = '') {
    toastMessage.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility Functions
function truncateAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatInterval(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks`;
    return `${Math.floor(seconds / 2592000)} months`;
}

function formatDate(date) {
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) return 'Overdue';
    if (diff < 60000) return 'In less than a minute';
    if (diff < 3600000) return `In ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `In ${Math.floor(diff / 3600000)} hours`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
