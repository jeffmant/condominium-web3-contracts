// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CondominiumLib } from "./Condominium.lib.sol";
import { ICondominium } from "./ICondominium.sol";

contract CondominiumAdapter {
  ICondominium private contractImplementation;
  address public immutable owner;

  event QuotaChanged(uint amount);
  event ManagerChanged(address manager);
  event TopicChanged(
    bytes32 indexed topicId, 
    string title, 
    CondominiumLib.TopicStatusEnum indexed status
  );
  event Transfer(address to, uint indexed amount, string topic);

  constructor() {
    owner = msg.sender;
  }

  modifier upgraded() {
    require(address(contractImplementation) != address(0), "You must upgrade first");
    _;
  }

  function getImplAddress() external view returns (address) {
    return address(contractImplementation);
  }
  
  function upgradeContract(address newImplementation) external {
    require(msg.sender == owner, "Only the owner can call this function");
    
    contractImplementation = ICondominium(newImplementation);
  }

  function addResident(address resident, uint32 residence) external upgraded {
    return contractImplementation.addResident(resident, residence);
  }

  function removeResident(address resident) external upgraded {
    return contractImplementation.removeResident(resident);
  }
    
  function addCounselor(address counselor) external upgraded {
    return contractImplementation.addCounselor(counselor);
  }
  
  function removeCounselor(address counselor) external upgraded {
    return contractImplementation.removeCounselor(counselor);
  }
    
  function createTopic(
    string memory title, 
    string memory description,
    CondominiumLib.TopicCategoryEnum category,
    uint amount,
    address responsible
  ) external upgraded {
    return contractImplementation.createTopic(
      title, 
      description, 
      category, 
      amount, 
      responsible
    );
  }

  function editTopic(
    string memory topicTitleToEdit, 
    string memory description,
    uint amount,
    address responsible
  ) external upgraded {
    CondominiumLib.TopicUpdate memory topic = contractImplementation.editTopic(
      topicTitleToEdit, 
      description,
      amount, 
      responsible
    );

    emit TopicChanged(topic.id, topic.title, topic.status);
  }

  function removeTopic(string memory title) external upgraded {
    CondominiumLib.TopicUpdate memory topic = contractImplementation.removeTopic(title);
    
    emit TopicChanged(topic.id, topic.title, topic.status);
  }

  function openVoting(string memory title) external upgraded {
    CondominiumLib.TopicUpdate memory topic = contractImplementation.openVoting(title);
    
    emit TopicChanged(topic.id, topic.title, topic.status);
  }
  
  function vote(string memory title, CondominiumLib.VoteOptionEnum option) external upgraded {
    return contractImplementation.vote(title, option);
  }
  
  function closeVoting(string memory title) external upgraded {
    CondominiumLib.TopicUpdate memory topic = contractImplementation.closeVoting(title);
    
    emit TopicChanged(topic.id, topic.title, topic.status);

    if(topic.status == CondominiumLib.TopicStatusEnum.APPROVED) {
      if(topic.category == CondominiumLib.TopicCategoryEnum.CHANGE_MANAGER) {
        emit ManagerChanged(contractImplementation.getManager());
      }
      else if (topic.category == CondominiumLib.TopicCategoryEnum.CHANGE_QUOTA) {
        emit QuotaChanged(contractImplementation.getQuota());
      }
    }
  }

  function payQuota(uint32 residenceId) external payable upgraded {
    return contractImplementation.payQuota{value: msg.value}(residenceId);
  }

  function transfer(string memory topicTitle, uint amount) external payable upgraded {
    CondominiumLib.TransferReceipt memory transferReceipt = contractImplementation.transfer(topicTitle, amount);
    
    emit Transfer(transferReceipt.to, transferReceipt.amount, transferReceipt.topic);
  }

  function getManager() external view upgraded returns (address){
    return contractImplementation.getManager();
  }

  function getQuota() external view upgraded returns (uint) {
    return contractImplementation.getQuota();
  }

  function getResident(address resident) external view upgraded returns (CondominiumLib.Resident memory) {
    return contractImplementation.getResident(resident);
  }

  function getResidents(uint page, uint limit) external view upgraded returns (CondominiumLib.ResidentBatch memory) {
    return contractImplementation.getResidents(page, limit);
  }
  
  function getTopic(string memory topicTitle) external view upgraded returns (CondominiumLib.Topic memory) {
    return contractImplementation.getTopic(topicTitle);
  }

  function getTopics(uint page, uint limit) external view upgraded returns (CondominiumLib.TopicBatch memory) {
    return contractImplementation.getTopics(page, limit);
  }

  function getVotes(string memory topicTitle) external view upgraded returns (CondominiumLib.Vote[] memory){
    return contractImplementation.getVotes(topicTitle);
  }
}