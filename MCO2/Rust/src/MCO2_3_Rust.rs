// ********************
// Last names: Campo, Hallare, Lobo, Rebollos
// Language: Rust
// Paradigm(s): Imperative, Functional
// ********************

use std::collections::{HashMap, HashSet};
use std::error::Error;
use std::fs::File;
use std::io::{self, Write};
use chrono::NaiveDate;
use csv::{ReaderBuilder, WriterBuilder};
use serde::Deserialize;
use serde_json::json;
use prettytable::{Table, Row, Cell, row}; // for table outputs

#[derive(Debug, Deserialize)]
struct ProjectRecord {
    #[serde(rename = "Region")]
    region: String,
    #[serde(rename = "MainIsland")]
    main_island: String,
    #[serde(rename = "Province")]
    province: String,
    #[serde(rename = "FundingYear")]
    funding_year: String,
    #[serde(rename = "TypeOfWork")]
    type_of_work: String,
    #[serde(rename = "Contractor")]
    contractor: String,
    #[serde(rename = "ApprovedBudgetForContract")]
    approved_budget: String,
    #[serde(rename = "ContractCost")]
    contract_cost: String,
    #[serde(rename = "StartDate")]
    start_date: String,
    #[serde(rename = "ActualCompletionDate")]
    actual_completion_date: String,
}

#[derive(Debug, Clone)]
struct ProcessedProject {
    region: String,
    main_island: String,
    province: String,
    funding_year: i32,
    type_of_work: String,
    contractor: String,
    approved_budget: f64,
    contract_cost: f64,
    cost_savings: f64,
    completion_delay_days: i32,
}

fn main() -> Result<(), Box<dyn Error>> {
    loop {
        println!("\nSelect Language Implementation:");
        println!("[1] Load the file");
        println!("[2] Generate Reports");
        println!();
        print!("Enter choice: ");
        io::stdout().flush()?;

        let mut choice = String::new();
        io::stdin().read_line(&mut choice)?;
        let choice = choice.trim();

        match choice {
            "1" => load_and_process_data()?,
            "2" => {
                generate_reports()?;
                print!("\nBack to Report Selection (Y/N): ");
                io::stdout().flush()?;
                let mut response = String::new();
                io::stdin().read_line(&mut response)?;
                let response = response.trim().to_lowercase();
                if response != "y" && response != "yes" {
                    break;
                }
            }
            _ => println!("Invalid choice. Please enter 1 or 2."),
        }
    }

    Ok(())
}

fn clean_parse_f64(s: &str) -> Option<f64> {
    let cleaned = s.trim()
        .replace(",", "")
        .replace("PHP", "")
        .replace("₱", "")
        .replace("\"", "")
        .replace(" ", "");
    cleaned.parse::<f64>().ok()
}

fn clean_parse_i32(s: &str) -> Option<i32> {
    s.trim().parse::<i32>().ok()
}

fn format_number_with_commas(n: f64) -> String {
    let rounded = (n * 100.0).round() / 100.0;
    let n_abs = rounded.abs();
    let n_int = n_abs as i64;
    let n_frac = ((n_abs - n_int as f64) * 100.0).round() as i64;
    let sign = if n < 0.0 { "-" } else { "" };
    
    let s = n_int.to_string();
    let mut result = String::new();
    let mut count = 0;
    for ch in s.chars().rev() {
        if count > 0 && count % 3 == 0 {
            result.push(',');
        }
        result.push(ch);
        count += 1;
    }
    let result: String = result.chars().rev().collect();
    if n_frac == 0 && n_int > 1000 {
        // For large integers, don't show .00
        format!("{}{}", sign, result)
    } else {
        format!("{}{}.{:02}", sign, result, n_frac)
    }
}

fn format_number_csv(n: f64) -> String {
    // CSV always shows 2 decimals as per spec
    let rounded = (n * 100.0).round() / 100.0;
    let n_abs = rounded.abs();
    let n_int = n_abs as i64;
    let n_frac = ((n_abs - n_int as f64) * 100.0).round() as i64;
    let sign = if n < 0.0 { "-" } else { "" };
    
    let s = n_int.to_string();
    let mut result = String::new();
    let mut count = 0;
    for ch in s.chars().rev() {
        if count > 0 && count % 3 == 0 {
            result.push(',');
        }
        result.push(ch);
        count += 1;
    }
    let result: String = result.chars().rev().collect();
    format!("{}{}.{:02}", sign, result, n_frac)
}

