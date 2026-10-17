import { Route, Routes } from 'react-router-dom'
import AppRoot from './app/AppRoot'
import PublicShare from './app/fit/PublicShare'
import PublicSong from './app/music/PublicSong'
import Live from './app/pulpit/Live'
import Landing from './pages/Landing'
import PricingPage from './app/work/PricingPage'
import QuotePublic from './app/work/QuotePublic'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppRoot />} />
      <Route path="/precios" element={<PricingPage />} />
      <Route path="/cotizacion/:token" element={<QuotePublic />} />
      <Route path="/live/:token" element={<Live />} />
      <Route path="/share/:token" element={<PublicShare />} />
      <Route path="/cancion/:token" element={<PublicSong />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
