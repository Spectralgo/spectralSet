import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth } from "@spectralset/auth/server";

export const GET = oauthProviderAuthServerMetadata(auth);
