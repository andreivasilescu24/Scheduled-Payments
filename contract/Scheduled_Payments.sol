// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    AutomationCompatibleInterface
} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title ScheduledPayments
 * @notice v1 scheduled ETH payments using Chainlink Automation (single upkeep)
 */
contract ScheduledPayments is AutomationCompatibleInterface {
    struct Schedule {
        address payer;
        address recipient;
        uint256 amount;
        uint256 interval;
        uint256 nextExecution;
        bool active;
    }

    Schedule[] public schedules;

    uint256 public constant MAX_EXECUTIONS_PER_UPKEEP = 10;

    event ScheduleCreated(uint256 indexed id, address indexed payer);
    event ScheduleCancelled(uint256 indexed id);
    event PaymentExecuted(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                                USER ACTIONS
    //////////////////////////////////////////////////////////////*/

    function createSchedule(
        address recipient,
        uint256 amount,
        uint256 interval,
        uint256 startTime
    ) external returns (uint256 id) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(interval > 0, "Interval must be > 0");
        require(startTime >= block.timestamp, "Start time in past");

        schedules.push(
            Schedule({
                payer: msg.sender,
                recipient: recipient,
                amount: amount,
                interval: interval,
                nextExecution: startTime,
                active: true
            })
        );

        id = schedules.length - 1;
        emit ScheduleCreated(id, msg.sender);
    }

    function cancelSchedule(uint256 id) external {
        Schedule storage s = schedules[id];
        require(msg.sender == s.payer, "Only payer");
        require(s.active, "Already inactive");

        s.active = false;
        emit ScheduleCancelled(id);
    }

    /*//////////////////////////////////////////////////////////////
                                FUNDING
    //////////////////////////////////////////////////////////////*/

    receive() external payable {}

    /*//////////////////////////////////////////////////////////////
                        CHAINLINK AUTOMATION
    //////////////////////////////////////////////////////////////*/

    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory) {
        uint256 len = schedules.length;

        for (uint256 i = 0; i < len; i++) {
            Schedule storage s = schedules[i];
            if (
                s.active &&
                block.timestamp >= s.nextExecution &&
                address(this).balance >= s.amount
            ) {
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

            if (
                s.active &&
                block.timestamp >= s.nextExecution &&
                address(this).balance >= s.amount
            ) {
                // update state FIRST
                s.nextExecution += s.interval;

                (bool ok, ) = s.recipient.call{value: s.amount}("");
                require(ok, "ETH transfer failed");

                emit PaymentExecuted(i, s.recipient, s.amount);
                executed++;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    function schedulesCount() external view returns (uint256) {
        return schedules.length;
    }
}
