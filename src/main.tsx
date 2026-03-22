// ─── src/main.tsx ─────────────────────────────────────────────────────────
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider }  from "./context/LanguageContext";
import { SettingsProvider }  from "./context/SettingsContext";
import { ThemeProvider }     from "./context/ThemeContext";
import { ProfileProvider }     from "./context/ProfileContext";
import { PrintQueueProvider }  from "./context/PrintQueueContext";
import { VoiceProvider }    from "./context/VoiceProvider";
import { SyncProvider }     from "./context/SyncProvider";
import { ErrorBoundary }    from "./components/ErrorBoundary";
import { registerGlobalErrorHandlers } from "./services/errorLogger";
import "./index.css";

registerGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary name="Root">
      <LanguageProvider>
        <ThemeProvider>
          <PrintQueueProvider>
          <ProfileProvider>
            <SettingsProvider>
              <SyncProvider>
                <VoiceProvider>
                  <App />
                </VoiceProvider>
              </SyncProvider>
            </SettingsProvider>
          </ProfileProvider>
          </PrintQueueProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
