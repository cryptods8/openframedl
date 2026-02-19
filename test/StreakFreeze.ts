import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StreakFreeze", function () {
  async function deployFixture() {
    const [owner, signer, user] = await ethers.getSigners();
    const ethPrice = ethers.parseEther("0.001");

    const StreakFreeze = await ethers.getContractFactory("StreakFreeze");
    const contract = await StreakFreeze.deploy(
      "https://example.com/metadata/{id}.json",
      ethPrice,
      signer.address
    );

    return { contract, owner, signer, user, ethPrice };
  }

  describe("Deployment", function () {
    it("should set correct initial values", async function () {
      const { contract, owner, signer, ethPrice } =
        await loadFixture(deployFixture);

      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.signer()).to.equal(signer.address);
      expect(await contract.ethPrice()).to.equal(ethPrice);
    });
  });

  describe("Purchase with ETH", function () {
    it("should mint tokens on valid purchase", async function () {
      const { contract, user, ethPrice } = await loadFixture(deployFixture);
      await contract.connect(user).purchaseWithEth(2, { value: ethPrice * 2n });
      expect(await contract.balanceOf(user.address, 1)).to.equal(2);
    });

    it("should reject incorrect ETH amount", async function () {
      const { contract, user, ethPrice } = await loadFixture(deployFixture);
      await expect(
        contract.connect(user).purchaseWithEth(1, { value: ethPrice * 2n })
      ).to.be.revertedWith("Incorrect ETH amount");
    });

    it("should reject zero amount", async function () {
      const { contract, user } = await loadFixture(deployFixture);
      await expect(
        contract.connect(user).purchaseWithEth(0, { value: 0 })
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("should emit FreezePurchased event", async function () {
      const { contract, user, ethPrice } = await loadFixture(deployFixture);
      await expect(
        contract.connect(user).purchaseWithEth(1, { value: ethPrice })
      )
        .to.emit(contract, "FreezePurchased")
        .withArgs(user.address, 1, "ETH");
    });
  });

  describe("Claim earned (signature-based)", function () {
    it("should mint with valid signature", async function () {
      const { contract, signer, user } = await loadFixture(deployFixture);
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const amount = 1;

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "bytes32", "address"],
        [user.address, amount, nonce, await contract.getAddress()]
      );
      const signature = await signer.signMessage(ethers.getBytes(messageHash));

      await contract.claimEarned(user.address, amount, nonce, signature);
      expect(await contract.balanceOf(user.address, 1)).to.equal(1);
    });

    it("should emit FreezeClaimed event", async function () {
      const { contract, signer, user } = await loadFixture(deployFixture);
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const amount = 1;

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "bytes32", "address"],
        [user.address, amount, nonce, await contract.getAddress()]
      );
      const signature = await signer.signMessage(ethers.getBytes(messageHash));

      await expect(contract.claimEarned(user.address, amount, nonce, signature))
        .to.emit(contract, "FreezeClaimed")
        .withArgs(user.address, amount, nonce);
    });

    it("should reject reused nonce", async function () {
      const { contract, signer, user } = await loadFixture(deployFixture);
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const amount = 1;

      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "bytes32", "address"],
        [user.address, amount, nonce, await contract.getAddress()]
      );
      const signature = await signer.signMessage(ethers.getBytes(messageHash));

      await contract.claimEarned(user.address, amount, nonce, signature);
      await expect(
        contract.claimEarned(user.address, amount, nonce, signature)
      ).to.be.revertedWith("Nonce already used");
    });

    it("should reject invalid signature", async function () {
      const { contract, user } = await loadFixture(deployFixture);
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      // Sign with the wrong signer (user instead of designated signer)
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "bytes32", "address"],
        [user.address, 1, nonce, await contract.getAddress()]
      );
      const badSignature = await user.signMessage(
        ethers.getBytes(messageHash)
      );

      await expect(
        contract.claimEarned(user.address, 1, nonce, badSignature)
      ).to.be.revertedWith("Invalid signature");
    });
  });

  describe("Owner functions", function () {
    it("should allow owner to mint", async function () {
      const { contract, owner, user } = await loadFixture(deployFixture);
      await contract.mint(user.address, 5);
      expect(await contract.balanceOf(user.address, 1)).to.equal(5);
    });

    it("should reject non-owner mint", async function () {
      const { contract, user } = await loadFixture(deployFixture);
      await expect(
        contract.connect(user).mint(user.address, 1)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to set ETH price", async function () {
      const { contract } = await loadFixture(deployFixture);
      const newPrice = ethers.parseEther("0.002");
      await contract.setEthPrice(newPrice);
      expect(await contract.ethPrice()).to.equal(newPrice);
    });

    it("should allow owner to set signer", async function () {
      const { contract, user } = await loadFixture(deployFixture);
      await contract.setSigner(user.address);
      expect(await contract.signer()).to.equal(user.address);
    });

    it("should reject zero address signer", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.setSigner(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid signer");
    });

    it("should allow owner to withdraw ETH", async function () {
      const { contract, owner, user, ethPrice } =
        await loadFixture(deployFixture);
      // Purchase to put ETH in contract
      await contract.connect(user).purchaseWithEth(1, { value: ethPrice });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await contract.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter + gasUsed - balanceBefore).to.equal(ethPrice);
    });
  });

  describe("Burn", function () {
    it("should allow token holder to burn", async function () {
      const { contract, user, ethPrice } = await loadFixture(deployFixture);
      await contract.connect(user).purchaseWithEth(2, { value: ethPrice * 2n });
      await contract.connect(user).burn(1);
      expect(await contract.balanceOf(user.address, 1)).to.equal(1);
    });
  });
});
