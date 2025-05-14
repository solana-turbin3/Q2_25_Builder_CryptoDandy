import {Connection} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

const log = async (signature: string): Promise<string> => {
    console.log(
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
    return signature;
};

const confirm = async (
    connection: Connection,
    signature: string
): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        signature,
        ...block,
    }, 'confirmed');

    return signature;
};

const fundWallet = async function fundWallet(
    provider: anchor.Provider,
    account,
    amount: number
) {

    try {
        const signature = await provider.connection.requestAirdrop(
            account.publicKey,
            amount
        );

        log(signature);
        await confirm(provider.connection, signature);

    } catch (e) {
        console.log(`error in funding wallet with requestAirdrop : ${e.message}`);
    }
};

function numberToLeBytes(num: number, length: number = 8): Buffer {
    const buffer = Buffer.alloc(length);
    buffer.writeBigUInt64LE(BigInt(num), 0);
    return buffer;
}


export {log, confirm, fundWallet, numberToLeBytes};
