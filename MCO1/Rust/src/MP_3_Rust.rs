// ******************
// Last names: Campo, Hallare, Lobo, Rebollos
// Language: Rust
// Paradigm(s): Systems Programming, Concurrent Programming
// ******************

use std::io::{self, Write};

#[derive(Clone)]
struct Account {
    name: String,
    php: f64,
    usd: f64,
    jpy: f64,
    gbp: f64,
    eur: f64,
    cny: f64,
}

struct ExchangeRate {
    currency: String,
    rate: f64,
}

struct BankingSystem {
    accounts: Vec<Account>,
    exchange_rates: Vec<ExchangeRate>,
}

impl BankingSystem {
    fn new() -> Self {
        let mut exchange_rates = Vec::new();
        exchange_rates.push(ExchangeRate { currency: "PHP".to_string(), rate: 1.0 });
        exchange_rates.push(ExchangeRate { currency: "USD".to_string(), rate: 52.0 });
        exchange_rates.push(ExchangeRate { currency: "JPY".to_string(), rate: 0.41 });
        exchange_rates.push(ExchangeRate { currency: "GBP".to_string(), rate: 70.0 });
        exchange_rates.push(ExchangeRate { currency: "EUR".to_string(), rate: 60.0 });
        exchange_rates.push(ExchangeRate { currency: "CNY".to_string(), rate: 8.0 });

        BankingSystem {
            accounts: Vec::new(),
            exchange_rates,
        }
    }

    fn find_account(&self, name: &str) -> Option<usize> {
        let mut result = None;
        let mut i = 0;
        while i < self.accounts.len() {
            if self.accounts[i].name.to_lowercase() == name.to_lowercase() {
                result = Some(i);
                i = self.accounts.len();
            } else {
                i += 1;
            }
        }
        result
    }

    fn get_balance(&self, account: &Account, currency: &str) -> f64 {
        if currency == "PHP" {
            account.php
        } else if currency == "USD" {
            account.usd
        } else if currency == "JPY" {
            account.jpy
        } else if currency == "GBP" {
            account.gbp
        } else if currency == "EUR" {
            account.eur
        } else if currency == "CNY" {
            account.cny
        } else {
            0.0
        }
    }

    fn set_balance(&mut self, index: usize, currency: &str, amount: f64) {
        if currency == "PHP" {
            self.accounts[index].php = amount;
        } else if currency == "USD" {
            self.accounts[index].usd = amount;
        } else if currency == "JPY" {
            self.accounts[index].jpy = amount;
        } else if currency == "GBP" {
            self.accounts[index].gbp = amount;
        } else if currency == "EUR" {
            self.accounts[index].eur = amount;
        } else if currency == "CNY" {
            self.accounts[index].cny = amount;
        }
    }

    fn get_exchange_rate(&self, currency: &str) -> f64 {
        let mut rate = 0.0;
        let mut i = 0;
        while i < self.exchange_rates.len() {
            if self.exchange_rates[i].currency == currency {
                rate = self.exchange_rates[i].rate;
                i = self.exchange_rates.len();
            } else {
                i += 1;
            }
        }
        rate
    }

    fn set_exchange_rate(&mut self, currency: &str, new_rate: f64) {
        let mut i = 0;
        while i < self.exchange_rates.len() {
            if self.exchange_rates[i].currency == currency {
                self.exchange_rates[i].rate = new_rate;
                i = self.exchange_rates.len();
            } else {
                i += 1;
            }
        }
    }

    fn display_main_menu(&self) {
        println!("\n========================================");
        println!("   BANKING & CURRENCY EXCHANGE APP");
        println!("========================================");
        println!("Select Transaction:");
        println!("[1] Register Account Name");
        println!("[2] Deposit Amount");
        println!("[3] Withdraw Amount");
        println!("[4] Currency Exchange");
        println!("[5] Record Exchange Rates");
        println!("[6] Show Interest Amount");
        println!("[0] Exit");
        println!("========================================");
    }

    fn display_currency_menu(&self) {
        println!("[1] Philippine Peso (PHP)");
        println!("[2] United States Dollar (USD)");
        println!("[3] Japanese Yen (JPY)");
        println!("[4] British Pound Sterling (GBP)");
        println!("[5] Euro (EUR)");
        println!("[6] Chinese Yuan Renminbi (CNY)");
    }

