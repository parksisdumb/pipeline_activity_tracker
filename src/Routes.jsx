import { BrowserRouter } from 'react-router-dom';
import { Routes as RouterRoutes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

// Import all pages
import Home from './pages/home';
import Today from './pages/today';
import Login from './pages/login';
import SignUp from './pages/sign-up';
import Profile from './pages/profile';
import UserProfile from './pages/user-profile';
import ProfileCreation from './pages/profile-creation';
import EmailConfirmation from './pages/email-confirmation';
import PasswordReset from './pages/password-reset-request';
import PasswordResetConfirmation from './pages/password-reset-confirmation';
import PasswordSetup from './pages/password-setup';
import TemporaryPasswordSetup from './pages/temporary-password-setup';
import MagicLinkAuthentication from './pages/magic-link-authentication';
import AccountsList from './pages/accounts-list';
import AccountDetails from './pages/account-details';
import PropertiesList from './pages/properties-list';
import PropertyDetails from './pages/property-details';
import ContactsList from './pages/contacts-list';
import ContactDetails from './pages/contact-details';
import OpportunitiesList from './pages/opportunities-list';
import OpportunityDetails from './pages/opportunity-details';
import LogActivity from './pages/log-activity';
import Activities from './pages/activities';
import WeeklyGoals from './pages/weekly-goals';
import ManagerDashboard from './pages/manager-dashboard';
import AdminDashboard from './pages/admin-dashboard';
import SuperAdminDashboard from './pages/super-admin-dashboard';
import SuperAdminUserManagement from './pages/super-admin-user-management';
import AddContactModal from './pages/add-contact-modal';
import AddPropertyModal from './pages/add-property-modal';
import AddOpportunityModal from './pages/add-opportunity-modal';
import NotFound from './pages/NotFound';
import TaskDetails from './pages/task-details';
import TaskManagement from './pages/task-management';

export default function Routes() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/profile-creation" element={<ProfileCreation />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route path="/password-reset-confirmation" element={<PasswordResetConfirmation />} />
          <Route path="/password-setup" element={<PasswordSetup />} />
          <Route path="/temporary-password-setup" element={<TemporaryPasswordSetup />} />
          <Route path="/magic-link-authentication" element={<MagicLinkAuthentication />} />
          
          {/* Main application routes */}
          <Route path="/today" element={<Today />} />
          <Route path="/accounts" element={<AccountsList />} />
          <Route path="/account-details/:id" element={<AccountDetails />} />
          <Route path="/properties" element={<PropertiesList />} />
          <Route path="/property-details/:id" element={<PropertyDetails />} />
          <Route path="/contacts" element={<ContactsList />} />
          <Route path="/contact-details/:id" element={<ContactDetails />} />
          <Route path="/opportunities" element={<OpportunitiesList />} />
          <Route path="/opportunity-details/:id" element={<OpportunityDetails />} />
          <Route path="/log-activity" element={<LogActivity />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/weekly-goals" element={<WeeklyGoals />} />
          
          {/* Task Management routes */}
          <Route path="/tasks" element={<TaskManagement />} />
          <Route path="/task-details/:taskId" element={<TaskDetails />} />
          
          {/* Dashboard routes */}
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin-user-management" element={<SuperAdminUserManagement />} />
          
          {/* Modal routes */}
          <Route path="/add-contact-modal" element={<AddContactModal />} />
          <Route path="/add-property-modal" element={<AddPropertyModal />} />
          <Route path="/add-opportunity-modal" element={<AddOpportunityModal />} />
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}