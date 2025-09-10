import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Icon from '../../../components/AppIcon';

const GoalProgressChart = ({ userGoals, actualProgress }) => {
  // Prepare data for the chart
  const chartData = userGoals?.map(goal => ({
    name: goal?.goal_type?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase()),
    target: goal?.target_value,
    actual: actualProgress?.[goal?.goal_type] || 0,
    completion: Math.min(((actualProgress?.[goal?.goal_type] || 0) / goal?.target_value) * 100, 100),
    goalType: goal?.goal_type
  })) || [];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      const data = payload?.[0]?.payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Actual:</span>
              <span className="font-semibold text-primary">{data?.actual}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Target:</span>
              <span className="font-semibold text-foreground">{data?.target}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <span className={`font-semibold ${
                data?.completion >= 100 ? 'text-success' :
                data?.completion >= 75 ? 'text-warning' :
                data?.completion >= 50 ? 'text-info': 'text-muted-foreground'
              }`}>
                {Math.round(data?.completion)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get bar color based on completion
  const getBarColor = (completion) => {
    if (completion >= 100) return '#22c55e'; // success
    if (completion >= 75) return '#f59e0b'; // warning
    if (completion >= 50) return '#3b82f6'; // info
    return '#6b7280'; // muted
  };

  if (!chartData?.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center">
          <Icon name="BarChart3" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Data Available</h3>
          <p className="text-muted-foreground">
            No goals found for the selected week to display in chart view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Progress Overview</h2>
          <p className="text-sm text-muted-foreground">
            Visual comparison of your targets vs actual performance
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span className="text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted border rounded"></div>
            <span className="text-muted-foreground">Target</span>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            barGap={10}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Target bars (background) */}
            <Bar 
              dataKey="target" 
              fill="hsl(var(--muted))" 
              stroke="hsl(var(--border))"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
            />
            
            {/* Actual bars (foreground) */}
            <Bar 
              dataKey="actual" 
              radius={[4, 4, 0, 0]}
            >
              {chartData?.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry?.completion)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="Target" size={20} className="text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Target</p>
              <p className="text-xl font-bold text-foreground">
                {Math.round(chartData?.reduce((sum, item) => sum + item?.target, 0) / chartData?.length)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="TrendingUp" size={20} className="text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Actual</p>
              <p className="text-xl font-bold text-success">
                {Math.round(chartData?.reduce((sum, item) => sum + item?.actual, 0) / chartData?.length)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="Percent" size={20} className="text-info" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Completion</p>
              <p className="text-xl font-bold text-info">
                {Math.round(chartData?.reduce((sum, item) => sum + item?.completion, 0) / chartData?.length)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="CheckCircle" size={20} className="text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Goals Met</p>
              <p className="text-xl font-bold text-success">
                {chartData?.filter(item => item?.completion >= 100)?.length}/{chartData?.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalProgressChart;