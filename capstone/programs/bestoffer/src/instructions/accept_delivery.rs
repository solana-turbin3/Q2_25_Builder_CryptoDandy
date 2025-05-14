use crate::error::*;
use crate::{BuyingIntent, BuyingIntentState, Config, Offer, OfferState, Treasury};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};
use anchor_spl::{associated_token::AssociatedToken, token_interface::TokenInterface};

#[derive(Accounts)]
pub struct AcceptDelivery<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub seller: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"buy_intent", buying_intent.buyer.key().as_ref(), buying_intent.id.to_le_bytes().as_ref()],
        bump = buying_intent.bump,
    )]
    pub buying_intent: Account<'info, BuyingIntent>,

    #[account(
        mut,
        seeds = [b"offer", buying_intent.key().as_ref(), seller.key().as_ref(), offer.id.to_le_bytes().as_ref()],
        bump = offer.bump,
    )]
    pub offer: Account<'info, Offer>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = buying_intent,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = treasury,
    )]
    pub treasury_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_ata: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> AcceptDelivery<'info> {
    pub fn accept_delivery(&mut self) -> Result<()> {
        // Change status
        self.buying_intent.state = BuyingIntentState::FULFILLED;
        self.offer.state = OfferState::DELIVERED;

        Ok(())
    }

    pub fn transfer_funds(&mut self) -> Result<()> {
        // Get vault amount
        let vault_amount = self.vault.amount;

        // Calculate fees
        let fee_amount = vault_amount
            .checked_mul(self.config.fee as u64)
            .ok_or(BestOfferErrorCode::NumericalOverflow)?
            .checked_div(10_000_u64)
            .ok_or(BestOfferErrorCode::NumericalOverflow)?;

        // Seller funds
        let seller_amount = vault_amount
            .checked_sub(fee_amount)
            .ok_or(BestOfferErrorCode::NumericalOverflow)?;

        // Move fees to treasury
        let treasury_transfer = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.mint.to_account_info(),
            to: self.treasury_ata.to_account_info(),
            authority: self.buying_intent.to_account_info(),
        };

        let bytes = self.buying_intent.id.to_le_bytes();

        let seeds = &[
            b"buy_intent",
            self.buyer.key.as_ref(),
            bytes.as_ref(),
            &[self.buying_intent.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx_treasury = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            treasury_transfer,
            signer_seeds,
        );

        transfer_checked(cpi_ctx_treasury, fee_amount, self.mint.decimals)?;

        // Move funds to a seller
        let seller_transfer = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.mint.to_account_info(),
            to: self.seller_ata.to_account_info(),
            authority: self.buying_intent.to_account_info(),
        };

        let cpi_ctx_seller = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            seller_transfer,
            signer_seeds,
        );

        transfer_checked(cpi_ctx_seller, seller_amount, self.mint.decimals)?;

        Ok(())
    }
}
