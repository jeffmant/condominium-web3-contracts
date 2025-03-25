// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { CondominiumLib } from "./Condominium.lib.sol";

interface ICondominium {
    function addResident(address resident, uint32 residence) external;
   
    function removeResident(address resident) external;
    
    function addCounselor(address counselor) external;
   
    function removeCounselor(address counselor) external;
    
    function createTopic(
        string memory title, 
        string memory description, 
        CondominiumLib.TopicCategoryEnum category,
        uint amount,
        address responsible
    ) external;
    
    function editTopic(
        string memory topicTitleToEdit,
        string memory description,
        uint amount,
        address responsible
    ) external returns (CondominiumLib.TopicUpdate memory);
    
    function removeTopic(string memory title) external returns (CondominiumLib.TopicUpdate memory);

    function openVoting(string memory title) external returns (CondominiumLib.TopicUpdate memory);

    function vote(string memory title, CondominiumLib.VoteOptionEnum option) external;

    function closeVoting(string memory title) external returns (CondominiumLib.TopicUpdate memory);

    function payQuota(uint32 residenceId) external payable;

    function transfer(string memory topicTitle, uint amount) external payable returns (CondominiumLib.TransferReceipt memory);

    function getManager() external view returns (address);

    function getQuota() external view returns (uint);

    function getResident(address resident) external view returns (CondominiumLib.Resident memory);

    function getResidents(uint page, uint limit) external view returns (CondominiumLib.ResidentBatch memory); 
    
    function getTopic(string memory topicTitle) external view returns (CondominiumLib.Topic memory);

    function getTopics(uint page, uint limit) external view returns (CondominiumLib.TopicBatch memory); 

    function getVotes(string memory topicTitle) external view returns (CondominiumLib.Vote[] memory);
}