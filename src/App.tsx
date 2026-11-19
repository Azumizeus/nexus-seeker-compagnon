import { Navigate, Route, Routes } from "react-router-dom";
import ThemeProvider from "@/providers/ThemeProvider";
import ToastProvider from "@/providers/ToastProvider";
import SolanaProvider from "@/providers/SolanaProvider";
import NexusProvider from "@/providers/NexusProvider";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import AppShell from "@/components/layout/AppShell";
import HomeScreen from "@/components/screens/HomeScreen";
import RequestActionScreen from "@/components/screens/RequestActionScreen";
import AgentsWalletsScreen from "@/components/screens/AgentsWalletsScreen";
import ChatScreen from "@/components/screens/ChatScreen";
import PerformanceScreen from "@/components/screens/PerformanceScreen";
import AdministrationScreen from "@/components/screens/AdministrationScreen";
import SettingsScreen from "@/components/screens/SettingsScreen";

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ToastProvider>
          <SolanaProvider>
            <NexusProvider>
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomeScreen />} />
                  <Route path="/demander" element={<RequestActionScreen />} />
                  <Route path="/agents" element={<AgentsWalletsScreen />} />
                  <Route path="/chat" element={<ChatScreen />} />
                  <Route path="/performance" element={<PerformanceScreen />} />
                  <Route path="/admin" element={<AdministrationScreen />} />
                  <Route path="/parametres" element={<SettingsScreen />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </NexusProvider>
          </SolanaProvider>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
