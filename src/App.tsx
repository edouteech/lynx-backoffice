import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import AdminLogin from './pages/auth/AdminLogin'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import OrganizationRequestsPage from './pages/organization-requests/OrganizationRequestsPage'
import OrganizationRequestDetailPage from './pages/organization-requests/OrganizationRequestDetailPage'
import OrganizationsPage from './pages/organizations/OrganizationsPage'
import OrganizationDetailPage from './pages/organizations/OrganizationDetailPage'
import OwnersPage from './pages/owners/OwnersPage'
import UsersPage from './pages/users/UsersPage'
import UserDetailPage from './pages/users/UserDetailPage'
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage'
import SubscriptionDetailPage from './pages/subscriptions/SubscriptionDetailPage'

function withLayout(page: ReactElement) {
  return <AdminLayout>{page}</AdminLayout>
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>{withLayout(<AdminDashboard />)}</ProtectedRoute>
            }
          />
          <Route
            path="/organization-requests"
            element={
              <ProtectedRoute>
                {withLayout(<OrganizationRequestsPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization-requests/:id"
            element={
              <ProtectedRoute>
                {withLayout(<OrganizationRequestDetailPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations"
            element={
              <ProtectedRoute>
                {withLayout(<OrganizationsPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:id"
            element={
              <ProtectedRoute>
                {withLayout(<OrganizationDetailPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/owners"
            element={
              <ProtectedRoute>{withLayout(<OwnersPage />)}</ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>{withLayout(<UsersPage />)}</ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>{withLayout(<UserDetailPage />)}</ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>{withLayout(<SubscriptionsPage />)}</ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions/:id"
            element={
              <ProtectedRoute>{withLayout(<SubscriptionDetailPage />)}</ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  )
}
