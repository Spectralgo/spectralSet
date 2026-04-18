import { cn } from "@spectralset/ui/utils";

interface SpectralSetLogoProps {
	className?: string;
}

// TODO(ss-pul): replace placeholder with final SpectralSet wordmark art.
export function SpectralSetLogo({ className }: SpectralSetLogoProps) {
	return (
		<svg
			width="282"
			height="46"
			viewBox="0 0 282 46"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("text-foreground", className)}
			aria-label="SpectralSet"
		>
			<title>SpectralSet</title>
			<text
				x="0"
				y="36"
				fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
				fontWeight="700"
				fontSize="40"
				letterSpacing="-1"
				fill="currentColor"
			>
				SpectralSet
			</text>
		</svg>
	);
}
