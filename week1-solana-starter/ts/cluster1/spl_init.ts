import { Keypair, Connection, Commitment } from "@solana/web3.js";
import { createMint } from '@solana/spl-token';
import wallet from "../../turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://turbine-solanad-4cde.devnet.rpcpool.com/168dd64f-ce5e-4e19-a836-f6482ad6b396", commitment);

(async () => {
    try {
        const mint = await createMint(
            connection,
            keypair,
            keypair.publicKey,
            null,
            6
            );

        console.log("Minted mint: " + mint);
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
