// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CondominiumLib {
    enum TopicStatusEnum {
        IDLE,
        VOTTING,
        APPROVED,
        DENIED,
        DELETED,
        SPENT
    }

    enum TopicCategoryEnum {
        DECISION,
        SPENT,
        CHANGE_QUOTA,
        CHANGE_MANAGER
    }

    enum VoteOptionEnum {
        EMPTY,
        YES,
        NO,
        ABSTENTION
    }

    struct Resident {
        address wallet;
        uint32 residence;
        bool isCounselor;
        bool isManager;
        uint nextPayment;
    }

    struct ResidentBatch {
        Resident[] residents;
        uint total;
    }

    struct Topic {
        string title;
        string description;
        address author;
        address responsible;
        TopicCategoryEnum category;
        TopicStatusEnum status;
        uint amount;
        uint256 createDate;
        uint256 startDate;
        uint256 endDate;
    }

    struct TopicBatch {
        Topic[] topics;
        uint total;
    }

    struct Vote {
        address voter;
        uint32 residence;
        uint256 votedAt;
        VoteOptionEnum option;
    }

    struct TopicUpdate {
        bytes32 id;
        string title;
        TopicStatusEnum status;
        TopicCategoryEnum category;
    }

    struct TransferReceipt {
        address to;
        uint amount;
        string topic;
    }
}
