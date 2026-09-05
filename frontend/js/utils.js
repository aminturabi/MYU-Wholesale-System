/* ==================== REUSABLE UTILITIES & HELPERS ==================== */
var app = typeof window !== 'undefined' && window.app ? window.app : null;
const MYU_OFFICIAL_LOGO_B64 = "myu-logo.png";
const MYU_OFFICIAL_SIGNATURE_B64 = "signature.png";
if (typeof window !== 'undefined') {
  window.MYU_OFFICIAL_LOGO_B64 = MYU_OFFICIAL_LOGO_B64;
  window.MYU_OFFICIAL_SIGNATURE_B64 = MYU_OFFICIAL_SIGNATURE_B64;
}
if (typeof global !== 'undefined') {
  global.MYU_OFFICIAL_LOGO_B64 = MYU_OFFICIAL_LOGO_B64;
  global.MYU_OFFICIAL_SIGNATURE_B64 = MYU_OFFICIAL_SIGNATURE_B64;
}

const Utils = {
        formatCurrency: (amount, currency = 'Rs.') => {
          const val = parseFloat(amount) || 0;
          return `${currency} ${val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },

        formatDate: (dateStr) => {
          if (!dateStr) return '-';
          return dateStr;
        },

        todayStr: (offsetDays = 0) => {
          const d = new Date();
          d.setDate(d.getDate() + offsetDays);
          return d.toISOString().split('T')[0];
        },

        nowTimeStr: () => {
          return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },

        whatsappLink: (phone) => {
          if (!phone) return '';
          const clean = phone.replace(/[^0-9]/g, '');
          return clean ? `https://wa.me/${clean}` : '';
        },

        badge: (statusText, customClass = '') => {
          let badgeClass = 'badge-in-stock';
          if (['Out of Stock', 'EXPIRED', 'Unpaid'].includes(statusText)) badgeClass = 'badge-out-stock';
          else if (['Low Stock', 'Partially Paid'].includes(statusText)) badgeClass = 'badge-low-stock';
          else if (['Paid', 'In Stock'].includes(statusText)) badgeClass = 'badge-paid';

          return `<span class="badge-status ${customClass || badgeClass}">${statusText}</span>`;
        },

        round: (num, decimals = 2) => {
          if (num === null || num === undefined || isNaN(Number(num))) return 0;
          const val = Number(num);
          if (!isFinite(val)) return 0;
          return Number(Math.round(Number(val + 'e' + decimals)) + 'e-' + decimals);
        },

        uid: (prefix = 'ID') => {
          return `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        },

        calcLineTotal: (qty, price, discountPercent = 0) => {
          const q = parseInt(qty) || 0;
          const p = parseFloat(price) || 0;
          const d = parseFloat(discountPercent) || 0;
          const gross = Utils.round(q * p);
          const dis = Utils.round((gross * d) / 100);
          return Math.max(0, Utils.round(gross - dis));
        },

        // 1. SALES / POS LINE ITEM CALCULATIONS & 2. INVENTORY AND COGS
        calcWholesaleLine: (qty, price, bonus = 0, disPercent = 0, extPercent = 0, taxPercent = 0, tp = 0, purchaseCost = 0) => {
          const q = Math.max(0, parseInt(qty) || 0);
          const bns = Math.max(0, parseInt(bonus) || 0);
          const p = Math.max(0, parseFloat(price) || 0);
          const tradePrice = Math.max(0, parseFloat(tp) || p || 0);
          const unitCost = Math.max(0, parseFloat(purchaseCost) || (tradePrice * 0.85) || 0);
          const dis = Math.max(0, parseFloat(disPercent) || 0);
          const ext = Math.max(0, parseFloat(extPercent) || 0);
          const tax = Math.max(0, parseFloat(taxPercent) || 0);

          // 1. Calculate per-unit discounts (Cascade) & Advance Tax on Gross TP
          const unitDiscount = (tradePrice * dis) / 100;
          const unitExtDiscount = ((tradePrice - unitDiscount) * ext) / 100;
          const totalUnitDiscount = unitDiscount + unitExtDiscount;
          const billedNetRate = tradePrice - totalUnitDiscount;
          const unitTax = (tradePrice * tax) / 100;                                       // Adv Tax assessed on Gross TP
          const netUnitPrice = Utils.round(billedNetRate + unitTax, 4);                   // Effective Net Rate per Unit

          // 2. Financial Line Totals (Billed strictly on paid 'qty', NOT 'totalQty')
          const lineGross = Utils.round(q * tradePrice, 2);                               // Excludes bonus from gross bill
          const disAmount = Utils.round(q * unitDiscount, 2);
          const extAmount = Utils.round(q * unitExtDiscount, 2);
          const totalDiscountAmount = Utils.round(q * totalUnitDiscount, 2);              // Applies discount to paid qty
          const taxAmount = Utils.round(q * unitTax, 2);                                  // Line Advance Tax Amount
          const taxableBase = Utils.round(lineGross - totalDiscountAmount, 2);
          const lineAmount = Utils.round(lineGross - totalDiscountAmount + taxAmount, 2); // Line Net Revenue

          // 3. Inventory & COGS Tracking (Includes bonus stock)
          const totalQty = q + bns;                                                       // Total items leaving stock
          const lineCogs = Utils.round(totalQty * unitCost, 2);                           // Total cost of stock sold
          const lineProfit = Utils.round(lineAmount * 0.05, 2);                           // 5% Estimated Profit on Line Net Amount

          // 4. Realized Profit Margin & Unit Profit Tracking (5% Net Margin)
          const unitProfit = Utils.round(netUnitPrice * 0.05, 4);
          const purchaseDiscountPercent = tradePrice > 0 ? Utils.round(((tradePrice - unitCost) / tradePrice) * 100, 2) : 0;
          const effectiveSaleDiscountPercent = tradePrice > 0 ? Utils.round((totalUnitDiscount / tradePrice) * 100, 2) : 0;
          const realizedMarginPercent = 5.0;

          return {
            qty: q,
            bonus: bns,
            stockDeduction: totalQty,
            totalQty,
            price: p || tradePrice,
            tp: tradePrice,
            tradePrice,
            purchaseCost: unitCost,
            unitCost,
            disPercent: dis,
            disAmount,
            unitDiscount: Utils.round(unitDiscount, 4),
            extPercent: ext,
            extAmount,
            unitExtDiscount: Utils.round(unitExtDiscount, 4),
            totalDiscountAmount,
            taxPercent: tax,
            advTaxPercent: tax,
            taxAmount,
            advTaxAmount: taxAmount,
            unitTax: Utils.round(unitTax, 4),
            grossSubtotal: lineGross,
            lineGross,
            taxableBase,
            billedNetRate: Utils.round(billedNetRate, 4),
            lineAmount,
            lineNetRevenue: lineAmount,
            netUnitPrice,
            taxableUnitPrice: Utils.round(taxableBase / (q || 1), 4),
            cogs: lineCogs,
            lineCogs,
            profit: lineProfit,
            lineProfit,
            lineGrossProfit: lineProfit,
            unitProfit,
            purchaseDiscountPercent,
            effectiveSaleDiscountPercent,
            realizedMarginPercent: 5.0
          };
        },

        // 3.8 Payment Status Helper
        getPaymentStatus: (paidAmount, netSalesAmount) => {
          const paid = Utils.round(parseFloat(paidAmount) || 0);
          const net = Utils.round(parseFloat(netSalesAmount) || 0);
          if (paid >= net) return 'Paid';
          if (paid > 0 && paid < net) return 'Partially Paid';
          return 'Unpaid';
        },

        // 4.3 Customer Balance Status Helper
        getCustomerBalanceStatus: (balance) => {
          const b = Utils.round(parseFloat(balance) || 0);
          if (b > 0) return 'Outstanding';
          if (b === 0) return 'Cleared';
          return 'Customer Advance / Credit';
        },

        emptyTable: (tbody, colSpan, message) => {
          if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 30px; color: var(--text-muted);">${message}</td></tr>`;
          }
        },

        populateSelect: (selectElem, items, valueKey, labelFn, selectedVal = '', defaultLabel = '-- Select --') => {
          if (!selectElem) return;
          let html = `<option value="">${defaultLabel}</option>`;
          (items || []).forEach(item => {
            if (!item) return;
            const val = item[valueKey] || item.id || item.invoiceNumber || '';
            const label = typeof labelFn === 'function' ? labelFn(item) : (item[labelFn] || val);
            const sel = val === selectedVal ? 'selected' : '';
            html += `<option value="${val}" ${sel}>${label}</option>`;
          });
          selectElem.innerHTML = html;
        },

        numberToWords: (num, currencyName = "Rupees", fractionName = "Paisas") => {
          if (num === null || num === undefined || isNaN(num)) return `Zero ${currencyName} Only`;
          const val = Math.abs(parseFloat(num) || 0);
          const integerPart = Math.floor(val);
          const fractionPart = Math.round((val - integerPart) * 100);

          const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
          const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

          function convertChunk(n) {
            if (n === 0) return '';
            if (n < 20) return a[n];
            if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
            return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
          }

          function inWords(amount) {
            if (amount === 0) return 'Zero';
            if (amount < 1000) return convertChunk(amount);
            if (amount < 100000) return convertChunk(Math.floor(amount / 1000)) + ' Thousand' + (amount % 1000 ? ' ' + convertChunk(amount % 1000) : '');
            if (amount < 10000000) return convertChunk(Math.floor(amount / 100000)) + ' Lakh' + (amount % 100000 ? ' ' + inWords(amount % 100000) : '');
            return convertChunk(Math.floor(amount / 10000000)) + ' Crore' + (amount % 10000000 ? ' ' + inWords(amount % 10000000) : '');
          }

          const intWords = inWords(integerPart) || 'Zero';
          let result = `${intWords} ${currencyName}`;

          if (fractionPart > 0) {
            const fracWords = inWords(fractionPart);
            result += ` and ${fracWords} ${fractionName}`;
          }

          return `${result} Only`;
        }
      };

if (typeof window !== 'undefined') window.Utils = Utils;
if (typeof global !== 'undefined') global.Utils = Utils;
if (typeof module !== 'undefined' && module.exports) module.exports = Utils;


      /* ==================== DATA STORAGE MANAGER ==================== */