fn load_and_process_data() -> Result<(), Box<dyn Error>> {
    println!("Processing dataset...");

    let file = File::open("dpwh_flood_control_projects.csv")?;
    let mut rdr = ReaderBuilder::new().flexible(true).from_reader(file);
    let mut total_rows = 0usize;

    for result in rdr.deserialize() {
        match result {
            Ok::<ProjectRecord, csv::Error>(_record) => total_rows += 1,
            Err(_) => {},
        }
    }

    // second pass
    let file = File::open("dpwh_flood_control_projects.csv")?;
    let mut rdr = ReaderBuilder::new().flexible(true).from_reader(file);
    let mut filtered_rows = 0usize;
    for result in rdr.deserialize() {
        if let Ok(record) = result {
            let record: ProjectRecord = record;
            if let Some(year) = clean_parse_i32(&record.funding_year) {
                if (2021..=2023).contains(&year) {
                    filtered_rows += 1;
                }
            }
        }
    }
    
    println!("({} rows loaded, {} filtered for 2021-2023)", 
            format_number_with_commas(total_rows as f64), 
            format_number_with_commas(filtered_rows as f64));
    Ok(())
}

fn generate_reports() -> Result<(), Box<dyn Error>> {
    println!("\nGenerating reports...");
    let projects = load_projects()?;
    println!("Outputs saved to individual files.");
    println!();

    generate_report1(&projects)?;
    generate_report2(&projects)?;
    generate_report3(&projects)?;
    generate_summary(&projects)?;

    Ok(())
}

fn load_projects() -> Result<Vec<ProcessedProject>, Box<dyn Error>> {
    let file = File::open("dpwh_flood_control_projects.csv")?;
    let mut rdr = ReaderBuilder::new().flexible(true).from_reader(file);
    let mut projects = Vec::new();
    let mut skipped_count = 0usize;

    for result in rdr.deserialize() {
        let record: ProjectRecord = match result {
            Ok(r) => r,
            Err(_) => { skipped_count += 1; continue; }
        };

        let funding_year = match clean_parse_i32(&record.funding_year) {
            Some(y) => y,
            None => { skipped_count += 1; continue; }
        };
        if funding_year < 2021 || funding_year > 2023 { continue; }

        let approved_budget = match clean_parse_f64(&record.approved_budget) {
            Some(b) => b, None => { skipped_count += 1; continue; }
        };
        let contract_cost = match clean_parse_f64(&record.contract_cost) {
            Some(c) => c, None => { skipped_count += 1; continue; }
        };

        let cost_savings = approved_budget - contract_cost;
        let completion_delay = calculate_delay(&record.start_date, &record.actual_completion_date);

        projects.push(ProcessedProject {
            region: record.region,
            main_island: record.main_island,
            province: record.province,
            funding_year,
            type_of_work: record.type_of_work,
            contractor: record.contractor,
            approved_budget,
            contract_cost,
            cost_savings,
            completion_delay_days: completion_delay,
        });
    }

    if skipped_count > 0 {
        println!("(Cleaned dataset: {} invalid rows skipped)", skipped_count);
    }
    Ok(projects)
}

fn calculate_delay(start_date: &str, completion_date: &str) -> i32 {
    let start = NaiveDate::parse_from_str(start_date.trim(), "%Y-%m-%d").ok();
    let end = NaiveDate::parse_from_str(completion_date.trim(), "%Y-%m-%d").ok();
    match (start, end) { (Some(s), Some(e)) => (e - s).num_days() as i32, _ => 0 }
}

fn median_f64(values: &mut [f64]) -> f64 {
    if values.is_empty() { return 0.0; }
    values.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let n = values.len();
    if n % 2 == 1 { values[n / 2] } else { (values[n / 2 - 1] + values[n / 2]) / 2.0 }
}

