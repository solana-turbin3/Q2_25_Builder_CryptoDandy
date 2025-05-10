import * as anchor from "@coral-xyz/anchor";
import {ASSOCIATED_TOKEN_PROGRAM_ID, createMint,
    getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo,
    TOKEN_PROGRAM_ID} from "@solana/spl-token"
import {Bestoffer} from "../target/types/bestoffer";

import {PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram} from "@solana/web3.js";

import {assert} from "chai";

import sodium from 'libsodium-wrappers';
import bs58 from 'bs58';

import {BUYING_INTENT_STATES} from "./enums";
import {log, fundWallet, confirm, } from "./utils";

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


    // Créer un nouveau keypair pour le mint
    const mintKeypair = Keypair.generate();

    // Fund all accounts
    [buyer, seller1, seller2].forEach((account) => {
        fundWallet(provider, account, 10 * LAMPORTS_PER_SOL);
    });



    const accounts = {
        admin: admin.publicKey,
        buyer: buyer.publicKey,
        seller1: seller1.publicKey,
        seller2: seller2.publicKey,
    };


    const atas = {
    };

    it("Create mint account and fund participants", async () => {

        // Créer le compte mint
        const createMintTx = await createMint(
            connection,
            admin,           // payeur
            admin.publicKey, // autorité du mint
            null,           // freeze authority (null = pas de freeze)
            6,              // décimales
            mintKeypair,    // utiliser le keypair généré
            { commitment: 'confirmed' },      // options par défaut
            TOKEN_PROGRAM_ID
        );

        Object.entries(accounts).forEach(
            async ([account, pubkey]) => {
                const ata = await getOrCreateAssociatedTokenAccount(
                    connection,
                    admin,
                    mintKeypair.publicKey,
                    pubkey,
                    false,
                    'confirmed',
                    { commitment: 'confirmed' },
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                );

                atas[`${account}AssociatedTokenAccount`] = ata;

                await mintTo(
                    connection,
                    admin,
                    mintKeypair.publicKey,
                    ata.address,
                    admin,
                    1000_000_000,
                    [],
                    { commitment: 'confirmed' },
                    TOKEN_PROGRAM_ID
                );
            }
        );

        // Vérifier les soldes
        Object.entries(accounts).forEach(
            async ([account, pubkey]) => {
                const balance = await connection.getTokenAccountBalance(`${account}AssociatedTokenAccount`.address);
                assert.equal(balance.value.uiAmount, 1000);
            }
        )
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
    it("List buying intent", async () => {
        const accounts = await program.account.buyingIntent.all();
        assert.equal(accounts.length, 1);
    });

    //  Create an offer
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

        // Buying Intent TEST
        // Mandatory field should be valid
        assert.equal(offerData.url, 'https://www.worldwidestereo.com/products/focal-bathys-mg-over-ear-wireless-headphones-with-active-noise-cancelation');
        assert.equal(offerData.publicPrice.toNumber(), publicPrice );
        assert.equal(offerData.offerPrice.toNumber(), offerPrice);
        assert.equal(offerData.shippingPrice.toNumber(), shippingPrice);
    });

    it("Accept offer", async () => {

        await sodium.ready;

        const sellerX25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(bs58.decode(seller1.publicKey.toBase58()));
        const sellerX25519SecretKey = sodium.crypto_sign_ed25519_sk_to_curve25519(seller1.secretKey);
        const buyerEphemeral = sodium.crypto_box_keypair();
        const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

        const buyingIntent = PublicKey.findProgramAddressSync(
            [Buffer.from("buy_intent"), buyer.publicKey.toBuffer()],
            program.programId
        )[0];

        const config = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        )[0];

        const offer = PublicKey.findProgramAddressSync(
            [
                Buffer.from("offer"),
                buyingIntent.toBuffer(),
                seller1.publicKey.toBuffer(),
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
            true,    // allowOwnerOffCurve = true car buyingIntent est un PDA
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
                buyerAssociatedTokenAccount: atas.buyerAssociatedTokenAccount.address,
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


        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryFirstname), address.firstname );
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryLastname), address.lastname );
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryAddressLine1), address.address_line_1 );
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryAddressLine2), address.address_line_2 );
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryCity), address.city );
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryPostalCode), address.postal_code );
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryCountryCode), address.country_code );
        assert.equal(decodeFromBuyer(encryptedDeliveryInformationData.encryptedDeliveryStateCode), address.state_code );

        const buyerBalance = await connection.getTokenAccountBalance(atas.buyerAssociatedTokenAccount.address);
        assert.equal(buyerBalance.value.uiAmount, 600); // 1000 - 400 lock in vault

        const vaultBalance = await connection.getTokenAccountBalance(vault);
        assert.equal(vaultBalance.value.uiAmount, 400); // 400 lock in vault
    })

    it("Create tracking detail", async () => {

        const buyingIntent = PublicKey.findProgramAddressSync(
            [Buffer.from("buy_intent"), buyer.publicKey.toBuffer()],
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
});
