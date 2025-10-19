fun main() {
    var accountName = ""
    var balance = 0.0
    val interestRate = 0.05
    val currencyNames = arrayOf("PHP", "USD", "JPY", "GBP", "EUR", "CNY")
    val exchangeRates = DoubleArray(6) { 1.0 }

    // Default exchange rates
    exchangeRates[0] = 1.0
    exchangeRates[1] = 52.0
    exchangeRates[2] = 0.37
    exchangeRates[3] = 68.0
    exchangeRates[4] = 60.0
    exchangeRates[5] = 7.0

    var again: String

    do {
        println("\n=== MAIN MENU ===")
        println("[1] Register Account Name")
        println("[2] Deposit Amount")
        println("[3] Withdraw Amount")
        println("[4] Currency Exchange")
        println("[5] Record Exchange Rates")
        println("[6] Show Interest Amount")
        print("Select Transaction: ")

        val choice = readIntInput()

        when (choice) {
            1 -> accountName = registerAccount()
            2 -> balance = deposit(accountName, balance)
            3 -> balance = withdraw(accountName, balance)
            4 -> currencyExchange(exchangeRates, currencyNames)
            5 -> recordRates(exchangeRates, currencyNames)
            6 -> showInterest(accountName, balance, interestRate)
            else -> println("Invalid choice. Please select a number between 1 and 6.")
        }

        // Error-handled prompt for continuing
        do {
            print("\nBack to Main Menu (Y/N): ")
            again = readLine()?.uppercase()?.trim() ?: "N"
            if (again != "Y" && again != "N") {
                println("Invalid input. Please enter only 'Y' or 'N'.")
            }
        } while (again != "Y" && again != "N")

    } while (again == "Y")

    println("\nThank you for using the Banking and Currency App!")
}

// ---------- Utility Input Functions ----------

fun readIntInput(): Int {
    val input = readLine()
    return try {
        input?.toInt() ?: -1
    } catch (e: Exception) {
        -1
    }
}

fun readDoubleInput(): Double {
    val input = readLine()
    return try {
        input?.toDouble() ?: 0.0
    } catch (e: Exception) {
        println("Invalid number, defaulting to 0.")
        0.0
    }
}

// ---------- Main Features ----------

fun registerAccount(): String {
    print("Enter Account Name: ")
    val name = readLine() ?: ""
    if (name.isEmpty()) {
        println("Account name cannot be empty.")
        return ""
    }
    println("Account Registered: $name")
    return name
}

fun deposit(name: String, currentBalance: Double): Double {
    if (name == "") {
        println("No account found. Please register first.")
        return currentBalance
    }
    println("Account Name: $name")
    println("Current Balance: $currentBalance PHP")
    print("Enter Deposit Amount: ")
    val depositAmount = readDoubleInput()
    if (depositAmount <= 0) {
        println("Invalid deposit amount.")
        return currentBalance
    }
    val newBalance = currentBalance + depositAmount
    println("Updated Balance: $newBalance PHP")
    return newBalance
}

fun withdraw(name: String, currentBalance: Double): Double {
    if (name == "") {
        println("No account found. Please register first.")
        return currentBalance
    }
    println("Account Name: $name")
    println("Current Balance: $currentBalance PHP")
    print("Enter Withdraw Amount: ")
    val withdrawAmount = readDoubleInput()

    if (withdrawAmount <= 0) {
        println("Invalid withdrawal amount.")
        return currentBalance
    }
    if (withdrawAmount > currentBalance) {
        println("Insufficient funds.")
        return currentBalance
    }

    val newBalance = currentBalance - withdrawAmount
    println("Updated Balance: $newBalance PHP")
    return newBalance
}

fun recordRates(rates: DoubleArray, names: Array<String>) {
    println("\nRecord Exchange Rates")
    for (i in 1 until names.size) {
        println("[${i}] ${names[i]}")
    }
    print("Select Currency to Update: ")
    val choice = readIntInput()

    if (choice in 1..5) {
        print("Enter New Rate for ${names[choice]}: ")
        val newRate = readDoubleInput()
        if (newRate > 0) {
            rates[choice] = newRate
            println("Updated ${names[choice]} Rate: ${rates[choice]}")
        } else {
            println("Invalid rate. Must be greater than 0.")
        }
    } else {
        println("Invalid selection.")
    }
}

fun currencyExchange(rates: DoubleArray, names: Array<String>) {
    println("\nForeign Currency Exchange")
    println("Source Currency Options:")
    for (i in names.indices) {
        println("[${i + 1}] ${names[i]}")
    }
    print("Source Currency: ")
    val source = readIntInput() - 1

    if (source !in 0..5) {
        println("Invalid source currency.")
        return
    }

    print("Source Amount: ")
    val amount = readDoubleInput()
    if (amount <= 0) {
        println("Amount must be greater than 0.")
        return
    }

    println("Convert To:")
    for (i in names.indices) {
        println("[${i + 1}] ${names[i]}")
    }
    print("Target Currency: ")
    val target = readIntInput() - 1

    if (target !in 0..5) {
        println("Invalid target currency.")
        return
    }

    val phpValue = amount * rates[source]
    val converted = phpValue / rates[target]
    println("Exchange Amount: ${"%.2f".format(converted)} ${names[target]}")
}

fun showInterest(name: String, balance: Double, rate: Double) {
    if (name == "") {
        println("No account found. Please register first.")
        return
    }
    println("\nShow Interest Amount")
    println("Account Name: $name")
    println("Current Balance: $balance PHP")
    println("Interest Rate: 5% per annum")
    print("Enter Number of Days: ")
    val days = readIntInput()

    if (days <= 0) {
        println("Invalid number of days.")
        return
    }

    var currentBalance = balance
    println("Day | Interest | Balance")
    for (d in 1..days) {
        val interest = currentBalance * (rate / 365)
        currentBalance += interest
        println("$d | ${"%.2f".format(interest)} | ${"%.2f".format(currentBalance)}")
    }
}
