# ********************
# Last names: Campo, Hallare, Lobo, Rebollos
# Language: R
# Paradigm(s): Procedural programming, Object-oriented programming
# ********************
suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(lubridate)
  library(jsonlite)
  library(stringr)
})

raw_records <- NULL
processed_data <- NULL

get_script_dir <- function() {
  cmd_args <- commandArgs(trailingOnly = FALSE)
  file_prefix <- "--file="
  script_path <- sub(file_prefix, "", cmd_args[grepl(file_prefix, cmd_args)])
  if (length(script_path) > 0) {
    return(dirname(normalizePath(script_path[1])))
  }
  if (!is.null(sys.frames()[[1]]$ofile)) {
    return(dirname(normalizePath(sys.frames()[[1]]$ofile)))
  }
  normalizePath(getwd())
}

BASE_DIR <- get_script_dir()
DIRS <- list(
  data = file.path(BASE_DIR, "dpwh_flood_control_projects.csv"),
  output = file.path(BASE_DIR, "output")
)

ensure_dir <- function(dir_path) {
  if (!dir.exists(dir_path)) {
    dir.create(dir_path, recursive = TRUE, showWarnings = FALSE)
  }
}

format_number <- function(value, decimals = 2) {
  value <- ifelse(is.na(value), 0, value)
  formatC(value, format = "f", digits = decimals, big.mark = ",", drop0trailing = FALSE)
}

format_large_number <- function(value) {
  value <- ifelse(is.na(value), 0, value)
  format(round(value), big.mark = ",", scientific = FALSE)
}

parse_number_safe <- function(value) {
  if (is.null(value) || is.na(value)) {
    return(NA_real_)
  }

  cleaned <- gsub(",", "", str_trim(as.character(value)))
  if (cleaned == "" || toupper(cleaned) == "N/A") {
    return(NA_real_)
  }

  numeric_pattern <- "^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$"
  if (!grepl(numeric_pattern, cleaned)) {
    return(NA_real_)
  }

  parsed <- suppressWarnings(as.numeric(cleaned))
  ifelse(is.na(parsed) || is.infinite(parsed), NA_real_, parsed)
}

parse_date_safe <- function(value) {
  if (is.null(value) || is.na(value)) {
    return(NA_Date_)
  }
  value <- str_trim(as.character(value))
  if (value == "" || toupper(value) == "N/A") {
    return(NA_Date_)
  }
  parsed <- suppressWarnings(lubridate::ymd(value))
  if (is.na(parsed)) NA_Date_ else parsed
}

validate_year <- function(year) {
  !is.na(year) && year >= 2021 && year <= 2023
}

first_non_empty <- function(values, fallback = "Unknown") {
  values <- values[!is.na(values) & str_trim(values) != ""]
  if (length(values) == 0) {
    return(fallback)
  }
  values[1]
}

clean_record <- function(record, index) {
  errors <- character()
  region <- str_trim(as.character(record$Region))
  main_island <- str_trim(as.character(record$MainIsland))
  funding_year <- suppressWarnings(as.integer(record$FundingYear))
  approved_budget <- parse_number_safe(record$ApprovedBudgetForContract)
  contract_cost <- parse_number_safe(record$ContractCost)

  if (is.na(region) || region == "") {
    errors <- c(errors, "Missing Region")
  }
  if (is.na(main_island) || main_island == "") {
    errors <- c(errors, "Missing MainIsland")
  }
  if (!validate_year(funding_year)) {
    errors <- c(errors, sprintf("Invalid FundingYear: %s", as.character(record$FundingYear)))
  }
  if (is.na(approved_budget)) {
    errors <- c(errors, "Invalid ApprovedBudgetForContract")
  }
  if (is.na(contract_cost)) {
    errors <- c(errors, "Invalid ContractCost")
  }

  if (length(errors) > 0) {
    return(list(record = NULL, error = sprintf("Row %d: %s", index + 1, paste(errors, collapse = "; "))))
  }

  start_date <- parse_date_safe(record$StartDate)
  completion_date <- parse_date_safe(record$ActualCompletionDate)
  latitude <- parse_number_safe(record$ProjectLatitude)
  longitude <- parse_number_safe(record$ProjectLongitude)
  province <- str_trim(as.character(record$Province))
  contractor <- str_trim(as.character(record$Contractor))
  type_of_work <- str_trim(as.character(record$TypeOfWork))

  if (is.na(province)) province <- ""
  if (is.na(contractor) || contractor == "") contractor <- "Unknown"
  if (is.na(type_of_work) || type_of_work == "") type_of_work <- "Unknown"

  tibble_record <- tibble(
    Region = region,
    MainIsland = main_island,
    FundingYear = funding_year,
    ApprovedBudgetForContract = approved_budget,
    ContractCost = contract_cost,
    StartDate = start_date,
    ActualCompletionDate = completion_date,
    ProjectLatitude = latitude,
    ProjectLongitude = longitude,
    Province = province,
    Contractor = contractor,
    TypeOfWork = type_of_work
  )

  list(record = tibble_record, error = NULL)
}

