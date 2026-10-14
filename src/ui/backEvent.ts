/**
 * Dispatched on window when the Android back button is pressed.
 * A page that closes something (a sheet, a dialog) calls preventDefault()
 * so the shell knows the press was handled.
 */
export const BACK_EVENT = 'day-ledger:back';
