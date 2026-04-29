import type {
	MailPriority,
	MailSendType,
} from "@spectralset/gastown-cli-client";
import { Button } from "@spectralset/ui/button";
import { Checkbox } from "@spectralset/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@spectralset/ui/dialog";
import { Input } from "@spectralset/ui/input";
import { Label } from "@spectralset/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@spectralset/ui/select";
import { toast } from "@spectralset/ui/sonner";
import { Textarea } from "@spectralset/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { MAYOR_ADDRESS, useAddressOptions } from "./AddressPicker";

const ADDRESS_PATTERN = /^[^/]+\/[^/]*$/;
const PRIORITIES: MailPriority[] = [
	"urgent",
	"high",
	"normal",
	"low",
	"backlog",
];
const TYPES: MailSendType[] = ["task", "scavenge", "notification", "reply"];

export interface SendMailVariables {
	to: string;
	subject: string;
	body: string;
	priority: MailPriority;
	type: MailSendType;
	pinned: boolean;
	townPath?: string;
}

export const MAIL_INBOX_QUERY_KEY = ["gastown", "mail", "inbox"] as const;

export interface ComposeMailDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialTo?: string;
}

interface FormState {
	to: string;
	subject: string;
	body: string;
	priority: MailPriority;
	type: MailSendType;
	pinned: boolean;
}

export function emptyForm(initialTo: string): FormState {
	const isMayor = initialTo === MAYOR_ADDRESS;
	return {
		to: initialTo,
		subject: "",
		body: "",
		priority: "normal",
		type: isMayor ? "task" : "notification",
		pinned: isMayor,
	};
}

export function buildSendVariables(
	form: FormState,
	townPath: string,
): { ok: true; value: SendMailVariables } | { ok: false; error: string } {
	const to = form.to.trim();
	const subject = form.subject.trim();
	const body = form.body.trim();
	if (!ADDRESS_PATTERN.test(to)) {
		return {
			ok: false,
			error:
				"Recipient must look like rig/name (e.g. mayor/ or spectralSet/witness).",
		};
	}
	if (!subject) {
		return { ok: false, error: "Subject is required." };
	}
	if (!body) {
		return { ok: false, error: "Body is required." };
	}
	return {
		ok: true,
		value: {
			to,
			subject,
			body,
			priority: form.priority,
			type: form.type,
			pinned: form.pinned,
			...(townPath ? { townPath } : {}),
		},
	};
}

export function ComposeMailDialog({
	open,
	onOpenChange,
	initialTo = MAYOR_ADDRESS,
}: ComposeMailDialogProps) {
	const queryClient = useQueryClient();
	const townPath = useGastownTownPath();
	const addressOptions = useAddressOptions();
	const [form, setForm] = useState<FormState>(() => emptyForm(initialTo));
	const [pinnedTouched, setPinnedTouched] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const addressListId = useId();

	useEffect(() => {
		if (!open) {
			setForm(emptyForm(initialTo));
			setPinnedTouched(false);
			setError(null);
		}
	}, [open, initialTo]);

	useEffect(() => {
		if (pinnedTouched) return;
		const shouldPin = form.to === MAYOR_ADDRESS;
		setForm((prev) =>
			prev.pinned === shouldPin ? prev : { ...prev, pinned: shouldPin },
		);
	}, [form.to, pinnedTouched]);

	const sendMutation = useMutation({
		mutationFn: (input: SendMailVariables) =>
			electronTrpcClient.gastown.mail.send.mutate(input),
		onSuccess: (_result, variables) => {
			toast.success(`Sent to ${variables.to}`);
			queryClient.invalidateQueries({ queryKey: MAIL_INBOX_QUERY_KEY });
			onOpenChange(false);
		},
		onError: (err: unknown) => {
			const msg = err instanceof Error ? err.message : "Failed to send mail";
			setError(msg);
		},
	});

	const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm((prev) => ({ ...prev, [key]: value }));

	const handleSubmit = () => {
		setError(null);
		const built = buildSendVariables(form, townPath);
		if (!built.ok) {
			setError(built.error);
			return;
		}
		sendMutation.mutate(built.value);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[520px]">
				<DialogHeader>
					<DialogTitle>Compose mail</DialogTitle>
					<DialogDescription>
						Send a message via <span className="font-mono">gt mail send</span>.
						Drafts are not persisted — closing discards the form.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-3 text-xs">
					<div className="grid gap-1.5">
						<Label htmlFor="compose-to">To</Label>
						<Input
							id="compose-to"
							list={addressListId}
							value={form.to}
							onChange={(e) => update("to", e.target.value)}
							placeholder="mayor/ or spectralSet/witness"
							autoComplete="off"
						/>
						<datalist id={addressListId}>
							{addressOptions.map((addr) => (
								<option key={addr} value={addr} />
							))}
						</datalist>
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="compose-subject">Subject</Label>
						<Input
							id="compose-subject"
							value={form.subject}
							onChange={(e) => update("subject", e.target.value)}
							placeholder="Short summary"
						/>
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="compose-body">Body</Label>
						<Textarea
							id="compose-body"
							value={form.body}
							onChange={(e) => update("body", e.target.value)}
							placeholder="Write your message…"
							rows={8}
							className="font-mono text-xs"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="grid gap-1.5">
							<Label htmlFor="compose-priority">Priority</Label>
							<Select
								value={form.priority}
								onValueChange={(v) => update("priority", v as MailPriority)}
							>
								<SelectTrigger id="compose-priority" className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PRIORITIES.map((p) => (
										<SelectItem key={p} value={p}>
											{p}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="compose-type">Type</Label>
							<Select
								value={form.type}
								onValueChange={(v) => update("type", v as MailSendType)}
							>
								<SelectTrigger id="compose-type" className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<Label className="flex-row gap-2 text-xs font-normal">
						<Checkbox
							checked={form.pinned}
							onCheckedChange={(c) => {
								setPinnedTouched(true);
								update("pinned", c === true);
							}}
						/>
						Pinned (survives recipient session resets)
					</Label>
					{error && (
						<p role="alert" className="text-xs text-destructive">
							{error}
						</p>
					)}
				</div>
				<DialogFooter className="flex-row justify-end gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={sendMutation.isPending}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleSubmit}
						disabled={sendMutation.isPending}
					>
						{sendMutation.isPending ? "Sending…" : "Send"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
