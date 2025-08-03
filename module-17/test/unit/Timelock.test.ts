import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { Timelock } from "../../typechain-types";

describe("Timelock", function () {
  async function deployTimelockFixture() {
    const [admin, proposer, executor, other] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    
    const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(
      minDelay,
      [proposer.address],
      [executor.address],
      admin.address
    );
    
    return { timelock, admin, proposer, executor, other, minDelay };
  }

  async function scheduleOperation(
    timelock: Timelock, 
    proposer: any, 
    delay: number
  ) {
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );
    
    return { target, value, data, predecessor, salt };
  }

  describe("Deployment", function () {
    it("Should set correct initial parameters", async function () {
      const { timelock, minDelay } = await loadFixture(deployTimelockFixture);
      
      expect(await timelock.getMinDelay()).to.equal(minDelay);
    });

    it("Should assign roles correctly", async function () {
      const { timelock, admin, proposer, executor } = 
        await loadFixture(deployTimelockFixture);
      
      const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
      const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
      const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
      
      expect(await timelock.hasRole(PROPOSER_ROLE, proposer.address)).to.be.true;
      expect(await timelock.hasRole(EXECUTOR_ROLE, executor.address)).to.be.true;
      expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Scheduling Operations", function () {
    it("Should schedule an operation", async function () {
      const { timelock, proposer, minDelay } = await loadFixture(deployTimelockFixture);
      
      const target = ethers.ZeroAddress;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.randomBytes(32);
      
      await expect(
        timelock.connect(proposer).schedule(
          target,
          value,
          data,
          predecessor,
          salt,
          minDelay
        )
      ).to.emit(timelock, "CallScheduled");
    });

    it("Should enforce proposer role", async function () {
      const { timelock, other, minDelay } = await loadFixture(deployTimelockFixture);
      
      const target = ethers.ZeroAddress;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.randomBytes(32);
      
      await expect(
        timelock.connect(other).schedule(
          target,
          value,
          data,
          predecessor,
          salt,
          minDelay
        )
      ).to.be.revertedWithCustomError(
        timelock,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should enforce minimum delay", async function () {
      const { timelock, proposer, minDelay } = await loadFixture(deployTimelockFixture);
      
      const target = ethers.ZeroAddress;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.randomBytes(32);
      
      await expect(
        timelock.connect(proposer).schedule(
          target,
          value,
          data,
          predecessor,
          salt,
          minDelay - 1 // Less than minimum
        )
      ).to.be.revertedWithCustomError(
        timelock,
        "TimelockInsufficientDelay"
      );
    });

    it("Should generate correct operation ID", async function () {
      const { timelock, proposer, minDelay } = await loadFixture(deployTimelockFixture);
      
      const target = ethers.ZeroAddress;
      const value = 0;
      const data = "0x";
      const predecessor = ethers.ZeroHash;
      const salt = ethers.randomBytes(32);
      
      const expectedId = await timelock.hashOperation(
        target,
        value,
        data,
        predecessor,
        salt
      );
      
      const tx = await timelock.connect(proposer).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        minDelay
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map(log => timelock.interface.parseLog(log))
        .find(log => log?.name === "CallScheduled");
      
      expect(event?.args.id).to.equal(expectedId);
    });
  });

  describe("Executing Operations", function () {
    it("Should execute after delay", async function () {
      const { timelock, proposer, executor, minDelay } = 
        await loadFixture(deployTimelockFixture);
      
      const op = await scheduleOperation(timelock, proposer, minDelay);
      
      // Wait for delay
      await time.increase(minDelay);
      
      await expect(
        timelock.connect(executor).execute(
          op.target,
          op.value,
          op.data,
          op.predecessor,
          op.salt
        )
      ).to.emit(timelock, "CallExecuted");
    });

    it("Should reject execution before delay", async function () {
      const { timelock, proposer, executor, minDelay } = 
        await loadFixture(deployTimelockFixture);
      
      const op = await scheduleOperation(timelock, proposer, minDelay);
      
      // Try to execute immediately
      await expect(
        timelock.connect(executor).execute(
          op.target,
          op.value,
          op.data,
          op.predecessor,
          op.salt
        )
      ).to.be.revertedWithCustomError(
        timelock,
        "TimelockUnexpectedOperationState"
      );
    });

    it("Should enforce executor role", async function () {
      const { timelock, proposer, other, minDelay } = 
        await loadFixture(deployTimelockFixture);
      
      const op = await scheduleOperation(timelock, proposer, minDelay);
      await time.increase(minDelay);
      
      await expect(
        timelock.connect(other).execute(
          op.target,
          op.value,
          op.data,
          op.predecessor,
          op.salt
        )
      ).to.be.revertedWithCustomError(
        timelock,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Cancelling Operations", function () {
    it("Should cancel scheduled operation", async function () {
      const { timelock, proposer, admin, executor, minDelay } = 
        await loadFixture(deployTimelockFixture);
      
      const op = await scheduleOperation(timelock, proposer, minDelay);
      const id = await timelock.hashOperation(
        op.target,
        op.value,
        op.data,
        op.predecessor,
        op.salt
      );
      
      // Grant CANCELLER_ROLE to proposer
      const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
      await timelock.connect(admin).grantRole(CANCELLER_ROLE, proposer.address);
      
      await expect(
        timelock.connect(proposer).cancel(id)
      ).to.emit(timelock, "Cancelled");
      
      // Should not be executable after cancellation
      await time.increase(minDelay);
      await expect(
        timelock.connect(executor).execute(
          op.target,
          op.value,
          op.data,
          op.predecessor,
          op.salt
        )
      ).to.be.revertedWithCustomError(
        timelock,
        "TimelockUnexpectedOperationState"
      );
    });
  });

  describe("Batch Operations", function () {
    it("Should schedule batch operations", async function () {
      const { timelock, proposer, minDelay } = 
        await loadFixture(deployTimelockFixture);
      
      const targets = [ethers.ZeroAddress, ethers.ZeroAddress];
      const values = [0, 0];
      const payloads = ["0x", "0x"];
      const predecessor = ethers.ZeroHash;
      const salt = ethers.randomBytes(32);
      
      await expect(
        timelock.connect(proposer).scheduleBatch(
          targets,
          values,
          payloads,
          predecessor,
          salt,
          minDelay
        )
      ).to.emit(timelock, "CallScheduled");
    });

    it("Should execute batch operations", async function () {
      const { timelock, proposer, executor, minDelay } = 
        await loadFixture(deployTimelockFixture);
      
      const targets = [ethers.ZeroAddress, ethers.ZeroAddress];
      const values = [0, 0];
      const payloads = ["0x", "0x"];
      const predecessor = ethers.ZeroHash;
      const salt = ethers.randomBytes(32);
      
      await timelock.connect(proposer).scheduleBatch(
        targets,
        values,
        payloads,
        predecessor,
        salt,
        minDelay
      );
      
      await time.increase(minDelay);
      
      await expect(
        timelock.connect(executor).executeBatch(
          targets,
          values,
          payloads,
          predecessor,
          salt
        )
      ).to.emit(timelock, "CallExecuted");
    });
  });

  describe("Helper Functions", function () {
    it("Should return correct remaining delay", async function () {
      const { timelock, proposer, minDelay } = 
        await loadFixture(deployTimelockFixture);
      
      const op = await scheduleOperation(timelock, proposer, minDelay);
      const id = await timelock.hashOperation(
        op.target,
        op.value,
        op.data,
        op.predecessor,
        op.salt
      );
      
      // Check initial remaining delay
      const remaining1 = await timelock.getRemainingDelay(id);
      expect(remaining1).to.be.closeTo(minDelay, 5);
      
      // Wait half the time
      await time.increase(minDelay / 2);
      
      const remaining2 = await timelock.getRemainingDelay(id);
      expect(remaining2).to.be.closeTo(minDelay / 2, 5);
      
      // Wait full time
      await time.increase(minDelay / 2);
      
      const remaining3 = await timelock.getRemainingDelay(id);
      expect(remaining3).to.equal(0);
    });

    it("Should return 0 for non-existent operations", async function () {
      const { timelock } = await loadFixture(deployTimelockFixture);
      
      const fakeId = ethers.randomBytes(32);
      const remaining = await timelock.getRemainingDelay(fakeId);
      expect(remaining).to.equal(0);
    });

    it("Should check operation states", async function () {
      const { timelock, proposer, minDelay } = 
        await loadFixture(deployTimelockFixture);
      
      const op = await scheduleOperation(timelock, proposer, minDelay);
      const id = await timelock.hashOperation(
        op.target,
        op.value,
        op.data,
        op.predecessor,
        op.salt
      );
      
      // Check states
      expect(await timelock.isOperation(id)).to.be.true;
      expect(await timelock.isOperationPending(id)).to.be.true;
      expect(await timelock.isOperationReady(id)).to.be.false;
      expect(await timelock.isOperationDone(id)).to.be.false;
      
      // After delay
      await time.increase(minDelay);
      
      expect(await timelock.isOperationReady(id)).to.be.true;
      expect(await timelock.isOperationPending(id)).to.be.true;
    });
  });

  describe("Access Control", function () {
    it("Should allow role management by admin", async function () {
      const { timelock, admin, other } = await loadFixture(deployTimelockFixture);
      
      const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
      
      await timelock.connect(admin).grantRole(PROPOSER_ROLE, other.address);
      expect(await timelock.hasRole(PROPOSER_ROLE, other.address)).to.be.true;
      
      await timelock.connect(admin).revokeRole(PROPOSER_ROLE, other.address);
      expect(await timelock.hasRole(PROPOSER_ROLE, other.address)).to.be.false;
    });

    it("Should allow self-administration", async function () {
      const { timelock, admin } = 
        await loadFixture(deployTimelockFixture);
      
      // Grant admin role to timelock itself
      const TIMELOCK_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
      await timelock.connect(admin).grantRole(
        TIMELOCK_ADMIN_ROLE, 
        await timelock.getAddress()
      );
      
      // Renounce external admin
      await timelock.connect(admin).renounceRole(
        TIMELOCK_ADMIN_ROLE,
        admin.address
      );
      
      // Now only timelock can manage itself
      expect(
        await timelock.hasRole(TIMELOCK_ADMIN_ROLE, admin.address)
      ).to.be.false;
      expect(
        await timelock.hasRole(TIMELOCK_ADMIN_ROLE, await timelock.getAddress())
      ).to.be.true;
    });
  });
});