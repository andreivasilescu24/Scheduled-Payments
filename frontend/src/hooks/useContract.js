import { useState, useEffect, useCallback } from 'react';
import { Contract, formatEther, parseEther, isAddress } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, FEE_BPS } from '../utils/constants';

export function useContract(provider, signer, address) {
  const [contract, setContract] = useState(null);
  const [contractBalance, setContractBalance] = useState('0');
  const [schedules, setSchedules] = useState([]);
  const [scheduleIds, setScheduleIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Validate contract address
  const isValidContractAddress = isAddress(CONTRACT_ADDRESS);

  useEffect(() => {
    if (signer && isValidContractAddress) {
      const contractInstance = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(contractInstance);
    } else {
      setContract(null);
      // Clear data when disconnected
      setSchedules([]);
      setScheduleIds([]);
      setContractBalance('0');
    }
  }, [signer, isValidContractAddress]);

  const fetchData = useCallback(async () => {
    if (!contract || !provider || !address || !isValidContractAddress) return;

    setIsLoading(true);
    try {
      // Get contract balance
      const balance = await provider.getBalance(CONTRACT_ADDRESS);
      setContractBalance(parseFloat(formatEther(balance)).toFixed(4));

      // Get user's schedule IDs
      const ids = await contract.getUserScheduleIds(address);
      setScheduleIds(ids.map(id => Number(id)));

      // Get user's schedules
      const userSchedules = await contract.getUserSchedules(address);
      const fetchedSchedules = userSchedules.map((schedule, index) => ({
        id: Number(ids[index]),
        payer: schedule.payer,
        recipient: schedule.recipient,
        amount: schedule.amount,
        interval: schedule.interval,
        nextExecution: schedule.nextExecution,
        executionsLeft: Number(schedule.executionsLeft),
        remainingBalance: schedule.remainingBalance,
        active: schedule.active
      }));

      setSchedules(fetchedSchedules);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contract, provider, address, isValidContractAddress]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds to catch Chainlink automation updates
  useEffect(() => {
    if (!contract || !address) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [contract, address, fetchData]);

  const createSchedule = async (recipient, amount, interval, startTime, executions) => {
    if (!contract) throw new Error('Contract not initialized');
    if (!isAddress(recipient)) throw new Error('Invalid recipient address');

    const amountWei = parseEther(amount);
    const totalPrincipal = amountWei * BigInt(executions);
    const totalFee = (totalPrincipal * BigInt(FEE_BPS)) / 10000n;
    const totalValue = totalPrincipal + totalFee;
    
    // Get current fee data and add buffer for Arbitrum
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas * 120n / 100n; // 20% buffer
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 120n / 100n;

    const tx = await contract.createSchedule(recipient, amountWei, interval, startTime, executions, {
      value: totalValue,
      maxFeePerGas,
      maxPriorityFeePerGas
    });
    await tx.wait();
    await fetchData();
  };

  const cancelSchedule = async (id) => {
    if (!contract) throw new Error('Contract not initialized');

    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas * 120n / 100n;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 120n / 100n;

    const tx = await contract.cancelSchedule(id, {
      maxFeePerGas,
      maxPriorityFeePerGas
    });
    await tx.wait();
    await fetchData();
  };

  const previewTotalCost = (amount, executions) => {
    const amountWei = parseEther(amount);
    const totalPrincipal = amountWei * BigInt(executions);
    const totalFee = (totalPrincipal * BigInt(FEE_BPS)) / 10000n;
    return {
      principal: formatEther(totalPrincipal),
      fee: formatEther(totalFee),
      total: formatEther(totalPrincipal + totalFee)
    };
  };

  const activeSchedules = schedules.filter(s => s.active);
  const completedSchedules = schedules.filter(s => !s.active);

  return {
    contract,
    contractBalance,
    schedules,
    activeSchedules,
    completedSchedules,
    isLoading,
    createSchedule,
    cancelSchedule,
    previewTotalCost,
    refreshData: fetchData
  };
}
