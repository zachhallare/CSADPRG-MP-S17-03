# ******************
# Last names: Campo, Hallare, Lobo, Rebollos
# Language: R
# Paradigm(s): Functional Programming, Procedural Programming
# ******************

accounts <- list()
exchange_rates <- list(PHP = 1.0, USD = 52.0, JPY = 0.4, GBP = 65.0, EUR = 57.0, CNY = 7.2)
annual_interest_rate <- 0.05

trim_input <- function(x) {
  trimws(x, which = "both")
}

get_account_index <- function(name) {
  target <- tolower(name)
  for (i in seq_along(accounts)) {
    if (tolower(accounts[[i]]$name) == target) {
      return(i)
    }
  }
}

get_currency_from_choice <- function(choice) {
  mapping <- c("1" = "PHP", "2" = "USD", "3" = "JPY", "4" = "GBP", "5" = "EUR", "6" = "CNY")
  if (choice %in% names(mapping)) {
    mapping[[choice]]
  } else {}
}

ensure_account_balances <- function(account) {
  currencies <- names(exchange_rates)
  if (is.null(account$balances)) {
    balances <- as.list(rep(0.0, length(currencies)))
    names(balances) <- currencies
    base_currency <- account$currency
    base_balance <- account$balance
    if (!is.null(base_currency) && base_currency %in% currencies) {
      balances[[base_currency]] <- if (!is.null(base_balance)) base_balance else 0.0
    } else if (!is.null(base_balance)) {
      balances[["PHP"]] <- base_balance
    }
    account$balances <- balances
  } else {
    for (currency in currencies) {
      if (is.null(account$balances[[currency]])) {
        account$balances[[currency]] <- 0.0
      }
    }
  }
  account$balance <- NULL
  account$currency <- NULL
  account
}

display_account_balances <- function(account) {
  currencies <- names(exchange_rates)
  cat("\nBalances for ", account$name, ":\n", sep = "")
  for (currency in currencies) {
    amount <- account$balances[[currency]]
    if (is.null(amount)) {
      amount <- 0.0
    }
    cat("  ", currency, ": ", formatC(amount, format = "f", digits = 2), "\n", sep = "")
  }
}

read_numeric <- function(prompt) {
  input <- readline(prompt)
  value <- suppressWarnings(as.numeric(trim_input(input)))
  if (is.na(value)) {} else {
    value
  }
}

ask_return_to_menu <- function() {
  repeat {
    answer <- toupper(trim_input(readline("\nBack to the Main Menu (Y/N): ")))
    if (answer %in% c("Y", "N")) {
      return(answer == "Y")
    }
    cat("Invalid input. Please enter Y or N.\n")
  }
}

register_account <- function() {
  cat("\n--- Register Account Name ---\n")
  name <- trim_input(readline("Account Name: "))
  if (!nzchar(name)) {
    cat("Invalid account name.\n")
    return()
  }
  idx <- get_account_index(name)
  if (!is.na(idx)) {
    cat("Account already exists for ", accounts[[idx]]$name, ".\n", sep = "")
    return()
  }
  currencies <- names(exchange_rates)
  balances <- as.list(rep(0.0, length(currencies)))
  names(balances) <- currencies
  account <- list(name = name, balances = balances)
  accounts <<- c(accounts, list(account))
  cat("Account successfully created for ", name, ".\n", sep = "")
}

deposit_amount <- function() {
  cat("\n--- Deposit Amount ---\n")
  name <- trim_input(readline("Account Name: "))
  idx <- get_account_index(name)
  if (is.na(idx)) {
    cat("Account not found.\n")
    return()
  }
  account <- ensure_account_balances(accounts[[idx]])
  accounts[[idx]] <<- account
  php_balance <- account$balances[["PHP"]]
  cat("Current Balance (PHP): ", formatC(php_balance, format = "f", digits = 2), "\n", sep = "")
  amount <- read_numeric("Deposit Amount: ")
  if (is.na(amount) || amount <= 0) {
    cat("Invalid amount.\n")
    return()
  }
  account$balances[["PHP"]] <- php_balance + amount
  accounts[[idx]] <<- account
  cat("Updated Balance (PHP): ", formatC(account$balances[["PHP"]], format = "f", digits = 2), "\n", sep = "")
}

withdraw_amount <- function() {
  cat("\n--- Withdraw Amount ---\n")
  name <- trim_input(readline("Account Name: "))
  idx <- get_account_index(name)
  if (is.na(idx)) {
    cat("Account not found.\n")
    return()
  }
  account <- ensure_account_balances(accounts[[idx]])
  accounts[[idx]] <<- account
  display_account_balances(account)
  cat("\nSelect currency to withdraw:\n")
  display_currency_menu()
  choice <- trim_input(readline("Currency: "))
  currency <- get_currency_from_choice(choice)
  if (is.na(currency)) {
    cat("Invalid currency selection.\n")
    return()
  }
  amount <- read_numeric("Withdraw Amount: ")
  if (is.na(amount) || amount <= 0) {
    cat("Invalid amount.\n")
    return()
  }
  current_balance <- account$balances[[currency]]
  if (is.null(current_balance)) {
    current_balance <- 0.0
  }
  if (amount > current_balance) {
    cat("Insufficient ", currency, " funds.\n", sep = "")
    return()
  }
  account$balances[[currency]] <- current_balance - amount
  accounts[[idx]] <<- account
  cat("Updated ", currency, " Balance: ", formatC(account$balances[[currency]], format = "f", digits = 2), "\n", sep = "")
}

