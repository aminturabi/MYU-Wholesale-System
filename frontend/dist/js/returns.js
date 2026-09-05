/* ==================== SALES RETURNS & CUSTOMER REFUNDS EXTENSION ==================== */

SalesModule.prototype.renderReturnsView = function() {
  const returns = storage.getReturns();
  const settings = storage.getSettings();

  const countElem = document.getElementById('ret-kpi-count');
  const amountElem = document.getElementById('ret-kpi-amount');
  const unitsElem = document.getElementById('ret-kpi-units');

  const totalCount = returns.length;
  const totalAmount = returns.reduce((a, b) => a + (b.totalRefundAmount || 0), 0);
  let totalUnits = 0;
  returns.forEach(r => {
    (r.items || []).forEach(item => { totalUnits += (parseInt(item.returnQty) || 0); });
  });

  if (countElem) countElem.textContent = totalCount;
  if (amountElem) amountElem.textContent = Utils.formatCurrency(totalAmount, settings.currency);
  if (unitsElem) unitsElem.textContent = `${totalUnits} Units`;

  this.renderReturnsHistoryTable(returns);
};

SalesModule.prototype.renderReturnsHistoryTable = function(returnsList) {
  const tbody = document.getElementById('returns-history-tbody');
  if (!tbody) return;
  const settings = storage.getSettings();

  if (!returnsList || !returnsList.length) {
    Utils.emptyTable(tbody, 8, 'No sales returns or refunds recorded yet.');
    return;
  }

  let html = '';
  returnsList.slice().reverse().forEach(r => {
    const itemsSummary = (r.items || []).map(i => `${i.name} (${i.returnQty}x)`).join(', ');
    html += `
      <tr>
        <td><strong style="color: var(--primary);">${r.returnNumber}</strong></td>
        <td><span style="font-weight: 700; color: #475569;">${r.invoiceNumber}</span></td>
        <td>${r.date} <span style="font-size: 0.75rem; color: var(--text-muted);">${r.time || ''}</span></td>
        <td><div style="font-weight: 700;">${r.customerName}</div></td>
        <td><div style="max-width: 260px; font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemsSummary}">${itemsSummary}</div></td>
        <td style="font-weight: 800; color: #ef4444;">${Utils.formatCurrency(r.totalRefundAmount, settings.currency)}</td>
        <td>${Utils.badge(r.reason || 'Customer Return')}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn-secondary-myu btn-sm-myu" onclick="(window.viewReturnDetailsModal || (window.salesModule && window.salesModule.viewReturnDetailsModal))('${r.id}')" title="View Details / Receipt"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-danger-myu btn-sm-myu" onclick="(window.deleteReturn || (window.salesModule && window.salesModule.deleteReturn))('${r.id}')" title="Delete Return"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
};

SalesModule.prototype.filterReturnsHistory = function() {
  const searchInput = document.getElementById('ret-search');
  const query = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';
  const returns = storage.getReturns();
  if (!query) {
    this.renderReturnsHistoryTable(returns);
    return;
  }
  const filtered = returns.filter(r => {
    const itemsStr = (r.items || []).map(i => (i.name || '') + ' ' + (i.itemNo || '')).join(' ').toLowerCase();
    return (r.returnNumber || '').toLowerCase().includes(query) ||
      (r.invoiceNumber || '').toLowerCase().includes(query) ||
      (r.customerName || '').toLowerCase().includes(query) ||
      (r.reason || '').toLowerCase().includes(query) ||
      itemsStr.includes(query);
  });
  this.renderReturnsHistoryTable(filtered);
};

SalesModule.prototype.filterReturnInvoices = function(query = '') {
  try {
    const select = document.getElementById('ret-sale-select');
    const dropdown = document.getElementById('ret-customer-search-results');
    const sales = (window.storage && typeof window.storage.getSales === 'function')
      ? storage.getSales()
      : (typeof storage !== 'undefined' ? storage.getSales() : []);
    const settings = (window.storage && typeof window.storage.getSettings === 'function')
      ? storage.getSettings()
      : (typeof storage !== 'undefined' ? storage.getSettings() : { currency: 'Rs.' });

    const q = (query || '').toLowerCase().trim();
    const currentVal = select ? select.value : '';

    const filteredSales = (sales || []).filter(s => {
      if (!q) return true;
      const inv = (s.invoiceNumber || s.id || '').toLowerCase();
      const custName = (s.customerName || '').toLowerCase();
      const custShop = (s.customerShop || '').toLowerCase();
      const custPhone = (s.customerPhone || '').toLowerCase();
      const dateStr = (s.date || '').toLowerCase();
      const hasItemMatch = (s.items || []).some(i => (i.name || '').toLowerCase().includes(q) || (i.itemNo || '').toLowerCase().includes(q));
      return inv.includes(q) || custName.includes(q) || custShop.includes(q) || custPhone.includes(q) || dateStr.includes(q) || hasItemMatch;
    });

    // Populate the native select dropdown
    if (select) {
      Utils.populateSelect(
        select,
        filteredSales.slice().reverse(),
        'invoiceNumber',
        s => {
          if (!s) return 'Sale Invoice';
          const inv = s.invoiceNumber || s.id || 'INV';
          const cust = s.customerName || 'Walk-in Customer';
          const shop = s.customerShop ? ` (${s.customerShop})` : '';
          const dt = s.date || '';
          const amt = Utils.formatCurrency(s.netAmount || s.grandTotal || 0, settings.currency);
          return `${inv} - ${cust}${shop} (${dt}) - Total: ${amt}`;
        },
        currentVal,
        filteredSales.length ? '-- Select Original Invoice --' : '-- No Matching Invoices Found --'
      );
    }

    // Render interactive live search results dropdown
    if (dropdown) {
      if (!q) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('active');
        dropdown.style.display = 'none';
      } else if (!filteredSales.length) {
        dropdown.innerHTML = `<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.88rem; background: #ffffff;">No sales invoices or customers found matching "<strong>${query}</strong>".</div>`;
        dropdown.classList.add('active');
        dropdown.style.display = 'block';
      } else {
        let html = '';
        filteredSales.slice().reverse().slice(0, 15).forEach(s => {
          const inv = s.invoiceNumber || s.id || 'INV';
          const custName = s.customerName || 'Walk-in Customer';
          const custShop = s.customerShop ? ` (${s.customerShop})` : '';
          const dt = `${s.date || ''} ${s.time || ''}`.trim();
          const amt = Utils.formatCurrency(s.netAmount || s.grandTotal || 0, settings.currency);
          const itemCount = (s.items || []).length;
          const statusBadge = Utils.badge ? Utils.badge(s.status || 'Paid') : `<span class="badge">${s.status || 'Paid'}</span>`;

          html += `
            <div class="search-result-item" 
                 onmousedown="event.preventDefault(); (window.salesModule || salesModule).selectReturnInvoice('${s.id || s.invoiceNumber}');" 
                 style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #ffffff; transition: background 0.15s;"
                 onmouseover="this.style.background='#f8fafc'" 
                 onmouseout="this.style.background='#ffffff'">
              <div style="flex: 1; min-width: 0; padding-right: 12px;">
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem; display: flex; align-items: center; gap: 6px;">
                  <span style="color: var(--primary);"><i class="fa-solid fa-user"></i> ${custName}</span>
                  <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">${custShop}</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px; display: flex; gap: 10px; flex-wrap: wrap;">
                  <span><i class="fa-solid fa-file-invoice"></i> <strong>${inv}</strong></span>
                  <span><i class="fa-regular fa-clock"></i> ${dt}</span>
                  <span><i class="fa-solid fa-boxes-stacked"></i> ${itemCount} item(s)</span>
                </div>
              </div>
              <div style="text-align: right; white-space: nowrap;">
                <div style="font-weight: 800; color: var(--primary); font-size: 0.95rem;">${amt}</div>
                <div style="margin-top: 2px;">${statusBadge}</div>
              </div>
            </div>
          `;
        });
        dropdown.innerHTML = html;
        dropdown.classList.add('active');
        dropdown.style.display = 'block';
      }
    }

    if (currentVal && !filteredSales.some(s => (s.invoiceNumber === currentVal || s.id === currentVal))) {
      if (select) select.value = '';
      this.onReturnInvoiceSelected();
    }
  } catch (err) {
    console.error('Error filtering return invoices:', err);
  }
};

