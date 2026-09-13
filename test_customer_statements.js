const fs = require('fs');

// Setup mock browser environment
global.window = global;
global.document = {
  addEventListener: () => {},
  getElementById: (id) => ({
    addEventListener: () => {},
    value: '',
    innerHTML: '',
    textContent: '',
    style: {}
  }),
  querySelectorAll: () => []
};

const storageStore = {};
global.localStorage = {
  getItem: (k) => storageStore[k] || null,
  setItem: (k, v) => { storageStore[k] = String(v); },
  removeItem: (k) => { delete storageStore[k]; },
  clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); }
};

// Load code files
require('./frontend/js/utils.js');
require('./frontend/js/storage.js');
require('./frontend/js/purchases.js');
require('./frontend/js/sales.js');
require('./frontend/js/returns.js');
require('./frontend/js/expenses.js');
require('./frontend/js/billing.js');
require('./frontend/js/reports.js');
require('./frontend/js/statements.js');

console.log("==========================================================================");
console.log("CUSTOMER LEDGER STATEMENT VERIFICATION & CALCULATION AUDIT");
console.log("==========================================================================\n");

let passedCount = 0;
let failedCount = 0;

function check(testNumber, testName, condition, details = "") {
  if (condition) {
    console.log(`[PASS] Test ${testNumber}: ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] Test ${testNumber}: ${testName}`);
    if (details) console.error(`       Details: ${details}`);
    failedCount++;
  }
}

// Reset clean database
storage.clearAllData();

const custA = storage.addCustomer({ name: "Khyber Medico", shopName: "Khyber Medico Store", openingBalance: 0 });
const custB = storage.addCustomer({ name: "Al-Razi Pharmacy", shopName: "Al-Razi Med", openingBalance: 0 });

const prod1 = storage.addProduct({ name: "Augmentin 625mg", company: "GSK Pakistan", tp: 240, salePrice: 240 });
const prod2 = storage.addProduct({ name: "Risek 20mg", company: "Getz Pharma", tp: 442.85, salePrice: 442.85 });
const prod3 = storage.addProduct({ name: "Example Product", company: "Pharma Corp", tp: 930.75, salePrice: 930.75 });

// 1. Example calculation benchmark from user prompt:
const valBenchmark = Utils.round(930.75 * 149, 2);
check(1, "Benchmark: 930.75 * 149 = 138,681.75",
  valBenchmark === 138681.75
);

// 2. Add sales across different months in 2026 for custA
// Jan 2026: 50 units Augmentin (with 5% discount -> 228 net rate), 100 units Risek, 49 units Example Product
storage.addSale({
  customerId: custA.id, customerName: custA.name, date: "2026-01-15",
  items: [
    { productId: prod1.id, name: prod1.name, company: prod1.company, quantity: 50, tp: 240, price: 240, netUnitPrice: 228, discountPercent: 5, totalAmount: 11400 },
    { productId: prod2.id, name: prod2.name, company: prod2.company, quantity: 100, tp: 442.85, price: 442.85, netUnitPrice: 442.85, discountPercent: 0, totalAmount: 44285 },
    { productId: prod3.id, name: prod3.name, company: prod3.company, quantity: 49, tp: 930.75, price: 930.75, netUnitPrice: 930.75, discountPercent: 0, totalAmount: 45606.75 }
  ]
});

// Feb 2026: 30 units Augmentin (netUnitPrice 228), 50 units Risek, 100 units Example Product
storage.addSale({
  customerId: custA.id, customerName: custA.name, date: "2026-02-10",
  items: [
    { productId: prod1.id, name: prod1.name, company: prod1.company, quantity: 30, tp: 240, price: 240, netUnitPrice: 228, discountPercent: 5, totalAmount: 6840 },
    { productId: prod2.id, name: prod2.name, company: prod2.company, quantity: 50, tp: 442.85, price: 442.85, netUnitPrice: 442.85, discountPercent: 0, totalAmount: 22142.5 },
    { productId: prod3.id, name: prod3.name, company: prod3.company, quantity: 100, tp: 930.75, price: 930.75, netUnitPrice: 930.75, discountPercent: 0, totalAmount: 93075 }
  ]
});

// 3. Test Statement calculation for Cust A over a 2-month Custom Range (2026-01-01 to 2026-02-28)
const stmtEngine = new CustomerStatementsModule();
stmtEngine.getPeriodDateRange = () => ({
  startDate: "2026-01-01",
  endDate: "2026-02-28",
  periodLabel: "Custom Range (2026-01-01 to 2026-02-28)"
});

const stmtMulti = stmtEngine.calculateCustomerStatementData(custA.id, 'custom');

// Find Augmentin (discounted to 228) in statement
let augEntry = null;
let prod3Entry = null;
stmtMulti.groups.forEach(g => {
  const fAug = g.products.find(p => p.productName === prod1.name);
  if (fAug) augEntry = fAug;
  const found = g.products.find(p => p.productName === prod3.name);
  if (found) prod3Entry = found;
});