clean_records <- function(data_frame) {
  cleaned <- list()
  errors <- character()
  for (idx in seq_len(nrow(data_frame))) {
    result <- clean_record(data_frame[idx, ], idx)
    if (is.null(result$record)) {
      errors <- c(errors, result$error)
    } else {
      cleaned[[length(cleaned) + 1]] <- result$record
    }
  }

  cleaned_df <- if (length(cleaned) > 0) bind_rows(cleaned) else tibble()
  list(records = cleaned_df, errors = errors)
}

add_derived_fields <- function(df) {
  df %>%
    mutate(
      CostSavings = ApprovedBudgetForContract - ContractCost,
      CompletionDelayDays = if_else(
        !is.na(StartDate) & !is.na(ActualCompletionDate),
        as.numeric(difftime(ActualCompletionDate, StartDate, units = "days")),
        NA_real_
      )
    )
}

impute_coordinates <- function(df) {
  province_means <- df %>%
    filter(Province != "") %>%
    group_by(Province) %>%
    summarise(
      AvgLat = if (all(is.na(ProjectLatitude))) NA_real_ else mean(ProjectLatitude, na.rm = TRUE),
      AvgLng = if (all(is.na(ProjectLongitude))) NA_real_ else mean(ProjectLongitude, na.rm = TRUE),
      .groups = "drop"
    )

  df %>%
    left_join(province_means, by = "Province") %>%
    mutate(
      ProjectLatitude = if_else(is.na(ProjectLatitude), AvgLat, ProjectLatitude),
      ProjectLongitude = if_else(is.na(ProjectLongitude), AvgLng, ProjectLongitude)
    ) %>%
    select(-AvgLat, -AvgLng)
}

filter_year_range <- function(df, start_year, end_year) {
  df %>% filter(FundingYear >= start_year, FundingYear <= end_year)
}

load_file <- function() {
  tryCatch({
    csv_path <- DIRS$data
    cat("Processing dataset...\n")
    cat(sprintf("Reading file: %s\n", csv_path))

    if (!file.exists(csv_path)) {
      stop("CSV file not found: dpwh_flood_control_projects.csv")
    }

    raw_records <<- suppressMessages(read_csv(csv_path, show_col_types = FALSE, progress = FALSE))
    cat(sprintf("Raw records loaded: %d\n", nrow(raw_records)))

    cleaned_result <- clean_records(raw_records)
    if (length(cleaned_result$errors) > 0) {
      cat(sprintf("\nValidation errors detected: %d invalid records\n", length(cleaned_result$errors)))
      for (msg in head(cleaned_result$errors, 10)) {
        cat(sprintf("  - %s\n", msg))
      }
      if (length(cleaned_result$errors) > 10) {
        remaining <- length(cleaned_result$errors) - 10
        cat(sprintf("  ... and %d more errors\n", remaining))
      }
      cat(sprintf("Valid records: %d out of %d\n", nrow(cleaned_result$records), nrow(raw_records)))
    }

    if (nrow(cleaned_result$records) == 0) {
      stop("No valid records found in dataset")
    }

    enriched <- cleaned_result$records %>%
      add_derived_fields() %>%
      impute_coordinates() %>%
      filter_year_range(2021, 2023)

    processed_data <<- enriched
    cat(sprintf("(%d rows loaded, %d filtered for 2021-2023)\n\n", nrow(raw_records), nrow(processed_data)))
    TRUE
  }, error = function(e) {
    cat(sprintf("Error loading file: %s\n\n", e$message))
    FALSE
  })
}

