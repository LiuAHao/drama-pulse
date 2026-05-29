import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { DramasPage } from '../pages/dramas/DramasPage';
import { EpisodesPage } from '../pages/episodes/EpisodesPage';
import { HighlightsPage } from '../pages/highlights/HighlightsPage';
import { HighlightReviewPage } from '../pages/highlights/HighlightReviewPage';
import { InteractionsPage } from '../pages/interactions/InteractionsPage';
import { PlayerEngagementPage } from '../pages/playerEngagement/PlayerEngagementPage';
import { BranchTasksPage } from '../pages/branchTasks/BranchTasksPage';
import { AssetsConfigPage } from '../pages/assetsConfig/AssetsConfigPage';
import { DemoToolsPage } from '../pages/demoTools/DemoToolsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'dramas', element: <DramasPage /> },
      { path: 'episodes', element: <EpisodesPage /> },
      { path: 'highlights', element: <HighlightsPage /> },
      { path: 'highlights/:highlightId/review', element: <HighlightReviewPage /> },
      { path: 'interactions', element: <InteractionsPage /> },
      { path: 'player-engagement', element: <PlayerEngagementPage /> },
      { path: 'branch-tasks', element: <BranchTasksPage /> },
      { path: 'assets-config', element: <AssetsConfigPage /> },
      { path: 'demo-tools', element: <DemoToolsPage /> },
    ],
  },
]);
