// ********************
// Last names: Campo, Hallare, Lobo, Rebollos
// Language: Rust
// Paradigm(s): Imperative, Functional
// ********************

use std::collections::{HashMap, HashSet};
use std::env;
use std::fs::{self, create_dir_all};
use std::io::{self, BufRead, Write};
use std::path::PathBuf;

use chrono::prelude::*;
use csv::{ReaderBuilder, WriterBuilder};
use serde::Deserialize;
use serde_json::{json, Value as JsonValue};
use prettytable::{Table, Row, Cell, format};

// ============================================================================
// SETUP AND CONFIGURATION
// ============================================================================

// Represents one raw CSV record directly from the dataset.
// Fields correspond to CSV headers.
#[derive(Deserialize, Clone)]
struct RawRecord {
    #[serde(rename = "Region")]
    region: String,
    #[serde(rename = "MainIsland")]
    main_island: String,
    #[serde(rename = "FundingYear")]
    funding_year: String,
    #[serde(rename = "ApprovedBudgetForContract")]
    approved_budget_for_contract: String,
    #[serde(rename = "ContractCost")]
    contract_cost: String,
    #[serde(rename = "StartDate")]
    start_date: String,
    #[serde(rename = "ActualCompletionDate")]
    actual_completion_date: String,
    #[serde(rename = "ProjectLatitude")]
    project_latitude: String,
    #[serde(rename = "ProjectLongitude")]
    project_longitude: String,
    #[serde(rename = "Province")]
    province: String,
    #[serde(rename = "Contractor")]
    contractor: String,
    #[serde(rename = "TypeOfWork")]
    type_of_work: String,
}

// Represents a cleaned record where fields are converted to proper data types.
#[derive(Clone)]
struct CleanedRecord {
    region: String,
    main_island: String,
    funding_year: i32,
    approved_budget_for_contract: f64,
    contract_cost: f64,
    start_date: Option<NaiveDate>,
    actual_completion_date: Option<NaiveDate>,
    project_latitude: Option<f64>,
    project_longitude: Option<f64>,
    province: String,
    contractor: String,
    type_of_work: String,
}

// Represents a fully processed record with computed derived metrics.
#[derive(Clone)]
struct ProcessedRecord {
    region: String,
    main_island: String,
    funding_year: i32,
    approved_budget_for_contract: f64,
    contract_cost: f64,
    start_date: Option<NaiveDate>,
    actual_completion_date: Option<NaiveDate>,
    project_latitude: Option<f64>,
    project_longitude: Option<f64>,
    province: String,
    contractor: String,
    type_of_work: String,
    cost_savings: f64,
    completion_delay_days: Option<i64>,
}

// Generic row structure for writing reports.
// Each key-value represents one cell of data.
type ReportRow = HashMap<String, String>;

// Used to hold results of record validation.
struct ValidationResult {
    is_valid: bool,
    errors: Vec<String>,
}

// ============================================================================
// UTILITY FUNCTIONS - FILE OPERATIONS
// ============================================================================

/// Ensures the directory for a file path exists.
/// Creates directories if they don't exist.
fn ensure_dir(file_path: &PathBuf) -> io::Result<()> {
    if let Some(dir) = file_path.parent() {
        if !dir.exists() {
            create_dir_all(dir)?;
        }
    }
    Ok(())
}

/// Locates the target CSV dataset in the expected `data/` directory.
fn find_csv_file() -> io::Result<PathBuf> {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let file_path = PathBuf::from(manifest_dir)
        .join("data")
        .join("dpwh_flood_control_projects.csv");

    if file_path.exists() {
        Ok(file_path)
    } else {
        Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("CSV file not found: dpwh_flood_control_projects.csv"),
        ))
    }
}

/// Reads all rows from the CSV into a vector of `RawRecord` structs.
fn read_csv(file_path: &PathBuf) -> io::Result<Vec<RawRecord>> {
    let mut rdr = ReaderBuilder::new().from_path(file_path)?;
    let mut results = Vec::new();
    for result in rdr.deserialize() {
        let record: RawRecord = result?;
        results.push(record);
    }
    Ok(results)
}

