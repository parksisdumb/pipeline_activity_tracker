import React from 'react';
import { DollarSign, TrendingUp, Target, BarChart3, AlertCircle } from 'lucide-react';

const PipelineMetrics = ({ metrics = [], totalBidValue = 0, weightedValue = 0, opportunities = [] }) => {
  const getStageColor = (stage) => {
    const colors = {
      'identified': 'text-gray-600 bg-gray-50',
      'qualified': 'text-blue-600 bg-blue-50',
      'proposal_sent': 'text-yellow-600 bg-yellow-50',
      'negotiation': 'text-purple-600 bg-purple-50',
      'won': 'text-green-600 bg-green-50',
      'lost': 'text-red-600 bg-red-50'
    };
    return colors?.[stage] || 'text-gray-600 bg-gray-50';
  };

  const formatValue = (value) => {
    if (!value || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })?.format(Number(value));
  };

  // Calculate metrics from opportunities data as fallback
  const calculatedTotalValue = opportunities?.reduce((sum, opp) => sum + (parseFloat(opp?.bid_value) || 0), 0) || totalBidValue;
  const calculatedWeightedValue = opportunities?.reduce((sum, opp) => {
    const bidValue = parseFloat(opp?.bid_value) || 0;
    const probability = parseInt(opp?.probability) || 0;
    return sum + (bidValue * probability) / 100;
  }, 0) || weightedValue;

  // Calculate win rate from metrics or opportunities
  const wonMetric = metrics?.find(m => m?.stage === 'won');
  const lostMetric = metrics?.find(m => m?.stage === 'lost');
  const wonCount = wonMetric?.count_opportunities || opportunities?.filter(o => o?.stage === 'won')?.length || 0;
  const lostCount = lostMetric?.count_opportunities || opportunities?.filter(o => o?.stage === 'lost')?.length || 0;
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

  // Calculate total opportunities count
  const totalOpportunities = metrics?.reduce((sum, m) => sum + (parseInt(m?.count_opportunities) || 0), 0) || 
                            opportunities?.length || 0;

  // Check if we have data to display
  const hasMetricsData = metrics?.length > 0;
  const hasOpportunitiesData = opportunities?.length > 0;
  const hasAnyData = hasMetricsData || hasOpportunitiesData;

  return (
    <div className="mt-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Pipeline Value</p>
              <p className="text-lg font-semibold text-gray-900">{formatValue(calculatedTotalValue)}</p>
              {calculatedTotalValue === 0 && hasAnyData && (
                <p className="text-xs text-gray-400 mt-1">No bid values entered</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Weighted Value</p>
              <p className="text-lg font-semibold text-gray-900">{formatValue(calculatedWeightedValue)}</p>
              {calculatedWeightedValue === 0 && calculatedTotalValue > 0 && (
                <p className="text-xs text-gray-400 mt-1">No probabilities set</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Win Rate</p>
              <p className="text-lg font-semibold text-gray-900">{winRate}%</p>
              {totalClosed === 0 && hasAnyData && (
                <p className="text-xs text-gray-400 mt-1">No closed opportunities</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Opportunities</p>
              <p className="text-lg font-semibold text-gray-900">{totalOpportunities}</p>
            </div>
          </div>
        </div>
      </div>
      {/* Pipeline Stage Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Pipeline by Stage</h3>
        
        {!hasAnyData ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No pipeline data available</p>
            <p className="text-xs text-gray-400 mt-1">Create your first opportunity to see pipeline metrics</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {hasMetricsData ? (
              metrics?.map((metric) => (
                <div 
                  key={metric?.stage}
                  className={`p-3 rounded-lg border ${getStageColor(metric?.stage)}`}
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {metric?.count_opportunities || 0}
                    </div>
                    <div className="text-xs font-medium mb-1">
                      {metric?.label || metric?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
                    </div>
                    <div className="text-xs">
                      {formatValue(metric?.total_value || 0)}
                    </div>
                    {(metric?.avg_probability > 0) && (
                      <div className="text-xs mt-1 opacity-75">
                        {metric?.avg_probability}% avg
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // Fallback: Calculate stages from opportunities data
              (['identified', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost']?.map((stage) => {
                const stageOpportunities = opportunities?.filter(o => o?.stage === stage) || [];
                const stageValue = stageOpportunities?.reduce((sum, opp) => sum + (parseFloat(opp?.bid_value) || 0), 0);
                const stageAvgProbability = stageOpportunities?.length > 0 
                  ? Math.round(stageOpportunities?.reduce((sum, opp) => sum + (parseInt(opp?.probability) || 0), 0) / stageOpportunities?.length)
                  : 0;

                return (
                  <div 
                    key={stage}
                    className={`p-3 rounded-lg border ${getStageColor(stage)}`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {stageOpportunities?.length || 0}
                      </div>
                      <div className="text-xs font-medium mb-1">
                        {stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
                      </div>
                      <div className="text-xs">
                        {formatValue(stageValue)}
                      </div>
                      {stageAvgProbability > 0 && (
                        <div className="text-xs mt-1 opacity-75">
                          {stageAvgProbability}% avg
                        </div>
                      )}
                    </div>
                  </div>
                );
              }))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineMetrics;