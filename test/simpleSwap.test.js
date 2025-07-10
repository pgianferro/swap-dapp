const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleSwap", function () {
  let owner, user;
  let M10, CR7, swap;
  let tokenA, tokenB;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // Deploy tokens
    const M10Factory = await ethers.getContractFactory("M10");
    tokenA = await M10Factory.deploy();
    await tokenA.waitForDeployment();

    const CR7Factory = await ethers.getContractFactory("CR7");
    tokenB = await CR7Factory.deploy();
    await tokenB.waitForDeployment();

    // Mint tokens
    await tokenA.mint(owner.address, ethers.parseEther("10000"));
    await tokenB.mint(owner.address, ethers.parseEther("10000"));

    // Deploy swap contract
    const SwapFactory = await ethers.getContractFactory("SimpleSwap");
    swap = await SwapFactory.deploy(await tokenA.getAddress(), await tokenB.getAddress());
    await swap.waitForDeployment();

    // Approve swap contract
    await tokenA.approve(await swap.getAddress(), ethers.parseEther("10000"));
    await tokenB.approve(await swap.getAddress(), ethers.parseEther("10000"));
  });

  it("getPrice devuelve valor > 0", async () => {
    const price = await swap.getPrice();
    expect(price).to.be.gt(0);
  });

  it("swapExactTokensForTokens cambia balances", async () => {
    const amountIn = ethers.parseEther("10");

    // Hacer el swap
    await swap.swapExactTokensForTokens(
      amountIn,
      0,
      [await tokenA.getAddress(), await tokenB.getAddress()],
      owner.address,
      Math.floor(Date.now() / 1000) + 3600
    );

    const newBalanceA = await tokenA.balanceOf(owner.address);
    const newBalanceB = await tokenB.balanceOf(owner.address);

    expect(newBalanceA).to.be.lt(ethers.parseEther("10000"));
    expect(newBalanceB).to.be.gt(0);
  });

  it("falla si no hay allowance suficiente", async () => {
    const amountIn = ethers.parseEther("10");

    // Aprobar solo 1 token para simular falla
    await tokenA.approve(await swap.getAddress(), ethers.parseEther("1"));

    await expect(
      swap.swapExactTokensForTokens(
        amountIn,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        owner.address,
        Math.floor(Date.now() / 1000) + 3600
      )
    ).to.be.reverted;
  });
});