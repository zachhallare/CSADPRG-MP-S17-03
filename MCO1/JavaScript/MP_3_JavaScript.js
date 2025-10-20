// Banking & Currency Exchange App - Improved Version

const readline = require('readline-sync');

// --- Data Storage ---
const accounts = [];
const exchangeRates = {
  PHP: 1,
  USD: 52,
  JPY: 0.41,
  GBP: 70,
  EUR: 60,
  CNY: 8
};

// --- Account Management ---

/**
 * Registers a new bank account or returns existing account
 * @param {string} name - The account holder's name
 * @return {object} The account object with name, balance, and currency
 */
function registerAccount(name) {
  const existingAccount = getAccount(name);
  if (existingAccount) {
    console.log(`Account already exists for ${name}.`);
    return existingAccount;
  }
  const account = { name, balance: 0, currency: 'PHP' };
  accounts.push(account);
  console.log(`\nAccount successfully created for ${name}.`);
  return account;
}

/**
 * Retrieves an account by name (case-insensitive)
 * @param {string} name - The account holder's name
 * @return {object|null} The account object if found, null otherwise
 */
function getAccount(name) {
  return accounts.find(acc => acc.name.toLowerCase() === name.toLowerCase()) || null;
}

// --- Bank Transactions ---

/**
 * Deposits money into an account
 * @param {string} accountName - The account holder's name
 * @param {number} amount - The amount to deposit (must be positive)
 * @return {number} The updated account balance
 * @throws {Error} If account not found or amount is invalid
 */
function deposit(accountName, amount) {
  if (amount <= 0) throw new Error('Deposit amount must be positive');
  const account = getAccount(accountName);
  if (!account) throw new Error('Account not found');
  account.balance += amount;
  return account.balance;
}

/**
 * Withdraws money from an account
 * @param {string} accountName - The account holder's name
 * @param {number} amount - The amount to withdraw (must be positive)
 * @return {number} The updated account balance
 * @throws {Error} If account not found, amount is invalid, or insufficient funds
 */
function withdraw(accountName, amount) {
  const account = getAccount(accountName);
  if (!account) throw new Error('Account not found');
  if (amount <= 0) throw new Error('Withdrawal amount must be positive');
  if (amount > account.balance) throw new Error('Insufficient funds');
  account.balance -= amount;
  return account.balance;
}

// --- Exchange Rate Management ---

/**
 * Sets the exchange rate for a currency relative to PHP
 * @param {string} currencyCode - The currency code (e.g., 'USD', 'EUR')
 * @param {number} rateToPHP - The exchange rate (how much 1 unit equals in PHP)
 * @throws {Error} If rate is not positive
 */
function setExchangeRate(currencyCode, rateToPHP) {
  if (rateToPHP <= 0) throw new Error('Exchange rate must be positive');
  exchangeRates[currencyCode] = rateToPHP;
}

/**
 * Gets the exchange rate for a currency
 * @param {string} currencyCode - The currency code
 * @return {number|null} The exchange rate or null if not found
 */
function getExchangeRate(currencyCode) {
  return exchangeRates[currencyCode] || null;
}

// --- Currency Conversion ---

/**
 * Converts an amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - The source currency code
 * @param {string} toCurrency - The target currency code
 * @return {number} The converted amount
 * @throws {Error} If either currency is unknown
 */
function convertCurrency(amount, fromCurrency, toCurrency) {
  const fromRate = getExchangeRate(fromCurrency);
  const toRate = getExchangeRate(toCurrency);
  if (!fromRate || !toRate) throw new Error('Unknown currency');
  return (amount * fromRate) / toRate;
}

// --- Interest Computation ---

/**
 * Computes daily interest based on balance and annual rate
 * @param {number} balance - The current account balance
 * @param {number} annualRate - The annual interest rate (default 0.05 = 5%)
 * @return {number} The daily interest amount
 */
function computeDailyInterest(balance, annualRate = 0.05) {
  return balance * (annualRate / 365);
}

/**
 * Generates interest projection for multiple days
 * @param {number} balance - The starting balance
 * @param {number} days - Number of days to project
 * @param {number} annualRate - The annual interest rate (default 0.05 = 5%)
 * @return {Array<object>} Array of objects with day, interest, and balance
 */
function generateInterestProjection(balance, days, annualRate = 0.05) {
  let projections = [];
  let currentBalance = balance;
  for (let day = 1; day <= days; day++) {
    const interest = computeDailyInterest(currentBalance, annualRate);
    currentBalance += interest;
    projections.push({ day, interest, balance: currentBalance });
  }
  return projections;
}

