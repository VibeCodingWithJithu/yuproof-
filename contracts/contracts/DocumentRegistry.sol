// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IssuerRegistry} from "./IssuerRegistry.sol";

/// @title YuProof DocumentRegistry
/// @notice Records SHA-256 fingerprints of issued documents, either one by one or as a
///         Merkle root per batch, and lets anyone check them. Only hashes go on-chain.
/// @dev Batch leaves follow the OpenZeppelin StandardMerkleTree format for a single
///      `bytes32` value: leaf = keccak256(bytes.concat(keccak256(abi.encode(hash)))).
///      Build trees off-chain with `StandardMerkleTree.of(hashes.map(h => [h]), ["bytes32"])`.
contract DocumentRegistry {
    struct Record {
        address issuer;
        uint64 issuedAt;
        uint8 docType;
    }

    struct Batch {
        bytes32 merkleRoot;
        address issuer;
        uint64 issuedAt;
        uint32 count;
    }

    struct Revocation {
        uint64 revokedAt;
        bytes32 replacementHash;
    }

    IssuerRegistry public immutable issuerRegistry;

    mapping(bytes32 => Record) private _records;
    /// @dev batchId => Batch. Ids start at 1; 0 means "no batch".
    mapping(uint256 => Batch) private _batches;
    uint256 public batchCount;
    mapping(bytes32 => bool) public rootUsed;
    /// @dev issuer => document hash => revocation. Keyed by issuer so that only the
    ///      original issuer's record is affected.
    mapping(address => mapping(bytes32 => Revocation)) private _revocations;

    event Issued(bytes32 indexed hash, address indexed issuer, uint8 docType);
    event BatchIssued(uint256 indexed batchId, address indexed issuer, bytes32 merkleRoot, uint32 count);
    event Revoked(bytes32 indexed hash, address indexed issuer, bytes32 replacementHash);

    error NotApprovedIssuer(address account);
    error ZeroHash();
    error AlreadyIssued(bytes32 hash);
    error EmptyBatch();
    error RootAlreadyUsed(bytes32 merkleRoot);
    error UnknownBatch(uint256 batchId);
    error NotInBatch(uint256 batchId, bytes32 hash);
    error NotIssued(bytes32 hash);
    error NotOriginalIssuer(address account);
    error AlreadyRevoked(bytes32 hash);
    error SelfReplacement();

    modifier onlyApprovedIssuer() {
        if (!issuerRegistry.isApproved(msg.sender)) revert NotApprovedIssuer(msg.sender);
        _;
    }

    constructor(IssuerRegistry registry) {
        issuerRegistry = registry;
    }

    // ---------------------------------------------------------------- issue

    /// @notice Record a single document fingerprint.
    function issue(bytes32 hash, uint8 docType) external onlyApprovedIssuer {
        if (hash == bytes32(0)) revert ZeroHash();
        if (_records[hash].issuer != address(0)) revert AlreadyIssued(hash);
        _records[hash] = Record({issuer: msg.sender, issuedAt: uint64(block.timestamp), docType: docType});
        emit Issued(hash, msg.sender, docType);
    }

    /// @notice Record the Merkle root of a batch of document fingerprints in one transaction.
    /// @return batchId Id to store with each document (with its Merkle proof) off-chain.
    function issueBatch(bytes32 merkleRoot, uint32 count) external onlyApprovedIssuer returns (uint256 batchId) {
        if (merkleRoot == bytes32(0)) revert ZeroHash();
        if (count == 0) revert EmptyBatch();
        if (rootUsed[merkleRoot]) revert RootAlreadyUsed(merkleRoot);
        rootUsed[merkleRoot] = true;
        batchId = ++batchCount;
        _batches[batchId] =
            Batch({merkleRoot: merkleRoot, issuer: msg.sender, issuedAt: uint64(block.timestamp), count: count});
        emit BatchIssued(batchId, msg.sender, merkleRoot, count);
    }

    // --------------------------------------------------------------- revoke

    /// @notice Cancel a singly issued document. Only its original issuer can do this,
    ///         even if that issuer has since been suspended.
    /// @param replacementHash Fingerprint of the corrected document, or zero if none.
    function revoke(bytes32 hash, bytes32 replacementHash) external {
        address issuer = _records[hash].issuer;
        if (issuer == address(0)) revert NotIssued(hash);
        if (issuer != msg.sender) revert NotOriginalIssuer(msg.sender);
        _revoke(hash, replacementHash);
    }

    /// @notice Cancel a document that was issued as part of a batch.
    function revokeInBatch(uint256 batchId, bytes32 hash, bytes32[] calldata proof, bytes32 replacementHash)
        external
    {
        Batch storage b = _batch(batchId);
        if (!_inBatch(b, hash, proof)) revert NotInBatch(batchId, hash);
        if (b.issuer != msg.sender) revert NotOriginalIssuer(msg.sender);
        _revoke(hash, replacementHash);
    }

    function _revoke(bytes32 hash, bytes32 replacementHash) private {
        if (replacementHash == hash) revert SelfReplacement();
        Revocation storage r = _revocations[msg.sender][hash];
        if (r.revokedAt != 0) revert AlreadyRevoked(hash);
        r.revokedAt = uint64(block.timestamp);
        r.replacementHash = replacementHash;
        emit Revoked(hash, msg.sender, replacementHash);
    }

    // --------------------------------------------------------------- verify

    /// @notice Check a singly issued document.
    function verify(bytes32 hash)
        external
        view
        returns (bool exists, bool revoked, address issuer, uint64 issuedAt)
    {
        Record storage rec = _records[hash];
        if (rec.issuer == address(0)) return (false, false, address(0), 0);
        return (true, _revocations[rec.issuer][hash].revokedAt != 0, rec.issuer, rec.issuedAt);
    }

    /// @notice Check a document issued in a batch using its Merkle proof.
    ///         Returns all-zero values (exists = false) for an unknown batch or a bad proof.
    function verifyInBatch(uint256 batchId, bytes32 hash, bytes32[] calldata proof)
        external
        view
        returns (bool exists, bool revoked, address issuer, uint64 issuedAt)
    {
        Batch storage b = _batches[batchId];
        if (b.issuer == address(0) || !_inBatch(b, hash, proof)) return (false, false, address(0), 0);
        return (true, _revocations[b.issuer][hash].revokedAt != 0, b.issuer, b.issuedAt);
    }

    // ---------------------------------------------------------------- views

    function getRecord(bytes32 hash) external view returns (Record memory) {
        return _records[hash];
    }

    function getBatch(uint256 batchId) external view returns (Batch memory) {
        return _batches[batchId];
    }

    function getRevocation(address issuer, bytes32 hash) external view returns (Revocation memory) {
        return _revocations[issuer][hash];
    }

    // -------------------------------------------------------------- helpers

    function _batch(uint256 batchId) private view returns (Batch storage b) {
        b = _batches[batchId];
        if (b.issuer == address(0)) revert UnknownBatch(batchId);
    }

    function _inBatch(Batch storage b, bytes32 hash, bytes32[] calldata proof) private view returns (bool) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(hash))));
        return MerkleProof.verifyCalldata(proof, b.merkleRoot, leaf);
    }
}
