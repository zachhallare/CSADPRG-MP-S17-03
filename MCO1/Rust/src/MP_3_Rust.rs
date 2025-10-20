use std::io::{self, Write};

#[derive(Clone)]
struct Account {
    name: String,
    balance: f64,
    currency: String,
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
        exchange_rates.push(ExchangeRate { currency: "USD".to_string(), rate: 0.0 });
        exchange_rates.push(ExchangeRate { currency: "JPY".to_string(), rate: 0.0 });
        exchange_rates.push(ExchangeRate { currency: "GBP".to_string(), rate: 0.0 });
        exchange_rates.push(ExchangeRate { currency: "EUR".to_string(), rate: 0.0 });
        exchange_rates.push(ExchangeRate { currency: "CNY".to_string(), rate: 0.0 });

        BankingSystem {
            accounts: Vec::new(),
            exchange_rates,
        }
    }

    fn find_account(&self, name: &str) -> Option<usize> {
        let mut result = None;
        let mut i = 0;
        while i < self.accounts.len() {
            if self.accounts[i].name == name {
                result = Some(i);
                i = self.accounts.len();
            } else {
                i += 1;
            }
        }
        result
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
        println!("    BANKING & CURRENCY EXCHANGE");
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

    fn register_account(&mut self) {
        println!("\nRegister Account Name");
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
                    balance: 0.0,
                    currency: "PHP".to_string(),
                };
                self.accounts.push(account);
                println!("Account registered successfully!");
            } else {
                println!("Error: Account already exists.");
            }
        } else {
            println!("Error: Account name cannot be empty.");
        }
    }

    fn deposit_amount(&mut self) {
        println!("\nDeposit Amount");
        print!("Account Name: ");
        io::stdout().flush().unwrap();
        
        let mut name = String::new();
        io::stdin().read_line(&mut name).unwrap();
        let name = name.trim().to_string();

        let account_index = self.find_account(&name);
        if account_index.is_some() {
            let index = account_index.unwrap();
            println!("Current Balance: {:.2}", self.accounts[index].balance);
            println!("Currency: {}", self.accounts[index].currency);

            print!("\nDeposit Amount: ");
            io::stdout().flush().unwrap();
            
            let mut amount_str = String::new();
            io::stdin().read_line(&mut amount_str).unwrap();
            
            let amount_result = amount_str.trim().parse::<f64>();
            if amount_result.is_ok() {
                let amount = amount_result.unwrap();
                if amount > 0.0 {
                    self.accounts[index].balance += amount;
                    println!("Updated Balance: {:.2}", self.accounts[index].balance);
                } else {
                    println!("Error: Invalid deposit amount.");
                }
            } else {
                println!("Error: Invalid deposit amount.");
            }
        } else {
            println!("Error: Account not found.");
        }
    }

    fn withdraw_amount(&mut self) {
        println!("\nWithdraw Amount");
        print!("Account Name: ");
        io::stdout().flush().unwrap();
        
        let mut name = String::new();
        io::stdin().read_line(&mut name).unwrap();
        let name = name.trim().to_string();

        let account_index = self.find_account(&name);
        if account_index.is_some() {
            let index = account_index.unwrap();
            println!("Current Balance: {:.2}", self.accounts[index].balance);
            println!("Currency: {}", self.accounts[index].currency);

            print!("\nWithdraw Amount: ");
            io::stdout().flush().unwrap();
            
            let mut amount_str = String::new();
            io::stdin().read_line(&mut amount_str).unwrap();
            
            let amount_result = amount_str.trim().parse::<f64>();
            if amount_result.is_ok() {
                let amount = amount_result.unwrap();
                if amount > 0.0 {
                    if amount <= self.accounts[index].balance {
                        self.accounts[index].balance -= amount;
                        println!("Updated Balance: {:.2}", self.accounts[index].balance);
                    } else {
                        println!("Error: Insufficient funds.");
                    }
                } else {
                    println!("Error: Invalid withdrawal amount.");
                }
            } else {
                println!("Error: Invalid withdrawal amount.");
            }
        } else {
            println!("Error: Account not found.");
        }
    }

    fn record_exchange_rate(&mut self) {
        println!("\nRecord Exchange Rate");
        println!("[1] Philippine Peso (PHP)");
        println!("[2] United States Dollar (USD)");
        println!("[3] Japanese Yen (JPY)");
        println!("[4] British Pound Sterling (GBP)");
        println!("[5] Euro (EUR)");
        println!("[6] Chinese Yuan Renminbi (CNY)");
        
        print!("\nSelect Foreign Currency: ");
        io::stdout().flush().unwrap();
        
        let mut choice = String::new();
        io::stdin().read_line(&mut choice).unwrap();
        
        let choice_str = choice.trim();
        let currency = if choice_str == "1" {
            "PHP"
        } else if choice_str == "2" {
            "USD"
        } else if choice_str == "3" {
            "JPY"
        } else if choice_str == "4" {
            "GBP"
        } else if choice_str == "5" {
            "EUR"
        } else if choice_str == "6" {
            "CNY"
        } else {
            ""
        };

        if currency != "" {
            print!("Exchange Rate: ");
            io::stdout().flush().unwrap();
            
            let mut rate_str = String::new();
            io::stdin().read_line(&mut rate_str).unwrap();
            
            let rate_result = rate_str.trim().parse::<f64>();
            if rate_result.is_ok() {
                let rate = rate_result.unwrap();
                if rate > 0.0 {
                    self.set_exchange_rate(currency, rate);
                    println!("Exchange rate updated successfully!");
                } else {
                    println!("Error: Invalid exchange rate.");
                }
            } else {
                println!("Error: Invalid exchange rate.");
            }
        } else {
            println!("Error: Invalid currency selection.");
        }
    }

    fn currency_exchange(&self) {
        println!("\nForeign Currency Exchange");
        println!("Source Currency Option:");
        println!("[1] Philippine Peso (PHP)");
        println!("[2] United States Dollar (USD)");
        println!("[3] Japanese Yen (JPY)");
        println!("[4] British Pound Sterling (GBP)");
        println!("[5] Euro (EUR)");
        println!("[6] Chinese Yuan Renminbi (CNY)");
        
        print!("\nSource Currency: ");
        io::stdout().flush().unwrap();
        
        let mut source_choice = String::new();
        io::stdin().read_line(&mut source_choice).unwrap();
        
        let choice_str = source_choice.trim();
        let source_currency = if choice_str == "1" {
            "PHP"
        } else if choice_str == "2" {
            "USD"
        } else if choice_str == "3" {
            "JPY"
        } else if choice_str == "4" {
            "GBP"
        } else if choice_str == "5" {
            "EUR"
        } else if choice_str == "6" {
            "CNY"
        } else {
            ""
        };

        if source_currency != "" {
            print!("\nSource Amount: ");
            io::stdout().flush().unwrap();
            
            let mut amount_str = String::new();
            io::stdin().read_line(&mut amount_str).unwrap();
            
            let amount_result = amount_str.trim().parse::<f64>();
            if amount_result.is_ok() {
                let source_amount = amount_result.unwrap();
                if source_amount > 0.0 {
                    println!("\nExchanged Currency Options:");
                    println!("[1] Philippine Peso (PHP)");
                    println!("[2] United States Dollar (USD)");
                    println!("[3] Japanese Yen (JPY)");
                    println!("[4] British Pound Sterling (GBP)");
                    println!("[5] Euro (EUR)");
                    println!("[6] Chinese Yuan Renminbi (CNY)");
                    
                    print!("\nExchange Currency: ");
                    io::stdout().flush().unwrap();
                    
                    let mut target_choice = String::new();
                    io::stdin().read_line(&mut target_choice).unwrap();
                    
                    let target_str = target_choice.trim();
                    let target_currency = if target_str == "1" {
                        "PHP"
                    } else if target_str == "2" {
                        "USD"
                    } else if target_str == "3" {
                        "JPY"
                    } else if target_str == "4" {
                        "GBP"
                    } else if target_str == "5" {
                        "EUR"
                    } else if target_str == "6" {
                        "CNY"
                    } else {
                        ""
                    };

                    if target_currency != "" {
                        let source_rate = self.get_exchange_rate(source_currency);
                        let target_rate = self.get_exchange_rate(target_currency);

                        if source_rate != 0.0 && target_rate != 0.0 {
                            let amount_in_php = source_amount * source_rate;
                            let exchange_amount = amount_in_php / target_rate;
                            println!("Exchange Amount: {:.2}", exchange_amount);
                        } else {
                            println!("Error: Exchange rate not set for selected currencies.");
                        }
                    } else {
                        println!("Error: Invalid currency selection.");
                    }
                } else {
                    println!("Error: Invalid amount.");
                }
            } else {
                println!("Error: Invalid amount.");
            }
        } else {
            println!("Error: Invalid currency selection.");
        }
    }

    fn show_interest_amount(&self) {
        println!("\nShow Interest Amount");
        print!("Account Name: ");
        io::stdout().flush().unwrap();
        
        let mut name = String::new();
        io::stdin().read_line(&mut name).unwrap();
        let name = name.trim().to_string();

        let account_index = self.find_account(&name);
        if account_index.is_some() {
            let index = account_index.unwrap();
            println!("Current Balance: {:.2}", self.accounts[index].balance);
            println!("Currency: {}", self.accounts[index].currency);
            println!("Interest Rate: 5%");

            print!("\nTotal Number of Days: ");
            io::stdout().flush().unwrap();
            
            let mut days_str = String::new();
            io::stdin().read_line(&mut days_str).unwrap();
            
            let days_result = days_str.trim().parse::<u32>();
            if days_result.is_ok() {
                let days = days_result.unwrap();
                if days > 0 {
                    let annual_rate = 0.05;
                    let mut balance = self.accounts[index].balance;
                    
                    println!("\n{:<6} | {:<12} | {:<12}", "Day", "Interest", "Balance");
                    println!("{}", "-".repeat(36));
                    
                    let mut day = 1;
                    while day <= days {
                        let daily_interest = balance * (annual_rate / 365.0);
                        let rounded_interest = (daily_interest * 100.0).round() / 100.0;
                        balance += rounded_interest;
                        println!("{:<6} | {:<12.2} | {:<12.2}", day, rounded_interest, balance);
                        day += 1;
                    }
                } else {
                    println!("Error: Invalid number of days.");
                }
            } else {
                println!("Error: Invalid number of days.");
            }
        } else {
            println!("Error: Account not found.");
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

fn main() {
    let mut system = BankingSystem::new();
    
    println!("Welcome to Banking & Currency Exchange Application!");
    
    let mut continue_program = true;
    while continue_program {
        system.display_main_menu();
        let option = get_input("Enter your choice: ");
        
        if option == "1" {
            system.register_account();
        } else if option == "2" {
            system.deposit_amount();
        } else if option == "3" {
            system.withdraw_amount();
        } else if option == "4" {
            system.currency_exchange();
        } else if option == "5" {
            system.record_exchange_rate();
        } else if option == "6" {
            system.show_interest_amount();
        } else if option == "0" {
            println!("Thank you for using our Banking System. Goodbye!");
            continue_program = false;
        } else {
            println!("Error: Invalid option. Please try again.");
        }
        
        if continue_program {
            let back_to_menu = get_input("\nBack to the Main Menu (Y/N): ");
            if back_to_menu.to_uppercase() == "N" {
                println!("Thank you for using our Banking System. Goodbye!");
                continue_program = false;
            }
        }
    }
}

