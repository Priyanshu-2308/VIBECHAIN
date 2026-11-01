// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IClubTreasury {
    function execute(uint256 id) external;
}

contract MaliciousRecipient {
    IClubTreasury public target;
    uint256 public targetProposalId;
    uint256 public attackCount;

    constructor(address _target) {
        target = IClubTreasury(_target);
    }

    function setTargetProposal(uint256 _id) external {
        targetProposalId = _id;
    }

    receive() external payable {
        if (targetProposalId > 0 && attackCount == 0) {
            attackCount++;
            // Attempt to re-enter execute
            target.execute(targetProposalId);
        }
    }
}

