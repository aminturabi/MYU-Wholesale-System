/* ==================== SALES, CUSTOMERS & RETURNS MODULE ==================== */
class SalesModule {
  constructor() { this.bindEvents(); }

  bindEvents() {
    const search = document.getElementById('sales-search-input');
    const dateFilter = document.getElementById('sales-date-filter');
    const statusFilter = document.getElementById('sales-status-filter');

    if (search) search.addEventListener('input', () => this.renderSalesHistory());
    if (dateFilter) dateFilter.addEventListener('change', () => this.renderSalesHistory());
    if (statusFilter) statusFilter.addEventListener('change', () => this.renderSalesHistory());

    const custForm = document.getElementById('customer-form');
    if (custForm) custForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveCustomerForm(); });

    const cpayForm = document.getElementById('customer-payment-form');
    if (cpayForm) cpayForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveCustomerPaymentForm(); });
  }

  renderSalesHistory() {
    const tbody = document.getElementById('sales-history-tbody');
    if (!tbody) return;

    const sales = storage.getSales();
    const settings = storage.getSettings();

    const searchInput = document.getElementById('sales-search-input');
    const query = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';
    const dateInput = document.getElementById('sales-date-filter');
    const dateVal = dateInput ? (dateInput.value || '') : '';
    const statusInput = document.getElementById('sales-status-filter');
    const statusVal = statusInput ? (statusInput.value || '') : '';

    const filtered = sales.filter(s => {
      const matchQuery = !query || s.invoiceNumber.toLowerCase().includes(query) || s.customerName.toLowerCase().includes(query) || (s.customerShop || '').toLowerCase().includes(query);
      return matchQuery && (!dateVal || s.date === dateVal) && (!statusVal || s.status === statusVal);
    });

    if (!filtered.length) { Utils.emptyTable(tbody, 10, 'No sales invoices found matching filters.'); return; }

    let html = '';
    filtered.slice().reverse().forEach(s => {
      html += `
            <tr>
              <td><span style="font-weight: 700; color: var(--primary);">${s.invoiceNumber}</span></td>
              <td><div style="font-size: 0.85rem; font-weight: 600;">${s.date}</div><div style="font-size: 0.72rem; color: var(--text-muted);">${s.time || ''}</div></td>
              <td><div style="font-weight: 700;">${s.customerName}</div><div style="font-size: 0.75rem; color: var(--text-muted);">${s.customerShop || ''}</div></td>
              <td style="font-weight: 800;">${Utils.formatCurrency(s.netAmount, settings.currency)}</td>
              <td style="color: #059669;">${Utils.formatCurrency(s.totalDiscount, settings.currency)}</td>
              <td style="color: #059669; font-weight: 600;">${Utils.formatCurrency(s.paidAmount, settings.currency)}</td>
              <td style="color: #ef4444; font-weight: 700;">${Utils.formatCurrency(s.remainingBalance, settings.currency)}</td>
              <td style="color: #10b981; font-weight: 700;">${Utils.formatCurrency(s.totalProfit, settings.currency)}</td>
              <td>${Utils.badge(s.status)}</td>
              <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <button class="btn-primary-myu btn-sm-myu" style="padding: 4px 8px; font-size: 0.78rem;" onclick="(window.printInvoiceDirect || (window.salesModule && window.salesModule.printInvoiceDirect))('${s.id || s.invoiceNumber}')" title="Print Invoice"><i class="fa-solid fa-print"></i> Print</button>
                  <button class="btn-secondary-myu btn-sm-myu" onclick="(window.viewInvoiceModal || (window.salesModule && window.salesModule.viewInvoiceModal))('${s.id || s.invoiceNumber}')" title="View Invoice Modal"><i class="fa-solid fa-eye"></i> View</button>
                  <button class="btn-sm-myu" style="background: #f59e0b; color: #ffffff; border: none; font-weight: 700; padding: 4px 8px; font-size: 0.78rem;" onclick="window.openProcessReturnModal('${s.id || s.invoiceNumber}')" title="Process Return for Invoice"><i class="fa-solid fa-rotate-left"></i> Return</button>
                  <button class="btn-sm-myu" style="background: #0284c7; color: #ffffff; border: none; font-weight: 700; padding: 4px 8px; font-size: 0.78rem;" onclick="(window.openEditSaleModal || (window.salesModule && window.salesModule.openEditSaleModal))('${s.id || s.invoiceNumber}')" title="Edit Payment & Remaining Balance"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                  <button class="btn-danger-myu btn-sm-myu" onclick="(window.deleteSale || (window.salesModule && window.salesModule.deleteSale))('${s.id || s.invoiceNumber}')" title="Delete Invoice"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
    });
    tbody.innerHTML = html;
  }

  viewInvoiceModal(saleId) {
    const sales = storage.getSales();
    const sale = sales.find(s => (s.id && s.id === saleId) || (s.invoiceNumber && s.invoiceNumber === saleId));
    if (!sale) return;

    const settings = storage.getSettings();
    const container = document.getElementById('invoice-modal-content');
    if (container) {
      container.innerHTML = this.buildInvoiceTemplate(sale, settings);
    }

    const printBtn = document.getElementById('btn-modal-print-invoice');
    if (printBtn) {
      printBtn.onclick = () => this.printInvoiceDirect(sale.id || sale.invoiceNumber);
    }

    const appObj = window.app || (typeof app !== 'undefined' ? app : null);
    if (appObj && typeof appObj.openModal === 'function') {
      appObj.openModal('invoice-modal');
    }
  }

  printInvoiceDirect(saleId) {
    const sales = storage.getSales();
    const sale = sales.find(s => (s.id && s.id === saleId) || (s.invoiceNumber && s.invoiceNumber === saleId));
    if (!sale) return;

    const container = document.getElementById('printable-invoice');
    if (container) {
      container.innerHTML = this.buildInvoiceTemplate(sale, storage.getSettings());
    }
    setTimeout(() => { window.print(); }, 250);
  }

  openEditSaleModal(saleId) {
    const sales = storage.getSales();
    const sale = sales.find(s => (s.id && s.id === saleId) || (s.invoiceNumber && s.invoiceNumber === saleId));
    if (!sale) return;

    const settings = storage.getSettings();
    document.getElementById('edit-sale-id').value = sale.id || sale.invoiceNumber;
    document.getElementById('es-invoice-num').textContent = sale.invoiceNumber;
    document.getElementById('es-date').textContent = `${sale.date} ${sale.time || ''}`;
    document.getElementById('es-customer-name').textContent = `${sale.customerName} ${sale.customerShop ? '(' + sale.customerShop + ')' : ''}`;
    document.getElementById('es-net-amount').textContent = Utils.formatCurrency(sale.netAmount, settings.currency);
    document.getElementById('es-net-amount').dataset.netAmount = sale.netAmount;
    document.getElementById('es-paid-amount').value = sale.paidAmount;
    document.getElementById('es-payment-method').value = sale.paymentMethod || 'Cash';
    document.getElementById('es-notes').value = sale.notes || '';

    this.calculateEditSaleBalance();
    const appObj = window.app || (typeof app !== 'undefined' ? app : null);
    if (appObj && typeof appObj.openModal === 'function') appObj.openModal('edit-sale-modal');
  }

  calculateEditSaleBalance() {
    const netElem = document.getElementById('es-net-amount');
    if (!netElem) return;
    const netAmount = parseFloat(netElem.dataset.netAmount) || 0;
    const paidInput = document.getElementById('es-paid-amount');
    const paidAmount = Math.max(0, parseFloat(paidInput ? paidInput.value : 0) || 0);

    const remaining = Math.max(0, netAmount - paidAmount);
    const settings = storage.getSettings();

    const remElem = document.getElementById('es-remaining-balance');
    if (remElem) remElem.value = Utils.formatCurrency(remaining, settings.currency);

    const statusElem = document.getElementById('es-status-display');
    if (statusElem) {
      const status = remaining <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partially Paid' : 'Unpaid');
      statusElem.value = status;
      statusElem.style.color = remaining <= 0 ? '#10b981' : (paidAmount > 0 ? '#f59e0b' : '#ef4444');
    }
  }

  saveEditSaleForm(e) {
    if (e) e.preventDefault();
    const saleId = document.getElementById('edit-sale-id').value;
    const paidAmount = parseFloat(document.getElementById('es-paid-amount').value) || 0;
    const paymentMethod = document.getElementById('es-payment-method').value || 'Cash';
    const notes = document.getElementById('es-notes').value || '';

    const updatedSale = storage.updateSalePayment(saleId, paidAmount, paymentMethod, notes);
    if (updatedSale) {
      const settings = storage.getSettings();
      const appObj = window.app || (typeof app !== 'undefined' ? app : null);
      if (appObj) {
        if (typeof appObj.showToast === 'function') appObj.showToast(`Invoice ${updatedSale.invoiceNumber} payment updated! Remaining balance: ${Utils.formatCurrency(updatedSale.remainingBalance, settings.currency)}`, 'success');
        if (typeof appObj.closeModal === 'function') appObj.closeModal('edit-sale-modal');
      }
      this.renderSalesHistory();
      if (appObj && typeof appObj.refreshCurrentView === 'function') appObj.refreshCurrentView();
    }
  }

  deleteSale(saleId) {
    const sales = storage.getSales();
    const sale = sales.find(s => (s.id && s.id === saleId) || (s.invoiceNumber && s.invoiceNumber === saleId));
    if (!sale) return;

    const invName = sale.invoiceNumber || saleId;
    const appObj = window.app || (typeof app !== 'undefined' ? app : null);

    const proceedDelete = () => {
      storage.deleteSale(sale.id || sale.invoiceNumber);
      if (appObj && typeof appObj.showToast === 'function') {
        appObj.showToast(`Invoice ${invName} deleted & inventory restored!`, 'info');
      }
      this.renderSalesHistory();
      if (appObj && typeof appObj.refreshCurrentView === 'function') {
        appObj.refreshCurrentView();
      }
    };

    if (appObj && typeof appObj.confirmDelete === 'function') {
      appObj.confirmDelete(`Are you sure you want to delete Invoice ${invName}? Sold item quantities will be restored back to inventory stock.`, proceedDelete);
    } else if (typeof confirm !== 'undefined' ? confirm(`Are you sure you want to delete Invoice ${invName}?`) : true) {
      proceedDelete();
    }
  }

  buildInvoiceTemplate(sale, settings) {
    let itemsRows = '';
    let totalQtySum = 0;
    let totalBnsSum = 0;
    let totalOverallQty = 0;

    const fmtNum = (v) => {
      const n = parseFloat(v) || 0;
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    (sale.items || []).forEach((item, idx) => {
      const q = parseInt(item.quantity) || 0;
      const bns = parseInt(item.bonus) || 0;
      const totQty = item.totalQty || (q + bns);
      totalQtySum += q;
      totalBnsSum += bns;
      totalOverallQty += totQty;

      const unitPrice = parseFloat(item.price) || 0;
      const tp = parseFloat(item.tp) || 0;
      const dis = parseFloat(item.discountPercent) || 0;
      const ext = parseFloat(item.extPercent) || 0;
      const tax = parseFloat(item.taxPercent) || 0;

      const purchaseCost = parseFloat(item.purchaseCost) || (tp * 0.85);
      const calc = Utils.calcWholesaleLine ? Utils.calcWholesaleLine(q, unitPrice, bns, dis, ext, tax, tp, purchaseCost) : {
        netUnitPrice: unitPrice, lineAmount: parseFloat(item.totalAmount) || 0
      };

      const disText = dis > 0 ? `${dis}%` : '-';
      const extText = ext > 0 ? `${ext}%` : '-';
      const taxText = tax > 0 ? `${tax}%` : '-';

      itemsRows += `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.70rem;">
              <td style="padding: 4px 2px; text-align: center; color: #64748b; width: 18px;">${idx + 1}</td>
              <td style="padding: 4px 3px; font-weight: 700; color: #0284c7; white-space: nowrap;">${item.code || item.itemNo || 'MED'}</td>
              <td style="padding: 4px 3px; font-weight: 700; color: #0f172a;">${item.name}</td>
              <td style="padding: 4px 2px; text-align: center; color: #475569; white-space: nowrap;">${item.packSize || '-'}</td>
              <td style="padding: 4px 2px; text-align: center; color: #334155; white-space: nowrap;">${item.batchNumber || '-'}</td>
              <td style="padding: 4px 2px; text-align: center; color: #334155; white-space: nowrap;">${item.expiryDate || '-'}</td>
              <td style="padding: 4px 3px; text-align: right; color: #64748b; white-space: nowrap;">${fmtNum(tp)}</td>
              <td style="padding: 4px 2px; text-align: center; font-weight: 700;">${q}</td>
              <td style="padding: 4px 2px; text-align: center; color: #059669; font-weight: 700;">${bns}</td>
              <td style="padding: 4px 2px; text-align: center; font-weight: 800; color: #0f172a;">${totQty}</td>
              <td style="padding: 4px 2px; text-align: center; color: #059669; white-space: nowrap;">${disText}</td>
              <td style="padding: 4px 2px; text-align: center; color: #0284c7; white-space: nowrap;">${extText}</td>
              <td style="padding: 4px 2px; text-align: center; color: #d97706; white-space: nowrap;">${taxText}</td>
              <td style="padding: 4px 3px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">${fmtNum(calc.netUnitPrice || unitPrice)}</td>
              <td style="padding: 4px 3px; text-align: right; font-weight: 800; color: #0f172a; white-space: nowrap;">${fmtNum(calc.lineAmount || item.totalAmount)}</td>
            </tr>
          `;
    });

    const amtInWords = Utils.numberToWords ? Utils.numberToWords(sale.netAmount) : "";

    return `
          <div style="width: 100%; max-width: 980px; margin: 0 auto; background: #ffffff; padding: 12px 14px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">
            
            <!-- TOP BRAND HEADER (CENTERED) -->
            <div style="display: flex; justify-content: center; align-items: center; text-align: center; padding-bottom: 8px;">
              <div style="display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center;">
                <img src="${MYU_OFFICIAL_LOGO_B64}" style="width: 52px; height: 52px; object-fit: contain; border-radius: 8px; box-shadow: 0 3px 8px rgba(0,0,0,0.15); background: #000; padding: 2px; margin-bottom: 4px;" alt="MYU Wholesale Logo">
                <div>
                  <h2 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">${settings.shopName || 'MYU Medicine Wholesale'}</h2>
                  <div style="font-size: 0.82rem; color: #475569; margin-top: 2px;">${settings.address || 'Jail Road, Mardan'}</div>
                  <div style="font-size: 0.82rem; color: #475569;">Phone: ${settings.phone || '03445094631'}</div>
                </div>
              </div>
            </div>

            <!-- CENTERED SALE INVOICE TITLE BANNER -->
            <div style="text-align: center; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 4px 0; margin: 8px 0 12px 0;">
              <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Wholesale Sale Invoice</h3>
            </div>

            <!-- BILL TO & INVOICE DETAILS GRID -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">Bill To:</div>
                <div style="font-size: 0.92rem; font-weight: 800; color: #0f172a;">${sale.customerName}</div>
                ${sale.customerShop ? `<div style="font-size: 0.78rem; color: #475569; margin-top: 2px;">${sale.customerShop}</div>` : ''}
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">Invoice Details:</div>
                <div style="font-size: 0.82rem; color: #334155; display: flex; justify-content: space-between; margin-bottom: 2px;">
                  <span>Invoice No:</span> <strong style="color: #0f172a;">${sale.invoiceNumber}</strong>
                </div>
                <div style="font-size: 0.82rem; color: #334155; display: flex; justify-content: space-between;">
                  <span>Date:</span> <strong style="color: #0f172a;">${sale.date} ${sale.time || ''}</strong>
                </div>
              </div>
            </div>

            <!-- ITEMS TABLE WITH WHOLESALE FIELDS -->
            <div style="width: 100%; overflow-x: auto; margin-bottom: 10px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.70rem; table-layout: auto;">
                <thead>
                  <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; width: 18px;">#</th>
                    <th style="padding: 5px 3px; text-align: left; font-weight: 700; color: #334155; white-space: nowrap;">Code</th>
                    <th style="padding: 5px 3px; text-align: left; font-weight: 700; color: #334155;">Product</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">P-Size</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">B.No</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">Exp Date</th>
                    <th style="padding: 5px 3px; text-align: right; font-weight: 700; color: #334155; white-space: nowrap;">T.P</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">QTY</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">BNS</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">Total QTY</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">Dis%</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">Ext%</th>
                    <th style="padding: 5px 2px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">Adv.Tax%</th>
                    <th style="padding: 5px 3px; text-align: right; font-weight: 700; color: #334155; white-space: nowrap;">NET</th>
                    <th style="padding: 5px 3px; text-align: right; font-weight: 700; color: #334155; white-space: nowrap;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
                <tfoot>
                  <tr style="border-top: 2px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-weight: 800; background: #f8fafc;">
                    <td colspan="7" style="padding: 5px 3px; text-align: right; color: #334155; white-space: nowrap;">Totals:</td>
                    <td style="padding: 5px 2px; text-align: center; color: #0f172a;">${totalQtySum}</td>
                    <td style="padding: 5px 2px; text-align: center; color: #059669;">${totalBnsSum}</td>
                    <td style="padding: 5px 2px; text-align: center; color: #0f172a;">${totalOverallQty}</td>
                    <td colspan="4"></td>
                    <td style="padding: 5px 3px; text-align: right; color: #0f172a; font-size: 0.85rem; white-space: nowrap;">${Utils.formatCurrency(sale.netAmount, settings.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- BOTTOM GRID -->
            <div style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 12px; margin-top: 6px;">
              <!-- Left: Terms & Conditions -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; align-self: flex-start;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Terms and Conditions</div>
                <div style="font-size: 0.76rem; color: #64748b; line-height: 1.3;">
                  ${settings.invoiceFooter || 'Thank you for your business. Purchased medicines can be replaced within 7 days if seals are intact.'}
                </div>
              </div>

              <!-- Right Column: Total Box & Signature -->
              <div>
                <!-- Total Summary Card -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
                    <span style="font-size: 1rem; font-weight: 800; color: #0f172a;">Total Amount:</span>
                    <span style="font-size: 1.15rem; font-weight: 900; color: #0f172a;">${Utils.formatCurrency(sale.netAmount, settings.currency)}</span>
                  </div>
                  <div style="font-size: 0.75rem; color: #64748b; font-style: italic; margin-bottom: 6px; line-height: 1.2;">
                    Amount In Words: ${amtInWords}
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569; margin-bottom: 2px;">
                    <span>Received Amount</span>
                    <span style="font-weight: 700; color: #059669;">${Utils.formatCurrency(sale.paidAmount, settings.currency)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569;">
                    <span>Remaining Balance</span>
                    <span style="font-weight: 800; color: ${sale.remainingBalance > 0 ? '#ef4444' : '#10b981'};">${Utils.formatCurrency(sale.remainingBalance, settings.currency)}</span>
                  </div>
                </div>

                <!-- Authorized Signature Card -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; text-align: center; margin-top: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div style="min-height: 48px; display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
                    <img src="${typeof MYU_OFFICIAL_SIGNATURE_B64 !== 'undefined' ? MYU_OFFICIAL_SIGNATURE_B64 : 'signature.png'}" style="max-height: 48px; max-width: 130px; object-fit: contain;" alt="Authorized Signature" onerror="this.src='assets/signature.png'; this.onerror=null;">
                  </div>
                  <div style="border-top: 1px dashed #94a3b8; width: 85%; margin: 2px auto 4px auto;"></div>
                  <div style="font-size: 0.74rem; font-weight: 700; color: #475569;">Authorized Signature & Stamp</div>
                </div>
              </div>
            </div>
          </div>
        `;
  }
}

var salesModule = window.salesModule || new SalesModule();


/* ==================== PROFIT & LOSS & EXPENSES MODULE ==================== */

if (typeof global !== 'undefined') {
  global.SalesModule = SalesModule;
}
if (typeof window !== 'undefined') {
  window.SalesModule = SalesModule;
  window.salesModule = window.salesModule || new SalesModule();
  window.viewInvoiceModal = function (id) {
    const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
    if (mod && typeof mod.viewInvoiceModal === 'function') mod.viewInvoiceModal(id);
  };
  window.printInvoiceDirect = function (id) {
    const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
    if (mod && typeof mod.printInvoiceDirect === 'function') mod.printInvoiceDirect(id);
  };
  window.openEditSaleModal = function (id) {
    const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
    if (mod && typeof mod.openEditSaleModal === 'function') mod.openEditSaleModal(id);
  };
  window.deleteSale = function (id) {
    const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
    if (mod && typeof mod.deleteSale === 'function') mod.deleteSale(id);
  };
}

SalesModule.prototype.openCustomerModal = function (customerId = null) {
  const form = document.getElementById('customer-form');
  if (form) form.reset();
  const idInput = document.getElementById('cust-id');
  if (idInput) idInput.value = '';
  const titleElem = document.getElementById('customer-modal-title');
  if (titleElem) titleElem.textContent = 'Add New Customer / Pharmacy';

  if (customerId) {
    const cust = storage.getCustomers().find(c => c.id === customerId);
    if (cust) {
      if (titleElem) titleElem.textContent = 'Edit Customer Details';
      if (idInput) idInput.value = cust.id;
      const nInput = document.getElementById('cust-name'); if (nInput) nInput.value = cust.name;
      const sInput = document.getElementById('cust-shop-name'); if (sInput) sInput.value = cust.shopName || '';
      const pInput = document.getElementById('cust-phone'); if (pInput) pInput.value = cust.phone || '';
      const aInput = document.getElementById('cust-address'); if (aInput) aInput.value = cust.address || '';
    }
  }

  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.openModal === 'function') appObj.openModal('customer-modal');
};

SalesModule.prototype.openCustomerPaymentModal = function () {
  const select = document.getElementById('cpay-customer-select');
  const customers = storage.getCustomers();
  const settings = storage.getSettings();
  if (select) {
    Utils.populateSelect(select, customers, 'id', c => `${c.name} (${c.shopName || 'Retail'}) - Bal: ${Utils.formatCurrency(c.remainingBalance, settings.currency)}`);
  }

  const form = document.getElementById('customer-payment-form');
  if (form) form.reset();
  const dInput = document.getElementById('cpay-date');
  if (dInput) dInput.value = Utils.todayStr();

  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.openModal === 'function') appObj.openModal('customer-payment-modal');
};

SalesModule.prototype.openCustomerPaymentModalForCust = function (customerId) {
  this.openCustomerPaymentModal();
  const select = document.getElementById('cpay-customer-select');
  if (select) select.value = customerId;
};
