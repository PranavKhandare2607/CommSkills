import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppLayout } from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import AIAssistant from "@/pages/AIAssistant";
import SevenCs from "@/pages/SevenCs";
import GrammarTips from "@/pages/GrammarTips";
import Vocabulary from "@/pages/Vocabulary";
import InterviewTips from "@/pages/InterviewTips";
import EmailWriting from "@/pages/EmailWriting";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/ai-assistant" component={AIAssistant} />
        <Route path="/seven-cs" component={SevenCs} />
        <Route path="/grammar" component={GrammarTips} />
        <Route path="/vocabulary" component={Vocabulary} />
        <Route path="/interview" component={InterviewTips} />
        <Route path="/email" component={EmailWriting} />
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
