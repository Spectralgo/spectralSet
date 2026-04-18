import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "@spectralset/auth/server";

export const GET = oauthProviderOpenIdConfigMetadata(auth);
