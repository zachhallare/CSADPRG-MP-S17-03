import dayjs from 'dayjs';

/**
 * Calculate cost savings (ApprovedBudgetForContract - ContractCost)
 * @param {number} approvedBudget - Approved budget
 * @param {number} contractCost - Contract cost
 * @returns {number} Cost savings (can be negative)
 */
export function calculateCostSavings(approvedBudget, contractCost) {
  return approvedBudget - contractCost;
}

/**
 * Calculate completion delay in days
 * @param {dayjs.Dayjs} startDate - Project start date
 * @param {dayjs.Dayjs} completionDate - Actual completion date
 * @returns {number|null} Delay in days or null if dates are invalid
 */
export function calculateCompletionDelay(startDate, completionDate) {
  if (!startDate || !completionDate) {
    return null;
  }
  
  const delay = completionDate.diff(startDate, 'day');
  return delay;
}

/**
 * Add derived fields to a record
 * @param {Object} record - Cleaned record
 * @returns {Object} Record with derived fields
 */
export function addDerivedFields(record) {
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
 * @param {Array} records - Array of records
 * @returns {Array} Records with imputed coordinates
 */
export function imputeCoordinates(records) {
  // Calculate province averages for coordinates
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
  
  // Calculate averages
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
  
  // Impute missing coordinates
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
 * @param {Array} records - Array of records
 * @param {number} startYear - Start year (inclusive)
 * @param {number} endYear - End year (inclusive)
 * @returns {Array} Filtered records
 */
export function filterByYearRange(records, startYear, endYear) {
  return records.filter((record) => {
    const year = record.FundingYear;
    return year >= startYear && year <= endYear;
  });
}


