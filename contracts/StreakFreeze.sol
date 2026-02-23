// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract StreakFreeze is ERC1155, Ownable, IERC2981 {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 public constant FREEZE_TOKEN_ID = 1;

    uint256 public ethPrice;
    address public erc20Token;
    uint256 public erc20Price;

    address public royaltyReceiver;
    uint96 public royaltyBps; // basis points (500 = 5%)

    address public signer;
    mapping(bytes32 => bool) public usedNonces;

    event FreezePurchased(
        address indexed buyer,
        uint256 amount,
        string paymentMethod
    );

    event FreezeClaimed(
        address indexed recipient,
        uint256 amount,
        bytes32 nonce
    );

    constructor(
        string memory uri_,
        uint256 ethPrice_,
        address signer_
    ) ERC1155(uri_) Ownable(msg.sender) {
        ethPrice = ethPrice_;
        signer = signer_;
        royaltyReceiver = msg.sender;
        royaltyBps = 500; // 5%
    }

    // --- Owner-only functions ---

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, FREEZE_TOKEN_ID, amount, "");
    }

    function setSigner(address signer_) external onlyOwner {
        require(signer_ != address(0), "Invalid signer");
        signer = signer_;
    }

    function setEthPrice(uint256 price) external onlyOwner {
        ethPrice = price;
    }

    function setErc20Payment(address token, uint256 price) external onlyOwner {
        erc20Token = token;
        erc20Price = price;
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
        (bool success, ) = payable(owner()).call{value: address(this).balance}(
            ""
        );
        require(success, "ETH transfer failed");
    }

    function withdrawErc20(address token) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "No balance");
        IERC20(token).transfer(owner(), bal);
    }

    // --- Public functions ---

    function claimEarned(
        address to,
        uint256 amount,
        bytes32 nonce,
        bytes calldata signature
    ) external {
        require(!usedNonces[nonce], "Nonce already used");

        bytes32 messageHash = keccak256(
            abi.encodePacked(to, amount, nonce, address(this))
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);

        require(recovered == signer, "Invalid signature");

        usedNonces[nonce] = true;
        _mint(to, FREEZE_TOKEN_ID, amount, "");
        emit FreezeClaimed(to, amount, nonce);
    }

    function purchaseWithEth(uint256 amount) external payable {
        require(ethPrice > 0, "ETH purchase disabled");
        require(amount > 0, "Amount must be > 0");
        require(msg.value == ethPrice * amount, "Incorrect ETH amount");

        _mint(msg.sender, FREEZE_TOKEN_ID, amount, "");
        emit FreezePurchased(msg.sender, amount, "ETH");
    }

    function purchaseWithErc20(uint256 amount) external {
        require(erc20Token != address(0), "ERC20 purchase disabled");
        require(amount > 0, "Amount must be > 0");

        uint256 totalCost = erc20Price * amount;
        IERC20(erc20Token).transferFrom(msg.sender, address(this), totalCost);

        _mint(msg.sender, FREEZE_TOKEN_ID, amount, "");
        emit FreezePurchased(msg.sender, amount, "ERC20");
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, FREEZE_TOKEN_ID, amount);
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
