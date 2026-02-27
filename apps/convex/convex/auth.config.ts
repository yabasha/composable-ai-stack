import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';

/**
 * Convex Auth configuration
 * 
 * Uses Password provider for email/password authentication.
 * GitHub OAuth can be added by configuring the ConvexCredentials provider
 * with OAuth2 flow - see docs at https://labs.convex.dev/auth
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
  ],
});
