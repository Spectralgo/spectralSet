import { Button } from "@spectralset/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@spectralset/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";
import { CiSettings } from "react-icons/ci";
import { HotkeyLabel } from "renderer/hotkeys";

export function SettingsButton() {
	const navigate = useNavigate();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => navigate({ to: "/settings/account" })}
					aria-label="Open settings"
					className="no-drag"
				>
					<CiSettings className="size-5" />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom" sideOffset={8}>
				<HotkeyLabel label="Open settings" id="OPEN_SETTINGS" />
			</TooltipContent>
		</Tooltip>
	);
}
