export interface BeadDep {
	from: string;
	to: string;
	type: string;
}

interface DAGOverlayProps {
	dependencies: BeadDep[];
}

export function DAGOverlay(_props: DAGOverlayProps) {
	return (
		<svg
			className="pointer-events-none absolute inset-0 h-full w-full"
			data-dag-overlay
			aria-hidden="true"
		/>
	);
}
