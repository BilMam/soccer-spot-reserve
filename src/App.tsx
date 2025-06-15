
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import FieldDetail from "./pages/FieldDetail";
import OwnerDashboard from "./pages/OwnerDashboard";
import AddField from "./pages/AddField";
import EditField from "./pages/EditField";
import Profile from "./pages/Profile";
import BecomeOwner from "./pages/BecomeOwner";
import BookingSuccess from "./pages/BookingSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/search" element={<Search />} />
            <Route path="/field/:id" element={<FieldDetail />} />
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="/add-field" element={<AddField />} />
            <Route path="/edit-field/:id" element={<EditField />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/become-owner" element={<BecomeOwner />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
