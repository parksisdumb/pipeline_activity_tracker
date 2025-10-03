import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';


// Import components
import Modal from '../../components/ui/Modal';
import LeadValidationStep from './components/LeadValidationStep';
import ConversionPathStep from './components/ConversionPathStep';
import AccountCreationStep from './components/AccountCreationStep';
import ContactCreationStep from './components/ContactCreationStep';
import TaskTemplateStep from './components/TaskTemplateStep';
import ProgressIndicator from './components/ProgressIndicator';
import ConversionSuccess from './components/ConversionSuccess';

// Import services
import { prospectsService } from '../../services/prospectsService';
import { accountsService } from '../../services/accountsService';
import { contactsService } from '../../services/contactsService';
import { propertiesService } from '../../services/propertiesService';
import { tasksService } from '../../services/tasksService';

const WORKFLOW_STEPS = {
  LEAD_VALIDATION: 'lead_validation',
  CONVERSION_PATH: 'conversion_path',
  ACCOUNT_CREATION: 'account_creation',
  CONTACT_CREATION: 'contact_creation',
  TASK_TEMPLATE: 'task_template',
  SUCCESS: 'success'
};

const CONVERSION_PATHS = {
  NEW_PROSPECT: 'new_prospect',
  EXISTING_ACCOUNT: 'existing_account',
  NEW_PROPERTY: 'new_property'
};

