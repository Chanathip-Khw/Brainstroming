import dynamic from 'next/dynamic';
import { CanvasLoadingSkeleton } from '../../components/LoadingSkeletons';
import type { User } from '../../types';

interface CanvasBoardWrapperProps {
  user: User;
  projectId: string;
}

const CanvasBoard = dynamic(
  () => import('../../components/canvas/CanvasBoard').then(mod => ({ default: mod.CanvasBoard })),
  {
    loading: () => <CanvasLoadingSkeleton />,
    ssr: false, // Canvas requires client-side rendering
  }
);

export const CanvasBoardWrapper: React.FC<CanvasBoardWrapperProps> = ({ user, projectId }) => {
  return <CanvasBoard user={user} projectId={projectId} />;
}; 