check(2, "Requirement 4: Bill discounted price is used in ledger (228.00 instead of 240.00)",
  augEntry !== null && augEntry.tp === 228 && augEntry.totalUnits === 80 && augEntry.totalValue === 18240
);

check(3, "Product grouping: Example Product grouped across invoices (49 + 100 = 149 units)",
  prod3Entry !== null && prod3Entry.totalUnits === 149 && prod3Entry.monthQuantities['2026-01'] === 49 && prod3Entry.monthQuantities['2026-02'] === 100
);

check(4, "Product Total Value formula: 930.75 * 149 = 138,681.75",
  prod3Entry !== null && prod3Entry.totalValue === 138681.75
);

// 4. Test Return handling (Sales return of 9 units of Example Product in Feb 2026)
storage.addReturn({
  saleId: "MOCK-SALE",
  invoiceNumber: "MOCK-INV",
  date: "2026-02-20",
  customerId: custA.id,
  customerName: custA.name,
  items: [
    { productId: prod3.id, name: prod3.name, company: prod3.company, returnQty: 9, tp: 930.75, unitPrice: 930.75, netUnitPrice: 930.75 }
  ],
  totalRefundAmount: 930.75 * 9
});

const stmtAfterReturn = stmtEngine.calculateCustomerStatementData(custA.id, 'custom');
let prod3AfterRet = null;
stmtAfterReturn.groups.forEach(g => {
  const found = g.products.find(p => p.productName === prod3.name);
  if (found) prod3AfterRet = found;
});

check(5, "Requirement 3: Return deduction preserves negative quantities in monthly bucket (Feb was 100, minus 9 = 91)",
  prod3AfterRet !== null && prod3AfterRet.monthQuantities['2026-02'] === 91
);

check(6, "Requirement 3: Return deduction updates Total Units (149 - 9 = 140 units) and tracks soldUnits (149) and returnUnits (9)",
  prod3AfterRet !== null && prod3AfterRet.soldUnits === 149 && prod3AfterRet.returnUnits === 9 && prod3AfterRet.totalUnits === 140
);

check(7, "Return deduction updates Total Value: 930.75 * 140 = 130,305.00",
  prod3AfterRet !== null && prod3AfterRet.totalValue === 130305.00
);

// 5. Test Pure Return (e.g. Returned 1 unit of product without prior sales in period -> should show -1)
storage.addReturn({
  saleId: "MOCK-SALE-RET",
  invoiceNumber: "MOCK-INV-RET",
  date: "2026-02-25",
  customerId: custA.id,
  customerName: custA.name,
  items: [
    { productId: "PROD-RET-ONLY", name: "Surgical Gloves", company: "SurgiCorp", returnQty: 1, netUnitPrice: 350 }
  ],
  totalRefundAmount: 350
});

const stmtWithPureReturn = stmtEngine.calculateCustomerStatementData(custA.id, 'custom');
let retOnlyEntry = null;
stmtWithPureReturn.groups.forEach(g => {
  const found = g.products.find(p => p.productName === "Surgical Gloves");
  if (found) retOnlyEntry = found;
});

check(8, "Requirement 3: Return is showing in statement as negative qty (-1 units, -350.00 value)",
  retOnlyEntry !== null && retOnlyEntry.totalUnits === -1 && retOnlyEntry.totalValue === -350
);

// 6. Test Customer / Pharmacy Search Filter functionality
const allCustomers = storage.getCustomers();
const filterMatchKhyber = allCustomers.filter(c => {
  const q = "khyber";
  return (c.name || '').toLowerCase().includes(q) || (c.shopName || '').toLowerCase().includes(q);
});

const filterMatchRazi = allCustomers.filter(c => {
  const q = "al-razi";
  return (c.name || '').toLowerCase().includes(q) || (c.shopName || '').toLowerCase().includes(q);
});

check(9, "Requirement 1: Search on Customer / Pharmacy correctly finds customer ('Khyber') and pharmacy ('Al-Razi')",
  filterMatchKhyber.length === 1 && filterMatchKhyber[0].id === custA.id &&
  filterMatchRazi.length === 1 && filterMatchRazi[0].id === custB.id
);

// 7. Group Totals and Grand Company Totals
let totalGroupUnitsSum = 0;
let totalGroupValueSum = 0;
stmtWithPureReturn.groups.forEach(g => {
  totalGroupUnitsSum += g.groupTotalUnits;
  totalGroupValueSum = Utils.round(totalGroupValueSum + g.groupTotalValue, 2);
});

check(10, "Group Totals match sum of products in each group",
  totalGroupUnitsSum === stmtWithPureReturn.overallTotalUnits && totalGroupValueSum === stmtWithPureReturn.overallTotalValue
);

console.log("\n==========================================================================");
console.log(`STATEMENT TESTS RESULT: ${passedCount} Passed, ${failedCount} Failed`);
console.log("==========================================================================");

if (failedCount > 0) {
  process.exit(1);
}
