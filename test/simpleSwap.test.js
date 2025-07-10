const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

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

    //ADD LIQUIDITY TESTS

    it("debería permitir agregar liquidez inicial correctamente", async function () {

        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const swapAddress = await swap.getAddress();
        const ownerAddress = await owner.getAddress();

        await tokenA.mint(ownerAddress, 10000);
        await tokenB.mint(ownerAddress, 10000);
        await tokenA.connect(owner).approve(swapAddress, 10000);
        await tokenB.connect(owner).approve(swapAddress, 10000);

        const deadline = Math.floor(Date.now() / 1000) + 60;

        await expect(swap.connect(owner).addLiquidity(
            tokenAAddress,
            tokenBAddress,
            10000,
            10000,
            0,
            0,
            ownerAddress,
            deadline
        )
        ).to.emit(swap, "LiquidityAdded").withArgs(ownerAddress, 10000, 10000, anyValue);

        const reserveA = await swap.reserveA();
        const reserveB = await swap.reserveB();
        expect(reserveA).to.equal(10000);
        expect(reserveB).to.equal(10000);

        const contractTokenABalance = await tokenA.balanceOf(swapAddress);
        const contractTokenBBalance = await tokenB.balanceOf(swapAddress);
        expect(contractTokenABalance).to.equal(10000);
        expect(contractTokenBBalance).to.equal(10000);

    });

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

    it("debería fallar si se invierte el orden de los tokens", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();

        await tokenA.mint(owner.address, 10000);
        await tokenB.mint(owner.address, 10000);
        await tokenA.connect(owner).approve(await swap.getAddress(), 10000);
        await tokenB.connect(owner).approve(await swap.getAddress(), 10000);

        const deadline = Math.floor(Date.now() / 1000) + 60;

        await expect(
            swap.connect(owner).addLiquidity(
                tokenBAddress, // orden invertido
                tokenAAddress,
                10000,
                10000,
                0,
                0,
                owner.address,
                deadline
            )
        ).to.be.revertedWith("bad pair");
    });

    it("debería fallar si se usa un token desconocido", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);
        const FakeToken = await ethers.getContractFactory("M10");
        const fakeToken = await FakeToken.deploy(); // no es el que espera el swap

        const tokenAAddress = await tokenA.getAddress();
        const fakeTokenAddress = await fakeToken.getAddress();

        await tokenA.mint(owner.address, 10000);
        await fakeToken.mint(owner.address, 10000);
        await tokenA.connect(owner).approve(await swap.getAddress(), 10000);
        await fakeToken.connect(owner).approve(await swap.getAddress(), 10000);

        const deadline = Math.floor(Date.now() / 1000) + 60;

        await expect(
            swap.connect(owner).addLiquidity(
                tokenAAddress,
                fakeTokenAddress, // token inesperado
                10000,
                10000,
                0,
                0,
                owner.address,
                deadline
            )
        ).to.be.revertedWith("bad pair");
    });

    it("debería fallar si amountBOptimal es menor a amountBMin", async function () {
        const { tokenA, tokenB, swap, owner } = await loadFixture(deployFixture);
        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const ownerAddress = await owner.getAddress();
        const swapAddress = await swap.getAddress();

        // Primer add liquidez para establecer reservas
        await tokenA.mint(ownerAddress, 10000);
        await tokenB.mint(ownerAddress, 10000);
        await tokenA.approve(swapAddress, 10000);
        await tokenB.approve(swapAddress, 10000);
        const deadline = Math.floor(Date.now() / 1000) + 60;

        await swap.addLiquidity(
            tokenAAddress,
            tokenBAddress,
            10000,
            10000,
            0,
            0,
            ownerAddress,
            deadline
        );

        // Segundo intento: BMin demasiado alto
        await tokenA.mint(ownerAddress, 5000);
        await tokenB.mint(ownerAddress, 5000);
        await tokenA.approve(swapAddress, 5000);
        await tokenB.approve(swapAddress, 5000);

        await expect(
            swap.addLiquidity(
                tokenAAddress,
                tokenBAddress,
                5000,
                5000,
                0,
                6000, // amountBMin mayor a amountBOptimal esperado
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("B low");
    });


    //REMOVE LIQUIDITY TESTS

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
            swap.connect(owner).removeLiquidity(
                tokenAAddress,
                tokenBAddress,
                10000,
                10000,
                0,
                ownerAddress,
                deadline
            )
        ).to.be.revertedWith("Transact expired");
    });

    it("debería fallar al remover liquidez si se invierte el orden de los tokens", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();

        const deadline = Math.floor(Date.now() / 1000) + 60;

        await expect(
            swap.connect(owner).removeLiquidity(
                tokenBAddress, // orden incorrecto
                tokenAAddress,
                10000,
                0,
                0,
                owner.address,
                deadline
            )
        ).to.be.revertedWith("bad pair");
    });

    it("debería fallar al remover liquidez si se usa un token desconocido", async function () {
        const { owner, tokenA, swap } = await loadFixture(deployFixture);

        const FakeToken = await ethers.getContractFactory("M10");
        const fakeToken = await FakeToken.deploy();

        const tokenAAddress = await tokenA.getAddress();
        const fakeTokenAddress = await fakeToken.getAddress();

        const deadline = Math.floor(Date.now() / 1000) + 60;

        await expect(
            swap.connect(owner).removeLiquidity(
                tokenAAddress,
                fakeTokenAddress, // token inválido
                10000,
                0,
                0,
                owner.address,
                deadline
            )
        ).to.be.revertedWith("bad pair");
    });


    // GET PRICE TESTS

    it("debería fallar al buscar el precio si se usa un token desconocido", async function () {
        const { tokenA, swap, owner } = await loadFixture(deployFixture);

        const FakeToken = await ethers.getContractFactory("M10");
        const fakeToken = await FakeToken.deploy();

        const tokenAAddress = await tokenA.getAddress();
        const fakeTokenAddress = await fakeToken.getAddress();

        await expect(
            swap.connect(owner).getPrice(
                tokenAAddress,
                fakeTokenAddress // token inválido
            )
        ).to.be.revertedWith("Invalid tokens");
    });


    it("debería fallar si la reserva de A es 0", async function () {
        const { tokenA, tokenB, swap, owner } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();

        await expect(
            swap.connect(owner).getPrice(
                tokenBAddress, // orden incorrecto
                tokenAAddress
            )
        ).to.be.revertedWith("No A reserve");
    });

    it("debería calcular correctamente el precio si las reservas son válidas", async function () {
        const { owner, tokenA, tokenB, swap } = await loadFixture(deployFixture);

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const ownerAddress = await owner.getAddress();
        const swapAddress = await swap.getAddress();

        // Mint y approve
        await tokenA.mint(ownerAddress, 10000);
        await tokenB.mint(ownerAddress, 20000);
        await tokenA.approve(swapAddress, 10000);
        await tokenB.approve(swapAddress, 20000);

        const deadline = Math.floor(Date.now() / 1000) + 60;

        // Add liquidez
        await swap.addLiquidity(
            tokenAAddress,
            tokenBAddress,
            10000,
            20000,
            0,
            0,
            ownerAddress,
            deadline
        );

        // Calcular precio esperado: price = (reserveB * 1e18) / reserveA
        const expected = BigInt(20000) * BigInt(1e18) / BigInt(10000);
        const result = await swap.getPrice(tokenAAddress, tokenBAddress);
        expect(result).to.equal(expected);
    });



    //GET AMOUNT OUT TESTS
    it("debería fallar si amountIn es 0", async function () {
        const { swap } = await loadFixture(deployFixture);

        const reserveIn = 1000;
        const reserveOut = 1000;

        await expect(
            swap.getAmountOut(0, reserveIn, reserveOut)
        ).to.be.revertedWith("amountIn < 0");
    });

    it("debería fallar si reserveIn es 0", async function () {
        const { swap } = await loadFixture(deployFixture);
        const AmountIn = 1000;
        const reserveOut = 1000;

        await expect(
            swap.getAmountOut(AmountIn, 0, reserveOut)
        ).to.be.revertedWith("Reserves < 0");
    });

    it("debería fallar si reserveOut es 0", async function () {
        const { swap } = await loadFixture(deployFixture);
        const AmountIn = 1000;
        const reserveIn = 1000;

        await expect(
            swap.getAmountOut(AmountIn, reserveIn, 0)
        ).to.be.revertedWith("Reserves < 0");
    });

    it("debería calcular correctamente el amountOut con valores realistas", async function () {
        const { swap } = await loadFixture(deployFixture);

        const amountIn = 1000;
        const reserveIn = 5000;
        const reserveOut = 10000;

        const expected = Math.floor((amountIn * reserveOut) / (reserveIn + amountIn));
        const result = await swap.getAmountOut(amountIn, reserveIn, reserveOut);

        expect(result).to.equal(expected);
    });

    it("debería fallar si ambas reservas son 0 en getAmountOut", async function () {
        const { swap } = await loadFixture(deployFixture);

        await expect(
            swap.getAmountOut(1000, 0, 0)
        ).to.be.revertedWith("Reserves < 0");
    });


    //OTHER FUNCTIONS TESTS

    it("debería retornar correctamente el nombre del token LP", async function () {
        const { swap } = await loadFixture(deployFixture);
        expect(await swap.name()).to.equal("SimpleSwap LP Token");
    });

    it("debería retornar correctamente el símbolo del token LP", async function () {
        const { swap } = await loadFixture(deployFixture);
        expect(await swap.symbol()).to.equal("SSLP");
    });

    it("debería retornar correctamente los decimales del token LP", async function () {
        const { swap } = await loadFixture(deployFixture);
        expect(await swap.decimals()).to.equal(18);
    });


});