    fn get_currency_from_choice(&self, choice: &str) -> String {
        if choice == "1" {
            "PHP".to_string()
        } else if choice == "2" {
            "USD".to_string()
        } else if choice == "3" {
            "JPY".to_string()
        } else if choice == "4" {
            "GBP".to_string()
        } else if choice == "5" {
            "EUR".to_string()
        } else if choice == "6" {
            "CNY".to_string()
        } else {
            "".to_string()
        }
    }

    fn display_all_balances(&self, account: &Account) {
        println!("\nBalances for {}:", account.name);
        println!("  PHP: {:.2}", account.php);
        println!("  USD: {:.2}", account.usd);
        println!("  JPY: {:.2}", account.jpy);
        println!("  GBP: {:.2}", account.gbp);
        println!("  EUR: {:.2}", account.eur);
        println!("  CNY: {:.2}", account.cny);
    }

    fn register_account(&mut self) {
        println!("\n--- Register Account Name ---");
        print!("Account Name: ");
        io::stdout().flush().unwrap();
        
        let mut name = String::new();
        io::stdin().read_line(&mut name).unwrap();
        let name = name.trim().to_string();

        if !name.is_empty() {
            let account_exists = self.find_account(&name).is_some();
            if !account_exists {
                let account = Account {
                    name: name.clone(),
                    php: 0.0,
                    usd: 0.0,
                    jpy: 0.0,
                    gbp: 0.0,
                    eur: 0.0,
                    cny: 0.0,
                };
                self.accounts.push(account);
                println!("\nAccount successfully created for {}.", name);
            } else {
                println!("Account already exists for {}.", name);
            }
        } else {
            println!("Invalid account name.");
        }
    }

    fn deposit_amount(&mut self) {
        println!("\n--- Deposit Amount ---");
        print!("Account Name: ");
        io::stdout().flush().unwrap();
        
        let mut name = String::new();
        io::stdin().read_line(&mut name).unwrap();
        let name = name.trim().to_string();

        let account_index = self.find_account(&name);
        if account_index.is_some() {
            let index = account_index.unwrap();
            let php_balance = self.accounts[index].php;
            println!("Current Balance (PHP): {:.2}", php_balance);

            print!("Deposit Amount: ");
            io::stdout().flush().unwrap();
            
            let mut amount_str = String::new();
            io::stdin().read_line(&mut amount_str).unwrap();
            
            let amount_result = amount_str.trim().parse::<f64>();
            if amount_result.is_ok() {
                let amount = amount_result.unwrap();
                if amount > 0.0 {
                    self.accounts[index].php = self.accounts[index].php + amount;
                    let new_balance = self.accounts[index].php;
                    println!("Updated Balance: {:.2}", new_balance);
                } else {
                    println!("Invalid amount.");
                }
            } else {
                println!("Invalid amount.");
            }
        } else {
            println!("Account not found.");
        }
    }

    fn withdraw_amount(&mut self) {
        println!("\n--- Withdraw Amount ---");
        print!("Account Name: ");
        io::stdout().flush().unwrap();
        
        let mut name = String::new();
        io::stdin().read_line(&mut name).unwrap();
        let name = name.trim().to_string();

        let account_index = self.find_account(&name);
        if account_index.is_some() {
            let index = account_index.unwrap();
            
            // Display all balances
            self.display_all_balances(&self.accounts[index].clone());
            println!();

            // Ask for currency selection
            println!("Select currency to withdraw:");
            self.display_currency_menu();
            print!("Currency: ");
            io::stdout().flush().unwrap();
            
            let mut currency_choice = String::new();
            io::stdin().read_line(&mut currency_choice).unwrap();
            let currency_choice = currency_choice.trim();
            
            let currency = self.get_currency_from_choice(currency_choice);
            
            if currency != "" {
                print!("Withdraw Amount: ");
                io::stdout().flush().unwrap();
                
                let mut amount_str = String::new();
                io::stdin().read_line(&mut amount_str).unwrap();
                
                let amount_result = amount_str.trim().parse::<f64>();
                if amount_result.is_ok() {
                    let amount = amount_result.unwrap();
                    if amount > 0.0 {
                        let current_balance = self.get_balance(&self.accounts[index], &currency);
                        if amount <= current_balance {
                            self.set_balance(index, &currency, current_balance - amount);
                            let new_balance = self.get_balance(&self.accounts[index], &currency);
                            println!("Updated {} Balance: {:.2}", currency, new_balance);
                        } else {
                            println!("Error: Insufficient {} funds", currency);
                        }
                    } else {
                        println!("Invalid amount.");
                    }
                } else {
                    println!("Invalid amount.");
                }
            } else {
                println!("Invalid currency selection.");
            }
        } else {
            println!("Account not found.");
        }
    }

