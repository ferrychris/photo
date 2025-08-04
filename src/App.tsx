import { useEffect } from 'react';
import { 
  createBrowserRouter, 
  RouterProvider, 
  Route, 
  createRoutesFromElements,
  Navigate,
  Outlet
} from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { AuthProvider } from './contexts/AuthContext';
// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import PhotoSpheresPage from './pages/PhotoSpheresPage';
import Profile from './components/dashboard/Profile';
import CollageEditorPage from './pages/CollageEditorPage';
import CollageViewerPage from './pages/CollageViewerPage';
import PhotoboothPage from './pages/PhotoboothPage';
import PhotoboothSettingsPage from './pages/PhotoboothSettingsPage';
import CollageModerationPage from './pages/CollageModerationPage';
import PricingPage from './pages/PricingPage';
import FAQPage from './pages/FAQPage';
import JoinCollage from './pages/JoinCollage';
import Custom404Page from './pages/404';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import BlogPostAI from './pages/BlogPostAI';
import BlogPostPricing from './pages/BlogPostPricing';
import ShowcasePage from './pages/ShowcasePage';

// Admin Components

// Create router with future flag enabled
// Root component that will be wrapped with AuthProvider
const Root = () => {
  return <Outlet />;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AuthProvider><Root /></AuthProvider>}>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/showcase" element={<ShowcasePage />} /> {/* ADD THIS LINE */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/join" element={<JoinCollage />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/photobooth-businesses-double-revenue-photosphere-case-study" element={<BlogPost />} />
      <Route path="/blog/ai-revolution-photo-activations-photobooth-software-future" element={<BlogPostAI />} />
      <Route path="/blog/photobooth-pricing-strategies-premium-rates" element={<BlogPostPricing />} />
      <Route path="/collage/:code" element={<CollageViewerPage />} />
      <Route path="/photobooth/:code" element={<PhotoboothPage />} />
      
      {/* 404 Page - This must be the last route */}
      <Route path="*" element={<Custom404Page />} />
      
      {/* Redirect for common typo */}
      <Route path="/dashbaord" element={<Navigate to="/dashboard" replace />} />
      
      {/* Protected routes - require authentication */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/photospheres" element={<ProtectedRoute><PhotoSpheresPage /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/dashboard/collage/:id" element={<ProtectedRoute><CollageEditorPage /></ProtectedRoute>} />
      <Route path="/dashboard/collage/:id/photobooth-settings" element={<ProtectedRoute><PhotoboothSettingsPage /></ProtectedRoute>} />
      <Route path="/collage/:id/moderation" element={<ProtectedRoute><CollageModerationPage /></ProtectedRoute>} />
      <Route path="/moderation/:id" element={<ProtectedRoute><CollageModerationPage /></ProtectedRoute>} />
      
     
    </Route>
  ),
  {
    future: {
      v7_relativeSplatPath: true
    }
  }
);

function App() {
  const { initialize } = useAuthStore();
  
  // Initialize auth state when the app loads
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  return (
    <RouterProvider router={router} />
  );
}

export default App;