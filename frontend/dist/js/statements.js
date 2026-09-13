/* ==================== CUSTOMER PRODUCT PURCHASE & LEDGER STATEMENT MODULE ==================== */

class CustomerStatementsModule {
  constructor() {
    this.currentStatementData = null;
    this.selectedCustomerId = '';
    this.selectedPeriod = 'thisMonth';
    this.customStartDate = '';
    this.customEndDate = '';
    this.customerSearchQuery = '';
  }

  initView() {
    this.populateCustomerDropdown();
    this.setupPeriodSelector();
    this.setupCustomerSearchInput();
    this.renderStatement();
  }

  setupCustomerSearchInput() {
    const searchInput = document.getElementById('stmt-customer-search');
    if (searchInput) {
      searchInput.value = this.customerSearchQuery || '';
    }
  }

  filterCustomers(val) {
    this.customerSearchQuery = (val || '').trim();
    this.populateCustomerDropdown(this.customerSearchQuery);
    this.renderStatement();
  }

  populateCustomerDropdown(searchFilter = '') {
    const select = document.getElementById('stmt-customer-select');
    if (!select) return;

    if (storage && typeof storage.recalculateAllCustomerBalances === 'function') {
      storage.recalculateAllCustomerBalances();
    }

    const customers = (storage && typeof storage.getCustomers === 'function') ? storage.getCustomers() : [];
    const settings = (storage && typeof storage.getSettings === 'function') ? storage.getSettings() : { currency: 'Rs.' };

    const filter = (searchFilter || this.customerSearchQuery || '').toLowerCase().trim();
    const filteredCustomers = filter ? customers.filter(c => {
      const name = (c.name || '').toLowerCase();
      const shop = (c.shopName || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const addr = (c.address || '').toLowerCase();
      return name.includes(filter) || shop.includes(filter) || phone.includes(filter) || addr.includes(filter);
    }) : customers;

    let html = '';
    if (filteredCustomers.length === 0) {
      html = '<option value="">-- No Matching Customer / Pharmacy --</option>';
      select.innerHTML = html;
      this.selectedCustomerId = '';
      return;
    }

    filteredCustomers.forEach(c => {
      const shop = c.shopName ? ` (${c.shopName})` : '';
      const bal = Utils.formatCurrency(c.remainingBalance || 0, settings.currency);
      html += `<option value="${c.id}">${c.name}${shop} - Due: ${bal}</option>`;
    });

    select.innerHTML = html;
    if (this.selectedCustomerId && filteredCustomers.some(c => c.id === this.selectedCustomerId)) {
      select.value = this.selectedCustomerId;
    } else {
      select.value = filteredCustomers[0].id;
      this.selectedCustomerId = filteredCustomers[0].id;
    }
  }

  setupPeriodSelector() {
    const periodSelect = document.getElementById('stmt-period-select');
    const customRangeBox = document.getElementById('stmt-custom-range-container');
    const startDateInput = document.getElementById('stmt-start-date');
    const endDateInput = document.getElementById('stmt-end-date');

    if (periodSelect) {
      periodSelect.value = this.selectedPeriod || 'thisMonth';
    }

    if (startDateInput && !startDateInput.value) {
      startDateInput.value = this.customStartDate || Utils.todayStr(-30);
    }
    if (endDateInput && !endDateInput.value) {
      endDateInput.value = this.customEndDate || Utils.todayStr(0);
    }

    this.toggleCustomDateVisibility();
  }

  toggleCustomDateVisibility() {
    const periodSelect = document.getElementById('stmt-period-select');
    const customRangeBox = document.getElementById('stmt-custom-range-container');
    if (!periodSelect || !customRangeBox) return;

    if (periodSelect.value === 'custom') {
      customRangeBox.style.display = 'flex';
    } else {
      customRangeBox.style.display = 'none';
    }
  }

  onPeriodChange() {
    const periodSelect = document.getElementById('stmt-period-select');
    if (periodSelect) {
      this.selectedPeriod = periodSelect.value;
    }
    this.toggleCustomDateVisibility();
    this.renderStatement();
  }

  onCustomerChange() {
    const select = document.getElementById('stmt-customer-select');
    if (select) {
      this.selectedCustomerId = select.value;
    }
    this.renderStatement();
  }

  /**
   * Calculates the start and end dates based on the chosen period
   */
  getPeriodDateRange(periodKey) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const formatDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let startDate = '';
    let endDate = '';
    let periodLabel = '';

    switch (periodKey) {
      case 'today': {
        const todayStr = formatDate(now);
        startDate = todayStr;
        endDate = todayStr;
        periodLabel = `Today (${todayStr})`;
        break;
      }
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const yStr = formatDate(y);
        startDate = yStr;
        endDate = yStr;
        periodLabel = `Yesterday (${yStr})`;
        break;
      }
      case 'thisWeek': {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        startDate = formatDate(monday);
        endDate = formatDate(sunday);
        periodLabel = `This Week (${startDate} to ${endDate})`;
        break;
      }
      case 'thisMonth': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = formatDate(start);
        endDate = formatDate(end);
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        periodLabel = `This Month (${monthNames[now.getMonth()]}-${String(now.getFullYear()).slice(-2)})`;
        break;
      }
      case 'lastMonth': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = formatDate(start);
        endDate = formatDate(end);
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        periodLabel = `Last Month (${monthNames[start.getMonth()]}-${String(start.getFullYear()).slice(-2)})`;
        break;
      }
      case 'thisYear': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        startDate = formatDate(start);
        endDate = formatDate(end);
        periodLabel = `This Year (${now.getFullYear()})`;
        break;
      }
      case 'lastYear': {
        const prevYear = now.getFullYear() - 1;
        const start = new Date(prevYear, 0, 1);
        const end = new Date(prevYear, 11, 31);
        startDate = formatDate(start);
        endDate = formatDate(end);
        periodLabel = `Last Year (${prevYear})`;
        break;
      }
      case 'custom': {
        const sInput = document.getElementById('stmt-start-date');
        const eInput = document.getElementById('stmt-end-date');
        startDate = sInput && sInput.value ? sInput.value : formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        endDate = eInput && eInput.value ? eInput.value : formatDate(now);
        if (startDate > endDate) {
          const tmp = startDate;
          startDate = endDate;
          endDate = tmp;
        }
        periodLabel = `Custom Range (${startDate} to ${endDate})`;
        break;
      }
      default: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = formatDate(start);
        endDate = formatDate(end);
        periodLabel = `This Month`;
        break;
      }
    }

    return { startDate, endDate, periodLabel };
  }

  /**
   * Generates array of month objects between startDate and endDate
   */
  getMonthsInRange(startDateStr, endDateStr) {
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const months = [];
    if (!startDateStr || !endDateStr) return months;

    const [sYear, sMonth] = startDateStr.split('-').map(Number);
    const [eYear, eMonth] = endDateStr.split('-').map(Number);

    let curYear = sYear;
    let curMonth = sMonth;

    while (curYear < eYear || (curYear === eYear && curMonth <= eMonth)) {
      const key = `${curYear}-${String(curMonth).padStart(2, '0')}`;
      const shortYear = String(curYear).slice(-2);
      const label = `${monthNames[curMonth - 1]}-${shortYear}`;
      months.push({ key, label, year: curYear, month: curMonth });

      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }
    return months;
  }

  /**
   * Main calculation engine for customer ledger & product-wise purchase statement
   * Uses exact billed / discounted prices from invoices and accurately tracks both sold and returned quantities.
   */
  calculateCustomerStatementData(customerId, periodKey = 'thisMonth') {
    if (storage && typeof storage.recalculateAllCustomerBalances === 'function') {
      storage.recalculateAllCustomerBalances();
    }

    const { startDate, endDate, periodLabel } = this.getPeriodDateRange(periodKey);
    const months = this.getMonthsInRange(startDate, endDate);
    const isMultiMonth = months.length > 1;

    const customers = (storage && typeof storage.getCustomers === 'function') ? storage.getCustomers() : [];
    const customer = customers.find(c => c.id === customerId) || {
      id: customerId,
      name: 'Walk-in Customer',
      shopName: 'Counter Customer',
      phone: '',
      address: '',
      remainingBalance: 0
    };

    const allSales = (storage && typeof storage.getSales === 'function') ? storage.getSales() : [];
    const allReturns = (storage && typeof storage.getReturns === 'function') ? storage.getReturns() : [];
    const allProducts = (storage && typeof storage.getProducts === 'function') ? storage.getProducts() : [];

    // Filter sales for the selected customer and period
    const relevantSales = allSales.filter(sale => {
      const isCustMatch = (sale.customerId && (sale.customerId === customer.id || String(sale.customerId) === String(customer.id))) ||
        (sale.customerName && customer.name && sale.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase()) ||
        (sale.customerShop && customer.shopName && sale.customerShop.trim().toLowerCase() === customer.shopName.trim().toLowerCase());
      if (!isCustMatch) return false;
      const saleDate = (sale.date || '').substring(0, 10);
      return saleDate >= startDate && saleDate <= endDate;
    });

    // Filter returns for the selected customer and period (directly by customer or by linked original sale)
    const relevantReturns = allReturns.filter(ret => {
      const isDirectCust = (ret.customerId && (ret.customerId === customer.id || String(ret.customerId) === String(customer.id))) ||
        (ret.customerName && customer.name && ret.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase()) ||
        (ret.customerShop && customer.shopName && ret.customerShop.trim().toLowerCase() === customer.shopName.trim().toLowerCase());
      
      const isSaleLinked = (ret.saleId && allSales.some(s => s.id === ret.saleId && (s.customerId === customer.id || (s.customerName && customer.name && s.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase())))) ||
        (ret.invoiceNumber && allSales.some(s => s.invoiceNumber === ret.invoiceNumber && (s.customerId === customer.id || (s.customerName && customer.name && s.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase()))));
      
      if (!isDirectCust && !isSaleLinked) return false;
      const retDate = (ret.date || '').substring(0, 10);
      return retDate >= startDate && retDate <= endDate;
    });

    // Aggregated product map
    const productMap = {};

    // 1. Process Sales Invoices with exact Billed / Discounted Price
    relevantSales.forEach(sale => {
      const saleDate = sale.date || startDate;
      const monthKey = saleDate.substring(0, 7); // YYYY-MM

      (sale.items || []).forEach(item => {
        const prodId = item.productId || item.id || item.itemNo || item.name;
        const prodName = item.name || 'Unnamed Product';
        const itemNo = item.itemNo || item.code || '';
        const qty = parseInt(item.quantity !== undefined ? item.quantity : (item.qty || 0)) || 0;
        if (qty === 0) return;

        const catProd = allProducts.find(p => (item.productId && p.id === item.productId) || (item.itemNo && p.itemNo === item.itemNo) || (item.name && p.name === item.name));
        
        // Exact Billed / Discounted Rate from invoice
        let billPrice = 0;
        if (item.netUnitPrice !== undefined && item.netUnitPrice !== null && !isNaN(parseFloat(item.netUnitPrice))) {
          billPrice = parseFloat(item.netUnitPrice);
        } else if (qty > 0 && item.totalAmount !== undefined && !isNaN(parseFloat(item.totalAmount))) {
          billPrice = Utils.round(parseFloat(item.totalAmount) / qty, 2);
        } else if (item.price !== undefined && !isNaN(parseFloat(item.price))) {
          billPrice = parseFloat(item.price);
        } else if (item.tp !== undefined && !isNaN(parseFloat(item.tp))) {
          billPrice = parseFloat(item.tp);
        } else if (item.tradePrice !== undefined && !isNaN(parseFloat(item.tradePrice))) {
          billPrice = parseFloat(item.tradePrice);
        } else if (catProd) {
          billPrice = parseFloat(catProd.tp || catProd.salePrice || 0);
        }

        const companyName = item.company || (catProd ? (catProd.company || catProd.brand) : '') || 'General Products';
        const groupKey = companyName.trim() || 'General Products';
        const key = `${groupKey}:::${prodName}:::${billPrice}`;

        if (!productMap[key]) {
          const monthQuantities = {};
          months.forEach(m => { monthQuantities[m.key] = 0; });

          productMap[key] = {
            groupName: groupKey,
            productId: prodId,
            itemNo: itemNo,
            productName: prodName,
            tp: billPrice,
            billPrice: billPrice,
            monthQuantities: monthQuantities,
            soldUnits: 0,
            returnUnits: 0,
            totalUnits: 0,
            totalValue: 0
          };
        }

        if (productMap[key].monthQuantities[monthKey] !== undefined) {
          productMap[key].monthQuantities[monthKey] += qty;
        } else {
          productMap[key].monthQuantities[monthKey] = (productMap[key].monthQuantities[monthKey] || 0) + qty;
        }
        productMap[key].soldUnits += qty;
        productMap[key].totalUnits += qty;
      });
    });

    // 2. Process Returns (Tracks return quantities and deducts from net total units)
    relevantReturns.forEach(ret => {
      const retDate = ret.date || startDate;
      const monthKey = retDate.substring(0, 7);

      (ret.items || []).forEach(item => {
        const prodId = item.productId || item.id || item.itemNo || item.name;
        const prodName = item.name || 'Unnamed Product';
        const itemNo = item.itemNo || item.code || '';
        const returnQty = parseInt(item.returnQty !== undefined ? item.returnQty : (item.quantity !== undefined ? item.quantity : (item.qty || 0))) || 0;
        if (returnQty === 0) return;

        const catProd = allProducts.find(p => (item.productId && p.id === item.productId) || (item.itemNo && p.itemNo === item.itemNo) || (item.name && p.name === item.name));
        
        // Exact Billed / Return Unit Price
        let retPrice = 0;
        if (item.netUnitPrice !== undefined && item.netUnitPrice !== null && !isNaN(parseFloat(item.netUnitPrice))) {
          retPrice = parseFloat(item.netUnitPrice);
        } else if (item.unitPrice !== undefined && !isNaN(parseFloat(item.unitPrice))) {
          retPrice = parseFloat(item.unitPrice);
        } else if (item.price !== undefined && !isNaN(parseFloat(item.price))) {
          retPrice = parseFloat(item.price);
        } else if (item.tradePrice !== undefined && !isNaN(parseFloat(item.tradePrice))) {
          retPrice = parseFloat(item.tradePrice);
        } else if (item.tp !== undefined && !isNaN(parseFloat(item.tp))) {
          retPrice = parseFloat(item.tp);
        } else if (catProd) {
          retPrice = parseFloat(catProd.tp || catProd.salePrice || 0);
        }

        const companyName = item.company || (catProd ? (catProd.company || catProd.brand) : '') || 'General Products';
        const groupKey = companyName.trim() || 'General Products';

        // Check if there is an existing product entry to match
        let matchedKey = `${groupKey}:::${prodName}:::${retPrice}`;
        if (!productMap[matchedKey]) {
          const matchingKeys = Object.keys(productMap).filter(k => k.startsWith(`${groupKey}:::${prodName}:::`));
          if (matchingKeys.length === 1) {
            matchedKey = matchingKeys[0];
          }
        }

        if (!productMap[matchedKey]) {
          const monthQuantities = {};
          months.forEach(m => { monthQuantities[m.key] = 0; });

          productMap[matchedKey] = {
            groupName: groupKey,
            productId: prodId,
            itemNo: itemNo,
            productName: prodName,
            tp: retPrice,
            billPrice: retPrice,
            monthQuantities: monthQuantities,
            soldUnits: 0,
            returnUnits: 0,
            totalUnits: 0,
            totalValue: 0
          };
        }

        if (productMap[matchedKey].monthQuantities[monthKey] !== undefined) {
          productMap[matchedKey].monthQuantities[monthKey] -= returnQty;
        } else {
          productMap[matchedKey].monthQuantities[monthKey] = (productMap[matchedKey].monthQuantities[monthKey] || 0) - returnQty;
        }
        productMap[matchedKey].returnUnits += returnQty;
        productMap[matchedKey].totalUnits -= returnQty;
      });
    });

    // 3. Compute TOTAL VALUE = Price × TOTAL UNITS for each product and group by company/category
    const groupsMap = {};

    Object.values(productMap).forEach(prod => {
      // TOTAL VALUE = Price * TOTAL UNITS (Net valuation)
      prod.totalValue = Utils.round(prod.tp * prod.totalUnits, 2);

      const gName = prod.groupName || 'General Products';
      if (!groupsMap[gName]) {
        groupsMap[gName] = {
          groupName: gName,
          products: [],
          groupMonthQuantities: {},
          groupSoldUnits: 0,
          groupReturnUnits: 0,
          groupTotalUnits: 0,
          groupTotalValue: 0
        };
        months.forEach(m => { groupsMap[gName].groupMonthQuantities[m.key] = 0; });
      }

      groupsMap[gName].products.push(prod);
      months.forEach(m => {
        groupsMap[gName].groupMonthQuantities[m.key] += (prod.monthQuantities[m.key] || 0);
      });
      groupsMap[gName].groupSoldUnits += (prod.soldUnits || 0);
      groupsMap[gName].groupReturnUnits += (prod.returnUnits || 0);
      groupsMap[gName].groupTotalUnits += prod.totalUnits;
      groupsMap[gName].groupTotalValue = Utils.round(groupsMap[gName].groupTotalValue + prod.totalValue, 2);
    });

    // Sort products inside each group alphabetically by product name
    const groups = Object.values(groupsMap).sort((a, b) => a.groupName.localeCompare(b.groupName));
    groups.forEach(g => {
      g.products.sort((a, b) => a.productName.localeCompare(b.productName));
    });

    // Overall Company / Grand Totals
    const overallMonthQuantities = {};
    months.forEach(m => { overallMonthQuantities[m.key] = 0; });
    let overallSoldUnits = 0;
    let overallReturnUnits = 0;
    let overallTotalUnits = 0;
    let overallTotalValue = 0;
    let totalProductsCount = 0;

    groups.forEach(g => {
      months.forEach(m => {
        overallMonthQuantities[m.key] += (g.groupMonthQuantities[m.key] || 0);
      });
      overallSoldUnits += g.groupSoldUnits;
      overallReturnUnits += g.groupReturnUnits;
      overallTotalUnits += g.groupTotalUnits;
      overallTotalValue = Utils.round(overallTotalValue + g.groupTotalValue, 2);
      totalProductsCount += g.products.length;
    });

    return {
      customer,
      periodKey,
      periodLabel,
      startDate,
      endDate,
      months,
      isMultiMonth,
      groups,
      overallMonthQuantities,
      overallSoldUnits,
      overallReturnUnits,
      overallTotalUnits,
      overallTotalValue,
      totalProductsCount,
      invoiceCount: relevantSales.length,
      returnCount: relevantReturns.length
    };
  }

  /**
   * Renders the statement table in the UI
   */
  renderStatement() {
    const custSelect = document.getElementById('stmt-customer-select');
    const custId = custSelect ? custSelect.value : this.selectedCustomerId;
    const periodSelect = document.getElementById('stmt-period-select');
    const periodKey = periodSelect ? periodSelect.value : this.selectedPeriod;

    const data = this.calculateCustomerStatementData(custId, periodKey);
    this.currentStatementData = data;

    const settings = (storage && typeof storage.getSettings === 'function') ? storage.getSettings() : { currency: 'Rs.' };

    // 1. Update Customer Profile Header Card
    const nameElem = document.getElementById('stmt-disp-cust-name');
    const shopElem = document.getElementById('stmt-disp-cust-shop');
    const phoneElem = document.getElementById('stmt-disp-cust-phone');
    const addrElem = document.getElementById('stmt-disp-cust-address');
    const balElem = document.getElementById('stmt-disp-cust-balance');
    const periodElem = document.getElementById('stmt-disp-period');

    if (nameElem) nameElem.textContent = data.customer.name || 'Walk-in Customer';
    if (shopElem) shopElem.textContent = data.customer.shopName || '-';
    if (phoneElem) phoneElem.textContent = data.customer.phone || 'N/A';
    if (addrElem) addrElem.textContent = data.customer.address || '-';
    if (balElem) {
      balElem.textContent = Utils.formatCurrency(data.customer.remainingBalance || 0, settings.currency);
      balElem.style.color = (data.customer.remainingBalance || 0) > 0 ? '#ef4444' : '#10b981';
    }
    if (periodElem) periodElem.textContent = data.periodLabel;

    // 2. Safely Update KPI stats if present
    const kpiProducts = document.getElementById('stmt-kpi-products');
    const kpiUnits = document.getElementById('stmt-kpi-units');
    const kpiValue = document.getElementById('stmt-kpi-value');
    const kpiInvoices = document.getElementById('stmt-kpi-invoices');

    if (kpiProducts) kpiProducts.textContent = data.totalProductsCount;
    if (kpiUnits) kpiUnits.textContent = data.overallTotalUnits.toLocaleString();
    if (kpiValue) kpiValue.textContent = Utils.formatCurrency(data.overallTotalValue, settings.currency);
    if (kpiInvoices) kpiInvoices.textContent = `${data.invoiceCount} Sales ${data.returnCount > 0 ? `(${data.returnCount} Ret)` : ''}`;

    // 3. Render Table
    this.renderStatementTable();
  }

  /**
   * Renders the table body and headers with Sold Qty, Return Qty, Total Units and Ledger Due Balance
   */
  renderStatementTable() {
    const data = this.currentStatementData;
    const thead = document.getElementById('stmt-table-thead');
    const tbody = document.getElementById('stmt-table-tbody');
    const tfoot = document.getElementById('stmt-table-tfoot');

    if (!data || !thead || !tbody || !tfoot) return;
    const settings = (storage && typeof storage.getSettings === 'function') ? storage.getSettings() : { currency: 'Rs.' };

    // Build Table Header
    let headerHTML = `<tr>
      <th style="width: 40px; text-align: center;">#</th>
      <th>Product Name</th>
      <th style="text-align: right; width: 95px;">Price</th>`;

    if (data.isMultiMonth) {
      data.months.forEach(m => {
        headerHTML += `<th style="text-align: center; width: 80px;">${m.label}</th>`;
      });
    }

    headerHTML += `
      <th style="text-align: center; width: 90px;">Sold Qty</th>
      <th style="text-align: center; width: 95px; color: #f87171;">Return Qty</th>
      <th style="text-align: center; width: 100px;">Total Units</th>
      <th style="text-align: right; width: 125px;">Total Value</th>
    </tr>`;
    thead.innerHTML = headerHTML;

    const baseColSpan = 3 + (data.isMultiMonth ? data.months.length : 0) + 4;

    if (data.groups.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${baseColSpan}" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <i class="fa-solid fa-file-circle-question" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
            <div style="font-weight: 700; font-size: 1.05rem; color: #475569;">No purchase records found for this period</div>
            <div style="font-size: 0.85rem; margin-top: 4px;">The selected customer has no historical sales or returns recorded during <strong>${data.periodLabel}</strong>.</div>
          </td>
        </tr>
      `;
      tfoot.innerHTML = '';
      return;
    }

    let bodyHTML = '';
    let globalRowIdx = 1;

    data.groups.forEach(group => {
      // Group Header Row
      bodyHTML += `
        <tr class="stmt-group-header-row" style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          <td colspan="${baseColSpan}" style="padding: 8px 12px; color: var(--primary); font-size: 0.92rem; text-transform: uppercase;">
            <i class="fa-solid fa-building-flag" style="margin-right: 6px;"></i> ${group.groupName}
          </td>
        </tr>
      `;

      // Product Rows in Group
      group.products.forEach(prod => {
        const tpFormatted = Utils.formatNumber ? Utils.formatNumber(prod.tp) : prod.tp.toFixed(2);
        const valFormatted = Utils.formatNumber ? Utils.formatNumber(prod.totalValue) : prod.totalValue.toFixed(2);
        const isNegativeVal = prod.totalValue < 0;

        bodyHTML += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">${globalRowIdx++}</td>
            <td style="font-weight: 700; color: #0f172a;">
              ${prod.productName}
              ${prod.itemNo ? `<span style="font-size: 0.75rem; color: #64748b; margin-left: 6px; font-weight: 500;">(${prod.itemNo})</span>` : ''}
            </td>
            <td style="text-align: right; font-weight: 600; color: #475569;">${tpFormatted}</td>
        `;

        if (data.isMultiMonth) {
          data.months.forEach(m => {
            const mQty = prod.monthQuantities[m.key] || 0;
            const mQtyStyle = mQty < 0 ? 'color: #ef4444; font-weight: 800;' : (mQty > 0 ? 'font-weight: 700;' : 'color: #94a3b8;');
            bodyHTML += `<td style="text-align: center; ${mQtyStyle}">${mQty !== 0 ? mQty.toLocaleString() : '-'}</td>`;
          });
        }

        const retStyle = prod.returnUnits > 0 ? 'color: #ef4444; font-weight: 800;' : 'color: #94a3b8;';
        const unitsStyle = prod.totalUnits < 0 ? 'color: #ef4444; font-weight: 900;' : 'color: #0f172a; font-weight: 800;';
        const valStyle = isNegativeVal ? 'color: #ef4444; font-weight: 900;' : 'color: var(--primary); font-weight: 800;';

        bodyHTML += `
            <td style="text-align: center; font-weight: 700; color: #0f172a;">${(prod.soldUnits || 0).toLocaleString()}</td>
            <td style="text-align: center; ${retStyle}">${prod.returnUnits > 0 ? `-${prod.returnUnits.toLocaleString()}` : '0'}</td>
            <td style="text-align: center; ${unitsStyle}">${prod.totalUnits.toLocaleString()}</td>
            <td style="text-align: right; ${valStyle}">${valFormatted}</td>
          </tr>
        `;
      });

      // Group Subtotal Row
      const groupValFormatted = Utils.formatNumber ? Utils.formatNumber(group.groupTotalValue) : group.groupTotalValue.toFixed(2);
      bodyHTML += `
        <tr class="stmt-group-total-row" style="background: #f8fafc; font-weight: 800; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; font-size: 0.88rem;">
          <td colspan="2" style="text-align: right; color: #475569; text-transform: uppercase; padding: 7px 12px;">Group Total (${group.groupName}):</td>
          <td style="text-align: right; color: #64748b;">-</td>
      `;

      if (data.isMultiMonth) {
        data.months.forEach(m => {
          const gQty = group.groupMonthQuantities[m.key] || 0;
          bodyHTML += `<td style="text-align: center; color: #334155;">${gQty !== 0 ? gQty.toLocaleString() : '0'}</td>`;
        });
      }

      bodyHTML += `
          <td style="text-align: center; color: #0f172a; font-weight: 800;">${group.groupSoldUnits.toLocaleString()}</td>
          <td style="text-align: center; color: ${group.groupReturnUnits > 0 ? '#ef4444' : '#64748b'}; font-weight: 800;">${group.groupReturnUnits > 0 ? `-${group.groupReturnUnits.toLocaleString()}` : '0'}</td>
          <td style="text-align: center; color: #0f172a; font-weight: 900;">${group.groupTotalUnits.toLocaleString()}</td>
          <td style="text-align: right; color: var(--primary); font-weight: 900;">${groupValFormatted}</td>
        </tr>
      `;
    });

    tbody.innerHTML = bodyHTML;

    // Grand Company Total Row
    const grandValFormatted = Utils.formatNumber ? Utils.formatNumber(data.overallTotalValue) : data.overallTotalValue.toFixed(2);
    const dueBalance = data.customer.remainingBalance || 0;
    const dueBalFormatted = Utils.formatNumber ? Utils.formatNumber(dueBalance) : dueBalance.toFixed(2);

    let footHTML = `
      <tr style="background: #0f172a; color: #ffffff; font-weight: 900; font-size: 0.95rem;">
        <td colspan="2" style="text-align: right; padding: 10px 14px; text-transform: uppercase; letter-spacing: 0.5px;">Company Total:</td>
        <td style="text-align: right; color: #94a3b8;">-</td>
    `;

    if (data.isMultiMonth) {
      data.months.forEach(m => {
        const oQty = data.overallMonthQuantities[m.key] || 0;
        footHTML += `<td style="text-align: center; color: #38bdf8;">${oQty.toLocaleString()}</td>`;
      });
    }

    footHTML += `
        <td style="text-align: center; color: #38bdf8; font-size: 1rem;">${data.overallSoldUnits.toLocaleString()}</td>
        <td style="text-align: center; color: ${data.overallReturnUnits > 0 ? '#f87171' : '#94a3b8'}; font-size: 1rem;">${data.overallReturnUnits > 0 ? `-${data.overallReturnUnits.toLocaleString()}` : '0'}</td>
        <td style="text-align: center; color: #38bdf8; font-size: 1.05rem;">${data.overallTotalUnits.toLocaleString()}</td>
        <td style="text-align: right; color: #34d399; font-size: 1.05rem; padding-right: 12px;">${grandValFormatted}</td>
      </tr>
      <tr style="background: #1e293b; color: #ffffff; font-weight: 800; font-size: 0.92rem; border-top: 1px solid #334155;">
        <td colspan="${baseColSpan - 1}" style="text-align: right; padding: 9px 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #cbd5e1;">
          <i class="fa-solid fa-scale-balanced" style="margin-right: 6px; color: #38bdf8;"></i> Customer Ledger Outstanding Due Balance:
        </td>
        <td style="text-align: right; color: ${dueBalance > 0 ? '#f87171' : '#34d399'}; font-size: 1.1rem; font-weight: 900; padding-right: 12px;">
          ${settings.currency} ${dueBalFormatted}
        </td>
      </tr>
    `;
    tfoot.innerHTML = footHTML;
  }

  /**
   * Generates printable HTML statement matching official wholesale standards
   */
  buildPrintTemplate() {
    const data = this.currentStatementData || this.calculateCustomerStatementData(this.selectedCustomerId, this.selectedPeriod);
    const settings = (storage && typeof storage.getSettings === 'function') ? storage.getSettings() : { shopName: 'MYU Medicine & Surgical Wholesale', address: 'Jail Road, Mardan', phone: '03445094631', currency: 'Rs.' };

    const fmt = n => (Utils.formatNumber ? Utils.formatNumber(n) : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    let rowsHTML = '';
    let globalIdx = 1;
    const baseColSpan = 3 + (data.isMultiMonth ? data.months.length : 0) + 4;

    data.groups.forEach(group => {
      rowsHTML += `
        <tr style="background: #e2e8f0; font-weight: 800; border-top: 1.5px solid #64748b; border-bottom: 1px solid #94a3b8;">
          <td colspan="${baseColSpan}" style="padding: 5px 8px; font-size: 8pt; color: #0f172a; text-transform: uppercase;">
            &bull; GROUP: ${group.groupName}
          </td>
        </tr>
      `;

      group.products.forEach(prod => {
        rowsHTML += `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 7.5pt;">
            <td style="padding: 3px 4px; text-align: center; color: #475569;">${globalIdx++}</td>
            <td style="padding: 3px 6px; font-weight: 700; color: #0f172a;">
              ${prod.productName}
              ${prod.itemNo ? `<span style="font-size: 6.8pt; color: #64748b; font-weight: normal;">(${prod.itemNo})</span>` : ''}
            </td>
            <td style="padding: 3px 6px; text-align: right; color: #334155;">${fmt(prod.tp)}</td>
        `;

        if (data.isMultiMonth) {
          data.months.forEach(m => {
            const mQty = prod.monthQuantities[m.key] || 0;
            const qColor = mQty < 0 ? 'color: #dc2626; font-weight: bold;' : (mQty > 0 ? 'color: #0f172a;' : 'color: #94a3b8;');
            rowsHTML += `<td style="padding: 3px 4px; text-align: center; ${qColor}">${mQty !== 0 ? mQty : '-'}</td>`;
          });
        }

        const retColor = prod.returnUnits > 0 ? 'color: #dc2626; font-weight: bold;' : 'color: #64748b;';
        const valColor = prod.totalValue < 0 ? 'color: #dc2626; font-weight: bold;' : 'color: #0f172a; font-weight: bold;';

        rowsHTML += `
            <td style="padding: 3px 4px; text-align: center; font-weight: bold; color: #0f172a;">${prod.soldUnits || 0}</td>
            <td style="padding: 3px 4px; text-align: center; ${retColor}">${prod.returnUnits > 0 ? `-${prod.returnUnits}` : '0'}</td>
            <td style="padding: 3px 4px; text-align: center; font-weight: bold; color: #0f172a;">${prod.totalUnits}</td>
            <td style="padding: 3px 6px; text-align: right; ${valColor}">${fmt(prod.totalValue)}</td>
          </tr>
        `;
      });

      // Group Subtotal Row
      rowsHTML += `
        <tr style="background: #f1f5f9; font-weight: bold; border-top: 1px solid #cbd5e1; border-bottom: 1.5px solid #94a3b8; font-size: 7.8pt;">
          <td colspan="2" style="padding: 4px 8px; text-align: right; text-transform: uppercase;">Group Total (${group.groupName}):</td>
          <td style="padding: 4px 6px; text-align: right; color: #64748b;">-</td>
      `;

      if (data.isMultiMonth) {
        data.months.forEach(m => {
          const gQty = group.groupMonthQuantities[m.key] || 0;
          rowsHTML += `<td style="padding: 4px 4px; text-align: center;">${gQty}</td>`;
        });
      }

      rowsHTML += `
          <td style="padding: 4px 4px; text-align: center; font-weight: bold;">${group.groupSoldUnits}</td>
          <td style="padding: 4px 4px; text-align: center; font-weight: bold; color: ${group.groupReturnUnits > 0 ? '#dc2626' : '#64748b'};">${group.groupReturnUnits > 0 ? `-${group.groupReturnUnits}` : '0'}</td>
          <td style="padding: 4px 4px; text-align: center; font-weight: 900;">${group.groupTotalUnits}</td>
          <td style="padding: 4px 6px; text-align: right; font-weight: 900; color: #0f172a;">${fmt(group.groupTotalValue)}</td>
        </tr>
      `;
    });

    // Company Grand Total
    let grandTotalCols = '';
    if (data.isMultiMonth) {
      data.months.forEach(m => {
        const oQty = data.overallMonthQuantities[m.key] || 0;
        grandTotalCols += `<td style="padding: 5px 4px; text-align: center;">${oQty}</td>`;
      });
    }

    const headerMonthCols = data.isMultiMonth
      ? data.months.map(m => `<th style="padding: 5px 3px; text-align: center; border: 1px solid #94a3b8;">${m.label}</th>`).join('')
      : '';

    const logoSrc = typeof MYU_OFFICIAL_LOGO_B64 !== 'undefined' ? MYU_OFFICIAL_LOGO_B64 : 'assets/signature.png';

    return `
      <div style="width: 100%; max-width: 1000px; margin: 0 auto; background: #ffffff; padding: 14px 18px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; box-sizing: border-box;">
        
        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 12px;">
          <div style="display: flex; gap: 12px; align-items: center;">
            <img src="${logoSrc}" style="width: 55px; height: 55px; object-fit: contain; border-radius: 6px; background: #000; padding: 2px;" alt="MYU Logo">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 900; margin: 0; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px;">${settings.shopName || 'MYU Medicine & Surgical Wholesale'}</h2>
              <div style="font-size: 0.82rem; color: #475569; margin-top: 2px;">${settings.address || 'Jail Road, Mardan'} &bull; Phone: ${settings.phone || '03445094631'}</div>
              <div style="font-size: 0.78rem; color: #64748b; font-weight: 600;">Wholesale Medicine, Surgical Supplies & Pharmacy Distribution</div>
            </div>
          </div>
          <div style="text-align: right;">
            <h3 style="font-size: 1.1rem; font-weight: 900; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Customer Ledger Statement</h3>
            <div style="font-size: 0.82rem; font-weight: 700; color: #0f766e; margin-top: 3px;">Product-wise Ledger Analysis</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Printed: ${Utils.todayStr()} ${Utils.nowTimeStr()}</div>
          </div>
        </div>

        <!-- CUSTOMER & STATEMENT INFO BOX -->
        <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 0.82rem;">
          <div style="flex: 1; min-width: 0; padding-right: 14px;">
            <div><span style="color: #64748b; font-weight: 600;">Customer / Pharmacy:</span> <strong style="color: #0f172a; font-size: 0.95rem;">${data.customer.name}</strong> ${data.customer.shopName ? `(${data.customer.shopName})` : ''}</div>
            <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 600;">Address:</span> <span>${data.customer.address || 'Mardan'}</span> &bull; <span style="color: #64748b; font-weight: 600;">Phone:</span> <span>${data.customer.phone || 'N/A'}</span></div>
          </div>
          <div style="text-align: right; white-space: nowrap;">
            <div><span style="color: #64748b; font-weight: 600;">Statement Period:</span> <strong style="color: #0f766e; font-size: 0.9rem;">${data.periodLabel}</strong></div>
            <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 600;">Ledger Due Balance:</span> <strong style="color: ${(data.customer.remainingBalance || 0) > 0 ? '#dc2626' : '#059669'}; font-size: 0.9rem;">${settings.currency} ${fmt(data.customer.remainingBalance || 0)}</strong></div>
          </div>
        </div>

        <!-- COMPACT PRODUCT-WISE DATA TABLE -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; margin-bottom: 16px; font-size: 7.8pt;">
          <thead>
            <tr style="background: #0f766e; color: #ffffff; font-weight: 800; font-size: 7.8pt; text-transform: uppercase;">
              <th style="padding: 5px 3px; width: 28px; text-align: center; border: 1px solid #0d9488;">#</th>
              <th style="padding: 5px 6px; text-align: left; border: 1px solid #0d9488;">Product Name</th>
              <th style="padding: 5px 6px; width: 75px; text-align: right; border: 1px solid #0d9488;">Price</th>
              ${headerMonthCols}
              <th style="padding: 5px 4px; width: 65px; text-align: center; border: 1px solid #0d9488;">Sold Qty</th>
              <th style="padding: 5px 4px; width: 70px; text-align: center; border: 1px solid #0d9488;">Return Qty</th>
              <th style="padding: 5px 4px; width: 75px; text-align: center; border: 1px solid #0d9488;">Total Units</th>
              <th style="padding: 5px 6px; width: 95px; text-align: right; border: 1px solid #0d9488;">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
          <tfoot>
            <tr style="background: #0f172a; color: #ffffff; font-weight: 900; font-size: 8.5pt; border-top: 2px solid #000;">
              <td colspan="2" style="padding: 6px 8px; text-align: right; text-transform: uppercase;">Company Total:</td>
              <td style="padding: 6px 6px; text-align: right; color: #94a3b8;">-</td>
              ${grandTotalCols}
              <td style="padding: 6px 4px; text-align: center; color: #38bdf8;">${data.overallSoldUnits}</td>
              <td style="padding: 6px 4px; text-align: center; color: ${data.overallReturnUnits > 0 ? '#f87171' : '#94a3b8'};">${data.overallReturnUnits > 0 ? `-${data.overallReturnUnits}` : '0'}</td>
              <td style="padding: 6px 4px; text-align: center; color: #38bdf8; font-size: 9.5pt;">${data.overallTotalUnits}</td>
              <td style="padding: 6px 6px; text-align: right; color: #34d399; font-size: 9.5pt;">${fmt(data.overallTotalValue)}</td>
            </tr>
            <tr style="background: #1e293b; color: #ffffff; font-weight: 900; font-size: 8.5pt; border-top: 1px solid #334155;">
              <td colspan="${baseColSpan - 1}" style="padding: 6px 8px; text-align: right; text-transform: uppercase;">Customer Ledger Outstanding Due Balance:</td>
              <td style="padding: 6px 6px; text-align: right; color: ${(data.customer.remainingBalance || 0) > 0 ? '#f87171' : '#34d399'}; font-size: 9.5pt;">${settings.currency} ${fmt(data.customer.remainingBalance || 0)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- SIGNATURE FOOTER -->
        <div style="margin-top: 28px; display: flex; justify-content: space-between; font-size: 0.78rem; color: #475569; border-top: 1px solid #cbd5e1; padding-top: 12px;">
          <div>Prepared By: _____________________</div>
          <div>Checked By: _____________________</div>
          <div>Customer / Authorized Sign: _____________________</div>
        </div>

        <div style="margin-top: 12px; font-size: 0.70rem; color: #94a3b8; text-align: center;">
          MYU Wholesale System &bull; Confidential Customer Statement &bull; Jail Road, Mardan (0344-5094631)
        </div>
      </div>
    `;
  }

  printStatement() {
    const container = document.getElementById('printable-invoice');
    if (!container) return;

    container.innerHTML = this.buildPrintTemplate();
    setTimeout(() => { window.print(); }, 250);
  }

  exportPDF() {
    this.printStatement();
  }

  /**
   * Generates and downloads full Excel spreadsheet (.xls format) with styling, headers and values
   */
  exportExcel() {
    const data = this.currentStatementData || this.calculateCustomerStatementData(this.selectedCustomerId, this.selectedPeriod);
    const settings = (storage && typeof storage.getSettings === 'function') ? storage.getSettings() : { shopName: 'MYU Medicine Wholesale' };

    const fmt = n => Number(n).toFixed(2);
    const baseColSpan = 3 + (data.isMultiMonth ? data.months.length : 0) + 4;

    let excelHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; }
          th { background-color: #0f766e; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 6px; }
          td { border: 1px solid #cccccc; padding: 4px 6px; }
          .group-hdr { background-color: #e2e8f0; font-weight: bold; color: #0f172a; }
          .group-tot { background-color: #f1f5f9; font-weight: bold; }
          .comp-tot { background-color: #0f172a; color: #ffffff; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="${baseColSpan}" style="font-size: 16pt; font-weight: bold; text-align: center; color: #0f766e;">${settings.shopName || 'MYU Medicine Wholesale'}</td></tr>
          <tr><td colspan="${baseColSpan}" style="font-size: 13pt; font-weight: bold; text-align: center;">CUSTOMER LEDGER STATEMENT</td></tr>
          <tr><td colspan="${baseColSpan}" style="text-align: center;">Period: ${data.periodLabel} | Generated: ${Utils.todayStr()} ${Utils.nowTimeStr()}</td></tr>
          <tr><td colspan="${baseColSpan}"></td></tr>
          <tr>
            <td colspan="2"><strong>Customer Name:</strong> ${data.customer.name}</td>
            <td colspan="${baseColSpan - 2}"><strong>Shop / Pharmacy:</strong> ${data.customer.shopName || 'N/A'}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Phone:</strong> ${data.customer.phone || 'N/A'}</td>
            <td colspan="${baseColSpan - 2}"><strong>Address:</strong> ${data.customer.address || 'Mardan'}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Due Balance:</strong> ${fmt(data.customer.remainingBalance || 0)}</td>
            <td colspan="${baseColSpan - 2}"><strong>Total Products:</strong> ${data.totalProductsCount}</td>
          </tr>
          <tr><td colspan="${baseColSpan}"></td></tr>
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>Price</th>
    `;

    if (data.isMultiMonth) {
      data.months.forEach(m => {
        excelHTML += `<th>${m.label}</th>`;
      });
    }

    excelHTML += `
              <th>Sold Qty</th>
              <th>Return Qty</th>
              <th>Total Units</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
    `;

    let globalIdx = 1;
    data.groups.forEach(group => {
      excelHTML += `
        <tr class="group-hdr">
          <td colspan="${baseColSpan}">GROUP: ${group.groupName}</td>
        </tr>
      `;

      group.products.forEach(prod => {
        excelHTML += `
          <tr>
            <td style="text-align: center;">${globalIdx++}</td>
            <td>${prod.productName}</td>
            <td style="text-align: right;">${fmt(prod.tp)}</td>
        `;

        if (data.isMultiMonth) {
          data.months.forEach(m => {
            const mQty = prod.monthQuantities[m.key] || 0;
            excelHTML += `<td style="text-align: center;">${mQty}</td>`;
          });
        }

        excelHTML += `
            <td style="text-align: center;">${prod.soldUnits || 0}</td>
            <td style="text-align: center;">${prod.returnUnits || 0}</td>
            <td style="text-align: center; font-weight: bold;">${prod.totalUnits}</td>
            <td style="text-align: right;">${fmt(prod.totalValue)}</td>
          </tr>
        `;
      });

      // Group subtotal
      excelHTML += `
        <tr class="group-tot">
          <td colspan="2" style="text-align: right;">Group Total (${group.groupName}):</td>
          <td style="text-align: right;">-</td>
      `;

      if (data.isMultiMonth) {
        data.months.forEach(m => {
          excelHTML += `<td style="text-align: center;">${group.groupMonthQuantities[m.key] || 0}</td>`;
        });
      }

      excelHTML += `
          <td style="text-align: center; font-weight: bold;">${group.groupSoldUnits}</td>
          <td style="text-align: center; font-weight: bold;">${group.groupReturnUnits}</td>
          <td style="text-align: center; font-weight: bold;">${group.groupTotalUnits}</td>
          <td style="text-align: right; font-weight: bold;">${fmt(group.groupTotalValue)}</td>
        </tr>
      `;
    });

    // Grand Company Total
    excelHTML += `
      <tr class="comp-tot">
        <td colspan="2" style="text-align: right;">COMPANY TOTAL:</td>
        <td style="text-align: right;">-</td>
    `;

    if (data.isMultiMonth) {
      data.months.forEach(m => {
        excelHTML += `<td style="text-align: center;">${data.overallMonthQuantities[m.key] || 0}</td>`;
      });
    }

    excelHTML += `
        <td style="text-align: center;">${data.overallSoldUnits}</td>
        <td style="text-align: center;">${data.overallReturnUnits}</td>
        <td style="text-align: center;">${data.overallTotalUnits}</td>
        <td style="text-align: right;">${fmt(data.overallTotalValue)}</td>
      </tr>
      <tr style="background-color: #1e293b; color: #ffffff; font-weight: bold;">
        <td colspan="${baseColSpan - 1}" style="text-align: right;">CUSTOMER LEDGER DUE BALANCE:</td>
        <td style="text-align: right;">${fmt(data.customer.remainingBalance || 0)}</td>
      </tr>
      </tbody>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHTML], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeCustName = (data.customer.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `Ledger_Statement_${safeCustName}_${Utils.todayStr()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const appObj = window.app || (typeof app !== 'undefined' ? app : null);
    if (appObj && typeof appObj.showToast === 'function') {
      appObj.showToast('Customer statement exported to Excel successfully!', 'success');
    }
  }
}

// Global initialization
var customerStatementsModule = window.customerStatementsModule || new CustomerStatementsModule();

if (typeof global !== 'undefined') {
  global.CustomerStatementsModule = CustomerStatementsModule;
  global.customerStatementsModule = customerStatementsModule;
}
if (typeof window !== 'undefined') {
  window.CustomerStatementsModule = CustomerStatementsModule;
  window.customerStatementsModule = customerStatementsModule;
}
