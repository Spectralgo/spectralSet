import { auth } from "@spectralset/auth/server";
import { createTRPCContext } from "@spectralset/trpc";

export const createContext = async ({
	req,
}: {
	req: Request;
	resHeaders: Headers;
}) => {
	const session = await auth.api.getSession({
		headers: req.headers,
	});
	return createTRPCContext({
		session,
		auth,
		headers: req.headers,
	});
};
