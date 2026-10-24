import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { AuthPage } from './pages/AuthPage';
import { NotFoundPage } from './pages/NotFoundPage';

const EventPage = lazy(() => import('./pages/EventPage').then((module) => ({ default: module.EventPage })));
const QuickPostPage = lazy(() => import('./pages/QuickPostPage').then((module) => ({ default: module.QuickPostPage })));
const InstantAddPage = lazy(() => import('./pages/InstantAddPage').then((module) => ({ default: module.InstantAddPage })));
const MyPlanPage = lazy(() => import('./pages/MyPlanPage').then((module) => ({ default: module.MyPlanPage })));
const OrganizerDashboardPage = lazy(() => import('./pages/OrganizerDashboardPage').then((module) => ({ default: module.OrganizerDashboardPage })));
const OrganizerStudioPage = lazy(() => import('./pages/OrganizerStudioPage').then((module) => ({ default: module.OrganizerStudioPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((module) => ({ default: module.CommunityPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));

export default function App() {
  return (
    <Suspense fallback={<div className="page-container"><p>Loading Knot…</p></div>}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="events/:eventId" element={<EventPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="publish" element={<QuickPostPage />} />
          <Route path="host" element={<QuickPostPage />} />
          <Route path="add" element={<InstantAddPage />} />
          <Route path="plan" element={<MyPlanPage />} />
          <Route path="organizer/events/:eventId" element={<OrganizerStudioPage />} />
          <Route path="organizer" element={<OrganizerDashboardPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="communities" element={<CommunityPage />} />
          <Route path="communities/:communityId" element={<CommunityPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
