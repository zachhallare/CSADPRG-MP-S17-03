import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read CSV file and parse it into an array of objects
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} Array of parsed records
 */
export async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    // Check if file exists
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
 * @param {string} filePath - Output file path
 * @param {Array} data - Array of objects to write
 * @param {Array} headers - Column headers in order
 */
export function writeCSV(filePath, data, headers) {
  // Ensure output directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write headers
  const csvContent = [headers.join(',')];

  // Write data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] !== undefined ? row[header] : '';
      const stringValue = String(value);
      
      // Quote values that contain commas, quotes, or newlines
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        // Escape quotes by doubling them
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
 * @param {string} filePath - Output file path
 * @param {Object} data - Data object to write
 */
export function writeJSON(filePath, data) {
  // Ensure output directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Get the data directory path
 * @returns {string} Path to data directory
 */
export function getDataDir() {
  return path.join(__dirname, '../../data');
}

/**
 * Get the output directory path
 * @returns {string} Path to output directory
 */
export function getOutputDir() {
  return path.join(__dirname, '../../output');
}

/**
 * Find CSV file in data directory (handles variations in filename)
 * @returns {string} Path to CSV file
 */
export function findCSVFile() {
  const dataDir = getDataDir();
  const possibleNames = [
    'dpwh_flood_control_projects.csv',
    'dpwh_flood_control_projects-1.csv'
  ];

  for (const name of possibleNames) {
    const filePath = path.join(dataDir, name);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  // Check root directory as fallback
  for (const name of possibleNames) {
    const filePath = path.join(__dirname, '../../', name);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  throw new Error(`CSV file not found. Looked for: ${possibleNames.join(', ')}`);
}


