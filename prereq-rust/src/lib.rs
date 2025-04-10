mod programs;

#[cfg(test)]
mod tests {
    use crate::programs::Turbin3_prereq::{TurbinePrereqProgram, CompleteArgs};
    use std::io::{stdin, BufRead};
    use solana_sdk::{signature::{Keypair, Signer, read_keypair_file}, transaction::Transaction};
    use solana_client::rpc_client::RpcClient;
    use solana_program::{pubkey::Pubkey, system_instruction::transfer, hash::hash, system_program};
    use solana_program::message::Message;
    const RPC_URL: &str = "https://api.devnet.solana.com";

    #[test]
    fn keygen() {
        // Create a new pair
        let keypair = Keypair::new();
        println!("ou've generated a new Solana wallet: {}", keypair.pubkey().to_string());
        println!();
        println!("To save your wallet, copy and paste the following into a JSON file");
        println!("{:?}", keypair.to_bytes());
    }

    #[test]
    fn airdrop() {
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let client = RpcClient::new(RPC_URL);

        match client.request_airdrop(&keypair.pubkey(), 2_000_000_000u64) {
            Ok(signature) => {
                println!("Success! Check out your TX here:");
                println!("https://explorer.solana.com/tx/{}?cluster=devnet", signature.to_string());
            }
            Err(error) => {
                println!("Oops, something went wrong: {}", error.to_string());
            }
        }
    }

    #[test]
    fn enroll() {
        let signer = read_keypair_file("turbin3-wallet.json").expect("Couldn't find wallet file");

        let rpc_client = RpcClient::new(RPC_URL);

        let prereq = TurbinePrereqProgram::derive_program_address(&[b"prereq", signer.pubkey().to_bytes().as_ref()]);

        let args = CompleteArgs { github: b"thecryptodandy".to_vec() };

        let recent_blockhash = rpc_client.get_latest_blockhash().expect("rpc failed to return latest blockhash");

        let transaction = TurbinePrereqProgram::complete(
            &[&signer.pubkey(), &prereq, &system_program::id()],
            &args,
            Some(&signer.pubkey()),
            &[&signer],
            recent_blockhash,
        );

        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");

        println!("Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet", signature);
    }
    #[test]
    fn transfer_sol() {
        let from_keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let from_pubkey = from_keypair.pubkey();

        let message_bytes = b"I verify my solana Keypair!";
        let sig = from_keypair.sign_message(message_bytes);
        let sig_hashed = hash(sig.as_ref());

        // After that we can verify the signature, using the default implementation
        match sig.verify(&from_pubkey.to_bytes(), &sig_hashed.to_bytes()) {
            true => println!("Signature verified"),
            false => println!("Verification failed"),
        }

        let to_keypair = read_keypair_file("turbin3-wallet.json").expect("Couldn't find wallet file");
        let to_pubkey = to_keypair.pubkey();

        let rpc_client = RpcClient::new(RPC_URL);
        let recent_blockhash = rpc_client.get_latest_blockhash().expect("rpc failed to return latest blockhash");

        let transaction = Transaction::new_signed_with_payer(
            &[transfer(
                &from_pubkey,
                &to_pubkey,
                100_000_000,
            )],
            Some(&from_pubkey),
            &vec![&from_keypair],
            recent_blockhash,
        );

        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");

        println!("Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet", signature);
    }

    #[test]
    fn cleanup() {

        let from_keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let from_pubkey = from_keypair.pubkey();

        let to_keypair = read_keypair_file("turbin3-wallet.json").expect("Couldn't find wallet file");
        let to_pubkey = to_keypair.pubkey();

        let rpc_client = RpcClient::new(RPC_URL);
        let recent_blockhash = rpc_client.get_latest_blockhash().expect("rpc failed to return latest blockhash");

        let balance = rpc_client.get_balance(&from_pubkey).expect("rpc failed to get balance");

        let message = Message::new_with_blockhash(
            &[transfer(
                &from_pubkey,
                &to_pubkey,
                balance,
            )],
            Some(&from_pubkey),
            &recent_blockhash,
        );

        let fee = rpc_client.get_fee_for_message(&message).expect("rpc failed to get fee");

        let transaction = Transaction::new_signed_with_payer(
            &[transfer(
                &from_pubkey,
                &to_pubkey,
                balance - fee,
            )],
            Some(&from_pubkey),
            &vec![&from_keypair],
            recent_blockhash,
        );

        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send transaction");

        println!("Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet", signature);
    }

    #[test]
    fn base58_to_wallet() {
        let stdin = stdin();
        let base58 = stdin.lock().lines().next().unwrap().unwrap();
        println!("Your wallet file is: ");
        let wallet = bs58::decode(base58).into_vec().unwrap();
        println!("{:?}", wallet);
    }

    #[test]
    fn wallet_to_base58() {
        let stdin = stdin();
        let wallet =
            stdin.lock().lines().next().unwrap().unwrap().trim_start_matches('[').trim_end_matches(']')
                .split(',')
                .map(|s| s.trim().parse::<u8>().unwrap()).collect::<Vec<u8>>();
        println!("Your private key is:");
        let base58 = bs58::encode(wallet).into_string(); println!("{:?}", base58);
    }
}
