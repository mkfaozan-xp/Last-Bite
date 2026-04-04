import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/index.css";

const root = document.getElementById("root");

if (!root) throw new Error("Root not found");

createRoot(root).render(<App />);