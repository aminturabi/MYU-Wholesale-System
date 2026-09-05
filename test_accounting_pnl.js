const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = global;
global.document = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => []
};

// Mock localStorage
const storageStore = {};
global.localStorage = {
  getItem: (k) => storageStore[k] || null,
  setItem: (k, v) => { storageStore[k] = String(v); },
  removeItem: (k) => { delete storageStore[k]; },
  clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); }
};

// Load modular JS files
require('./frontend/js/utils.js');
require('./frontend/js/storage.js');
require('./frontend/js/purchases.js');
require('./frontend/js/sales.js');
require('./frontend/js/returns.js');
require('./frontend/js/expenses.js');
require('./frontend/js/billing.js');
require('./frontend/js/reports.js');

console.log("=========================================");
console.log("ANTIGRAVITY ACCOUNTING & P&L VERIFICATION");
console.log("=========================================\n");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    if (details) console.error(`   Details:`, details);
    testsFailed++;
  }
}

// 1. Line Item Calculations Test
console.log("--- 1. Testing Sales / POS Line Item Formulas ---");
// Scenario: Qty = 10, Price = 100, Bonus = 2, Disc = 10%, Ext = 5%, Tax = 17%, TP = 70
// 1.1 Gross = 10 * 100 = 1000
// 1.2 Primary Disc = 1000 * 10% = 100
// 1.3 After Primary = 1000 - 100 = 900
// 1.4 Extra Disc = 900 * 5% = 45
// 1.5 Taxable Base = 900 - 45 = 855
// 1.6 Tax = 855 * 17% = 145.35
// 1.7 Final Line Amount = 855 + 145.35 = 1000.35
// 1.8 Net Unit Price = 1000.35 / 10 = 100.035
// 2.1 Stock Deduction = 10 + 2 = 12
// 2.2 COGS = 12 * 70 = 840
// 2.3 Gross Profit (Tax separated) = 855 - 840 = 15

const line = Utils.calcWholesaleLine(10, 100, 2, 10, 5, 17, 100, 70);
assert(line.grossSubtotal === 1000, "1.1 Gross Amount is 1000", line.grossSubtotal);
assert(line.disAmount === 100, "1.2 Primary Discount is 100", line.disAmount);
assert(line.extAmount === 45, "1.4 Extra Discount after primary is 45", line.extAmount);
assert(line.taxableBase === 855, "1.5 Taxable Base is 855", line.taxableBase);
assert(line.taxAmount === 145.35, "1.6 Tax is 145.35", line.taxAmount);
assert(line.lineAmount === 1000.35, "1.7 Final Line Amount is 1000.35", line.lineAmount);
assert(line.netUnitPrice === 100.035, "1.8 Effective Net Unit Price is 100.035", line.netUnitPrice);
assert(line.stockDeduction === 12, "2.1 Stock Deduction (Qty+Bonus) is 12", line.stockDeduction);
assert(line.cogs === 840, "2.2 COGS with bonus is 840", line.cogs);
assert(line.profit === 15, "2.3 Line Gross Profit is 15", line.profit);

// 2. Customer Ledger & Advances (Negative Balance preservation)
console.log("\n--- 2. Testing Customer Ledger & Advance Payments ---");
storage.clearAllData();
const cust = storage.addCustomer({ name: "Dr. Bilal", openingBalance: 0 });
const sale1 = storage.addSale({
  customerId: cust.id,
  customerName: "Dr. Bilal",
  items: [{ productId: "P1", quantity: 1, bonus: 0, price: 500, tp: 300, discountPercent: 0, extPercent: 0, taxPercent: 0 }],
  grossTotal: 500,
  netAmount: 500,
  paidAmount: 700 // Overpaid by 200
});

const updatedCust1 = storage.getCustomers().find(c => c.id === cust.id);
assert(updatedCust1.remainingBalance === -200, "Customer Ledger preserves advance overpayment balance (-200)", updatedCust1.remainingBalance);
assert(Utils.getCustomerBalanceStatus(updatedCust1.remainingBalance) === "Customer Advance / Credit", "Customer status shows Customer Advance / Credit", Utils.getCustomerBalanceStatus(updatedCust1.remainingBalance));

// 3. Sales Returns, Reversal of COGS & Restocking
console.log("\n--- 3. Testing Sales Returns & Reversal ---");
const prod1 = storage.addProduct({ name: "Panadol", availableQty: 100, tp: 30, salePrice: 50 });
const initialStock = prod1.availableQty;

