import bs58 from "bs58";

// Init prompt tool
const prompt = require("prompt-sync")();

// Ask base58 key in hide mode
let base58PrivateKey = prompt.hide("Enter base58 private key : ");
const walletPrivateKey = bs58.decode(base58PrivateKey).toString();

// Print the private key converted
console.log(`wallet private key : [${walletPrivateKey}]`);