const LeadConversionWorkflow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Get lead ID from URL params
  const leadId = searchParams?.get('leadId') || searchParams?.get('prospectId');
  
  // State management
  const [isOpen, setIsOpen] = useState(!!leadId);
  const [currentStep, setCurrentStep] = useState(WORKFLOW_STEPS?.LEAD_VALIDATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Workflow data
  const [leadData, setLeadData] = useState(null);
  const [conversionPath, setConversionPath] = useState('');
  const [duplicateAccounts, setDuplicateAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountData, setAccountData] = useState({});
  const [propertyData, setPropertyData] = useState({});
  const [contactsData, setContactsData] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [conversionResult, setConversionResult] = useState(null);

  // Load lead data on mount
  useEffect(() => {
    if (leadId && isOpen) {
      loadLeadData();
    }
  }, [leadId, isOpen]);

  const loadLeadData = async () => {
    if (!leadId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await prospectsService?.getProspect(leadId);
      
      if (result?.error) {
        setError(`Failed to load lead: ${result?.error}`);
        return;
      }
      
      if (!result?.data) {
        setError('Lead not found or access denied');
        return;
      }
      
      setLeadData(result?.data);
      
      // Check for potential duplicates
      await checkForDuplicates(result?.data);
      
    } catch (err) {
      console.error('Error loading lead data:', err);
      setError('Failed to load lead information');
    } finally {
      setLoading(false);
    }
  };

  const checkForDuplicates = async (lead) => {
    if (!lead) return;
    
    try {
      const result = await prospectsService?.findDuplicateAccounts({
        name: lead?.name,
        domain: lead?.domain,
        phone: lead?.phone,
        city: lead?.city,
        state: lead?.state
      });
      
      if (result?.data && Array.isArray(result?.data)) {
        setDuplicateAccounts(result?.data);
      }
    } catch (err) {
      console.error('Error checking duplicates:', err);
      // Don't show error for duplicate check failures
    }
  };

  const handleStepComplete = (stepData) => {
    switch (currentStep) {
      case WORKFLOW_STEPS?.LEAD_VALIDATION:
        if (stepData?.updatedLead) {
          setLeadData(stepData?.updatedLead);
        }
        setCurrentStep(WORKFLOW_STEPS?.CONVERSION_PATH);
        break;
        
      case WORKFLOW_STEPS?.CONVERSION_PATH:
        setConversionPath(stepData?.path);
        setSelectedAccount(stepData?.selectedAccount);
        
        if (stepData?.path === CONVERSION_PATHS?.EXISTING_ACCOUNT && stepData?.selectedAccount) {
          setCurrentStep(WORKFLOW_STEPS?.CONTACT_CREATION);
        } else {
          setCurrentStep(WORKFLOW_STEPS?.ACCOUNT_CREATION);
        }
        break;
        
      case WORKFLOW_STEPS?.ACCOUNT_CREATION:
        setAccountData(stepData?.accountData);
        setPropertyData(stepData?.propertyData);
        setCurrentStep(WORKFLOW_STEPS?.CONTACT_CREATION);
        break;
        
      case WORKFLOW_STEPS?.CONTACT_CREATION:
        setContactsData(stepData?.contacts || []);
        setCurrentStep(WORKFLOW_STEPS?.TASK_TEMPLATE);
        break;
        
      case WORKFLOW_STEPS?.TASK_TEMPLATE:
        setTaskTemplates(stepData?.templates || []);
        handleConversion();
        break;
    }
  };

  const handleConversion = async () => {
    if (!leadData) return;
    
    setLoading(true);
    setError('');
    
    try {
      let accountId = selectedAccount?.id;
      
      // Step 1: Create or link to account
      if (conversionPath === CONVERSION_PATHS?.NEW_PROSPECT || conversionPath === CONVERSION_PATHS?.NEW_PROPERTY) {
        // Create new account
        const accountResult = await accountsService?.createAccount({
          ...accountData,
          name: accountData?.name || leadData?.name,
          company_type: accountData?.company_type || leadData?.company_type || 'Property Management',
          phone: accountData?.phone || leadData?.phone,
          website: accountData?.website || leadData?.website,
          address: accountData?.address || leadData?.address,
          city: accountData?.city || leadData?.city,
          state: accountData?.state || leadData?.state,
          zip_code: accountData?.zip_code || leadData?.zip_code,
          notes: `Converted from prospect: ${leadData?.name}${accountData?.notes ? `. ${accountData?.notes}` : ''}`
        });
        
        if (accountResult?.error) {
          setError(`Failed to create account: ${accountResult?.error}`);
          return;
        }
        
        accountId = accountResult?.data?.id;
      }
      
      // Step 2: Create property if needed
      let propertyId = null;
      if (conversionPath === CONVERSION_PATHS?.NEW_PROPERTY && propertyData?.name) {
        const propertyResult = await propertiesService?.createProperty({
          ...propertyData,
          account_id: accountId,
          name: propertyData?.name,
          address: propertyData?.address || leadData?.address,
          city: propertyData?.city || leadData?.city,
          state: propertyData?.state || leadData?.state,
          zip_code: propertyData?.zip_code || leadData?.zip_code
        });
        
        if (propertyResult?.success && propertyResult?.data) {
          propertyId = propertyResult?.data?.id;
        }
      }
      
      // Step 3: Create contacts
      const createdContacts = [];
      for (const contact of contactsData) {
        const contactResult = await contactsService?.createContact({
          ...contact,
          account_id: accountId,
          property_id: propertyId
        });
        
        if (contactResult?.success && contactResult?.data) {
          createdContacts?.push(contactResult?.data);
        }
      }
      
      // Step 4: Convert prospect
      const conversionResult = await prospectsService?.convertToAccount(
        leadId,
        conversionPath === CONVERSION_PATHS?.EXISTING_ACCOUNT ? accountId : null
      );
      
      if (conversionResult?.error) {
        setError(`Conversion failed: ${conversionResult?.error}`);
        return;
      }
      
      // Step 5: Create tasks from templates
      const createdTasks = [];
      for (const template of taskTemplates) {
        const taskResult = await tasksService?.createTask({
          title: template?.title,
          description: template?.description,
          category: template?.category || 'other',
          priority: template?.priority || 'medium',
          due_date: template?.due_date,
          account_id: accountId,
          property_id: propertyId,
          contact_id: createdContacts?.[0]?.id,
          prospect_id: leadId
        });
        
        if (taskResult?.success && taskResult?.data) {
          createdTasks?.push(taskResult?.data);
        }
      }
      
      // Success!
      setConversionResult({
        success: true,
        accountId,
        propertyId,
        contactsCount: createdContacts?.length,
        tasksCount: createdTasks?.length,
        conversionType: conversionPath,
        message: conversionResult?.data?.message || 'Lead successfully converted!'
      });
      
      setCurrentStep(WORKFLOW_STEPS?.SUCCESS);
      
    } catch (err) {
      console.error('Conversion error:', err);
      setError('An unexpected error occurred during conversion');
    } finally {
      setLoading(false);
    }
  };

  const handleStepBack = () => {
    switch (currentStep) {
      case WORKFLOW_STEPS?.CONVERSION_PATH:
        setCurrentStep(WORKFLOW_STEPS?.LEAD_VALIDATION);
        break;
      case WORKFLOW_STEPS?.ACCOUNT_CREATION:
        setCurrentStep(WORKFLOW_STEPS?.CONVERSION_PATH);
        break;
      case WORKFLOW_STEPS?.CONTACT_CREATION:
        if (conversionPath === CONVERSION_PATHS?.EXISTING_ACCOUNT) {
          setCurrentStep(WORKFLOW_STEPS?.CONVERSION_PATH);
        } else {
          setCurrentStep(WORKFLOW_STEPS?.ACCOUNT_CREATION);
        }
        break;
      case WORKFLOW_STEPS?.TASK_TEMPLATE:
        setCurrentStep(WORKFLOW_STEPS?.CONTACT_CREATION);
        break;
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Clear URL params and navigate back
    navigate(-1);
  };

  const handleSuccess = () => {
    if (conversionResult?.accountId) {
      // Navigate to the created account
      navigate(`/account-details/${conversionResult?.accountId}`);
    } else {
      // Navigate to accounts list
      navigate('/accounts');
    }
  };

  // Don't render if no leadId or not authenticated
  if (!leadId || !user) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Lead Conversion Workflow"
      size="xl"
      className="lead-conversion-workflow"
      closeOnOverlayClick={false}
    >
      <div className="flex flex-col h-full max-h-[80vh] bg-background">
        {/* Progress Indicator */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border">
          <ProgressIndicator 
            currentStep={currentStep}
            steps={WORKFLOW_STEPS}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
          
          {!loading && !error && (
            <>
              {currentStep === WORKFLOW_STEPS?.LEAD_VALIDATION && (
                <LeadValidationStep
                  leadData={leadData}
                  duplicateAccounts={duplicateAccounts}
                  onComplete={handleStepComplete}
                  onError={setError}
                />
              )}
              
              {currentStep === WORKFLOW_STEPS?.CONVERSION_PATH && (
                <ConversionPathStep
                  leadData={leadData}
                  duplicateAccounts={duplicateAccounts}
                  onComplete={handleStepComplete}
                  onBack={handleStepBack}
                />
              )}
              
              {currentStep === WORKFLOW_STEPS?.ACCOUNT_CREATION && (
                <AccountCreationStep
                  leadData={leadData}
                  conversionPath={conversionPath}
                  onComplete={handleStepComplete}
                  onBack={handleStepBack}
                />
              )}
              
              {currentStep === WORKFLOW_STEPS?.CONTACT_CREATION && (
                <ContactCreationStep
                  leadData={leadData}
                  selectedAccount={selectedAccount}
                  conversionPath={conversionPath}
                  onComplete={handleStepComplete}
                  onBack={handleStepBack}
                />
              )}
              
              {currentStep === WORKFLOW_STEPS?.TASK_TEMPLATE && (
                <TaskTemplateStep
                  leadData={leadData}
                  onComplete={handleStepComplete}
                  onBack={handleStepBack}
                />
              )}
              
              {currentStep === WORKFLOW_STEPS?.SUCCESS && (
                <ConversionSuccess
                  result={conversionResult}
                  leadData={leadData}
                  onComplete={handleSuccess}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LeadConversionWorkflow;