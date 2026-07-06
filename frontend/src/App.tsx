import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AppRoutes from './routes'
import { ClickSpark } from '@/components/ui/ClickSpark'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClickSpark
          sparkColor="#6366f1"
          sparkSize={10}
          sparkRadius={20}
          sparkCount={8}
          duration={500}
        >
          <AppRoutes />
        </ClickSpark>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#111118',
              border: '1px solid #2a2a35',
              color: '#f1f1f5',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
