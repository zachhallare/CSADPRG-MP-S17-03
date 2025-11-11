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

/**
 * Get the data directory path
 */
function getDataDir() {
  return path.join(__dirname, 'data');
}

/**
 * Get the output directory path
 */
function getOutputDir() {
  return path.join(__dirname, 'output');
}

/**
 * Find CSV file in data directory
 */
function findCSVFile() {
  const dataDir = getDataDir();
  const filePath = path.join(dataDir, 'dpwh_flood_control_projects.csv');
  
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
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const csvContent = [headers.join(',')];

  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] !== undefined ? row[header] : '';
      const stringValue = String(value);
      
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        const escapedValue = stringValue.replace(/"/g, '""');
        return `"${escapedValue}"`;
      }
      return stringValue;
    });
    csvContent.push(values.join(','));
  });

  fs.writeFileSync(filePath, csvContent.join('\n'), 'utf8');
}

/**
 * Write JSON data to file
 */
function writeJSON(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

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
 * Format number with commas and 2 decimal places
 */
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  
  const rounded = Math.round(value * 100) / 100;
  const isNegative = rounded < 0;
  const absValue = Math.abs(rounded);
  
  const parts = absValue.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00';
  const paddedDecimal = decimalPart.padEnd(2, '0').substring(0, 2);
  
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = isNegative ? '-' : '';
  
  return `${sign}${formattedInteger}.${paddedDecimal}`;
}

/**
 * Format large number (for budget/cost values)
 */
function formatLargeNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Calculate median of an array
 */
