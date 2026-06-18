import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuthStore } from '@/store/authStore';

// Lazy load page components (placeholders for now)
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('../pages/ProjectDetailPage'));
const TasksPage = lazy(() => import('../pages/TasksPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const RepliesPage = lazy(() => import('../pages/RepliesPage'));
const AssignedCommentsPage = lazy(() => import('../pages/AssignedCommentsPage'));
const MyTasksPage = lazy(() => import('../pages/MyTasksPage'));
const MorePage = lazy(() => import('../pages/MorePage'));
const ChannelsPage = lazy(() => import('../pages/ChannelsPage'));
const ChatInterface = lazy(() => import('../components/chat/ChatInterface'));
const DirectMessagePage = lazy(() => import('../pages/DirectMessagePage'));
const TeamSpacePage = lazy(() => import('../pages/TeamSpacePage'));
const GettingStartedPage = lazy(() => import('../pages/GettingStartedPage'));
const DocsPage = lazy(() => import('../pages/DocsPage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const DatabasePage = lazy(() => import('../pages/DatabasePage'));
const UserProfilePage = lazy(() => import('../pages/UserProfilePage'));

function ChatPage() {
  const { channelId } = useParams();
  return <ChatInterface channelId={channelId || 'default'} channelName={channelId || 'General'} />;
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to /dashboard */}
        <Route path="/" element={<Navigate replace to="/dashboard" />} />
        {/* Public routes (login, register) */}
        <Route path="/login" element={
          <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>
        } />
        <Route path="/register" element={
          <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>
        } />
        {/* Protected routes wrapped with DashboardLayout */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <DashboardPage />
            </Suspense>
          } />
          <Route path="/projects" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <ProjectsPage />
            </Suspense>
          } />
          <Route path="/projects/:id" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <ProjectDetailPage />
            </Suspense>
          } />
          <Route path="/tasks" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <TasksPage />
            </Suspense>
          } />
          <Route path="/users" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <UsersPage />
            </Suspense>
          } />
          <Route path="/notifications" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <NotificationsPage />
            </Suspense>
          } />
          <Route path="/analytics" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <AnalyticsPage />
            </Suspense>
          } />
          <Route path="/reports" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <ReportsPage />
            </Suspense>
          } />
          <Route path="/admin/db" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <DatabasePage />
            </Suspense>
          } />
          <Route path="/settings" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <SettingsPage />
            </Suspense>
          } />
          <Route path="/replies" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <RepliesPage />
            </Suspense>
          } />
          <Route path="/assigned-comments" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <AssignedCommentsPage />
            </Suspense>
          } />
          <Route path="/my-tasks" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <MyTasksPage />
            </Suspense>
          } />
          <Route path="/more" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <MorePage />
            </Suspense>
          } />
          <Route path="/channels/:channel" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <ChannelsPage />
            </Suspense>
          } />
          <Route path="/chat/:channelId" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <ChatPage />
            </Suspense>
          } />
          <Route path="/dm/:user" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <DirectMessagePage />
            </Suspense>
          } />
          <Route path="/spaces/team" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <TeamSpacePage />
            </Suspense>
          } />
          <Route path="/getting-started" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <GettingStartedPage />
            </Suspense>
          } />
          <Route path="/docs" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <DocsPage />
            </Suspense>
          } />
          <Route path="/user/:userId" element={
            <Suspense fallback={<div className='flex items-center justify-center h-screen text-gray-400'>Loading…</div>}>
              <UserProfilePage />
            </Suspense>
          } />
        </Route>
        {/* Catch‑all 404 */}
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">404</h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">Page not found</p>
              <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