SalesModule.prototype.selectReturnInvoice = function(saleId) {
  try {
    const sales = (window.storage && typeof window.storage.getSales === 'function')
      ? storage.getSales()
      : (typeof storage !== 'undefined' ? storage.getSales() : []);

    const sale = (sales || []).find(s =>
      String(s.id || '') === String(saleId) ||
      String(s.invoiceNumber || '') === String(saleId)
    );

    const searchInput = document.getElementById('ret-customer-search');
    const select = document.getElementById('ret-sale-select');
    const dropdown = document.getElementById('ret-customer-search-results');

    if (dropdown) {
      dropdown.classList.remove('active');
      dropdown.style.display = 'none';
    }

    if (sale) {
      if (searchInput) {
        searchInput.value = `${sale.customerName || 'Walk-in Customer'} (${sale.invoiceNumber || sale.id})`;
      }
      if (select) {
        select.value = sale.invoiceNumber || sale.id || '';
      }
    } else if (select) {
      select.value = saleId;
    }

    this.onReturnInvoiceSelected();
  } catch (err) {
    console.error('Error selecting return invoice:', err);
  }
};

SalesModule.prototype.openReturnModal = function(saleId = null) {
  try {
    const select = document.getElementById('ret-sale-select');
    const searchInput = document.getElementById('ret-customer-search');
    const dropdown = document.getElementById('ret-customer-search-results');
    if (searchInput) searchInput.value = '';
    if (dropdown) {
      dropdown.innerHTML = '';
      dropdown.classList.remove('active');
      dropdown.style.display = 'none';
    }

    const sales = (window.storage && typeof window.storage.getSales === 'function')
      ? storage.getSales()
      : (typeof storage !== 'undefined' ? storage.getSales() : []);
    const settings = (window.storage && typeof window.storage.getSettings === 'function')
      ? storage.getSettings()
      : (typeof storage !== 'undefined' ? storage.getSettings() : { currency: 'Rs.' });

    // 1. Reset old form data
    const form = document.getElementById('return-form');
    if (form && typeof form.reset === 'function') form.reset();

    // 2. Set today's date automatically
    const dateInput = document.getElementById('ret-date');
    if (dateInput) dateInput.value = Utils.todayStr();

    // 3. Reset invoice info summary box
    const summaryBox = document.getElementById('ret-invoice-summary');
    if (summaryBox) summaryBox.style.display = 'none';

    const custElem = document.getElementById('ret-info-customer');
    if (custElem) custElem.textContent = '-';
    const dateElem = document.getElementById('ret-info-date');
    if (dateElem) dateElem.textContent = '-';
    const netElem = document.getElementById('ret-info-net');
    if (netElem) netElem.textContent = '-';

    // 4. Reset returned-items table
    const tbody = document.getElementById('ret-items-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">
            Select an invoice above to view returnable items.
          </td>
        </tr>
      `;
    }

    // 5. Reset refund total to 0.00
    const banner = document.getElementById('ret-total-refund-banner');
    if (banner) banner.textContent = Utils.formatCurrency(0, settings.currency);

    // 6. Populate dropdown with all sales
    this.filterReturnInvoices('');

    // 7. If saleId was provided, safely match by s.id OR s.invoiceNumber
    if (saleId) {
      this.selectReturnInvoice(saleId);
    }
  } catch (err) {
    console.error('Error setting up return modal data:', err);
  }

  // Open modal safely
  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.openModal === 'function') {
    appObj.openModal('return-modal');
  } else {
    const m = document.getElementById('return-modal');
    if (m) {
      m.style.display = 'flex';
      m.classList.add('show');
    }
  }
};

SalesModule.prototype.onReturnInvoiceSelected = function() {
  try {
    const selectElem = document.getElementById('ret-sale-select');
    if (!selectElem) return;
    const selectedVal = selectElem.value;
    const sales = (window.storage && typeof window.storage.getSales === 'function')
      ? storage.getSales()
      : (typeof storage !== 'undefined' ? storage.getSales() : []);

    const sale = (sales || []).find(s =>
      String(s.invoiceNumber || '') === String(selectedVal) ||
      String(s.id || '') === String(selectedVal)
    );

    const summaryBox = document.getElementById('ret-invoice-summary');
    const tbody = document.getElementById('ret-items-tbody');
    const settings = (window.storage && typeof window.storage.getSettings === 'function')
      ? storage.getSettings()
      : (typeof storage !== 'undefined' ? storage.getSettings() : { currency: 'Rs.' });

    if (!sale) {
      if (summaryBox) summaryBox.style.display = 'none';
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">
              Select an invoice above to view returnable items.
            </td>
          </tr>
        `;
      }
      const banner = document.getElementById('ret-total-refund-banner');
      if (banner) banner.textContent = Utils.formatCurrency(0, settings.currency);
      return;
    }

    // Populate header info summary
    const custElem = document.getElementById('ret-info-customer');
    if (custElem) custElem.textContent = sale.customerName ? `${sale.customerName}${sale.customerShop ? ' (' + sale.customerShop + ')' : ''}` : 'Walk-in Customer';
    const dateElem = document.getElementById('ret-info-date');
    if (dateElem) dateElem.textContent = `${sale.date || ''} ${sale.time || ''}`.trim() || '-';
    const netElem = document.getElementById('ret-info-net');
    if (netElem) netElem.textContent = Utils.formatCurrency(sale.netAmount || sale.grandTotal || 0, settings.currency);
    if (summaryBox) summaryBox.style.display = 'block';

    // Calculate already returned quantities for this invoice from all existing return records
    const allReturns = (window.storage && typeof window.storage.getReturns === 'function')
      ? storage.getReturns()
      : (typeof storage !== 'undefined' ? storage.getReturns() : []);

    const relevantReturns = allReturns.filter(r =>
      (sale.id && String(r.saleId || '') === String(sale.id)) ||
      (sale.invoiceNumber && String(r.invoiceNumber || '') === String(sale.invoiceNumber))
    );

    const returnedQtyMap = {};
    relevantReturns.forEach(r => {
      (r.items || []).forEach(ri => {
        const key = String(ri.productId || ri.itemNo || ri.name || '');
        if (key) {
          returnedQtyMap[key] = (returnedQtyMap[key] || 0) + (parseInt(ri.returnQty) || 0);
        }
      });
    });

    let html = '';
    const items = sale.items || [];

    if (!items.length) {
      html = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No product items found in this invoice.</td></tr>`;
    } else {
      items.forEach((item, index) => {
        const itemKey = String(item.productId || item.itemNo || item.name || '');
        const soldQty = parseInt(item.quantity) || 0;
        const prevReturned = returnedQtyMap[itemKey] || 0;
        const maxReturnable = Math.max(0, soldQty - prevReturned);

        const tradePrice = parseFloat(item.tp || item.costPrice || 0);
        const unitPrice = parseFloat(item.price || item.unitPrice || item.salePrice || 0);
        const discPercent = parseFloat(item.discountPercent || item.discount || 0);
        const extPercent = parseFloat(item.extPercent || 0);
        const taxPercent = parseFloat(item.taxPercent || 0);

        let netUnitPrice = 0;
        let taxableUnitPrice = 0;
        let unitTax = 0;

        if (item.netUnitPrice !== undefined && item.taxableUnitPrice !== undefined) {
          netUnitPrice = parseFloat(item.netUnitPrice);
          taxableUnitPrice = parseFloat(item.taxableUnitPrice);
          unitTax = parseFloat(item.unitTax) || 0;
        } else if (Utils.calcWholesaleLine) {
          const calc = Utils.calcWholesaleLine(soldQty || 1, unitPrice, item.bonus || 0, discPercent, extPercent, taxPercent, tradePrice);
          netUnitPrice = calc.netUnitPrice;
          taxableUnitPrice = calc.taxableUnitPrice;
          unitTax = calc.unitTax;
        } else {
          netUnitPrice = soldQty > 0 ? (parseFloat(item.totalAmount) / soldQty) : unitPrice;
          taxableUnitPrice = netUnitPrice;
          unitTax = 0;
        }

        const isFullyReturned = maxReturnable === 0;
        const marginPercent = item.marginPercent !== undefined 
          ? parseFloat(item.marginPercent) 
          : (item.realizedMarginPercent !== undefined 
            ? parseFloat(item.realizedMarginPercent) 
            : (tradePrice > 0 && soldQty > 0 && item.itemProfit !== undefined 
              ? Utils.round(((parseFloat(item.itemProfit) || 0) / (soldQty * tradePrice)) * 100, 2) 
              : 0));

        html += `
          <tr data-index="${index}" 
              data-product-id="${item.productId || ''}" 
              data-item-no="${item.itemNo || ''}" 
              data-name="${(item.name || 'Medicine Item').replace(/"/g, '&quot;')}" 
              data-net-unit-price="${netUnitPrice}" 
              data-taxable-unit-price="${taxableUnitPrice}"
              data-unit-tax="${unitTax}"
              data-trade-price="${tradePrice}"
              data-sold-qty="${soldQty}"
              data-margin-percent="${marginPercent}"
              data-item-profit="${parseFloat(item.itemProfit) || 0}">
            <td>
              <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">${item.name || 'Medicine Item'}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.itemNo || ''} ${item.batchNumber ? '&bull; Batch: ' + item.batchNumber : ''}</div>
            </td>
            <td style="font-weight: 600;">${soldQty}</td>
            <td style="color: #f59e0b; font-weight: 700;">${prevReturned}</td>
            <td>
              <span class="badge-status ${isFullyReturned ? 'badge-out-stock' : 'badge-paid'}" style="font-size: 0.75rem;">
                ${isFullyReturned ? 'Fully Returned (0)' : maxReturnable + ' left'}
              </span>
            </td>
            <td>
              <input type="number" 
                     class="form-control-myu ret-qty-input" 
                     min="0" 
                     max="${maxReturnable}" 
                     step="1" 
                     value="0" 
                     style="padding: 4px 8px; font-weight: 700; width: 90px; text-align: center; ${isFullyReturned ? 'background: #f1f5f9; cursor: not-allowed;' : ''}" 
                     ${isFullyReturned ? 'disabled' : ''} 
                     oninput="salesModule.calculateReturnRefundTotals()" 
                     onchange="salesModule.calculateReturnRefundTotals()">
            </td>
            <td style="font-weight: 600; color: #475569;">${Utils.formatCurrency(netUnitPrice, settings.currency)}</td>
            <td style="font-weight: 800; color: #ef4444;" class="ret-line-refund">Rs. 0.00</td>
          </tr>
        `;
      });
    }

    if (tbody) tbody.innerHTML = html;
    this.calculateReturnRefundTotals();
  } catch (err) {
    console.error('Error on selecting return invoice:', err);
  }
};

SalesModule.prototype.calculateReturnRefundTotals = function() {
  const rows = document.querySelectorAll('#ret-items-tbody tr[data-index]');
  let totalRefund = 0;
  const settings = (window.storage && typeof window.storage.getSettings === 'function')
    ? storage.getSettings()
    : (typeof storage !== 'undefined' ? storage.getSettings() : { currency: 'Rs.' });

  rows.forEach(row => {
    const qtyInput = row.querySelector('.ret-qty-input');
    const refundTd = row.querySelector('.ret-line-refund');
    const netUnitPrice = parseFloat(row.dataset.netUnitPrice) || 0;
    const maxReturnable = parseInt(qtyInput ? qtyInput.max : 0) || 0;

    let qty = parseInt(qtyInput ? qtyInput.value : 0) || 0;
    if (qty < 0) {
      qty = 0;
      if (qtyInput) qtyInput.value = 0;
    }
    if (qty > maxReturnable) {
      qty = maxReturnable;
      if (qtyInput) qtyInput.value = maxReturnable;
    }

    const lineRefund = qty * netUnitPrice;
    totalRefund += lineRefund;

    if (refundTd) {
      refundTd.textContent = Utils.formatCurrency(lineRefund, settings.currency);
    }
  });

  const banner = document.getElementById('ret-total-refund-banner');
  if (banner) {
    banner.textContent = Utils.formatCurrency(totalRefund, settings.currency);
  }
};

SalesModule.prototype.saveReturnForm = function() {
  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  const showMsg = (msg, type = 'warning') => {
    if (appObj && typeof appObj.showToast === 'function') {
      appObj.showToast(msg, type);
    } else {
      alert(msg);
    }
  };

  try {
    const selectElem = document.getElementById('ret-sale-select');
    const selectedVal = selectElem ? selectElem.value : '';
    const sales = storage.getSales();
    const sale = sales.find(s =>
      String(s.invoiceNumber || '') === String(selectedVal) ||
      String(s.id || '') === String(selectedVal)
    );

    if (!sale) {
      showMsg('Please select a valid original sale invoice.', 'warning');
      return;
    }

    const date = (document.getElementById('ret-date') ? document.getElementById('ret-date').value : '') || Utils.todayStr();
    if (!date) {
      showMsg('Please select a valid return date.', 'warning');
      return;
    }

    const paySelect = document.getElementById('ret-payment-method') || document.getElementById('ret-payment-mode');
    const paymentMethod = paySelect ? paySelect.value : 'Cash';
    const reason = (document.getElementById('ret-reason') ? document.getElementById('ret-reason').value : '') || 'Customer Return';
    const notes = (document.getElementById('ret-notes') ? document.getElementById('ret-notes').value.trim() : '');

    const returnedItems = [];
    let totalRefundAmount = 0;
    let totalRevenueReversed = 0;
    let totalTaxReversed = 0;
    let totalCogsReversed = 0;
    let totalProfitReversed = 0;

    const rows = document.querySelectorAll('#ret-items-tbody tr[data-index]');
    rows.forEach(row => {
      const qtyInput = row.querySelector('.ret-qty-input');
      const maxReturnable = parseInt(qtyInput ? qtyInput.max : 0) || 0;
      let returnQty = parseInt(qtyInput ? qtyInput.value : 0) || 0;

      // 5.1 Maximum Returnable Quantity
      if (returnQty > maxReturnable) returnQty = maxReturnable;
      if (returnQty < 0) returnQty = 0;

      if (returnQty > 0) {
        const netUnitPrice = parseFloat(row.dataset.netUnitPrice) || 0;
        const taxableUnitPrice = parseFloat(row.dataset.taxableUnitPrice) || netUnitPrice;
        const unitTax = parseFloat(row.dataset.unitTax) || 0;
        const tradePrice = parseFloat(row.dataset.tradePrice) || 0;

        // 5.2 Return Refund, Revenue & Tax Reversal, Returned COGS & Gross Profit Reversal
        const marginPercent = parseFloat(row.dataset.marginPercent) || 0;
        const lineRefund = Utils.round(returnQty * netUnitPrice);
        const lineRevenueReversed = Utils.round(returnQty * taxableUnitPrice);
        const lineTaxReversed = Utils.round(returnQty * unitTax);
        const returnedCogs = Utils.round(returnQty * tradePrice);
        const lineProfitReversed = Utils.round((returnQty * tradePrice) * (marginPercent / 100), 2);

        totalRefundAmount += lineRefund;
        totalRevenueReversed += lineRevenueReversed;
        totalTaxReversed += lineTaxReversed;
        totalCogsReversed += returnedCogs;
        totalProfitReversed += lineProfitReversed;

        returnedItems.push({
          productId: row.dataset.productId || '',
          itemNo: row.dataset.itemNo || '',
          name: row.dataset.name || '',
          returnQty: returnQty,
          unitPrice: netUnitPrice,
          taxableUnitPrice: taxableUnitPrice,
          unitTax: unitTax,
          tradePrice: tradePrice,
          marginPercent: marginPercent,
          returnedCogs: returnedCogs,
          lineRefund: lineRefund,
          lineRevenueReversed: lineRevenueReversed,
          lineTaxReversed: lineTaxReversed,
          lineProfitReversed: lineProfitReversed
        });
      }
    });

    totalRefundAmount = Utils.round(totalRefundAmount);
    totalRevenueReversed = Utils.round(totalRevenueReversed);
    totalTaxReversed = Utils.round(totalTaxReversed);
    totalCogsReversed = Utils.round(totalCogsReversed);
    totalProfitReversed = Utils.round(totalProfitReversed);

    if (returnedItems.length === 0 || totalRefundAmount <= 0) {
      showMsg('Please enter a return quantity (> 0) for at least one returnable item.', 'warning');
      return;
    }

    const returnData = {
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: date,
      customerId: sale.customerId || '',
      customerName: sale.customerName || 'Walk-in Customer',
      customerShop: sale.customerShop || '',
      items: returnedItems,
      totalRefundAmount: totalRefundAmount,
      totalRevenueReversed: totalRevenueReversed,
      totalTaxReversed: totalTaxReversed,
      totalCogsReversed: totalCogsReversed,
      totalProfitReversed: totalProfitReversed,
      paymentMethod: paymentMethod,
      reason: reason,
      notes: notes
    };

    const newReturn = storage.addReturn(returnData);
    if (newReturn) {
      if (appObj && typeof appObj.closeModal === 'function') {
        appObj.closeModal('return-modal');
      }
      showMsg(`Return ${newReturn.returnNumber} processed successfully! Refund of ${Utils.formatCurrency(totalRefundAmount)} issued & inventory restocked.`, 'success');

      this.renderReturnsView();
      if (appObj && typeof appObj.refreshCurrentView === 'function') {
        appObj.refreshCurrentView();
      }
    }
  } catch (err) {
    console.error('Return processing error:', err);
    showMsg('Unable to process return. Please check inputs and try again.', 'danger');
  }
};

SalesModule.prototype.viewReturnDetailsModal = function(returnId) {
  const returns = storage.getReturns();
  const ret = returns.find(r => r.id === returnId || r.returnNumber === returnId);
  if (!ret) return;

  this.currentReturnId = ret.id;
  const settings = storage.getSettings();
  const container = document.getElementById('return-details-modal-content');
  if (!container) return;

  let itemsHtml = '';
  (ret.items || []).forEach(item => {
    itemsHtml += `
      <tr>
        <td><strong>${item.name}</strong> ${item.itemNo ? '<span style="color: var(--text-muted); font-size: 0.75rem;">(' + item.itemNo + ')</span>' : ''}</td>
        <td style="text-align: center; font-weight: 700;">${item.returnQty}</td>
        <td style="text-align: right;">${Utils.formatCurrency(item.unitPrice, settings.currency)}</td>
        <td style="text-align: right; font-weight: 800; color: #ef4444;">${Utils.formatCurrency(item.lineRefund, settings.currency)}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="padding: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--primary); padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h2 style="color: var(--primary); margin: 0; font-size: 1.25rem;">${settings.shopName || 'MYU Wholesale'}</h2>
          <div style="font-size: 0.8rem; color: var(--text-muted);">SALES RETURN & REFUND VOUCHER</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 1.1rem; color: #ef4444;">${ret.returnNumber}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">Ref Inv: <strong>${ret.invoiceNumber}</strong></div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${ret.date} ${ret.time || ''}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.85rem; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px;">
        <div><strong>Customer:</strong> ${ret.customerName}</div>
        <div><strong>Refund Method:</strong> ${Utils.badge(ret.paymentMethod || 'Cash')}</div>
        <div><strong>Return Reason:</strong> ${ret.reason || 'Customer Return'}</div>
        <div><strong>Recorded On:</strong> ${ret.date}</div>
        ${ret.notes ? `<div style="grid-column: 1 / -1;"><strong>Notes:</strong> ${ret.notes}</div>` : ''}
      </div>

      <table class="custom-table" style="font-size: 0.85rem; margin-bottom: 16px;">
        <thead>
          <tr>
            <th>Product Name</th>
            <th style="text-align: center;">Returned Qty</th>
            <th style="text-align: right;">Unit Net Price</th>
            <th style="text-align: right;">Subtotal Refund</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; color: #991b1b;">TOTAL REFUND AMOUNT ISSUED:</span>
        <span style="font-size: 1.25rem; font-weight: 800; color: #ef4444;">${Utils.formatCurrency(ret.totalRefundAmount, settings.currency)}</span>
      </div>
    </div>
  `;

  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  if (appObj && typeof appObj.openModal === 'function') {
    appObj.openModal('return-details-modal');
  }
};

SalesModule.prototype.triggerPrintReturnVoucher = function(returnId) {
  const id = returnId || this.currentReturnId;
  const returns = storage.getReturns();
  const ret = returns.find(r => r.id === id || r.returnNumber === id);
  if (!ret) return;

  const container = document.getElementById('printable-invoice');
  if (!container) return;

  const settings = storage.getSettings();
  let itemsHtml = '';
  (ret.items || []).forEach((item, idx) => {
    itemsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.85rem;">
        <td style="padding: 8px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: 700; color: #0f172a;">${item.name}</td>
        <td style="padding: 8px; text-align: center; font-weight: 700;">${item.returnQty}</td>
        <td style="padding: 8px; text-align: right; color: #475569;">${Utils.formatCurrency(item.unitPrice, settings.currency)}</td>
        <td style="padding: 8px; text-align: right; font-weight: 800; color: #ef4444;">${Utils.formatCurrency(item.lineRefund, settings.currency)}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; background: #ffffff; padding: 20px; font-family: 'Inter', system-ui, sans-serif; color: #0f172a;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #ef4444; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0;">${settings.shopName || 'MYU Medicine Wholesale'}</h2>
          <div style="font-size: 0.82rem; color: #475569; margin-top: 2px;">${settings.address || 'Jail Road, Mardan'} &bull; Phone: ${settings.phone || '03445094631'}</div>
          <div style="font-size: 0.85rem; font-weight: 800; color: #ef4444; margin-top: 4px; text-transform: uppercase;">Official Sales Return & Refund Voucher</div>
        </div>
        <div style="text-align: right;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #ef4444; margin: 0;">${ret.returnNumber}</h3>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Ref Inv: <strong>${ret.invoiceNumber}</strong></div>
          <div style="font-size: 0.8rem; color: #64748b;">Date: ${ret.date} ${ret.time || ''}</div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 0.85rem; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div><strong>Customer Name:</strong> ${ret.customerName}</div>
        <div><strong>Refund Method:</strong> ${ret.paymentMethod || 'Cash'}</div>
        <div><strong>Reason for Return:</strong> ${ret.reason}</div>
        ${ret.notes ? `<div><strong>Notes:</strong> ${ret.notes}</div>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-size: 0.8rem; text-transform: uppercase; color: #475569;">
            <th style="padding: 8px; text-align: center;">#</th>
            <th style="padding: 8px; text-align: left;">Returned Medicine</th>
            <th style="padding: 8px; text-align: center;">Returned Qty</th>
            <th style="padding: 8px; text-align: right;">Unit Net Price</th>
            <th style="padding: 8px; text-align: right;">Line Refund</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 800; color: #991b1b;">TOTAL REFUND ISSUED:</span>
        <span style="font-size: 1.3rem; font-weight: 900; color: #ef4444;">${Utils.formatCurrency(ret.totalRefundAmount, settings.currency)}</span>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 0.78rem; color: #64748b;">
        <div>Customer Signature: __________________</div>
        <div>Authorized Representative: __________________</div>
      </div>
    </div>
  `;

  setTimeout(() => { window.print(); }, 250);
};

SalesModule.prototype.deleteReturn = function(id) {
  const appObj = window.app || (typeof app !== 'undefined' ? app : null);
  const proceedDelete = () => {
    storage.deleteReturn(id);
    if (appObj && typeof appObj.showToast === 'function') {
      appObj.showToast('Return record deleted & stock adjusted.', 'info');
    }
    this.renderReturnsView();
    if (appObj && typeof appObj.refreshCurrentView === 'function') {
      appObj.refreshCurrentView();
    }
  };

  if (appObj && typeof appObj.confirmDelete === 'function') {
    appObj.confirmDelete('Are you sure you want to delete this sales return record? Restocked items will be deducted back from inventory stock.', proceedDelete);
  } else if (typeof confirm !== 'undefined' ? confirm('Are you sure you want to delete this sales return record?') : true) {
    proceedDelete();
  }
};

window.openProcessReturnModal = function(saleId = null) {
  const module = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
  if (module && typeof module.openReturnModal === 'function') {
    module.openReturnModal(saleId);
  } else if (window.app && typeof window.app.openModal === 'function') {
    window.app.openModal('return-modal');
  } else {
    const m = document.getElementById('return-modal');
    if (m) {
      m.style.display = 'flex';
      m.classList.add('show');
    }
  }
};

window.viewReturnDetailsModal = function(returnId) {
  const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
  if (mod && typeof mod.viewReturnDetailsModal === 'function') {
    mod.viewReturnDetailsModal(returnId);
  }
};

window.deleteReturn = function(returnId) {
  const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
  if (mod && typeof mod.deleteReturn === 'function') {
    mod.deleteReturn(returnId);
  }
};

window.triggerPrintReturnVoucher = function(returnId) {
  const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
  if (mod && typeof mod.triggerPrintReturnVoucher === 'function') {
    mod.triggerPrintReturnVoucher(returnId);
  }
};

window.filterReturnInvoices = function(query) {
  const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
  if (mod && typeof mod.filterReturnInvoices === 'function') {
    mod.filterReturnInvoices(query);
  }
};

window.selectReturnInvoice = function(saleId) {
  const mod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
  if (mod && typeof mod.selectReturnInvoice === 'function') {
    mod.selectReturnInvoice(saleId);
  }
};

document.addEventListener('click', (e) => {
  const searchInput = document.getElementById('ret-customer-search');
  const dropdown = document.getElementById('ret-customer-search-results');
  if (dropdown && dropdown.style.display !== 'none') {
    if (!dropdown.contains(e.target) && e.target !== searchInput) {
      dropdown.classList.remove('active');
      dropdown.style.display = 'none';
    }
  }
});