    fn record_exchange_rate(&mut self) {
        println!("\n--- Record Exchange Rate ---");
        self.display_currency_menu();
        
        print!("\nSelect Foreign Currency: ");
        io::stdout().flush().unwrap();
        
        let mut choice = String::new();
        io::stdin().read_line(&mut choice).unwrap();
        let choice = choice.trim();
        
        let currency = self.get_currency_from_choice(choice);
        
        if currency != "" {
            if currency == "PHP" {
                println!("PHP is the base currency and cannot be modified.");
            } else {
                print!("Exchange Rate (1 {} = ? PHP): ", currency);
                io::stdout().flush().unwrap();
                
                let mut rate_str = String::new();
                io::stdin().read_line(&mut rate_str).unwrap();
                
                let rate_result = rate_str.trim().parse::<f64>();
                if rate_result.is_ok() {
                    let rate = rate_result.unwrap();
                    if rate > 0.0 {
                        self.set_exchange_rate(&currency, rate);
                        println!("\nExchange rate updated: 1 {} = {:.2} PHP", currency, rate);
                    } else {
                        println!("Invalid exchange rate.");
                    }
                } else {
                    println!("Invalid exchange rate.");
                }
            }
        } else {
            println!("Invalid currency selection.");
        }
    }

    fn currency_exchange(&mut self) {
        let mut continue_exchange = true;
        
        while continue_exchange {
            println!("\n--- Foreign Currency Exchange ---");
            print!("Account Name: ");
            io::stdout().flush().unwrap();
            
            let mut name = String::new();
            io::stdin().read_line(&mut name).unwrap();
            let name = name.trim().to_string();

            let account_index = self.find_account(&name);
            let mut valid = true;
            
            if account_index.is_none() {
                println!("Account not found.");
                valid = false;
            }
            
            if valid {
                let index = account_index.unwrap();
                
                // Display current balances
                self.display_all_balances(&self.accounts[index].clone());

                println!("\nSource Currency Option:");
                self.display_currency_menu();
                
                print!("Source Currency: ");
                io::stdout().flush().unwrap();
                
                let mut source_choice = String::new();
                io::stdin().read_line(&mut source_choice).unwrap();
                let source_choice = source_choice.trim();
                
                let source_currency = self.get_currency_from_choice(source_choice);
                
                if source_currency == "" {
                    println!("Invalid currency selection.");
                    valid = false;
                }

                if valid {
                    print!("Source Amount: ");
                    io::stdout().flush().unwrap();
                    
                    let mut amount_str = String::new();
                    io::stdin().read_line(&mut amount_str).unwrap();
                    
                    let amount_result = amount_str.trim().parse::<f64>();
                    let mut source_amount = 0.0;
                    
                    if amount_result.is_ok() {
                        source_amount = amount_result.unwrap();
                        if source_amount <= 0.0 {
                            println!("Invalid amount.");
                            valid = false;
                        }
                    } else {
                        println!("Invalid amount.");
                        valid = false;
                    }

                    if valid {
                        println!("\nExchanged Currency Options:");
                        self.display_currency_menu();
                        
                        print!("Exchange Currency: ");
                        io::stdout().flush().unwrap();
                        
                        let mut target_choice = String::new();
                        io::stdin().read_line(&mut target_choice).unwrap();
                        let target_choice = target_choice.trim();
                        
                        let target_currency = self.get_currency_from_choice(target_choice);
                        
                        if target_currency == "" {
                            println!("Invalid currency selection.");
                            valid = false;
                        } else if source_currency == target_currency {
                            println!("Source and target currencies are the same.");
                            valid = false;
                        } else {
                            let available_source = self.get_balance(&self.accounts[index], &source_currency);
                            if source_amount > available_source {
                                println!("Insufficient {} balance. Available: {:.2}", source_currency, available_source);
                                valid = false;
                            } else {
                                let source_rate = self.get_exchange_rate(&source_currency);
                                let target_rate = self.get_exchange_rate(&target_currency);

                                if source_rate == 0.0 || target_rate == 0.0 {
                                    println!("Error: Exchange rate not set for selected currencies.");
                                    valid = false;
                                } else {
                                    let exchanged_amount = (source_amount * source_rate) / target_rate;

                                    // Update balances
                                    self.set_balance(index, &source_currency, available_source - source_amount);
                                    let current_target = self.get_balance(&self.accounts[index], &target_currency);
                                    self.set_balance(index, &target_currency, current_target + exchanged_amount);

                                    println!("\nConverted {:.2} {} -> {:.2} {}", source_amount, source_currency, exchanged_amount, target_currency);
                                    println!("Updated balances:");
                                    let src_after = self.get_balance(&self.accounts[index], &source_currency);
                                    let tgt_after = self.get_balance(&self.accounts[index], &target_currency);
                                    println!("  {}: {:.2}", source_currency, src_after);
                                    println!("  {}: {:.2}", target_currency, tgt_after);
                                }
                            }
                        }
                    }
                }
            }
            
            if valid {
                print!("\nConvert another currency (Y/N)? ");
                io::stdout().flush().unwrap();
                let mut answer = String::new();
                io::stdin().read_line(&mut answer).unwrap();
                continue_exchange = answer.trim().to_uppercase() == "Y";
            } else {
                continue_exchange = false;
            }
        }
    }

