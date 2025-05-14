import * as anchor from "@coral-xyz/anchor";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token"
import {Bestoffer} from "../target/types/bestoffer";

import {Keypair, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";

import {assert} from "chai";

import sodium from 'libsodium-wrappers';
import bs58 from 'bs58';

import {BUYING_INTENT_STATES, OFFER_STATES} from "./enums";
import {confirm, numberToLeBytes} from "./utils";

import buyerWallet from "../buyer-wallet.json";
import sellerWallet from "../seller-wallet.json";
import {step} from "mocha-steps";
import {createRandomMint} from "./instructions/createMint";
import {
    createAssociatedTokenAccountAndMint,
} from "./instructions/createAssociatedTokenAccounts";

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
    const buyer = Keypair.fromSecretKey(new Uint8Array(buyerWallet));
    const seller1 = Keypair.fromSecretKey(new Uint8Array(sellerWallet));


    const accounts = {
        admin: admin,
        buyer: buyer,
        seller1: seller1
    };

    let associatedTokenAccounts = {};

    const mintKeypair = Keypair.generate();

    step("Funds accounts if localnet", async () => {
        if (provider.connection.rpcEndpoint === 'http://127.0.0.1:8899') {
            try {
                const airdropPromises = [];

                Object.values(accounts).forEach((account) => {
                        airdropPromises.push(provider.connection.requestAirdrop(account.publicKey, LAMPORTS_PER_SOL))
                    }
                );

                await Promise.all(airdropPromises);
            } catch (e) {
                console.log('Error airdrop', e);
            }
        }
    });

    step("Prepare ATA Accounts", async () => {

        try {
            await createRandomMint(connection, mintKeypair, admin, admin);

            associatedTokenAccounts['admin'] = await createAssociatedTokenAccountAndMint(connection, mintKeypair.publicKey, admin, admin);
            associatedTokenAccounts['buyer'] = await createAssociatedTokenAccountAndMint(connection, mintKeypair.publicKey, admin, buyer);
            associatedTokenAccounts['seller1'] = await createAssociatedTokenAccountAndMint(connection, mintKeypair.publicKey, admin, seller1);

        } catch (e) {
            console.log('Error', e);
        }
    })

    // Create Global Config
    step("Create Config", (done) => {

        try {
            program.account.config.getAccountInfo(
                PublicKey.findProgramAddressSync(
                    [Buffer.from("config")],
                    program.programId
                )[0]
            ).then((accountInfo) => {
                if (accountInfo !== null && accountInfo.lamports > 0) {
                    console.log('Config already exists, skipping');
                    done()
                } else {

                    program.methods.createConfig().signers([admin]).rpc().then((signature) => {

                        confirm(connection, signature).then(() => {

                            program.account.config.fetch(
                                PublicKey.findProgramAddressSync(
                                    [Buffer.from("config")],
                                    program.programId
                                )[0]
                            ).then((configData) => {
                                assert.equal(configData.fee, 100);
                                assert.equal(configData.buyingIntentIncrement.toNumber(), 0);
                                assert.equal(configData.offerIncrement.toNumber(), 0);
                                done()
                            })
                        });
                    });
                }
            })
        } catch (e) {
            console.log('Error', e);
            done()
        }
    });

    // Create Treasury
    step("Create Treasury", (done) => {
        try {
            program.account.config.getAccountInfo(
                PublicKey.findProgramAddressSync(
                    [Buffer.from("treasury")],
                    program.programId
                )[0]
            ).then((accountInfo) => {
                if (accountInfo !== null && accountInfo.lamports > 0) {
                    console.log('Treasury already exists, skipping');
                    done()
                } else {
                    program.methods.createTreasury().signers([admin]).rpc().then((signature) => {
                        confirm(connection, signature).then(() => {
                            // Find the Config PDA data
                            program.account.treasury.fetch(
                                PublicKey.findProgramAddressSync(
                                    [Buffer.from("treasury")],
                                    program.programId
                                )[0]
                            ).then((treasuryData) => {
                                assert.equal(treasuryData.admin.toString(), admin.publicKey.toString());
                                done()
                            })
                        })
                    });
                }
            })
        } catch (e) {
            console.log('Error', e);
            done()
        }
    });

    //  Create Buying Intent
    step("Create Buying Intent", async () => {

        const gtin: number = 3544056897834;
        const productName: string = "Focal Bathys MG";
        const shippingCountryCode: string = "FR";
        const quantity: number = 1;

        // Find the Config PDA data
        const beforeTestConfigData = await program.account.config.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                program.programId
            )[0]
        );

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

        await confirm(connection, buyingIntentSignature);

        // Find the buying intent PDA data
        const buyingIntentData = await program.account.buyingIntent.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("buy_intent"), buyer.publicKey.toBuffer(), numberToLeBytes(beforeTestConfigData.buyingIntentIncrement.toNumber())],
                program.programId
            )[0]
        );

        // Buying Intent TEST
        // Mandatory field should be valid
        assert.equal(buyingIntentData.id.toNumber(), beforeTestConfigData.buyingIntentIncrement.toNumber());
        assert.equal(buyingIntentData.gtin.toNumber(), gtin);
        assert.equal(buyingIntentData.productName, productName);
        assert.equal(buyingIntentData.shippingCountryCode, shippingCountryCode);
        assert.equal(buyingIntentData.quantity, quantity);

        // Optional field should be null
        assert.isNull(buyingIntentData.shippingStateCode);

        // State after creation should be published
        assert.deepEqual(buyingIntentData.state, BUYING_INTENT_STATES.PUBLISHED);


        // Config TEST
        const afterConfigData = await program.account.config.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                program.programId
            )[0]
        );

        // Buying intent increment should be +1
        assert.equal(afterConfigData.buyingIntentIncrement.toNumber(), beforeTestConfigData.buyingIntentIncrement.toNumber() + 1);
    });

    //  Create an offer
    step("Create an offer", async () => {

        const config = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        )[0];

        const beforeTestConfigData = await program.account.config.fetch(config);

        const buyingIntent = PublicKey.findProgramAddressSync(
            [Buffer.from("buy_intent"), buyer.publicKey.toBuffer(), numberToLeBytes(beforeTestConfigData.buyingIntentIncrement.toNumber() - 1)],
            program.programId,
        )[0];

        const url: string = "https://www.worldwidestereo.com/products/focal-bathys-mg-over-ear-wireless-headphones-with-active-noise-cancelation";
        const publicPrice: number = 599_000_000;
        const offerPrice: number = 400_000_000;
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

        await confirm(connection, offerSignature);

        // Find the offer PDA data
        const offerData = await program.account.offer.fetch(
            PublicKey.findProgramAddressSync(
                [
                    Buffer.from("offer"),
                    buyingIntent.toBuffer(),
                    seller1.publicKey.toBuffer(),
                    numberToLeBytes(beforeTestConfigData.offerIncrement.toNumber()),
                ],
                program.programId
            )[0]
        );

        // Buying Intent TEST
        // Mandatory field should be valid
        assert.equal(offerData.id.toNumber(), beforeTestConfigData.offerIncrement.toNumber());
        assert.equal(offerData.url, 'https://www.worldwidestereo.com/products/focal-bathys-mg-over-ear-wireless-headphones-with-active-noise-cancelation');
        assert.equal(offerData.publicPrice.toNumber(), publicPrice);
        assert.equal(offerData.offerPrice.toNumber(), offerPrice);
        assert.equal(offerData.shippingPrice.toNumber(), shippingPrice);

        // Config TEST
        const afterConfigData = await program.account.config.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                program.programId
            )[0]
        );

        // Offer increment should be +1
        assert.equal(afterConfigData.offerIncrement.toNumber(), beforeTestConfigData.offerIncrement.toNumber() + 1);
    });

    step("Accept offer", async () => {

        await sodium.ready;

        const sellerX25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(bs58.decode(seller1.publicKey.toBase58()));
        const sellerX25519SecretKey = sodium.crypto_sign_ed25519_sk_to_curve25519(seller1.secretKey);
        const buyerEphemeral = sodium.crypto_box_keypair();
        const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

        const config = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        )[0];

        const beforeTestConfigData = await program.account.config.fetch(config);

        const buyingIntent = PublicKey.findProgramAddressSync(
            [Buffer.from("buy_intent"), buyer.publicKey.toBuffer(), numberToLeBytes(beforeTestConfigData.buyingIntentIncrement.toNumber() - 1)],
            program.programId
        )[0];

        const offer = PublicKey.findProgramAddressSync(
            [
                Buffer.from("offer"),
                buyingIntent.toBuffer(),
                seller1.publicKey.toBuffer(),
                numberToLeBytes(beforeTestConfigData.offerIncrement.toNumber() - 1)
            ],
            program.programId
        )[0];


        const encodeForSeller = (message): Buffer => {
            return Buffer.from(sodium.crypto_box_easy(
                new TextEncoder().encode(message),
                nonce,
                sellerX25519PublicKey,
                buyerEphemeral.privateKey
            ));
        };


        // Dériver l'adresse PDA pour encrypted_delivery_information
        const encryptedDeliveryInformation = PublicKey.findProgramAddressSync(
            [Buffer.from("encrypted_delivery_information"), buyingIntent.toBuffer()],
            program.programId
        )[0];

        // Dériver l'adresse du vault (compte de token associé pour le buying intent)

        const vault = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            buyingIntent,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const address = {
            firstname: 'Pete',
            lastname: 'Jones',
            address_line_1: '123 Main St',
            address_line_2: '',
            city: 'New York',
            postal_code: '10001',
            country_code: 'US',
            state_code: 'NY',
        }

        const acceptOfferSignature = await program.methods
            .acceptOffer(
                offer,
                Array.from(nonce),
                Array.from(buyerEphemeral.publicKey),
                encodeForSeller(address.lastname),
                encodeForSeller(address.firstname),
                encodeForSeller(address.address_line_1),
                encodeForSeller(address.address_line_2),
                encodeForSeller(address.city),
                encodeForSeller(address.postal_code),
                encodeForSeller(address.country_code),
                encodeForSeller(address.state_code)
            )
            .accounts({
                buyer: buyer.publicKey,
                buyingIntent: buyingIntent,
                offer: offer,
                encryptedDeliveryInformation: encryptedDeliveryInformation,
                mint: mintKeypair.publicKey,
                buyerAta: associatedTokenAccounts.buyer.address,
                vault: vault,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([buyer])
            .rpc();

        // Find the encrypted Delivery information PDA data
        const encryptedDeliveryInformationData = await program.account.encryptedDeliveryInformation.fetch(
            encryptedDeliveryInformation
        );

        const decodeFromBuyer = (encryptedMessage: Uint8Array): string => {
            const decrypted = sodium.crypto_box_open_easy(
                encryptedMessage,
                Uint8Array.from(encryptedDeliveryInformationData.nonce),
                Uint8Array.from(encryptedDeliveryInformationData.buyerEphemeralPubkey),
                sellerX25519SecretKey
            );

            return new TextDecoder().decode(decrypted);
        };


        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryFirstname), address.firstname);
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryLastname), address.lastname);
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryAddressLine1), address.address_line_1);
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryAddressLine2), address.address_line_2);
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryCity), address.city);
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryPostalCode), address.postal_code);
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryCountryCode), address.country_code);
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryStateCode), address.state_code);

        const buyerBalance = await connection.getTokenAccountBalance(associatedTokenAccounts.buyer.address);
        assert.equal(buyerBalance.value.uiAmount, 600); // 1000 - 400 lock in vault

        const vaultBalance = await connection.getTokenAccountBalance(vault);
        assert.equal(vaultBalance.value.uiAmount, 400); // 400 lock in vault
    })

    step("Create tracking detail", async () => {

        const config = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        )[0];

        const beforeTestConfigData = await program.account.config.fetch(config);

        const buyingIntent = PublicKey.findProgramAddressSync(
            [Buffer.from("buy_intent"), buyer.publicKey.toBuffer(), numberToLeBytes(beforeTestConfigData.buyingIntentIncrement.toNumber() - 1)],
            program.programId
        )[0];

        const trackingDetails = {
            carrier_name: 'UPS',
            tracking_url: 'https://www.ups.com/track?loc=en_US&requester=ST&trackingNumber=1Z000000000000000',
            tracking_code: '1Z000000000000000',
        }

        const createTrackingDetailSignature = await program.methods
            .createTrackingDetails(
                trackingDetails.carrier_name,
                trackingDetails.tracking_url,
                trackingDetails.tracking_code,
            )
            .accounts({
                seller: seller1.publicKey,
                buyingIntent: buyingIntent,
            })
            .signers([seller1])
            .rpc();

        const trackingDetailsData = await program.account.trackingDetails.fetch(
            PublicKey.findProgramAddressSync(
                [
                    Buffer.from("tracking_details"),
                    buyingIntent.toBuffer(),
                ],
                program.programId
            )[0]
        );

        assert.equal(trackingDetailsData.carrierName, trackingDetails.carrier_name);
        assert.equal(trackingDetailsData.trackingUrl, trackingDetails.tracking_url);
        assert.equal(trackingDetailsData.trackingCode, trackingDetails.tracking_code);

    });

    step('Buyer accept delivery', async () => {

        const config = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        )[0];

        const beforeTestConfigData = await program.account.config.fetch(config);

        // Get Buying Intent Account
        const buyingIntent = PublicKey.findProgramAddressSync(
            [Buffer.from("buy_intent"), buyer.publicKey.toBuffer(), numberToLeBytes(beforeTestConfigData.buyingIntentIncrement.toNumber() - 1)],
            program.programId
        )[0];

        // Get Offer Account
        const offer = PublicKey.findProgramAddressSync(
            [
                Buffer.from("offer"),
                buyingIntent.toBuffer(),
                seller1.publicKey.toBuffer(),
                numberToLeBytes(beforeTestConfigData.offerIncrement.toNumber() - 1)
            ],
            program.programId
        )[0];

        // Get Vault Account
        const vault = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            buyingIntent,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Get Treasury Account
        const treasury = PublicKey.findProgramAddressSync(
            [Buffer.from("treasury")],
            program.programId
        )[0];

        // Get Treasury ATA
        const treasuryAta = await getOrCreateAssociatedTokenAccount(
            connection,
            admin,
            mintKeypair.publicKey,
            treasury,
            true,
            'confirmed',
            {commitment: 'confirmed'},
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Get all balances
        const initialVaultBalance = await connection.getTokenAccountBalance(vault);
        const initialSellerBalance = await connection.getTokenAccountBalance(associatedTokenAccounts.seller1.address);
        const initialTreasuryBalance = await connection.getTokenAccountBalance(treasuryAta.address);

        const acceptDeliverySignature = await program.methods
            .acceptDelivery()
            .accounts({
                buyer: buyer.publicKey,
                seller: seller1.publicKey,
                config: config,
                buyingIntent: buyingIntent,
                offer: offer,
                treasury: treasury,
                mint: mintKeypair.publicKey,
                vault: vault,
                sellerAta: associatedTokenAccounts.seller1.address,
                treasuryAta: treasuryAta.address,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .signers([buyer])
            .rpc();

        await confirm(connection, acceptDeliverySignature);

        // After transaction balances
        const finalVaultBalance = await connection.getTokenAccountBalance(vault);
        const finalTreasuryBalance = await connection.getTokenAccountBalance(treasuryAta.address);
        const finalSellerBalance = await connection.getTokenAccountBalance(associatedTokenAccounts.seller1.address);

        // Get configs
        const configData = await program.account.config.fetch(config);

        // Treasury should receive 1% of vault balance

        const expectedFee = (initialVaultBalance.value.uiAmount * configData.fee) / 10000;
        assert.equal(
            finalTreasuryBalance.value.uiAmount - initialTreasuryBalance.value.uiAmount,
            expectedFee
        );

        // Seller should receive the rest
        const expectedSellerAmount = initialVaultBalance.value.uiAmount - expectedFee;
        assert.equal(
            finalSellerBalance.value.uiAmount - initialSellerBalance.value.uiAmount,
            expectedSellerAmount
        );

        // State verifications
        const buyingIntentData = await program.account.buyingIntent.fetch(buyingIntent);
        const offerData = await program.account.offer.fetch(offer);

        assert.deepEqual(buyingIntentData.state, BUYING_INTENT_STATES.FULFILLED);
        assert.deepEqual(offerData.state, OFFER_STATES.DELIVERED);
    });
});