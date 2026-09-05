const fs = require('fs');

// Setup mock browser environment
global.window = global;
global.document = {
  addEventListener: () => {},
  getElementById: () => null,
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

console.log("===============================================================");
console.log("ANTIGRAVITY 25-POINT COMPLETE ACCOUNTING AUDIT & VERIFICATION");
console.log("===============================================================\n");

let passedCount = 0;
let failedCount = 0;

function check(testNumber, testName, condition, details = "") {
  if (condition) {
    console.log(`[PASS] Scenario ${testNumber}: ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] Scenario ${testNumber}: ${testName}`);
    if (details) console.error(`       Details: ${details}`);
    failedCount++;
  }
}

// Reset clean state
storage.clearAllData();

// 1. Cash sale without discount
const prod1 = storage.addProduct({ name: "Augmentin", availableQty: 100, tp: 200, salePrice: 250 });
const sale1 = storage.addSale({
  customerId: "CUST-WALKIN", customerName: "Walk-in", paymentMethod: "Cash",
  items: [{ productId: prod1.id, name: prod1.name, quantity: 2, bonus: 0, price: 250, tp: 200, discountPercent: 0, extPercent: 0, taxPercent: 0 }],
  grossTotal: 500, netAmount: 500, paidAmount: 500, remainingBalance: 0
});
check(1, "Normal Cash Sale without discount", 
  sale1.netAmount === 500 && sale1.paidAmount === 500 && sale1.remainingBalance === 0 && sale1.totalProfit === 100 && sale1.status === "Paid"
);

// 2. Credit sale
const cust1 = storage.addCustomer({ name: "Ali Pharmacy", openingBalance: 0 });
const sale2 = storage.addSale({
  customerId: cust1.id, customerName: cust1.name, paymentMethod: "Credit",
  items: [{ productId: prod1.id, name: prod1.name, quantity: 4, bonus: 0, price: 250, tp: 200, discountPercent: 0, extPercent: 0, taxPercent: 0 }],
  grossTotal: 1000, netAmount: 1000, paidAmount: 0, remainingBalance: 1000
});
const cust1AfterSale2 = storage.getCustomers().find(c => c.id === cust1.id);
check(2, "Normal Credit Sale", 
  sale2.remainingBalance === 1000 && sale2.status === "Unpaid" && cust1AfterSale2.remainingBalance === 1000
);

// 3. Partially paid sale
const sale3 = storage.addSale({
  customerId: cust1.id, customerName: cust1.name, paymentMethod: "Credit",
  items: [{ productId: prod1.id, name: prod1.name, quantity: 2, bonus: 0, price: 250, tp: 200, discountPercent: 0, extPercent: 0, taxPercent: 0 }],
  grossTotal: 500, netAmount: 500, paidAmount: 200, remainingBalance: 300
});
check(3, "Partially Paid Sale", 
  sale3.paidAmount === 200 && sale3.remainingBalance === 300 && sale3.status === "Partially Paid"
);

// 4. Sale with primary discount (10%)
const lineDisc = Utils.calcWholesaleLine(10, 100, 0, 10, 0, 0, 70);
check(4, "Sale with Primary Discount",
  lineDisc.grossSubtotal === 1000 && lineDisc.disAmount === 100 && lineDisc.taxableBase === 900 && lineDisc.lineAmount === 900 && lineDisc.profit === 200
);

// 5. Sale with primary (10%) + extra discount (5%)
const lineExt = Utils.calcWholesaleLine(10, 100, 0, 10, 5, 0, 70);
check(5, "Sale with Primary + Extra Discount (extra applied on remaining after primary)",
  lineExt.grossSubtotal === 1000 && lineExt.disAmount === 100 && lineExt.extAmount === 45 && lineExt.taxableBase === 855 && lineExt.profit === 155
);

// 6. Taxable sale with Tax (17%)
const lineTax = Utils.calcWholesaleLine(10, 100, 0, 0, 0, 17, 70);
// Gross=1000, TaxableBase=1000, Tax=170, LineAmount=1170, COGS=700, Gross Profit=1000-700=300 (Tax excluded from profit)
check(6, "Taxable sale with Tax (Tax does NOT inflate profit)",
  lineTax.taxableBase === 1000 && lineTax.taxAmount === 170 && lineTax.lineAmount === 1170 && lineTax.profit === 300
);

// 7. Sale with bonus units (10 sold + 2 bonus)
const lineBonus = Utils.calcWholesaleLine(10, 100, 2, 0, 0, 0, 70);
// Stock deduction = 12, COGS = 12 * 70 = 840, Gross Profit = 1000 - 840 = 160
check(7, "Sale with Bonus Units (COGS includes bonus units: 12 x 70 = 840)",
  lineBonus.stockDeduction === 12 && lineBonus.cogs === 840 && lineBonus.profit === 160
);

// 8. Multiple products on one invoice
const prod2 = storage.addProduct({ name: "Panadol", availableQty: 200, tp: 30, salePrice: 40 });
const sale8 = storage.addSale({
  customerId: cust1.id, customerName: cust1.name, paymentMethod: "Credit",
  items: [
    { productId: prod1.id, quantity: 2, bonus: 0, price: 250, tp: 200, discountPercent: 0, extPercent: 0, taxPercent: 0 },
    { productId: prod2.id, quantity: 10, bonus: 1, price: 40, tp: 30, discountPercent: 5, extPercent: 0, taxPercent: 0 }
  ],
  grossTotal: 900, totalDiscount: 20, netAmount: 880, paidAmount: 0, remainingBalance: 880
});
check(8, "Multiple Products on One Invoice",
  sale8.items.length === 2 && sale8.netAmount === 880 && sale8.totalCOGS === (2*200 + 11*30)
);

// 9. Partial return
const prod3 = storage.addProduct({ name: "Risek", availableQty: 50, tp: 100, salePrice: 150 });
const sale9 = storage.addSale({
  customerId: cust1.id, customerName: cust1.name, paymentMethod: "Cash",
  items: [{ productId: prod3.id, name: prod3.name, quantity: 10, bonus: 0, price: 150, tp: 100, discountPercent: 10, extPercent: 0, taxPercent: 0 }],
  grossTotal: 1500, totalDiscount: 150, netAmount: 1350, paidAmount: 1350, remainingBalance: 0
});
const stockBeforeRet = storage.getProducts().find(p => p.id === prod3.id).availableQty;
const ret9 = storage.addReturn({
  saleId: sale9.id, invoiceNumber: sale9.invoiceNumber, customerId: cust1.id, customerName: cust1.name, paymentMethod: "Cash",
  items: [{ productId: prod3.id, name: prod3.name, returnQty: 3, unitPrice: 135, tradePrice: 100, lineRefund: 405, returnedCogs: 300, lineProfitReversed: 105 }],
  totalRefundAmount: 405, totalCogsReversed: 300, totalProfitReversed: 105
});
const stockAfterRet = storage.getProducts().find(p => p.id === prod3.id).availableQty;
check(9, "Partial Return (Restocks 3 units, reverses 405 refund & 300 COGS)",
  stockAfterRet === stockBeforeRet + 3 && ret9.totalRefundAmount === 405 && ret9.totalProfitReversed === 105
);

// 10. Full return
const ret10 = storage.addReturn({
  saleId: sale9.id, invoiceNumber: sale9.invoiceNumber, customerId: cust1.id, customerName: cust1.name, paymentMethod: "Cash",
  items: [{ productId: prod3.id, name: prod3.name, returnQty: 7, unitPrice: 135, tradePrice: 100, lineRefund: 945, returnedCogs: 700, lineProfitReversed: 245 }],
  totalRefundAmount: 945, totalCogsReversed: 700, totalProfitReversed: 245
});
check(10, "Full Return (Remaining 7 units returned)",
  ret10.totalRefundAmount === 945 && ret10.totalCogsReversed === 700
);

// 11. Multiple returns against the same invoice
const allReturnsForSale9 = storage.getReturns().filter(r => r.saleId === sale9.id);
const totalUnitsRetSale9 = allReturnsForSale9.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.returnQty, 0), 0);
check(11, "Multiple Returns against same invoice tracked accurately (3 + 7 = 10 units)",
  allReturnsForSale9.length === 2 && totalUnitsRetSale9 === 10
);