write_report <- function(filename, data, headers) {
  ensure_dir(DIRS$output)
  file_path <- file.path(DIRS$output, filename)
  write.csv(data[, headers], file_path, row.names = FALSE, quote = TRUE)
  cat(sprintf("Report written to: %s\n", file_path))
  file_path
}

generate_report1 <- function(records) {
  grouped <- records %>%
    group_by(Region) %>%
    summarise(
      MainIsland = first_non_empty(MainIsland),
      TotalBudget = sum(ApprovedBudgetForContract, na.rm = TRUE),
      MedianSavings = median(CostSavings, na.rm = TRUE),
      AvgDelay = mean(CompletionDelayDays, na.rm = TRUE),
      HighDelayPct = if (n() == 0) 0 else (sum(CompletionDelayDays > 30, na.rm = TRUE) / n()) * 100,
      .groups = "drop"
    ) %>%
    mutate(
      EfficiencyScore = if_else(
        !is.na(AvgDelay) & AvgDelay > 0,
        pmin(100, pmax(0, (MedianSavings / AvgDelay) * 100)),
        0
      )
    ) %>%
    arrange(desc(EfficiencyScore))

  grouped %>%
    mutate(
      TotalBudget = format_large_number(TotalBudget),
      MedianSavings = format_number(MedianSavings),
      AvgDelay = format_number(AvgDelay),
      HighDelayPct = format_number(HighDelayPct),
      EfficiencyScore = format_number(EfficiencyScore)
    )
}

