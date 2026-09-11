import { useHashRoute } from '@/hooks/useHashRoute'
import { Dashboard } from '@/pages/Dashboard'
import { SitePower } from '@/pages/SitePower'

export default function App() {
  const route = useHashRoute()

  return route === '#/sites' ? <SitePower route={route} /> : <Dashboard route={route} />
}
