import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import GiftcardsPage from './pages/GiftcardsPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ReferralsConfigPage from './pages/ReferralsConfigPage'
import ReferralsDashboardPage from './pages/ReferralsDashboardPage'
import ReferralsListPage from './pages/ReferralsListPage'
import RewardsPage from './pages/RewardsPage'
import TransactionsPage from './pages/TransactionsPage'

export default function App() {
  const { session } = useAuth()
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/giftcards" element={<GiftcardsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/referrals/dashboard" element={<ReferralsDashboardPage />} />
        <Route path="/referrals/list" element={<ReferralsListPage />} />
        <Route path="/referrals/rewards" element={<RewardsPage />} />
        <Route path="/referrals/config" element={<ReferralsConfigPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}