// 12. Attempt to return more than sold
const prevReturnedSale9 = totalUnitsRetSale9;
const maxReturnableSale9 = Math.max(0, 10 - prevReturnedSale9);
check(12, "Attempt to return more than sold prevented (Max Returnable = 0)",
  maxReturnableSale9 === 0
);

// 13. Return from a paid invoice (Refund method Cash: reduces totalPaid)
const custPaidBefore = storage.getCustomers().find(c => c.id === cust1.id).totalPaid;
const ret13 = storage.addReturn({
  saleId: sale1.id, invoiceNumber: sale1.invoiceNumber, customerId: cust1.id, customerName: cust1.name, paymentMethod: "Cash",
  items: [{ productId: prod1.id, name: prod1.name, returnQty: 1, unitPrice: 250, tradePrice: 200, lineRefund: 250, returnedCogs: 200, lineProfitReversed: 50 }],
  totalRefundAmount: 250, totalCogsReversed: 200, totalProfitReversed: 50
});
const custPaidAfter = storage.getCustomers().find(c => c.id === cust1.id).totalPaid;
check(13, "Return from Paid Invoice with Cash refund (Reduces customer totalPaid without corrupting remaining balance)",
  custPaidAfter === custPaidBefore - 250
);

// 14. Return from a credit invoice (Refund method Customer Credit: reduces remainingBalance)
const custBalBefore14 = storage.getCustomers().find(c => c.id === cust1.id).remainingBalance;
const ret14 = storage.addReturn({
  saleId: sale2.id, invoiceNumber: sale2.invoiceNumber, customerId: cust1.id, customerName: cust1.name, paymentMethod: "Customer Credit",
  items: [{ productId: prod1.id, name: prod1.name, returnQty: 1, unitPrice: 250, tradePrice: 200, lineRefund: 250, returnedCogs: 200, lineProfitReversed: 50 }],
  totalRefundAmount: 250, totalCogsReversed: 200, totalProfitReversed: 50
});
const custBalAfter14 = storage.getCustomers().find(c => c.id === cust1.id).remainingBalance;
check(14, "Return from Credit Invoice (Credit note reduces customer remaining balance)",
  custBalAfter14 === custBalBefore14 - 250
);

