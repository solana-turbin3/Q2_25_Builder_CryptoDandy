import { Keypair} from "@solana/web3.js";

// Generate a new keypair
let keypair = Keypair.generate();

// Print the pub key
console.log(`You've generate a new Solana wallet: ${keypair.publicKey.toBase58()}`);

// Print the private key
console.log(`[${keypair.secretKey}]`);
