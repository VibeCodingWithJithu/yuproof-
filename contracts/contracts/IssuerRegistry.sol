// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title YuProof IssuerRegistry
/// @notice On-chain list of issuers (colleges, institutes, companies) approved by Yubhian
///         after KYC. Only a wallet address, the public institution name and a category
///         are stored here. No personal data.
contract IssuerRegistry is AccessControl {
    /// @notice Role allowed to approve and suspend issuers (Yubhian admin).
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum Status {
        None,
        Approved,
        Suspended
    }

    struct Issuer {
        string name;
        uint8 category;
        Status status;
        uint64 approvedAt;
        uint64 suspendedAt;
    }

    mapping(address => Issuer) private _issuers;

    event IssuerApproved(address indexed issuer, string name, uint8 category);
    event IssuerSuspended(address indexed issuer);

    error ZeroAddress();
    error EmptyName();
    error AlreadyApproved(address issuer);
    error NotApproved(address issuer);

    /// @param admin Gets DEFAULT_ADMIN_ROLE (manages roles) and REGISTRAR_ROLE.
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    /// @notice Approve an issuer, or reinstate a suspended one (name and category are updated).
    function approveIssuer(address issuer, string calldata name, uint8 category)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        if (issuer == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyName();
        Issuer storage i = _issuers[issuer];
        if (i.status == Status.Approved) revert AlreadyApproved(issuer);

        i.name = name;
        i.category = category;
        i.status = Status.Approved;
        i.approvedAt = uint64(block.timestamp);
        i.suspendedAt = 0;

        emit IssuerApproved(issuer, name, category);
    }

    /// @notice Suspend an approved issuer. A suspended issuer cannot issue new documents.
    ///         Documents it already issued remain on record; verifiers see the issuer status.
    function suspendIssuer(address issuer) external onlyRole(REGISTRAR_ROLE) {
        Issuer storage i = _issuers[issuer];
        if (i.status != Status.Approved) revert NotApproved(issuer);
        i.status = Status.Suspended;
        i.suspendedAt = uint64(block.timestamp);
        emit IssuerSuspended(issuer);
    }

    function isApproved(address issuer) external view returns (bool) {
        return _issuers[issuer].status == Status.Approved;
    }

    function getIssuer(address issuer) external view returns (Issuer memory) {
        return _issuers[issuer];
    }
}