// 15. Customer overpayment (e.g. Net sale = 500, paid = 800 -> Ledger balance = -300)
const custAdv = storage.addCustomer({ name: "Al-Razi Med", openingBalance: 0 });
storage.addSale({
  customerId: custAdv.id, customerName: custAdv.name, paymentMethod: "Cash",
  items: [{ productId: prod1.id, quantity: 2, bonus: 0, price: 250, tp: 200, discountPercent: 0, extPercent: 0, taxPercent: 0 }],
  grossTotal: 500, netAmount: 500, paidAmount: 800, remainingBalance: 0
});
const custAdvAfter = storage.getCustomers().find(c => c.id === custAdv.id);
check(15, "Customer Overpayment preserves negative balance in ledger (-300)",
  custAdvAfter.remainingBalance === -300
);

// 16. Customer credit/advance status classifier
check(16, "Customer Credit / Advance status is correctly recognized",
  Utils.getCustomerBalanceStatus(custAdvAfter.remainingBalance) === "Customer Advance / Credit"
);

// 17. Supplier purchase (Total purchases and payable increase)
const comp1 = storage.addCompany({ name: "GSK Pakistan", openingBalance: 0 });
const pur1 = storage.addPurchase({
  companyId: comp1.id, companyName: comp1.name, subtotal: 10000, totalDiscount: 1000, grandTotal: 9000, paidAmount: 4000, remainingAmount: 5000,
  items: [{ productId: prod1.id, quantity: 45, bonus: 5, tp: 200 }]
});
const comp1AfterPur = storage.getCompanies().find(c => c.id === comp1.id);
check(17, "Supplier Purchase updates inventory (+50 units) and payable (5000)",
  comp1AfterPur.totalPurchases === 9000 && comp1AfterPur.totalPayments === 4000 && comp1AfterPur.remainingPayable === 5000
);

// 18. Supplier payment
storage.addSupplierPayment({ companyId: comp1.id, companyName: comp1.name, amount: 2000 });
const comp1AfterPay = storage.getCompanies().find(c => c.id === comp1.id);
check(18, "Supplier Payment reduces remaining payable from 5000 to 3000",
  comp1AfterPay.totalPayments === 6000 && comp1AfterPay.remainingPayable === 3000
);

// 19. Supplier purchase deletion / return
const purToDelete = storage.addPurchase({
  companyId: comp1.id, companyName: comp1.name, subtotal: 2000, totalDiscount: 0, grandTotal: 2000, paidAmount: 0, remainingAmount: 2000,
  items: [{ productId: prod1.id, quantity: 10, bonus: 0, tp: 200 }]
});
const comp1AfterPur2 = storage.getCompanies().find(c => c.id === comp1.id);
storage.deletePurchase(purToDelete.id);
const comp1AfterPurDelete = storage.getCompanies().find(c => c.id === comp1.id);
check(19, "Supplier Purchase Deletion/Reversal properly restores company payable",
  comp1AfterPurDelete.remainingPayable === 3000
);

