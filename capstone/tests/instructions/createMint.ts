import {createMint, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {Connection, Keypair, PublicKey} from "@solana/web3.js";

const MINT_DECIMALS = 6;
const MINT_CONFIG = {
    commitment: 'confirmed' as const,
    programId: TOKEN_PROGRAM_ID
};

export const createRandomMint = async (
    connection: Connection,
    mint: Keypair,
    payer: Keypair,
    authority: Keypair,
): Promise<PublicKey> => {
    try {
        return await createMint(
            connection,
            payer,
            authority.publicKey,
            null,
            MINT_DECIMALS,
            mint,
            MINT_CONFIG
        );
    } catch (error) {
        throw new Error(`Error on mint creation ${error instanceof Error ? error.message : 'Error'}`);
    }
};