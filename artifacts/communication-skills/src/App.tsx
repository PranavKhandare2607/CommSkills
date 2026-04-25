import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import AIAssistant from "@/pages/AIAssistant";
import Analyzer from "@/pages/Analyzer";
import Grammar from "@/pages/Grammar";
import SevenCs from "@/pages/SevenCs";
import Talk from "@/pages/Talk";
import Vocabulary from "@/pages/Vocabulary";
import Companion from "@/pages/Companion";
import Resources from "@/pages/Resources";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/ai-coach" component={AIAssistant} />
        <Route path="/analyzer" component={Analyzer} />
        <Route path="/grammar" component={Grammar} />
        <Route path="/sevens" component={SevenCs} />
        <Route path="/talk" component={Talk} />
        <Route path="/word" component={Vocabulary} />
        <Route path="/companion" component={Companion} />
        <Route path="/resources" component={Resources} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
