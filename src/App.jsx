import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import AdminDashboard from './pages/AdminDashboard'
import AdminCards from './pages/AdminCards'
import AdminLogin from './pages/AdminLogin'
import ObsOverlay from './pages/ObsOverlay'
import PublicBoard from './pages/PublicBoard'
import './App.css'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PublicBoard />} />
        <Route path="/obs" element={<ObsOverlay />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/cards" element={<AdminCards />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
