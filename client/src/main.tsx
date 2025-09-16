// client/src/index.tsx (or client/src/main.tsx – use whichever your project already has)
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error(
    "Root element #root not found. Ensure index.html contains <div id=\"root\"></div>."
  );
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
