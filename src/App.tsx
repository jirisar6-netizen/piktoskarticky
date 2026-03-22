import { BrowserRouter, Routes, Route } from "react-router-dom";
import OnboardingWizard, { useOnboarding } from "./components/OnboardingWizard";
import Layout   from "./components/Layout";
import Settings from "./pages/Settings";

// ── Lazy page placeholders (nahraď reálnými stránkami v dalších krocích) ───
const Dashboard = () => (
  <div className="flex h-full items-center justify-center">
    <p className="text-white/40 text-lg tracking-widest uppercase">Dashboard</p>
  </div>
);
const Communicator = () => (
  <div className="flex h-full items-center justify-center">
    <p className="text-white/40 text-lg tracking-widest uppercase">Komunikátor</p>
  </div>
);
const GuardianSOS = () => (
  <div className="flex h-full items-center justify-center">
    <p className="text-white/40 text-lg tracking-widest uppercase">Guardian SOS</p>
  </div>
);
const About = () => (
  <div className="flex h-full items-center justify-center">
    <p className="text-white/40 text-lg tracking-widest uppercase">O projektu</p>
  </div>
);

export default function App() {
  const { show: showOnboarding, complete: completeOnboarding } = useOnboarding();

  if (showOnboarding) {
    return <OnboardingWizard onComplete={completeOnboarding} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"       element={<Dashboard />} />
          <Route path="/app"    element={<Communicator />} />
          <Route path="/sos"    element={<GuardianSOS />} />
          <Route path="/about"    element={<About />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