fn generate_report1(projects: &[ProcessedProject]) -> Result<(), Box<dyn Error>> {
    let mut regional_data: HashMap<(String, String), Vec<&ProcessedProject>> = HashMap::new();
    for project in projects {
        regional_data.entry((project.region.clone(), project.main_island.clone()))
            .or_insert_with(Vec::new).push(project);
    }

    let mut report_data = Vec::new();
    for ((region, main_island), projs) in regional_data {
        let total_budget: f64 = projs.iter().map(|p| p.approved_budget).sum();
        let mut savings: Vec<f64> = projs.iter().map(|p| p.cost_savings).collect();
        let median_savings = median_f64(&mut savings);
        let avg_delay = if projs.is_empty() { 0.0 } else {
            projs.iter().map(|p| p.completion_delay_days as f64).sum::<f64>() / projs.len() as f64
        };
        let high_delay_pct = if projs.is_empty() { 0.0 } else {
            projs.iter().filter(|p| p.completion_delay_days > 30).count() as f64 / projs.len() as f64 * 100.0
        };
        let efficiency_score = if avg_delay > 0.0 {
            ((median_savings / avg_delay) * 100.0).clamp(0.0, 100.0)
        } else { 100.0 };
        report_data.push((region, main_island, total_budget, median_savings, avg_delay, high_delay_pct, efficiency_score));
    }
    report_data.sort_by(|a, b| b.6.partial_cmp(&a.6).unwrap());

    let mut wtr = WriterBuilder::new().from_path("report1_regional_summary.csv")?;
    wtr.write_record(["Region","Mainland","TotalBudget","MedianSavings","AvgDelay","HighDelayPct","EfficiencyScore"])?;
    for row in &report_data {
        wtr.write_record([
            &row.0, &row.1,
            &format_number_csv(row.2),
            &format_number_csv(row.3),
            &format_number_csv(row.4),
            &format_number_csv(row.5),
            &format_number_csv(row.6)
        ])?;
    }
    wtr.flush()?;

    // Pretty print table
    println!("\nReport 1: Regional Flood Mitigation Efficiency Summary");
    println!("Regional Flood Mitigation Efficiency Summary");
    println!("(Filtered: 2021-2023 Projects)");
    println!();
    let mut table = Table::new();
    table.add_row(row!["Region","Mainland","TotalBudget","MedianSavings","AvgDelay","HighDelayPct","EfficiencyScore"]);
    for r in &report_data {
        table.add_row(Row::new(vec![
            Cell::new(&r.0), Cell::new(&r.1),
            Cell::new(&format_number_with_commas(r.2)),
            Cell::new(&format_number_with_commas(r.3)),
            Cell::new(&format_number_with_commas(r.4)),
            Cell::new(&format_number_with_commas(r.5)),
            Cell::new(&format_number_with_commas(r.6)),
        ]));
    }
    table.printstd();
    println!("\n(Full table exported to report1_regional_summary.csv)");
    Ok(())
}

fn generate_report2(projects: &[ProcessedProject]) -> Result<(), Box<dyn Error>> {
    let mut contractor_data: HashMap<String, Vec<&ProcessedProject>> = HashMap::new();
    for p in projects {
        contractor_data.entry(p.contractor.clone()).or_insert_with(Vec::new).push(p);
    }

    let mut report_data = Vec::new();
    for (contractor, projs) in contractor_data {
        if projs.len() < 5 { continue; }
        let total_cost: f64 = projs.iter().map(|p| p.contract_cost).sum();
        let avg_delay = projs.iter().map(|p| p.completion_delay_days as f64).sum::<f64>() / projs.len() as f64;
        let total_savings: f64 = projs.iter().map(|p| p.cost_savings).sum();
        let cost_eff = if total_cost > 0.0 { total_savings / total_cost } else { 0.0 };
        let rel_index = ((1.0 - (avg_delay / 90.0)) * cost_eff * 100.0).clamp(0.0, 100.0);
        let risk = if rel_index < 50.0 { "High Risk" } else { "Low Risk" };
        report_data.push((contractor, total_cost, projs.len(), avg_delay, total_savings, rel_index, risk.to_string()));
    }

    report_data.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    report_data.truncate(15);
    let mut wtr = WriterBuilder::new().from_path("report2_contractor_ranking.csv")?;
    wtr.write_record(["Rank","Contractor","TotalCost","NumProjects","AvgDelay","TotalSavings","ReliabilityIndex","RiskFlag"])?;
    for (i, r) in report_data.iter().enumerate() {
        wtr.write_record([
            &(i+1).to_string(), &r.0,
            &format_number_csv(r.1), &r.2.to_string(),
            &format_number_csv(r.3), &format_number_csv(r.4),
            &format_number_csv(r.5), &r.6
        ])?;
    }
    wtr.flush()?;

    println!("\nReport 2: Top Contractors Performance Ranking");
    println!("Top Contractors Performance Ranking");
    println!("(Top 15 by TotalCost, >=5 Projects)");
    println!();
    let mut table = Table::new();
    table.add_row(row!["Rank","Contractor","TotalCost","NumProjects","AvgDelay","TotalSavings","ReliabilityIndex","RiskFlag"]);
    for (i, r) in report_data.iter().enumerate() {
        table.add_row(Row::new(vec![
            Cell::new(&(i+1).to_string()),
            Cell::new(&r.0),
            Cell::new(&format_number_with_commas(r.1)),
            Cell::new(&r.2.to_string()),
            Cell::new(&format_number_with_commas(r.3)),
            Cell::new(&format_number_with_commas(r.4)),
            Cell::new(&format_number_with_commas(r.5)),
            Cell::new(&r.6),
        ]));
    }
    table.printstd();
    println!("\n(Full table exported to report2_contractor_ranking.csv)");
    Ok(())
}

