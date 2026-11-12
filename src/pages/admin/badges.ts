/** The left menu's badge counts refresh when the agent or page changes; a page can also ask for a recount. */
export const BADGES_EVENT = 'admin:refresh-badges';
/** Ask the left menu to recount its badges (after approving something, replacing a token, …). */
export const refreshBadges = () => window.dispatchEvent(new Event(BADGES_EVENT));
