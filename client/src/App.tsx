import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "@/pages/Home";
import { getActiveTrainingModules } from "@/app/moduleRegistry";

export function TrainingRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {getActiveTrainingModules().map(({ id, path, Page }) => (
        <Route key={id} path={path}>
          <Suspense fallback={<main className="module-main" aria-live="polite">Đang mở bài luyện…</main>}><Page /></Suspense>
        </Route>
      ))}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <TrainingRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
