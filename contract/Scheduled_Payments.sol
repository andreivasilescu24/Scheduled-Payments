// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    AutomationCompatibleInterface
} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

contract ScheduledPayments is AutomationCompatibleInterface {
    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/

    struct Schedule {
        address payer;
        address recipient;
        uint256 amount; // per execution (principal)
        uint256 interval; // 0 = one-time
        uint256 nextExecution;
        uint256 executionsLeft; // must be > 0
        uint256 remainingBalance; // remaining principal
        bool active;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    Schedule[] public schedules;
    mapping(address => uint256[]) private userScheduleIds;

    uint256 public constant MAX_EXECUTIONS_PER_UPKEEP = 10;

    // protocol fee (basis points)
    uint256 public feeBps = 50; // 0.5%
    address public immutable feeRecipient;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ScheduleCreated(uint256 indexed id, address indexed payer);
    event ScheduleCancelled(uint256 indexed id, uint256 refundedPrincipal);
    event PaymentExecuted(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /*//////////////////////////////////////////////////////////////
                            USER ACTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a scheduled payment (escrowed principal)
     * @param recipient payment receiver
     * @param amount ETH per execution
     * @param interval seconds between executions (0 = one-time)
     * @param startTime first execution timestamp
     * @param executions number of executions (> 0)
     */
    function createSchedule(
        address recipient,
        uint256 amount,
        uint256 interval,
        uint256 startTime,
        uint256 executions
    ) external payable returns (uint256 id) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(executions > 0, "Executions required");
        require(startTime >= block.timestamp, "Start time in past");

        if (interval == 0) {
            require(executions == 1, "One-time must execute once");
        }

        uint256 totalPrincipal = amount * executions;
        uint256 totalFee = (totalPrincipal * feeBps) / 10_000;

        require(msg.value >= totalPrincipal + totalFee, "Too few ETH sent");

        // pay protocol fee immediately (non-refundable)
        (bool feeOk, ) = feeRecipient.call{value: totalFee}("");
        require(feeOk, "Fee transfer failed");

        schedules.push(
            Schedule({
                payer: msg.sender,
                recipient: recipient,
                amount: amount,
                interval: interval,
                nextExecution: startTime,
                executionsLeft: executions,
                remainingBalance: totalPrincipal,
                active: true
            })
        );

        id = schedules.length - 1;
        userScheduleIds[msg.sender].push(id);

        emit ScheduleCreated(id, msg.sender);
    }

    function cancelSchedule(uint256 id) external {
        Schedule storage s = schedules[id];
        require(msg.sender == s.payer, "Only payer");
        require(s.active, "Already inactive");

        s.active = false;

        uint256 refund = s.remainingBalance;
        s.remainingBalance = 0;

        if (refund > 0) {
            (bool ok, ) = s.payer.call{value: refund}("");
            require(ok, "Refund failed");
        }

        emit ScheduleCancelled(id, refund);
    }

    /*//////////////////////////////////////////////////////////////
                        CHAINLINK AUTOMATION
    //////////////////////////////////////////////////////////////*/

    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory) {
        uint256 len = schedules.length;

        for (uint256 i = 0; i < len; i++) {
            if (_isExecutable(schedules[i])) {
                return (true, "");
            }
        }

        return (false, "");
    }

    function performUpkeep(bytes calldata) external override {
        uint256 len = schedules.length;
        uint256 executed;

        for (
            uint256 i = 0;
            i < len && executed < MAX_EXECUTIONS_PER_UPKEEP;
            i++
        ) {
            Schedule storage s = schedules[i];

            if (_isExecutable(s)) {
                _executeSchedule(i, s);
                executed++;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function _isExecutable(Schedule storage s) internal view returns (bool) {
        return (s.active &&
            s.executionsLeft > 0 &&
            block.timestamp >= s.nextExecution &&
            s.remainingBalance >= s.amount);
    }

    function _executeSchedule(uint256 id, Schedule storage s) internal {
        // effects
        s.executionsLeft -= 1;
        s.remainingBalance -= s.amount;

        if (s.executionsLeft == 0) {
            s.active = false;
        } else {
            s.nextExecution += s.interval;
        }

        // interaction
        (bool ok, ) = s.recipient.call{value: s.amount}("");
        require(ok, "Payment failed");

        emit PaymentExecuted(id, s.recipient, s.amount);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getSchedule(uint256 id) external view returns (Schedule memory) {
        return schedules[id];
    }

    function getUserScheduleIds(
        address user
    ) external view returns (uint256[] memory) {
        return userScheduleIds[user];
    }

    function getUserSchedules(
        address user
    ) external view returns (Schedule[] memory result) {
        uint256[] memory ids = userScheduleIds[user];
        result = new Schedule[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = schedules[ids[i]];
        }
    }

    function previewTotalCost(
        uint256 amount,
        uint256 executions
    ) external view returns (uint256 totalCost) {
        uint256 principal = amount * executions;
        uint256 fee = (principal * feeBps) / 10_000;
        return principal + fee;
    }
}