/// Writes report data to a CSV file, including headers and escaped values.
fn write_csv(file_path: &PathBuf, data: &[ReportRow], headers: &[&str]) -> io::Result<()> {
    ensure_dir(file_path)?;
    let mut wtr = WriterBuilder::new().from_path(file_path)?;
    wtr.write_record(headers)?;
    for row in data {
        let mut record = Vec::new();
        for header in headers {
            let value = row.get(&header.to_string()).cloned().unwrap_or_default();
            let escaped = if value.contains(',') || value.contains('"') || value.contains('\n') {
                format!("\"{}\"", value.replace('"', "\"\""))
            } else {
                value
            };
            record.push(escaped);
        }
        wtr.write_record(&record)?;
    }
    wtr.flush()?;
    Ok(())
}

/// Writes JSON data (pretty-formatted) to a file.
fn write_json(file_path: &PathBuf, data: &JsonValue) -> io::Result<()> {
    ensure_dir(file_path)?;
    let json_str = serde_json::to_string_pretty(data)?;
    fs::write(file_path, json_str)?;
    Ok(())
}

// ============================================================================
// UTILITY FUNCTIONS - VALIDATION
// ============================================================================

/// Validates and parses date strings safely.
fn validate_date(date_str: &str) -> Option<NaiveDate> {
    if date_str.trim().is_empty() || date_str == "N/A" {
        return None;
    }
    NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok()
}

/// Converts strings to floating-point values if valid.
fn validate_number(value: &str) -> Option<f64> {
    if value.trim().is_empty() || value == "N/A" {
        return None;
    }
    let cleaned = value.replace(',', "").trim().to_string();
    cleaned.parse::<f64>().ok()
}

/// Checks whether a year is within the dataset's expected valid range.
fn is_valid_year(year: i32) -> bool {
    year >= 2021 && year <= 2023
}

/// Validates each raw record, checking required fields and data types.
fn validate_record(record: &RawRecord) -> ValidationResult {
    let mut errors = Vec::new();
    
    if record.region.trim().is_empty() {
        errors.push("Missing Region".to_string());
    }
    
    if record.main_island.trim().is_empty() {
        errors.push("Missing MainIsland".to_string());
    }
    
    let year = record.funding_year.parse::<i32>().ok();
    if year.is_none() || !year.map_or(false, is_valid_year) {
        errors.push(format!("Invalid FundingYear: {}", record.funding_year));
    }
    
    if record.approved_budget_for_contract.trim().is_empty() {
        errors.push("Missing ApprovedBudgetForContract".to_string());
    }
    
    if record.contract_cost.trim().is_empty() {
        errors.push("Missing ContractCost".to_string());
    }
    
    ValidationResult {
        is_valid: errors.is_empty(),
        errors,
    }
}

/// Converts a valid RawRecord into a CleanedRecord with proper data types.
fn clean_record(record: &RawRecord) -> Option<CleanedRecord> {
    let validation = validate_record(record);
    if !validation.is_valid {
        return None;
    }
    
    let approved_budget = validate_number(&record.approved_budget_for_contract)?;
    let contract_cost = validate_number(&record.contract_cost)?;
    let start_date = validate_date(&record.start_date);
    let actual_completion_date = validate_date(&record.actual_completion_date);
    let latitude = validate_number(&record.project_latitude);
    let longitude = validate_number(&record.project_longitude);
    let funding_year = record.funding_year.parse::<i32>().ok()?;

    Some(CleanedRecord {
        region: record.region.clone(),
        main_island: record.main_island.clone(),
        funding_year,
        approved_budget_for_contract: approved_budget,
        contract_cost,
        start_date,
        actual_completion_date,
        project_latitude: latitude,
        project_longitude: longitude,
        province: record.province.clone(),
        contractor: if record.contractor.trim().is_empty() {
            "Unknown".to_string()
        } else {
            record.contractor.clone()
        },
        type_of_work: if record.type_of_work.trim().is_empty() {
            "Unknown".to_string()
        } else {
            record.type_of_work.clone()
        },
    })
}

