// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";

import { ICondominium } from "./ICondominium.sol";
import { CondominiumLib } from "./Condominium.lib.sol";

contract Condominium is ICondominium {
    uint public monthlyQuota = 0.01 ether;
    
    address public manager; //ownable
    
    mapping(uint32 => bool) public residences; //uint32 is the residence number, bool is the residence status
    
    CondominiumLib.Resident[] public residents;
    mapping(address => uint) private _residentIndex; //address is the resident address, uint is the index of array
    
    address[] public counselors; //address is the resident address, bool is the counselor status

    CondominiumLib.Topic[] public topics;
    mapping(bytes32 => uint) private _topicIndex;
    
    mapping(bytes32 => CondominiumLib.Vote[]) private _votes;

    mapping(uint32 => uint) private _nextPayment; // residence => last payment timestamp

    constructor() {
        manager = msg.sender;

        for (uint32 building = 1; building <= 4; building++) {
            for (uint32 floor = 1; floor <= 19; floor++) {
                for (uint32 apartment = 1; apartment <= 4; apartment++) {
                    uint32 residenceId = (building * 10000) + (floor * 100) + apartment;
                    residences[residenceId] = true;
                }
            }
        }
    }

    modifier onlyManager() {
        require(
            tx.origin == manager, 
            "Only the manager can call this function"
        );
        _;
    }

    modifier onlyCounselor() {
        require(
            tx.origin == manager || _isCounselor(tx.origin), 
            "Only manager and counselor can call this function"
        );
        _;
    }

    modifier onlyResident() {
        if(tx.origin != manager) {
            require(
                isResident(tx.origin), 
                "Only manager and residents can call this function"
            );

            CondominiumLib.Resident memory resident = _getResident(tx.origin);
            require(
                block.timestamp <= (resident.nextPayment), 
                "The quota must be paid"
            );
        }
        _;
    }

    modifier validAddress(address addr) {
        require(
            addr != address(0), 
            "Invalid Address"
        );
        _;
    }

    function isResident(address resident) public view returns (bool) {
        return _getResident(resident).residence > 0;
    }

    function residenceExists(uint32 residenceId) public view returns (bool) {
        return residences[residenceId];
    }

    function addResident(address resident, uint32 residenceId) external onlyCounselor validAddress(resident) {
        require(!isResident(resident), "Resident already exists");
        require(residenceExists(residenceId), "Residence does not exist");

        CondominiumLib.Resident memory newResidence = CondominiumLib.Resident({
            wallet: resident,
            residence: residenceId,
            isCounselor: false,
            isManager: resident == manager,
            nextPayment: 0
        });
        
        residents.push(newResidence);
        _residentIndex[resident] = residents.length - 1;
    }

    function removeResident(address resident) external onlyManager {
        require(isResident(resident), "Resident does not exist");
        
        uint residentIndex = _residentIndex[resident];

        if (residentIndex != residents.length - 1) {
            CondominiumLib.Resident memory latestResident = residents[residents.length - 1];
            residents[residentIndex] = latestResident;
            _residentIndex[latestResident.wallet] = residentIndex;
        }

        residents.pop();
        delete _residentIndex[resident];
    }

    function _addCounselor(address counselor) private {
        require(isResident(counselor), "The counselor must be a resident");
        
        counselors.push(counselor);
        residents[_residentIndex[counselor]].isCounselor = true;
    }

    function _removeCounselor(address counselor) private {
        uint index = 1000000;
        for(uint i=0; i < counselors.length; i++) {
            if(counselors[i] == counselor) {
                index = i;
                break;
            }
        }

        require(index != 1000000, "Counselor does not exist");

        if(index != counselors.length - 1) {
            counselors[index] = counselors[counselors.length - 1];
        }

        counselors.pop();
        residents[_residentIndex[counselor]].isCounselor = false;
    }


    function addCounselor(address residentAddress) external onlyManager validAddress(residentAddress) {
        _addCounselor(residentAddress);
    }

    function isCounselor(address residentAddress) external view returns (bool) {
        return _isCounselor(residentAddress);
    }

    function _isCounselor(address resident) private view returns (bool) {
        for(uint i=0; i < counselors.length; i++) {
            if(counselors[i] == resident) {
                return true;
            }
        } 
        return false;
    }

    function removeCounselor(address residentAddress) external onlyManager {
        require(_isCounselor(residentAddress), "Counselor does not exist");

        _removeCounselor(residentAddress);
    }

    function setManager(address newManager) external onlyManager validAddress(newManager) {
        manager = newManager;
    }

    function _getTopic(string memory title) private view returns (CondominiumLib.Topic memory) {
        bytes32 topicId = keccak256(bytes(title));
        uint index = _topicIndex[topicId];

        if(index < topics.length) {
            CondominiumLib.Topic memory foundTopic = topics[index];
            if(index > 0 || keccak256(bytes(foundTopic.title)) == topicId) {
                return foundTopic;
            }
        }

        return CondominiumLib.Topic({
            title: "",
            description: "",
            author: address(0),
            status: CondominiumLib.TopicStatusEnum.DELETED,
            createDate: 0,
            startDate: 0,
            endDate: 0,
            responsible: address(0),
            amount: 0,
            category: CondominiumLib.TopicCategoryEnum.DECISION
        });
    }

    function getTopic(string memory topicTitle) external view returns (CondominiumLib.Topic memory) {
        return _getTopic(topicTitle);
    }

    function getTopics(uint page, uint limit) external view returns (CondominiumLib.TopicBatch memory) {
        CondominiumLib.Topic[] memory foundTopics = new CondominiumLib.Topic[](limit);
        uint skip = (page -1 ) * limit;
        uint index = 0;

        for(uint i=skip; i < (skip + limit) && i < topics.length; i++) {
            if(topics[i].createDate > 0) {
                foundTopics[index++] = topics[i];
            }
        }

        return CondominiumLib.TopicBatch({
            topics: foundTopics,
            total: topics.length
        });
    }

    function topicExists(string memory title) public view returns (bool) {
        return _getTopic(title).createDate > 0;
    }

    function createTopic(
        string memory title, 
        string memory description,
        CondominiumLib.TopicCategoryEnum category,
        uint amount,
        address responsible
    ) external onlyResident {
        require(!topicExists(title), "Topic already exists");

        if(amount > 0) {
            require(
                category == CondominiumLib.TopicCategoryEnum.CHANGE_QUOTA ||
                category == CondominiumLib.TopicCategoryEnum.SPENT,
                "Wrong Category"
            );
        }

        CondominiumLib.Topic memory newTopic = CondominiumLib.Topic({
            title: title, 
            description: description, 
            author: tx.origin,
            category: category,
            status: CondominiumLib.TopicStatusEnum.IDLE,
            amount: amount,
            responsible: responsible != address(0) ? responsible : tx.origin,
            createDate: block.timestamp,
            startDate: 0,
            endDate: 0
        });

        bytes32 topicId = keccak256(bytes(title));
        _topicIndex[topicId] = topics.length;
        topics.push(newTopic);
    }

    function editTopic(
        string memory topicTitleToEdit,
        string memory description,
        uint amount,
        address responsible
    ) external onlyManager returns (CondominiumLib.TopicUpdate memory) {
        CondominiumLib.Topic memory topic = _getTopic(topicTitleToEdit);
        require(topic.createDate > 0, "Topic does not exist");
        require(topic.status == CondominiumLib.TopicStatusEnum.IDLE, "Topic status needs to be IDLE for edit");

        bytes32 topicId = keccak256(bytes(topicTitleToEdit));
        uint index = _topicIndex[topicId];

        if (bytes(description).length > 0) {
            topics[index].description = description;
        }

        if (amount != topic.amount) {
            topics[index].amount = amount;
        }

        if (responsible != address(0) && responsible != topic.responsible) {
            topics[index].responsible = responsible;
        }

        return CondominiumLib.TopicUpdate({
            id: topicId,
            title: topic.title,
            status: topic.status,
            category: topic.category
        });
    }

    function removeTopic(string memory title) external onlyManager returns (CondominiumLib.TopicUpdate memory) {
        CondominiumLib.Topic memory topic = _getTopic(title);
        require(topicExists(title), "Topic does not exist");
        require(topic.status == CondominiumLib.TopicStatusEnum.IDLE, "Topic is not IDLE");

        bytes32 topicId = keccak256(bytes(title));
        uint index = _topicIndex[topicId];

        if(index != topics.length - 1) {
            CondominiumLib.Topic memory lastTopic = topics[topics.length - 1];
            topics[index] = lastTopic;
            _topicIndex[keccak256(bytes(lastTopic.title))] = index;
        }

        topics.pop();
        delete _topicIndex[topicId];

        return CondominiumLib.TopicUpdate({
            id: topicId,
            title: topic.title,
            status: CondominiumLib.TopicStatusEnum.DELETED,
            category: topic.category
        });
    }

    function openVoting(string memory title) external onlyManager returns (CondominiumLib.TopicUpdate memory) {
        CondominiumLib.Topic memory topic = _getTopic(title);
        require(topicExists(title), "Topic does not exist");
        require(topic.status == CondominiumLib.TopicStatusEnum.IDLE, "Topic is not IDLE");

        bytes32 topicId = keccak256(bytes(title));
        uint index = _topicIndex[topicId];
        topics[index].status = CondominiumLib.TopicStatusEnum.VOTTING;
        topics[index].startDate = block.timestamp;

        return CondominiumLib.TopicUpdate({
            id: topicId,
            title: topic.title,
            status: CondominiumLib.TopicStatusEnum.VOTTING,
            category: topic.category
        });
    }

    function vote(string memory title, CondominiumLib.VoteOptionEnum option) external onlyResident {
        require(topicExists(title), "Topic does not exist");
        require(_getTopic(title).status == CondominiumLib.TopicStatusEnum.VOTTING, "Topic is not VOTTING");
        require(option != CondominiumLib.VoteOptionEnum.EMPTY, "Option must be YES, NO or ABSTENTION");

        bytes32 topicId = keccak256(bytes(title));
        uint32 residence = _getResident(tx.origin).residence;

        CondominiumLib.Vote[] memory residenceVotes = _votes[topicId];

        for (uint32 i = 0; i < residenceVotes.length; i++) {
            if (residenceVotes[i].residence == residence) {
                require(residenceVotes[i].voter != tx.origin, "Resident already voted");
            }
        }

        CondominiumLib.Vote memory newVote = CondominiumLib.Vote(tx.origin, residence, block.timestamp, option);

        _votes[topicId].push(newVote);
    }

    function closeVoting(string memory title) external onlyManager returns (CondominiumLib.TopicUpdate memory) {
        CondominiumLib.Topic memory topic = _getTopic(title);
        require(topicExists(topic.title), "Topic does not exist");
        require(topic.status == CondominiumLib.TopicStatusEnum.VOTTING, "Topic is not VOTTING");

        uint8 minimumVotes = 5;

        if(topic.category == CondominiumLib.TopicCategoryEnum.SPENT) {
            minimumVotes = 10;
        } else if (topic.category == CondominiumLib.TopicCategoryEnum.CHANGE_MANAGER) {
            minimumVotes = 15;
        } else if (topic.category == CondominiumLib.TopicCategoryEnum.CHANGE_QUOTA) {
            minimumVotes = 15;
        }

        require(numberOfVotes(title) >= minimumVotes, "Not enough votes");

        bytes32 topicId = keccak256(bytes(title));
        uint32 approvedVotes = 0;
        uint32 deniedVotes = 0;
        uint32 abstentionVotes = 0;
        CondominiumLib.Vote[] memory totalVotes = _votes[topicId];

        for (uint32 i = 0; i < totalVotes.length; i++) {
            if (totalVotes[i].option == CondominiumLib.VoteOptionEnum.NO) {
                deniedVotes++;
            } else if (totalVotes[i].option == CondominiumLib.VoteOptionEnum.YES) {
                approvedVotes++;
            } else {
                abstentionVotes++;
            }
        }

        CondominiumLib.TopicStatusEnum status = approvedVotes > deniedVotes ? 
            CondominiumLib.TopicStatusEnum.APPROVED : 
            CondominiumLib.TopicStatusEnum.DENIED;
        
        uint index = _topicIndex[topicId];
        topics[index].status = status;
        topics[index].endDate = block.timestamp;

        if(status == CondominiumLib.TopicStatusEnum.APPROVED) {
            if(topic.category == CondominiumLib.TopicCategoryEnum.CHANGE_QUOTA) {
                monthlyQuota = topic.amount;
            } else if (topic.category == CondominiumLib.TopicCategoryEnum.CHANGE_MANAGER) {
                if(isResident(manager)) {
                    residents[_residentIndex[manager]].isManager = false;
                }
                
                manager = topic.responsible;

                if(isResident(topic.responsible)) {
                    residents[_residentIndex[topic.responsible]].isManager = true;
                }
            }
        }

        return CondominiumLib.TopicUpdate({
            id: topicId,
            title: topic.title,
            status: status,
            category: topic.category
        });
    }

    function numberOfVotes(string memory title) public view returns (uint256) {
        require(topicExists(title), "Topic does not exist");

        bytes32 topicId = keccak256(bytes(title));
        return _votes[topicId].length;
    }

    function payQuota(uint32 residenceId) external payable {
        require(residenceExists(residenceId), "Residence does not exist");
        require(msg.value >= monthlyQuota, "Insufficient payment value");
        require(block.timestamp > _nextPayment[residenceId], "You cannot pay twice in a month");
    
        uint thirtyDays = 30*24*60*60;
        if(_nextPayment[residenceId] == 0) {
            _nextPayment[residenceId] = block.timestamp + thirtyDays;
        } else {
            _nextPayment[residenceId] += thirtyDays;
        }
    }

    function transfer(string memory topicTitle, uint amount) external payable onlyManager returns (CondominiumLib.TransferReceipt memory) {
        require(address(this).balance >= amount, "Insufficient funds");
        
        CondominiumLib.Topic memory topic = _getTopic(topicTitle);
        require(
            topic.status == CondominiumLib.TopicStatusEnum.APPROVED && 
            topic.category == CondominiumLib.TopicCategoryEnum.SPENT,
            "Only approved spent topics can be used for transfers"
        );
        require(topic.amount >= amount, "The amount must be up to topic amount");
        
        payable(topic.responsible).transfer(amount);
        
        bytes32 topicId = keccak256(bytes(topicTitle));
        uint index = _topicIndex[topicId];
        topics[index].status = CondominiumLib.TopicStatusEnum.SPENT;

        return CondominiumLib.TransferReceipt({
            to: topic.responsible,
            amount: amount,
            topic: topicTitle
        });
    }

    function getManager() external view returns (address) {
        return manager;
    }

    function getQuota() external view returns (uint) {
        return monthlyQuota;
    }

    function _getResident(address resident) private view returns (CondominiumLib.Resident memory) {
        uint residentIndex = _residentIndex[resident];

        if(residentIndex < residents.length) {
            CondominiumLib.Resident memory foundResident = residents[residentIndex];
            if (foundResident.wallet == resident) {
                foundResident.nextPayment = _nextPayment[foundResident.residence];
                return foundResident;
            }
        }

        return CondominiumLib.Resident({
            wallet: address(0),
            residence: 0,
            isCounselor: false,
            isManager: false,
            nextPayment: 0
        });
    }

    function getResident(address resident) external view returns (CondominiumLib.Resident memory) { 
        return _getResident(resident);
    }

    function getResidents(uint page, uint limit) external view returns (CondominiumLib.ResidentBatch memory) {
        CondominiumLib.Resident[] memory foundResidents = new CondominiumLib.Resident[](limit);
        uint skip = (page -1 ) * limit;
        uint index = 0;

        for(uint i=skip; i < (skip + limit) && i < residents.length; i++) {
            if(residents[i].wallet != address(0)) {
                foundResidents[index++] = _getResident(residents[i].wallet);
            }
        }

        return CondominiumLib.ResidentBatch({
            residents: foundResidents,
            total: residents.length
        });
    }

    function getVotes(string memory topicTitle) external view returns (CondominiumLib.Vote[] memory) {
        require(topicExists(topicTitle), "Topic does not exist");

        bytes32 topicId = keccak256(bytes(topicTitle));
        return _votes[topicId];
    }
 }
