import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from 'chai'
import { ethers } from "hardhat";
import { CondominiumAdapter, Condominium as CondominiumImplementation } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AddressLike } from "ethers";

export const MONTHLY_QUOTA = ethers.parseEther("0.01");

export enum TopicStatusEnum {
  IDLE,
  VOTTING,
  APROVED,
  DENIED,
  DELETED,
  SPENT
}

export enum VoteOptionEnum {
  EMPTY,
  YES,
  NO,
  ABSTENTION
}

export enum TopicCategoryEnum {
  DECISION,
  SPENT,
  CHANGE_QUOTA,
  CHANGE_MANAGER
}

export async function createMockedResident(
  contract: CondominiumImplementation | CondominiumAdapter,
  account: SignerWithAddress,
  residenceId: number,
  paidQuota: boolean = true
) {
  await contract.addResident(account.address, residenceId);
  const accountInstance = contract.connect(account);
  paidQuota && await accountInstance.payQuota(residenceId, { value: MONTHLY_QUOTA });
}

export async function mockResidents (
  contract: CondominiumImplementation | CondominiumAdapter,
  count: number,
  accounts: SignerWithAddress[]
) {
  for(let i=1; i <= count; i++) {
    const block = Math.ceil(i / (19 * 4));
    const floor = Math.ceil((i % (19 * 4)) / 4);
    const apartment = i % 4 === 0 ? 4 : i % 4;
    const residenceId = block * 10000 + floor * 100 + apartment;

    await createMockedResident(
      contract,
      accounts[i],
      residenceId
    );
  }
}

export async function mockVotes (
  adapter: CondominiumImplementation | CondominiumAdapter,
  count: number,
  accounts: SignerWithAddress[],
  voteOption: VoteOptionEnum
) {
  for(let i=1; i <= count; i++) {
    const instance = adapter.connect(accounts[i]);
    await instance.vote("Test Topic", voteOption)
  }
}

