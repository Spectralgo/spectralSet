import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@spectralset/ui/select";
import { useMemo } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";

export interface AddressPickerProps {
	value: string;
	onChange: (address: string) => void;
}

export const MAYOR_ADDRESS = "mayor/";

/**
 * Drops in the fixed mayor/ inbox plus one refinery + witness address per
 * rig detected by probe. `gt mail directory` would be richer but this
 * covers the core addresses for P5-B.
 */
export function useAddressOptions(): string[] {
	const probeQuery = electronTrpc.gastown.probe.useQuery(undefined, {
		refetchInterval: 15000,
		refetchOnWindowFocus: false,
	});
	return useMemo(() => {
		const rigs = probeQuery.data?.rigs ?? [];
		const options = [MAYOR_ADDRESS];
		for (const rig of rigs) {
			options.push(`${rig.name}/refinery`);
			options.push(`${rig.name}/witness`);
		}
		return options;
	}, [probeQuery.data]);
}

export function AddressPicker({ value, onChange }: AddressPickerProps) {
	const options = useAddressOptions();
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="h-8 w-56" aria-label="Inbox address">
				<SelectValue placeholder="mayor/" />
			</SelectTrigger>
			<SelectContent>
				{options.map((addr) => (
					<SelectItem key={addr} value={addr}>
						{addr}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
