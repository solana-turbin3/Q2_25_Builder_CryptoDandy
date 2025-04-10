import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import wallet from "./dev-wallet.json";

// Create a keypair from secret key
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Open a connection to Solana devnet
const connection = new Connection('https://api.devnet.solana.com');

// Run the transaction
(async () => {
    try {
        const transactionHash = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
        console.log(`Success ! Checkout out your TX here : https://explorer.solana.com/tx/${transactionHash}?cluster=devnet`);
    } catch (error) {
        console.error(`Oops, something went wrong: ${error}`);
    }
})();