generate_report2 <- function(records) {
  stats <- records %>%
    group_by(Contractor) %>%
    filter(n() >= 5) %>%
    summarise(
      NumProjects = n(),
      AvgDelay = mean(CompletionDelayDays, na.rm = TRUE),
      TotalSavings = sum(CostSavings, na.rm = TRUE),
      TotalCost = sum(ContractCost, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      ReliabilityIndex = if_else(
        TotalCost > 0,
        pmin(
          100,
          pmax(0, pmax(0, 1 - (AvgDelay / 90)) * (TotalSavings / TotalCost) * 100)
        ),
        0
      ),
      RiskFlag = if_else(ReliabilityIndex < 50, "High Risk", "Low Risk")
    ) %>%
    arrange(desc(TotalCost)) %>%
    slice_head(n = 15) %>%
    mutate(Rank = row_number()) %>%
    select(Rank, Contractor, TotalCost, NumProjects, AvgDelay, TotalSavings, ReliabilityIndex, RiskFlag)

  stats %>%
    mutate(
      TotalCost = format_large_number(TotalCost),
      AvgDelay = format_number(AvgDelay),
      TotalSavings = format_large_number(TotalSavings),
      ReliabilityIndex = format_number(ReliabilityIndex)
    )
}

generate_report3 <- function(records) {
  year_type_avgs <- records %>%
    group_by(FundingYear, TypeOfWork) %>%
    summarise(
      TotalProjects = n(),
      AvgSavings = mean(CostSavings, na.rm = TRUE),
      OverrunRate = (sum(CostSavings < 0, na.rm = TRUE) / n()) * 100,
      .groups = "drop"
    )

  baseline <- year_type_avgs %>%
    filter(FundingYear == 2021) %>%
    select(TypeOfWork, BaselineAvgSavings = AvgSavings)

  year_type_avgs %>%
    left_join(baseline, by = "TypeOfWork") %>%
    mutate(
      YoYChange = if_else(
        FundingYear == 2021 | is.na(BaselineAvgSavings) | BaselineAvgSavings == 0,
        0,
        ((AvgSavings - BaselineAvgSavings) / abs(BaselineAvgSavings)) * 100
      ),
      YoYChange = if_else(is.infinite(YoYChange) | is.nan(YoYChange), 0, YoYChange)
    ) %>%
    arrange(FundingYear, desc(AvgSavings)) %>%
    mutate(
      AvgSavings = format_number(AvgSavings),
      OverrunRate = format_number(OverrunRate),
      YoYChange = format_number(YoYChange)
    ) %>%
    select(FundingYear, TypeOfWork, TotalProjects, AvgSavings, OverrunRate, YoYChange)
}

write_summary <- function(records) {
  ensure_dir(DIRS$output)
  contractor_values <- records$Contractor
  province_values <- records$Province
  delays <- records$CompletionDelayDays

  metadata <- list(
    total_projects = nrow(records),
    total_contractors = length(unique(contractor_values[!is.na(contractor_values) & contractor_values != "Unknown"])),
    total_provinces = length(unique(province_values[!is.na(province_values) & province_values != ""])),
    global_avg_delay = {
      avg_delay <- mean(delays, na.rm = TRUE)
      if (is.nan(avg_delay) || is.na(avg_delay)) 0 else round(avg_delay, 1)
    },
    total_savings = round(sum(records$CostSavings, na.rm = TRUE))
  )

  file_path <- file.path(DIRS$output, "summary.json")
  write_json(metadata, file_path, pretty = TRUE, auto_unbox = TRUE)
  cat(sprintf("Summary written to: %s\n", file_path))
  metadata
}

generate_reports <- function() {
  if (is.null(processed_data) || nrow(processed_data) == 0) {
    cat("Error: No data loaded. Please load the file first (option 1).\n\n")
    return()
  }

  cat("Generating reports...\n\n")

  report1 <- generate_report1(processed_data)
  write_report(
    "report1_regional_efficiency.csv",
    report1,
    c("Region", "MainIsland", "TotalBudget", "MedianSavings", "AvgDelay", "HighDelayPct", "EfficiencyScore")
  )

  report2 <- generate_report2(processed_data)
  write_report(
    "report2_contractor_ranking.csv",
    report2,
    c("Rank", "Contractor", "TotalCost", "NumProjects", "AvgDelay", "TotalSavings", "ReliabilityIndex", "RiskFlag")
  )

  report3 <- generate_report3(processed_data)
  write_report(
    "report3_cost_overrun_trends.csv",
    report3,
    c("FundingYear", "TypeOfWork", "TotalProjects", "AvgSavings", "OverrunRate", "YoYChange")
  )

  summary_data <- write_summary(processed_data)
  cat("\nSummary Stats (summary.json):\n")
  cat(jsonlite::toJSON(summary_data, auto_unbox = TRUE, pretty = TRUE))
  cat("\n\nOutputs saved to individual files...\n\n")
}

ask_question <- function(prompt) {
  cat(prompt)
  readline()
}

display_menu <- function() {
  cat("Select Language Implementation:\n")
  cat("[1] Load the file\n")
  cat("[2] Generate Reports\n\n")
}

main <- function(auto = FALSE) {
  cat("DATA ANALYSIS PIPELINE FOR FLOOD CONTROL PROJECTS\n\n")
  cat("Version 2 (R): Comprehensive Single-File Implementation\n\n")

  if (auto) {
    if (load_file()) {
      generate_reports()
    }
    cat("Goodbye!\n")
    return()
  }

  running <- TRUE
  while (running) {
    display_menu()
    choice <- ask_question("Enter choice: ")
    cat("\n")
    if (choice == "1") {
      load_file()
    } else if (choice == "2") {
      generate_reports()
      continue_choice <- ask_question("Back to Report Selection (Y/N): ")
      cat("\n")
      if (toupper(str_trim(continue_choice)) != "Y") {
        running <- FALSE
      }
    } else {
      cat("Invalid choice. Please enter 1 or 2.\n\n")
    }
  }
  cat("Goodbye!\n")
}

# I hated having to wait over and over to input the same thing unlike C
# So I added ts
if (sys.nframe() == 0) {
  args <- commandArgs(trailingOnly = TRUE)
  auto_mode <- any(tolower(args) %in% c("--auto", "-a"))
  invisible(main(auto = auto_mode))
}
