import type { CanvasElement } from '../hooks/useElementData';

/**
 * Get the background color class for an element based on its color
 */
export const getElementColor = (element: CanvasElement): string => {
  const color = element.styleData?.color || '#fbbf24';

  // Convert hex to Tailwind-like classes or use inline styles
  const colorMap: { [key: string]: string } = {
    '#fbbf24': 'bg-yellow-200',
    '#3b82f6': 'bg-blue-200',
    '#10b981': 'bg-green-200',
    '#ec4899': 'bg-pink-200',
    '#8b5cf6': 'bg-purple-200',
    '#f97316': 'bg-orange-200',
    '#ef4444': 'bg-red-200',
    '#6b7280': 'bg-gray-200',
  };

  return colorMap[color] || 'bg-yellow-200';
};

/**
 * Create placeholder color with opacity for elements
 */
export const getPlaceholderColor = (element: CanvasElement): string => {
  const color = element.styleData?.color || '#fbbf24';
  return color + '80'; // Add 50% opacity (80 in hex)
};

/**
 * Get comprehensive color scheme for group elements
 */
export const getGroupColor = (element: CanvasElement) => {
  if (element.type !== 'GROUP') {
    return {
      border: 'border-gray-400',
      bg: 'bg-gray-50 bg-opacity-30',
      selectedBorder: 'border-indigo-500',
      selectedBg: 'bg-indigo-50',
      label: 'bg-gray-200 text-gray-700',
    };
  }

  const color = element.styleData?.color || '#6b7280';

  const colorMap: { [key: string]: any } = {
    '#fbbf24': {
      // yellow
      border: 'border-yellow-400',
      bg: 'bg-yellow-50 bg-opacity-40',
      selectedBorder: 'border-yellow-600',
      selectedBg: 'bg-yellow-100',
      label: 'bg-yellow-200 text-yellow-800',
    },
    '#3b82f6': {
      // blue
      border: 'border-blue-400',
      bg: 'bg-blue-50 bg-opacity-40',
      selectedBorder: 'border-blue-600',
      selectedBg: 'bg-blue-100',
      label: 'bg-blue-200 text-blue-800',
    },
    '#10b981': {
      // green
      border: 'border-green-400',
      bg: 'bg-green-50 bg-opacity-40',
      selectedBorder: 'border-green-600',
      selectedBg: 'bg-green-100',
      label: 'bg-green-200 text-green-800',
    },
    '#ec4899': {
      // pink
      border: 'border-pink-400',
      bg: 'bg-pink-50 bg-opacity-40',
      selectedBorder: 'border-pink-600',
      selectedBg: 'bg-pink-100',
      label: 'bg-pink-200 text-pink-800',
    },
    '#8b5cf6': {
      // purple
      border: 'border-purple-400',
      bg: 'bg-purple-50 bg-opacity-40',
      selectedBorder: 'border-purple-600',
      selectedBg: 'bg-purple-100',
      label: 'bg-purple-200 text-purple-800',
    },
    '#f97316': {
      // orange
      border: 'border-orange-400',
      bg: 'bg-orange-50 bg-opacity-40',
      selectedBorder: 'border-orange-600',
      selectedBg: 'bg-orange-100',
      label: 'bg-orange-200 text-orange-800',
    },
    '#ef4444': {
      // red
      border: 'border-red-400',
      bg: 'bg-red-50 bg-opacity-40',
      selectedBorder: 'border-red-600',
      selectedBg: 'bg-red-100',
      label: 'bg-red-200 text-red-800',
    },
    '#6b7280': {
      // gray (default)
      border: 'border-gray-400',
      bg: 'bg-gray-50 bg-opacity-30',
      selectedBorder: 'border-indigo-500',
      selectedBg: 'bg-indigo-50',
      label: 'bg-gray-200 text-gray-700',
    },
  };

  return colorMap[color] || colorMap['#6b7280'];
};
