import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEFAULT_DECIMALS, PumpFunSDK } from "../../src/index.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
} from "../util.js";

const KEYS_FOLDER = path.join(import.meta.dirname, ".keys");
const SLIPPAGE_BASIS_POINTS = 100n;

//create token example:
//https://solscan.io/tx/bok9NgPeoJPtYQHoDqJZyRDmY88tHbPcAk1CJJsKV3XEhHpaTZhUCG3mA9EQNXcaUfNSgfPkuVbEsKMp6H7D9NY
//devnet faucet
//https://faucet.solana.com/

const main = async () => {
  dotenv.config();

  if (!process.env.HELIUS_RPC_URL) {
    console.error("Please set HELIUS_RPC_URL in .env file");
    console.error(
      "Example: HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your api key>"
    );
    console.error("Get one at: https://www.helius.dev");
    return;
  }

  let connection = new Connection(process.env.HELIUS_RPC_URL || "");

  let wallet = new Wallet(new Keypair()); //note this is not used
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });

  const testAccount = getOrCreateKeypair(KEYS_FOLDER, "test-account");
  const mint = getOrCreateKeypair(KEYS_FOLDER, "mint");

  await printSOLBalance(
    connection,
    testAccount.publicKey,
    "Test Account keypair"
  );

  let sdk = new PumpFunSDK(provider);

  let globalAccount = await sdk.getGlobalAccount();
  console.log(globalAccount);

  let currentSolBalance = await connection.getBalance(testAccount.publicKey);
  if (currentSolBalance == 0) {
    console.log(
      "Please send some SOL to the test-account:",
      testAccount.publicKey.toBase58()
    );
    return;
  }

  console.log(await sdk.getGlobalAccount());

  // Track time and SOL costs
  const startTime = Date.now();
  const initialSolBalance = await connection.getBalance(testAccount.publicKey);
  let successfulCreations = 0;
  
  console.log(`\n💰 Initial SOL Balance: ${initialSolBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`⏰ Starting meme creation at: ${new Date().toLocaleTimeString()}`);

  // Generate random meme names and symbols
  const memeNames = [
    "DOGE SUPREME", "PEPE KING", "SHIBA MOON", "CAT COIN", "FROG PRINCE",
    "ROCKET MEME", "DIAMOND HANDS", "MOON SHOT", "LASER EYES", "CHAD COIN"
  ];
  
  const memeSymbols = [
    "DOGES", "PEPEK", "SHIBM", "CATC", "FROGP",
    "RKTM", "DMND", "MOON", "LASER", "CHAD"
  ];

  const memeDescriptions = [
    "The ultimate doge experience",
    "Rare pepe collection token",
    "Shiba inu to the moon",
    "Cats rule the blockchain",
    "Frog prince of DeFi",
    "Rocket fuel for your portfolio",
    "Diamond hands never sell",
    "Moon mission activated",
    "Laser eyes see the future",
    "Chad energy token"
  ];

  // Create 10 random memes
  for (let i = 0; i < 10; i++) {
    const randomMint = Keypair.generate();
    
    console.log(`\n--- Creating Meme ${i + 1}/10 ---`);
    console.log(`Mint: ${randomMint.publicKey.toBase58()}`);
    
    //Check if mint already exists (should be new)
    let boundingCurveAccount = await sdk.getBondingCurveAccount(randomMint.publicKey);
    if (!boundingCurveAccount) {
      let tokenMetadata = {
        name: memeNames[i],
        symbol: memeSymbols[i],
        description: memeDescriptions[i],
        file: await fs.openAsBlob("example/basic/random.png"),
      };

      let createResults = await sdk.createAndBuy(
        testAccount,
        randomMint,
        tokenMetadata,
        BigInt(0),
        SLIPPAGE_BASIS_POINTS,
        {
          unitLimit: 250000,
          unitPrice: 250000,
        },
      );

      if (createResults.success) {
        successfulCreations++;
        console.log(`✅ Success ${i + 1}: https://pump.fun/${randomMint.publicKey.toBase58()}`);
        boundingCurveAccount = await sdk.getBondingCurveAccount(randomMint.publicKey);
      } else {
        console.log(`❌ Create failed for meme ${i + 1}`);
      }
    } else {
      console.log(`Meme ${i + 1} already exists`);
    }
    
    // Small delay between creations to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Calculate final statistics
  const endTime = Date.now();
  const finalSolBalance = await connection.getBalance(testAccount.publicKey);
  const totalTimeMs = endTime - startTime;
  const totalSolSpent = (initialSolBalance - finalSolBalance) / LAMPORTS_PER_SOL;
  const avgTimePerMeme = totalTimeMs / 10;
  const avgSolPerMeme = totalSolSpent / successfulCreations;

  console.log("\n" + "=".repeat(60));
  console.log("📊 MEME CREATION STATISTICS");
  console.log("=".repeat(60));
  console.log(`🎯 Successful Creations: ${successfulCreations}/10`);
  console.log(`⏱️  Total Time: ${(totalTimeMs / 1000).toFixed(2)} seconds`);
  console.log(`⏱️  Average Time per Meme: ${(avgTimePerMeme / 1000).toFixed(2)} seconds`);
  console.log(`💰 Initial SOL Balance: ${(initialSolBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`💰 Final SOL Balance: ${(finalSolBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`💸 Total SOL Spent: ${totalSolSpent.toFixed(4)} SOL`);
  if (successfulCreations > 0) {
    console.log(`💸 Average SOL per Meme: ${avgSolPerMeme.toFixed(4)} SOL`);
  }
  console.log(`⏰ Finished at: ${new Date().toLocaleTimeString()}`);
  console.log("=".repeat(60));
};

main();
