import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import PricingRedirect from './app/work/PricingRedirect'

const AppRoot = lazy(() => import('./app/AppRoot'))
const PublicShare = lazy(() => import('./app/fit/PublicShare'))
const PublicSong = lazy(() => import('./app/music/PublicSong'))
const Live = lazy(() => import('./app/pulpit/Live'))
const QuotePublic = lazy(() => import('./app/work/QuotePublic'))

export default function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--fondo)' }} aria-busy />}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppRoot />} />
      <Route path="/precios" element={<PricingRedirect />} />
      <Route path="/cotizacion/:token" element={<QuotePublic />} />
      <Route path="/live/:token" element={<Live />} />
      <Route path="/share/:token" element={<PublicShare />} />
      <Route path="/cancion/:token" element={<PublicSong />} />
      <Route path="*" element={<Landing />} />
    </Routes>
    </Suspense>
  )
}
