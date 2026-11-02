// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClubTreasury
 * @notice Transparent, accountable, and autonomous club treasury.
 * Zero owner, zero admin, zero roles, zero upgradeability, zero backdoor.
 * Funds leave ONLY via the community-approved execute() function.
 */
contract ClubTreasury is ReentrancyGuard {
    // --- Immutable Parameters ---
    uint256 public immutable MEMBERSHIP_FEE;
    uint256 public immutable VOTING_PERIOD;
    uint256 public immutable EXECUTION_WINDOW;
    uint256 public immutable QUORUM_BPS;
    uint256 public immutable MAX_SPEND_BPS;

    // --- Membership State ---
    uint256 public memberCount;
    mapping(address => uint256) public joinedAt;

    // --- Proposal State ---
    enum ProposalStatus {
        Active,
        Passed,
        Rejected,
        Expired,
        Executed
    }

    struct Proposal {
        address proposer;
        address payable recipient;
        uint256 amount;
        string purpose;
        uint256 createdAt;
        uint256 votingEnds;
        uint256 expiresAt;
        uint256 snapshotMembers;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // --- Events ---
    event Contributed(address indexed from, uint256 amount);
    event Joined(address indexed member, uint256 feePaid);
    event Left(address indexed member);
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        address indexed recipient,
        uint256 amount,
        string purpose,
        uint256 createdAt,
        uint256 votingEnds,
        uint256 expiresAt,
        uint256 snapshotMembers
    );
    event Voted(uint256 indexed id, address indexed voter, bool support);
    event Executed(uint256 indexed id, address indexed recipient, uint256 amount, string purpose);

    // --- Custom Errors ---
    error InvalidConstructorParams(string reason);
    error NotMember();
    error AlreadyMember();
    error InsufficientMembershipFee();
    error InvalidRecipient();
    error InvalidAmount();
    error InvalidPurposeLength();
    error ExceedsMaxSpend();
    error ProposalDoesNotExist();
    error MustJoinBeforeProposal();
    error VotingClosed();
    error AlreadyVoted();
    error VotingStillActive();
    error ProposalAlreadyExecuted();
    error ProposalExpired();
    error ProposalDidNotPass();
    error QuorumNotMet();
    error InsufficientBalance();
    error TransferFailed();

    constructor(
        uint256 _membershipFee,
        uint256 _votingPeriod,
        uint256 _executionWindow,
        uint256 _quorumBps,
        uint256 _maxSpendBps
    ) {
        if (_membershipFee == 0) revert InvalidConstructorParams("MEMBERSHIP_FEE must be > 0");
        if (_votingPeriod < 60) revert InvalidConstructorParams("VOTING_PERIOD must be >= 60 seconds");
        if (_executionWindow < 3600) revert InvalidConstructorParams("EXECUTION_WINDOW must be >= 1 hour");
        if (_quorumBps == 0 || _quorumBps > 10000) revert InvalidConstructorParams("QUORUM_BPS must be 1..10000");
        if (_maxSpendBps == 0 || _maxSpendBps > 10000) revert InvalidConstructorParams("MAX_SPEND_BPS must be 1..10000");

        MEMBERSHIP_FEE = _membershipFee;
        VOTING_PERIOD = _votingPeriod;
        EXECUTION_WINDOW = _executionWindow;
        QUORUM_BPS = _quorumBps;
        MAX_SPEND_BPS = _maxSpendBps;
    }

    // --- Treasury Inflows ---

    receive() external payable {
        if (msg.value == 0) revert InvalidAmount();
        emit Contributed(msg.sender, msg.value);
    }

    function contribute() external payable {
        if (msg.value == 0) revert InvalidAmount();
        emit Contributed(msg.sender, msg.value);
    }

    // --- Membership Functions ---

    function join() external payable {
        if (joinedAt[msg.sender] > 0) revert AlreadyMember();
        if (msg.value < MEMBERSHIP_FEE) revert InsufficientMembershipFee();

        joinedAt[msg.sender] = block.timestamp;
        memberCount++;

        emit Joined(msg.sender, msg.value);
    }

    function leave() external {
        if (joinedAt[msg.sender] == 0) revert NotMember();

        joinedAt[msg.sender] = 0;
        memberCount--;

        emit Left(msg.sender);
    }

    // --- Governance Functions ---

    function propose(
        address payable recipient,
        uint256 amount,
        string calldata purpose
    ) external returns (uint256) {
        if (joinedAt[msg.sender] == 0) revert NotMember();
        if (recipient == address(0) || recipient == address(this)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        
        uint256 currentBalance = address(this).balance;
        uint256 maxSpend = (currentBalance * MAX_SPEND_BPS) / 10000;
        if (amount > maxSpend) revert ExceedsMaxSpend();

        uint256 purposeLen = bytes(purpose).length;
        if (purposeLen == 0 || purposeLen > 200) revert InvalidPurposeLength();

        proposalCount++;
        uint256 id = proposalCount;
        uint256 createdAt = block.timestamp;
        uint256 votingEnds = createdAt + VOTING_PERIOD;
        uint256 expiresAt = votingEnds + EXECUTION_WINDOW;
        uint256 snapshot = memberCount;

        proposals[id] = Proposal({
            proposer: msg.sender,
            recipient: recipient,
            amount: amount,
            purpose: purpose,
            createdAt: createdAt,
            votingEnds: votingEnds,
            expiresAt: expiresAt,
            snapshotMembers: snapshot,
            yesVotes: 0,
            noVotes: 0,
            executed: false
        });

        emit ProposalCreated(
            id,
            msg.sender,
            recipient,
            amount,
            purpose,
            createdAt,
            votingEnds,
            expiresAt,
            snapshot
        );

        return id;
    }

    function vote(uint256 id, bool support) external {
        if (id == 0 || id > proposalCount) revert ProposalDoesNotExist();
        if (joinedAt[msg.sender] == 0) revert NotMember();

        Proposal storage p = proposals[id];
        if (joinedAt[msg.sender] > p.createdAt) revert MustJoinBeforeProposal();
        if (block.timestamp > p.votingEnds) revert VotingClosed();
        if (hasVoted[id][msg.sender]) revert AlreadyVoted();

        hasVoted[id][msg.sender] = true;
        if (support) {
            p.yesVotes++;
        } else {
            p.noVotes++;
        }

        emit Voted(id, msg.sender, support);
    }

    function execute(uint256 id) external nonReentrant {
        if (id == 0 || id > proposalCount) revert ProposalDoesNotExist();

        Proposal storage p = proposals[id];
        if (p.executed) revert ProposalAlreadyExecuted();
        if (block.timestamp <= p.votingEnds) revert VotingStillActive();
        if (block.timestamp > p.expiresAt) revert ProposalExpired();

        if (p.yesVotes <= p.noVotes) revert ProposalDidNotPass();
        if ((p.yesVotes * 10000) < (p.snapshotMembers * QUORUM_BPS)) revert QuorumNotMet();

        uint256 currentBalance = address(this).balance;
        if (p.amount > currentBalance) revert InsufficientBalance();
        if (p.amount > (currentBalance * MAX_SPEND_BPS) / 10000) revert ExceedsMaxSpend();

        // Checks-Effects-Interactions: set executed before external transfer
        p.executed = true;

        (bool success, ) = p.recipient.call{value: p.amount}("");
        if (!success) revert TransferFailed();

        emit Executed(id, p.recipient, p.amount, p.purpose);
    }

    // --- Views ---

    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function isMember(address account) external view returns (bool) {
        return joinedAt[account] > 0;
    }

    function status(uint256 id) external view returns (ProposalStatus) {
        if (id == 0 || id > proposalCount) revert ProposalDoesNotExist();

        Proposal storage p = proposals[id];
        if (p.executed) {
            return ProposalStatus.Executed;
        }

        if (block.timestamp <= p.votingEnds) {
            return ProposalStatus.Active;
        }

        bool passedVotes = p.yesVotes > p.noVotes &&
            ((p.yesVotes * 10000) >= (p.snapshotMembers * QUORUM_BPS));

        if (!passedVotes) {
            return ProposalStatus.Rejected;
        }

        if (block.timestamp > p.expiresAt) {
            return ProposalStatus.Expired;
        }

        return ProposalStatus.Passed;
    }

    function getProposal(uint256 id)
        external
        view
        returns (
            address proposer,
            address payable recipient,
            uint256 amount,
            string memory purpose,
            uint256 createdAt,
            uint256 votingEnds,
            uint256 expiresAt,
            uint256 snapshotMembers,
            uint256 yesVotes,
            uint256 noVotes,
            bool executed
        )
    {
        if (id == 0 || id > proposalCount) revert ProposalDoesNotExist();

        Proposal storage p = proposals[id];
        return (
            p.proposer,
            p.recipient,
            p.amount,
            p.purpose,
            p.createdAt,
            p.votingEnds,
            p.expiresAt,
            p.snapshotMembers,
            p.yesVotes,
            p.noVotes,
            p.executed
        );
    }
}