display_currency_menu <- function() {
  cat("\n[1] Philippine Peso (PHP)\n")
  cat("[2] United States Dollar (USD)\n")
  cat("[3] Japanese Yen (JPY)\n")
  cat("[4] British Pound Sterling (GBP)\n")
  cat("[5] Euro (EUR)\n")
  cat("[6] Chinese Yuan Renminbi (CNY)\n")
}

record_exchange_rate <- function() {
  cat("\n--- Record Exchange Rate ---\n")
  display_currency_menu()
  choice <- trim_input(readline("Select Foreign Currency: "))
  currency <- get_currency_from_choice(choice)
  if (is.na(currency)) {
    cat("Invalid currency selection.\n")
    return()
  }
  if (currency == "PHP") {
    cat("PHP is the base currency.\n")
    return()
  }
  rate <- read_numeric(paste0("Exchange Rate (1 ", currency, " = ? PHP): "))
  if (is.na(rate) || rate <= 0) {
    cat("Invalid rate.\n")
    return()
  }
  exchange_rates[[currency]] <<- rate
  cat("Exchange rate updated: 1 ", currency, " = ", formatC(rate, format = "f", digits = 2), " PHP\n", sep = "")
}

convert_currency <- function(amount, from_currency, to_currency) {
  from_rate <- exchange_rates[[from_currency]]
  to_rate <- exchange_rates[[to_currency]]
  (amount * from_rate) / to_rate
}

currency_exchange <- function() {
  repeat {
    cat("\n--- Foreign Currency Exchange ---\n")
    cat("\nSource Currency Option:\n")
    display_currency_menu()
    source_choice <- trim_input(readline("Source Currency: "))
    source_currency <- get_currency_from_choice(source_choice)
    if (is.na(source_currency)) {
      cat("Invalid currency selection.\n")
      return()
    }
    source_amount <- read_numeric("Source Amount: ")
    if (is.na(source_amount) || source_amount <= 0) {
      cat("Invalid amount.\n")
      return()
    }
    cat("\nExchanged Currency Options:\n")
    display_currency_menu()
    target_choice <- trim_input(readline("Exchange Currency: "))
    target_currency <- get_currency_from_choice(target_choice)
    if (is.na(target_currency)) {
      cat("Invalid currency selection.\n")
      return()
    }
    exchanged_amount <- convert_currency(source_amount, source_currency, target_currency)
    cat("\nExchange Amount: ", formatC(exchanged_amount, format = "f", digits = 2), " ", target_currency, "\n", sep = "")
    answer <- toupper(trim_input(readline("\nConvert another currency (Y/N)? ")))
    if (answer != "Y") {
      break
    }
  }
}

show_interest_amount <- function() {
  cat("\n--- Show Interest Amount ---\n")
  name <- trim_input(readline("Account Name: "))
  idx <- get_account_index(name)
  if (is.na(idx)) {
    cat("Account not found.\n")
    return()
  }
  account <- ensure_account_balances(accounts[[idx]])
  php_balance <- account$balances[["PHP"]]
  cat("Current Balance (PHP): ", formatC(php_balance, format = "f", digits = 2), "\n", sep = "")
  cat("Interest Rate: 5%\n")
  days_input <- trim_input(readline("Total Number of Days: "))
  days <- suppressWarnings(as.integer(days_input))
  if (is.na(days) || days <= 0) {
    cat("Invalid number of days.\n")
    return()
  }
  current_balance <- php_balance
  cat("\n--------------------------------------------------\n")
  cat(sprintf("%-10s | %-15s | %-15s |\n", "Day", "Interest", "Balance"))
  cat("--------------------------------------------------\n")
  for (day in seq_len(days)) {
    interest <- current_balance * (annual_interest_rate / 365)
    current_balance <- current_balance + interest
    cat(sprintf("%-10d | %-15s | %-15s |\n", day, formatC(interest, format = "f", digits = 2), formatC(current_balance, format = "f", digits = 2)))
  }
  cat("--------------------------------------------------\n")
}

display_main_menu <- function() {
  cat("\n========================================\n")
  cat("   BANKING & CURRENCY EXCHANGE APP\n")
  cat("========================================\n")
  cat("Select Transaction:\n")
  cat("[1] Register Account Name\n")
  cat("[2] Deposit Amount\n")
  cat("[3] Withdraw Amount\n")
  cat("[4] Currency Exchange\n")
  cat("[5] Record Exchange Rates\n")
  cat("[6] Show Interest Amount\n")
  cat("[0] Exit\n")
  cat("========================================\n")
}

handle_choice <- function(choice) {
  if (choice == "1") {
    register_account()
  } else if (choice == "2") {
    deposit_amount()
  } else if (choice == "3") {
    withdraw_amount()
  } else if (choice == "4") {
    currency_exchange()
  } else if (choice == "5") {
    record_exchange_rate()
  } else if (choice == "6") {
    show_interest_amount()
  } else {
    cat("Invalid option.\n")
  }
}

main <- function() {
  cat("\nWelcome to the Banking & Currency Exchange Application!\n")
  repeat {
    display_main_menu()
    choice <- trim_input(readline("\nChoose an option: "))
    if (choice == "0") {
      cat("Thank you for using the Banking & Currency Exchange Application. Goodbye!\n")
      break
    }
    if (choice %in% as.character(1:6)) {
      repeat {
        handle_choice(choice)
        if (ask_return_to_menu()) {
          break
        }
      }
    } else {
      cat("Invalid option.\n")
    }
  }
}

main()