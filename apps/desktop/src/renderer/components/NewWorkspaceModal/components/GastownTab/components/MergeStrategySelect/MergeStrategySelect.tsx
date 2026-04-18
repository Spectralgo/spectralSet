import type { MergeStrategy } from "@spectralset/gastown-cli-client";
import { Label } from "@spectralset/ui/label";
import { RadioGroup, RadioGroupItem } from "@spectralset/ui/radio-group";

interface MergeStrategyOption {
	value: MergeStrategy;
	label: string;
	description: string;
}

const OPTIONS: readonly MergeStrategyOption[] = [
	{
		value: "direct",
		label: "Direct",
		description: "Push completed work straight to main.",
	},
	{
		value: "mr",
		label: "Merge queue",
		description: "Submit to the refinery merge queue.",
	},
	{
		value: "local",
		label: "Local branch",
		description: "Keep work on a feature branch only.",
	},
] as const;

interface MergeStrategySelectProps {
	value: MergeStrategy;
	onChange: (value: MergeStrategy) => void;
	disabled?: boolean;
}

export function MergeStrategySelect({
	value,
	onChange,
	disabled,
}: MergeStrategySelectProps) {
	return (
		<RadioGroup
			value={value}
			onValueChange={(next) => onChange(next as MergeStrategy)}
			disabled={disabled}
			className="gap-1.5"
		>
			{OPTIONS.map((option) => (
				<Label
					key={option.value}
					htmlFor={`merge-strategy-${option.value}`}
					className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background/40 p-2 text-left has-[[data-state=checked]]:border-primary/60 has-[[data-state=checked]]:bg-primary/5"
				>
					<RadioGroupItem
						id={`merge-strategy-${option.value}`}
						value={option.value}
						className="mt-0.5"
					/>
					<div className="flex-1">
						<div className="text-sm font-medium">{option.label}</div>
						<div className="text-xs text-muted-foreground">
							{option.description}
						</div>
					</div>
				</Label>
			))}
		</RadioGroup>
	);
}
