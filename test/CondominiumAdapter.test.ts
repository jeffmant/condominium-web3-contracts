import { expect } from "chai";
import { ethers } from "hardhat";
import { createMockedResident, mockResidents, mockVotes, MONTHLY_QUOTA, TopicCategoryEnum, TopicStatusEnum, VoteOptionEnum } from "./Condominium.test";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CondominiumAdapter", function () {
  async function deployAdapterFixture() {
    const accounts = await ethers.getSigners();
    const manager = accounts[0];

    const CondominiumAdapter = await ethers.getContractFactory("CondominiumAdapter");
    const adapter = await CondominiumAdapter.deploy();

    return { adapter, manager, accounts };
  }

  async function deployImplementationFixture() {
    const CondominiumImplementation = await ethers.getContractFactory("Condominium");
    const contract = await CondominiumImplementation.deploy();

    return { contract };
  }

  it("Should upgrade the contract", async function () {
    const { adapter } = await deployAdapterFixture();
    const { contract } = await deployImplementationFixture();

    await adapter.upgradeContract(await contract.getAddress());

    const implAddress = await adapter.getImplAddress();

    expect(implAddress).to.equal(await contract.getAddress());
  });

  it("Should not upgrade the contract if not the manager", async function () {
    const { adapter, accounts } = await deployAdapterFixture();
    const { contract } = await deployImplementationFixture();

    const intance = adapter.connect(accounts[1]);
    const upgradeContractPromise = intance.upgradeContract(await contract.getAddress());

    await expect(upgradeContractPromise).to.be.revertedWith(
      "Only the owner can call this function"
    );
  });

  it("Should get manager", async () => {
    const { adapter } = await deployAdapterFixture();
    const { contract } = await deployImplementationFixture();

    await adapter.upgradeContract(await contract.getAddress());

    const managerAddress = await adapter.getManager();

    expect(managerAddress).to.equal(await   contract.getManager());
  });
  
  it("Should not get manager (downgraded contract)", async () => {
    const { adapter } = await deployAdapterFixture();

    const getManagerPromise = adapter.getManager();

    await expect(getManagerPromise).to.be.revertedWith(
      "You must upgrade first"
    );
  });

  describe("Resident", () => {
    it("Should add resident", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      const accountIsResident = await contract.isResident(accounts[1].address);
  
      expect(accountIsResident).to.be.true;
    });
  
    it("Should not add resident (downgraded contract)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
  
      const addResidentPromise = mockResidents(adapter, 1, accounts);
  
      await expect(addResidentPromise).to.be.revertedWith(
        "You must upgrade first"
      )
    });
  
    it("Should remove resident (latest)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
      await adapter.removeResident(accounts[1].address);
  
      const accountIsResident = await contract.isResident(accounts[1].address);
  
      expect(accountIsResident).to.be.false;
    });

    it("Should remove resident (first)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 2, accounts);
      await adapter.removeResident(accounts[1].address);
  
      const accountIsResident = await contract.isResident(accounts[1].address);
  
      expect(accountIsResident).to.be.false;
    });
  
    it("Should not remove resident (downgraded contract)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const removeResidentPromise = adapter.removeResident(accounts[1].address);
  
      await expect(removeResidentPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });

    it("Should get resident", async () => {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      const resident = await adapter.getResident(accounts[1].address);
  
      expect(resident.wallet).to.equal(accounts[1].address);
    });

    it("Should not get resident (downgraded contract)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const getResidentPromise = adapter.getResident(accounts[1].address);
  
      await expect(getResidentPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });

    it("Should get residents", async () => {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 10, accounts);
  
      const result = await adapter.getResidents(1, 5);
  
      expect(result.residents).to.have.length(5);
      expect(result.total).to.equal(10);
    });

    it("Should not get resident (downgraded contract)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const getResidentsPromise = adapter.getResidents(1, 5);
  
      await expect(getResidentsPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  });

  describe("Counselor", () => {
    it("Should add counselor", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      await adapter.addCounselor(accounts[1].address);
  
      const addressIsCounselor = await contract.isCounselor(accounts[1].address);
  
      expect(addressIsCounselor).to.be.true;
    });
  
    it("Should not add counselor (downgraded contract)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const addCounselorPromise = adapter.addCounselor(accounts[1].address);
  
      await expect(addCounselorPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
    
    it("Should remove counselor (latest)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      await adapter.addCounselor(accounts[1].address);
      
      let addressIsCounselor = await contract.isCounselor(accounts[1].address);
      expect(addressIsCounselor).to.be.true;
  
      await adapter.removeCounselor(accounts[1].address);
      
      addressIsCounselor = await contract.isCounselor(accounts[1].address);
      expect(addressIsCounselor).to.be.false;
    });

    it("Should remove counselor (first)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 2, accounts);
  
      await adapter.addCounselor(accounts[1].address);
      await adapter.addCounselor(accounts[2].address);
  
      await adapter.removeCounselor(accounts[1].address);
      
      const resident = await contract.getResident(accounts[1].address);
      
      expect(resident.isCounselor).to.be.false;
    });
  
    it("Should not remove counselor (downgraded contract)", async function () {
      const { adapter, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 1, accounts);
  
      await adapter.addCounselor(accounts[1].address);
  
      await adapter.upgradeContract(ethers.ZeroAddress);
      
      const removeCounselorPromise = adapter.removeCounselor(accounts[1].address);
      
      await expect(removeCounselorPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  });

  describe("Topic", () => {
    it("Should create a topic", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const createdTopic = await contract.getTopic("Test Topic");
  
      expect(createdTopic.status).to.equal(TopicStatusEnum.IDLE);
    });
  
    it("Should not create a topic (downgraded contract)", async function () {
      const { adapter, manager } = await deployAdapterFixture();
  
      const createTopicPromise = adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await expect(createTopicPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  
    it("Should edit Topic", async () => {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.editTopic(
        "Test Topic", 
        "Topic Content 1",
        0, 
        manager.address
      );
  
      const editedTopic = await contract.getTopic("Test Topic");
  
      expect(editedTopic.description).to.be.equal("Topic Content 1");
    });
  
    it("Should not edit Topic (downgraded contract)", async () => {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const editTopicPromise = adapter.editTopic(
        "Test Topic", 
        "Topic Content 1",
        0, 
        manager.address
      );
  
      await expect(editTopicPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  
    it("Should remove topic (latest)", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.removeTopic("Test Topic");
      const topicExists = await contract.topicExists("Test Topic");
  
      expect(topicExists).to.be.false;
    });

    it("Should remove topic (first)", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic 1", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await adapter.createTopic(
        "Test Topic 2", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.removeTopic("Test Topic 1");
      const topicExists = await contract.topicExists("Test Topic 1");
  
      expect(topicExists).to.be.false;
    });
  
    it("Should not remove topic (downgraded contract)", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const removeTopicPromise = adapter.removeTopic("Test Topic");
  
      await expect(removeTopicPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });

    it("Should get topic", async () => {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const topic = await adapter.getTopic("Test Topic");
  
      expect(topic.title).to.equal("Test Topic");
    });

    it("Should not get topic (downgraded contract)", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.upgradeContract(ethers.ZeroAddress);

      const getTopicPromise = adapter.getTopic("Test Topic");
  
      await expect(getTopicPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });

    it("Should get topics", async () => {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const topics = await adapter.getTopics(1, 5);
  
      expect(topics.topics).to.have.length(5);
      expect(topics.total).to.equal(1);
    });

    it("Should not get topics (downgraded contract)", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.upgradeContract(ethers.ZeroAddress);

      const getTopicsPromise = adapter.getTopics(1, 5);
  
      await expect(getTopicsPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  });

  describe("Voting", () => {
  
    it("Should open the voting on a topic", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      expect((await contract.getTopic("Test Topic")).status).to.equal(TopicStatusEnum.VOTTING);
    });
  
    it("Should not open the voting (downgraded contract)", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const openVotingPromise = adapter.openVoting("Test Topic");
  
      await expect(openVotingPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  
    it("Should vote on a topic", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      await adapter.vote("Test Topic", VoteOptionEnum.YES);
      const numberOfVotes = await contract.numberOfVotes("Test Topic");
  
      expect(numberOfVotes).to.equal(1);
    });
  
    it("Should not vote on a topic (downgraded contract)", async function () {
      const { adapter, manager } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const votePromise = adapter.vote("Test Topic", VoteOptionEnum.YES);
  
      await expect(votePromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  
    it("Should close the voting (decision approved)", async function () {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 5, accounts);
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockVotes(adapter, 5, accounts, VoteOptionEnum.YES);
  
      const closeVotingPromise = adapter.closeVoting("Test Topic");
      
      await expect(closeVotingPromise).to.emit(adapter, "TopicChanged");
      expect((await contract.getTopic("Test Topic")).status).to.equal(TopicStatusEnum.APROVED);
    });
  
    it("Should close the voting (decision denied)", async function () {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 5, accounts);
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockVotes(adapter, 5, accounts, VoteOptionEnum.NO);
  
      const closeVotingPromise = adapter.closeVoting("Test Topic");
      
      await expect(closeVotingPromise).to.emit(adapter, "TopicChanged");
      expect((await contract.getTopic("Test Topic")).status).to.equal(TopicStatusEnum.DENIED);
    });
  
    it("Should close the voting (change manager)", async function () {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 15, accounts);
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.CHANGE_MANAGER, 
        0, 
        accounts[1].address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockVotes(adapter, 15, accounts, VoteOptionEnum.YES);
  
      const closeVotingPromise = adapter.closeVoting("Test Topic");
      
      await expect(closeVotingPromise).to.emit(adapter, "ManagerChanged").withArgs(accounts[1].address);
    });
  
    it("Should close the voting (change quota)", async function () {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 15, accounts);
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.CHANGE_QUOTA, 
        ethers.parseEther("0.02"), 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockVotes(adapter, 15, accounts, VoteOptionEnum.YES);
  
      const closeVotingPromise = adapter.closeVoting("Test Topic");
      
      await expect(closeVotingPromise).to.emit(adapter, "QuotaChanged").withArgs(ethers.parseEther("0.02"));
    });
  
    it("Should not close the voting (downgraded contract)", async function () {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockResidents(adapter, 5, accounts);
      await mockVotes(adapter, 5, accounts, VoteOptionEnum.YES);
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const closeVotingPromise = adapter.closeVoting("Test Topic");
      
      await expect(closeVotingPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });

    it("Should get votes", async () => {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 15, accounts);
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockVotes(adapter, 15, accounts, VoteOptionEnum.YES);
  
      const votes = await adapter.getVotes("Test Topic");
  
      expect(votes).to.have.length(15);
    });

    it("Should not get votes (downgraded contract)", async function () {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockResidents(adapter, 5, accounts);
      await mockVotes(adapter, 5, accounts, VoteOptionEnum.YES);
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const getVotesPromise = adapter.getVotes("Test Topic");
      
      await expect(getVotesPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  });

  describe("Payment", () => {
    it("Should transfer the topic amount", async () => {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 15, accounts);
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT, 
        ethers.parseEther("0.05"), 
        accounts[1].address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockVotes(adapter, 15, accounts, VoteOptionEnum.YES);
  
      await adapter.closeVoting("Test Topic");
  
      await adapter.transfer("Test Topic", ethers.parseEther("0.05"));
  
      const topic = await contract.getTopic("Test Topic");
  
      expect(topic.status).to.equal(TopicStatusEnum.SPENT);
    });
  
    it("Should not transfer (downgraded contract)", async () => {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await mockResidents(adapter, 15, accounts);
  
      await adapter.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT, 
        ethers.parseEther("0.05"), 
        accounts[1].address
      );
  
      await adapter.openVoting("Test Topic");
  
      await mockVotes(adapter, 15, accounts, VoteOptionEnum.YES);
  
      await adapter.closeVoting("Test Topic");
  
      await adapter.upgradeContract(ethers.ZeroAddress);
  
      const transferPromise = adapter.transfer("Test Topic", ethers.parseEther("0.05"));
  
      await expect(transferPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  
    it("Should pay the quota", async () => {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await createMockedResident(adapter, accounts[1], 31904, false);
      const accountInstance = adapter.connect(accounts[1]);
  
      await accountInstance.payQuota(31904, { value: MONTHLY_QUOTA });
  
      const paidQuota = (await contract.getResident(accounts[1].address)).nextPayment;
  
      const blockTimestamp = +(await time.latest()).toString();
  
      expect(paidQuota >= blockTimestamp).to.be.true;
    });
  
    it("Should not pay the quota (downgraded contract)", async () => {
      const { adapter, manager, accounts } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      await createMockedResident(adapter, accounts[1], 31904, false);
      const accountInstance = adapter.connect(accounts[1]);
  
      await adapter.upgradeContract(ethers.ZeroAddress);
      
      const paidQuotaPromise = accountInstance.payQuota(31904, { value: MONTHLY_QUOTA });
  
      await expect(paidQuotaPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });

    it("Should get quota", async () => {
      const { adapter } = await deployAdapterFixture();
      const { contract } = await deployImplementationFixture();
  
      await adapter.upgradeContract(await contract.getAddress());
  
      const quota = await adapter.getQuota();
  
      expect(quota).to.equal(MONTHLY_QUOTA);
    });
    
    it("Should not get quota (downgraded contract)", async () => {
      const { adapter } = await deployAdapterFixture();
  
      const getQuotaPromise = adapter.getQuota();
  
      await expect(getQuotaPromise).to.be.revertedWith(
        "You must upgrade first"
      );
    });
  });
});
