library(readr)
library(dplyr)
library(lubridate)
library(jsonlite)

processed_data <- NULL

find_csv_file <- function() {
  # Change if location is different
  if (file.exists("data/dpwh_flood_control_projects.csv")) {
    return("data/dpwh_flood_control_projects.csv")
  }
  stop("CSV file not found: dpwh_flood_control_projects.csv")
}

verify_dir <- function() {
  if (!dir.exists("output")) {
    dir.create("output", recursive = TRUE)
  }
}

load_file <- function() {
  tryCatch({
    raw_data <- NULL
    data_path <- find_csv_file()
    cat("Processing dataset... ")
    raw_data <<- read_csv(data_path, show_col_types = FALSE)
    total_rows <- nrow(raw_data)
    projects <- raw_data %>%
      filter(FundingYear >= 2021, FundingYear <= 2023)
    filtered_rows <- nrow(projects)
    cat(paste0("(", total_rows, " rows loaded, ", filtered_rows, " filtered for 2021-2023)\n\n"))
    projects <- projects %>%
      mutate(
        ApprovedBudgetForContract = parse_number(ApprovedBudgetForContract),
        ContractCost = parse_number(ContractCost),
        StartDate = ymd(StartDate),
        ActualCompletionDate = ymd(ActualCompletionDate)
      ) %>%
      filter(
        !is.na(ApprovedBudgetForContract),
        !is.na(ContractCost),
        !is.na(StartDate),
        !is.na(ActualCompletionDate)
      ) %>%
      mutate(
        CostSavings = ApprovedBudgetForContract - ContractCost,
        CompletionDelayDays = as.numeric(difftime(ActualCompletionDate, StartDate, units = "days"))
      ) %>%
      filter(
        ApprovedBudgetForContract < 1e12,
        ContractCost < 1e12
      )
    processed_data <<- projects
  }, error = function(e) {
    cat(paste0("[Error] could not load file: ", e$message, "\n\n"))
  })
}

create_report1 <- function() {
  if (is.null(processed_data)) {
    cat("[Error] No data loaded. Please load the file first (option 1).\n\n")
    return(NULL)
  }
  report1 <- processed_data %>%
    group_by(Region, MainIsland) %>%
    summarise(
      TotalBudget = sum(ApprovedBudgetForContract, na.rm = TRUE),
      MedianSavings = median(CostSavings, na.rm = TRUE),
      AvgDelay = mean(CompletionDelayDays, na.rm = TRUE),
      HighDelayPct = (sum(CompletionDelayDays > 30, na.rm = TRUE) / n()) * 100,
      .groups = 'drop'
    ) %>%
    mutate(
      EfficiencyScore = (MedianSavings / AvgDelay) * 100,
      EfficiencyScore = ifelse(is.infinite(EfficiencyScore) | is.na(EfficiencyScore), 0, EfficiencyScore),
      EfficiencyScore = pmin(100, pmax(0, EfficiencyScore))
    ) %>%
    arrange(desc(EfficiencyScore))
  verify_dir()
  write.csv(report1, file.path("output", "report1_regional_efficiency.csv"), row.names = FALSE, quote = TRUE)
  cat("\nReport 1: Regional Flood Mitigation Efficiency Summary\n\n")
  cat("Regional Flood Mitigation Efficiency Summary\n")
  cat("(Filtered: 2021-2023 Projects)\n\n")
  print(head(report1, 10))
  cat("\n(Full table exported to report1_regional_efficiency.csv)\n")
  return(report1)
}

create_report2 <- function() {
  if (is.null(processed_data)) {
    cat("[Error] No data loaded. Please load the file first (option 1).\n\n")
    return(NULL)
  }
  report2_data <- processed_data %>%
    group_by(Contractor) %>%
    filter(n() >= 5) %>%
    summarise(
      NumProjects = n(),
      AvgDelay = mean(CompletionDelayDays, na.rm = TRUE),
      TotalSavings = sum(CostSavings, na.rm = TRUE),
      TotalCost = sum(ContractCost, na.rm = TRUE),
      .groups = 'drop'
    ) %>%
    mutate(
      ReliabilityIndex = (1 - (AvgDelay / 90)) * (TotalSavings / TotalCost) * 100,
      ReliabilityIndex = ifelse(is.infinite(ReliabilityIndex) | is.na(ReliabilityIndex), 0, ReliabilityIndex),
      ReliabilityIndex = pmin(100, ReliabilityIndex),
      RiskFlag = ifelse(ReliabilityIndex < 50, "High Risk", "Low Risk")
    ) %>%
    arrange(desc(TotalCost)) %>%
    head(15) %>%
    mutate(Rank = row_number()) %>%
    select(Rank, Contractor, TotalCost, NumProjects, AvgDelay, TotalSavings, ReliabilityIndex, RiskFlag)
  verify_dir()
  write.csv(report2_data, file.path("output", "report2_contractor_ranking.csv"), row.names = FALSE, quote = TRUE)
  cat("\nReport 2: Top Contractors Performance Ranking\n\n")
  cat("Top Contractors Performance Ranking\n")
  cat("(Top 15 by TotalCost, >=5 Projects)\n\n")
  print(report2_data)
  cat("\n(Full table exported to report2_contractor_ranking.csv)\n")
  return(report2_data)
}