// ============================================================================
// UTILITY FUNCTIONS - TRANSFORMATION
// ============================================================================

/// Computes savings (budget - cost).
fn calculate_cost_savings(approved_budget: f64, contract_cost: f64) -> f64 {
    approved_budget - contract_cost
}

/// Computes project duration (in days) if both dates are available.
fn calculate_completion_delay(
    start_date: Option<NaiveDate>,
    completion_date: Option<NaiveDate>,
) -> Option<i64> {
    match (start_date, completion_date) {
        (Some(start), Some(completion)) => Some((completion - start).num_days()),
        _ => None,
    }
}

/// Adds derived fields (savings, delay) to a cleaned record.
fn add_derived_fields(record: CleanedRecord) -> ProcessedRecord {
    let cost_savings = calculate_cost_savings(
        record.approved_budget_for_contract,
        record.contract_cost,
    );
    let completion_delay = calculate_completion_delay(
        record.start_date,
        record.actual_completion_date,
    );
    ProcessedRecord {
        region: record.region,
        main_island: record.main_island,
        funding_year: record.funding_year,
        approved_budget_for_contract: record.approved_budget_for_contract,
        contract_cost: record.contract_cost,
        start_date: record.start_date,
        actual_completion_date: record.actual_completion_date,
        project_latitude: record.project_latitude,
        project_longitude: record.project_longitude,
        province: record.province,
        contractor: record.contractor,
        type_of_work: record.type_of_work,
        cost_savings,
        completion_delay_days: completion_delay,
    }
}

/// Fills in missing latitude/longitude values using province averages.
fn impute_coordinates(mut records: Vec<ProcessedRecord>) -> Vec<ProcessedRecord> {
    // Group all known coordinates by province
    let mut province_coords: HashMap<String, (Vec<f64>, Vec<f64>)> = HashMap::new();
    for record in &records {
        if record.province.is_empty() {
            continue;
        }
        let entry = province_coords
            .entry(record.province.clone())
            .or_insert((Vec::new(), Vec::new()));
        if let Some(lat) = record.project_latitude {
            entry.0.push(lat);
        }
        if let Some(lng) = record.project_longitude {
            entry.1.push(lng);
        }
    }

    // Compute average coordinates per province
    let mut province_averages: HashMap<String, (Option<f64>, Option<f64>)> = HashMap::new();
    for (province, (lats, lngs)) in province_coords {
        let avg_lat = if !lats.is_empty() {
            Some(lats.iter().sum::<f64>() / lats.len() as f64)
        } else {
            None
        };
        let avg_lng = if !lngs.is_empty() {
            Some(lngs.iter().sum::<f64>() / lngs.len() as f64)
        } else {
            None
        };
        province_averages.insert(province, (avg_lat, avg_lng));
    }

    // Impute missing coordinates with the computed averages
    for record in &mut records {
        if record.project_latitude.is_none() || record.project_longitude.is_none() {
            if let Some((avg_lat, avg_lng)) = province_averages.get(&record.province) {
                if record.project_latitude.is_none() {
                    record.project_latitude = *avg_lat;
                }
                if record.project_longitude.is_none() {
                    record.project_longitude = *avg_lng;
                }
            }
        }
    }
    records
}

/// Filters a vector of `ProcessedRecord`s to only include records whose
/// `funding_year` is between `start_year` and `end_year` (inclusive).
fn filter_by_year_range(records: Vec<ProcessedRecord>, start_year: i32, end_year: i32) -> Vec<ProcessedRecord> {
    records
        .into_iter()
        .filter(|r| r.funding_year >= start_year && r.funding_year <= end_year)
        .collect()
}

// ============================================================================
// UTILITY FUNCTIONS - COMPUTATION
// ============================================================================