// --- Display Functions ---

/**
 * Displays the main menu options
 * @return {void}
 */
function displayMainMenu() {
  console.log('\n========================================');
  console.log('   BANKING & CURRENCY EXCHANGE APP');
  console.log('========================================');
  console.log('Select Transaction:');
  console.log('[1] Register Account Name');
  console.log('[2] Deposit Amount');
  console.log('[3] Withdraw Amount');
  console.log('[4] Currency Exchange');
  console.log('[5] Record Exchange Rates');
  console.log('[6] Show Interest Amount');
  console.log('[0] Exit');
  console.log('========================================');
}

/**
 * Displays the currency selection menu
 * @return {void}
 */
function displayCurrencyMenu() {
  console.log('\n[1] Philippine Peso (PHP)');
  console.log('[2] United States Dollar (USD)');
  console.log('[3] Japanese Yen (JPY)');
  console.log('[4] British Pound Sterling (GBP)');
  console.log('[5] Euro (EUR)');
  console.log('[6] Chinese Yuan Renminbi (CNY)');
}

/**
 * Converts menu choice number to currency code
 * @param {string} choice - The menu choice (1-6)
 * @return {string|null} The currency code or null if invalid
 */
function getCurrencyFromChoice(choice) {
  const currencies = ['PHP', 'USD', 'JPY', 'GBP', 'EUR', 'CNY'];
  const index = parseInt(choice) - 1;
  return (index >= 0 && index < currencies.length) ? currencies[index] : null;
}

/**
 * Prompts user if they want to return to main menu
 * @return {boolean} True if user wants to return, false to repeat transaction
 */
function askReturnToMenu() {
  while (true) {
    const answer = readline.question('\nBack to the Main Menu (Y/N): ').toUpperCase();
    if (answer === 'Y') return true;
    if (answer === 'N') return false;
    console.log('Invalid input. Please enter Y or N.');
  }
}

// --- Transaction Handlers ---

/**
 * Handles the account registration process
 * @return {void}
 */
function handleRegisterAccount() {
  console.log('\n--- Register Account Name ---');
  const name = readline.question('Account Name: ');
  if (name.trim()) {
    registerAccount(name);
  } else {
    console.log('Invalid account name.');
  }
}

/**
 * Handles the deposit transaction process
 * @return {void}
 */
function handleDeposit() {
  console.log('\n--- Deposit Amount ---');
  const name = readline.question('Account Name: ');
  const account = getAccount(name);
  
  if (!account) {
    console.log('Account not found.');
    return;
  }
  
  console.log(`Current Balance: ${account.balance.toFixed(2)}`);
  console.log(`Currency: ${account.currency}`);
  
  const amount = parseFloat(readline.question('Deposit Amount: '));
  if (isNaN(amount)) {
    console.log('Invalid amount.');
    return;
  }
  
  const newBalance = deposit(name, amount);
  console.log(`Updated Balance: ${newBalance.toFixed(2)}`);
}

/**
 * Handles the withdrawal transaction process
 * @return {void}
 */
function handleWithdraw() {
  console.log('\n--- Withdraw Amount ---');
  const name = readline.question('Account Name: ');
  const account = getAccount(name);
  
  if (!account) {
    console.log('Account not found.');
    return;
  }
  
  console.log(`Current Balance: ${account.balance.toFixed(2)}`);
  console.log(`Currency: ${account.currency}`);
  
  const amount = parseFloat(readline.question('Withdraw Amount: '));
  if (isNaN(amount)) {
    console.log('Invalid amount.');
    return;
  }
  
  const newBalance = withdraw(name, amount);
  console.log(`Updated Balance: ${newBalance.toFixed(2)}`);
}

/**
 * Handles the currency exchange process with multiple conversion support
 * @return {void}
 */
