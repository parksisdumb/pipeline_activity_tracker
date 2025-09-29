import React, { useState } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { prospectsService } from '../../../services/prospectsService';

const ImportProspectsModal = ({ isOpen, onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);

  const downloadTemplate = () => {
    const csvContent = [
      'name,domain,phone,website,address,city,state,zip_code,company_type,employee_count,property_count_estimate,sqft_estimate,building_types,source,notes,tags',
      'Example Company Inc,example.com,(555) 123-4567,https://example.com,"123 Main St","Los Angeles",CA,90210,"Property Management",50,25,150000,"Commercial Office;Retail","Web Research","Great potential prospect","high-value;commercial"'
    ]?.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL?.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prospects_import_template.csv';
    document.body?.appendChild(link);
    link?.click();
    document.body?.removeChild(link);
    window.URL?.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const selectedFile = e?.target?.files?.[0];
    if (selectedFile && selectedFile?.type === 'text/csv') {
      setFile(selectedFile);
      setResults(null);
      setErrors([]);
    } else {
      alert('Please select a CSV file');
    }
  };

  const parseCSV = (text) => {
    const lines = text?.split('\n')?.filter(line => line?.trim());
    if (lines?.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines?.[0]?.split(',')?.map(h => h?.trim()?.replace(/"/g, ''));
    const prospects = [];
    const parseErrors = [];

    for (let i = 1; i < lines?.length; i++) {
      try {
        const values = lines?.[i]?.split(',')?.map(v => v?.trim()?.replace(/"/g, ''));
        const prospect = {};

        headers?.forEach((header, index) => {
          const value = values?.[index] || '';
          
          switch (header) {
            case 'name':
              prospect.name = value;
              break;
            case 'domain':
              prospect.domain = value || null;
              break;
            case 'phone':
              prospect.phone = value || null;
              break;
            case 'website':
              prospect.website = value || null;
              break;
            case 'address':
              prospect.address = value || null;
              break;
            case 'city':
              prospect.city = value || null;
              break;
            case 'state':
              prospect.state = value || null;
              break;
            case 'zip_code':
              prospect.zip_code = value || null;
              break;
            case 'company_type':
              prospect.company_type = value || null;
              break;
            case 'employee_count':
              prospect.employee_count = value ? parseInt(value) : null;
              break;
            case 'property_count_estimate':
              prospect.property_count_estimate = value ? parseInt(value) : null;
              break;
            case 'sqft_estimate':
              prospect.sqft_estimate = value ? parseInt(value) : null;
              break;
            case 'building_types':
              prospect.building_types = value ? value?.split(';')?.filter(t => t?.trim()) : [];
              break;
            case 'source':
              prospect.source = value || null;
              break;
            case 'notes':
              prospect.notes = value || null;
              break;
            case 'tags':
              prospect.tags = value ? value?.split(';')?.filter(t => t?.trim()) : [];
              break;
            default:
              // Ignore unknown columns
              break;
          }
        });

        // Validation
        if (!prospect?.name) {
          parseErrors?.push(`Row ${i + 1}: Name is required`);
          continue;
        }

        // Calculate basic ICP score
        let icpScore = 50; // Base score
        if (prospect?.employee_count > 50) icpScore += 15;
        if (prospect?.property_count_estimate > 10) icpScore += 20;
        if (prospect?.sqft_estimate > 100000) icpScore += 15;
        prospect.icp_fit_score = Math.min(100, icpScore);

        prospects?.push(prospect);
      } catch (error) {
        parseErrors?.push(`Row ${i + 1}: ${error?.message}`);
      }
    }

    return { prospects, errors: parseErrors };
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setErrors([]);

    try {
      const text = await file?.text();
      const { prospects, errors: parseErrors } = parseCSV(text);
      
      if (parseErrors?.length > 0) {
        setErrors(parseErrors);
        setImporting(false);
        return;
      }

      let successCount = 0;
      let failureCount = 0;
      const importErrors = [];

      // Import prospects one by one to handle individual errors
      for (let i = 0; i < prospects?.length; i++) {
        try {
          const result = await prospectsService?.createProspect(prospects?.[i]);
          if (result?.error) {
            failureCount++;
            importErrors?.push(`${prospects?.[i]?.name}: ${result?.error}`);
          } else {
            successCount++;
          }
        } catch (error) {
          failureCount++;
          importErrors?.push(`${prospects?.[i]?.name}: ${error?.message}`);
        }
      }

      setResults({
        total: prospects?.length,
        success: successCount,
        failure: failureCount,
        errors: importErrors
      });

      if (successCount > 0) {
        // Call completion callback after a short delay to show results
        setTimeout(() => {
          onImportComplete?.();
        }, 2000);
      }
    } catch (error) {
      setErrors([`File processing error: ${error?.message}`]);
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Import Prospects</h2>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Import Instructions</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload a CSV file with prospect data</li>
              <li>• Required column: <strong>name</strong></li>
              <li>• Optional columns: domain, phone, website, address, city, state, zip_code, company_type, employee_count, property_count_estimate, sqft_estimate, building_types, source, notes, tags</li>
              <li>• Building types and tags should be separated by semicolons (;)</li>
              <li>• Download the template below for the correct format</li>
            </ul>
          </div>

          {/* Download Template */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="mb-2">
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Choose CSV file
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-sm text-gray-500"> or drag and drop</span>
              </div>
              {file && (
                <p className="text-sm text-gray-600">Selected: {file?.name}</p>
              )}
            </div>
          </div>

          {/* Errors */}
          {errors?.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-2">Import Errors</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errors?.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-2">Import Results</h3>
                  <p className="text-sm text-green-700 mb-2">
                    Successfully imported {results?.success} of {results?.total} prospects
                  </p>
                  {results?.failure > 0 && (
                    <div>
                      <p className="text-sm text-red-700 mb-1">{results?.failure} failed:</p>
                      <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        {results?.errors?.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              {results ? 'Close' : 'Cancel'}
            </Button>
            {!results && (
              <Button
                onClick={handleImport}
                disabled={!file || importing}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {importing ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-pulse" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Prospects
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportProspectsModal;