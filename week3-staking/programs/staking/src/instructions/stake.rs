use anchor_lang::{prelude::*, solana_program::example_mocks::solana_sdk::signers};
use anchor_spl::{
    metadata::{self, mpl_token_metadata::instructions::{FreezeDelegatedAccountCpi, FreezeDelegatedAccountCpiAccounts}, MasterEditionAccount, Metadata, MetadataAccount
}, 
    token::{approve, Approve, Mint, Token, TokenAccount}};

[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,


    pub mint: Account<'info, Mint>,

    pub collection_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub mint_ata: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
        ],
        seeds::program=metadata_program.key(),
        bump,
        constraint = metadata.collection.as_ref().unwrap().key.as_ref() == collection_mint.key().as_ref(),
        constraint = metadata.collection.as_ref().unwrap().verified
    )]
    pub metadata: Account<'info, MetadataAccount>,

    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
            b"edition",
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub master_edition: Account<'info, MasterEditionAccount>,
    pub metadata_program: Program<'info, Metadata>,

    #[account(
        init,
        payer = user,
        seeds = [
            b"stake",
            config.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump,
        space = 8 + StakeAccount::INIT_SPACE,        
    )]
    pub stake_account : Account<'info, StakeAccount>,

    #[account(
        seeds = [
            b"config"
        ],
        bump = config.bump,
    )]
    pub config: Account<'info, StakeConfig>,

    #[account(
        mut,
        seeds = [
            b"user",
            user.key().as_ref()
        ],
        bump = user_account.bump,
    )]

    pub user_account: Account<'info, UserAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

}

impl<'info> Stake<'info> {    
    pub fn stake(&mut self, bumps: &StakeBumps) -> Result<()> {

        assert!(self.user_account.amount_staked + 1 <= self.config.max_stake, "Max stake exceeded");
        
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = Approve {
            to: self.mint_ata.to_account_info(),
            delegate: self.stake_account.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        approve(cpi_ctx, 1)?;

        let delegate  = &self.stake_account.to_account_info();
        let token_account = &self.mint_ata.to_account_info();
        let edition = &self.master_edition.to_account_info();
        let mint = &self.mint.to_account_info();
        let token_program = &self.token_program.to_account_info();
        let metadata_program = &self.metadata_program.to_account_info();

        let seeds = &[
            b"stake",
            self.config.to_account_info(),
            self.mint.to_account_info(),
            &[bumps.stake_account.bump],
        ];

        let signers_seeds = &[&seeds[..]];

        FreezeDelegatedAccountCpi::new(
            metadata, 
            FreezeDelegatedAccountCpiAccounts {
                delegate,
                token_account,
                edition,
                mint,
                token_program
            }
        ).invoke_signed(signers_seeds);

        self.stake_account.set_inner(StakeAccount {
            owner: self.user.key(),
            mint: self.mint.key(),
            staked_at: Clock::get()?.unix_timestamp,
            bump: bumps.stake_account,
        });

        self.user_account.amount_staked += 1;

        Ok(())
    }
}