import React from 'react';

/**
 * Skeleton loader for table components
 * @param {number} rows - Number of rows to show
 * @param {number} cols - Number of columns to show
 * @param {boolean} showHeader - Show table header skeleton
 */
export default function SkeletonTable({ 
  rows = 5, 
  cols = 4,
  showHeader = true 
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        {showHeader && (
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: cols }).map((_, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="animate-pulse">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  <div
                    className={`h-4 bg-gray-200 rounded ${
                      colIndex === 0 ? 'w-32' : colIndex === cols - 1 ? 'w-16' : 'w-24'
                    }`}
                  ></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

