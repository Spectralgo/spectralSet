import { Img } from "@react-email/components";
import { env } from "../../../lib/env";

// TODO(ss-pul): the underlying logo.png at /assets/emails/logo.png still needs
// designer replacement with final SpectralSet art; alt text updated here.
export function Logo() {
	return (
		<Img
			src={`${env.NEXT_PUBLIC_MARKETING_URL}/assets/emails/logo.png`}
			alt="SpectralSet"
			width="120"
		/>
	);
}
