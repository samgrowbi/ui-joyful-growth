import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ThankYou from "./pages/ThankYou";

import BookLedCryo from "./pages/BookLedCryo";
import BookLed from "./pages/BookLed";
import BookBodySculpting from "./pages/BookBodySculpting";
import BookFacelift from "./pages/BookFacelift";
import BookFaceliftV2 from "./pages/BookFaceliftV2";
import BookCarbonPeeling from "./pages/BookCarbonPeeling";
import LedCryo from "./pages/LedCryo";
import BodySculpting from "./pages/BodySculpting";
import Facelift from "./pages/Facelift";
import FaceliftV2 from "./pages/FaceliftV2";
import CarbonPeeling from "./pages/CarbonPeeling";
import SkinSpecialistChat from "./components/chat/SkinSpecialistChat";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Quiz from "./pages/Quiz";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Facelift />} />
          <Route path="/facelift" element={<Facelift />} />
          <Route path="/faceliftv2" element={<FaceliftV2 />} />
          <Route path="/instant-lift" element={<Navigate to="/" replace />} />
          <Route path="/led" element={<Index />} />
          <Route path="/led-cryo" element={<LedCryo />} />
          <Route path="/body-sculpting" element={<BodySculpting />} />
          <Route path="/carbon-peeling" element={<CarbonPeeling />} />
          <Route path="/book/led" element={<BookLed />} />
          <Route path="/book/facelift" element={<BookFacelift />} />
          <Route path="/book/faceliftv2" element={<BookFaceliftV2 />} />
          <Route path="/book/carbon-peeling" element={<BookCarbonPeeling />} />
          <Route path="/book/led-cryo" element={<BookLedCryo />} />
          <Route path="/book/body-sculpting" element={<BookBodySculpting />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SkinSpecialistChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
