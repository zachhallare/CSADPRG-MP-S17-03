run_cli <- function() {
  supported <- c("PHP", "USD", "JPY", "GBP", "EUR", "CNY")
  base <- "PHP"
  rates <- setNames(rep(NA_real_, length(supported)), supported)
  rates[[base]] <- 1

  # TODO: UPDATE THE MENU
  while (TRUE) {
    cat("\n==============================\n")
    cat("  Currency CLI (PHP base)\n")
    cat("==============================\n\n")
    cat("Choose an option:\n")
    cat("  1) Register or update exchange rate\n")
    cat("  2) Show exchange rates\n")
    cat("  3) Convert currency\n")
    cat("  0) Exit\n\n")

    choice_input <- readline("[ ] Enter choice: ")
    choice <- suppressWarnings(as.integer(trimws(choice_input)))

    if (is.na(choice)) {
      cat("\n[Error] Please enter a number corresponding to a menu option.\n")
      readline("\n[ ] Press Enter to continue...")
      next
    }

    if (choice == 0) {
      cat("\n[ ] Exiting. Goodbye!\n")
      break
    }

    if (choice == 1) {
      cat("\n[ ] Supported currencies: USD, JPY, GBP, EUR, CNY\n")
      currency <- toupper(trimws(readline("[ ] Enter foreign currency code:")))
      if (!(currency %in% supported)) {
        cat(sprintf("\n[Error] Unsupported currency: %s\n", currency))
        readline("\n[ ] Press Enter to continue...")
        next
      }

      if (currency == base) {
        cat("\n[Error] Base currency (PHP) is fixed at 1.\n")
        readline("\n[ ] Press Enter to continue...")
        next
      }

      rate_input <- readline("[ ] Enter rate (PHP per 1 unit): ")
      rate <- suppressWarnings(as.numeric(trimws(rate_input)))

      if (is.na(rate) || !is.finite(rate) || rate <= 0) {
        cat("\n[Error] Rate must be a positive number.\n")
        readline("\n[ ] Press Enter to continue...")
        next
      }

      old_rate <- rates[[currency]]
      rates[[currency]] <- rate

      if (is.na(old_rate)) {
        cat(sprintf("\n[ ] Registered %s rate: 1 %s = %.4f PHP\n", currency, currency, rate))
      } else {
        cat(sprintf("\n[ ] Updated %s rate: %.4f PHP -> %.4f PHP\n", currency, old_rate, rate))
      }

      readline("\n[ ] Press Enter to continue...")
      next
    }

    ## UPDATE: MADE SOME ZIGS AND SOME ZAGS WTF IS TS?
    if (choice == 2) {
      snapshot <- data.frame(
        Currency = supported,
        ToPHP = rates[supported],
        stringsAsFactors = FALSE
      )

      cat("\n[ ] Exchange rates (PHP base):\n")
      print(snapshot, row.names = FALSE)
      readline("\n[ ] Press Enter to continue...")
      next
    }

    ## TODO: UNTESTED
    if (choice == 3) {
      from_currency <- toupper(trimws(readline("From currency code: ")))
      to_currency <- toupper(trimws(readline("To currency code: ")))

      if (!(from_currency %in% supported)) {
        cat(sprintf("\n[Error] Unsupported currency: %s\n", from_currency))
        readline("\nPress Enter to continue...")
        next
      }

      if (!(to_currency %in% supported)) {
        cat(sprintf("\n[Error] Unsupported currency: %s\n", to_currency))
        readline("\nPress Enter to continue...")
        next
      }

      amount_input <- readline("Enter amount: ")
      amount <- suppressWarnings(as.numeric(trimws(amount_input)))

      ## VALIDATE AMOUNTS
      if (is.na(amount) || !is.finite(amount) || amount < 0) {
        cat("\n[Error] Amount must be a non-negative number.\n")
        readline("\nPress Enter to continue...")
        next
      }

      if (from_currency == to_currency) {
        cat(sprintf("\nNo conversion needed. Amount remains %.4f %s.\n", amount, from_currency))
        readline("\nPress Enter to continue...")
        next
      }

      if (from_currency != base && (is.na(rates[[from_currency]]) || !is.finite(rates[[from_currency]]))) {
        cat(sprintf("\n[Error] Rate for %s is not set. Please register it first.\n", from_currency))
        readline("\nPress Enter to continue...")
        next
      }

      if (to_currency != base && (is.na(rates[[to_currency]]) || !is.finite(rates[[to_currency]]))) {
        cat(sprintf("\n[Error] Rate for %s is not set. Please register it first.\n", to_currency))
        readline("\nPress Enter to continue...")
        next
      }

      php_amount <- if (from_currency == base) {
        amount
      } else {
        amount * rates[[from_currency]]
      }

      converted_amount <- if (to_currency == base) {
        php_amount
      } else {
        php_amount / rates[[to_currency]]
      }

      cat(sprintf(
        "\n%.4f %s converts to %.4f %s\n",
        amount,
        from_currency,
        converted_amount,
        to_currency
      ))
      cat(sprintf("PHP reference: %.4f PHP\n", php_amount))
      readline("\nPress Enter to continue...")
      next
    }

    ## TODO: ADD MORE FUNCTIONALITY HERE
    cat("\n[Error] Unknown menu option. Please choose 0-3.\n")
    readline("\n[ ] Press Enter to continue...")
  }
}

if (sys.nframe() == 0) {
  run_cli()
}