create_report3 <- function() {
  if (is.null(processed_data)) {
    cat("[Error] No data loaded. Please load the file first (option 1).\n\n")
    return(NULL)
  }
  yoy_baseline <- processed_data %>%
    filter(FundingYear == 2021) %>%
    group_by(TypeOfWork) %>%
    summarise(BaselineAvgSavings = mean(CostSavings, na.rm = TRUE), .groups = 'drop')
  report3 <- processed_data %>%
    group_by(FundingYear, TypeOfWork) %>%
    summarise(
      TotalProjects = n(),
      AvgSavings = mean(CostSavings, na.rm = TRUE),
      OverrunRate = (sum(CostSavings < 0, na.rm = TRUE) / n()) * 100,
      .groups = 'drop'
    ) %>%
    left_join(yoy_baseline, by = "TypeOfWork") %>%
    mutate(
      YoYChange = ifelse(FundingYear == 2021, 0, ((AvgSavings - BaselineAvgSavings) / abs(BaselineAvgSavings)) * 100),
      YoYChange = ifelse(is.nan(YoYChange) | is.infinite(YoYChange), 0, YoYChange)
    ) %>%
    select(-BaselineAvgSavings) %>%
    arrange(FundingYear, desc(AvgSavings))
  verify_dir()
  write.csv(report3, file.path("output", "report3_cost_overrun_trends.csv"), row.names = FALSE, quote = TRUE)
  cat("\nReport 3: Annual Project Type Cost Overrun Trends\n\n")
  cat("Annual Project Type Cost Overrun Trends\n")
  cat("(Grouped by FundingYear and TypeOfWork)\n\n")
  print(head(report3, 10))
  cat("\n(Full table exported to report3_cost_overrun_trends.csv)\n")
  return(report3)
}

create_reports <- function() {
  if (is.null(processed_data)) {
    cat("[Error] No data loaded. Please load the file first (option 1).\n\n")
    return()
  }
  cat("\nGenerating reports...\n")
  cat("Outputs saved to individual files...\n")
  create_report1()
  create_report2()
  create_report3()
  create_total_summary()
}

create_total_summary <- function() {
  if (is.null(processed_data)) {
    cat("[Error] No data loaded. Please load the file first (option 1).\n\n")
    return(NULL)
  }
  summary_stats <- list(
    total_number_of_projects = nrow(processed_data),
    total_number_of_contractors = n_distinct(processed_data$Contractor),
    total_provinces_with_projects = n_distinct(processed_data$Province),
    global_average_delay = mean(processed_data$CompletionDelayDays, na.rm = TRUE),
    total_savings = sum(processed_data$CostSavings, na.rm = TRUE)
  )
  verify_dir()
  write_json(summary_stats, file.path("output", "summary.json"), auto_unbox = TRUE, pretty = TRUE)
  
  cat("\nSummary Stats (summary.json):\n")
  cat(toJSON(summary_stats, auto_unbox = TRUE, pretty = TRUE))
  cat("\n")
  return(summary_stats)
}

display_menu <- function() {
  cat("Select Language Implementation:\n")
  cat("[1] Load the file\n")
  cat("[2] Generate Reports\n\n")
}

get_user_input <- function(prompt) {
  cat(prompt)
  input <- readline()
  return(input)
}

main <- function() {
  running <- TRUE
  while (running) {
    display_menu()
    choice <- get_user_input("Enter choice: ")
    cat("\n")
    if (choice == "1") {
      load_file()
    } else if (choice == "2") {
      create_reports()
      continue_choice <- get_user_input("\nBack to Report Selection (Y/N): ")
      cat("\n")
      if (toupper(trimws(continue_choice)) != "Y") {
        running <- FALSE
      }
    } else {
      cat("Invalid choice. Please enter 1 or 2.\n\n")
    }
  }
  cat("Goodbye!\n")
}

if (sys.nframe() == 0) {
  main()
}
