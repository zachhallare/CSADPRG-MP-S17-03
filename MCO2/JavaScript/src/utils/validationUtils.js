import dayjs from 'dayjs';

/**
 * Validate and parse a date string
 * @param {string} dateStr - Date string to validate
 * @returns {dayjs.Dayjs|null} Parsed date or null if invalid
 */
export function validateDate(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') {
    return null;
  }
  
  const parsed = dayjs(dateStr);
  return parsed.isValid() ? parsed : null;
}

/**
 * Validate and parse a number
 * @param {string|number} value - Value to validate
 * @returns {number|null} Parsed number or null if invalid
 */
export function validateNumber(value) {
  if (value === null || value === undefined || value === '' || value === 'N/A') {
    return null;
  }
  
  // Remove commas and convert to number
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return !isNaN(parsed) ? parsed : null;
}

/**
 * Validate FundingYear is between 2021-2023
 * @param {number|string} year - Year to validate
 * @returns {boolean} True if year is valid (2021-2023)
 */
export function isValidYear(year) {
  const yearNum = typeof year === 'string' ? parseInt(year) : year;
  return yearNum >= 2021 && yearNum <= 2023;
}

/**
 * Validate a record has required fields
 * @param {Object} record - Record to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateRecord(record) {
  const errors = [];
  
  // Check required fields
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
 * @param {Object} record - Raw record from CSV
 * @returns {Object|null} Cleaned record or null if invalid
 */
export function cleanRecord(record) {
  const validation = validateRecord(record);
  
  if (!validation.isValid) {
    return null;
  }
  
  // Parse numeric fields
  const approvedBudget = validateNumber(record.ApprovedBudgetForContract);
  const contractCost = validateNumber(record.ContractCost);
  
  if (approvedBudget === null || contractCost === null) {
    return null;
  }
  
  // Parse dates
  const startDate = validateDate(record.StartDate);
  const completionDate = validateDate(record.ActualCompletionDate);
  
  // Parse coordinates
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


