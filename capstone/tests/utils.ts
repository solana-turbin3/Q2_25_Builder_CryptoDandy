import {Connection} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

const log = async (signature: string): Promise<string> => {
    console.log(
        `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
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
    });

    return signature;
};

const fundWallet = async function fundWallet(
    provider: anchor.Provider,
    account,
    amount: number
) {
    const signature = await provider.connection.requestAirdrop(
        account.publicKey,
        amount
    );
    await confirm(provider.connection, signature);
};

export {log, confirm, fundWallet};
