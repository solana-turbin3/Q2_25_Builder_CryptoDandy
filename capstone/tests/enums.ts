// Enums in Rust is serialize in Typescript

const BUYING_INTENT_STATES = {
    PUBLISHED: {published: {}},
    CANCELLED: {cancelled: {}},
    CONFIRMED: {confirmed: {}},
    SHIPPED: {shipped: {}},
    FULFILLED: {fulfilled: {}},
    DISPUTED: {disputed: {}},
};

const OFFER_STATES = {
    PUBLISHED: {published: {}},
    CANCELLED: {cancelled: {}},
};

export {BUYING_INTENT_STATES, OFFER_STATES};
