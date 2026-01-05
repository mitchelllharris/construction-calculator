import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ProfileSwitcherProvider } from './contexts/ProfileSwitcherContext.jsx'
import { ConnectionsProvider } from './contexts/ConnectionsContext.jsx'
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
import ContactDetail from './pages/ContactDetail.jsx'
import Profile from './pages/Profile.jsx'
import Activity from './pages/Activity.jsx'
import Post from './pages/Post.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Settings from './pages/Settings.jsx'
import Clients from './pages/Clients.jsx'
import FindPeople from './pages/FindPeople.jsx'
import CreateBusiness from './pages/CreateBusiness.jsx'
import Business from './pages/Business.jsx'
import EditBusiness from './pages/EditBusiness.jsx'
import MyBusinesses from './pages/MyBusinesses.jsx'
import Following from './pages/Following.jsx'
import BlockedUsers from './pages/BlockedUsers.jsx'
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
        <Route path="/profile/:username/activity" element={<Activity />}/>
        <Route path="/profile/:username" element={<Profile />}/>
        <Route path="/profile/id/:id" element={<Profile />}/>
        <Route path="/business/:slug" element={<Business />}/>
        <Route path="/business/id/:id" element={<Business />}/>
        <Route 
          path="/business/:slug/edit" 
          element={
            <ProtectedRoute>
              <EditBusiness />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/business/id/:id/edit" 
          element={
            <ProtectedRoute>
              <EditBusiness />
            </ProtectedRoute>
          }
        />
        <Route path="/post/:postId" element={<Post />}/>
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
            path="/contacts/:id" 
            element={
              <ProtectedRoute>
                <ContactDetail />
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
          <Route 
            path="/find-people" 
            element={
              <ProtectedRoute>
                <FindPeople />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/create-business" 
            element={
              <ProtectedRoute>
                <CreateBusiness />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/my-businesses" 
            element={
              <ProtectedRoute>
                <MyBusinesses />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/following" 
            element={
              <ProtectedRoute>
                <Following />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/blocked-users" 
            element={
              <ProtectedRoute>
                <BlockedUsers />
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
            <ProfileSwitcherProvider>
              <ConnectionsProvider>
                <AppContent />
              </ConnectionsProvider>
            </ProfileSwitcherProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
