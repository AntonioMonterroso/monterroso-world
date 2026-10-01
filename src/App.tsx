import { Route, Routes } from 'react-router-dom'
import AppPlaceholder from './pages/AppPlaceholder'
import Landing from './pages/Landing'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppPlaceholder />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
