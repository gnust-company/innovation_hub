import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Toast } from '@/components/feedback/Toast';

// Pages
import { LoginPage } from '@/pages/Login/LoginPage';
import { RegisterPage } from '@/pages/Register/RegisterPage';
import { LandingPage } from '@/pages/Landing/LandingPage';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { UserDashboardPage } from '@/pages/Home/UserDashboardPage';
import { ProblemFeedPage } from '@/pages/ProblemFeed/ProblemFeedPage';
import { CreateProblemPage } from '@/pages/ProblemFeed/CreateProblemPage';
import { EditProblemPage } from '@/pages/ProblemFeed/EditProblemPage';
import { ProblemDetailPage } from '@/pages/ProblemDetail/ProblemDetailPage';
import { IdeaLabPage } from '@/pages/IdeaLab/IdeaLabPage';
import { RoomDetailPage } from '@/pages/RoomDetail/RoomDetailPage';
import { IdeaDetailPage } from '@/pages/IdeaDetail/IdeaDetailPage';
import { EditIdeaPage } from '@/pages/IdeaDetail/EditIdeaPage';
import { CreateIdeaPage } from '@/pages/RoomDetail/CreateIdeaPage';
import { UserSettingsPage } from '@/pages/Settings/UserSettingsPage';
import { AdminUsersPage } from '@/pages/Admin/AdminUsersPage';
import { EventsPage } from '@/pages/Events/EventsPage';
import { EventDetailPage } from '@/pages/EventDetail/EventDetailPage';
import { HelpPage } from '@/pages/Help/HelpPage';
import { PageTransition } from '@/components/ui/PageTransition';
import { ChatBubbleButton } from '@/components/chat/ChatBubbleButton';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <AuthGuard>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
                  <Route path="/dashboard" element={<PageTransition><UserDashboardPage /></PageTransition>} />
                  <Route path="/admin" element={<PageTransition><DashboardPage /></PageTransition>} />
                  <Route path="/problems" element={<PageTransition><ProblemFeedPage /></PageTransition>} />
                  <Route path="/problems/new" element={<PageTransition><CreateProblemPage /></PageTransition>} />
                  <Route path="/problems/:id/edit" element={<PageTransition><EditProblemPage /></PageTransition>} />
                  <Route path="/problems/:id" element={<PageTransition><ProblemDetailPage /></PageTransition>} />
                  <Route path="/rooms" element={<PageTransition><IdeaLabPage /></PageTransition>} />
                  <Route path="/rooms/:id" element={<PageTransition><RoomDetailPage /></PageTransition>} />
                  <Route path="/rooms/:roomId/ideas/new" element={<PageTransition><CreateIdeaPage /></PageTransition>} />
                  <Route path="/ideas/:id/edit" element={<PageTransition><EditIdeaPage /></PageTransition>} />
                  <Route path="/ideas/:id" element={<PageTransition><IdeaDetailPage /></PageTransition>} />
                  <Route path="/settings" element={<PageTransition><UserSettingsPage /></PageTransition>} />
                  <Route path="/admin/users" element={<PageTransition><AdminUsersPage /></PageTransition>} />
                  <Route path="/events" element={<PageTransition><EventsPage /></PageTransition>} />
                  <Route path="/events/:id/ideas/:ideaId" element={<PageTransition><EventDetailPage /></PageTransition>} />
                  <Route path="/events/:id" element={<PageTransition><EventDetailPage /></PageTransition>} />
                  <Route path="/help" element={<PageTransition><HelpPage /></PageTransition>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            </AuthGuard>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <>
      <AnimatedRoutes />
      <Toast />
      <ChatBubbleButton />
    </>
  );
}

export default App;
