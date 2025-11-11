import { groupBy } from '../utils/computeUtils.js';
import {
  formatLargeNumber,
  formatNumber,
  calculateMedian,
  calculateAverage,
  calculatePercentage
} from '../utils/computeUtils.js';
import { writeCSV } from '../utils/fileUtils.js';
import { getOutputDir } from '../utils/fileUtils.js';
import path from 'path';

/**
 * Generate Report 1: Regional Flood Mitigation Efficiency Summary
 * Groups by Region and MainIsland, computes efficiency metrics
 * 
 * @param {Array} records - Filtered records (2021-2023)
 * @returns {Array} Report data with formatted values
 */
export function generateReport1(records) {
  // Group by Region
  const groupedByRegion = groupBy(records, 'Region');
  
  const reportData = [];
  
  Object.keys(groupedByRegion).forEach((region) => {
    const regionRecords = groupedByRegion[region];
    
    if (regionRecords.length === 0) return;
    
    // Get MainIsland (should be same for all records in a region)
    const mainIsland = regionRecords[0].MainIsland || 'Unknown';
    
    // Calculate metrics
    const totalBudget = regionRecords.reduce(
      (sum, r) => sum + r.ApprovedBudgetForContract,
      0
    );
    
    const savings = regionRecords
      .map((r) => r.CostSavings)
      .filter((s) => s !== null && s !== undefined);
    const medianSavings = calculateMedian(savings);
    
    const delays = regionRecords
      .map((r) => r.CompletionDelayDays)
      .filter((d) => d !== null && d !== undefined);
    const avgDelay = delays.length > 0 ? calculateAverage(delays) : 0;
    
    // Calculate percentage of projects with delay > 30 days
    const highDelayCount = delays.filter((d) => d > 30).length;
    const highDelayPct = delays.length > 0
      ? calculatePercentage(highDelayCount, delays.length)
      : 0;
    
    // Calculate Efficiency Score: ((medianSavings / avgDelay) * 100) normalized to 0-100
    let efficiencyScore = 0;
    if (avgDelay > 0) {
      efficiencyScore = (medianSavings / avgDelay) * 100;
      // Normalize to 0-100 range (cap at 100, floor at 0 for negative values)
      efficiencyScore = Math.min(100, Math.max(0, efficiencyScore));
    }
    
    reportData.push({
      Region: region,
      MainIsland: mainIsland,
      TotalBudget: totalBudget,
      MedianSavings: medianSavings,
      AvgDelay: avgDelay,
      HighDelayPct: highDelayPct,
      EfficiencyScore: efficiencyScore
    });
  });
  
  // Sort by EfficiencyScore descending
  reportData.sort((a, b) => b.EfficiencyScore - a.EfficiencyScore);
  
  // Format for CSV output
  const formattedData = reportData.map((row) => ({
    Region: row.Region,
    MainIsland: row.MainIsland,
    TotalBudget: formatLargeNumber(row.TotalBudget),
    MedianSavings: formatNumber(row.MedianSavings),
    AvgDelay: formatNumber(row.AvgDelay),
    HighDelayPct: formatNumber(row.HighDelayPct),
    EfficiencyScore: formatNumber(row.EfficiencyScore)
  }));
  
  return formattedData;
}

/**
 * Write Report 1 to CSV file
 * @param {Array} reportData - Formatted report data
 */
export function writeReport1(reportData) {
  const outputDir = getOutputDir();
  const filePath = path.join(outputDir, 'report1_regional_efficiency.csv');
  
  const headers = [
    'Region',
    'MainIsland',
    'TotalBudget',
    'MedianSavings',
    'AvgDelay',
    'HighDelayPct',
    'EfficiencyScore'
  ];
  
  writeCSV(filePath, reportData, headers);
  console.log(`Report 1 written to: ${filePath}`);
  
  return filePath;
}


