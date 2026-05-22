import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const host = window.location.hostname.toLowerCase();
if (host === "tikinapp.com.br") {
	const target = `https://www.tikinapp.com.br${window.location.pathname}${window.location.search}${window.location.hash}`;
	window.location.replace(target);
} else {
	createRoot(document.getElementById("root")!).render(<App />);
}
