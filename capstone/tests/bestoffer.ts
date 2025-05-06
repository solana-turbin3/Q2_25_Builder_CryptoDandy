import * as anchor from "@coral-xyz/anchor";

import {Bestoffer} from "../target/types/bestoffer";

import {PublicKey, Keypair, LAMPORTS_PER_SOL} from "@solana/web3.js";

import {assert} from "chai";

import sodium from 'libsodium-wrappers';
import bs58 from 'bs58';

import {BUYING_INTENT_STATES} from "./enums";
import {log, fundWallet, confirm} from "./utils";

describe("bestoffer", () => {
    // Setup cluster config
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Connection
    const connection = provider.connection;

    // Setup program
    const program = anchor.workspace.bestoffer as anchor.Program<Bestoffer>;

    // Prepare all user accounts
    const admin = (provider.wallet as anchor.Wallet).payer;

    const buyer = Keypair.generate();
    const seller1 = Keypair.generate();
    const seller2 = Keypair.generate();

    const accounts = {
        admin: admin.publicKey,
        buyer: buyer.publicKey,
        seller1: seller1.publicKey,
        seller2: seller2.publicKey,
    };

    console.log(accounts);

    // Fund all accounts
    [buyer, seller1, seller2].forEach((account) => {
        fundWallet(provider, account, 10 * LAMPORTS_PER_SOL);
    });

    // Create Global Config
    it("Create Config", async () => {
        await program.methods.createConfig().signers([admin]).rpc();

        // Find the Config PDA data
        const configData = await program.account.config.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                program.programId
            )[0]
        );
        assert.equal(configData.fee, 100);
        assert.equal(configData.buyingIntentIncrement.toNumber(), 0);
        assert.equal(configData.offerIncrement.toNumber(), 0);
    });

    //  Create Buying Intent
    it("Create Buying Intent", async () => {
        const gtin: number = 3544056897834;
        const productName: string = "Focal Bathys MG";
        const shippingCountryCode: string = "FR";
        const quantity: number = 1;

        // Call the remote instruction
        const buyingIntentSignature = await program.methods
            .createBuyingIntent(
                new anchor.BN(gtin),
                productName,
                shippingCountryCode,
                null,
                quantity
            )
            .accounts({
                buyer: buyer.publicKey,
            })
            .signers([buyer])
            .rpc();

        await log(buyingIntentSignature);
        await confirm(connection, buyingIntentSignature);

        // Find the buying intent PDA data
        const buyingIntentData = await program.account.buyingIntent.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("buy_intent"), buyer.publicKey.toBuffer()],
                program.programId
            )[0]
        );

        // Buying Intent TEST
        // Mandatory field should be valid
        assert.equal(buyingIntentData.gtin.toNumber(), gtin);
        assert.equal(buyingIntentData.productName, productName);
        assert.equal(buyingIntentData.shippingCountryCode, shippingCountryCode);
        assert.equal(buyingIntentData.quantity, quantity);

        // Optional field should be null
        assert.isNull(buyingIntentData.shippingStateCode);
        assert.isNull(buyingIntentData.encryptedDeliveryInformation);

        // State after creation should be published
        assert.deepEqual(buyingIntentData.state, BUYING_INTENT_STATES.PUBLISHED);

        // Find the Config PDA data
        const configData = await program.account.config.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                program.programId
            )[0]
        );

        // Config TEST
        // Buying intent increment should be 1
        assert.equal(configData.buyingIntentIncrement.toNumber(), 1);
        // Offer increment should be 0
        assert.equal(configData.offerIncrement.toNumber(), 0);
    });

    //  Create Buying Intent
    it("Create an offer", async () => {
        const buyingIntent = PublicKey.findProgramAddressSync(
            [Buffer.from("buy_intent"), buyer.publicKey.toBuffer()],
            program.programId
        )[0];

        const config = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        )[0];

        const url: string = "https://www.worldwidestereo.com/products/focal-bathys-mg-over-ear-wireless-headphones-with-active-noise-cancelation";
        const publicPrice: number = 1299_000_000;
        const offerPrice: number = 1099_000_000;
        const shippingPrice: number = 40_000_000;

        // USDC For testing
        const mint: PublicKey = new PublicKey(
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        );

        const offerSignature = await program.methods
            .createOffer(
                url,
                new anchor.BN(publicPrice),
                new anchor.BN(offerPrice),
                new anchor.BN(shippingPrice),
                mint
            )
            .accounts({
                seller: seller1.publicKey,
                buyingIntent: buyingIntent,
            })
            .signers([seller1])
            .rpc()
        ;

        await log(offerSignature);
        await confirm(connection, offerSignature);

        // Find the offer PDA data
        const offerData = await program.account.offer.fetch(
            PublicKey.findProgramAddressSync(
                [
                    Buffer.from("offer"),
                    buyingIntent.toBuffer(),
                    seller1.publicKey.toBuffer(),
                ],
                program.programId
            )[0]
        );
    });
});
