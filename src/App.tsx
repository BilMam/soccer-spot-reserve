
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/useAuth';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/ui/loading-spinner';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { ThemeProvider } from '@/components/ThemeProvider';

// Lazy load pages for better performance
const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/pages/Auth'));
const Profile = lazy(() => import('@/pages/Profile'));
const Search = lazy(() => import('@/pages/Search'));
const FieldDetail = lazy(() => import('@/pages/FieldDetail'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const AddField = lazy(() => import('@/pages/AddField'));
const EditField = lazy(() => import('@/pages/EditField'));
const BecomeOwner = lazy(() => import('@/pages/BecomeOwner'));
const OwnerDashboard = lazy(() => import('@/pages/OwnerDashboard'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'));
const GeocodingAdmin = lazy(() => import('@/pages/GeocodingAdmin'));
const BookingSuccess = lazy(() => import('@/pages/BookingSuccess'));
const PaymentPage = lazy(() => import('@/pages/PaymentPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Enhanced QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        if (error?.status === 404) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground">Chargement de la page...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router>
              <div className="min-h-screen bg-background text-foreground">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/field/:id" element={<FieldDetail />} />
                    
                    {/* Protected routes */}
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/checkout/:id" 
                      element={
                        <ProtectedRoute>
                          <Checkout />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/add-field" 
                      element={
                        <ProtectedRoute>
                          <AddField />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/edit-field/:id" 
                      element={
                        <ProtectedRoute>
                          <EditField />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/become-owner" 
                      element={
                        <ProtectedRoute>
                          <BecomeOwner />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/owner-dashboard" 
                      element={
                        <ProtectedRoute>
                          <OwnerDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/owner/dashboard" 
                      element={
                        <ProtectedRoute>
                          <OwnerDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    
                    {/* Admin routes */}
                    <Route 
                      path="/admin-dashboard" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/super-admin-dashboard" 
                      element={
                        <ProtectedRoute requireSuperAdmin>
                          <SuperAdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/geocoding-admin" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <GeocodingAdmin />
                        </ProtectedRoute>
                      } 
                    />
                    
                    {/* Payment and success routes */}
                    <Route path="/booking-success" element={<BookingSuccess />} />
                    <Route path="/payment/:token" element={<PaymentPage />} />
                    
                    {/* 404 fallback */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </div>
              <Toaster />
            </Router>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
