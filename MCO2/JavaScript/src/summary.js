import { calculateAverage } from './utils/computeUtils.js';
import { writeJSON, getOutputDir } from './utils/fileUtils.js';
import path from 'path';

/**
 * Generate summary JSON with aggregate statistics
 * 
 * @param {Array} records - Filtered records (2021-2023)
 * @returns {Object} Summary statistics
 */
export function generateSummary(records) {
  // Total number of projects
  const totalProjects = records.length;
  
  // Total number of unique contractors
  const uniqueContractors = new Set(
    records.map((r) => r.Contractor).filter((c) => c && c !== 'Unknown')
  );
  const totalContractors = uniqueContractors.size;
  
  // Total number of unique provinces
  const uniqueProvinces = new Set(
    records.map((r) => r.Province).filter((p) => p && p !== '')
  );
  const totalProvinces = uniqueProvinces.size;
  
  // Global average delay
  const delays = records
    .map((r) => r.CompletionDelayDays)
    .filter((d) => d !== null && d !== undefined);
  const globalAvgDelay = delays.length > 0 ? calculateAverage(delays) : 0;
  
  // Total savings (sum of CostSavings)
  const totalSavings = records.reduce(
    (sum, r) => sum + (r.CostSavings || 0),
    0
  );
  
  return {
    total_projects: totalProjects,
    total_contractors: totalContractors,
    total_provinces: totalProvinces,
    global_avg_delay: Math.round(globalAvgDelay * 10) / 10, // Round to 1 decimal
    total_savings: Math.round(totalSavings) // Round to integer
  };
}

/**
 * Write summary to JSON file
 * @param {Object} summaryData - Summary statistics
 */
export function writeSummary(summaryData) {
  const outputDir = getOutputDir();
  const filePath = path.join(outputDir, 'summary.json');
  
  writeJSON(filePath, summaryData);
  console.log(`Summary written to: ${filePath}`);
  
  return filePath;
}


