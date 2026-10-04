import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Session from "./pages/session/SessionPage";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Session>
      <App />
    </Session>
  </React.StrictMode>,
);
