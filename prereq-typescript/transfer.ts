import { Transaction, SystemProgram, Connection, Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction, PublicKey } from "@solana/web3.js";

import wallet from "./dev-wallet.json";

// Create a keypair for the sender
const from = Keypair.fromSecretKey(new Uint8Array(wallet));

// Create the recipient PublicKey
const to = new PublicKey("JDxUrG2oGFX2wVU9FYK9VKJLe9EMKCVyGkTbtsMRQwmB");

// Open a connection to Solana devnet
const connection = new Connection("https://api.devnet.solana.com");

// Run the transaction
(async () => {
    try {

        // Prepare the transaction to transfer 0.1 SOL from sender to reciepent
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: LAMPORTS_PER_SOL / 10, // Send 0.1 SOL
            })
        );

        // Get recent confirmed blockhash (< 1mn)
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

        // Send transaction to RPC
        const signature = await sendAndConfirmTransaction(connection, transaction, [from]);

        console.log(`Success! Check out your TX here: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (error) {
        console.error(`Oops, something went wrong: ${error}`)
    }
})();

