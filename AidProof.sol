// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AidProof TN - Transparent Aid Distribution Smart Contract
/// @notice Logs and verifies aid delivery events on-chain with role-based access control
contract AidProof {
    // Admin address (deployer)
    address public admin;

    // Role mappings
    mapping(address => bool) public ngos;
    mapping(address => bool) public verifiers;

    // Aid record structure
    struct AidEntry {
        uint256 id;
        address submittedBy;
        string beneficiaryId;
        string aidType;
        string location;
        string timestamp;
        bool verified;
    }

    uint256 public aidCounter = 0;
    mapping(uint256 => AidEntry) public aidLogs;

    // Events
    event NGOAdded(address ngo);
    event VerifierAdded(address verifier);
    event AidLogged(uint256 indexed id, address indexed submittedBy);
    event AidVerified(uint256 indexed id, address indexed verifier);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyNGO() {
        require(ngos[msg.sender], "Not authorized NGO");
        _;
    }

    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Not authorized verifier");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // Add authorized NGO
    function addNGO(address ngo) external onlyAdmin {
        ngos[ngo] = true;
        emit NGOAdded(ngo);
    }

    // Add verifier (auditor or trusted role)
    function addVerifier(address verifier) external onlyAdmin {
        verifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    // NGOs log aid delivery
    function logAid(
        string memory _beneficiaryId,
        string memory _aidType,
        string memory _location,
        string memory _timestamp
    ) external onlyNGO {
        aidCounter++;
        aidLogs[aidCounter] = AidEntry(
            aidCounter,
            msg.sender,
            _beneficiaryId,
            _aidType,
            _location,
            _timestamp,
            false
        );
        emit AidLogged(aidCounter, msg.sender);
    }

    // Verifier approves a logged aid entry
    function verifyAid(uint256 _id) external onlyVerifier {
        require(_id > 0 && _id <= aidCounter, "Invalid entry ID");
        require(!aidLogs[_id].verified, "Already verified");
        aidLogs[_id].verified = true;
        emit AidVerified(_id, msg.sender);
    }

    // Get aid entry details
    function getAidEntry(uint256 _id) public view returns (
        uint256 id,
        address submittedBy,
        string memory beneficiaryId,
        string memory aidType,
        string memory location,
        string memory timestamp,
        bool verified
    ) {
        AidEntry memory entry = aidLogs[_id];
        return (
            entry.id,
            entry.submittedBy,
            entry.beneficiaryId,
            entry.aidType,
            entry.location,
            entry.timestamp,
            entry.verified
        );
    }
}
