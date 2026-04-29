import { Button } from "@spectralset/ui/button";
import { toast } from "@spectralset/ui/sonner";
import { cn } from "@spectralset/ui/utils";
import { formatDistanceToNow } from "date-fns";
import { type ComponentType, useMemo, useState } from "react";
import {
	HiOutlineClipboard,
	HiOutlineEnvelope,
	HiOutlinePencilSquare,
} from "react-icons/hi2";
import { electronTrpc } from "renderer/lib/electron-trpc";
import {
	type MailMessage,
	priorityBadgeClass,
} from "renderer/lib/gastown/mail-types";
import { AddressPicker, MAYOR_ADDRESS } from "./AddressPicker";
import {
	ComposeMailDialog,
	type ComposeMailDialogProps,
} from "./ComposeMailDialog";

export interface MailPanelProps {
	initialAddress?: string;
	ComposeDialogComponent?: ComponentType<ComposeMailDialogProps>;
}

export function MailPanel({
	initialAddress = MAYOR_ADDRESS,
	ComposeDialogComponent = ComposeMailDialog,
}: MailPanelProps) {
	const [address, setAddress] = useState(initialAddress);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [composeOpen, setComposeOpen] = useState(false);

	const inboxQuery = electronTrpc.gastown.mail.inbox.useQuery(
		{ address, unreadOnly: false },
		{ refetchInterval: 10_000, refetchOnWindowFocus: false },
	);

	const messages = inboxQuery.data ?? [];
	const selected = useMemo(
		() => messages.find((m) => m.id === selectedId) ?? messages[0] ?? null,
		[messages, selectedId],
	);

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
				<HiOutlineEnvelope className="size-5 text-muted-foreground" />
				<h1 className="text-sm font-medium">Gas Town Mail</h1>
				<div className="ml-auto flex items-center gap-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="h-8 gap-1.5 text-xs"
						onClick={() => setComposeOpen(true)}
					>
						<HiOutlinePencilSquare className="size-3.5" />
						Compose
					</Button>
					<AddressPicker
						value={address}
						onChange={(next) => {
							setAddress(next);
							setSelectedId(null);
						}}
					/>
				</div>
			</header>
			<ComposeDialogComponent
				open={composeOpen}
				onOpenChange={setComposeOpen}
				initialTo={address}
			/>
			<div className="flex min-h-0 flex-1">
				<MessageList
					messages={messages}
					isLoading={inboxQuery.isLoading}
					isError={!!inboxQuery.error}
					selectedId={selected?.id ?? null}
					onSelect={setSelectedId}
				/>
				<MessageDetail message={selected} />
			</div>
		</div>
	);
}

interface MessageListProps {
	messages: MailMessage[];
	isLoading: boolean;
	isError: boolean;
	selectedId: string | null;
	onSelect: (id: string) => void;
}

function MessageList({
	messages,
	isLoading,
	isError,
	selectedId,
	onSelect,
}: MessageListProps) {
	return (
		<div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-border/60">
			{isLoading ? (
				<div className="p-4 text-xs text-muted-foreground">Loading…</div>
			) : messages.length === 0 || isError ? (
				<div className="p-4 text-xs text-muted-foreground">Inbox is empty.</div>
			) : (
				messages.map((m) => (
					<MessageListItem
						key={m.id}
						message={m}
						selected={m.id === selectedId}
						onSelect={() => onSelect(m.id)}
					/>
				))
			)}
		</div>
	);
}

interface MessageListItemProps {
	message: MailMessage;
	selected: boolean;
	onSelect: () => void;
}

function MessageListItem({
	message,
	selected,
	onSelect,
}: MessageListItemProps) {
	const timestamp = safeRelativeTime(message.timestamp);
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-current={selected ? "true" : undefined}
			className={cn(
				"flex flex-col gap-1 border-b border-border/40 px-3 py-2 text-left text-xs transition-colors",
				"hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
				selected && "bg-accent",
			)}
		>
			<div className="flex items-center gap-2">
				<span
					role="img"
					aria-label={
						message.priority === "urgent"
							? "Urgent"
							: message.read
								? "Read"
								: "Unread"
					}
					className={cn(
						"size-2 shrink-0 rounded-full",
						message.priority === "urgent"
							? "bg-red-500"
							: message.read
								? "bg-transparent"
								: "bg-primary",
					)}
				/>
				<span className="truncate font-medium">{message.from}</span>
				<span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
					{timestamp}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<span
					className={cn(
						"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
						priorityBadgeClass(message.priority),
					)}
				>
					{message.priority}
				</span>
				<span className="truncate text-muted-foreground">
					{message.subject || "(no subject)"}
				</span>
			</div>
		</button>
	);
}

interface MessageDetailProps {
	message: MailMessage | null;
}

function MessageDetail({ message }: MessageDetailProps) {
	if (!message) {
		return (
			<div className="flex flex-1 items-center justify-center p-8 text-xs text-muted-foreground">
				Select a message to read.
			</div>
		);
	}
	const timestamp = safeRelativeTime(message.timestamp);
	const onCopy = async () => {
		try {
			await navigator.clipboard.writeText(message.body);
			toast.success("Body copied to clipboard");
		} catch {
			toast.error("Copy failed");
		}
	};
	return (
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<div className="border-b border-border/60 px-4 py-3">
				<h2 className="text-sm font-semibold">
					{message.subject || "(no subject)"}
				</h2>
				<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
					<span>
						<span className="text-muted-foreground/70">from</span>{" "}
						<span className="font-medium text-foreground">{message.from}</span>
					</span>
					<span>
						<span className="text-muted-foreground/70">to</span>{" "}
						<span className="font-medium text-foreground">{message.to}</span>
					</span>
					<span>{timestamp}</span>
				</div>
				<div className="mt-2 flex items-center gap-2">
					<span
						className={cn(
							"rounded px-1.5 py-0.5 text-[10px] font-medium",
							priorityBadgeClass(message.priority),
						)}
					>
						{message.priority}
					</span>
					<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
						{message.type}
					</span>
					<div className="ml-auto flex items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 text-xs"
							onClick={onCopy}
						>
							<HiOutlineClipboard className="size-3.5" />
							Copy
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							disabled
							title="Mark-as-read ships in P5-C"
						>
							Mark read
						</Button>
					</div>
				</div>
			</div>
			<pre className="flex-1 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs text-foreground">
				{message.body}
			</pre>
		</div>
	);
}

function safeRelativeTime(value: string): string {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return formatDistanceToNow(d, { addSuffix: true });
}
