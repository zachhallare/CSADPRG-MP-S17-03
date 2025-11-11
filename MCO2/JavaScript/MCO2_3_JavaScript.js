import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import dayjs from 'dayjs';
import _ from 'lodash';

// ============================================================================
// SETUP AND CONFIGURATION
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global data storage
let processedData = null;
let rawRecords = null;

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ============================================================================
// UTILITY FUNCTIONS - FILE OPERATIONS
// ============================================================================

// Directory constants
const DIRS = {
  data: path.join(__dirname, 'data'),
  output: path.join(__dirname, 'output')
};

/**
 * Ensure directory exists for a file path
 */
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Find CSV file in data directory
 */
function findCSVFile() {
  const filePath = path.join(DIRS.data, 'dpwh_flood_control_projects.csv');
  
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  
  throw new Error('CSV file not found: dpwh_flood_control_projects.csv');
}

/**
 * Read CSV file and parse it into an array of objects
 */
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Write data array to CSV file
 */
function writeCSV(filePath, data, headers) {
  ensureDir(filePath);

  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const stringValue = String(row[header] ?? '');
        
        if (stringValue.match(/[,"\n]/)) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];

  fs.writeFileSync(filePath, csvContent.join('\n'), 'utf8');
}

/**
 * Write JSON data to file
 */
function writeJSON(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ============================================================================
// UTILITY FUNCTIONS - VALIDATION
// ============================================================================

/**
 * Validate and parse a date string
 */
function validateDate(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') {
    return null;
  }
  
  const parsed = dayjs(dateStr);
  return parsed.isValid() ? parsed : null;
}

/**
 * Validate and parse a number
 */
function validateNumber(value) {
  if (value === null || value === undefined || value === '' || value === 'N/A') {
    return null;
  }
  
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return !isNaN(parsed) ? parsed : null;
}

/**
 * Validate FundingYear is between 2021-2023
 */
function isValidYear(year) {
  const yearNum = typeof year === 'string' ? parseInt(year) : year;
  return yearNum >= 2021 && yearNum <= 2023;
}

/**
 * Validate a record has required fields
 */
function validateRecord(record) {
  const errors = [];
  
  if (!record.Region || record.Region.trim() === '') {
    errors.push('Missing Region');
  }
  
  if (!record.MainIsland || record.MainIsland.trim() === '') {
    errors.push('Missing MainIsland');
  }
  
  if (!record.FundingYear || !isValidYear(record.FundingYear)) {
    errors.push(`Invalid FundingYear: ${record.FundingYear}`);
  }
  
  if (!record.ApprovedBudgetForContract) {
    errors.push('Missing ApprovedBudgetForContract');
  }
  
  if (!record.ContractCost) {
    errors.push('Missing ContractCost');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Clean and validate a record, returning cleaned version
 */
function cleanRecord(record) {
  const validation = validateRecord(record);
  
  if (!validation.isValid) {
    return null;
  }
  
  const approvedBudget = validateNumber(record.ApprovedBudgetForContract);
  const contractCost = validateNumber(record.ContractCost);
  
  if (approvedBudget === null || contractCost === null) {
    return null;
  }
  
  const startDate = validateDate(record.StartDate);
  const completionDate = validateDate(record.ActualCompletionDate);
  const latitude = validateNumber(record.ProjectLatitude);
  const longitude = validateNumber(record.ProjectLongitude);
  
  return {
    ...record,
    FundingYear: parseInt(record.FundingYear),
    ApprovedBudgetForContract: approvedBudget,
    ContractCost: contractCost,
    StartDate: startDate,
    ActualCompletionDate: completionDate,
    ProjectLatitude: latitude,
    ProjectLongitude: longitude,
    Province: record.Province || '',
    Contractor: record.Contractor || 'Unknown',
    TypeOfWork: record.TypeOfWork || 'Unknown'
  };
}

// ============================================================================
// UTILITY FUNCTIONS - TRANSFORMATION
// ============================================================================

/**
 * Calculate cost savings (ApprovedBudgetForContract - ContractCost)
 */
function calculateCostSavings(approvedBudget, contractCost) {
  return approvedBudget - contractCost;
}

/**
 * Calculate completion delay in days
 */
function calculateCompletionDelay(startDate, completionDate) {
  if (!startDate || !completionDate) {
    return null;
  }
  
  return completionDate.diff(startDate, 'day');
}

/**
 * Add derived fields to a record
 */
function addDerivedFields(record) {
  const costSavings = calculateCostSavings(
    record.ApprovedBudgetForContract,
    record.ContractCost
  );
  
  const completionDelay = calculateCompletionDelay(
    record.StartDate,
    record.ActualCompletionDate
  );
  
  return {
    ...record,
    CostSavings: costSavings,
    CompletionDelayDays: completionDelay
  };
}

/**
 * Impute missing coordinates using province average
 */
function imputeCoordinates(records) {
  const provinceCoords = {};
  
  records.forEach((record) => {
    const province = record.Province;
    if (!province) return;
    
    if (!provinceCoords[province]) {
      provinceCoords[province] = {
        latitudes: [],
        longitudes: []
      };
    }
    
    if (record.ProjectLatitude !== null) {
      provinceCoords[province].latitudes.push(record.ProjectLatitude);
    }
    if (record.ProjectLongitude !== null) {
      provinceCoords[province].longitudes.push(record.ProjectLongitude);
    }
  });
  
  const provinceAverages = {};
  Object.keys(provinceCoords).forEach((province) => {
    const coords = provinceCoords[province];
    const avgLat = coords.latitudes.length > 0
      ? coords.latitudes.reduce((a, b) => a + b, 0) / coords.latitudes.length
      : null;
    const avgLng = coords.longitudes.length > 0
      ? coords.longitudes.reduce((a, b) => a + b, 0) / coords.longitudes.length
      : null;
    
    provinceAverages[province] = { avgLat, avgLng };
  });
  
  return records.map((record) => {
    if (record.ProjectLatitude === null || record.ProjectLongitude === null) {
      const province = record.Province;
      const averages = provinceAverages[province];
      
      if (averages) {
        return {
          ...record,
          ProjectLatitude: record.ProjectLatitude === null
            ? averages.avgLat
            : record.ProjectLatitude,
          ProjectLongitude: record.ProjectLongitude === null
            ? averages.avgLng
            : record.ProjectLongitude
        };
      }
    }
    return record;
  });
}

/**
 * Filter records by year range
 */
function filterByYearRange(records, startYear, endYear) {
  return records.filter((record) => {
    const year = record.FundingYear;
    return year >= startYear && year <= endYear;
  });
}

// ============================================================================
// UTILITY FUNCTIONS - COMPUTATION
// ============================================================================

/**
 * Format number with specified decimal places
 */
function formatNumber(value, decimals = 2) {
  return (value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format large number (for budget/cost values)
 */
function formatLargeNumber(value) {
  return Math.round(value ?? 0).toLocaleString('en-US');
}

/**
 * Calculate median of an array
 */
function calculateMedian(values) {
  if (!values?.length) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Calculate average of an array
 */
function calculateAverage(values) {
  if (!values?.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate percentage
 */
function calculatePercentage(part, total) {
  return total === 0 ? 0 : (part / total) * 100;
}

// ============================================================================
// REPORT GENERATION - REPORT 1: REGIONAL EFFICIENCY
// ============================================================================

/**
 * Generate Report 1: Regional Flood Mitigation Efficiency Summary
 */
function generateReport1(records) {
  const groupedByRegion = _.groupBy(records, 'Region');
  const reportData = [];
  
  Object.entries(groupedByRegion).forEach(([region, regionRecords]) => {
    if (!regionRecords.length) return;
    
    const mainIsland = regionRecords[0].MainIsland || 'Unknown';
    const totalBudget = regionRecords.reduce((sum, r) => sum + r.ApprovedBudgetForContract, 0);
    
    const savings = regionRecords.map(r => r.CostSavings).filter(s => s != null);
    const medianSavings = calculateMedian(savings);
    
    const delays = regionRecords.map(r => r.CompletionDelayDays).filter(d => d != null);
    const avgDelay = calculateAverage(delays);
    
    const highDelayPct = delays.length > 0
      ? calculatePercentage(delays.filter(d => d > 30).length, delays.length)
      : 0;
    
    const efficiencyScore = avgDelay > 0 
      ? Math.min(100, Math.max(0, (medianSavings / avgDelay) * 100))
      : 0;
    
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
  
  reportData.sort((a, b) => b.EfficiencyScore - a.EfficiencyScore);
  
  return reportData.map(row => ({
    Region: row.Region,
    MainIsland: row.MainIsland,
    TotalBudget: formatLargeNumber(row.TotalBudget),
    MedianSavings: formatNumber(row.MedianSavings),
    AvgDelay: formatNumber(row.AvgDelay),
    HighDelayPct: formatNumber(row.HighDelayPct),
    EfficiencyScore: formatNumber(row.EfficiencyScore)
  }));
}

/**
 * Generic function to write report to CSV
 */
function writeReport(filename, reportData, headers) {
  const filePath = path.join(DIRS.output, filename);
  writeCSV(filePath, reportData, headers);
  console.log(`Report written to: ${filePath}`);
  return filePath;
}

// ============================================================================
// REPORT GENERATION - REPORT 2: CONTRACTOR RANKING
// ============================================================================

/**
 * Generate Report 2: Top Contractors Performance Ranking
 */
function generateReport2(records) {
  const groupedByContractor = _.groupBy(records, 'Contractor');
  const contractorStats = [];
  
  Object.entries(groupedByContractor).forEach(([contractor, contractorRecords]) => {
    if (contractorRecords.length < 5) return;
    
    const totalCost = contractorRecords.reduce((sum, r) => sum + r.ContractCost, 0);
    const totalSavings = contractorRecords.reduce((sum, r) => sum + (r.CostSavings || 0), 0);
    
    const delays = contractorRecords.map(r => r.CompletionDelayDays).filter(d => d != null);
    const avgDelay = calculateAverage(delays);
    
    const reliabilityIndex = totalCost > 0
      ? Math.min(100, Math.max(0, Math.max(0, 1 - (avgDelay / 90)) * (totalSavings / totalCost) * 100))
      : 0;
    
    contractorStats.push({
      Contractor: contractor,
      TotalCost: totalCost,
      NumProjects: contractorRecords.length,
      AvgDelay: avgDelay,
      TotalSavings: totalSavings,
      ReliabilityIndex: reliabilityIndex,
      RiskFlag: reliabilityIndex < 50 ? 'High Risk' : 'Low Risk'
    });
  });
  
  return contractorStats
    .sort((a, b) => b.TotalCost - a.TotalCost)
    .slice(0, 15)
    .map((row, index) => ({
      Rank: index + 1,
      Contractor: row.Contractor,
      TotalCost: formatLargeNumber(row.TotalCost),
      NumProjects: row.NumProjects,
      AvgDelay: formatNumber(row.AvgDelay),
      TotalSavings: formatLargeNumber(row.TotalSavings),
      ReliabilityIndex: formatNumber(row.ReliabilityIndex),
      RiskFlag: row.RiskFlag
    }));
}


// ============================================================================
// REPORT GENERATION - REPORT 3: COST OVERRUN TRENDS
// ============================================================================

/**
 * Generate Report 3: Annual Project Type Cost Overrun Trends
 */
function generateReport3(records) {
  const grouped = {};
  const yearTypeData = {};
  
  records.forEach(record => {
    const key = `${record.FundingYear}|${record.TypeOfWork}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(record);
  });
  
  const reportData = Object.entries(grouped).map(([key, groupRecords]) => {
    const [year, typeOfWork] = key.split('|');
    
    const savings = groupRecords.map(r => r.CostSavings).filter(s => s != null);
    const avgSavings = calculateAverage(savings);
    const overrunRate = savings.length > 0
      ? calculatePercentage(savings.filter(s => s < 0).length, savings.length)
      : 0;
    
    if (!yearTypeData[typeOfWork]) yearTypeData[typeOfWork] = {};
    yearTypeData[typeOfWork][year] = avgSavings;
    
    return {
      FundingYear: parseInt(year),
      TypeOfWork: typeOfWork,
      TotalProjects: groupRecords.length,
      AvgSavings: avgSavings,
      OverrunRate: overrunRate,
      YoYChange: 0
    };
  });
  
  reportData.forEach(row => {
    const baseline2021 = yearTypeData[row.TypeOfWork]?.[2021];
    
    if (row.FundingYear !== 2021 && baseline2021 && baseline2021 !== 0) {
      row.YoYChange = ((row.AvgSavings - baseline2021) / Math.abs(baseline2021)) * 100;
    }
  });
  
  reportData.sort((a, b) => 
    a.FundingYear !== b.FundingYear 
      ? a.FundingYear - b.FundingYear 
      : b.AvgSavings - a.AvgSavings
  );
  
  return reportData.map(row => ({
    FundingYear: row.FundingYear,
    TypeOfWork: row.TypeOfWork,
    TotalProjects: row.TotalProjects,
    AvgSavings: formatNumber(row.AvgSavings),
    OverrunRate: formatNumber(row.OverrunRate),
    YoYChange: formatNumber(row.YoYChange)
  }));
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Generate summary JSON with aggregate statistics
 */
function generateSummary(records) {
  const uniqueContractors = new Set(
    records.map(r => r.Contractor).filter(c => c && c !== 'Unknown')
  );
  
  const uniqueProvinces = new Set(
    records.map(r => r.Province).filter(p => p)
  );
  
  const delays = records.map(r => r.CompletionDelayDays).filter(d => d != null);
  const totalSavings = records.reduce((sum, r) => sum + (r.CostSavings || 0), 0);
  
  return {
    total_projects: records.length,
    total_contractors: uniqueContractors.size,
    total_provinces: uniqueProvinces.size,
    global_avg_delay: Math.round(calculateAverage(delays) * 10) / 10,
    total_savings: Math.round(totalSavings)
  };
}

/**
 * Write summary to JSON file
 */
function writeSummary(summaryData) {
  const filePath = path.join(DIRS.output, 'summary.json');
  writeJSON(filePath, summaryData);
  console.log(`Summary written to: ${filePath}`);
  return filePath;
}

// ============================================================================
// MAIN APPLICATION LOGIC
// ============================================================================

/**
 * Prompt user for input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Load and process the CSV file
 */
async function loadFile() {
  try {
    console.log('Processing dataset...');
    
    const csvPath = findCSVFile();
    console.log(`Reading file: ${csvPath}`);
    
    rawRecords = await readCSV(csvPath);
    console.log(`Raw records loaded: ${rawRecords.length}`);
    
    const cleanedRecords = [];
    const errors = [];
    
    rawRecords.forEach((record, index) => {
      const cleaned = cleanRecord(record);
      if (cleaned) {
        cleanedRecords.push(cleaned);
      } else {
        const validation = validateRecord(record);
        if (!validation.isValid) {
          errors.push(`Row ${index + 2}: ${validation.errors.join(', ')}`);
        }
      }
    });
    
    if (errors.length > 0) {
      console.log(`\nValidation errors detected: ${errors.length} invalid records`);
      errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
      console.log(`Valid records: ${cleanedRecords.length} out of ${rawRecords.length}`);
    }
    
    let recordsWithDerived = cleanedRecords.map(addDerivedFields);
    recordsWithDerived = imputeCoordinates(recordsWithDerived);
    processedData = filterByYearRange(recordsWithDerived, 2021, 2023);
    
    console.log(`(${rawRecords.length} rows loaded, ${processedData.length} filtered for 2021-2023)\n`);
    
    return true;
  } catch (error) {
    console.error(`Error loading file: ${error.message}`);
    return false;
  }
}

/**
 * Generate all reports
 */
async function generateReports() {
  if (!processedData?.length) {
    console.log('Error: No data loaded. Please load the file first (option 1).');
    return;
  }
  
  try {
    console.log('Generating reports...\n');
    
    console.log('Report 1: Regional Flood Mitigation Efficiency Summary');
    const report1Data = generateReport1(processedData);
    writeReport('report1_regional_efficiency.csv', report1Data, 
      ['Region', 'MainIsland', 'TotalBudget', 'MedianSavings', 'AvgDelay', 'HighDelayPct', 'EfficiencyScore']);
    
    console.log('\nReport 2: Top Contractors Performance Ranking');
    const report2Data = generateReport2(processedData);
    writeReport('report2_contractor_ranking.csv', report2Data,
      ['Rank', 'Contractor', 'TotalCost', 'NumProjects', 'AvgDelay', 'TotalSavings', 'ReliabilityIndex', 'RiskFlag']);
    
    console.log('\nReport 3: Annual Project Type Cost Overrun Trends');
    const report3Data = generateReport3(processedData);
    writeReport('report3_cost_overrun_trends.csv', report3Data,
      ['FundingYear', 'TypeOfWork', 'TotalProjects', 'AvgSavings', 'OverrunRate', 'YoYChange']);
    
    console.log('\nGenerating summary...');
    const summaryData = generateSummary(processedData);
    writeSummary(summaryData);
    
    console.log('\nOutputs saved to individual files...\n');
    console.log('Summary Stats (summary.json):');
    console.log(JSON.stringify(summaryData));
    
  } catch (error) {
    console.error(`Error generating reports: ${error.message}`);
    console.error(error.stack);
  }
}

/**
 * Display main menu
 */
function displayMenu() {
  console.log('Select Language Implementation:');
  console.log('[1] Load the file');
  console.log('[2] Generate Reports\n');
}

/**
 * Main application loop
 */
async function main() {
  console.log('DATA ANALYSIS PIPELINE FOR FLOOD CONTROL PROJECTS\n');
  console.log('Version 2: Comprehensive Single-File Implementation\n');
  
  let running = true;
  
  while (running) {
    displayMenu();
    
    const choice = await askQuestion('Enter choice: ');
    console.log('');
    
    switch (choice.trim()) {
      case '1':
        await loadFile();
        break;
        
      case '2':
        await generateReports();
        
        const continueChoice = await askQuestion('Back to Report Selection (Y/N): ');
        running = continueChoice.trim().toUpperCase() === 'Y';
        console.log('');
        break;
        
      default:
        console.log('Invalid choice. Please enter 1 or 2.\n');
    }
  }
  
  rl.close();
  console.log('Goodbye!');
}

// ============================================================================
// APPLICATION ENTRY POINT
// ============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

