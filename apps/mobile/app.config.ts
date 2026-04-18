import path from "node:path";
import { config } from "dotenv";
import type { ConfigContext, ExpoConfig } from "expo/config";

// Load .env file
config({
	path: path.resolve(__dirname, "../../.env"),
	override: true,
	quiet: true,
});

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: "SpectralSet",
	slug: "spectralset",
	version: "1.0.0",
	orientation: "portrait",
	icon: "./assets/icon.png",
	userInterfaceStyle: "dark",
	scheme: "spectralset",
	splash: {
		image: "./assets/splash-icon.png",
		resizeMode: "contain",
		backgroundColor: "#09090b",
	},
	ios: {
		supportsTablet: true,
		bundleIdentifier: "sh.spectralset.mobile",
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
		},
	},
	android: {
		adaptiveIcon: {
			foregroundImage: "./assets/adaptive-icon.png",
			backgroundColor: "#ffffff",
		},
		package: "sh.spectralset.mobile",
		predictiveBackGestureEnabled: false,
	},
	web: {
		favicon: "./assets/favicon.png",
		bundler: "metro",
	},
	plugins: ["expo-router", "expo-localization"],
	extra: {
		router: {},
		eas: {
			projectId: "fa9332a8-896a-4d2a-be5b-d82469b46e5d",
		},
	},
	owner: "supserset-sh",
});
