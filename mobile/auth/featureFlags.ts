export const AUTH0_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_AUTH0 === 'true';

/** Owner user ID - only this user can add items. Defaults to dev-user when auth is disabled. */
export const OWNER_USER_ID =
  process.env.EXPO_PUBLIC_OWNER_USER_ID ?? 'dev-user';

