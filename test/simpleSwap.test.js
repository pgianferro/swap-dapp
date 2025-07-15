const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("SimpleSwap", function () {
    /**
     * @notice Deploys M10, CR7 and SimpleSwap contracts, returning key actors and instances.
     * @dev This fixture is reused across all test cases to reduce gas cost and improve readability.
     */
    async function deployFixture() {
        const [owner, user1, user2] = await ethers.getSigners();

        const M10 = await ethers.getContractFactory("M10");
        const CR7 = await ethers.getContractFactory("CR7");
        const SimpleSwap = await ethers.getContractFactory("SimpleSwap");

        const tokenA = await M10.deploy();
        const tokenB = await CR7.deploy();
        await tokenA.waitForDeployment();
        await tokenB.waitForDeployment();

        const swap = await SimpleSwap.deploy(
            await tokenA.getAddress(),
            await tokenB.getAddress()
        );
        await swap.waitForDeployment();

        return { owner, user1, user2, tokenA, tokenB, swap };
    }

    //1. ADD LIQUIDITY TESTS

    /// @test 1.1 - Should allow initial liquidity provision correctly
    it("1.1 - should allow initial liquidity provision correctly", async function () {

        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;
        const deadline = Math.floor(Date.now() / 1000) + 60;

        // Approve token transfers
        await tokenA.connect(owner).approve(swapAddress, 10000);
        await tokenB.connect(owner).approve(swapAddress, 10000);

        // Add liquidity and expect event to be emitted
        await expect(swap.connect(owner).addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountADes,
            amountBDes,
            amountAMin,
            amountBMin,
            ownerAddress,
            deadline
        )
        ).to.emit(swap, "LiquidityAdded").withArgs(ownerAddress, 10000, 10000, anyValue);

        // Check contract reserves
        const reserveA = await swap.reserveA();
        const reserveB = await swap.reserveB();
        expect(reserveA).to.equal(10000);
        expect(reserveB).to.equal(10000);

        // Check token balances in the contract
        const contractTokenABalance = await tokenA.balanceOf(swapAddress);
        const contractTokenBBalance = await tokenB.balanceOf(swapAddress);
        expect(contractTokenABalance).to.equal(10000);
        expect(contractTokenBBalance).to.equal(10000);

    });

    /// @test 1.2 - Should revert if the deadline has already passed
    it("1.2 - Should revert if the deadline has already passed", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;

        // Approve tokens
        await tokenA.connect(owner).approve(swapAddress, 10000);
        await tokenB.connect(owner).approve(swapAddress, 10000);

        // Set expired deadline
        const deadline = (await time.latest()) - 1;

        // Expect revert due to expired deadline
        await expect(
            swap.connect(owner).addLiquidity(
                tokenAAddress,
                tokenBAddress,
                amountADes,
                amountBDes,
                amountAMin,
                amountBMin,
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("Transact expired");
    });

    /// @test 1.3 - Should revert if the token pair is provided in the wrong order
    it("1.3 - Should revert if the token pair is provided in the wrong order", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;

        // Approve tokens
        await tokenA.connect(owner).approve(swapAddress, 10000);
        await tokenB.connect(owner).approve(swapAddress, 10000);

        // Set valid deadline
        const deadline = Math.floor(Date.now() / 1000) + 60;


        // Expect revert due to wrong token order
        await expect(
            swap.connect(owner).addLiquidity(
                tokenBAddress, // Wrong order
                tokenAAddress,
                amountADes,
                amountBDes,
                amountAMin,
                amountBMin,
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("bad pair");
    });

    /// @test 1.4 - Should revert if one of the tokens is not part of the expected pair
    it("1.4 - Should revert if one of the tokens is not part of the expected pair", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const FakeToken = await ethers.getContractFactory("M10");
        const fakeToken = await FakeToken.deploy(); // not part of the expected pair

        const tokenAAddress = await tokenA.getAddress();
        const fakeTokenAddress = await fakeToken.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;

        // Approve tokens
        await tokenA.connect(owner).approve(swapAddress, 10000);
        await fakeToken.connect(owner).approve(swapAddress, 10000);

        // Set valid deadline
        const deadline = Math.floor(Date.now() / 1000) + 60;

        // Expect revert due to unknown token
        await expect(
            swap.connect(owner).addLiquidity(
                tokenAAddress,
                fakeTokenAddress, // token inesperado
                amountADes,
                amountBDes,
                amountAMin,
                amountBMin,
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("bad pair");
    });

    /// @test 1.5 - Should revert if amountBOptimal is less than amountBMin
    it("1.5 - Should revert if amountBOptimal is less than amountBMin", async function () {
        const { tokenA, tokenB, swap, owner } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const ownerAddress = await owner.getAddress();
        const swapAddress = await swap.getAddress();


        // Set valid deadline
        const deadline = Math.floor(Date.now() / 1000) + 60;

        // Step 1: Add initial liquidity to set reserves
        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;

        await tokenA.connect(owner).approve(swapAddress, 10_000);
        await tokenB.connect(owner).approve(swapAddress, 10_000);

        await swap.connect(owner).addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountADes,
            amountBDes,
            amountAMin,
            amountBMin,
            ownerAddress,
            deadline
        );

        // Step 2: Attempt to add liquidity with too high amountBMin
        const amountADes_ = 5_000;
        const amountBDes_ = 5_000;
        const amountAMin_ = 0;
        const amountBMin_ = 6_000; // too high

        //Tokens already approved

        await expect(
            swap.connect(owner).addLiquidity(
                tokenAAddress,
                tokenBAddress,
                amountADes_,
                amountBDes_,
                amountAMin_,
                amountBMin_, // amountBMin higher to expected amountBOptimal
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("B low");
    });


    //2.REMOVE LIQUIDITY TESTS

    /// @test 2.1 - Should allow removing liquidity correctly
    it("2.1 - Should allow removing liquidity correctly", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;
        const liquidityToRemove = 10_000;

        //Set valid deadline
        const deadline = Math.floor(Date.now() / 1000) + 60;

        // Approve tokens
        await tokenA.connect(owner).approve(swapAddress, 10000);
        await tokenB.connect(owner).approve(swapAddress, 10000);

        // Step 1: Add liquidity
        await swap.connect(owner).addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountADes,
            amountBDes,
            amountAMin,
            amountBMin,
            ownerAddress,
            deadline
        );

        // Step 2: Remove liquidity
        await
            swap.connect(owner).removeLiquidity(
                tokenAAddress,
                tokenBAddress,
                liquidityToRemove,
                amountAMin,
                amountBMin,
                ownerAddress,
                deadline
            )

        // Step 3: Verify that reserves are zero
        const reserveA = await swap.reserveA();
        const reserveB = await swap.reserveB();

        expect(reserveA).to.equal(0);
        expect(reserveB).to.equal(0);

        // Optional: confirm balances of contract are zero
        const contractTokenABalance = await tokenA.balanceOf(swapAddress);
        const contractTokenBBalance = await tokenB.balanceOf(swapAddress);

        expect(contractTokenABalance).to.equal(0);
        expect(contractTokenBBalance).to.equal(0);

    });

    /// @test 2.2 - Should revert if deadline has expired
    it("2.2 - Should revert if deadline has expiredó", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();


        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;
        const liquidityToRemove = 10_000;

        // Set valid deadline
        const validDeadline = Math.floor(Date.now() / 1000) + 60;

        // Approve tokens
        await tokenA.connect(owner).approve(swapAddress, 10000);
        await tokenB.connect(owner).approve(swapAddress, 10000);

        // Step 1: Add liquidity
        await swap.connect(owner).addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountADes,
            amountBDes,
            amountAMin,
            amountBMin,
            ownerAddress,
            validDeadline
        );

        // Step 2: Set expired deadline
        const expiredDeadline = (await time.latest()) - 1;

        // Step 3: Try to remove liquidity with expired deadline
        await expect(
            swap.connect(owner).removeLiquidity(
                tokenAAddress,
                tokenBAddress,
                liquidityToRemove,
                amountAMin,
                amountBMin,
                ownerAddress,
                expiredDeadline
            )
        ).to.be.revertedWith("Transact expired");
    });

    /// @test 2.3 - Should revert if token order is inverted
    it("2.3 - Should revert if token order is inverted", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;
        const liquidityToRemove = 10_000;

        // Step 1: Set valid deadline and approve
        const deadline = Math.floor(Date.now() / 1000) + 60;
        await tokenA.connect(owner).approve(swapAddress, amountADes);
        await tokenB.connect(owner).approve(swapAddress, amountBDes);

        // Step 2: Add liquidity
        await swap.connect(owner).addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountADes,
            amountBDes,
            amountAMin,
            amountBMin,
            ownerAddress,
            deadline
        );

        // Step 3: Attempt to remove liquidity with reversed token order
        await expect(
            swap.connect(owner).removeLiquidity(
                tokenBAddress, //incorrect order
                tokenAAddress,
                liquidityToRemove,
                amountAMin,
                amountBMin,
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("bad pair");
    });

    /// @test 2.4 - Should revert if using an unknown token
    it("2.4 - Should revert if using an unknown token", async function () {
        const { owner, tokenA, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const fakeTokenFactory = await ethers.getContractFactory("M10");
        const fakeToken = await fakeTokenFactory.deploy();
        const fakeTokenAddress = await fakeToken.getAddress();

        const ownerAddress = await owner.getAddress();

        // Set valid deadline
        const deadline = Math.floor(Date.now() / 1000) + 60;

        //Only validate token pair
        await expect(
            swap.connect(owner).removeLiquidity(
                tokenAAddress,
                fakeTokenAddress, // invalid token
                10000,
                0,
                0,
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("bad pair");
    });

    /// @test 2.5 - Should revert if trying to remove more liquidity than available
    it("2.5 - Should revert if trying to remove more liquidity than available", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        const amountADes = 10_000;
        const amountBDes = 10_000;
        const amountAMin = 0;
        const amountBMin = 0;
        const liquidityToRemove = 11_000; // more than added

        // Step 1: Set valid deadline and approve
        const deadline = Math.floor(Date.now() / 1000) + 60;
        await tokenA.connect(owner).approve(swapAddress, amountADes);
        await tokenB.connect(owner).approve(swapAddress, amountBDes);

        // Step 2: Add liquidity
        await swap.connect(owner).addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountADes,
            amountBDes,
            amountAMin,
            amountBMin,
            ownerAddress,
            deadline
        );

        // Step 3: Attempt to remove more liquidity than owned
        await expect(
            swap.connect(owner).removeLiquidity(
                tokenAAddress,
                tokenBAddress,
                liquidityToRemove,
                amountAMin,
                amountBMin,
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("LP low");
    });



    // 3. GET PRICE TESTS

    /// @test 3.1 - Should return correct price if reserves are valid
    it("3.1 - Should return correct price if reserves are valids", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const ownerAddress = await owner.getAddress();
        const swapAddress = await swap.getAddress();

        const amountADes = 10_000;
        const amountBDes = 20_000;
        const amountAMin = 0;
        const amountBMin = 0;

        const deadline = Math.floor(Date.now() / 1000) + 60;

        // Approve tokens
        await tokenA.approve(swapAddress, 10000);
        await tokenB.approve(swapAddress, 20000);

        // Step 1: Add liquidity
        await swap.addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountADes,
            amountBDes,
            amountAMin,
            amountBMin,
            ownerAddress,
            deadline
        );

        // Step 2: Compute expected price
        const expected = BigInt(20000) * BigInt(1e18) / BigInt(10000);

        // Step 3: Verify price returned by contract
        const result = await swap.getPrice(tokenAAddress, tokenBAddress);
        expect(result).to.equal(expected);
    });

    /// @test 3.2 - Should revert if using an unknown token
    it("3.2 - Should revert if using an unknown token", async function () {
        const { tokenA, swap, owner } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const fakeTokenFactory = await ethers.getContractFactory("M10");
        const fakeToken = await fakeTokenFactory.deploy();
        const fakeTokenAddress = await fakeToken.getAddress();

        await expect(
            swap.connect(owner).getPrice(
                tokenAAddress,
                fakeTokenAddress // invalid token
            )
        ).to.be.revertedWith("Invalid tokens");
    });

    /// @test 3.3 - Should revert if reserveA is zero
    it("3.3 - Should revert if reserveA is zero", async function () {
        const { tokenA, tokenB, swap, owner } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();

        await expect(
            swap.connect(owner).getPrice(
                tokenBAddress, // inverted order
                tokenAAddress
            )
        ).to.be.revertedWith("No A reserve");
    });



    //4. GET AMOUNT OUT TESTS

    /// @test 4.1 - Should return correct amountOut with realistic values
    it("4.1 - Should return correct amountOut with realistic values", async function () {
        const { swap } = await loadFixture(deployFixture);

        const amountIn = 1000;
        const reserveIn = 5000;
        const reserveOut = 10000;

        const expected = Math.floor((amountIn * reserveOut) / (reserveIn + amountIn));
        const result = await swap.getAmountOut(amountIn, reserveIn, reserveOut);

        expect(result).to.equal(expected);
    });

    /// @test 4.2 - Should fail if amountIn is 0
    it("4.2 - Should fail if amountIn is 0", async function () {
        const { swap } = await loadFixture(deployFixture);

        const amountIn = 0;
        const reserveIn = 1000;
        const reserveOut = 1000;

        await expect(
            swap.getAmountOut(amountIn, reserveIn, reserveOut)
        ).to.be.revertedWith("amountIn < 0");
    });

    /// @test 4.3 - Should fail if reserveIn is 0
    it("4.3 - Should fail if reserveIn is 0", async function () {
        const { swap } = await loadFixture(deployFixture);

        const amountIn = 1000;
        const reserveIn = 0;
        const reserveOut = 10000;

        await expect(
            swap.getAmountOut(amountIn, reserveIn, reserveOut)
        ).to.be.revertedWith("Reserves < 0");
    });

    /// @test 4.4 - Should fail if reserveOut is 0
    it("4.4 - Should fail if reserveOut is 0", async function () {
        const { swap } = await loadFixture(deployFixture);

        const amountIn = 1000;
        const reserveIn = 1000;
        const reserveOut = 0;

        await expect(
            swap.getAmountOut(amountIn, reserveIn, reserveOut)
        ).to.be.revertedWith("Reserves < 0");
    });

    /// @test 4.5 - Should fail if both reserves are 0
    it("4.5 - Should fail if both reserves are 0", async function () {
        const { swap } = await loadFixture(deployFixture);

        const amountIn = 1000;
        const reserveIn = 0;
        const reserveOut = 0;

        await expect(
            swap.getAmountOut(amountIn, reserveIn, reserveOut)
        ).to.be.revertedWith("Reserves < 0");
    });


});