    fn show_interest_amount(&self) {
        println!("\n--- Show Interest Amount ---");
        print!("Account Name: ");
        io::stdout().flush().unwrap();
        
        let mut name = String::new();
        io::stdin().read_line(&mut name).unwrap();
        let name = name.trim().to_string();

        let account_index = self.find_account(&name);
        if account_index.is_some() {
            let index = account_index.unwrap();
            let php_balance = self.accounts[index].php;
            println!("Current Balance (PHP): {:.2}", php_balance);
            println!("Interest Rate: 5%");

            print!("Total Number of Days: ");
            io::stdout().flush().unwrap();
            
            let mut days_str = String::new();
            io::stdin().read_line(&mut days_str).unwrap();
            
            let days_result = days_str.trim().parse::<u32>();
            if days_result.is_ok() {
                let days = days_result.unwrap();
                if days > 0 {
                    let annual_rate = 0.05;
                    let mut balance = php_balance;
                    
                    println!("\n{}", "-".repeat(50));
                    println!("{:<10} | {:<15} | {:<15} |", "Day", "Interest", "Balance");
                    println!("{}", "-".repeat(50));
                    
                    let mut day = 1;
                    while day <= days {
                        let daily_interest = balance * (annual_rate / 365.0);
                        balance += daily_interest;
                        println!("{:<10} | {:<15.2} | {:<15.2} |", day, daily_interest, balance);
                        day += 1;
                    }
                    
                    println!("{}", "-".repeat(50));
                } else {
                    println!("Invalid number of days.");
                }
            } else {
                println!("Invalid number of days.");
            }
        } else {
            println!("Account not found.");
        }
    }
}

fn get_input(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().unwrap();
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

fn ask_return_to_menu() -> bool {
    let mut done = false;
    let mut result = false;
    
    while !done {
        let answer = get_input("\nBack to the Main Menu (Y/N): ");
        let normalized = answer.to_uppercase();
        if normalized == "Y" {
            result = true;
            done = true;
        } else if normalized == "N" {
            result = false;
            done = true;
        } else {
            println!("Invalid input. Please enter Y or N.");
        }
    }
    
    result
}

fn run_transaction<F>(mut action: F)
where
    F: FnMut(),
{
    let mut done = false;
    
    while !done {
        action();
        if ask_return_to_menu() {
            done = true;
        }
    }
}

fn main() {
    let mut system = BankingSystem::new();

    println!("\nWelcome to the Banking & Currency Exchange Application!");

    let mut running = true;
    
    while running {
        system.display_main_menu();
        let option = get_input("\nChoose an option: ");

        if option == "1" {
            run_transaction(|| system.register_account());
        } else if option == "2" {
            run_transaction(|| system.deposit_amount());
        } else if option == "3" {
            run_transaction(|| system.withdraw_amount());
        } else if option == "4" {
            run_transaction(|| system.currency_exchange());
        } else if option == "5" {
            run_transaction(|| system.record_exchange_rate());
        } else if option == "6" {
            run_transaction(|| system.show_interest_amount());
        } else if option == "0" {
            println!("\n========================================");
            println!("Thank you for using our services!");
            println!("Goodbye!");
            println!("========================================\n");
            running = false;
        } else {
            println!("\nInvalid option. Please try again.");
        }
    }
}
