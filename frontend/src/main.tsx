import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./i18n";
import { AccessibilityProvider } from "./accessibility/AccessibilityContext";
import { applySettings, loadSettings } from "./accessibility/settings";
import "./styles/global.css";

// Before the first render, so the page never flashes in the wrong
// contrast or text size.
applySettings(loadSettings());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AccessibilityProvider>
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </AccessibilityProvider>
  </React.StrictMode>
);
