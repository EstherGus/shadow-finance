import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ShadowFinance, ShadowFinance__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ShadowFinance")) as ShadowFinance__factory;
  const contract = (await factory.deploy()) as ShadowFinance;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("ShadowFinance", function () {
  let signers: Signers;
  let shadowFinance: ShadowFinance;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract: shadowFinance, contractAddress } = await deployFixture());
  });

  describe("Income Functions", function () {
    it("should add income record", async function () {
      const amount = 5000; // 5000 in smallest unit
      const source = "Salary";
      const date = Math.floor(Date.now() / 1000);
      const note = "Monthly salary";

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(amount))
        .encrypt();

      const tx = await shadowFinance
        .connect(signers.alice)
        .addIncome(encryptedInput.handles[0], encryptedInput.inputProof, source, date, note);
      await tx.wait();

      const incomeCount = await shadowFinance.connect(signers.alice).getIncomeCount();
      expect(incomeCount).to.eq(1);

      const record = await shadowFinance.connect(signers.alice).getIncomeRecord(0);
      expect(record.source).to.eq(source);
      expect(record.date).to.eq(date);
      expect(record.note).to.eq(note);

      // Decrypt amount
      const decryptedAmount = await fhevm.userDecryptEuint(
        FhevmType.euint128,
        record.amount,
        contractAddress,
        signers.alice,
      );
      expect(decryptedAmount).to.eq(BigInt(amount));
    });

    it("should accumulate total income", async function () {
      const amount1 = 5000;
      const amount2 = 3000;

      // Add first income
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(amount1))
        .encrypt();

      await (
        await shadowFinance
          .connect(signers.alice)
          .addIncome(encrypted1.handles[0], encrypted1.inputProof, "Salary", Math.floor(Date.now() / 1000), "")
      ).wait();

      // Add second income
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(amount2))
        .encrypt();

      await (
        await shadowFinance
          .connect(signers.alice)
          .addIncome(encrypted2.handles[0], encrypted2.inputProof, "Bonus", Math.floor(Date.now() / 1000), "")
      ).wait();

      const totalIncome = await shadowFinance.connect(signers.alice).getTotalIncome();
      const decryptedTotal = await fhevm.userDecryptEuint(
        FhevmType.euint128,
        totalIncome,
        contractAddress,
        signers.alice,
      );

      expect(decryptedTotal).to.eq(BigInt(amount1 + amount2));
    });
  });

  describe("Expense Functions", function () {
    it("should add expense record", async function () {
      const amount = 3000;
      const category = "Food";
      const date = Math.floor(Date.now() / 1000);
      const note = "Groceries";

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(amount))
        .encrypt();

      const tx = await shadowFinance
        .connect(signers.alice)
        .addExpense(encryptedInput.handles[0], encryptedInput.inputProof, category, date, note);
      await tx.wait();

      const expenseCount = await shadowFinance.connect(signers.alice).getExpenseCount();
      expect(expenseCount).to.eq(1);

      const record = await shadowFinance.connect(signers.alice).getExpenseRecord(0);
      expect(record.category).to.eq(category);
      expect(record.date).to.eq(date);
      expect(record.note).to.eq(note);

      const decryptedAmount = await fhevm.userDecryptEuint(
        FhevmType.euint128,
        record.amount,
        contractAddress,
        signers.alice,
      );
      expect(decryptedAmount).to.eq(BigInt(amount));
    });

    it("should accumulate total expense", async function () {
      const amount1 = 2000;
      const amount2 = 1000;

      // Add first expense
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(amount1))
        .encrypt();

      await (
        await shadowFinance
          .connect(signers.alice)
          .addExpense(encrypted1.handles[0], encrypted1.inputProof, "Food", Math.floor(Date.now() / 1000), "")
      ).wait();

      // Add second expense
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(amount2))
        .encrypt();

      await (
        await shadowFinance
          .connect(signers.alice)
          .addExpense(encrypted2.handles[0], encrypted2.inputProof, "Transport", Math.floor(Date.now() / 1000), "")
      ).wait();

      const totalExpense = await shadowFinance.connect(signers.alice).getTotalExpense();
      const decryptedTotal = await fhevm.userDecryptEuint(
        FhevmType.euint128,
        totalExpense,
        contractAddress,
        signers.alice,
      );

      expect(decryptedTotal).to.eq(BigInt(amount1 + amount2));
    });
  });

  describe("Budget Functions", function () {
    it("should set budget", async function () {
      const amount = 4000;
      const category = "Food";
      const period = 1; // monthly
      const startDate = Math.floor(Date.now() / 1000);

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(amount))
        .encrypt();

      const tx = await shadowFinance
        .connect(signers.alice)
        .setBudget(encryptedInput.handles[0], encryptedInput.inputProof, category, period, startDate);
      await tx.wait();

      const budget = await shadowFinance.connect(signers.alice).getBudget(category);
      expect(budget.category).to.eq(category);
      expect(budget.period).to.eq(period);
      expect(budget.active).to.eq(true);

      const decryptedAmount = await fhevm.userDecryptEuint(
        FhevmType.euint128,
        budget.amount,
        contractAddress,
        signers.alice,
      );
      expect(decryptedAmount).to.eq(BigInt(amount));
    });

    it("should calculate budget remaining", async function () {
      const budgetAmount = 4000;
      const expenseAmount = 3000;

      // Set budget
      const encryptedBudget = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(budgetAmount))
        .encrypt();

      await (
        await shadowFinance
          .connect(signers.alice)
          .setBudget(encryptedBudget.handles[0], encryptedBudget.inputProof, "Food", 1, Math.floor(Date.now() / 1000))
      ).wait();

      // Add expense
      const encryptedExpense = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(expenseAmount))
        .encrypt();

      await (
        await shadowFinance
          .connect(signers.alice)
          .addExpense(encryptedExpense.handles[0], encryptedExpense.inputProof, "Food", Math.floor(Date.now() / 1000), "")
      ).wait();

      const remaining = await shadowFinance.connect(signers.alice).getBudgetRemaining("Food");
      const decryptedRemaining = await fhevm.userDecryptEuint(
        FhevmType.euint128,
        remaining,
        contractAddress,
        signers.alice,
      );

      expect(decryptedRemaining).to.eq(BigInt(budgetAmount - expenseAmount));
    });
  });

  describe("Analytics Functions", function () {
    it("should calculate net income", async function () {
      const incomeAmount = 5000;
      const expenseAmount = 3000;

      // Add income
      const encryptedIncome = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(incomeAmount))
        .encrypt();

      await (
        await shadowFinance
          .connect(signers.alice)
          .addIncome(encryptedIncome.handles[0], encryptedIncome.inputProof, "Salary", Math.floor(Date.now() / 1000), "")
      ).wait();

      // Add expense
      const encryptedExpense = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(expenseAmount))
        .encrypt();

      await (
        await shadowFinance
          .connect(signers.alice)
          .addExpense(encryptedExpense.handles[0], encryptedExpense.inputProof, "Food", Math.floor(Date.now() / 1000), "")
      ).wait();

      const netIncome = await shadowFinance.connect(signers.alice).getNetIncome();
      const decryptedNet = await fhevm.userDecryptEuint(
        FhevmType.euint128,
        netIncome,
        contractAddress,
        signers.alice,
      );

      expect(decryptedNet).to.eq(BigInt(incomeAmount - expenseAmount));
    });
  });

  describe("Goal Functions", function () {
    it("should set savings goal", async function () {
      const targetAmount = 10000;
      const name = "Emergency Fund";
      const deadline = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add128(BigInt(targetAmount))
        .encrypt();

      const tx = await shadowFinance
        .connect(signers.alice)
        .setGoal(name, 0, encryptedInput.handles[0], encryptedInput.inputProof, deadline, "");
      await tx.wait();

      const goalCount = await shadowFinance.connect(signers.alice).getGoalCount();
      expect(goalCount).to.eq(1);

      const goal = await shadowFinance.connect(signers.alice).getGoal(0);
      expect(goal.name).to.eq(name);
      expect(goal.goalType).to.eq(0);
      expect(goal.active).to.eq(true);

      const decryptedTarget = await fhevm.userDecryptEuint(
        FhevmType.euint128,
        goal.targetAmount,
        contractAddress,
        signers.alice,
      );
      expect(decryptedTarget).to.eq(BigInt(targetAmount));
    });
  });
});



