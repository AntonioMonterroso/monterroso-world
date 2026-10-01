import { Route, Routes } from 'react-router-dom'
import AppRoot from './app/AppRoot'
import Live from './app/pulpit/Live'
import Landing from './pages/Landing'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppRoot />} />
      <Route path="/live/:token" element={<Live />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
