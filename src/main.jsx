import React from "react";
import { createRoot } from "react-dom/client";
import "./dark-toggle.css";
import "./celebration-button.css";
import "./intro-book.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
