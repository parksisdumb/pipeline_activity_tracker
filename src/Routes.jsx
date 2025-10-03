import { BrowserRouter, Routes as RouterRoutes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
// Import all existing pages
import Home from './pages/home';
import AccountsList from './pages/accounts-list';
import AccountDetails from './pages/account-details';
import ContactsList from './pages/contacts-list';
import ContactDetails from './pages/contact-details';
import OpportunitiesList from './pages/opportunities-list';
import OpportunityDetails from './pages/opportunity-details';
import PropertiesList from './pages/properties-list';
import PropertyDetails from './pages/property-details';
import ProspectsList from './pages/prospects-list';
import ProspectDetails from './pages/prospect-details';
import Today from './pages/today';
import Activities from './pages/activities';
import TaskManagement from './pages/task-management';
import TaskDetails from './pages/task-details';
import WeeklyGoals from './pages/weekly-goals';
import ManagerDashboard from './pages/manager-dashboard';
import AdminDashboard from './pages/admin-dashboard';
import SuperAdminDashboard from './pages/super-admin-dashboard';
import SuperAdminUserManagement from './pages/super-admin-user-management';
import UserProfile from './pages/user-profile';
import Profile from './pages/profile';
import Login from './pages/login';
import SignUp from './pages/sign-up';
import EmailConfirmation from './pages/email-confirmation';
import MagicLinkAuthentication from './pages/magic-link-authentication';
import PasswordResetRequest from './pages/password-reset-request';
import PasswordResetConfirmation from './pages/password-reset-confirmation';
import TemporaryPasswordSetup from './pages/temporary-password-setup';
import PasswordSetup from './pages/password-setup';
import ProfileCreation from './pages/profile-creation';
import LogActivity from './pages/log-activity';
import AddOpportunityModal from './pages/add-opportunity-modal';
import AddPropertyModal from './pages/add-property-modal';
import AddContactModal from './pages/add-contact-modal';
import CreateTaskModal from './pages/create-task-modal';
import ConvertProspectModal from './pages/convert-prospect-modal';
import DocumentsPage from './pages/documents';
import UploadDocumentModal from './pages/upload-document-modal';
// Import Roof Finder page
import UglyRoofFinderMap from './pages/ugly-roof-finder-map';
// Import new Lead Conversion Workflow page
import LeadConversionWorkflow from './pages/lead-conversion-workflow';
import NotFound from './pages/NotFound';

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <RouterRoutes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/email-confirmation" element={<EmailConfirmation />} />
            <Route path="/magic-link-authentication" element={<MagicLinkAuthentication />} />
            <Route path="/password-reset-request" element={<PasswordResetRequest />} />
            <Route path="/password-reset-confirmation" element={<PasswordResetConfirmation />} />
            <Route path="/temporary-password-setup" element={<TemporaryPasswordSetup />} />
            <Route path="/password-setup" element={<PasswordSetup />} />
            <Route path="/profile-creation" element={<ProfileCreation />} />
            
            {/* Main App Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/today" element={<Today />} />
            
            {/* Accounts & Contacts */}
            <Route path="/accounts" element={<AccountsList />} />
            <Route path="/account-details/:id" element={<AccountDetails />} />
            <Route path="/contacts" element={<ContactsList />} />
            <Route path="/contact-details/:id" element={<ContactDetails />} />
            
            {/* Prospects */}
            <Route path="/prospects" element={<ProspectsList />} />
            <Route path="/prospect-details/:id" element={<ProspectDetails />} />
            
            {/* Opportunities & Properties */}
            <Route path="/opportunities" element={<OpportunitiesList />} />
            <Route path="/opportunity-details/:id" element={<OpportunityDetails />} />
            <Route path="/properties" element={<PropertiesList />} />
            <Route path="/property-details/:id" element={<PropertyDetails />} />
            
            {/* Activities & Tasks */}
            <Route path="/activities" element={<Activities />} />
            <Route path="/tasks" element={<TaskManagement />} />
            <Route path="/task-details/:id" element={<TaskDetails />} />
            <Route path="/log-activity" element={<LogActivity />} />
            
            {/* Management */}
            <Route path="/weekly-goals" element={<WeeklyGoals />} />
            <Route path="/manager-dashboard" element={<ManagerDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
            <Route path="/super-admin-user-management" element={<SuperAdminUserManagement />} />
            
            {/* Documents Module */}
            <Route path="/documents" element={<DocumentsPage />} />
            
            {/* Roof Finder */}
            <Route path="/roof-finder" element={<UglyRoofFinderMap />} />
            
            {/* Lead Conversion Workflow */}
            <Route path="/lead-conversion-workflow" element={<LeadConversionWorkflow />} />
            
            {/* Profile */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/user-profile" element={<UserProfile />} />
            
            {/* Modal Routes */}
            <Route path="/add-opportunity" element={<AddOpportunityModal />} />
            <Route path="/add-property" element={<AddPropertyModal />} />
            <Route path="/add-contact" element={<AddContactModal />} />
            <Route path="/create-task" element={<CreateTaskModal />} />
            <Route path="/convert-prospect-modal" element={<ConvertProspectModal />} />
            <Route path="/upload-document-modal" element={<UploadDocumentModal />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;