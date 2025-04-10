import { Transaction, SystemProgram, Connection, Keypair, sendAndConfirmTransaction, PublicKey } from "@solana/web3.js";

import wallet from "../dev-wallet.json";

// Create a keypair for the sender
const from = Keypair.fromSecretKey(new Uint8Array(wallet));

// Create the recipient PublicKey
const to = new PublicKey("JDxUrG2oGFX2wVU9FYK9VKJLe9EMKCVyGkTbtsMRQwmB");

// Open a connection to Solana devnet
const connection = new Connection("https://api.devnet.solana.com");

// Run the transaction
(async () => {
    try {

        // Get the wallet balance (in LAMPORT)
        const balance = await connection.getBalance(from.publicKey);

        // Prepare the transaction for simulation and calculate fees
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: balance, // Send whole balance
            })
        );

        // Get recent confirmed blockhash (< 1mn)
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

        // Fee are by sender
        transaction.feePayer = from.publicKey;

        // Extract fee from RPC Simulation
        const fee =(await connection.getFeeForMessage(transaction.compileMessage(), 'confirmed')).value || 0;

        // Remove the instruction from transaction
        transaction.instructions.pop();

        // Add new transfer instruction with exact amount (balance minus fee)
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: balance - fee
            })
        )

        // Send transaction to RPC
        const signature = await sendAndConfirmTransaction(connection, transaction, [from]);

        console.log(`Success! Check out your TX here: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (error) {
        console.error(`Oops, something went wrong: ${error}`)
    }
})();