/// Formats a floating-point number with a fixed number of decimal places.
fn format_number(value: f64, decimals: usize) -> String {
    let multiplier = 10_f64.powi(decimals as i32);
    let rounded = (value * multiplier).round() / multiplier;
    
    let formatted = format!("{:.1$}", rounded, decimals);
    let parts: Vec<&str> = formatted.split('.').collect();
    
    let int_part = format_with_commas(parts[0]);
    if parts.len() > 1 {
        format!("{}.{}", int_part, parts[1])
    } else {
        int_part
    }
}

/// Formats a numeric string with comma separators for thousands.
fn format_with_commas(num_str: &str) -> String {
    let (sign, num) = if num_str.starts_with('-') {
        ("-", &num_str[1..])
    } else {
        ("", num_str)
    };

    let chars: Vec<char> = num.chars().collect();
    let mut result = String::new();
    
    for (i, ch) in chars.iter().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            result.insert(0, ',');
        }
        result.insert(0, *ch);
    }

    format!("{}{}", sign, result)
}

/// Rounds and formats large numbers (e.g., budgets) with commas, no decimals.
fn format_large_number(value: f64) -> String {
    format_number(value.round(), 0)
}

/// Calculates the median value of a slice of floats.
fn calculate_median(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[mid]
    }
}

/// Calculates the arithmetic mean (average) of a list of floats.
fn calculate_average(values: &[f64]) -> f64 {
    if values.is_empty() {
        0.0
    } else {
        values.iter().sum::<f64>() / values.len() as f64
    }
}

/// Calculates the average of i64 integer values.
fn calculate_average_i64(values: &[i64]) -> f64 {
    if values.is_empty() {
        0.0
    } else {
        values.iter().sum::<i64>() as f64 / values.len() as f64
    }
}

/// Calculates a percentage safely (avoiding division by zero).
fn calculate_percentage(part: f64, total: f64) -> f64 {
    if total == 0.0 { 0.0 } else { (part / total) * 100.0 }
}

// ============================================================================
// REPORT GENERATION - REPORT 1: REGIONAL EFFICIENCY
// ============================================================================

/// Temporary struct for Report 1 computation.
struct Report1Temp {
    region: String,
    main_island: String,
    total_budget: f64,
    median_savings: f64,
    avg_delay: f64,
    high_delay_pct: f64,
    efficiency_score: f64,
}

/// Generate Report 1: Regional Flood Mitigation Efficiency Summary
fn generate_report1(records: &[ProcessedRecord]) -> Vec<ReportRow> {
    // Group projects by region
    let mut grouped: HashMap<String, Vec<ProcessedRecord>> = HashMap::new();
    for r in records {
        grouped.entry(r.region.clone()).or_insert_with(Vec::new).push(r.clone());
    }

    // Temporary storage for per-region stats
    let mut temp: Vec<Report1Temp> = Vec::new();

    // Compute aggregated metrics for each region
    for (region, recs) in grouped {
        if recs.is_empty() { continue; }
        
        let main_island = recs[0].main_island.clone();
        let total_budget: f64 = recs.iter().map(|r| r.approved_budget_for_contract).sum();
        
        let savings: Vec<f64> = recs.iter().map(|r| r.cost_savings).collect();
        let median_savings = calculate_median(&savings);
        
        let delays: Vec<i64> = recs.iter().filter_map(|r| r.completion_delay_days).collect();
        let avg_delay = calculate_average_i64(&delays);

        // % of projects delayed over 30 days
        let high_delay_pct = if !delays.is_empty() {
            calculate_percentage(delays.iter().filter(|&&d| d > 30).count() as f64, delays.len() as f64)
        } else { 0.0 };

        // Efficiency Score: proportional to savings but penalized by delay
        let efficiency_score = if avg_delay > 0.0 {
            ((median_savings / avg_delay) * 100.0).clamp(0.0, 100.0)
        } else { 0.0 };

        temp.push(Report1Temp { 
            region, 
            main_island, 
            total_budget, 
            median_savings, 
            avg_delay, 
            high_delay_pct, 
            efficiency_score 
        });
    }

    // Sort descending by efficiency score (best region first)
    temp.sort_by(|a, b| b.efficiency_score.partial_cmp(&a.efficiency_score).unwrap());

    // Convert to CSV-friendly format
    temp.into_iter().map(|r| {
        let mut row = ReportRow::new();
        row.insert("Region".to_string(), r.region);
        row.insert("MainIsland".to_string(), r.main_island);
        row.insert("TotalBudget".to_string(), format_large_number(r.total_budget));
        row.insert("MedianSavings".to_string(), format_number(r.median_savings, 2));
        row.insert("AvgDelay".to_string(), format_number(r.avg_delay, 2));
        row.insert("HighDelayPct".to_string(), format_number(r.high_delay_pct, 2));
        row.insert("EfficiencyScore".to_string(), format_number(r.efficiency_score, 2));
        row
    }).collect()
}

