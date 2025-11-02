// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint128, externalEuint128, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ShadowFinance - Privacy-Preserving Personal Finance Management Platform
/// @author ShadowFinance
/// @notice A FHEVM-based dApp for encrypted personal finance management
contract ShadowFinance is ZamaEthereumConfig {
    // ============ Structs ============
    
    struct IncomeRecord {
        euint128 amount;
        string source;
        uint256 date;
        string note;
    }
    
    struct ExpenseRecord {
        euint128 amount;
        string category;
        uint256 date;
        string note;
    }
    
    struct Budget {
        euint128 amount;
        string category;
        uint8 period; // 0: weekly, 1: monthly, 2: yearly
        uint256 startDate;
        bool active;
    }
    
    struct Goal {
        string name;
        uint8 goalType; // 0: savings, 1: expense
        euint128 targetAmount;
        uint256 deadline;
        string note;
        bool active;
    }
    
    // ============ State Variables ============
    
    // User address => record index => IncomeRecord
    mapping(address => mapping(uint256 => IncomeRecord)) public incomeRecords;
    mapping(address => uint256) public incomeCount;
    
    // User address => record index => ExpenseRecord
    mapping(address => mapping(uint256 => ExpenseRecord)) public expenseRecords;
    mapping(address => uint256) public expenseCount;
    
    // User address => category => Budget
    mapping(address => mapping(string => Budget)) public budgets;
    mapping(address => string[]) public budgetCategories;
    
    // User address => goal index => Goal
    mapping(address => mapping(uint256 => Goal)) public goals;
    mapping(address => uint256) public goalCount;
    
    // Aggregated data (encrypted)
    mapping(address => euint128) public totalIncome;
    mapping(address => euint128) public totalExpense;
    
    // Initialization flags
    mapping(address => bool) public hasTotalIncome;
    mapping(address => bool) public hasTotalExpense;
    mapping(address => mapping(string => bool)) public hasCategoryIncome;
    mapping(address => mapping(string => bool)) public hasCategoryExpense;
    mapping(address => mapping(uint256 => bool)) public hasMonthlyIncome;
    mapping(address => mapping(uint256 => bool)) public hasMonthlyExpense;
    
    // Category aggregations
    mapping(address => mapping(string => euint128)) public categoryIncome;
    mapping(address => mapping(string => euint128)) public categoryExpense;
    
    // Monthly aggregations (timestamp => amount)
    mapping(address => mapping(uint256 => euint128)) public monthlyIncome;
    mapping(address => mapping(uint256 => euint128)) public monthlyExpense;

    mapping(address => euint128) public netIncomeValue;
    mapping(address => bool) public hasNetIncomeValue;

    mapping(address => mapping(string => euint128)) public budgetRemaining;
    mapping(address => mapping(string => bool)) public hasBudgetRemaining;
    mapping(address => mapping(string => ebool)) public budgetOverStatus;

    mapping(address => mapping(uint256 => euint128)) public goalProgressCurrent;
    mapping(address => mapping(uint256 => bool)) public hasGoalProgress;
    mapping(address => mapping(uint256 => ebool)) public goalCompleted;
    
    // ============ Events ============
    
    event IncomeAdded(address indexed user, uint256 indexed index, string source, uint256 date);
    event ExpenseAdded(address indexed user, uint256 indexed index, string category, uint256 date);
    event BudgetSet(address indexed user, string category, uint8 period, uint256 startDate);
    event GoalSet(address indexed user, uint256 indexed index, string name, uint8 goalType);
    
    function _updateNetIncome(address user) internal {
        euint128 income = hasTotalIncome[user] ? totalIncome[user] : FHE.asEuint128(0);
        euint128 expense = hasTotalExpense[user] ? totalExpense[user] : FHE.asEuint128(0);
        euint128 net = FHE.sub(income, expense);
        netIncomeValue[user] = net;
        hasNetIncomeValue[user] = true;
        FHE.allowThis(net);
        FHE.allow(net, user);
    }

    function _updateBudgetState(address user, string memory category) internal {
        Budget memory budget = budgets[user][category];
        if (!budget.active) {
            ebool zeroOver = ebool.wrap(0);
            budgetOverStatus[user][category] = zeroOver;
            hasBudgetRemaining[user][category] = false;
            // Authorize user to decrypt the zero over status
            FHE.allowThis(zeroOver);
            FHE.allow(zeroOver, user);
            return;
        }

        euint128 spent = hasCategoryExpense[user][category]
            ? categoryExpense[user][category]
            : FHE.asEuint128(0);
        
        euint128 remaining = FHE.sub(budget.amount, spent);
        budgetRemaining[user][category] = remaining;
        hasBudgetRemaining[user][category] = true;
        FHE.allowThis(remaining);
        FHE.allow(remaining, user);

        // For comparison operations, ensure both operands are authorized to this contract
        // spent is already authorized in addExpense, budget.amount is already authorized in setBudget
        // The result of FHE.gt should be automatically authorized to this contract
        ebool over = FHE.gt(spent, budget.amount);
        budgetOverStatus[user][category] = over;
        // Authorize user to decrypt the over budget status
        // Note: FHE.gt result should already be authorized to this contract
        FHE.allowThis(over);
        FHE.allow(over, user);
    }

    function _updateGoals(address user) internal {
        uint256 count = goalCount[user];
        for (uint256 i = 0; i < count; i++) {
            Goal storage goal = goals[user][i];
            if (!goal.active) {
                continue;
            }

            euint128 current;
            if (goal.goalType == 0) {
                current = hasNetIncomeValue[user]
                    ? netIncomeValue[user]
                    : (hasTotalIncome[user] ? totalIncome[user] : FHE.asEuint128(0));
            } else {
                current = hasTotalExpense[user]
                    ? totalExpense[user]
                    : FHE.asEuint128(0);
            }

            goalProgressCurrent[user][i] = current;
            hasGoalProgress[user][i] = true;
            FHE.allowThis(current);
            FHE.allow(current, user);

            ebool completed;
            if (goal.goalType == 0) {
                completed = FHE.ge(current, goal.targetAmount);
            } else {
                euint128 expense = hasTotalExpense[user]
                    ? totalExpense[user]
                    : FHE.asEuint128(0);
                completed = FHE.le(expense, goal.targetAmount);
            }
            goalCompleted[user][i] = completed;
            // Authorize user to decrypt the goal completed status
            FHE.allowThis(completed);
            FHE.allow(completed, user);
        }
    }

    // ============ Income Functions ============
    
    /// @notice Add an income record
    /// @param amount Encrypted income amount
    /// @param inputProof Input proof for the encrypted amount
    /// @param source Income source (e.g., "Salary", "Investment")
    /// @param date Timestamp of the income
    /// @param note Optional note
    function addIncome(
        externalEuint128 amount,
        bytes calldata inputProof,
        string memory source,
        uint256 date,
        string memory note
    ) external {
        euint128 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        uint256 index = incomeCount[msg.sender];
        incomeRecords[msg.sender][index] = IncomeRecord({
            amount: encryptedAmount,
            source: source,
            date: date,
            note: note
        });
        
        incomeCount[msg.sender] = index + 1;
        
        // Update total income
        if (!hasTotalIncome[msg.sender]) {
            totalIncome[msg.sender] = encryptedAmount;
            hasTotalIncome[msg.sender] = true;
        } else {
            euint128 current = totalIncome[msg.sender];
            totalIncome[msg.sender] = FHE.add(current, encryptedAmount);
        }
        FHE.allowThis(totalIncome[msg.sender]);
        FHE.allow(totalIncome[msg.sender], msg.sender);
        
        // Update category income
        if (!hasCategoryIncome[msg.sender][source]) {
            categoryIncome[msg.sender][source] = encryptedAmount;
            hasCategoryIncome[msg.sender][source] = true;
        } else {
            euint128 current = categoryIncome[msg.sender][source];
            categoryIncome[msg.sender][source] = FHE.add(current, encryptedAmount);
        }
        FHE.allowThis(categoryIncome[msg.sender][source]);
        FHE.allow(categoryIncome[msg.sender][source], msg.sender);
        
        // Update monthly income (approximate month from timestamp)
        uint256 monthTimestamp = (date / 2592000) * 2592000; // Round to month
        if (!hasMonthlyIncome[msg.sender][monthTimestamp]) {
            monthlyIncome[msg.sender][monthTimestamp] = encryptedAmount;
            hasMonthlyIncome[msg.sender][monthTimestamp] = true;
        } else {
            euint128 current = monthlyIncome[msg.sender][monthTimestamp];
            monthlyIncome[msg.sender][monthTimestamp] = FHE.add(current, encryptedAmount);
        }
        FHE.allowThis(monthlyIncome[msg.sender][monthTimestamp]);
        FHE.allow(monthlyIncome[msg.sender][monthTimestamp], msg.sender);
        
        // Authorize user to decrypt
        FHE.allowThis(encryptedAmount);
        FHE.allow(encryptedAmount, msg.sender);
        
        emit IncomeAdded(msg.sender, index, source, date);

        _updateNetIncome(msg.sender);
        _updateGoals(msg.sender);
    }
    
    /// @notice Get income record count
    function getIncomeCount() external view returns (uint256) {
        return incomeCount[msg.sender];
    }
    
    /// @notice Get income record
    function getIncomeRecord(uint256 index) external view returns (IncomeRecord memory) {
        return incomeRecords[msg.sender][index];
    }
    
    // ============ Expense Functions ============
    
    /// @notice Add an expense record
    /// @param amount Encrypted expense amount
    /// @param inputProof Input proof for the encrypted amount
    /// @param category Expense category (e.g., "Food", "Transport", "Shopping")
    /// @param date Timestamp of the expense
    /// @param note Optional note
    function addExpense(
        externalEuint128 amount,
        bytes calldata inputProof,
        string memory category,
        uint256 date,
        string memory note
    ) external {
        euint128 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        uint256 index = expenseCount[msg.sender];
        expenseRecords[msg.sender][index] = ExpenseRecord({
            amount: encryptedAmount,
            category: category,
            date: date,
            note: note
        });
        
        expenseCount[msg.sender] = index + 1;
        
        // Update total expense
        if (!hasTotalExpense[msg.sender]) {
            totalExpense[msg.sender] = encryptedAmount;
            hasTotalExpense[msg.sender] = true;
        } else {
            euint128 current = totalExpense[msg.sender];
            totalExpense[msg.sender] = FHE.add(current, encryptedAmount);
        }
        FHE.allowThis(totalExpense[msg.sender]);
        FHE.allow(totalExpense[msg.sender], msg.sender);
        
        // Update category expense
        if (!hasCategoryExpense[msg.sender][category]) {
            categoryExpense[msg.sender][category] = encryptedAmount;
            hasCategoryExpense[msg.sender][category] = true;
        } else {
            euint128 current = categoryExpense[msg.sender][category];
            categoryExpense[msg.sender][category] = FHE.add(current, encryptedAmount);
        }
        FHE.allowThis(categoryExpense[msg.sender][category]);
        FHE.allow(categoryExpense[msg.sender][category], msg.sender);
        
        // Update monthly expense
        uint256 monthTimestamp = (date / 2592000) * 2592000;
        if (!hasMonthlyExpense[msg.sender][monthTimestamp]) {
            monthlyExpense[msg.sender][monthTimestamp] = encryptedAmount;
            hasMonthlyExpense[msg.sender][monthTimestamp] = true;
        } else {
            euint128 current = monthlyExpense[msg.sender][monthTimestamp];
            monthlyExpense[msg.sender][monthTimestamp] = FHE.add(current, encryptedAmount);
        }
        FHE.allowThis(monthlyExpense[msg.sender][monthTimestamp]);
        FHE.allow(monthlyExpense[msg.sender][monthTimestamp], msg.sender);
        
        // Authorize user to decrypt
        FHE.allowThis(encryptedAmount);
        FHE.allow(encryptedAmount, msg.sender);
        
        emit ExpenseAdded(msg.sender, index, category, date);

        _updateNetIncome(msg.sender);
        _updateBudgetState(msg.sender, category);
        _updateGoals(msg.sender);
    }
    
    /// @notice Get expense record count
    function getExpenseCount() external view returns (uint256) {
        return expenseCount[msg.sender];
    }
    
    /// @notice Get expense record
    function getExpenseRecord(uint256 index) external view returns (ExpenseRecord memory) {
        return expenseRecords[msg.sender][index];
    }
    
    // ============ Budget Functions ============
    
    /// @notice Set or update a budget
    /// @param amount Encrypted budget amount
    /// @param inputProof Input proof for the encrypted amount
    /// @param category Budget category
    /// @param period Budget period (0: weekly, 1: monthly, 2: yearly)
    /// @param startDate Start timestamp
    function setBudget(
        externalEuint128 amount,
        bytes calldata inputProof,
        string memory category,
        uint8 period,
        uint256 startDate
    ) external {
        euint128 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        budgets[msg.sender][category] = Budget({
            amount: encryptedAmount,
            category: category,
            period: period,
            startDate: startDate,
            active: true
        });
        
        // Add to categories list if not exists
        bool exists = false;
        for (uint256 i = 0; i < budgetCategories[msg.sender].length; i++) {
            if (keccak256(bytes(budgetCategories[msg.sender][i])) == keccak256(bytes(category))) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            budgetCategories[msg.sender].push(category);
        }
        
        // Authorize user to decrypt
        FHE.allowThis(encryptedAmount);
        FHE.allow(encryptedAmount, msg.sender);
        
        emit BudgetSet(msg.sender, category, period, startDate);

        _updateBudgetState(msg.sender, category);
    }
    
    /// @notice Get budget for a category
    function getBudget(string memory category) external view returns (Budget memory) {
        return budgets[msg.sender][category];
    }
    
    /// @notice Get budget execution (encrypted expense for category)
    function getBudgetExecution(string memory category) external view returns (euint128) {
        if (!hasCategoryExpense[msg.sender][category]) {
            return euint128.wrap(0);
        }
        return categoryExpense[msg.sender][category];
    }
    
    /// @notice Calculate budget remaining (encrypted)
    function getBudgetRemaining(string memory category) external view returns (euint128) {
        if (!hasBudgetRemaining[msg.sender][category]) {
            return euint128.wrap(0);
        }
        return budgetRemaining[msg.sender][category];
    }
    
    /// @notice Check if over budget (returns encrypted boolean)
    function isOverBudget(string memory category) external view returns (ebool) {
        if (!hasBudgetRemaining[msg.sender][category]) {
            return ebool.wrap(0);
        }
        return budgetOverStatus[msg.sender][category];
    }
    
    /// @notice Get number of budget categories
    function getBudgetCategoryCount() external view returns (uint256) {
        return budgetCategories[msg.sender].length;
    }
    
    /// @notice Get budget category at index
    function getBudgetCategory(uint256 index) external view returns (string memory) {
        return budgetCategories[msg.sender][index];
    }
    
    // ============ Analytics Functions ============
    
    /// @notice Get total income (encrypted)
    function getTotalIncome() external view returns (euint128) {
        if (!hasTotalIncome[msg.sender]) {
            return euint128.wrap(0);
        }
        return totalIncome[msg.sender];
    }
    
    /// @notice Get total expense (encrypted)
    function getTotalExpense() external view returns (euint128) {
        if (!hasTotalExpense[msg.sender]) {
            return euint128.wrap(0);
        }
        return totalExpense[msg.sender];
    }
    
    /// @notice Calculate net income (encrypted): income - expense
    function getNetIncome() external view returns (euint128) {
        if (!hasNetIncomeValue[msg.sender]) {
            return euint128.wrap(0);
        }
        return netIncomeValue[msg.sender];
    }
    
    /// @notice Get category income (encrypted)
    function getCategoryIncome(string memory category) external view returns (euint128) {
        if (!hasCategoryIncome[msg.sender][category]) {
            return euint128.wrap(0);
        }
        return categoryIncome[msg.sender][category];
    }
    
    /// @notice Get category expense (encrypted)
    function getCategoryExpense(string memory category) external view returns (euint128) {
        if (!hasCategoryExpense[msg.sender][category]) {
            return euint128.wrap(0);
        }
        return categoryExpense[msg.sender][category];
    }
    
    /// @notice Get monthly income (encrypted)
    function getMonthlyIncome(uint256 monthTimestamp) external view returns (euint128) {
        if (!hasMonthlyIncome[msg.sender][monthTimestamp]) {
            return euint128.wrap(0);
        }
        return monthlyIncome[msg.sender][monthTimestamp];
    }
    
    /// @notice Get monthly expense (encrypted)
    function getMonthlyExpense(uint256 monthTimestamp) external view returns (euint128) {
        if (!hasMonthlyExpense[msg.sender][monthTimestamp]) {
            return euint128.wrap(0);
        }
        return monthlyExpense[msg.sender][monthTimestamp];
    }
    
    // ============ Financial Analysis Functions ============
    
    /// @notice Calculate saving rate (encrypted): (netIncome / totalIncome) * 100
    /// @dev Note: FHE.div requires plaintext divisor, so we return encrypted netIncome and totalIncome
    /// The division should be done after decryption on the client side
    function getSavingRateRaw() external view returns (euint128, euint128) {
        euint128 income = hasTotalIncome[msg.sender] ? totalIncome[msg.sender] : euint128.wrap(0);
        euint128 netIncome = hasNetIncomeValue[msg.sender] ? netIncomeValue[msg.sender] : euint128.wrap(0);
        return (netIncome, income);
    }
    
    // ============ Goal Functions ============
    
    /// @notice Set a financial goal
    /// @param name Goal name
    /// @param goalType 0: savings goal, 1: expense goal
    /// @param targetAmount Encrypted target amount
    /// @param inputProof Input proof for the encrypted amount
    /// @param deadline Deadline timestamp
    /// @param note Optional note
    function setGoal(
        string memory name,
        uint8 goalType,
        externalEuint128 targetAmount,
        bytes calldata inputProof,
        uint256 deadline,
        string memory note
    ) external {
        euint128 encryptedAmount = FHE.fromExternal(targetAmount, inputProof);
        
        require(FHE.isInitialized(encryptedAmount), "Amount not initialized");
        require(goalType <= 1, "Invalid goal type");
        
        uint256 index = goalCount[msg.sender];
        goals[msg.sender][index] = Goal({
            name: name,
            goalType: goalType,
            targetAmount: encryptedAmount,
            deadline: deadline,
            note: note,
            active: true
        });
        
        goalCount[msg.sender] = index + 1;
        
        // Authorize user to decrypt
        FHE.allowThis(encryptedAmount);
        FHE.allow(encryptedAmount, msg.sender);
        
        emit GoalSet(msg.sender, index, name, goalType);

        _updateGoals(msg.sender);
    }
    
    /// @notice Get goal count
    function getGoalCount() external view returns (uint256) {
        return goalCount[msg.sender];
    }
    
    /// @notice Get goal
    function getGoal(uint256 index) external view returns (Goal memory) {
        return goals[msg.sender][index];
    }
    
    /// @notice Get goal progress (encrypted)
    /// @dev For savings goal: current savings / target
    /// @dev For expense goal: current expense / target (inverse, lower is better)
    function getGoalProgress(uint256 index) external view returns (euint128, euint128) {
        Goal memory goal = goals[msg.sender][index];
        if (!goal.active || !hasGoalProgress[msg.sender][index]) {
            return (euint128.wrap(0), goal.targetAmount);
        }

        return (goalProgressCurrent[msg.sender][index], goal.targetAmount);
    }
    
    /// @notice Check if goal is completed (encrypted boolean)
    function isGoalCompleted(uint256 index) external view returns (ebool) {
        if (!hasGoalProgress[msg.sender][index]) {
            return ebool.wrap(0);
        }
        return goalCompleted[msg.sender][index];
    }
}

