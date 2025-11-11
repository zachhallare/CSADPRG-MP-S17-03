import { groupBy } from '../utils/computeUtils.js';
import {
  formatLargeNumber,
  formatNumber,
  calculateAverage
} from '../utils/computeUtils.js';
import { writeCSV } from '../utils/fileUtils.js';
import { getOutputDir } from '../utils/fileUtils.js';
import path from 'path';

/**
 * Generate Report 2: Top Contractors Performance Ranking
 * Ranks top 15 contractors by total ContractCost (only >=5 projects)
 * 
 * @param {Array} records - Filtered records (2021-2023)
 * @returns {Array} Report data with formatted values
 */
export function generateReport2(records) {
  // Group by Contractor
  const groupedByContractor = groupBy(records, 'Contractor');
  
  const contractorStats = [];
  
  Object.keys(groupedByContractor).forEach((contractor) => {
    const contractorRecords = groupedByContractor[contractor];
    
    // Filter out contractors with less than 5 projects
    if (contractorRecords.length < 5) {
      return;
    }
    
    // Calculate metrics
    const totalCost = contractorRecords.reduce(
      (sum, r) => sum + r.ContractCost,
      0
    );
    
    const numProjects = contractorRecords.length;
    
    const delays = contractorRecords
      .map((r) => r.CompletionDelayDays)
      .filter((d) => d !== null && d !== undefined);
    const avgDelay = delays.length > 0 ? calculateAverage(delays) : 0;
    
    const totalSavings = contractorRecords.reduce(
      (sum, r) => sum + (r.CostSavings || 0),
      0
    );
    
    // Calculate Reliability Index: (1 - (avgDelay / 90)) * (totalSavings / totalCost) * 100
    // Capped at 100
    let reliabilityIndex = 0;
    if (totalCost > 0) {
      const delayFactor = Math.max(0, 1 - (avgDelay / 90));
      const savingsRatio = totalSavings / totalCost;
      reliabilityIndex = delayFactor * savingsRatio * 100;
      reliabilityIndex = Math.min(100, Math.max(0, reliabilityIndex));
    }
    
    // Determine risk flag
    const riskFlag = reliabilityIndex < 50 ? 'High Risk' : 'Low Risk';
    
    contractorStats.push({
      Contractor: contractor,
      TotalCost: totalCost,
      NumProjects: numProjects,
      AvgDelay: avgDelay,
      TotalSavings: totalSavings,
      ReliabilityIndex: reliabilityIndex,
      RiskFlag: riskFlag
    });
  });
  
  // Sort by TotalCost descending
  contractorStats.sort((a, b) => b.TotalCost - a.TotalCost);
  
  // Take top 15
  const top15 = contractorStats.slice(0, 15);
  
  // Format for CSV output
  const formattedData = top15.map((row, index) => ({
    Rank: index + 1,
    Contractor: row.Contractor,
    TotalCost: formatLargeNumber(row.TotalCost),
    NumProjects: row.NumProjects,
    AvgDelay: formatNumber(row.AvgDelay),
    TotalSavings: formatLargeNumber(row.TotalSavings),
    ReliabilityIndex: formatNumber(row.ReliabilityIndex),
    RiskFlag: row.RiskFlag
  }));
  
  return formattedData;
}

/**
 * Write Report 2 to CSV file
 * @param {Array} reportData - Formatted report data
 */
export function writeReport2(reportData) {
  const outputDir = getOutputDir();
  const filePath = path.join(outputDir, 'report2_contractor_ranking.csv');
  
  const headers = [
    'Rank',
    'Contractor',
    'TotalCost',
    'NumProjects',
    'AvgDelay',
    'TotalSavings',
    'ReliabilityIndex',
    'RiskFlag'
  ];
  
  writeCSV(filePath, reportData, headers);
  console.log(`Report 2 written to: ${filePath}`);
  
  return filePath;
}


