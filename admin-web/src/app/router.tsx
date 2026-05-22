import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { DramasPage } from '../pages/dramas/DramasPage';
import { EpisodesPage } from '../pages/episodes/EpisodesPage';
import { HighlightsPage } from '../pages/highlights/HighlightsPage';
import { InteractionsPage } from '../pages/interactions/InteractionsPage';
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
      { path: 'interactions', element: <InteractionsPage /> },
      { path: 'branch-tasks', element: <BranchTasksPage /> },
      { path: 'assets-config', element: <AssetsConfigPage /> },
      { path: 'demo-tools', element: <DemoToolsPage /> },
    ],
  },
]);
