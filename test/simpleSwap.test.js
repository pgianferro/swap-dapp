const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SimpleSwap", function () {
    async function deployFixture() {
        const [owner, user1, user2] = await ethers.getSigners();

        const M10 = await ethers.getContractFactory("M10");
        const CR7 = await ethers.getContractFactory("CR7");
        const SimpleSwap = await ethers.getContractFactory("SimpleSwap");

        const tokenA = await M10.deploy();
        const tokenB = await CR7.deploy();
        await tokenA.waitForDeployment();
        await tokenB.waitForDeployment();

        const swap = await SimpleSwap.deploy(await tokenA.getAddress(), await tokenB.getAddress()); await swap.waitForDeployment();
        return { owner, user1, user2, tokenA, tokenB, swap };

    }

    it("debería fallar si el deadline expiró", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        await tokenA.mint(ownerAddress, 10000);
        await tokenB.mint(ownerAddress, 10000);
        await tokenA.connect(owner).approve(swapAddress, 10000);
        await tokenB.connect(owner).approve(swapAddress, 10000);

        const deadline = (await time.latest()) - 1;

        await expect(
            swap.connect(owner).addLiquidity(
                tokenAAddress,
                tokenBAddress,
                10000,
                10000,
                0,
                0,
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("Transact expired");
    });

});