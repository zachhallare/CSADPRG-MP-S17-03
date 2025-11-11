import {
  formatNumber,
  calculateAverage,
  calculatePercentage
} from '../utils/computeUtils.js';
import { writeCSV } from '../utils/fileUtils.js';
import { getOutputDir } from '../utils/fileUtils.js';
import path from 'path';

/**
 * Generate Report 3: Annual Project Type Cost Overrun Trends
 * Groups by FundingYear and TypeOfWork, computes trends
 * 
 * @param {Array} records - Filtered records (2021-2023)
 * @returns {Array} Report data with formatted values
 */
export function generateReport3(records) {
  // Group by FundingYear and TypeOfWork
  const grouped = {};
  
  records.forEach((record) => {
    const key = `${record.FundingYear}|${record.TypeOfWork}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(record);
  });
  
  const reportData = [];
  const yearTypeData = {};
  
  // Process each group
  Object.keys(grouped).forEach((key) => {
    const groupRecords = grouped[key];
    const [year, typeOfWork] = key.split('|');
    
    const totalProjects = groupRecords.length;
    
    const savings = groupRecords
      .map((r) => r.CostSavings)
      .filter((s) => s !== null && s !== undefined);
    const avgSavings = savings.length > 0 ? calculateAverage(savings) : 0;
    
    // Calculate overrun rate (% of projects with negative savings)
    const overrunCount = savings.filter((s) => s < 0).length;
    const overrunRate = savings.length > 0
      ? calculatePercentage(overrunCount, savings.length)
      : 0;
    
    // Store data for YoY calculation
    if (!yearTypeData[typeOfWork]) {
      yearTypeData[typeOfWork] = {};
    }
    yearTypeData[typeOfWork][year] = avgSavings;
    
    reportData.push({
      FundingYear: parseInt(year),
      TypeOfWork: typeOfWork,
      TotalProjects: totalProjects,
      AvgSavings: avgSavings,
      OverrunRate: overrunRate,
      YoYChange: 0 // Will be calculated next
    });
  });
  
  // Calculate YoY change (baseline 2021)
  reportData.forEach((row) => {
    const typeOfWork = row.TypeOfWork;
    const year = row.FundingYear;
    const baseline2021 = yearTypeData[typeOfWork]?.[2021];
    
    if (year === 2021 || !baseline2021 || baseline2021 === 0) {
      row.YoYChange = 0;
    } else {
      const change = ((row.AvgSavings - baseline2021) / Math.abs(baseline2021)) * 100;
      row.YoYChange = change;
    }
  });
  
  // Sort: ascending by year, descending by AvgSavings
  reportData.sort((a, b) => {
    if (a.FundingYear !== b.FundingYear) {
      return a.FundingYear - b.FundingYear;
    }
    return b.AvgSavings - a.AvgSavings;
  });
  
  // Format for CSV output
  const formattedData = reportData.map((row) => ({
    FundingYear: row.FundingYear,
    TypeOfWork: row.TypeOfWork,
    TotalProjects: row.TotalProjects,
    AvgSavings: formatNumber(row.AvgSavings),
    OverrunRate: formatNumber(row.OverrunRate),
    YoYChange: formatNumber(row.YoYChange)
  }));
  
  return formattedData;
}

/**
 * Write Report 3 to CSV file
 * @param {Array} reportData - Formatted report data
 */
export function writeReport3(reportData) {
  const outputDir = getOutputDir();
  const filePath = path.join(outputDir, 'report3_cost_overrun_trends.csv');
  
  const headers = [
    'FundingYear',
    'TypeOfWork',
    'TotalProjects',
    'AvgSavings',
    'OverrunRate',
    'YoYChange'
  ];
  
  writeCSV(filePath, reportData, headers);
  console.log(`Report 3 written to: ${filePath}`);
  
  return filePath;
}


