import { Hr, Img, Link, Section, Text } from "@react-email/components";
import { env } from "../../../../../lib/env";

interface FooterProps {
	showSocial?: boolean;
}

export function Footer({ showSocial = true }: FooterProps) {
	const socialIcons = {
		x: `${env.NEXT_PUBLIC_MARKETING_URL}/assets/emails/x.png`,
		instagram: `${env.NEXT_PUBLIC_MARKETING_URL}/assets/emails/instagram.png`,
		linkedin: `${env.NEXT_PUBLIC_MARKETING_URL}/assets/emails/linkedin.png`,
	};

	return (
		<Section className="bg-background px-9 pb-7">
			{/* Divider */}
			<Hr className="border-none border-t border-border my-7" />

			{/* Logo */}
			<Section className="pb-4">
				<Img
					src={`${env.NEXT_PUBLIC_MARKETING_URL}/assets/emails/logo-full.png`}
					alt="SpectralSet"
					width="160"
				/>
			</Section>

			{/* Social Icons */}
			{showSocial && (
				<Section className="mb-6">
					<Link href="https://x.com/spectralset" className="inline-block mr-4">
						<Img
							src={socialIcons.x}
							alt="X (Twitter)"
							width="24"
							height="24"
							className="block"
						/>
					</Link>
					<Link
						href="https://instagram.com/spectralset"
						className="inline-block mr-4"
					>
						<Img
							src={socialIcons.instagram}
							alt="Instagram"
							width="24"
							height="24"
							className="block"
						/>
					</Link>
					<Link
						href="https://www.linkedin.com/company/spectralset"
						className="inline-block"
					>
						<Img
							src={socialIcons.linkedin}
							alt="LinkedIn"
							width="24"
							height="24"
							className="block"
						/>
					</Link>
				</Section>
			)}

			{/* Tagline */}
			<Text className="text-muted text-sm leading-snug m-0 mb-6">
				Run dozens of Claude Code, Codex, or any other in parallel.
			</Text>

			{/* Legal Links */}
			<Text className="text-muted text-xs leading-none m-0 mb-4">
				<Link
					href="https://spectralset.dev/privacy"
					className="text-muted no-underline"
				>
					Privacy
				</Link>
				{" • "}
				<Link
					href="https://spectralset.dev/terms"
					className="text-muted no-underline"
				>
					Terms
				</Link>
				{" • "}
				<Link
					href="https://spectralset.dev/contact"
					className="text-muted no-underline"
				>
					Contact
				</Link>
			</Text>

			{/* Company Info */}
			<Text className="text-muted text-xs leading-none m-0">
				© 2026 SpectralSet. All rights reserved.
			</Text>
		</Section>
	);
}
