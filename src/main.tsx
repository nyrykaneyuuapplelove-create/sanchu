import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { useStore } from "./lib/store";

// 開発中だけ、ブラウザのコンソールからストアを触れるようにする
if (import.meta.env.DEV) (window as unknown as { __santyu: typeof useStore }).__santyu = useStore;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
