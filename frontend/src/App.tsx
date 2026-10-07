import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { SessionProvider } from './orchestration/SessionContext';
import { ResumeGate } from './orchestration/ResumeGate';
import { Layout } from './shell/Layout';
import { ConsentPage } from './tasks/intake/ConsentPage';
import { DemographicsPage } from './tasks/intake/DemographicsPage';
import { SpatialExperiencePage } from './tasks/intake/SpatialExperiencePage';
import { PtsotTask } from './tasks/ptsot/PtsotTask';
import { PerspectiveTask } from './tasks/perspective/PerspectiveTask';
import { LegoTask } from './tasks/lego/LegoTask';
import { DonePage } from './tasks/done/DonePage';
import { AdminDashboard } from './admin/AdminDashboard';

function RootLayout() {
  return (
    <Layout>
      <ResumeGate>
        <Outlet />
      </ResumeGate>
    </Layout>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <ConsentPage />,
      },
      {
        path: 'demographics',
        element: <DemographicsPage />,
      },
      {
        path: 'experience',
        element: <SpatialExperiencePage />,
      },
      {
        path: 'ptsot',
        element: <PtsotTask />,
      },
      {
        path: 'perspective',
        element: <PerspectiveTask />,
      },
      {
        path: 'lego',
        element: <LegoTask />,
      },
      {
        path: 'done',
        element: <DonePage />,
      }
    ]
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
  }
]);

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
