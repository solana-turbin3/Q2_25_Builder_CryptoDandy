use anchor_lang::prelude::*;

#[error_code]
pub enum BestOfferErrorCode {
    #[msg("Numerical overflow occurred during calculation")]
    NumericalOverflow,
}
