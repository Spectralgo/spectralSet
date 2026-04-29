import { Component, Fragment, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	onReset?: () => void;
}

interface State {
	hasError: boolean;
	resetKey: number;
}

export class PaneErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, resetKey: 0 };

	static getDerivedStateFromError(): Partial<State> {
		return { hasError: true };
	}

	componentDidCatch(error: Error): void {
		console.error("[PaneErrorBoundary]", error);
	}

	handleRetry = (): void => {
		this.setState((s) => ({ hasError: false, resetKey: s.resetKey + 1 }));
		this.props.onReset?.();
	};

	render() {
		if (this.state.hasError) {
			return (
				<div
					data-pane-error-fallback
					className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-6 text-center"
				>
					<div
						aria-hidden
						className="h-2 w-32 animate-pulse rounded bg-muted"
					/>
					<p className="text-sm text-muted-foreground">Something went wrong</p>
					<button
						type="button"
						onClick={this.handleRetry}
						className="rounded-md border border-border bg-secondary px-3 py-1 text-sm hover:bg-secondary/80"
					>
						Retry
					</button>
				</div>
			);
		}
		return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
	}
}
