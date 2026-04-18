import { COMPANY } from "@spectralset/shared/constants";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: (
				<div className="flex items-center gap-2">
					<Image src="/logo.png" alt="SpectralSet" width={24} height={24} />
					<span className="font-semibold">SpectralSet</span>
				</div>
			),
			url: COMPANY.MARKETING_URL,
		},
	};
}
