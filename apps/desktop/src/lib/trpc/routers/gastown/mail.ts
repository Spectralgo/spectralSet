import {
	archiveMessage,
	listInbox,
	type MailMessage,
	mailPrioritySchema,
	mailSendTypeSchema,
	markMessageRead,
	readMessage,
	sendMail,
} from "@spectralset/gastown-cli-client";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { getProcessEnvWithShellPath } from "../workspaces/utils/shell-env";
import { resolveTownPath } from "./resolve-town-path";

const townPathSchema = z.string().min(1).optional();

const listInboxInputSchema = z
	.object({
		address: z.string().min(1).optional(),
		unreadOnly: z.boolean().optional(),
		townPath: townPathSchema,
	})
	.optional();

const readMailInputSchema = z.object({
	id: z.string().min(1),
	address: z.string().min(1).optional(),
	townPath: townPathSchema,
});

const sendMailInputSchema = z.object({
	to: z.string().min(1),
	subject: z.string().min(1).max(500),
	body: z.string().max(100_000),
	priority: mailPrioritySchema.optional(),
	type: mailSendTypeSchema.optional(),
	pinned: z.boolean().optional(),
	townPath: townPathSchema,
});

const mailIdsInputSchema = z.object({
	ids: z.array(z.string().min(1)).min(1).max(500),
	townPath: townPathSchema,
});

interface GastownMailRouterDeps {
	listInboxFn?: typeof listInbox;
	readMessageFn?: typeof readMessage;
	sendMailFn?: typeof sendMail;
	archiveMessageFn?: typeof archiveMessage;
	markMessageReadFn?: typeof markMessageRead;
	resolveTownPathFn?: (townPath: string | undefined) => string | undefined;
}

async function shellOptions() {
	return { env: await getProcessEnvWithShellPath() };
}

export const createGastownMailRouter = (deps: GastownMailRouterDeps = {}) => {
	const listInboxImpl = deps.listInboxFn ?? listInbox;
	const readMessageImpl = deps.readMessageFn ?? readMessage;
	const sendMailImpl = deps.sendMailFn ?? sendMail;
	const archiveMessageImpl = deps.archiveMessageFn ?? archiveMessage;
	const markMessageReadImpl = deps.markMessageReadFn ?? markMessageRead;
	const resolveTownPathImpl = deps.resolveTownPathFn ?? resolveTownPath;

	return router({
		inbox: publicProcedure.input(listInboxInputSchema).query(
			async ({ input }): Promise<MailMessage[]> =>
				listInboxImpl(
					{
						address: input?.address,
						unreadOnly: input?.unreadOnly,
						townRoot: resolveTownPathImpl(input?.townPath),
					},
					await shellOptions(),
				),
		),
		read: publicProcedure.input(readMailInputSchema).query(
			async ({ input }): Promise<MailMessage | null> =>
				readMessageImpl(
					{
						id: input.id,
						address: input.address,
						townRoot: resolveTownPathImpl(input.townPath),
					},
					await shellOptions(),
				),
		),
		send: publicProcedure
			.input(sendMailInputSchema)
			.mutation(async ({ input }) => {
				await sendMailImpl(
					{
						to: input.to,
						subject: input.subject,
						body: input.body,
						priority: input.priority,
						type: input.type,
						pinned: input.pinned,
						townRoot: resolveTownPathImpl(input.townPath),
					},
					await shellOptions(),
				);
				return { ok: true as const };
			}),
		archive: publicProcedure
			.input(mailIdsInputSchema)
			.mutation(async ({ input }) => {
				await archiveMessageImpl(
					{
						ids: input.ids,
						townRoot: resolveTownPathImpl(input.townPath),
					},
					await shellOptions(),
				);
				return { ok: true as const };
			}),
		markRead: publicProcedure
			.input(mailIdsInputSchema)
			.mutation(async ({ input }) => {
				await markMessageReadImpl(
					{
						ids: input.ids,
						townRoot: resolveTownPathImpl(input.townPath),
					},
					await shellOptions(),
				);
				return { ok: true as const };
			}),
	});
};