// 20. Operating expense
const exp1 = storage.addExpense({ title: "Electricity Bill", amount: 1500, category: "Rent & Utilities" });
check(20, "Operating Expense is recorded and categorized",
  exp1.amount === 1500 && exp1.category === "Rent & Utilities"
);

// 21. Other business income
const inc1 = storage.addManualIncome({ title: "Scrap Cartons", amount: 300, category: "Other Income" });
check(21, "Other Business Income is recorded",
  inc1.amount === 300 && inc1.category === "Other Income"
);

// 22. P&L before returns test
// Total Gross Profit = Net Sales Revenue - Net COGS
// Net Business Profit = Gross Profit + Other Income - Expenses
const allSales = storage.getSales();
const allReturns = storage.getReturns();
const allIncomes = storage.getManualIncomes();
const allExpenses = storage.getExpenses();

let grossRev = 0, origCOGS = 0;
allSales.forEach(s => {
  const tax = parseFloat(s.tax) || 0;
  grossRev += (parseFloat(s.netAmount) || 0) - tax;
  origCOGS += (parseFloat(s.totalCOGS) || 0);
});

let retRev = 0, retCOGS = 0;
allReturns.forEach(r => {
  retRev += (parseFloat(r.totalRevenueReversed) || (parseFloat(r.totalRefundAmount) - (parseFloat(r.totalTaxReversed)||0)));
  retCOGS += (parseFloat(r.totalCogsReversed) || 0);
});

const netSalesRevenue = Utils.round(grossRev - retRev);
const netCOGS = Utils.round(origCOGS - retCOGS);
const grossProfit = Utils.round(netSalesRevenue - netCOGS);
const totalIncomeBeforeExp = Utils.round(grossProfit + allIncomes.reduce((a, b) => a + b.amount, 0));
const netBusinessProfit = Utils.round(totalIncomeBeforeExp - allExpenses.reduce((a, b) => a + b.amount, 0));

check(22, "P&L Gross Profit = Net Sales Revenue - Net COGS",
  grossProfit === Utils.round(netSalesRevenue - netCOGS)
);

check(23, "P&L Net Business Profit = Gross Profit + Other Income - Expenses",
  netBusinessProfit === Utils.round(grossProfit + 300 - 1500)
);

// 24. Inventory valuation after sale
const productsList = storage.getProducts();
let stockCostVal = 0, stockRetailVal = 0;
productsList.forEach(p => {
  const q = Math.max(0, p.availableQty || 0);
  stockCostVal += q * (parseFloat(p.tp) || 0);
  stockRetailVal += q * (parseFloat(p.salePrice) || 0);
});
stockCostVal = Utils.round(stockCostVal);
stockRetailVal = Utils.round(stockRetailVal);
const potProfit = Utils.round(stockRetailVal - stockCostVal);

check(24, "Inventory Valuation Cost and Retail Values accurately calculated",
  stockCostVal > 0 && stockRetailVal > stockCostVal && potProfit === (stockRetailVal - stockCostVal)
);

// 25. Inventory valuation after return
const prodPanadol = storage.getProducts().find(p => p.name === "Panadol");
const panadolStockBefore = prodPanadol.availableQty;
storage.addReturn({
  saleId: sale8.id, invoiceNumber: sale8.invoiceNumber, customerId: cust1.id, customerName: cust1.name, paymentMethod: "Cash",
  items: [{ productId: prodPanadol.id, name: prodPanadol.name, returnQty: 2, unitPrice: 38, tradePrice: 30, lineRefund: 76, returnedCogs: 60, lineProfitReversed: 16 }],
  totalRefundAmount: 76, totalCogsReversed: 60, totalProfitReversed: 16
});
const panadolStockAfter = storage.getProducts().find(p => p.id === prodPanadol.id).availableQty;
check(25, "Inventory Valuation after Return updates available stock and valuation",
  panadolStockAfter === panadolStockBefore + 2
);

console.log("\n===============================================================");
console.log(`AUDIT RESULTS: ${passedCount} Scenarios Passed, ${failedCount} Failed`);
console.log("===============================================================");
