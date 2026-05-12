import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Convex Auth wiring. The Password provider is the only built-in for the
 * template; add GitHub/Google/etc. by following:
 *   https://labs.convex.dev/auth/config/oauth
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password]
});
