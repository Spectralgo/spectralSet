import { Message, MessageContent } from "@spectralset/ui/ai-elements/message";
import { ShimmerLabel } from "@spectralset/ui/ai-elements/shimmer-label";

export function ThinkingMessage() {
	return (
		<Message from="assistant">
			<MessageContent>
				<ShimmerLabel className="text-sm text-muted-foreground">
					Thinking...
				</ShimmerLabel>
			</MessageContent>
		</Message>
	);
}
