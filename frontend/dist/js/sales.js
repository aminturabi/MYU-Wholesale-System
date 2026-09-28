/* ==================== SALES, CUSTOMERS & RETURNS MODULE ==================== */
class SalesModule {
  constructor() {
    this.expandedSaleIds = new Set();
    this.bindEvents();
  }

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

  toggleSaleRow(saleId, event) {
    if (event) {
      const target = event.target;
      if (target && (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select'))) {
        return;
      }
    }
    if (!this.expandedSaleIds) this.expandedSaleIds = new Set();
    const detailsRow = document.getElementById(`sale-details-row-${saleId}`);
    const chevron = document.getElementById(`chevron-${saleId}`);
    if (!detailsRow) return;

    if (this.expandedSaleIds.has(saleId)) {
      this.expandedSaleIds.delete(saleId);
      detailsRow.style.display = 'none';
      detailsRow.classList.add('hidden');
      if (chevron) {
        chevron.classList.remove('fa-chevron-up');
        chevron.classList.add('fa-chevron-down');
        chevron.style.transform = 'rotate(0deg)';
        chevron.style.color = '#64748b';
      }
    } else {
      this.expandedSaleIds.add(saleId);
      detailsRow.style.display = 'table-row';
      detailsRow.classList.remove('hidden');
      if (chevron) {
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-up');
        chevron.style.transform = 'rotate(180deg)';
        chevron.style.color = 'var(--primary, #059669)';
      }
    }
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
      const saleId = s.id || s.invoiceNumber;
      const isExpanded = this.expandedSaleIds && this.expandedSaleIds.has(saleId);
      let totalProfit = 0;
      const totalNet = parseFloat(s.netAmount) || 0;
      (s.items || []).forEach(item => {
        const q = parseInt(item.quantity) || 0;
        const bns = parseInt(item.bonus) || 0;
        const price = parseFloat(item.price) || 0;
        const tp = parseFloat(item.tp || item.tradePrice) || price;
        const dis = parseFloat(item.discountPercent !== undefined ? item.discountPercent : item.discount) || 0;
        const ext = parseFloat(item.extPercent) || 0;
        const tax = parseFloat(item.taxPercent) || 0;
        const purchaseCost = parseFloat(item.purchaseCost) || (tp * 0.85);
        const purchaseDiscount = parseFloat(item.purchaseDiscountPercent !== undefined ? item.purchaseDiscountPercent : (item.purchaseDiscount || 0)) || (tp > 0 ? Utils.round(((tp - purchaseCost) / tp) * 100, 2) : 0);
        const calc = Utils.calcWholesaleLine(q, price, bns, dis, ext, tax, tp, purchaseCost, purchaseDiscount);
        totalProfit += calc.profit;
      });
      if (!totalProfit && s.totalProfit !== undefined) totalProfit = parseFloat(s.totalProfit);
      totalProfit = Utils.round(totalProfit, 2);
      const marginPercent = totalNet > 0 ? Utils.round((totalProfit / totalNet) * 100, 1) : 0;
      const isProfitPositive = totalProfit >= 0;
      const profitSign = isProfitPositive ? '+' : '';
      const marginBadge = `
        <span style="background: ${isProfitPositive ? '#ecfdf5' : '#fef2f2'}; color: ${isProfitPositive ? '#059669' : '#dc2626'}; border: 1px solid ${isProfitPositive ? '#a7f3d0' : '#fecaca'}; font-weight: 700; border-radius: 4px; padding: 1px 5px; font-size: 0.72rem; display: inline-block;">
          ${profitSign}${marginPercent.toFixed(1)}%
        </span>
      `;

      // Build Sub-Table for Itemized Products Breakdown
      const items = s.items || [];
      let itemsSubRows = '';
      if (items.length > 0) {
        items.forEach(item => {
          const q = parseInt(item.quantity) || 0;
          const bns = parseInt(item.bonus) || 0;
          const unitPrice = parseFloat(item.price) || 0;
          const tp = parseFloat(item.tp || item.tradePrice) || (unitPrice || 0);
          const dis = parseFloat(item.discountPercent !== undefined ? item.discountPercent : item.discount) || 0;
          const ext = parseFloat(item.extPercent) || 0;
          const tax = parseFloat(item.taxPercent) || 0;

          const purchaseCost = parseFloat(item.purchaseCost) || (tp * 0.85);
          const purchaseDiscount = parseFloat(item.purchaseDiscountPercent !== undefined ? item.purchaseDiscountPercent : (item.purchaseDiscount || 0)) || (tp > 0 ? Utils.round(((tp - purchaseCost) / tp) * 100, 2) : 0);

          const calc = (typeof Utils !== 'undefined' && Utils.calcWholesaleLine) ? Utils.calcWholesaleLine(q, unitPrice, bns, dis, ext, tax, tp, purchaseCost, purchaseDiscount) : {
            netUnitPrice: unitPrice, lineAmount: parseFloat(item.totalAmount) || 0, profit: 0, marginPercent: 0
          };

          const lineNet = item.totalAmount !== undefined ? parseFloat(item.totalAmount) : (calc.lineAmount || 0);
          const lineProfit = calc.profit !== undefined ? calc.profit : (item.itemProfit !== undefined ? parseFloat(item.itemProfit) : 0);
          const lineMargin = calc.marginPercent !== undefined ? calc.marginPercent : (item.marginPercent !== undefined ? parseFloat(item.marginPercent) : 0);

          const isLineProfitPositive = lineProfit >= 0;
          const lineProfitSign = isLineProfitPositive ? '+' : '';

          const productMarginBadge = `
            <span style="background: ${isLineProfitPositive ? '#ecfdf5' : '#fef2f2'}; color: ${isLineProfitPositive ? '#059669' : '#dc2626'}; border: 1px solid ${isLineProfitPositive ? '#a7f3d0' : '#fecaca'}; font-weight: 700; border-radius: 4px; padding: 2px 7px; font-size: 0.74rem; display: inline-block;">
              ${lineProfitSign}${lineMargin.toFixed(1)}% (${lineProfitSign}${Utils.formatCurrency(lineProfit, settings.currency)})
            </span>
          `;

          const bonusBadge = bns > 0 ? ` <span style="background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-size: 0.7rem; font-weight: 700; padding: 1px 5px; border-radius: 3px;">+${bns} bns</span>` : '';
          const disBadge = dis > 0 ? `<span style="color: #059669; font-weight: 700;">${dis}%</span>${ext > 0 ? ` <span style="font-size: 0.7rem; color: #64748b;">(+${ext}%)</span>` : ''}` : '-';

          itemsSubRows += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 12px;">
                <div style="font-weight: 700; color: var(--text-main, #0f172a);">${item.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted, #64748b);">${item.genericName ? item.genericName + ' | ' : ''}Code: ${item.code || item.itemNo || '-'} | Batch: ${item.batchNumber || '-'}</div>
              </td>
              <td style="padding: 8px 12px; text-align: center; font-weight: 700;">
                ${q} units${bonusBadge}
              </td>
              <td style="padding: 8px 12px; text-align: right; color: var(--text-muted, #64748b); font-weight: 600;">
                ${Utils.formatCurrency(tp, settings.currency)}
              </td>
              <td style="padding: 8px 12px; text-align: center;">
                ${disBadge}
              </td>
              <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: var(--text-main, #0f172a);">
                ${Utils.formatCurrency(lineNet, settings.currency)}
              </td>
              <td style="padding: 8px 12px; text-align: center;">
                ${productMarginBadge}
              </td>
            </tr>
          `;
        });
      } else {
        itemsSubRows = `
          <tr>
            <td colspan="6" style="padding: 12px; text-align: center; color: var(--text-muted, #64748b); font-size: 0.8rem;">
              No itemized product breakdown found for this invoice.
            </td>
          </tr>
        `;
      }

      html += `
            <tr class="sales-invoice-master-row" data-sale-id="${saleId}" onclick="(window.salesModule || salesModule).toggleSaleRow('${saleId}', event)">
              <td>
                <div style="display: flex; align-items: center;">
                  <i class="fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} toggle-chevron" id="chevron-${saleId}" style="font-size: 0.72rem; color: ${isExpanded ? 'var(--primary, #059669)' : '#64748b'}; margin-right: 6px; ${isExpanded ? 'transform: rotate(180deg);' : ''}"></i>
                  <span style="font-weight: 700; color: var(--primary);">${s.invoiceNumber}</span>
                </div>
              </td>
              <td><div style="font-size: 0.85rem; font-weight: 600;">${s.date}</div><div style="font-size: 0.72rem; color: var(--text-muted);">${s.time || ''}</div></td>
              <td><div style="font-weight: 700;">${s.customerName}</div><div style="font-size: 0.75rem; color: var(--text-muted);">${s.customerShop || ''}</div></td>
              <td style="font-weight: 800;">${Utils.formatCurrency(s.netAmount, settings.currency)}</td>
              <td style="color: #059669;">${Utils.formatCurrency(s.totalDiscount, settings.currency)}</td>
              <td style="color: #059669; font-weight: 600;">${Utils.formatCurrency(s.paidAmount, settings.currency)}</td>
              <td style="color: #ef4444; font-weight: 700;">${Utils.formatCurrency(s.remainingBalance, settings.currency)}</td>
              <td style="font-weight: 700; white-space: nowrap;">
                <div style="color: ${isProfitPositive ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(totalProfit, settings.currency)}</div>
                <div style="margin-top: 2px;">${marginBadge}</div>
              </td>
              <td>${Utils.badge(s.status)}</td>
              <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <button class="btn-primary-myu btn-sm-myu" style="padding: 4px 8px; font-size: 0.78rem;" onclick="(window.printInvoiceDirect || (window.salesModule && window.salesModule.printInvoiceDirect))('${saleId}')" title="Print Invoice"><i class="fa-solid fa-print"></i> Print</button>
                  <button class="btn-secondary-myu btn-sm-myu" onclick="(window.viewInvoiceModal || (window.salesModule && window.salesModule.viewInvoiceModal))('${saleId}')" title="View Invoice Modal"><i class="fa-solid fa-eye"></i> View</button>
                  <button class="btn-sm-myu" style="background: #f59e0b; color: #ffffff; border: none; font-weight: 700; padding: 4px 8px; font-size: 0.78rem;" onclick="window.openProcessReturnModal('${saleId}')" title="Process Return for Invoice"><i class="fa-solid fa-rotate-left"></i> Return</button>
                  <button class="btn-sm-myu" style="background: #0284c7; color: #ffffff; border: none; font-weight: 700; padding: 4px 8px; font-size: 0.78rem;" onclick="(window.openEditSaleModal || (window.salesModule && window.salesModule.openEditSaleModal))('${saleId}')" title="Edit Payment & Remaining Balance"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                  <button class="btn-danger-myu btn-sm-myu" onclick="(window.deleteSale || (window.salesModule && window.salesModule.deleteSale))('${saleId}')" title="Delete Invoice"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
            <tr id="sale-details-row-${saleId}" class="expanded-details-row ${isExpanded ? '' : 'hidden'}" style="${isExpanded ? 'display: table-row;' : 'display: none;'} background: #f8fafc;">
              <td colspan="10" style="padding: 10px 16px; border-top: 1px dashed #cbd5e1; border-bottom: 2px solid #e2e8f0;">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div style="padding: 8px 14px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; font-size: 0.8rem; color: #334155;">
                      <i class="fa-solid fa-boxes-stacked" style="margin-right: 6px; color: var(--primary, #059669);"></i> Itemized Breakdown & Margins (${items.length} product${items.length === 1 ? '' : 's'})
                    </span>
                    <span style="font-size: 0.74rem; color: #64748b;">
                      Invoice: <strong>${s.invoiceNumber}</strong>
                    </span>
                  </div>
                  <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                      <thead>
                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.3px;">
                          <th style="padding: 7px 12px; text-align: left;">Product Name & Code</th>
                          <th style="padding: 7px 12px; text-align: center;">Quantity & Bonus</th>
                          <th style="padding: 7px 12px; text-align: right;">Trade Price (TP)</th>
                          <th style="padding: 7px 12px; text-align: center;">Sale Discount %</th>
                          <th style="padding: 7px 12px; text-align: right;">Net Amount</th>
                          <th style="padding: 7px 12px; text-align: center;">Margin / Profit %</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsSubRows}
                      </tbody>
                    </table>
                  </div>
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
      container.innerHTML = this.buildInvoiceTemplate(sale, settings, false);
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
      container.innerHTML = this.buildInvoiceTemplate(sale, storage.getSettings(), true);
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
      statusElem.textContent = status;
      statusElem.className = 'badge-status ' + (status === 'Paid' ? 'badge-paid' : (status === 'Partially Paid' ? 'badge-partial' : 'badge-unpaid'));
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

  buildInvoiceTemplate(sale, settings, isForPrint = false) {
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
      const tp = parseFloat(item.tp || item.tradePrice) || (unitPrice || 0);
      const dis = parseFloat(item.discountPercent !== undefined ? item.discountPercent : item.discount) || 0;
      const ext = parseFloat(item.extPercent) || 0;
      const tax = parseFloat(item.taxPercent) || 0;

      const purchaseCost = parseFloat(item.purchaseCost) || (tp * 0.85);
      const purchaseDiscount = parseFloat(item.purchaseDiscountPercent !== undefined ? item.purchaseDiscountPercent : (item.purchaseDiscount || 0)) || (tp > 0 ? Utils.round(((tp - purchaseCost) / tp) * 100, 2) : 0);
      const calc = Utils.calcWholesaleLine ? Utils.calcWholesaleLine(q, unitPrice, bns, dis, ext, tax, tp, purchaseCost, purchaseDiscount) : {
        netUnitPrice: unitPrice, lineAmount: parseFloat(item.totalAmount) || 0, profit: 0, marginPercent: 0
      };

      const lineProfit = item.itemProfit !== undefined ? parseFloat(item.itemProfit) : (calc.profit !== undefined ? calc.profit : 0);
      const lineMargin = item.marginPercent !== undefined ? parseFloat(item.marginPercent) : (item.realizedMarginPercent !== undefined ? parseFloat(item.realizedMarginPercent) : (calc.marginPercent !== undefined ? calc.marginPercent : (tp > 0 && q > 0 ? Utils.round((lineProfit / (q * tp)) * 100, 1) : 0)));
      const isLineProfitPositive = lineProfit >= 0;
      const lineProfitSign = isLineProfitPositive ? '+' : '';

      const lineMarginBadge = `
        <span style="background: ${isLineProfitPositive ? '#ecfdf5' : '#fef2f2'}; color: ${isLineProfitPositive ? '#059669' : '#dc2626'}; border: 1px solid ${isLineProfitPositive ? '#a7f3d0' : '#fecaca'}; font-weight: 700; border-radius: 4px; padding: 1px 5px; font-size: 0.68rem; display: inline-block;">
          ${lineProfitSign}${lineMargin.toFixed(1)}% (${lineProfitSign}Rs.${fmtNum(lineProfit)})
        </span>
      `;

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
              ${!isForPrint ? `<td style="padding: 4px 3px; text-align: center; white-space: nowrap;">${lineMarginBadge}</td>` : ''}
            </tr>
          `;
    });

    let totalProfitSum = sale.totalProfit !== undefined ? parseFloat(sale.totalProfit) : (sale.items || []).reduce((acc, it) => acc + (parseFloat(it.itemProfit) || 0), 0);
    let totalGrossTP = (sale.items || []).reduce((sum, it) => sum + ((parseInt(it.quantity) || 0) * (parseFloat(it.tp || it.price) || 0)), 0) || parseFloat(sale.grossTotal) || parseFloat(sale.netAmount) || 0;
    let totalMarginPercent = totalGrossTP > 0 ? Utils.round((totalProfitSum / totalGrossTP) * 100, 1) : 0;
    const isTotalProfitPositive = totalProfitSum >= 0;
    const totalProfitSign = isTotalProfitPositive ? '+' : '';

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
                    ${!isForPrint ? `<th style="padding: 5px 3px; text-align: center; font-weight: 700; color: #334155; white-space: nowrap;">Margin / Profit</th>` : ''}
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
                    ${!isForPrint ? `
                    <td style="padding: 5px 3px; text-align: center; white-space: nowrap;">
                      <span style="background: ${isTotalProfitPositive ? '#ecfdf5' : '#fef2f2'}; color: ${isTotalProfitPositive ? '#059669' : '#dc2626'}; border: 1px solid ${isTotalProfitPositive ? '#a7f3d0' : '#fecaca'}; font-weight: 800; border-radius: 4px; padding: 2px 6px; font-size: 0.70rem;">
                        ${totalProfitSign}${totalMarginPercent.toFixed(1)}% (${totalProfitSign}Rs.${fmtNum(totalProfitSum)})
                      </span>
                    </td>` : ''}
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
                  <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569; margin-bottom: 2px;">
                    <span>Remaining Balance</span>
                    <span style="font-weight: 800; color: ${sale.remainingBalance > 0 ? '#ef4444' : '#10b981'};">${Utils.formatCurrency(sale.remainingBalance, settings.currency)}</span>
                  </div>
                  ${!isForPrint ? `
                  <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
                    <span>Estimated Profit</span>
                    <span style="font-weight: 800; color: ${isTotalProfitPositive ? '#059669' : '#ef4444'};">
                      ${totalProfitSign}${Utils.formatCurrency(totalProfitSum, settings.currency)} (${totalProfitSign}${totalMarginPercent.toFixed(1)}%)
                    </span>
                  </div>` : ''}
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

SalesModule.prototype.showToast = function (msg, type = 'info', duration = 3000) {
  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.showToast === 'function') {
    appObj.showToast(msg, type, duration);
  }
};

SalesModule.prototype.refreshCustomerDropdowns = function () {
  const customers = storage.getCustomers();
  const posSelect = document.getElementById('pos-customer-select') || document.getElementById('bill-customer-select');
  if (posSelect) {
    const currentVal = posSelect.value;
    Utils.populateSelect(posSelect, customers || [], 'id', c => `${c.name} ${c.shopName ? '(' + c.shopName + ')' : ''}`, '', '-- Walk-in / Select Customer --');
    if (currentVal) posSelect.value = currentVal;
  }
  if (window.billingModule && typeof window.billingModule.updateCustomerBalanceDisplay === 'function') {
    window.billingModule.updateCustomerBalanceDisplay();
  }
};

SalesModule.prototype.openCustomerModal = function (customerId = null) {
  const form = document.getElementById('customer-form');
  if (form) form.reset();
  const idInput = document.getElementById('cust-edit-id') || document.getElementById('cust-id');
  if (idInput) idInput.value = '';
  const titleElem = document.getElementById('cust-modal-title') || document.getElementById('customer-modal-title');
  if (titleElem) titleElem.textContent = 'Add Pharmacy Customer';

  if (customerId) {
    const cust = storage.getCustomers().find(c => c.id === customerId);
    if (cust) {
      if (titleElem) titleElem.textContent = 'Edit Pharmacy Customer';
      if (idInput) idInput.value = cust.id;
      const nInput = document.getElementById('cum-name') || document.getElementById('cust-name'); 
      if (nInput) nInput.value = cust.name || '';
      const sInput = document.getElementById('cum-shop') || document.getElementById('cust-shop-name'); 
      if (sInput) sInput.value = cust.shopName || '';
      const pInput = document.getElementById('cum-phone') || document.getElementById('cust-phone'); 
      if (pInput) pInput.value = cust.phone || '';
      const wInput = document.getElementById('cum-whatsapp') || document.getElementById('cust-whatsapp'); 
      if (wInput) wInput.value = cust.whatsapp || '';
      const aInput = document.getElementById('cum-address') || document.getElementById('cust-address'); 
      if (aInput) aInput.value = cust.address || '';
    }
  }

  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.openModal === 'function') appObj.openModal('customer-modal');
};

SalesModule.prototype.saveCustomerForm = function () {
  const editIdInput = document.getElementById('cust-edit-id') || document.getElementById('cust-id');
  const editId = editIdInput ? editIdInput.value : '';

  const nameInput = document.getElementById('cum-name') || document.getElementById('cust-name');
  const shopInput = document.getElementById('cum-shop') || document.getElementById('cust-shop-name');
  const phoneInput = document.getElementById('cum-phone') || document.getElementById('cust-phone');
  const whatsappInput = document.getElementById('cum-whatsapp') || document.getElementById('cust-whatsapp');
  const addressInput = document.getElementById('cum-address') || document.getElementById('cust-address');

  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    this.showToast('Please enter customer / owner name.', 'warning');
    return;
  }

  const data = {
    name: name,
    shopName: shopInput ? shopInput.value.trim() : '',
    phone: phoneInput ? phoneInput.value.trim() : '',
    whatsapp: whatsappInput ? whatsappInput.value.trim() : '',
    address: addressInput ? addressInput.value.trim() : ''
  };

  if (editId) {
    storage.updateCustomer(editId, data);
    this.showToast('Customer updated successfully!', 'success');
  } else {
    storage.addCustomer(data);
    this.showToast('Customer added successfully!', 'success');
  }

  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.closeModal === 'function') {
    appObj.closeModal('customer-modal');
  }

  this.renderCustomers();
  this.refreshCustomerDropdowns();
  if (appObj && typeof appObj.refreshCurrentView === 'function') {
    appObj.refreshCurrentView();
  }
};

SalesModule.prototype.renderCustomers = function () {
  const tbody = document.getElementById('customers-tbody');
  if (!tbody) return;

  const customers = storage.getCustomers();
  const settings = storage.getSettings();

  if (!customers.length) {
    Utils.emptyTable(tbody, 8, 'No customer pharmacies recorded yet.');
    return;
  }

  let html = '';
  customers.forEach((c) => {
    const waLink = Utils.whatsappLink(c.whatsapp || c.phone);
    const bal = c.remainingBalance || 0;
    const balColor = bal > 0 ? '#ef4444' : (bal < 0 ? '#0284c7' : '#10b981');

    html += `
      <tr>
        <td><div style="font-weight: 700; color: #0f172a;">${c.name}</div></td>
        <td><div style="font-weight: 600; color: #334155;">${c.shopName || '-'}</div></td>
        <td>
          <div>${c.phone || '-'}</div>
          ${waLink ? `<a href="${waLink}" target="_blank" style="color: #25d366; font-size: 0.76rem; font-weight: 700; text-decoration: none;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}
        </td>
        <td style="font-size: 0.82rem; color: #475569;">${c.address || '-'}</td>
        <td style="font-weight: 700;">${Utils.formatCurrency(c.totalPurchases, settings.currency)}</td>
        <td style="color: #059669; font-weight: 600;">${Utils.formatCurrency(c.totalPaid, settings.currency)}</td>
        <td style="font-weight: 800; color: ${balColor};">${Utils.formatCurrency(bal, settings.currency)}</td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="btn-primary-myu btn-sm-myu" style="padding: 3px 8px; font-size: 0.76rem;" onclick="salesModule.openCustomerPaymentModalForCust('${c.id}')" title="Record Payment"><i class="fa-solid fa-money-bill-wave"></i> Pay</button>
            <button class="btn-secondary-myu btn-sm-myu" style="padding: 3px 8px; font-size: 0.76rem;" onclick="salesModule.openCustomerModal('${c.id}')" title="Edit Customer"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-danger-myu btn-sm-myu" style="padding: 3px 8px; font-size: 0.76rem;" onclick="salesModule.deleteCustomer('${c.id}')" title="Delete Customer"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

SalesModule.prototype.deleteCustomer = function (customerId) {
  const cust = storage.getCustomers().find(c => c.id === customerId);
  if (!cust) return;
  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.confirmDelete === 'function') {
    appObj.confirmDelete(`Are you sure you want to delete customer "${cust.name} (${cust.shopName || ''})"?`, () => {
      storage.deleteCustomer(customerId);
      this.renderCustomers();
      this.refreshCustomerDropdowns();
      this.showToast('Customer deleted successfully.', 'info');
    });
  } else if (confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
    storage.deleteCustomer(customerId);
    this.renderCustomers();
    this.refreshCustomerDropdowns();
    this.showToast('Customer deleted successfully.', 'info');
  }
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

SalesModule.prototype.saveCustomerPaymentForm = function () {
  const custSelect = document.getElementById('cpay-customer-select');
  const custId = custSelect ? custSelect.value : '';
  const amountInput = document.getElementById('cpay-amount');
  const amount = amountInput ? parseFloat(amountInput.value) : 0;
  const dateInput = document.getElementById('cpay-date');
  const date = dateInput && dateInput.value ? dateInput.value : Utils.todayStr();
  const methodInput = document.getElementById('cpay-method');
  const method = methodInput ? methodInput.value : 'Cash';
  const refInput = document.getElementById('cpay-ref');
  const ref = refInput ? refInput.value.trim() : '';

  if (!custId) {
    this.showToast('Please select a customer.', 'warning');
    return;
  }
  if (!amount || amount <= 0) {
    this.showToast('Please enter a valid payment amount.', 'warning');
    return;
  }

  storage.addCustomerPayment({
    customerId: custId,
    amount: amount,
    date: date,
    paymentMethod: method,
    reference: ref
  });

  this.showToast('Customer payment recorded successfully!', 'success');

  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.closeModal === 'function') {
    appObj.closeModal('customer-payment-modal');
  }
  this.renderCustomers();
  this.renderCustomerPayments();
  this.refreshCustomerDropdowns();
  if (appObj && typeof appObj.refreshCurrentView === 'function') {
    appObj.refreshCurrentView();
  }
};

SalesModule.prototype.renderCustomerPayments = function () {
  const tbody = document.getElementById('customer-payments-tbody');
  if (!tbody) return;

  const payments = storage.getCustomerPayments();
  const customers = storage.getCustomers();
  const settings = storage.getSettings();

  if (!payments.length) {
    Utils.emptyTable(tbody, 6, 'No customer payments recorded yet.');
    return;
  }

  let html = '';
  payments.slice().reverse().forEach(p => {
    let custName = p.customerName;
    if (!custName && p.customerId) {
      const cust = customers.find(c => c.id === p.customerId);
      if (cust) {
        custName = cust.name + (cust.shopName ? ` (${cust.shopName})` : '');
      }
    }
    html += `
      <tr>
        <td>${p.date || '-'}</td>
        <td><span style="font-weight: 700; color: #0f172a;">${custName || 'Walk-in Customer'}</span></td>
        <td>${Utils.badge(p.paymentMethod || p.method || 'Cash')}</td>
        <td style="font-weight: 800; color: #059669;">${Utils.formatCurrency(p.amount, settings.currency)}</td>
        <td>${p.reference || '-'}</td>
        <td style="font-size: 0.85rem; color: #64748b;">${p.notes || '-'}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
};