// ============================================================================
// REPORT GENERATION - REPORT 2: CONTRACTOR RANKING
// ============================================================================

/// Temporary struct for Report 2 computation.
struct Report2Temp {
    contractor: String,
    total_cost: f64,
    num_projects: usize,
    avg_delay: f64,
    total_savings: f64,
    reliability_index: f64,
    risk_flag: String,
}

/// Generate Report 2: Top Contractors Performance Ranking
fn generate_report2(records: &[ProcessedRecord]) -> Vec<ReportRow> {
    let mut grouped: HashMap<String, Vec<ProcessedRecord>> = HashMap::new();
    for r in records {
        grouped.entry(r.contractor.clone()).or_insert_with(Vec::new).push(r.clone());
    }

    let mut stats: Vec<Report2Temp> = Vec::new();
    for (contractor, recs) in grouped {
        if recs.len() < 5 { continue; } // ignore small sample sizes

        let total_cost: f64 = recs.iter().map(|r| r.contract_cost).sum();
        let total_savings: f64 = recs.iter().map(|r| r.cost_savings).sum();
        let delays: Vec<i64> = recs.iter().filter_map(|r| r.completion_delay_days).collect();
        let avg_delay = calculate_average_i64(&delays);

        // Compute contractor performance (higher = better)
        let reliability_index = if total_cost > 0.0 {
            (((1.0 - (avg_delay / 90.0)).max(0.0) * (total_savings / total_cost)) * 100.0).clamp(0.0, 100.0)
        } else { 0.0 };

        // Assign qualitative risk label
        let risk_flag = if reliability_index < 50.0 { "High Risk" } else { "Low Risk" }.to_string();

        stats.push(Report2Temp { 
            contractor, 
            total_cost, 
            num_projects: recs.len(), 
            avg_delay, 
            total_savings, 
            reliability_index, 
            risk_flag 
        });
    }

    // Sort by total cost (largest first) and limit to top 15
    stats.sort_by(|a, b| b.total_cost.partial_cmp(&a.total_cost).unwrap());
    stats.truncate(15);

    // Convert to CSV rows
    stats.into_iter().enumerate().map(|(i, r)| {
        let mut row = ReportRow::new();
        row.insert("Rank".to_string(), (i + 1).to_string());
        row.insert("Contractor".to_string(), r.contractor);
        row.insert("TotalCost".to_string(), format_large_number(r.total_cost));
        row.insert("NumProjects".to_string(), r.num_projects.to_string());
        row.insert("AvgDelay".to_string(), format_number(r.avg_delay, 2));
        row.insert("TotalSavings".to_string(), format_large_number(r.total_savings));
        row.insert("ReliabilityIndex".to_string(), format_number(r.reliability_index, 2));
        row.insert("RiskFlag".to_string(), r.risk_flag);
        row
    }).collect()
}

// ============================================================================
// REPORT GENERATION - REPORT 3: COST OVERRUN TRENDS
// ============================================================================

/// Temporary struct for Report 3 computation.
struct Report3Temp {
    funding_year: i32,
    type_of_work: String,
    total_projects: usize,
    avg_savings: f64,
    overrun_rate: f64,
    yoy_change: f64,
}

