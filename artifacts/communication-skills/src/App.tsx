import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "@/pages/Landing";
import SignInPage from "@/pages/SignIn";
import SignUpPage from "@/pages/SignUp";
import Pricing from "@/pages/Pricing";
import Dashboard from "@/pages/Dashboard";
import AIAssistant from "@/pages/AIAssistant";
import Analyzer from "@/pages/Analyzer";
import Grammar from "@/pages/Grammar";
import SevenCs from "@/pages/SevenCs";
import Talk from "@/pages/Talk";
import Vocabulary from "@/pages/Vocabulary";
import Companion from "@/pages/Companion";
import Resources from "@/pages/Resources";
import Games from "@/pages/Games";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const basePath = import.meta.env.BASE_PATH?.replace(/\/$/, "") ?? "";

function HomeRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Redirect to="/dashboard" /> : <Landing />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect to="/" />;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/ai-coach" component={() => <ProtectedRoute component={AIAssistant} />} />
      <Route path="/analyzer" component={() => <ProtectedRoute component={Analyzer} />} />
      <Route path="/grammar" component={() => <ProtectedRoute component={Grammar} />} />
      <Route path="/sevens" component={() => <ProtectedRoute component={SevenCs} />} />
      <Route path="/talk" component={() => <ProtectedRoute component={Talk} />} />
      <Route path="/word" component={() => <ProtectedRoute component={Vocabulary} />} />
      <Route path="/companion" component={() => <ProtectedRoute component={Companion} />} />
      <Route path="/resources" component={() => <ProtectedRoute component={Resources} />} />
      <Route path="/games" component={() => <ProtectedRoute component={Games} />} />
      <Route path="/pricing" component={Pricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRoutes() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(window.location.pathname);
  }, [setLocation]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;