/**
 * @file script.js
 * @description Front-end logic to interact with the SimpleSwap contract using ethers.js.
 * Handles wallet connection, token balances, swap estimation, approval, and execution.
 * All comments and variables follow English naming conventions and good practices.
 */

const CONTRACT_ADDRESS = "0x07075A92C3aafc147D58885A5F4B539EDec292aB";

const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_tokenA", "type": "address" },
      { "internalType": "address", "name": "_tokenB", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "provider", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amountA", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amountB", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "liquidityMinted", "type": "uint256" }
    ],
    "name": "InitialLiquidityAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "provider", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amountA", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amountB", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "liquidityMinted", "type": "uint256" }
    ],
    "name": "LiquidityAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "provider", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amountA", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amountB", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "liquidityBurned", "type": "uint256" }
    ],
    "name": "LiquidityRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "swapper", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "tokenIn", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "tokenOut", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ],
    "name": "TokensSwapped",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA_", "type": "address" },
      { "internalType": "address", "name": "tokenB_", "type": "address" },
      { "internalType": "uint256", "name": "amountADesired", "type": "uint256" },
      { "internalType": "uint256", "name": "amountBDesired", "type": "uint256" },
      { "internalType": "uint256", "name": "amountAMin", "type": "uint256" },
      { "internalType": "uint256", "name": "amountBMin", "type": "uint256" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "addLiquidity",
    "outputs": [
      { "internalType": "uint256", "name": "amountA", "type": "uint256" },
      { "internalType": "uint256", "name": "amountB", "type": "uint256" },
      { "internalType": "uint256", "name": "liquidity", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      { "internalType": "uint8", "name": "", "type": "uint8" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "reserveIn", "type": "uint256" },
      { "internalType": "uint256", "name": "reserveOut", "type": "uint256" }
    ],
    "name": "getAmountOut",
    "outputs": [
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA_", "type": "address" },
      { "internalType": "address", "name": "tokenB_", "type": "address" }
    ],
    "name": "getPrice",
    "outputs": [
      { "internalType": "uint256", "name": "price", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA_", "type": "address" },
      { "internalType": "address", "name": "tokenB_", "type": "address" },
      { "internalType": "uint256", "name": "liquidity", "type": "uint256" },
      { "internalType": "uint256", "name": "amountAMin", "type": "uint256" },
      { "internalType": "uint256", "name": "amountBMin", "type": "uint256" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "removeLiquidity",
    "outputs": [
      { "internalType": "uint256", "name": "amountA", "type": "uint256" },
      { "internalType": "uint256", "name": "amountB", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reserveA",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reserveB",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [
      { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenA",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenB",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const TOKEN_A_ADDRESS = "0xE893eB464b251d3174f4E2210aB537918cC4FFF6"; // Dirección del token M10
const TOKEN_B_ADDRESS = "0x18d27f72Bc6B7CE5cf1998d4e4fA746630cA3C40"; // Dirección del token CR7

let provider;

/**
 * Connects the dApp to MetaMask or fallback provider.
 * Displays shortened wallet address and triggers initial data update.
 */
async function connect() {
  try {
    let signer = null;

    if (window.ethereum == null) {
      console.log("MetaMask no está instalado; solo lectura");
      provider = ethers.getDefaultProvider();
    } else {
      provider = new ethers.BrowserProvider(window.ethereum);

      signer = await provider.getSigner();

      const address = await signer.getAddress();
      const short = address.slice(0, 6) + "..." + address.slice(-4);
      document.getElementById("account").innerText = `Connected to: ${short}`;

    }
  } catch (err) {
    console.error("Error al conectar", err);
  }
  await updatePrice();
  await updateBalances();
}

/**
 * Fetches and displays the current token price from the smart contract.
 */
async function updatePrice() {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const price = await contract.getPrice(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS);
    const formatted = ethers.formatUnits(price, 18);
    document.querySelector("#swap-price .precio").innerText = Number(formatted).toFixed(2);
  } catch (err) {
    console.error("Error al obtener el precio:", err);
    document.querySelector("#swap-price .precio").innerText = "error";
  }
}

/**
 * Retrieves and displays the user's token balances for M10 and CR7.
 */
async function updateBalances() {
  try {
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    const tokenA = new ethers.Contract(TOKEN_A_ADDRESS, [
      "function balanceOf(address) view returns (uint256)"
    ], provider);

    const tokenB = new ethers.Contract(TOKEN_B_ADDRESS, [
      "function balanceOf(address) view returns (uint256)"
    ], provider);

    const balanceA = await tokenA.balanceOf(address);
    const balanceB = await tokenB.balanceOf(address);

    document.getElementById("balanceM10").innerText = Number(ethers.formatUnits(balanceA, 18)).toFixed(0);
    document.getElementById("balanceCR7").innerText = Number(ethers.formatUnits(balanceB, 18)).toFixed(0);
  } catch (err) {
    console.error("Error al obtener los balances:", err);
  }
}

/**
 * Estimates the amount of token B the user will receive for the entered token A amount.
 * Uses the getAmountOut() contract function based on current reserves.
 */
async function setValueTokenToSpend() {
  try {
    const amountInStr = document.querySelector('.IHAVE').value;
    const amountIn = ethers.parseUnits(amountInStr || "0", 18);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const reserveA = await contract.reserveA();
    const reserveB = await contract.reserveB();

    const amountOut = await contract.getAmountOut(amountIn, reserveA, reserveB)

    document.querySelector('.IWANT').value =Number(ethers.formatUnits(amountOut, 18)).toFixed(2);
  } catch (err) {
    console.error("Error al calcular IWANT:", err);
    document.querySelector('.IWANT').value = "error";
  }
}

/**
 * Approves the SimpleSwap contract to spend the user's token A (M10).
 * Must be called before swapping.
 */
async function handleApprove() {
  try {
    const signer = await provider.getSigner();
    const tokenA = new ethers.Contract(TOKEN_A_ADDRESS, [
      "function approve(address spender, uint256 amount) public returns (bool)"
    ], signer);

    const inputAmount = document.querySelector(".IHAVE").value || "0";
    const amountToApprove = ethers.parseUnits(inputAmount, 18); const tx = await tokenA.approve(CONTRACT_ADDRESS, amountToApprove);
    alert("Transacción enviada: esperando confirmación...");
    await tx.wait();
    alert("Approve exitoso ✅");
  } catch (err) {
    console.error("Error al aprobar:", err);
    alert("❌ Error al hacer el approve");
  }
}

/**
 * Executes a token swap from token A to token B using the SimpleSwap contract.
 * Requires approval beforehand. Includes slippage tolerance of 1%.
 */
async function handleSubmit() {
  try {
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const inputAmount = document.querySelector(".IHAVE").value;

    if (!inputAmount || isNaN(inputAmount) || parseFloat(inputAmount) <= 0) {
      alert("Por favor ingresá una cantidad válida");
      return;
    }

    const amountIn = ethers.parseUnits(inputAmount, 18); // asumimos 18 decimales
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutos desde ahora
    const path = [TOKEN_A_ADDRESS, TOKEN_B_ADDRESS];
    const userAddress = await signer.getAddress();

    // Opción 1: definir un mínimo esperado con 1% de slippage
    const price = await contract.getPrice(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS);
    const amountOutMin = amountIn * price / 10n ** 18n * 99n / 100n;

    // Aprobación previa (solo si no lo hiciste antes)
    const tokenA = new ethers.Contract(TOKEN_A_ADDRESS, [
      "function approve(address spender, uint256 amount) public returns (bool)"
    ], signer);
    //await tokenA.approve(CONTRACT_ADDRESS, amountIn);

    // Ejecutar el swap
    const tx = await contract.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      userAddress,
      deadline
    );

    alert("Transacción enviada. Esperando confirmación...");
    await tx.wait();

    alert("Swap realizado con éxito ✅");
    await updatePrice();
    await updateBalances();
  } catch (err) {
    console.error("Error en el swap:", err);
    alert("⚠️ Hubo un error al hacer el swap. Ver consola.");
  }
}