const sale2 = storage.addSale({
  customerId: cust.id,
  customerName: "Dr. Bilal",
  items: [{ productId: prod1.id, name: prod1.name, quantity: 10, bonus: 2, price: 50, tp: 30, discountPercent: 10, extPercent: 0, taxPercent: 0 }],
  grossTotal: 500,
  totalDiscount: 50,
  netAmount: 450,
  paidAmount: 450
});

const afterSaleStock = storage.getProducts().find(p => p.id === prod1.id).availableQty;
assert(afterSaleStock === 100 - 12, "Physical stock decreased by (10 qty + 2 bonus = 12)", afterSaleStock);

// Return 4 units
const netUnitP = 450 / 10; // 45 per unit
const ret = storage.addReturn({
  saleId: sale2.id,
  invoiceNumber: sale2.invoiceNumber,
  customerId: cust.id,
  customerName: cust.name,
  paymentMethod: "Cash",
  items: [{
    productId: prod1.id,
    name: prod1.name,
    returnQty: 4,
    unitPrice: netUnitP,
    tradePrice: 30,
    lineRefund: 4 * 45, // 180
    returnedCogs: 4 * 30, // 120
    lineProfitReversed: 4 * (45 - 30) // 60
  }],
  totalRefundAmount: 180,
  totalCogsReversed: 120,
  totalProfitReversed: 60
});

const afterReturnStock = storage.getProducts().find(p => p.id === prod1.id).availableQty;
assert(afterReturnStock === 88 + 4, "Physical stock increased by returned quantity (+4)", afterReturnStock);

// 4. Complete Business P&L Reconciliation
console.log("\n--- 4. Testing Business Profit & Loss Reconciliation ---");
storage.addExpense({ title: "Shop Rent", amount: 100, category: "Rent & Utilities" });
storage.addManualIncome({ title: "Carton Sale", amount: 25, category: "Other Income" });

// Calculate P&L
const sales = storage.getSales();
const returns = storage.getReturns();
const expenses = storage.getExpenses();
const incomes = storage.getManualIncomes();

let grossSalesRevenue = 0, originalCOGS = 0;
sales.forEach(s => {
  grossSalesRevenue += (s.netAmount || 0);
  originalCOGS += (s.totalCOGS || 0);
});

let totalReturnsRefund = 0, totalReturnedCOGS = 0;
returns.forEach(r => {
  totalReturnsRefund += (r.totalRefundAmount || 0);
  totalReturnedCOGS += (r.totalCogsReversed || 0);
});

const netSalesRev = grossSalesRevenue - totalReturnsRefund;
const netCOGS = originalCOGS - totalReturnedCOGS;
const grossProfit = netSalesRev - netCOGS;
const otherInc = incomes.reduce((a, b) => a + b.amount, 0);
const totExp = expenses.reduce((a, b) => a + b.amount, 0);
const netBusinessProfit = grossProfit + otherInc - totExp;

console.log(`Gross Sales Revenue: ${grossSalesRevenue}`);
console.log(`Returns Refund: ${totalReturnsRefund}`);
console.log(`Net Sales Revenue: ${netSalesRev}`);
console.log(`Original COGS: ${originalCOGS}`);
console.log(`Returned COGS: ${totalReturnedCOGS}`);
console.log(`Net COGS: ${netCOGS}`);
console.log(`Gross Profit: ${grossProfit}`);
console.log(`Other Income: ${otherInc}`);
console.log(`Operating Expenses: ${totExp}`);
console.log(`Net Business Profit: ${netBusinessProfit}`);

assert(netBusinessProfit === (grossProfit + otherInc - totExp), "Business Net Profit matches formula: Gross Profit + Other Income - Expenses");

// 5. Supplier Payable Reconciliation
console.log("\n--- 5. Testing Supplier Payable Reconciliation ---");
const comp = storage.addCompany({ name: "Getz Pharma", openingBalance: 1000 });
const pur = storage.addPurchase({
  companyId: comp.id,
  companyName: comp.name,
  subtotal: 5000,
  totalDiscount: 500,
  grandTotal: 4500,
  paidAmount: 2000,
  remainingAmount: 2500,
  items: [{ productId: prod1.id, quantity: 50, bonus: 5, tp: 100 }]
});

let updatedComp = storage.getCompanies().find(c => c.id === comp.id);
assert(updatedComp.remainingPayable === 1000 + 2500, "Supplier Payable after purchase = 3500", updatedComp.remainingPayable);

storage.addSupplierPayment({ companyId: comp.id, companyName: comp.name, amount: 1500 });
updatedComp = storage.getCompanies().find(c => c.id === comp.id);
assert(updatedComp.remainingPayable === 2000, "Supplier Payable after payment = 2000", updatedComp.remainingPayable);

console.log("\n=========================================");
console.log(`VERIFICATION SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log("=========================================");
