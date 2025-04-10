import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import wallet from "../../turbin3-wallet.json"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://turbine-solanad-4cde.devnet.rpcpool.com/168dd64f-ce5e-4e19-a836-f6482ad6b396", commitment);

// Mint address
const mint = new PublicKey("CCtEyRB1spa8HG4bEtCgDshxJpyyBAND75QtssRDr6Ud");

// Recipient address
const to = new PublicKey("8dhWbGMVtzb97GLKFQytPFrnme34cgR13fPiWgcpgm22");

(async () => {
    try {
        // Get the token account of the fromWallet address, and if it does not exist, create it
        const ataFrom = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            keypair.publicKey
        );

        // Get the token account of the toWallet address, and if it does not exist, create it
        const ataTo = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            to
        );

        const transferTx = await transfer(
            connection,
            keypair,
            ataFrom.address,
            ataTo.address,
            keypair.publicKey,
            1_000_000n
        )

        console.log(`transferTx : ${transferTx.toString()}`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})()