import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../services/queryClient';
import { ToastProvider } from '../components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastProvider />
    </QueryClientProvider>
  );
}
