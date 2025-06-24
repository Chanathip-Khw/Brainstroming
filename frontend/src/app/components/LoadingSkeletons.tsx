import React from 'react';

export const CanvasLoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading Canvas...</p>
    </div>
  </div>
);

export const DashboardLoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-8">
    <div className="max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div className="h-8 bg-gray-300 rounded w-64 animate-pulse"></div>
        <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
      </div>
      
      {/* Teams skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="h-6 bg-gray-300 rounded w-48 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2].map((j) => (
                <div key={j} className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const AuthLoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
); 