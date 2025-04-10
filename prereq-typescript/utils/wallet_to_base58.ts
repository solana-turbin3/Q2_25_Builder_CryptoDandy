import bs58 from "bs58";

// Init prompt tool
const prompt = require("prompt-sync")();

let walletPrivateKeyAsString = prompt.hide("Enter wallet private key : ");

// Remove [] from wallet
walletPrivateKeyAsString = walletPrivateKeyAsString.replace(/[\[\]\s]/g, '');

// Convert to numberArray
const walletPrivateKey = new Uint8Array(walletPrivateKeyAsString.split(',').map(Number));

// Encode to base58
let base58PrivateKey = bs58.encode(walletPrivateKey).toString();

console.log(`base58 private key : ${base58PrivateKey}`);