/// Generate Report 3: Annual Project Type Cost Overrun Trends
fn generate_report3(records: &[ProcessedRecord]) -> Vec<ReportRow> {
    // Group projects by year + type
    let mut grouped: HashMap<String, Vec<ProcessedRecord>> = HashMap::new();
    for r in records {
        let key = format!("{}|{}", r.funding_year, r.type_of_work);
        grouped.entry(key).or_insert_with(Vec::new).push(r.clone());
    }

    // Helper for storing YoY comparisons
    let mut year_type_data: HashMap<String, HashMap<i32, f64>> = HashMap::new();
    let mut temp: Vec<Report3Temp> = Vec::new();

    // Compute metrics per group
    for (key, recs) in grouped {
        let parts: Vec<&str> = key.split('|').collect();
        let year: i32 = parts[0].parse().unwrap();
        let type_of_work = parts[1].to_string();

        let savings: Vec<f64> = recs.iter().map(|r| r.cost_savings).collect();
        let avg_savings = calculate_average(&savings);
        let overrun_rate = if !savings.is_empty() {
            calculate_percentage(savings.iter().filter(|&&s| s < 0.0).count() as f64, savings.len() as f64)
        } else { 0.0 };

        year_type_data.entry(type_of_work.clone()).or_insert_with(HashMap::new).insert(year, avg_savings);
        temp.push(Report3Temp { 
            funding_year: year, 
            type_of_work, 
            total_projects: recs.len(), 
            avg_savings, 
            overrun_rate, 
            yoy_change: 0.0 
        });
    }

    // Compute YoY changes relative to 2021
    for row in &mut temp {
        if let Some(years) = year_type_data.get(&row.type_of_work) {
            if let Some(&baseline) = years.get(&2021) {
                if row.funding_year != 2021 && baseline != 0.0 {
                    row.yoy_change = ((row.avg_savings - baseline) / baseline.abs()) * 100.0;
                }
            }
        }
    }

    // Sort by year then by average savings descending
    temp.sort_by(|a, b| {
        if a.funding_year != b.funding_year {
            a.funding_year.cmp(&b.funding_year)
        } else {
            b.avg_savings.partial_cmp(&a.avg_savings).unwrap()
        }
    });

    // Convert to CSV rows
    temp.into_iter().map(|r| {
        let mut row = ReportRow::new();
        row.insert("FundingYear".to_string(), r.funding_year.to_string());
        row.insert("TypeOfWork".to_string(), r.type_of_work);
        row.insert("TotalProjects".to_string(), r.total_projects.to_string());
        row.insert("AvgSavings".to_string(), format_number(r.avg_savings, 2));
        row.insert("OverrunRate".to_string(), format_number(r.overrun_rate, 2));
        row.insert("YoYChange".to_string(), format_number(r.yoy_change, 2));
        row
    }).collect()
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/// Generate summary JSON with aggregate statistics
fn generate_summary(records: &[ProcessedRecord]) -> JsonValue {
    // Collect unique contractors, excluding empty and "Unknown" entries.
    let unique_contractors: HashSet<String> = records
        .iter()
        .map(|r| r.contractor.clone())
        .filter(|c| !c.is_empty() && c != "Unknown")
        .collect();

    // Collect unique provinces from valid records.
    let unique_provinces: HashSet<String> = records
        .iter()
        .map(|r| r.province.clone())
        .filter(|p| !p.is_empty())
        .collect();

    // Extract all valid delay values and total cost savings for computation.
    let delays: Vec<i64> = records.iter().filter_map(|r| r.completion_delay_days).collect();
    let total_savings: f64 = records.iter().map(|r| r.cost_savings).sum();

    // Construct a JSON summary using serde_json's `json!` macro.
    json!({
        "total_projects": records.len(),
        "total_contractors": unique_contractors.len(),
        "total_provinces": unique_provinces.len(),
        "global_avg_delay": ((calculate_average_i64(&delays) * 10.0).round() / 10.0),
        "total_savings": total_savings.round()
    })
}

/// Write summary to JSON file
fn write_summary(summary_data: &JsonValue) -> io::Result<PathBuf> {
    let current_dir = env::current_dir()?;
    let output_dir = current_dir.join("output");
    let file_path = output_dir.join("summary.json");
    write_json(&file_path, summary_data)?;
    println!("Summary written to: {}", file_path.display());
    Ok(file_path)
}

// ============================================================================
// PRETTY REPORT WRITER WITH PREVIEW
// ============================================================================

/// Generic function to write report to CSV with preview
fn write_report(
    filename: &str,
    data: &[ReportRow],
    headers: &[&str],
    report_title: &str,
) -> io::Result<PathBuf> {
    // Create output directory and construct full file path.
    let current_dir = env::current_dir()?;
    let output_dir = current_dir.join("output");
    let file_path = output_dir.join(filename);

    // Write the data to CSV file.
    write_csv(&file_path, data, headers)?;
    println!("Report written to: {}", file_path.display());

    // Print formatted table preview (first 5 rows).
    println!("\n{} (preview)", report_title);

    let mut table = Table::new();
    table.set_format(format::FormatBuilder::new()
        .column_separator('│')
        .borders('│')
        .separators(&[format::LinePosition::Top], format::LineSeparator::new('─', '┬', '┌', '┐'))
        .separators(&[format::LinePosition::Intern], format::LineSeparator::new('─', '┼', '├', '┤'))
        .separators(&[format::LinePosition::Bottom], format::LineSeparator::new('─', '┴', '└', '┘'))
        .padding(1, 1)
        .build());

    // Add header row with bold and green style.
    let header_cells: Vec<Cell> = headers.iter().map(|&h| Cell::new(h).style_spec("bFg")).collect();
    table.add_row(Row::new(header_cells));

    // Display only first 5 rows to prevent overflow.
    for row in data.iter().take(5) {
        let cells: Vec<Cell> = headers.iter().map(|&h| {
            Cell::new(&row.get(h).cloned().unwrap_or_default())
        }).collect();
        table.add_row(Row::new(cells));
    }

    // Print formatted table to console.
    table.printstd();

    // Indicate if there are more rows.
    if data.len() > 5 {
        println!("... ({} more rows)", data.len() - 5);
    }
    println!();

    Ok(file_path)
}

// ============================================================================
// MAIN APPLICATION LOGIC
// ============================================================================

/// Prompt user for input
fn ask_question(prompt: &str) -> io::Result<String> {
    print!("{}", prompt);
    io::stdout().flush()?;
    let stdin = io::stdin();
    let mut input = String::new();
    stdin.lock().read_line(&mut input)?;
    Ok(input.trim().to_string())
}

/// Load and process the CSV file
fn load_file(
    raw_records: &mut Option<Vec<RawRecord>>,
    processed_data: &mut Option<Vec<ProcessedRecord>>,
) -> io::Result<()> {
    println!("Processing dataset...");

    // Locate the first available CSV file within working directory.
    let csv_path = find_csv_file()?;
    println!("Reading file: {}", csv_path.display());

    // Read CSV into vector of raw records.
    let raw_vec = read_csv(&csv_path)?;
    println!("Raw records loaded: {}", raw_vec.len());
    *raw_records = Some(raw_vec.clone());

    // Vectors to store valid and invalid records.
    let mut cleaned = Vec::new();
    let mut errors = Vec::new();

    // Iterate through all records, validating and cleaning each one.
    for (i, record) in raw_vec.iter().enumerate() {
        if let Some(clean) = clean_record(record) {
            cleaned.push(clean);
        } else {
            let validation = validate_record(record);
            if !validation.is_valid {
                // Store validation error messages for invalid rows.
                errors.push(format!("Row {}: {}", i + 2, validation.errors.join(", ")));
            }
        }
    }

    // Display a summary of validation issues for transparency.
    if !errors.is_empty() {
        println!("\nValidation errors detected: {} invalid records", errors.len());
        for err in errors.iter().take(10) {
            println!("  - {}", err);
        }
        if errors.len() > 10 {
            println!("  ... and {} more errors", errors.len() - 10);
        }
        println!("Valid records: {} out of {}", cleaned.len(), raw_vec.len());
    }

    // Add derived/computed fields, impute missing coordinates,
    // and filter records within the target year range (2021–2023).
    let derived: Vec<ProcessedRecord> = cleaned.into_iter().map(add_derived_fields).collect();
    let imputed = impute_coordinates(derived);
    let filtered = filter_by_year_range(imputed, 2021, 2023);
    println!("({} rows loaded, {} filtered for 2021-2023)\n", raw_vec.len(), filtered.len());
    *processed_data = Some(filtered);
    Ok(())
}

/// Generate all reports
fn generate_reports(processed_data: &Option<Vec<ProcessedRecord>>) -> io::Result<()> {
    // Ensure data is loaded before generating reports.
    let Some(data) = processed_data else {
        println!("Error: No data loaded. Please load the file first (option 1).");
        return Ok(());
    };
    if data.is_empty() {
        println!("Error: No data loaded. Please load the file first (option 1).");
        return Ok(());
    }

    println!("Generating reports...\n");

    // Report 1
    println!("Report 1: Regional Flood Mitigation Efficiency Summary");
    let r1 = generate_report1(data);
    write_report(
        "report1_regional_efficiency.csv",
        &r1,
        &["Region", "MainIsland", "TotalBudget", "MedianSavings", "AvgDelay", "HighDelayPct", "EfficiencyScore"],
        "Report 1: Regional Flood Mitigation Efficiency Summary",
    )?;

    // Report 2
    println!("\nReport 2: Top Contractors Performance Ranking");
    let r2 = generate_report2(data);
    write_report(
        "report2_contractor_ranking.csv",
        &r2,
        &["Rank", "Contractor", "TotalCost", "NumProjects", "AvgDelay", "TotalSavings", "ReliabilityIndex", "RiskFlag"],
        "Report 2: Top Contractors Performance Ranking",
    )?;

    // Report 3
    println!("\nReport 3: Annual Project Type Cost Overrun Trends");
    let r3 = generate_report3(data);
    write_report(
        "report3_cost_overrun_trends.csv",
        &r3,
        &["FundingYear", "TypeOfWork", "TotalProjects", "AvgSavings", "OverrunRate", "YoYChange"],
        "Report 3: Annual Project Type Cost Overrun Trends",
    )?;

    // Summary
    println!("\nGenerating summary...");
    let summary = generate_summary(data);
    write_summary(&summary)?;

    // Print final summary report in readable JSON format.
    println!("\nOutputs saved to individual files...\n");
    println!("Summary Stats (summary.json):");
    println!("{}", serde_json::to_string_pretty(&summary).unwrap());

    Ok(())
}

/// Display main menu
fn display_menu() {
    println!("Select Language Implementation:");
    println!("[1] Load the file");
    println!("[2] Generate Reports\n");
}

// ============================================================================
// ENTRY POINT
// ============================================================================

fn main() -> io::Result<()> {
    println!("DATA ANALYSIS PIPELINE FOR FLOOD CONTROL PROJECTS\n");
    println!("Version 2: Comprehensive Single-File Implementation\n");
    
    // Option-wrapped storage for raw and processed datasets.
    let mut raw_records: Option<Vec<RawRecord>> = None;
    let mut processed_data: Option<Vec<ProcessedRecord>> = None;
    
    // Prepare menu loop flag.
    let mut running = true;

    // Repeatedly show menu until user decides to quit.
    while running {
        display_menu();
        let choice = ask_question("Enter choice: ")?;
        println!();

        match choice.as_str() {
            // Option 1: Load and clean dataset.
            "1" => {
                load_file(&mut raw_records, &mut processed_data)?;
            }

            // Option 2: Generate reports using loaded data.
            "2" => {
                generate_reports(&processed_data)?;
                let cont = ask_question("Back to Report Selection (Y/N): ")?;
                running = cont.to_uppercase() == "Y";
                println!();
            }

            // Invalid menu choice handling.
            _ => {
                println!("Invalid choice. Please enter 1 or 2.\n");
            }
        }
    }

    println!("Goodbye!");
    Ok(())
}