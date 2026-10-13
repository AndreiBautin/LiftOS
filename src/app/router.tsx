import { createBrowserRouter, Navigate } from 'react-router-dom'

import { HomePage } from '@/features/today/HomePage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'

import { AppShell } from './layout/AppShell'
import { RouteError } from './RouteError'

/**
 * `import.meta.env.BASE_URL` comes from the same value the bundler uses
 * for asset paths, set once in vite.config.ts. Hardcoding a basename here
 * is the classic way a project-page deploy ends up serving its assets
 * correctly and 404ing on every route.
 */
/*
 * Every screen but Today loads on demand. Today is the page the app opens
 * on, so it stays in the main bundle; the rest are reached from it and
 * fetch their chunk on the way. The service worker precaches every chunk,
 * so an installed app still opens them offline, and `stale-chunk.ts`
 * reloads once if a deploy has removed the chunk an open page asks for.
 */
export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      errorElement: <RouteError />,
      children: [
        // The hub opens on what to do next, not on the training screen. That
        // is the change from a training app to a hub: the first thing on the
        // first screen should be the answer to "what now".
        { index: true, element: <Navigate to="/today" replace /> },
        /*
         * **Everything that was not training is gone**, and every path it
         * had lands on Today: _"keep it to a workout tracker"_.
         * Redirects rather than deletions,
         * because a PWA shortcut is registered with the operating system
         * at install time and an installed copy goes on asking for the
         * path it was installed with.
         */
        ...[
          'quests',
          'next',
          'goals',
          'goals/:id',
          'jobs',
          'resume',
          'mind',
          'backlog',
          'upgrades',
          'gear',
          'base',
          'vitals',
          'limits',
          'finance',
          'map',
          'map/share',
          'map/inbox',
          'trips',
          'character',
          'party',
          // The app became one page and these two tabs became sections of it.
          'train',
          'history',
        ].map((path) => ({ path, element: <Navigate to="/today" replace /> })),
        /*
         * The Plan screen is gone and `/plan` lands on the Program page.
         * It explained how each muscle's weekly volume was arrived at,
         * which was worth a screen while those were settings — its own
         * last section had already become "Why there is nothing to
         * change". With one hardcoded split there is nothing to explain
         * and nothing to change, so what is left of the question is what
         * the week actually looks like, which is Program.
         */
        { path: 'plan', element: <Navigate to="/program" replace /> },
        {
          path: 'program',
          lazy: () =>
            import('@/features/program/ProgramPage').then((m) => ({ Component: m.ProgramPage })),
        },
        {
          path: 'session/:id',
          lazy: () =>
            import('@/features/history/SessionPage').then((m) => ({ Component: m.SessionPage })),
        },
        {
          path: 'exercise/:id',
          lazy: () =>
            import('@/features/exercise/ExercisePage').then((m) => ({ Component: m.ExercisePage })),
        },
        {
          path: 'records',
          lazy: () =>
            import('@/features/records/RecordsPage').then((m) => ({ Component: m.RecordsPage })),
        },
        {
          path: 'exercises',
          lazy: () =>
            import('@/features/library/LibraryPage').then((m) => ({ Component: m.LibraryPage })),
        },
        {
          path: 'block',
          lazy: () =>
            import('@/features/block/BlockPage').then((m) => ({ Component: m.BlockPage })),
        },
        {
          path: 'year',
          lazy: () => import('@/features/year/YearPage').then((m) => ({ Component: m.YearPage })),
        },
        {
          path: 'year/:year',
          lazy: () => import('@/features/year/YearPage').then((m) => ({ Component: m.YearPage })),
        },
        {
          path: 'compare',
          lazy: () =>
            import('@/features/compare/CompareLiftsPage').then((m) => ({
              Component: m.CompareLiftsPage,
            })),
        },
        {
          path: 'calculator',
          lazy: () =>
            import('@/features/calculator/CalculatorPage').then((m) => ({
              Component: m.CalculatorPage,
            })),
        },
        {
          path: 'muscle/:id',
          lazy: () =>
            import('@/features/muscle/MusclePage').then((m) => ({ Component: m.MusclePage })),
        },
        {
          path: 'muscles',
          lazy: () =>
            import('@/features/muscle/MuscleYearPage').then((m) => ({
              Component: m.MuscleYearPage,
            })),
        },
        {
          path: 'muscles/:year',
          lazy: () =>
            import('@/features/muscle/MuscleYearPage').then((m) => ({
              Component: m.MuscleYearPage,
            })),
        },
        {
          path: 'wrapped/:period',
          lazy: () =>
            import('@/features/wrapped/WrappedPage').then((m) => ({ Component: m.WrappedPage })),
        },
        {
          path: 'month',
          lazy: () =>
            import('@/features/month/MonthPage').then((m) => ({ Component: m.MonthPage })),
        },
        {
          path: 'month/:month',
          lazy: () =>
            import('@/features/month/MonthPage').then((m) => ({ Component: m.MonthPage })),
        },
        { path: 'today', element: <HomePage /> },
        {
          path: 'settings',
          lazy: () =>
            import('@/features/settings/SettingsPage').then((m) => ({ Component: m.SettingsPage })),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
