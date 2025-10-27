//********************
//Last names: Campo, Hallare, Lobo, Rebollos
//Language: Kotlin
//Paradigm(s): Procedural
//********************

import kotlin.math.round

fun main() {
    val accounts = mutableMapOf<String, Double>()
    var currentAccount: String? = null
    val interestRate = 0.05
    val currencyNames = arrayOf("PHP", "USD", "JPY", "GBP", "EUR", "CNY")
    val exchangeRates = doubleArrayOf(1.0, 52.0, 0.37, 68.0, 60.0, 7.0)

    var again: String

    do {
        println("\n=== MAIN MENU ===")
        println("[1] Register New Account")
        println("[2] Switch Account")
        println("[3] Deposit Amount")
        println("[4] Withdraw Amount")
        println("[5] Currency Exchange")
        println("[6] Record Exchange Rates")
        println("[7] Show Interest Amount")
        println("[0] Exit")
        print("Select Transaction: ")

        val choice = readIntInput()

        when (choice) {
            1 -> {
                val name = registerAccount()
                if (name.isNotEmpty()) {
                    if (!accounts.containsKey(name)) {
                        accounts[name] = 0.0
                        currentAccount = name
                        println("Account '$name' created and set as active.")
                    } else {
                        println("Account '$name' already exists.")
                    }
                }
            }

            2 -> {
                if (accounts.isEmpty()) {
                    println("No accounts available. Register one first.")
                } else {
                    println("\nAvailable Accounts:")
                    accounts.keys.forEachIndexed { i, acc -> println("[${i + 1}] $acc") }
                    print("Select account number: ")
                    val sel = readIntInput()
                    if (sel in 1..accounts.size) {
                        currentAccount = accounts.keys.elementAt(sel - 1)
                        println("Switched to account: $currentAccount")
                    } else {
                        println("Invalid account selection.")
                    }
                }
            }

            3 -> {
                if (currentAccount == null) println("No active account. Register or switch first.")
                else {
                    val newBal = deposit(currentAccount!!, accounts[currentAccount]!!)
                    accounts[currentAccount!!] = newBal
                }
            }

            4 -> {
                if (currentAccount == null) println("No active account. Register or switch first.")
                else {
                    val newBal = withdraw(currentAccount!!, accounts[currentAccount]!!)
                    accounts[currentAccount!!] = newBal
                }
            }

            5 -> currencyExchange(exchangeRates, currencyNames)
            6 -> recordRates(exchangeRates, currencyNames)
            7 -> {
                if (currentAccount == null) println("No active account. Register or switch first.")
                else showInterest(currentAccount!!, accounts[currentAccount]!!, interestRate)
            }

            0 ->{
                println("Exiting program...")
            }

            else -> println("Invalid choice. Please select a number between 0 and 7.")
        }

        // Back to main menu prompt
        if (choice != 0) {
            do {
                print("\nBack to Main Menu (Y/N): ")
                again = readLine()?.uppercase()?.trim() ?: "N"
                if (again != "Y" && again != "N") {
                    println("Invalid input. Please enter only 'Y' or 'N'.")
                }
            } while (again != "Y" && again != "N")
        } else {
            again = "N"
        }

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
    return name
}

fun deposit(name: String, currentBalance: Double): Double {
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
    for (day in 1..days) {
        val dailyInterest = round((currentBalance * rate / 365) * 100) / 100
        currentBalance += dailyInterest
        println(
            "${day.toString().padStart(3)} | " +
                    "${"%.2f".format(dailyInterest).padStart(8)} | " +
                    "${"%.2f".format(currentBalance).padStart(8)}"
        )
    }
}
