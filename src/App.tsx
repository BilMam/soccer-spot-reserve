
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Profile from '@/pages/Profile';
import Search from '@/pages/Search';
import FieldDetail from '@/pages/FieldDetail';
import AddField from '@/pages/AddField';
import EditField from '@/pages/EditField';
import BecomeOwner from '@/pages/BecomeOwner';
import OwnerDashboard from '@/pages/OwnerDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import BookingSuccess from '@/pages/BookingSuccess';
import PaymentPage from '@/pages/PaymentPage';
import NotFound from '@/pages/NotFound';
import { AuthProvider } from '@/hooks/useAuth';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/search" element={<Search />} />
              <Route path="/field/:id" element={<FieldDetail />} />
              <Route path="/add-field" element={<AddField />} />
              <Route path="/edit-field/:id" element={<EditField />} />
              <Route path="/become-owner" element={<BecomeOwner />} />
              <Route path="/owner-dashboard" element={<OwnerDashboard />} />
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/payment/:token" element={<PaymentPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