function calculateMedian(values) {
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
 */
function calculateAverage(values) {
  if (!values || values.length === 0) {
    return 0;
  }
  
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/**
 * Calculate percentage
 */
function calculatePercentage(part, total) {
  if (total === 0) {
    return 0;
  }
  return (part / total) * 100;
}

/**
 * Group records by a key
 */
function groupBy(records, key) {
  return _.groupBy(records, key);
}

// ============================================================================
// REPORT GENERATION - REPORT 1: REGIONAL EFFICIENCY
// ============================================================================

/**
 * Generate Report 1: Regional Flood Mitigation Efficiency Summary
 */
function generateReport1(records) {
  const groupedByRegion = groupBy(records, 'Region');
  const reportData = [];
  
  Object.keys(groupedByRegion).forEach((region) => {
    const regionRecords = groupedByRegion[region];
    
    if (regionRecords.length === 0) return;
    
    const mainIsland = regionRecords[0].MainIsland || 'Unknown';
    
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
    
    const highDelayCount = delays.filter((d) => d > 30).length;
    const highDelayPct = delays.length > 0
      ? calculatePercentage(highDelayCount, delays.length)
      : 0;
    
    let efficiencyScore = 0;
    if (avgDelay > 0) {
      efficiencyScore = (medianSavings / avgDelay) * 100;
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
  
  reportData.sort((a, b) => b.EfficiencyScore - a.EfficiencyScore);
  
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
 */
function writeReport1(reportData) {
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

// ============================================================================
// REPORT GENERATION - REPORT 2: CONTRACTOR RANKING
// ============================================================================

/**
 * Generate Report 2: Top Contractors Performance Ranking
 */
function generateReport2(records) {
  const groupedByContractor = groupBy(records, 'Contractor');
  const contractorStats = [];
  
  Object.keys(groupedByContractor).forEach((contractor) => {
    const contractorRecords = groupedByContractor[contractor];
    
    if (contractorRecords.length < 5) {
      return;
    }
    
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
    
    let reliabilityIndex = 0;
    if (totalCost > 0) {
      const delayFactor = Math.max(0, 1 - (avgDelay / 90));
      const savingsRatio = totalSavings / totalCost;
      reliabilityIndex = delayFactor * savingsRatio * 100;
      reliabilityIndex = Math.min(100, Math.max(0, reliabilityIndex));
    }
    
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
  
  contractorStats.sort((a, b) => b.TotalCost - a.TotalCost);
  const top15 = contractorStats.slice(0, 15);
  
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
 */
function writeReport2(reportData) {
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

// ============================================================================
// REPORT GENERATION - REPORT 3: COST OVERRUN TRENDS
// ============================================================================

/**
 * Generate Report 3: Annual Project Type Cost Overrun Trends
 */
function generateReport3(records) {
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
  
  Object.keys(grouped).forEach((key) => {
    const groupRecords = grouped[key];
    const [year, typeOfWork] = key.split('|');
    
    const totalProjects = groupRecords.length;
    
    const savings = groupRecords
      .map((r) => r.CostSavings)
      .filter((s) => s !== null && s !== undefined);
    const avgSavings = savings.length > 0 ? calculateAverage(savings) : 0;
    
    const overrunCount = savings.filter((s) => s < 0).length;
    const overrunRate = savings.length > 0
      ? calculatePercentage(overrunCount, savings.length)
      : 0;
    
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
      YoYChange: 0
    });
  });
  
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
  
  reportData.sort((a, b) => {
    if (a.FundingYear !== b.FundingYear) {
      return a.FundingYear - b.FundingYear;
    }
    return b.AvgSavings - a.AvgSavings;
  });
  
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
 */
function writeReport3(reportData) {
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

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Generate summary JSON with aggregate statistics
 */
function generateSummary(records) {
  const totalProjects = records.length;
  
  const uniqueContractors = new Set(
    records.map((r) => r.Contractor).filter((c) => c && c !== 'Unknown')
  );
  const totalContractors = uniqueContractors.size;
  
  const uniqueProvinces = new Set(
    records.map((r) => r.Province).filter((p) => p && p !== '')
  );
  const totalProvinces = uniqueProvinces.size;
  
  const delays = records
    .map((r) => r.CompletionDelayDays)
    .filter((d) => d !== null && d !== undefined);
  const globalAvgDelay = delays.length > 0 ? calculateAverage(delays) : 0;
  
  const totalSavings = records.reduce(
    (sum, r) => sum + (r.CostSavings || 0),
    0
  );
  
  return {
    total_projects: totalProjects,
    total_contractors: totalContractors,
    total_provinces: totalProvinces,
    global_avg_delay: Math.round(globalAvgDelay * 10) / 10,
    total_savings: Math.round(totalSavings)
  };
}

/**
 * Write summary to JSON file
 */
function writeSummary(summaryData) {
  const outputDir = getOutputDir();
  const filePath = path.join(outputDir, 'summary.json');
  
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
      if (errors.length <= 10) {
        errors.forEach((error) => console.log(`  - ${error}`));
      } else {
        errors.slice(0, 10).forEach((error) => console.log(`  - ${error}`));
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
      console.log(`Valid records: ${cleanedRecords.length} out of ${rawRecords.length}`);
    }
    
    let recordsWithDerived = cleanedRecords.map(addDerivedFields);
    recordsWithDerived = imputeCoordinates(recordsWithDerived);
    processedData = filterByYearRange(recordsWithDerived, 2021, 2023);
    
    console.log(
      `(${rawRecords.length} rows loaded, ${processedData.length} filtered for 2021-2023)`
    );
    console.log('');
    
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
  if (!processedData || processedData.length === 0) {
    console.log('Error: No data loaded. Please load the file first (option 1).');
    return;
  }
  
  try {
    console.log('Generating reports...');
    
    console.log('\nReport 1: Regional Flood Mitigation Efficiency Summary');
    const report1Data = generateReport1(processedData);
    writeReport1(report1Data);
    
    console.log('\nReport 2: Top Contractors Performance Ranking');
    const report2Data = generateReport2(processedData);
    writeReport2(report2Data);
    
    console.log('\nReport 3: Annual Project Type Cost Overrun Trends');
    const report3Data = generateReport3(processedData);
    writeReport3(report3Data);
    
    console.log('\nGenerating summary...');
    const summaryData = generateSummary(processedData);
    writeSummary(summaryData);
    
    console.log('\nOutputs saved to individual files...');
    console.log('');
    
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
  console.log('[2] Generate Reports');
  console.log('');
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
        if (continueChoice.trim().toUpperCase() !== 'Y') {
          running = false;
        }
        console.log('');
        break;
        
      default:
        console.log('Invalid choice. Please enter 1 or 2.');
        console.log('');
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

