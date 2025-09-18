import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';

// Import all page components
import Home from './pages/home';
import Login from './pages/login';
import Signup from './pages/sign-up';
import EmailConfirmation from './pages/email-confirmation';
import PasswordSetup from './pages/password-setup';
import PasswordResetRequest from './pages/password-reset-request';
import PasswordResetConfirmation from './pages/password-reset-confirmation';
import MagicLinkAuthentication from './pages/magic-link-authentication';
import Today from './pages/today';
import LogActivity from './pages/log-activity';
import AccountsList from './pages/accounts-list';
import AccountDetails from './pages/account-details';
import ContactsList from './pages/contacts-list';
import ContactDetails from './pages/contact-details';
import PropertiesList from './pages/properties-list';
import PropertyDetails from './pages/property-details';
import WeeklyGoals from './pages/weekly-goals';
import Activities from './pages/activities';
import ManagerDashboard from './pages/manager-dashboard';
import AdminDashboard from './pages/admin-dashboard';
import SuperAdminDashboard from './pages/super-admin-dashboard';
import Profile from './pages/profile';
import UserProfile from './pages/user-profile';
import AddContactModal from './pages/add-contact-modal';
import NotFound from './pages/NotFound';

// Import utilities
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

const ProfilePage = React.lazy(() => import('./pages/profile'));

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ScrollToTop />
          <RouterRoutes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Auth flow routes */}
            <Route path="/email-confirmation" element={<EmailConfirmation />} />
            <Route path="/password-setup" element={<PasswordSetup />} />
            <Route path="/password-reset-request" element={<PasswordResetRequest />} />
            <Route path="/password-reset-confirmation" element={<PasswordResetConfirmation />} />
            <Route path="/magic-link-authentication" element={<MagicLinkAuthentication />} />
            
            {/* User dashboard routes */}
            <Route path="/today" element={<Today />} />
            <Route path="/log-activity" element={<LogActivity />} />
            <Route path="/accounts-list" element={<AccountsList />} />
            <Route path="/account-details/:id" element={<AccountDetails />} />
            <Route path="/contacts-list" element={<ContactsList />} />
            <Route path="/contact-details/:id" element={<ContactDetails />} />
            <Route path="/properties-list" element={<PropertiesList />} />
            <Route path="/property-details/:id" element={<PropertyDetails />} />
            <Route path="/weekly-goals" element={<WeeklyGoals />} />
            <Route path="/activities" element={<Activities />} />
            
            {/* Modal routes */}
            <Route path="/add-contact-modal" element={<AddContactModal />} />
            
            {/* Manager routes */}
            <Route path="/manager-dashboard" element={<ManagerDashboard />} />
            
            {/* Admin routes */}
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            
            {/* Super Admin routes */}
            <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
            
            {/* User profile routes */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/user-profile" element={<UserProfile />} />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;