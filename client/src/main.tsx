// client/src/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error(
    'Root element #root not found. Make sure index.html has <div id="root"></div>.'
  );
}

const root = createRoot(container);

// Use StrictMode in production only to avoid double effects in dev.
const withMode =
  import.meta.env.PROD ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  );

root.render(withMode);
