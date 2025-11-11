import readline from 'readline';
import { readCSV, findCSVFile } from './utils/fileUtils.js';
import { cleanRecord, validateRecord } from './utils/validationUtils.js';
import {
  addDerivedFields,
  imputeCoordinates,
  filterByYearRange
} from './utils/transformUtils.js';
import { generateReport1, writeReport1 } from './reports/report1_efficiency.js';
import { generateReport2, writeReport2 } from './reports/report2_contractor.js';
import { generateReport3, writeReport3 } from './reports/report3_overrun.js';
import { generateSummary, writeSummary } from './summary.js';

// Global variable to store processed data
let processedData = null;
let rawRecords = null;

/**
 * Create readline interface for user input
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input
 * @param {string} question - Question to ask
 * @returns {Promise<string>} User's response
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
    
    // Find CSV file
    const csvPath = findCSVFile();
    console.log(`Reading file: ${csvPath}`);
    
    // Read CSV
    rawRecords = await readCSV(csvPath);
    console.log(`Raw records loaded: ${rawRecords.length}`);
    
    // Validate and clean records
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
    
    // Log errors if any (REQ-0002: Detect and parse errors)
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
    
    // Add derived fields
    let recordsWithDerived = cleanedRecords.map(addDerivedFields);
    
    // Impute coordinates
    recordsWithDerived = imputeCoordinates(recordsWithDerived);
    
    // Filter for 2021-2023
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
    
    // Generate Report 1: Regional Efficiency
    console.log('\nReport 1: Regional Flood Mitigation Efficiency Summary');
    const report1Data = generateReport1(processedData);
    writeReport1(report1Data);
    
    // Generate Report 2: Contractor Ranking
    console.log('\nReport 2: Top Contractors Performance Ranking');
    const report2Data = generateReport2(processedData);
    writeReport2(report2Data);
    
    // Generate Report 3: Cost Overrun Trends
    console.log('\nReport 3: Annual Project Type Cost Overrun Trends');
    const report3Data = generateReport3(processedData);
    writeReport3(report3Data);
    
    // Generate Summary
    console.log('\nGenerating summary...');
    const summaryData = generateSummary(processedData);
    writeSummary(summaryData);
    
    console.log('\nOutputs saved to individual files...');
    console.log('');
    
    // Display summary stats
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
        
        // Ask if user wants to continue
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

// Run the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


