// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { AuditLogStoreProvider } from "./state/AuditLogStore";
import { BookingStoreProvider } from "./state/BookingStore";
import { AlertStoreProvider } from "./state/AlertStore";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuditLogStoreProvider>
        <BookingStoreProvider>
          <AlertStoreProvider>
            <App />
          </AlertStoreProvider>
        </BookingStoreProvider>
      </AuditLogStoreProvider>
    </BrowserRouter>
  </React.StrictMode>
);
