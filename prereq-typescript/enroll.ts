import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor";
import { Turbin3Prereq } from "./programs/turbin3-prereq";
import IDL from "./programs/turbin3-prereq-idl.json";
import wallet from "./turbin3-wallet.json"

// Create a keypair for the sender
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Open a connection to Solana devnet
const connection = new Connection("https://api.devnet.solana.com");

// Set github username
const github = Buffer.from("thecryptodandy", "utf8");

// Create the provider (context for transaction)
const provider = new AnchorProvider(connection, new Wallet(keypair), {
    commitment: "confirmed"
});

// Create program (API) from IDL to interact with onchain program
const program : Program<Turbin3Prereq> = new Program(IDL, provider);

// Create seed with 'prereq' string
const enrollmentSeeds = [Buffer.from('prereq'), keypair.publicKey.toBuffer()];

// Get keys for PDA
const [enrollementKey, bump] = PublicKey.findProgramAddressSync(enrollmentSeeds, program.programId);

// Run the transaction
(async () => {
    try {
        const transactionHash =
            await program.methods
                .submit(github) // Call submit method on onchain program with github args
                .accounts({signer: keypair.publicKey,})
                .signers([keypair]).rpc();

        console.log(`Success! Check out your TX here: https://explorer.solana.com/tx/${transactionHash}?cluster=devnet`);
    } catch(error) {
        console.error(`Oops, something went wrong: ${error}`)
    }
})()