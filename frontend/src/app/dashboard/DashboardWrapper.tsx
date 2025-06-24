import dynamic from 'next/dynamic';
import { DashboardLoadingSkeleton } from '../components/LoadingSkeletons';

const DashboardPage = dynamic(() => import('./page'), {
  loading: () => <DashboardLoadingSkeleton />,
});

export default function DashboardWrapper() {
  return <DashboardPage />;
} 