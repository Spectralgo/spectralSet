import { useEffect, useState } from "react";

export function useWindowVisibility(): boolean {
	const [visible, setVisible] = useState(() =>
		typeof document === "undefined" ? true : !document.hidden,
	);

	useEffect(() => {
		if (typeof document === "undefined") return;
		const handler = () => setVisible(!document.hidden);
		document.addEventListener("visibilitychange", handler);
		return () => document.removeEventListener("visibilitychange", handler);
	}, []);

	return visible;
}
