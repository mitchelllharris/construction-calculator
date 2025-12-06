import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ToastProvider, useToast } from './contexts/ToastContext.jsx'
import NavBar from './components/NavBar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ToastContainer from './components/ToastContainer.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import Pricing from './pages/Pricing.jsx'
import Contacts from './pages/Contacts.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Settings from './pages/Settings.jsx'
import Clients from './pages/Clients.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import ResendVerification from './pages/ResendVerification.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import NotFound from './pages/NotFound.jsx'
import Footer from './components/Footer.jsx'

function AppContent() {
  const { toasts, dismissToast } = useToast();

  return (
    <>
      <NavBar />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />}/>
        <Route path="/contact" element={<Contact />}/>
        <Route path="/pricing" element={<Pricing />}/>
        <Route path="/login" element={<Login />}/>
        <Route path="/register" element={<Register />}/>
          <Route path="/verify-email" element={<VerifyEmail />}/>
          <Route path="/resend-verification" element={<ResendVerification />}/>
          <Route path="/forgot-password" element={<ForgotPassword />}/>
          <Route path="/reset-password" element={<ResetPassword />}/>
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/contacts" 
            element={
              <ProtectedRoute>
                <Contacts />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/clients" 
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />
          
          {/* 404 Not Found - Catch all route */}
          <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
