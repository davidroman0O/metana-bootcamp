import { ethers } from "hardhat";
import type { GovernanceToken, DAOGovernor, Timelock } from "../../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export interface GovernanceFixture {
  token: GovernanceToken;
  timelock: Timelock;
  governor: DAOGovernor;
  deployer: SignerWithAddress;
  alice: SignerWithAddress;
  bob: SignerWithAddress;
  charlie: SignerWithAddress;
  dave: SignerWithAddress;
  eve: SignerWithAddress;
}

export async function deployGovernanceFixture(): Promise<GovernanceFixture> {
  const [deployer, alice, bob, charlie, dave, eve] = await ethers.getSigners();
  
  // Deploy token
  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  
  // Mint initial supply
  await token.mint(deployer.address, ethers.parseEther("10000000")); // 10M tokens
  
  // Deploy timelock
  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.deploy(
    3600, // 1 hour delay
    [], // proposers (will be governor)
    [ethers.ZeroAddress], // executors (anyone can execute)
    deployer.address // admin
  );
  await timelock.waitForDeployment();
  
  // Deploy governor
  const Governor = await ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(
    await token.getAddress(),
    await timelock.getAddress(),
    1, // 1 block voting delay
    50, // 50 blocks voting period
    ethers.parseEther("100000") // 1% proposal threshold
  );
  await governor.waitForDeployment();
  
  // Setup roles
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();
  
  await timelock.grantRole(proposerRole, await governor.getAddress());
  await timelock.grantRole(executorRole, await governor.getAddress());
  await timelock.grantRole(cancellerRole, await governor.getAddress());
  
  // Grant MINTER_ROLE to timelock so governance can mint tokens
  const MINTER_ROLE = await token.MINTER_ROLE();
  await token.grantRole(MINTER_ROLE, await timelock.getAddress());
  
  // Distribute tokens
  await token.transfer(alice.address, ethers.parseEther("2000000")); // 2M
  await token.transfer(bob.address, ethers.parseEther("1500000"));   // 1.5M
  await token.transfer(charlie.address, ethers.parseEther("1000000")); // 1M
  await token.transfer(dave.address, ethers.parseEther("500000"));    // 500k
  await token.transfer(eve.address, ethers.parseEther("100000"));     // 100k
  
  // Everyone delegates to themselves
  await token.connect(deployer).delegate(deployer.address);
  await token.connect(alice).delegate(alice.address);
  await token.connect(bob).delegate(bob.address);
  await token.connect(charlie).delegate(charlie.address);
  await token.connect(dave).delegate(dave.address);
  await token.connect(eve).delegate(eve.address);
  
  return {
    token,
    timelock,
    governor,
    deployer,
    alice,
    bob,
    charlie,
    dave,
    eve
  };
}

export async function deployMinimalGovernanceFixture(): Promise<{
  token: GovernanceToken;
  timelock: Timelock;
  governor: DAOGovernor;
  signers: SignerWithAddress[];
}> {
  const signers = await ethers.getSigners();
  const [deployer] = signers;
  
  // Deploy token
  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  
  // Mint initial supply
  await token.mint(deployer.address, ethers.parseEther("10000000"));
  
  // Deploy timelock
  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.deploy(
    3600,
    [],
    [ethers.ZeroAddress],
    deployer.address
  );
  await timelock.waitForDeployment();
  
  // Deploy governor
  const Governor = await ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(
    await token.getAddress(),
    await timelock.getAddress(),
    1,
    50,
    ethers.parseEther("100000")
  );
  await governor.waitForDeployment();
  
  // Setup roles
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  
  await timelock.grantRole(proposerRole, await governor.getAddress());
  await timelock.grantRole(executorRole, await governor.getAddress());
  
  // Delegate voting power
  await token.delegate(deployer.address);
  
  return { token, timelock, governor, signers };
}

export async function createProposalHelper(
  governor: DAOGovernor,
  proposer: SignerWithAddress,
  targets: string[],
  values: bigint[],
  calldatas: string[],
  description: string
): Promise<bigint> {
  const tx = await governor.connect(proposer).propose(
    targets,
    values,
    calldatas,
    description
  );
  
  const receipt = await tx.wait();
  const event = receipt?.logs
    .map(log => governor.interface.parseLog(log))
    .find(log => log?.name === "ProposalCreated");
  
  return event?.args.proposalId;
}

export async function executeProposalHelper(
  governor: DAOGovernor,
  targets: string[],
  values: bigint[],
  calldatas: string[],
  descriptionHash: string
): Promise<void> {
  const tx = await governor.execute(targets, values, calldatas, descriptionHash);
  await tx.wait();
}