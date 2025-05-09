use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        transfer_checked,
        Mint,
        TokenAccount,
        TokenInterface,
        TransferChecked
    }
};

use crate::{Offer, BuyingIntent, BuyingIntentState, OfferState, EncryptedDeliveryInformation};

#[derive(Accounts)]
pub struct AcceptOffer<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"buy_intent", buying_intent.buyer.key().as_ref()],
        bump = buying_intent.bump,
    )]
    pub buying_intent: Account<'info, BuyingIntent>,

    #[account(
        seeds = [b"offer", buying_intent.key().as_ref(), offer.seller.key().as_ref()],
        bump = offer.bump,
    )]
    pub offer: Account<'info, Offer>,

    #[account(
        init,
        payer = buyer,
        space = 8 + EncryptedDeliveryInformation::INIT_SPACE,
        seeds = [b"encrypted_delivery_information", buying_intent.key().as_ref()],
        bump,
    )]
    pub encrypted_delivery_information: Account<'info, EncryptedDeliveryInformation>,


    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_associated_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buying_intent,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,


    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> AcceptOffer<'info> {
    pub fn accept_offer(&mut self, offer: Pubkey, bumps: AcceptOfferBumps) -> Result<()>
    {
        // Change the state of the buying intent to confirm
        self.buying_intent.state = BuyingIntentState::CONFIRMED;
        self.buying_intent.accepted_offer = Some(offer);

        // Update the offer state to reflect the accepted offer
        self.offer.state = OfferState::ACCEPTED;

        Ok(())
    }
    
    // Set the encrypted delivery address on the buying intent
    pub fn set_encrypted_delivery_address(
        &mut self,
        nonce: [u8; 24],
        buyer_ephemeral_pubkey: [u8; 32],
        encrypted_delivery_lastname: Vec<u8>,
        encrypted_delivery_firstname: Vec<u8>,
        encrypted_delivery_address_line_1: Vec<u8>,
        encrypted_delivery_address_line_2: Option<Vec<u8>>,
        encrypted_delivery_city: Vec<u8>,
        encrypted_delivery_postal_code: Vec<u8>,
        encrypted_delivery_country_code: Vec<u8>,
        encrypted_delivery_state_code: Option<Vec<u8>>,
    )
        -> Result<()> {
       
        self.encrypted_delivery_information.set_inner(EncryptedDeliveryInformation {
            nonce,
            buyer_ephemeral_pubkey,
            encrypted_delivery_firstname,
            encrypted_delivery_lastname,
            encrypted_delivery_address_line_1,
            encrypted_delivery_address_line_2,
            encrypted_delivery_city,
            encrypted_delivery_postal_code,
            encrypted_delivery_country_code,
            encrypted_delivery_state_code
        });

        Ok(())
    }

    // Move funds from buyer to vault
    pub fn transfer_funds(&mut self) -> Result<()>
    {
        let transfer_accounts = TransferChecked {
            from: self.buyer_associated_token_account.to_account_info(),
            mint: self.mint.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.buyer.to_account_info(),
        };

        let cpi_context = CpiContext::new(
            self.token_program.to_account_info(),
            transfer_accounts
        );

        transfer_checked(cpi_context, self.offer.offer_price, self.mint.decimals)?;

        Ok(())
    }
}