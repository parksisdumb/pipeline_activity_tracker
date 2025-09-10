import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";

import ManagerDashboard from './pages/manager-dashboard';
import LoginPage from './pages/login';
import WeeklyGoals from './pages/weekly-goals';
import AccountsList from './pages/accounts-list';
import LogActivity from './pages/log-activity';
import PropertiesList from './pages/properties-list';
import AccountDetails from './pages/account-details';
import TodayPage from './pages/today';
import ContactsList from './pages/contacts-list';
import ContactDetails from './pages/contact-details';
import ActivitiesPage from './pages/activities';
import SignUpPage from './pages/sign-up/index';
import AddContactModal from './pages/add-contact-modal';
import AddPropertyModal from './pages/add-property-modal';
import AdminDashboard from './pages/admin-dashboard';
import PropertyDetails from './pages/property-details';

const ProfilePage = React.lazy(() => import('./pages/profile'));

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          
          {/* Protected routes */}
          <Route path="/today" element={<TodayPage />} />
          <Route path="/weekly-goals" element={<WeeklyGoals />} />
          <Route path="/accounts-list" element={<AccountsList />} />
          <Route path="/accounts" element={<Navigate to="/accounts-list" replace />} />
          <Route path="/account-details/:id" element={<AccountDetails />} />
          <Route path="/contacts-list" element={<ContactsList />} />
          <Route path="/contacts" element={<Navigate to="/contacts-list" replace />} />
          <Route path="/contact-details/:id" element={<ContactDetails />} />
          <Route path="/properties-list" element={<PropertiesList />} />
          <Route path="/properties" element={<Navigate to="/properties-list" replace />} />
          <Route path="/property-details/:id" element={<PropertyDetails />} />
          <Route path="/add-property" element={<Navigate to="/properties-list" replace />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/log-activity" element={<LogActivity />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/profile" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <ProfilePage />
            </React.Suspense>
          } />
          
          {/* Modal routes */}
          <Route path="/add-contact-modal" element={<AddContactModal />} />
          <Route path="/add-property-modal" element={<AddPropertyModal />} />
          
          {/* Default redirects */}
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;