describe("Condominium", function () {
  async function deployFixture() {
    const [manager, resident, ...accounts] = await ethers.getSigners();

    const Condominium = await ethers.getContractFactory("Condominium");
    const contract = await Condominium.deploy();

    return { contract, manager, resident, accounts };
  }

  describe("Residents", () => {
    it("Should be residence", async function () {
      const { contract } = await loadFixture(deployFixture);
  
      const residenceExists = await contract.residenceExists(31904);

      expect(residenceExists).to.equal(true);
    });
  
    it("Should be resident", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);

      const accountIsResident = await contract.isResident(resident.address);
  
      expect(accountIsResident).to.equal(true);
    });
  
    it("Should add resident", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);

      const accountIsResident = await contract.isResident(resident.address);
  
      expect(accountIsResident).to.equal(true);
    });
  
    it("Should not add resident (permission)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      const instance = contract.connect(resident);
  
      const createdResidentPromise = createMockedResident(instance, resident, 31904);

      await expect(createdResidentPromise).to.be.revertedWith(
        "Only manager and counselor can call this function"
      );
    });
  
    it("Should not add resident (residence)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      const createdResidentPromise = createMockedResident(contract, resident, 51904);

      await expect(createdResidentPromise).to.be.revertedWith(
        "Residence does not exist"
      );
    });
  
    it("Should not add resident (already exists)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);

      const createdResidentPromise = createMockedResident(contract, resident, 31904);
  
      await expect(createdResidentPromise).to.be.revertedWith(
        "Resident already exists"
      );
    });
    
    it("Should not add resident (invalid address)", async function () {
      const { contract } = await loadFixture(deployFixture);

      const createdResidentPromise = createMockedResident(
        contract, 
        { address: ethers.ZeroAddress } as SignerWithAddress, 
        31904
      );
  
      await expect(createdResidentPromise).to.be.revertedWith(
         "Invalid Address"
      );
    });
  
    it("Should remove resident", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);
  
      await contract.removeResident(resident.address);

      const accountIsResident = await contract.isResident(resident.address);
  
      expect(accountIsResident).to.equal(false);
    });
  
    it("Should not remove resident (permission)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);
  
      const instance = contract.connect(resident);

      const removeResidentPromise = instance.removeResident(resident.address);
  
      await expect(removeResidentPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );
    });
  
    it("Should not remove resident (does not exist)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);

      const removeResidentPromise = contract.removeResident(resident.address);
  
      await expect(removeResidentPromise).to.be.revertedWith(
        "Resident does not exist"
      );
    });
  })

  describe('Counselor', () => {
    it("Should add counselor", async function () {
      const { contract, resident, accounts } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);
      await contract.addCounselor(resident.address);
  
      const residentIsCounselor = await contract.isCounselor(resident.address);
  
      const counselorInstance = contract.connect(resident);
  
      await createMockedResident(counselorInstance, accounts[3], 21904);
  
      expect(residentIsCounselor).to.equal(true);
    });
  
    it("Should not add counselor (permission)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);
  
      const instance = contract.connect(resident);

      const addCounselorPromise = instance.addCounselor(resident.address);
  
      await expect(addCounselorPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );
    });
  
    it("Should not add counselor (does not exist)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);

      const addCounselorPromise = contract.addCounselor(resident.address);
  
      await expect(addCounselorPromise).to.be.revertedWith(
        "The counselor must be a resident"
      );
    });

    it("Should not add counselor (invalid address)", async function () {
      const { contract } = await loadFixture(deployFixture);

      const addCounselorPromise = contract.addCounselor(ethers.ZeroAddress);
  
      await expect(addCounselorPromise).to.be.revertedWith(
        "Invalid Address"
      );
    });
  
    it("Should remove counselor", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);
      await contract.addCounselor(resident.address);
  
      const residentIsCounselor = await contract.isCounselor(resident.address);
  
      expect(residentIsCounselor).to.equal(true);
  
      await contract.removeCounselor(resident.address);
  
      const residentIsNotCounselor = await contract.isCounselor(resident.address);
  
      expect(residentIsNotCounselor).to.equal(false);
    });
  
    it("Should not remove counselor (permission)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);
      await contract.addCounselor(resident.address);
  
      const instance = contract.connect(resident);
      const removeCounselorPromise = instance.removeCounselor(resident.address);
  
      await expect(removeCounselorPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );

      it("Should not remove counselor (invalid address)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);

      const removeCounselorPromise = instance.removeCounselor(ethers.ZeroAddress);
  
      await expect(removeCounselorPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );
    });
  });
    
    it("Should not remove counselor (permission)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);
      const removeCounselorPromise = contract.removeCounselor(resident.address);
  
      await expect(removeCounselorPromise).to.be.revertedWith(
        "Counselor does not exist"
      );
    });
  });

  describe('Manager', () => {
    it("Should set manager", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      await contract.setManager(resident.address);
  
      const newManager = await contract.manager();
  
      expect(newManager).to.equal(resident.address);
    });
  
    it("Should not set manager (permission)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);
  
      const instance = contract.connect(resident);
      const setManagerPromise = instance.setManager(resident.address);
  
      await expect(setManagerPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );
    });
  
    it("Should not set manager (invalid address)", async function () {
      const { contract } = await loadFixture(deployFixture);

      const setManagerPromise = contract.setManager(ethers.ZeroAddress);
  
      await expect(setManagerPromise).to.be.revertedWith(
        "Invalid Address"
      );
    });
  });

  describe('Topic', () => {
    it("Should add a Topic (as owner)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content", 
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const topicHasCreated = await contract.topicExists("Test Topic");
  
      expect(topicHasCreated).to.equal(true);
    });
  
    it("Should add a Topic (as manager)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);
  
      const managerIntance = contract.connect(manager);
  
      await managerIntance.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const topicHasCreated = await contract.topicExists("Test Topic");
  
      expect(topicHasCreated).to.equal(true);
    });
    
    it("Should add a Topic (as resident)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
  
      await createMockedResident(contract, resident, 31904);
  
      const residentInstance = contract.connect(resident);
      
      await residentInstance.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const topicHasCreated = await contract.topicExists("Test Topic");
  
      expect(topicHasCreated).to.equal(true);
    });
  
    it("Should not add a Topic (permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
  
      const instance = contract.connect(resident);
      const createTopicPromise = instance.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      )
  
      await expect(createTopicPromise).to.be.revertedWith(
        "Only manager and residents can call this function"
      );
    });
  
    it("Should not add a Topic (duplicated)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      const createDuplicatedTopicPromise = contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      )
  
      await expect(createDuplicatedTopicPromise).to.be.revertedWith(
        "Topic already exists"
      );
    });
  
    it("Should not add a Topic (amount)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);
  
      const createTopicPromise = contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        10, 
        manager.address
      )

      await expect(createTopicPromise).to.be.revertedWith(
        "Wrong Category"
      );
    });

    it("Should not add a Topic (defaulter)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await createMockedResident(contract, resident, 31904, false);
      const residentInstance = contract.connect(resident);
  
      const createTopicPromise = residentInstance.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        10, 
        manager.address
      )

      await expect(createTopicPromise).to.be.revertedWith(
        "The quota must be paid"
      );
    });
  
    it("Should remove a Topic (as owner)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const topicHasCreated = await contract.topicExists("Test Topic");
      
      expect(topicHasCreated).to.equal(true);
  
      await contract.removeTopic("Test Topic");
  
      const topicHasRemoved = await contract.topicExists("Test Topic");
  
      expect(topicHasRemoved).to.equal(false);
    });
  
    it("Should not remove a Topic (permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const instance = contract.connect(resident);
      const removeTopicPromise = instance.removeTopic("Test Topic");
  
      await expect(removeTopicPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );
    });
  
    it("Should not remove a Topic (does not exists)", async function () {
      const { contract } = await loadFixture(deployFixture);

      const removeTopicPromise = contract.removeTopic("Test Topic");
  
      await expect(removeTopicPromise).to.be.revertedWith(
        "Topic does not exist"
      );
    });
  
    it("Should not remove a Topic (status)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await contract.openVoting("Test Topic");
      
      const removeTopicPromise = contract.removeTopic("Test Topic");
  
      await expect(removeTopicPromise).to.be.revertedWith(
        "Topic is not IDLE"
      );
    });

    it("Should edit Topic with correct params", async () => {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT,
        2, 
        manager.address
      );

      const foundTopic = await contract.getTopic("Test Topic"); 

      expect(!!foundTopic).to.be.true;
      expect(foundTopic.title).to.be.equal("Test Topic");
      expect(foundTopic.description).to.be.equal("Topic Content");
      expect(foundTopic.amount).to.be.equal(2);
      expect(foundTopic.responsible).to.be.equal(manager.address);

      await createMockedResident(contract, resident, 31904);

      await contract.editTopic(
        "Test Topic",
        "Updated Topic Content",
        3, 
        resident.address
      );

      const updatedTopic = await contract.getTopic("Test Topic"); 
      
      expect(!!updatedTopic).to.be.true;
      expect(updatedTopic.title).to.be.equal("Test Topic");
      expect(updatedTopic.description).to.be.equal("Updated Topic Content");
      expect(updatedTopic.amount).to.be.equal(3);
      expect(updatedTopic.responsible).to.be.equal(resident.address);
    });

    it("Should not edit Topic (permission)", async () => {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await createMockedResident(contract, resident, 31904);

      const residentInstance = contract.connect(resident);

      const editTopicPromise = residentInstance.editTopic(
        "Test Topic",
        "Topic Content 1",
        0, 
        manager.address
      );

      await expect(editTopicPromise).to.revertedWith(
        "Only the manager can call this function"
      );
    });

    it("Should not edit Topic (does not exist)", async () => {
      const { contract, manager } = await loadFixture(deployFixture);

      const editTopicPromise = contract.editTopic(
        "Test Topic",
        "Topic Content 1",
        0, 
        manager.address
      );

      await expect(editTopicPromise).to.revertedWith(
        "Topic does not exist"
      );
    });

    it("Should not edit Topic (category is different of IDLE)", async () => {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic",
        "Topic Content 1",
        TopicCategoryEnum.DECISION,
        0, 
        manager.address
      );

      await contract.openVoting("Test Topic");

      const editTopicPromise = contract.editTopic(
        "Test Topic",
        "Topic Content 1",
        0, 
        manager.address
      );

      await expect(editTopicPromise).to.revertedWith(
        "Topic status needs to be IDLE for edit"
      );
    });

    it("Should not edit Topic (same params)", async () => {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT,
        2, 
        manager.address
      );

      await contract.editTopic(
        "Test Topic", 
        "Topic Content",
        2, 
        manager.address
      );

      const updatedTopic = await contract.getTopic("Test Topic"); 
      
      expect(!!updatedTopic).to.be.true;
      expect(updatedTopic.title).to.be.equal("Test Topic");
      expect(updatedTopic.description).to.be.equal("Topic Content");
      expect(updatedTopic.amount).to.be.equal(2);
      expect(updatedTopic.responsible).to.be.equal(manager.address);
    });

    it("Should not edit Topic param (descripton)", async () => {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT,
        2, 
        manager.address
      );

      await contract.editTopic(
        "Test Topic", 
        "",
        2, 
        manager.address
      );

      const updatedTopic = await contract.getTopic("Test Topic"); 
      
      expect(!!updatedTopic).to.be.true;
      expect(updatedTopic.title).to.be.equal("Test Topic");
      expect(updatedTopic.description).to.be.equal("Topic Content");
      expect(updatedTopic.amount).to.be.equal(2);
      expect(updatedTopic.responsible).to.be.equal(manager.address);
    });

    it("Should not edit Topic param (amount)", async () => {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT,
        2, 
        manager.address
      );

      await contract.editTopic(
        "Test Topic", 
        "Topic Content",
        2, 
        manager.address
      );

      const updatedTopic = await contract.getTopic("Test Topic"); 
      
      expect(!!updatedTopic).to.be.true;
      expect(updatedTopic.title).to.be.equal("Test Topic");
      expect(updatedTopic.description).to.be.equal("Topic Content");
      expect(updatedTopic.amount).to.be.equal(2);
      expect(updatedTopic.responsible).to.be.equal(manager.address);
    });

    it("Should not edit Topic param (responsible as address(0))", async () => {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT,
        2, 
        manager.address
      );

      await contract.editTopic(
        "Test Topic", 
        "Topic Content",
        2, 
        ethers.ZeroAddress
      );

      const updatedTopic = await contract.getTopic("Test Topic"); 
      
      expect(!!updatedTopic).to.be.true;
      expect(updatedTopic.title).to.be.equal("Test Topic");
      expect(updatedTopic.description).to.be.equal("Topic Content");
      expect(updatedTopic.amount).to.be.equal(2);
      expect(updatedTopic.responsible).to.be.equal(manager.address);
    });

    it("Should not edit Topic param (responsible)", async () => {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT,
        2, 
        manager.address
      );

      await contract.editTopic(
        "Test Topic", 
        "Topic Content",
        2, 
        manager.address
      );

      const updatedTopic = await contract.getTopic("Test Topic"); 
      
      expect(!!updatedTopic).to.be.true;
      expect(updatedTopic.title).to.be.equal("Test Topic");
      expect(updatedTopic.description).to.be.equal("Topic Content");
      expect(updatedTopic.amount).to.be.equal(2);
      expect(updatedTopic.responsible).to.be.equal(manager.address);
    });
  });

  describe('Voting', () => {
    it("Should open voting", async function () {
      const { contract, manager } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await contract.openVoting("Test Topic");
  
      const topic = await contract.getTopic("Test Topic");
  
      expect(topic.status).to.equal(TopicStatusEnum.VOTTING);
    });
  
    it("Should not open voting (permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      const instance = contract.connect(resident);
      const openVotingPromise = instance.openVoting("Test Topic");
  
      await expect(openVotingPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );
    });
  
    it("Should not open voting (does not exists)", async function () {
      const { contract } = await loadFixture(deployFixture);

      const openVotingPromise = contract.openVoting("Test Topic");
  
      await expect(openVotingPromise).to.be.revertedWith(
        "Topic does not exist"
      );
    });
  
    it("Should not open voting (status)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await contract.openVoting("Test Topic");

      const openVotingPromise = contract.openVoting("Test Topic");
  
      await expect(openVotingPromise).to.be.revertedWith(
        "Topic is not IDLE"
      );
    });
  
    it("Should vote (yes option)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await contract.openVoting("Test Topic");
  
      await createMockedResident(contract, resident, 31904);
  
      const instance = contract.connect(resident);
  
      await instance.vote("Test Topic", VoteOptionEnum.YES, { from: resident.address });

      const numberOfVotes = await contract.numberOfVotes("Test Topic");
  
      expect(numberOfVotes).to.equal(1);
    });
    
    it("Should vote (no option)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await contract.openVoting("Test Topic");
  
      await createMockedResident(contract, resident, 31904);
  
      const instance = contract.connect(resident);
  
      await instance.vote("Test Topic", VoteOptionEnum.NO, { from: resident.address });
  
      const numberOfVotes = await contract.numberOfVotes("Test Topic");
      
      expect(numberOfVotes).to.equal(1);
    });
  
    it("Should not vote (duplicated vote)", async function () {
      const { contract, manager, resident, accounts } = await loadFixture(deployFixture);
  
      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );
  
      await contract.openVoting("Test Topic");
  
      await mockResidents(contract, 15, accounts);

      await mockVotes(contract, 15, accounts, VoteOptionEnum.YES);
  
      for (let index = 1; index <= 15; index++) {
        const intance = contract.connect(accounts[index]);
        const votePromise = intance.vote("Test Topic", VoteOptionEnum.NO)

        await expect(votePromise).to.be.revertedWith(
          "Resident already voted"
        );
      }
      
    });
  
    it("Should not vote (status)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await createMockedResident(contract, resident, 31904);

      const instance = contract.connect(resident);

      const votePromise = instance.vote("Test Topic", VoteOptionEnum.YES, { from: resident.address });

      await expect(votePromise).to.be.revertedWith(
        "Topic is not VOTTING"
      );
    });

    it("Should not vote (does not exists)", async function () {
      const { contract, resident } = await loadFixture(deployFixture);

      await createMockedResident(contract, resident, 31904);

      const instance = contract.connect(resident);

      const votePromise = instance.vote("Test Topic", VoteOptionEnum.YES, { from: resident.address });

      await expect(votePromise).to.be.revertedWith(
        "Topic does not exist"
      );
    });
  
    it("Should not vote (residence)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      const instance = contract.connect(resident);
      const votePromise = instance.vote("Test Topic", VoteOptionEnum.YES, { from: resident.address });

      await expect(votePromise).to.be.revertedWith(
        "Only manager and residents can call this function"
      );
    });

    it("Should not vote (empty)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await contract.openVoting("Test Topic");

      await createMockedResident(contract, resident, 31904);

      const instance = contract.connect(resident);
      const votePromise = instance.vote("Test Topic", VoteOptionEnum.EMPTY, { from: resident.address });

      await expect(votePromise).to.be.revertedWith(
        "Option must be YES, NO or ABSTENTION"
      );
    });

    it("Should close voting (change manager)", async function () {
      const { contract, accounts } = await loadFixture(deployFixture);

      await contract.addResident(accounts[1].address, 31904);

      await contract.setManager(accounts[1].address);

      const managerInstance = contract.connect(accounts[1]);

      await managerInstance.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.CHANGE_MANAGER, 
        0, 
        accounts[2]
      );

      await managerInstance.openVoting("Test Topic");

      await mockResidents(managerInstance, 15, accounts.slice(2));

      await mockVotes(managerInstance, 15, accounts.slice(2), VoteOptionEnum.YES);

      await managerInstance.closeVoting("Test Topic");

      const newManager = await contract.manager();

      expect(newManager).to.equal(accounts[2].address);
    });

    it("Should close voting (change quota)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.CHANGE_QUOTA, 
        MONTHLY_QUOTA,
        manager.address
      );

      await contract.openVoting("Test Topic");

      contract.vote("Test Topic", VoteOptionEnum.NO);

      await mockResidents(contract, 15, accounts);

      await mockVotes(contract, 15, accounts, VoteOptionEnum.YES);

      await contract.closeVoting("Test Topic");

      const monthlyQuota = await contract.monthlyQuota();

      expect(monthlyQuota).to.equal(MONTHLY_QUOTA);
    });

    it("Should close voting (spent)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.SPENT, 
        MONTHLY_QUOTA,
        manager.address
      );

      await contract.openVoting("Test Topic");

      contract.vote("Test Topic", VoteOptionEnum.NO);

      await mockResidents(contract, 15, accounts);

      await mockVotes(contract, 15, accounts, VoteOptionEnum.YES);

      await contract.closeVoting("Test Topic");

      expect((await contract.getTopic("Test Topic")).status).to.equal(TopicStatusEnum.APROVED);
    });

    it("Should close voting (approved)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await contract.openVoting("Test Topic");

      await mockResidents(contract, 5, accounts);

      await mockVotes(contract, 5, accounts, VoteOptionEnum.YES);

      await contract.closeVoting("Test Topic");

      const topic = await contract.getTopic("Test Topic");

      expect(topic.status).to.equal(TopicStatusEnum.APROVED);
    });

    it("Should close voting (denied)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await contract.openVoting("Test Topic");

      await mockResidents(contract, 5, accounts);

      await mockVotes(contract, 5, accounts, VoteOptionEnum.NO);

      await contract.closeVoting("Test Topic");

      const topic = await contract.getTopic("Test Topic");

      expect(topic.status).to.equal(TopicStatusEnum.DENIED);
    });
      
    it("Should close voting (abstention)", async function () {
      const { contract, manager, resident, accounts } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await contract.openVoting("Test Topic");

      await mockResidents(contract, 5, accounts);

      await mockVotes(contract, 5, accounts, VoteOptionEnum.YES);

      await createMockedResident(contract, resident, 31904);

      const intance = contract.connect(resident);

      await intance.vote("Test Topic", VoteOptionEnum.ABSTENTION, { from: resident.address });

      await contract.closeVoting("Test Topic");

      const topic = await contract.getTopic("Test Topic");

      expect(topic.status).to.equal(TopicStatusEnum.APROVED);
    });

    it("Should not close voting (permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await contract.openVoting("Test Topic");

      await createMockedResident(contract, resident, 31904);

      const instance = contract.connect(resident);
      const closeVotingPromise = instance.closeVoting("Test Topic");

      await expect(closeVotingPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );
    });

    it("Should not close voting (does not exists)", async function () {
      const { contract } = await loadFixture(deployFixture);

      const closeVotingPromise = contract.closeVoting("Test Topic");

      await expect(closeVotingPromise).to.be.revertedWith(
        "Topic does not exist"
      );
    });

    it("Should not close voting (insufficient number of votes)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      await contract.openVoting("Test Topic");

      await createMockedResident(contract, resident, 31904);

      const instance = contract.connect(resident);

      await instance.vote("Test Topic", VoteOptionEnum.YES);

      const closeVotingPromise = contract.closeVoting("Test Topic");

      await expect(closeVotingPromise).to.be.revertedWith(
        "Not enough votes"
      );
    });

    it("Should not close voting (status)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.createTopic(
        "Test Topic", 
        "Topic Content",
        TopicCategoryEnum.DECISION, 
        0, 
        manager.address
      );

      const closeVotingPromise = contract.closeVoting("Test Topic");

      await expect(closeVotingPromise).to.be.revertedWith(
        "Topic is not VOTTING"
      );
    });
    
    it("Should not get number of votes (Topic does not exist)", async function () {
      const { contract } = await loadFixture(deployFixture);
      
      const closeVotingPromise = contract.numberOfVotes("Test Topic");
  
      await expect(closeVotingPromise).to.be.revertedWith(
        "Topic does not exist"
      );
    });
  });

  describe("Quota", () => {
    it("Should pay the quota (without debts)", async () => {
      const { contract, resident } = await loadFixture(deployFixture);

      await createMockedResident(contract, resident, 31904);

      const residencePayment = (await contract.getResident(resident.address)).nextPayment;

      const lastBlockTimestamp = await time.latest();

      expect(residencePayment >= lastBlockTimestamp).to.true;
    });

    it("Should pay the quota (with debts)", async () => {
      const { contract, resident } = await loadFixture(deployFixture);

      await createMockedResident(contract, resident, 31904);

      const latestBlockTimestamp = await time.latest();

      await time.increaseTo(latestBlockTimestamp + 30*24*60*60);

      const residentInstance = contract.connect(resident);
      await residentInstance.payQuota(31904, { value: MONTHLY_QUOTA });

      const residencePayment = (await contract.getResident(resident.address)).nextPayment;

      expect(residencePayment >= (latestBlockTimestamp + 30*24*60*60)).to.true;

    });

    it("Should not pay the quota (residence does not exist)", async () => {
      const { contract } = await loadFixture(deployFixture);

      const payQuotaPromise = contract.payQuota(51904, { value: MONTHLY_QUOTA });

      await expect(payQuotaPromise).to.be.revertedWith(
        "Residence does not exist"
      );
    });

    it("Should not pay the quota (Insufficient value)", async () => {
      const { contract, resident } = await loadFixture(deployFixture);

      await createMockedResident(contract, resident, 31904, false);

      const residentInstance = contract.connect(resident);

      const payQuotaPromise = residentInstance.payQuota(31904, { value: ethers.parseEther("0.001") });

      await expect(payQuotaPromise).to.be.revertedWith(
        "Insufficient payment value"
      );
    });

    it("Should not pay the quota (duplicated payment)", async () => {
      const { contract, resident } = await loadFixture(deployFixture);

      await createMockedResident(contract, resident, 31904);

      const residentInstance = contract.connect(resident);

      const payQuotaPromise = residentInstance.payQuota(31904, { value: MONTHLY_QUOTA });

      await expect(payQuotaPromise).to.be.revertedWith(
        "You cannot pay twice in a month"
      );
    });
  });

  describe("Transfer", () => {
    it("Should not transfer (permission)", async () => {
      const { contract, accounts } = await loadFixture(deployFixture);

      const instance = contract.connect(accounts[1]);

      const transferPromise = instance.transfer("Test Topic", ethers.parseEther("0.02"));

      await expect(transferPromise).to.be.revertedWith(
        "Only the manager can call this function"
      );
    });
    
    it("Should not transfer (insufficient funds)", async () => {
      const { contract, accounts } = await loadFixture(deployFixture);

      const transferPromise = contract.transfer("Test Topic", ethers.parseEther("0.02"));

      await expect(transferPromise).to.be.revertedWith(
        "Insufficient funds"
      );
    });
    
    it("Should not transfer (wrong topic)", async () => {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await mockResidents(contract, 15, accounts);

      await contract.createTopic(
        "Test Topic",
        "Topic Description",
        TopicCategoryEnum.SPENT,
        ethers.parseEther("0.02"),
        manager.address
      );

      const transferPromise = contract.transfer("Test Topic", ethers.parseEther("0.02"));

      await expect(transferPromise).to.be.revertedWith(
        "Only approved spent topics can be used for transfers"
      );
    });
    
    it("Should not transfer (insufficient amount)", async () => {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await mockResidents(contract, 15, accounts);

      await contract.createTopic(
        "Test Topic",
        "Topic Description",
        TopicCategoryEnum.SPENT,
        ethers.parseEther("0.02"),
        manager.address
      );

      await contract.openVoting("Test Topic");

      await mockVotes(contract, 15, accounts, VoteOptionEnum.YES);

      await contract.closeVoting("Test Topic");

      const transferPromise = contract.transfer("Test Topic", ethers.parseEther("0.05"));

      await expect(transferPromise).to.be.revertedWith(
        "The amount must be up to topic amount"
      );
    });
    
    it("Should transfer", async () => {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await mockResidents(contract, 15, accounts);

      await contract.createTopic(
        "Test Topic",
        "Topic Description",
        TopicCategoryEnum.SPENT,
        ethers.parseEther("0.02"),
        manager.address
      );

      await contract.openVoting("Test Topic");

      await mockVotes(contract, 15, accounts, VoteOptionEnum.YES);

      await contract.closeVoting("Test Topic");

      await contract.transfer("Test Topic", ethers.parseEther("0.02"));

      const topic = await contract.getTopic("Test Topic");

      expect(topic.status).to.equal(TopicStatusEnum.SPENT);
    });
  });
});
