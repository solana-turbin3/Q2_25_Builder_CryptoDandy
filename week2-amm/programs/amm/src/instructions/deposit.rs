use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{ Mint, Token, TokenAccount},
};
use anchor_spl::token::{transfer, mint_to, MintTo, Transfer};
use constant_product_curve::ConstantProduct;
use crate::state::Config;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint_x:Account<'info, Mint>,
    pub mint_y:Account<'info, Mint>,

    #[account(
        seeds = [b"lp", config.key().as_ref()],
        bump = config.lp_bump,
    )]
    pub mint_lp:Account<'info, Mint>,

    #[account(
        associated_token::mint = mint_x,
        associated_token::authority = config,
    )]
    vault_x:Account<'info, TokenAccount>,

    #[account(
        associated_token::mint = mint_y,
        associated_token::authority = config,
    )]
    vault_y:Account<'info, TokenAccount>,

    #[account(
        associated_token::mint = mint_x,
        associated_token::authority = user,
    )]
    user_x:Account<'info, TokenAccount>,

    #[account(
        associated_token::mint = mint_y,
        associated_token::authority = user,
    )]
    user_y:Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint_lp,
        associated_token::authority = user,
    )]
    user_lp: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"config", config.seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub config: Account<'info, Config>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Deposit<'info> {
    pub fn deposit(
        &mut self,
        amount: u64,
        max_x:u64,
        max_y: u64
    ) -> Result<()> {

        assert!(amount != 0);

        let (x, y) = match self.mint_lp.supply == 0 && self.vault_x.amount == 0 {
            true => (max_x, max_y),
            false => {
                let amounts = ConstantProduct::xy_deposit_amounts_from_l(
                    self.vault_x.amount,
                    self.vault_y.amount,
                    self.mint_lp.supply,
                    amount,
                    6
                ).unwrap();
                (amounts.x, amounts.y)
            }
        };

        assert!(x <= max_x && y <= max_y);

        self.deposit_token(true, x)?;
        self.deposit_token(false, y)?;

        self.mint_lp_token(amount)?;

        Ok(())
    }

    pub fn deposit_token(&mut self, is_x: bool, amount: u64) -> Result<()> {
        let (from, to) = match is_x {
            true => (self.user_x.to_account_info(), self.vault_x.to_account_info()),
            false => (self.user_y.to_account_info(), self.vault_y.to_account_info()),
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Transfer{
            from,
            to,
            authority: self.user.to_account_info(),
        };

        let ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(ctx, amount)?;

        Ok(())
    }

    pub fn mint_lp_token(&mut self, amount: u64) -> Result<()> {

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo{
            mint: self.mint_lp.to_account_info(),
            authority: self.config.to_account_info(),
            to: self.user_lp.to_account_info(),
        };

        let seeds = &[&b"config"[..], &self.config.seed.to_le_bytes(), &[self.config.config_bump]];

        let signer_seeds = &[&seeds[..]];

        let ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        mint_to(ctx, amount)?;
        Ok(())
    }
}