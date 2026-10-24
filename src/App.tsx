import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { EventPage } from './pages/EventPage';
import { AuthPage } from './pages/AuthPage';
import { QuickPostPage } from './pages/QuickPostPage';
import { InstantAddPage } from './pages/InstantAddPage';
import { MyPlanPage } from './pages/MyPlanPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { CommunityPage } from './pages/CommunityPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
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
        <Route path="organizer" element={<OrganizerDashboardPage />} />
        <Route path="communities" element={<CommunityPage />} />
        <Route path="communities/:communityId" element={<CommunityPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
