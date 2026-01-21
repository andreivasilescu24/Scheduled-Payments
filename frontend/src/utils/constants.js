export const CONTRACT_ADDRESS = "0x9dd92984A3de28aE03Bc2dcf5026e1D7c77E5a4A"; // Replace with deployed contract address

export const ARBITRUM_SEPOLIA_CHAIN_ID = "0x66eee"; // 421614 in hex

export const CONTRACT_ABI = [
  "function createSchedule(address recipient, uint256 amount, uint256 interval, uint256 startTime, uint256 executions) external payable returns (uint256 id)",
  "function cancelSchedule(uint256 id) external",
  "function getSchedule(uint256 id) external view returns (tuple(address payer, address recipient, uint256 amount, uint256 interval, uint256 nextExecution, uint256 executionsLeft, uint256 remainingBalance, bool active))",
  "function getUserScheduleIds(address user) external view returns (uint256[])",
  "function getUserSchedules(address user) external view returns (tuple(address payer, address recipient, uint256 amount, uint256 interval, uint256 nextExecution, uint256 executionsLeft, uint256 remainingBalance, bool active)[])",
  "function previewTotalCost(uint256 amount, uint256 executions) external view returns (uint256)",
  "function feeBps() external view returns (uint256)",
  "event ScheduleCreated(uint256 indexed id, address indexed payer)",
  "event ScheduleCancelled(uint256 indexed id, uint256 refundedPrincipal)",
  "event PaymentExecuted(uint256 indexed id, address indexed recipient, uint256 amount)"
];

export const INTERVAL_OPTIONS = [
  { value: "0", label: "One-time (no repeat)" },
  { value: "60", label: "Every minute" },
  { value: "3600", label: "Every hour" },
  { value: "86400", label: "Every day" },
  { value: "604800", label: "Every week" },
  { value: "2592000", label: "Every month (30 days)" },
];

export const FEE_BPS = 50; // 0.5%
