import {Connection, Keypair, PublicKey} from "@solana/web3.js";
import {
    Account,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";

const MINT_AMOUNT = 1_000_000_000;
const COMMITMENT_LEVEL = 'confirmed';

export const createAssociatedTokenAccountAndMint = async (
    connection: Connection,
    mint: PublicKey,
    authority: Keypair,
    account: Keypair
): Promise<Account> => {
    try {
        const ata = await getOrCreateAssociatedTokenAccount(
            connection,
            account,
            mint,
            account.publicKey,
            false,
            COMMITMENT_LEVEL,
            {commitment: COMMITMENT_LEVEL},
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        await mintTo(
            connection,
            authority,
            mint,
            ata.address,
            authority,
            MINT_AMOUNT,
            [],
            {commitment: COMMITMENT_LEVEL},
            TOKEN_PROGRAM_ID
        );

        return ata;

    } catch (error) {
        console.error('Error creating associated token accounts:', error);
        throw error;
    }
};