fn generate_report3(projects: &[ProcessedProject]) -> Result<(), Box<dyn Error>> {
    let mut year_type_data: HashMap<(i32, String), Vec<&ProcessedProject>> = HashMap::new();
    for p in projects {
        year_type_data.entry((p.funding_year, p.type_of_work.clone()))
            .or_insert_with(Vec::new).push(p);
    }

    let mut baseline: HashMap<String, f64> = HashMap::new();
    for ((year, t), v) in &year_type_data {
        if *year == 2021 && !v.is_empty() {
            baseline.insert(t.clone(), v.iter().map(|p| p.cost_savings).sum::<f64>() / v.len() as f64);
        }
    }

    let mut report_data = Vec::new();
    for ((year, t), v) in &year_type_data {
        let total = v.len();
        let avg_sav = if total == 0 { 0.0 } else { v.iter().map(|p| p.cost_savings).sum::<f64>() / total as f64 };
        let overrun = if total == 0 { 0.0 } else { v.iter().filter(|p| p.cost_savings < 0.0).count() as f64 / total as f64 * 100.0 };
        let yoy = if *year == 2021 {
            0.0
        } else {
            let base = baseline.get(t).copied().unwrap_or(avg_sav);
            if base.abs() > f64::EPSILON { ((avg_sav - base) / base) * 100.0 } else { 0.0 }
        };
        report_data.push((*year, t.clone(), total, avg_sav, overrun, yoy));
    }

    report_data.sort_by(|a,b| a.0.cmp(&b.0).then(b.3.partial_cmp(&a.3).unwrap()));
    let mut wtr = WriterBuilder::new().from_path("report3_annual_trends.csv")?;
    wtr.write_record(["FundingYear","TypeOfWork","TotalProjects","AvgSavings","OverrunRate","YoYChange"])?;
    for r in &report_data {
        wtr.write_record([
            &r.0.to_string(), &r.1,
            &r.2.to_string(), &format_number_csv(r.3),
            &format_number_csv(r.4), &format_number_csv(r.5)
        ])?;
    }
    wtr.flush()?;

    println!("\nReport 3: Annual Project Type Cost Overrun Trends");
    println!("Annual Project Type Cost Overrun Trends");
    println!("(Grouped by FundingYear and TypeOfWork)");
    println!();
    let mut table = Table::new();
    table.add_row(row!["FundingYear","TypeOfWork","TotalProjects","AvgSavings","OverrunRate","YoYChange"]);
    for r in &report_data {
        table.add_row(Row::new(vec![
            Cell::new(&r.0.to_string()),
            Cell::new(&r.1),
            Cell::new(&r.2.to_string()),
            Cell::new(&format_number_with_commas(r.3)),
            Cell::new(&format_number_with_commas(r.4)),
            Cell::new(&format_number_with_commas(r.5)),
        ]));
    }
    table.printstd();
    println!("\n(Full table exported to report3_annual_trends.csv)");
    Ok(())
}

fn generate_summary(projects: &[ProcessedProject]) -> Result<(), Box<dyn Error>> {
    let total_projects = projects.len();
    let contractors: HashSet<_> = projects.iter().map(|p| p.contractor.clone()).collect();
    let provinces: HashSet<_> = projects.iter().map(|p| p.province.clone()).collect();
    let total_delay: f64 = projects.iter().map(|p| p.completion_delay_days as f64).sum();
    let global_avg_delay = if total_projects == 0 { 0.0 } else { total_delay / total_projects as f64 };
    let total_savings: f64 = projects.iter().map(|p| p.cost_savings).sum();

    let summary = json!({
        "total_projects": total_projects,
        "total_contractors": contractors.len(),
        "total_provinces": provinces.len(),
        "global_avg_delay": (global_avg_delay * 100.0).round() / 100.0,
        "total_savings": (total_savings * 100.0).round() / 100.0,
    });

    let mut file = File::create("summary.json")?;
    file.write_all(serde_json::to_string_pretty(&summary)?.as_bytes())?;
    println!("\nSummary Stats (summary.json):");
    println!("{{\"global_avg_delay\": {:.1}, \"total_savings\": {:.0}}}", global_avg_delay, total_savings);
    Ok(())
}


