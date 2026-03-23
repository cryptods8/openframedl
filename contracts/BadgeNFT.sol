// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title BadgeNFT
 * @notice ERC1155 achievement badges for Framedl. Each badge is a unique token
 *         (tokenId = auto-increment) that can only be minted with a valid
 *         server signature. Minting costs ETH to prevent spam.
 *
 *         Signature scheme: the server signs (recipient, badgeId, nonce, price, contractAddress)
 *         where badgeId is the DB UUID and nonce is derived deterministically from it.
 *         The price is set per-badge by the server (tier-based) and enforced on-chain.
 */
contract BadgeNFT is ERC1155, Ownable, IERC2981 {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public signer;

    address public royaltyReceiver;
    uint96 public royaltyBps;

    uint256 private _nextTokenId;

    // nonce => used (prevents replay)
    mapping(bytes32 => bool) public usedNonces;
    // tokenId => badgeId (DB UUID, stored as string)
    mapping(uint256 => string) public tokenBadgeId;

    event BadgeMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        string badgeId,
        bytes32 nonce
    );

    constructor(
        string memory uri_,
        address signer_
    ) ERC1155(uri_) Ownable(msg.sender) {
        signer = signer_;
        royaltyReceiver = msg.sender;
        royaltyBps = 500; // 5%
        _nextTokenId = 1;
    }

    // --- Owner-only ---

    function setSigner(address signer_) external onlyOwner {
        require(signer_ != address(0), "Invalid signer");
        signer = signer_;
    }

    function setRoyalty(address receiver, uint96 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        require(receiver != address(0), "Invalid receiver");
        royaltyReceiver = receiver;
        royaltyBps = bps;
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }

    // --- Public ---

    /**
     * @notice Mint a badge NFT with server authorization.
     * @param to         Recipient address
     * @param badgeId    Badge UUID from the database
     * @param nonce      Unique nonce (derived from badgeId)
     * @param price      Mint price set by the server (included in signature)
     * @param signature  Server signature over (to, badgeId, nonce, price, address(this))
     */
    function mintBadge(
        address to,
        string calldata badgeId,
        bytes32 nonce,
        uint256 price,
        bytes calldata signature
    ) external payable {
        require(msg.value == price, "Incorrect ETH amount");
        require(!usedNonces[nonce], "Nonce already used");

        bytes32 messageHash = keccak256(
            abi.encodePacked(to, badgeId, nonce, price, address(this))
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);
        require(recovered == signer, "Invalid signature");

        usedNonces[nonce] = true;

        uint256 tokenId = _nextTokenId++;
        tokenBadgeId[tokenId] = badgeId;

        _mint(to, tokenId, 1, "");
        emit BadgeMinted(to, tokenId, badgeId, nonce);
    }

    // --- Views ---

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    // --- ERC-2981 Royalty ---

    function royaltyInfo(
        uint256,
        uint256 salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        return (royaltyReceiver, (salePrice * royaltyBps) / 10000);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, IERC165) returns (bool) {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