function handleCurrencyExchange() {
  let continueExchange = true;
  
  while (continueExchange) {
    console.log('\n--- Foreign Currency Exchange ---');
    console.log('\nSource Currency Option:');
    displayCurrencyMenu();
    
    const sourceChoice = readline.question('Source Currency: ');
    const sourceCurrency = getCurrencyFromChoice(sourceChoice);
    
    if (!sourceCurrency) {
      console.log('Invalid currency selection.');
      return;
    }
    
    const sourceAmount = parseFloat(readline.question('Source Amount: '));
    if (isNaN(sourceAmount) || sourceAmount <= 0) {
      console.log('Invalid amount.');
      return;
    }
    
    console.log('\nExchanged Currency Options:');
    displayCurrencyMenu();
    
    const targetChoice = readline.question('Exchange Currency: ');
    const targetCurrency = getCurrencyFromChoice(targetChoice);
    
    if (!targetCurrency) {
      console.log('Invalid currency selection.');
      return;
    }
    
    const exchangedAmount = convertCurrency(sourceAmount, sourceCurrency, targetCurrency);
    console.log(`\nExchange Amount: ${exchangedAmount.toFixed(2)} ${targetCurrency}`);
    
    const answer = readline.question('\nConvert another currency (Y/N)? ').toUpperCase();
    continueExchange = (answer === 'Y');
  }
}

/**
 * Handles recording/updating exchange rates
 * @return {void}
 */
function handleRecordExchangeRate() {
  console.log('\n--- Record Exchange Rate ---');
  displayCurrencyMenu();
  
  const choice = readline.question('Select Foreign Currency: ');
  const currency = getCurrencyFromChoice(choice);
  
  if (!currency) {
    console.log('Invalid currency selection.');
    return;
  }
  
  if (currency === 'PHP') {
    console.log('PHP is the base currency and cannot be modified.');
    return;
  }
  
  const rate = parseFloat(readline.question(`Exchange Rate (1 ${currency} = ? PHP): `));
  if (isNaN(rate) || rate <= 0) {
    console.log('Invalid exchange rate.');
    return;
  }
  
  setExchangeRate(currency, rate);
  console.log(`\nExchange rate updated: 1 ${currency} = ${rate.toFixed(2)} PHP`);
}

/**
 * Handles displaying interest projection for an account
 * @return {void}
 */
function handleShowInterest() {
  console.log('\n--- Show Interest Amount ---');
  const name = readline.question('Account Name: ');
  const account = getAccount(name);
  
  if (!account) {
    console.log('Account not found.');
    return;
  }
  
  console.log(`Current Balance: ${account.balance.toFixed(2)}`);
  console.log(`Currency: ${account.currency}`);
  console.log('Interest Rate: 5%');
  
  const days = parseInt(readline.question('Total Number of Days: '), 10);
  if (isNaN(days) || days <= 0) {
    console.log('Invalid number of days.');
    return;
  }
  
  const projections = generateInterestProjection(account.balance, days);
  
  console.log('\n' + '-'.repeat(50));
  console.log(`${'Day'.padEnd(10)} | ${'Interest'.padEnd(15)} | ${'Balance'.padEnd(15)} |`);
  console.log('-'.repeat(50));
  
  projections.forEach(p => {
    console.log(`${String(p.day).padEnd(10)} | ${p.interest.toFixed(2).padEnd(15)} | ${p.balance.toFixed(2).padEnd(15)} |`);
  });
  
  console.log('-'.repeat(50));
}

// --- Main Loop ---

/**
 * Main application loop that handles menu navigation and transaction flow
 * @return {void}
 */
function main() {
  console.log('\nWelcome to the Banking & Currency Exchange Application!');
  
  while (true) {
    displayMainMenu();
    const choice = readline.question('\nChoose an option: ');

    try {
      let returnToMenu = false;
      
      while (!returnToMenu) {
        switch (choice) {
          case '1':
            handleRegisterAccount();
            returnToMenu = askReturnToMenu();
            break;
          case '2':
            handleDeposit();
            returnToMenu = askReturnToMenu();
            break;
          case '3':
            handleWithdraw();
            returnToMenu = askReturnToMenu();
            break;
          case '4':
            handleCurrencyExchange();
            returnToMenu = askReturnToMenu();
            break;
          case '5':
            handleRecordExchangeRate();
            returnToMenu = askReturnToMenu();
            break;
          case '6':
            handleShowInterest();
            returnToMenu = askReturnToMenu();
            break;
          case '0':
            console.log('\n========================================');
            console.log('Thank you for using our services!');
            console.log('Goodbye!');
            console.log('========================================\n');
            return;
          default:
            console.log('\nInvalid option. Please try again.');
            returnToMenu = true;
        }
      }
    } catch (err) {
      console.log('\nError:', err.message);
      const returnToMenu = askReturnToMenu();
      if (!returnToMenu) {
        console.log('Returning to the same transaction...\n');
      }
    }
  }
}

// --- Run App ---
main();