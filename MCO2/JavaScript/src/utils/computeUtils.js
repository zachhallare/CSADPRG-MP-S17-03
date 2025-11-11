import _ from 'lodash';

/**
 * Format number with commas and 2 decimal places
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  
  // Round to 2 decimal places
  const rounded = Math.round(value * 100) / 100;
  
  // Handle negative numbers
  const isNegative = rounded < 0;
  const absValue = Math.abs(rounded);
  
  // Split into integer and decimal parts
  const parts = absValue.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00';
  const paddedDecimal = decimalPart.padEnd(2, '0').substring(0, 2);
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Add negative sign if needed
  const sign = isNegative ? '-' : '';
  
  return `${sign}${formattedInteger}.${paddedDecimal}`;
}

/**
 * Format large number (for budget/cost values)
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
export function formatLargeNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  // Round to nearest integer
  const rounded = Math.round(value);
  
  // Add commas
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Calculate median of an array
 * @param {Array<number>} values - Array of numbers
 * @returns {number} Median value
 */
export function calculateMedian(values) {
  if (!values || values.length === 0) {
    return 0;
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

/**
 * Calculate average of an array
 * @param {Array<number>} values - Array of numbers
 * @returns {number} Average value
 */
export function calculateAverage(values) {
  if (!values || values.length === 0) {
    return 0;
  }
  
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export function calculatePercentage(part, total) {
  if (total === 0) {
    return 0;
  }
  return (part / total) * 100;
}

/**
 * Group records by a key
 * @param {Array} records - Array of records
 * @param {string} key - Key to group by
 * @returns {Object} Grouped records
 */
export function groupBy(records, key) {
  return _.groupBy(records, key);
}

/**
 * Group records by multiple keys
 * @param {Array} records - Array of records
 * @param {Array<string>} keys - Keys to group by
 * @returns {Object} Grouped records
 */
export function groupByMultiple(records, keys) {
  return _.groupBy(records, (record) => {
    return keys.map((key) => record[key]).join('|');
  });
}

/**
 * Normalize value to 0-100 range
 * @param {number} value - Value to normalize
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Normalized value (0-100)
 */
export function normalizeTo100(value, min, max) {
  if (max === min) {
    return 50; // Default to middle if no range
  }
  
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}


