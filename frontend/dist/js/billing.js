/* ==================== POS BILLING & INVOICE CREATION MODULE ==================== */
class BillingModule {
  constructor() {
    this.cartItems = [];
    this.bindEvents();
    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => this.initView(), 50);
      } else {
        document.addEventListener('DOMContentLoaded', () => this.initView());
      }
    }
  }

  bindEvents() {
    if (this.eventsBound) return;
    const searchInput = document.getElementById('pos-product-search') || document.getElementById('pos-search-input') || document.getElementById('product-search-input');
    const dropdown = document.getElementById('pos-search-results') || document.getElementById('product-search-results');

    if (searchInput) {
      this.eventsBound = true;
      this.selectedSearchIndex = 0;

      searchInput.addEventListener('input', (e) => {
        this.selectedSearchIndex = 0;
        this.renderSearchResults(e.target.value.toLowerCase().trim());
      });

      searchInput.addEventListener('focus', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (q) {
          this.renderSearchResults(q);
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        const currDropdown = document.getElementById('pos-search-results') || document.getElementById('product-search-results');
        const items = currDropdown ? Array.from(currDropdown.querySelectorAll('.search-result-item')) : [];
        if (!items.length) {
          if (e.key === 'Escape') {
            this.hideSearchResults();
          }
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          this.selectedSearchIndex = (this.selectedSearchIndex + 1) % items.length;
          this.highlightSearchResult(items, this.selectedSearchIndex);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          this.selectedSearchIndex = (this.selectedSearchIndex - 1 + items.length) % items.length;
          this.highlightSearchResult(items, this.selectedSearchIndex);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const idx = (this.selectedSearchIndex >= 0 && this.selectedSearchIndex < items.length) ? this.selectedSearchIndex : 0;
          const targetItem = items[idx];
          const prodId = targetItem ? targetItem.getAttribute('data-product-id') : null;
          this.hideSearchResults();
          if (prodId) {
            this.addProductToCart(prodId);
          } else if (targetItem) {
            targetItem.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          } else {
            this.clearSearchInput();
            this.focusSearchInput();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.hideSearchResults();
        }
      });

      document.addEventListener('click', (e) => {
        const currSearch = document.getElementById('pos-product-search') || document.getElementById('pos-search-input') || document.getElementById('product-search-input');
        const currDropdown = document.getElementById('pos-search-results') || document.getElementById('product-search-results');
        if (currDropdown && currSearch && !currSearch.contains(e.target) && !currDropdown.contains(e.target)) {
          this.hideSearchResults();
        }
      });
    }

    const custSelect = document.getElementById('pos-customer-select');
    if (custSelect) custSelect.addEventListener('change', () => this.updateCustomerBalanceDisplay());

    const paidInput = document.getElementById('pos-paid-input');
    if (paidInput) paidInput.addEventListener('input', () => this.calculateCartTotals());

    const saveOnlyBtn = document.getElementById('btn-save-only-sale');
    if (saveOnlyBtn) saveOnlyBtn.addEventListener('click', () => this.completeSaleOnly());

    const saveBtn = document.getElementById('btn-complete-sale');
    if (saveBtn) saveBtn.addEventListener('click', () => this.completeSaleAndPrint());

    this.bindTableKeyEvents();
  }

  hideSearchResults() {
    const dropdown = document.getElementById('pos-search-results') || document.getElementById('product-search-results');
    if (dropdown) {
      dropdown.classList.remove('active');
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }
    this.selectedSearchIndex = 0;
  }

  clearSearchInput() {
    const searchInput = document.getElementById('pos-product-search') || document.getElementById('pos-search-input') || document.getElementById('product-search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    this.hideSearchResults();
  }

  bindTableKeyEvents() {
    const tbody = document.getElementById('pos-cart-tbody');
    if (tbody) {
      tbody.onkeydown = (e) => {
        if (e.key === 'Enter') {
          const target = e.target;
          if (target && target.tagName === 'INPUT' && target.classList.contains('pos-cart-input')) {
            e.preventDefault();
            e.stopPropagation();

            const allInputs = Array.from(tbody.querySelectorAll('input.pos-cart-input'));
            const currentIndex = allInputs.indexOf(target);

            if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
              const nextInput = allInputs[currentIndex + 1];
              nextInput.focus();
              if (typeof nextInput.select === 'function') nextInput.select();
            } else {
              this.focusSearchInput();
            }
          }
        }
      };
    }
  }

  focusSearchInput() {
    this.clearSearchInput();
    const searchInput = document.getElementById('pos-product-search') || document.getElementById('pos-search-input') || document.getElementById('product-search-input');
    if (searchInput) {
      setTimeout(() => {
        searchInput.focus();
        if (typeof searchInput.select === 'function') searchInput.select();
      }, 30);
    }
  }

  initView() {
    try {
      this.bindEvents();
      const settings = (storage && typeof storage.getSettings === 'function') ? storage.getSettings() : {};
      const sales = (storage && typeof storage.getSales === 'function') ? storage.getSales() : [];
      const customers = (storage && typeof storage.getCustomers === 'function') ? storage.getCustomers() : [];

      const prefix = settings.invoicePrefix || 'MYU-INV-';
      const nextNum = prefix + String((sales || []).length + 1).padStart(6, '0');

      const invElem = document.getElementById('pos-invoice-num') || document.getElementById('bill-invoice-num');
      if (invElem) invElem.value = nextNum;

      const dtElem = document.getElementById('pos-datetime') || document.getElementById('bill-date');
      if (dtElem) dtElem.value = `${Utils.todayStr()} ${Utils.nowTimeStr()}`;

      const select = document.getElementById('pos-customer-select') || document.getElementById('bill-customer-select');
      if (select) {
        Utils.populateSelect(select, customers || [], 'id', c => `${c.name} ${c.shopName ? '(' + c.shopName + ')' : ''}`, '', '-- Walk-in / Select Customer --');
      }

      this.updateCustomerBalanceDisplay();
      this.calculateCartTotals();
      this.focusSearchInput();
    } catch (e) {
      console.error('Error in BillingModule.initView:', e);
    }
  }

  updateCustomerBalanceDisplay() {
    const custElem = document.getElementById('pos-customer-select');
    const custId = custElem ? custElem.value : '';
    const cust = (storage.getCustomers ? storage.getCustomers() : []).find(c => c.id === custId);
    const settings = storage.getSettings ? storage.getSettings() : {};
    const prevBalElem = document.getElementById('pos-prev-balance');

    if (prevBalElem) {
      prevBalElem.textContent = Utils.formatCurrency(cust ? cust.remainingBalance : 0, settings.currency);
    }
    this.calculateCartTotals();
  }

  handleSearchInput(query) {
    this.selectedSearchIndex = 0;
    this.renderSearchResults((query || '').toLowerCase().trim());
  }

  highlightSearchResult(items, index) {
    items.forEach((item, idx) => {
      if (idx === index) {
        item.classList.add('highlighted');
        item.style.backgroundColor = '#ecfdf5';
        item.style.borderLeft = '4px solid var(--primary, #059669)';
        item.style.outline = '1px solid #10b981';
        if (typeof item.scrollIntoView === 'function') {
          item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        item.classList.remove('highlighted');
        item.style.backgroundColor = '#ffffff';
        item.style.borderLeft = '4px solid transparent';
        item.style.outline = 'none';
      }
    });
  }

  setHoverSearchIndex(idx) {
    this.selectedSearchIndex = idx;
    const dropdown = document.getElementById('pos-search-results') || document.getElementById('product-search-results');
    if (!dropdown) return;
    const items = Array.from(dropdown.querySelectorAll('.search-result-item'));
    this.highlightSearchResult(items, idx);
  }

  renderSearchResults(query) {
    const dropdown = document.getElementById('pos-search-results') || document.getElementById('product-search-results');
    if (!dropdown) return;

    if (!query) {
      this.hideSearchResults();
      return;
    }

    const products = (storage && typeof storage.getProducts === 'function') ? storage.getProducts() : [];
    const filtered = products.filter(p => {
      const q = query.toLowerCase();
      return (p.name || '').toLowerCase().includes(q) ||
        (p.genericName || '').toLowerCase().includes(q) ||
        (p.itemNo || '').toLowerCase().includes(q) ||
        (p.batchNumber || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);
    });

    if (!filtered.length) {
      dropdown.innerHTML = `<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.88rem; background: #ffffff;">No medicine found matching "${query}".</div>`;
      dropdown.classList.add('active');
      dropdown.style.display = 'block';
      this.selectedSearchIndex = -1;
      return;
    }

    if (this.selectedSearchIndex < 0 || this.selectedSearchIndex >= filtered.length) {
      this.selectedSearchIndex = 0;
    }

    let html = '';
    filtered.slice(0, 15).forEach((p, idx) => {
      const isOut = p.availableQty <= 0;
      const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
      const badgeText = isOut ? 'Out of Stock' : (isExpired ? 'EXPIRED' : `${p.availableQty} in stock`);
      const tpDisplay = parseFloat(p.tp || p.tradePrice || p.salePrice || 0);
      const isSelected = idx === this.selectedSearchIndex;
      const activeStyle = isSelected ? 'background-color: #ecfdf5; border-left: 4px solid var(--primary, #059669); outline: 1px solid #10b981;' : 'background-color: #ffffff; border-left: 4px solid transparent; outline: none;';

      html += `
      <div class="search-result-item ${isSelected ? 'highlighted' : ''}" 
           data-index="${idx}" 
           data-product-id="${p.id}"
           onmouseenter="billingModule.setHoverSearchIndex(${idx});"
           onclick="billingModule.addProductToCart('${p.id}');" 
           onmousedown="event.preventDefault(); billingModule.addProductToCart('${p.id}');" 
           style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center; ${activeStyle}">
        <div style="flex: 1;">
          <div style="font-weight: 700; color: var(--text-main, #0f172a); font-size: 0.92rem;">
            ${p.name} <span style="font-size: 0.78rem; color: var(--primary, #059669); font-weight: 600;">(${p.itemNo || '-'})</span>
          </div>
          <div style="font-size: 0.76rem; color: var(--text-muted, #64748b); margin-top: 2px;">
            ${p.genericName ? p.genericName + ' | ' : ''}Company: <strong>${p.company || 'N/A'}</strong> | Batch: ${p.batchNumber || '-'} | Exp: ${p.expiryDate || '-'}
          </div>
        </div>
        <div style="text-align: right; margin-left: 12px;">
          <div style="font-weight: 800; color: var(--primary, #059669); font-size: 0.95rem;">TP: Rs. ${tpDisplay.toFixed(2)}</div>
          ${Utils.badge(badgeText)}
        </div>
      </div>
    `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('active');
    dropdown.style.display = 'block';
  }

  showToast(msg, type = 'info', duration = 3000) {
    const appObj = window.app || (typeof app !== 'undefined' ? app : null);
    if (appObj && typeof appObj.showToast === 'function') {
      appObj.showToast(msg, type, duration);
    }
  }

  addProductToCart(productId) {
    this.clearSearchInput();
    const products = (storage && typeof storage.getProducts === 'function') ? storage.getProducts() : [];
    const prod = products.find(p => p.id === productId);
    if (!prod) {
      this.focusSearchInput();
      return;
    }

    if (prod.expiryDate && new Date(prod.expiryDate) < new Date()) {
      this.showToast(`WARNING: ${prod.name} (Batch: ${prod.batchNumber}) HAS EXPIRED! Do not sell expired medicines.`, 'danger', 5000);
    }

    if (prod.availableQty <= 0) {
      this.showToast(`Cannot add ${prod.name}! Item is Out of Stock (0 available).`, 'danger');
      this.focusSearchInput();
      return;
    }

    const existingIdx = this.cartItems.findIndex(ci => ci.productId === prod.id);
    if (existingIdx !== -1) {
      const newQty = this.cartItems[existingIdx].quantity + 1;
      if (newQty > prod.availableQty) {
        this.showToast(`Insufficient stock! Only ${prod.availableQty} units available for ${prod.name}.`, 'warning');
        this.focusSearchInput();
        return;
      }
      this.cartItems[existingIdx].quantity = newQty;
      this.updateItemTotal(existingIdx);
    } else {
      const tpVal = parseFloat(prod.tp || prod.tradePrice) || (parseFloat(prod.salePrice) || 0);
      const purDiscVal = parseFloat(prod.purchaseDiscount !== undefined ? prod.purchaseDiscount : prod.discount) || (parseFloat(prod.purchaseDiscountPercent) || 0);
      let costVal = (purDiscVal > 0 && tpVal > 0)
        ? Utils.round(tpVal * (1 - purDiscVal / 100), 4)
        : (parseFloat(prod.purchaseCost || prod.purchasePrice || prod.costPrice) || (tpVal * 0.85));
      const defaultTax = parseFloat(prod.advanceTax !== undefined ? prod.advanceTax : (prod.taxPercent !== undefined ? prod.taxPercent : (prod.tax !== undefined ? prod.tax : 0))) || 0;

      const item = {
        productId: prod.id,
        code: prod.itemNo || prod.code || 'MED',
        itemNo: prod.itemNo || 'MED',
        name: prod.name,
        genericName: prod.genericName || '',
        packSize: prod.packSize || prod.pSize || '10x10',
        batchNumber: prod.batchNumber || '-',
        expiryDate: prod.expiryDate || '-',
        maxStock: prod.availableQty,
        quantity: 1,
        bonus: 0,
        price: tpVal,
        tp: tpVal,
        tradePrice: tpVal,
        purchaseCost: costVal,
        purchaseDiscountPercent: purDiscVal,
        discountPercent: 0, // Independent Customer Sale Discount % entry
        extPercent: 0,
        taxPercent: defaultTax,
        advTaxPercent: defaultTax,
        taxAmount: 0,
        advTaxAmount: 0,
        totalAmount: 0
      };
      this.cartItems.push(item);
      this.updateItemTotal(this.cartItems.length - 1);
    }

    this.renderCartTable();
    this.calculateCartTotals();
    this.showToast(`Added ${prod.name} to bill.`, 'success', 2000);

    // Dynamic auto-focus: focus the QTY field of the added item so operator can immediately adjust Qty/Dis/Tax with Enter
    setTimeout(() => {
      const tbody = document.getElementById('pos-cart-tbody');
      if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        const targetRow = rows[existingIdx !== -1 ? existingIdx : rows.length - 1];
        if (targetRow) {
          const qtyInput = targetRow.querySelector('input.pos-cart-input');
          if (qtyInput) {
            qtyInput.focus();
            if (typeof qtyInput.select === 'function') qtyInput.select();
            return;
          }
        }
      }
      this.focusSearchInput();
    }, 40);
  }

  getMarginBadgeHtml(item) {
    const lineNet = item.totalAmount || (item.netUnitPrice ? item.netUnitPrice * (item.quantity || 1) : 0);
    const profit = item.profit !== undefined ? item.profit : 0;
    const unitProfit = item.unitProfit !== undefined ? item.unitProfit : 0;
    const margin = item.marginPercent !== undefined ? item.marginPercent : 0;

    const isPositive = margin >= 0;
    const badgeBg = isPositive ? '#ecfdf5' : '#fef2f2';
    const badgeColor = isPositive ? '#059669' : '#dc2626';
    const badgeBorder = isPositive ? '#a7f3d0' : '#fecaca';
    const icon = isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
    const sign = isPositive ? '+' : '';

    return `
      <div style="text-align: center;">
        <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-weight: 700; border-radius: 4px; padding: 2px 7px; font-size: 0.74rem; display: inline-block;">
          <i class="fa-solid ${icon}"></i> Margin: ${sign}${margin.toFixed(1)}% (${sign}Rs.${profit.toFixed(2)})
        </span>
        <div style="font-size: 0.68rem; color: ${badgeColor}; font-weight: 600; margin-top: 2px;">
          ${sign}Rs.${unitProfit.toFixed(2)}/u | Net: Rs.${lineNet.toFixed(2)}
        </div>
      </div>
    `;
  }

  updateRowDom(index) {
    const tbody = document.getElementById('pos-cart-tbody');
    if (!tbody || !tbody.children[index]) return;
    const row = tbody.children[index];
    const item = this.cartItems[index];
    if (!item) return;

    if (row.cells[8]) row.cells[8].textContent = item.totalQty || item.quantity;
    
    // Net Unit Price Cell (Cell 14)
    if (row.cells[14]) {
      row.cells[14].innerHTML = `
        <div style="font-weight: 700; color: ${item.isLoss ? '#dc2626' : '#0f172a'};">Rs.${(item.netUnitPrice || item.price).toFixed(2)}</div>
        ${item.isLoss ? `<div style="font-size: 0.68rem; color: #dc2626; font-weight: 700;" title="Cost: Rs.${(item.purchaseCost || 0).toFixed(2)}">Cost: Rs.${(item.purchaseCost || 0).toFixed(2)}</div>` : ''}
      `;
    }

    // Total Amount Cell (Cell 15)
    if (row.cells[15]) {
      row.cells[15].innerHTML = `
        <div style="font-weight: 800; color: ${item.isLoss ? '#dc2626' : 'var(--primary)'};">Rs.${item.totalAmount.toFixed(2)}</div>
        ${item.isLoss ? `<div style="font-size: 0.68rem; color: #dc2626; font-weight: 800; margin-top: 1px;" title="Below purchase cost! Max break-even discount: ${item.breakEvenDiscount.toFixed(1)}%"><i class="fa-solid fa-triangle-exclamation"></i> Loss: Rs.${item.unitLoss.toFixed(2)}/u</div>` : ''}
      `;
    }

    // Margin / Profit Cell (Cell 16)
    if (row.cells[16]) {
      row.cells[16].innerHTML = this.getMarginBadgeHtml(item);
    }

    // Row Alert Styling
    if (item.isLoss) {
      row.style.background = '#fff1f2';
      row.style.borderLeft = '3.5px solid #ef4444';
    } else {
      row.style.background = '';
      row.style.borderLeft = '';
    }

    // Discount Inputs Alert Styling
    const discInput = row.querySelector('.pos-disc-input');
    if (discInput) {
      if (item.isLoss) {
        discInput.style.borderColor = '#ef4444';
        discInput.style.background = '#fef2f2';
        discInput.style.color = '#dc2626';
        discInput.style.fontWeight = '800';
      } else {
        discInput.style.borderColor = '';
        discInput.style.background = '';
        discInput.style.color = '';
        discInput.style.fontWeight = '';
      }
    }
  }

  updateCartItemQty(index, qtyStr) {
    const qty = parseInt(qtyStr) || 0;
    const item = this.cartItems[index];
    if (!item) return;

    if (qty > item.maxStock) {
      this.showToast(`Insufficient stock. Only ${item.maxStock} units are available for ${item.name}.`, 'warning', 3000);
      item.quantity = item.maxStock;
    } else {
      item.quantity = Math.max(1, qty);
    }

    this.updateItemTotal(index);
    this.updateRowDom(index);
    this.calculateCartTotals();
  }

  updateCartItemBonus(index, bonusStr) {
    if (!this.cartItems[index]) return;
    this.cartItems[index].bonus = Math.max(0, parseInt(bonusStr) || 0);
    this.updateItemTotal(index);
    this.updateRowDom(index);
    this.calculateCartTotals();
  }

  updateCartItemPrice(index, priceStr) {
    if (!this.cartItems[index]) return;
    this.cartItems[index].price = Math.max(0, parseFloat(priceStr) || 0);
    this.updateItemTotal(index);
    this.updateRowDom(index);
    this.calculateCartTotals();
  }

  updateCartItemDisc(index, discStr) {
    if (!this.cartItems[index]) return;
    this.cartItems[index].discountPercent = Math.max(0, parseFloat(discStr) || 0);
    this.updateItemTotal(index);
    this.updateRowDom(index);
    this.calculateCartTotals();
  }

  updateCartItemExt(index, extStr) {
    if (!this.cartItems[index]) return;
    this.cartItems[index].extPercent = Math.max(0, parseFloat(extStr) || 0);
    this.updateItemTotal(index);
    this.updateRowDom(index);
    this.calculateCartTotals();
  }

  updateCartItemTax(index, taxStr) {
    if (!this.cartItems[index]) return;
    this.cartItems[index].taxPercent = Math.max(0, parseFloat(taxStr) || 0);
    this.updateItemTotal(index);
    this.updateRowDom(index);
    this.calculateCartTotals();
  }

  updateItemTotal(index) {
    const item = this.cartItems[index];
    if (!item) return;

    // Purchase Discount %: derived from TP & Cost
    const tpRef = parseFloat(item.tp || item.price) || 0;
    const purchaseDis = item.purchaseDiscountPercent !== undefined && item.purchaseDiscountPercent !== 0 
      ? parseFloat(item.purchaseDiscountPercent) 
      : (tpRef > 0 && item.purchaseCost ? Utils.round(((tpRef - item.purchaseCost) / tpRef) * 100, 2) : 0);
    const costRef = (purchaseDis > 0 && tpRef > 0) 
      ? Utils.round(tpRef * (1 - purchaseDis / 100), 4) 
      : (parseFloat(item.purchaseCost) || (tpRef * 0.85));
    item.purchaseCost = costRef;
    item.purchaseDiscountPercent = purchaseDis;

    const calc = Utils.calcWholesaleLine(
      item.quantity,
      item.price,
      item.bonus,
      item.discountPercent,
      item.extPercent,
      item.taxPercent,
      item.tp,
      item.purchaseCost,
      item.purchaseDiscountPercent
    );
    item.totalQty = calc.totalQty;
    item.purchaseDiscountPercent = calc.purchaseDiscountPercent;
    item.disAmount = calc.disAmount;
    item.extAmount = calc.extAmount;
    item.taxAmount = calc.taxAmount;
    item.advTaxAmount = calc.taxAmount;
    item.advTaxPercent = item.taxPercent;
    item.grossSubtotal = calc.grossSubtotal;
    item.taxableBase = calc.taxableBase;
    item.netUnitPrice = calc.netUnitPrice;
    item.totalAmount = calc.lineAmount;
    item.cogs = calc.cogs;
    item.marginPercent = calc.marginPercent;
    item.profit = calc.profit;
    item.unitProfit = calc.unitProfit;
    item.realizedMarginPercent = calc.marginPercent;

    // Real-time Below-Cost / Negative Margin Evaluation
    const isBelowCost = (item.marginPercent < 0 || item.profit < 0);
    
    item.isLoss = isBelowCost;
    item.unitLoss = isBelowCost ? Math.abs(calc.unitProfit) : 0;
    item.totalLoss = isBelowCost ? Math.abs(calc.profit) : 0;
    item.breakEvenDiscount = item.purchaseDiscountPercent;
  }

  removeCartItem(index) {
    this.cartItems.splice(index, 1);
    this.renderCartTable();
    this.calculateCartTotals();
  }

  renderCartTable() {
    const tbody = document.getElementById('pos-cart-tbody');
    if (!tbody) return;

    if (!this.cartItems.length) {
      Utils.emptyTable(tbody, 18, '<i class="fa-solid fa-basket-shopping" style="font-size: 2rem; color: #cbd5e1; margin-bottom: 8px; display: block;"></i> No items added to bill yet. Search & add medicines above.');
      return;
    }

    let html = '';
    this.cartItems.forEach((item, idx) => {
      const rowStyle = item.isLoss ? 'background: #fff1f2; border-left: 3.5px solid #ef4444;' : '';
      const discStyle = item.isLoss ? 'border-color: #ef4444; background: #fef2f2; color: #dc2626; font-weight: 800;' : '';

      html += `
      <tr style="font-size: 0.82rem; ${rowStyle}">
        <td style="text-align: center; color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
        <td><span style="font-weight: 700; color: var(--primary);">${item.code || item.itemNo}</span></td>
        <td>
          <div style="font-weight: 700; color: var(--text-main); line-height: 1.2;">${item.name}</div>
          <div style="font-size: 0.68rem; color: ${item.isLoss ? '#dc2626' : 'var(--text-muted)'}; margin-top: 2px;">Cost: Rs.${(item.purchaseCost || 0).toFixed(2)} (Pur. Disc: ${(item.purchaseDiscountPercent || 0).toFixed(1)}%)</div>
        </td>
        <td><span style="color: #475569; font-weight: 600;">${item.packSize || '-'}</span></td>
        <td>
          <div style="font-weight: 600; color: #334155;">${item.batchNumber || '-'}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${item.expiryDate || ''}</div>
        </td>
        <td style="text-align: center;"><span class="badge-status badge-in-stock" style="font-size: 0.75rem; padding: 2px 5px;">${item.maxStock}</span></td>
        <td><input type="number" class="form-control-myu pos-cart-input" value="${item.quantity}" min="1" max="${item.maxStock}" oninput="billingModule.updateCartItemQty(${idx}, this.value)" onchange="billingModule.updateCartItemQty(${idx}, this.value)" style="width: 60px; padding: 4px;"></td>
        <td><input type="number" class="form-control-myu pos-cart-input" value="${item.bonus || 0}" min="0" oninput="billingModule.updateCartItemBonus(${idx}, this.value)" onchange="billingModule.updateCartItemBonus(${idx}, this.value)" style="width: 55px; padding: 4px;"></td>
        <td style="text-align: center; font-weight: 800; color: #0f172a;">${item.totalQty || item.quantity}</td>
        <td style="text-align: right; color: #64748b; font-weight: 600;">Rs.${(item.tp || 0).toFixed(2)}</td>
        <td><input type="number" step="0.01" class="form-control-myu pos-cart-input" value="${item.price}" oninput="billingModule.updateCartItemPrice(${idx}, this.value)" onchange="billingModule.updateCartItemPrice(${idx}, this.value)" style="width: 75px; padding: 4px;"></td>
        <td><input type="number" step="0.1" class="form-control-myu pos-cart-input pos-disc-input" value="${item.discountPercent || 0}" oninput="billingModule.updateCartItemDisc(${idx}, this.value)" onchange="billingModule.updateCartItemDisc(${idx}, this.value)" style="width: 55px; padding: 4px; ${discStyle}"></td>
        <td><input type="number" step="0.1" class="form-control-myu pos-cart-input" value="${item.extPercent || 0}" oninput="billingModule.updateCartItemExt(${idx}, this.value)" onchange="billingModule.updateCartItemExt(${idx}, this.value)" style="width: 55px; padding: 4px;"></td>
        <td><input type="number" step="0.1" class="form-control-myu pos-cart-input" value="${item.taxPercent || 0}" oninput="billingModule.updateCartItemTax(${idx}, this.value)" onchange="billingModule.updateCartItemTax(${idx}, this.value)" style="width: 55px; padding: 4px;"></td>
        <td style="text-align: right;">
          <div style="font-weight: 700; color: ${item.isLoss ? '#dc2626' : '#0f172a'};">Rs.${(item.netUnitPrice || item.price).toFixed(2)}</div>
          ${item.isLoss ? `<div style="font-size: 0.68rem; color: #dc2626; font-weight: 700;">Cost: Rs.${(item.purchaseCost || 0).toFixed(2)}</div>` : ''}
        </td>
        <td style="text-align: right;">
          <div style="font-weight: 800; color: ${item.isLoss ? '#dc2626' : 'var(--primary)'};">Rs.${item.totalAmount.toFixed(2)}</div>
          ${item.isLoss ? `<div style="font-size: 0.68rem; color: #dc2626; font-weight: 800; margin-top: 1px;" title="Below purchase cost. Max discount: ${item.breakEvenDiscount.toFixed(1)}%"><i class="fa-solid fa-triangle-exclamation"></i> Loss: Rs.${item.unitLoss.toFixed(2)}/u</div>` : ''}
        </td>
        <td>
          ${this.getMarginBadgeHtml(item)}
        </td>
        <td style="text-align: center;"><button type="button" class="btn-danger-myu btn-sm-myu" onclick="billingModule.removeCartItem(${idx})" style="padding: 3px 6px; font-size: 0.78rem;" title="Remove Item"><i class="fa-solid fa-xmark"></i></button></td>
      </tr>`;
    });
    tbody.innerHTML = html;
    this.bindTableKeyEvents();
  }

  calculateCartTotals() {
    let grossTotal = 0, totalDiscount = 0, totalTax = 0, totalCOGS = 0, totalProfit = 0;
    this.cartItems.forEach(item => {
      const calc = Utils.calcWholesaleLine(
        item.quantity, item.price, item.bonus,
        item.discountPercent, item.extPercent, item.taxPercent, item.tp, item.purchaseCost, item.purchaseDiscountPercent
      );
      grossTotal += calc.grossSubtotal;
      totalDiscount += (calc.disAmount + calc.extAmount);
      totalTax += (item.taxAmount !== undefined ? item.taxAmount : (item.advTaxAmount !== undefined ? item.advTaxAmount : calc.taxAmount));
      totalCOGS += calc.cogs;
      totalProfit += calc.profit;
    });

    grossTotal = Utils.round(grossTotal, 2);
    totalDiscount = Utils.round(totalDiscount, 2);
    totalTax = Utils.round(totalTax, 2);
    totalProfit = Utils.round(totalProfit, 2);
    const netAmount = Math.max(0, Utils.round(grossTotal - totalDiscount + totalTax, 2));

    const paidInput = document.getElementById('pos-paid-input');
    let paid = parseFloat(paidInput ? paidInput.value : 0) || 0;
    const payMethodElem = document.getElementById('pos-payment-method');
    const payMethod = payMethodElem ? payMethodElem.value : 'Cash';

    if (payMethod === 'Cash' && (!paidInput || paidInput.value === '0' || !paidInput.value)) {
      paid = netAmount;
      if (paidInput) paidInput.value = netAmount;
    }

    paid = Utils.round(paid, 2);
    const balanceDue = Math.max(0, Utils.round(netAmount - paid, 2));
    const settings = storage.getSettings ? storage.getSettings() : {};

    const grossElem = document.getElementById('pos-gross-total') || document.getElementById('billing-gross-total');
    if (grossElem) grossElem.textContent = Utils.formatCurrency(grossTotal, settings.currency);
    const discElem = document.getElementById('pos-total-discount') || document.getElementById('billing-total-discount');
    if (discElem) discElem.textContent = Utils.formatCurrency(totalDiscount, settings.currency);
    const taxElem = document.getElementById('pos-tax-amount') || document.getElementById('billing-tax-charges') || document.getElementById('pos-tax-charges');
    if (taxElem) taxElem.textContent = Utils.formatCurrency(totalTax, settings.currency);
    const netElem = document.getElementById('pos-net-amount') || document.getElementById('billing-net-amount');
    if (netElem) netElem.textContent = Utils.formatCurrency(netAmount, settings.currency);
    const balElem = document.getElementById('pos-balance-due') || document.getElementById('billing-balance-due');
    if (balElem) balElem.textContent = Utils.formatCurrency(balanceDue, settings.currency);

    // Live Estimated Profit Indicator (Margin on Net Payable)
    const profitElem = document.getElementById('pos-estimated-profit');
    if (profitElem) {
      if (totalProfit > 0) {
        profitElem.textContent = `+${Utils.formatCurrency(totalProfit, settings.currency)}`;
        profitElem.style.color = '#10b981';
      } else if (totalProfit === 0) {
        profitElem.textContent = Utils.formatCurrency(0, settings.currency);
        profitElem.style.color = '#f59e0b';
      } else {
        profitElem.textContent = `-${Utils.formatCurrency(Math.abs(totalProfit), settings.currency)} (Loss)`;
        profitElem.style.color = '#ef4444';
      }
    }
  }

  resetBill() {
    this.cartItems = [];
    const searchElem = document.getElementById('pos-product-search');
    if (searchElem) searchElem.value = '';
    const paidElem = document.getElementById('pos-paid-input');
    if (paidElem) paidElem.value = 0;
    this.renderCartTable();
    this.calculateCartTotals();
    this.showToast('Cleared current bill items.', 'info');
  }

  openNegativeMarginModal(lossItems) {
    const tbody = document.getElementById('negative-margin-tbody');
    const totalLossElem = document.getElementById('negative-margin-total-loss');
    if (!tbody) return;

    let html = '';
    let totalLossSum = 0;
    lossItems.forEach((item, idx) => {
      totalLossSum += (item.totalLoss || 0);
      html += `
        <tr style="background: #ffffff; border-bottom: 1px solid #fee2e2;">
          <td style="text-align: center; color: #64748b; font-weight: 700;">${idx + 1}</td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${item.name}</div>
            <div style="font-size: 0.72rem; color: #64748b;">${item.code || item.itemNo}</div>
          </td>
          <td style="text-align: center; font-weight: 700;">${item.totalQty || item.quantity}</td>
          <td style="text-align: right; color: #64748b; font-weight: 600;">Rs.${(item.tp || 0).toFixed(2)}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">Rs.${(item.purchaseCost || 0).toFixed(2)}</td>
          <td style="text-align: center;"><span style="background: #fee2e2; color: #dc2626; padding: 2px 7px; border-radius: 4px; font-weight: 800;">${item.discountPercent || 0}%</span></td>
          <td style="text-align: right; font-weight: 800; color: #dc2626;">Rs.${(item.netUnitPrice || item.price).toFixed(2)}</td>
          <td style="text-align: right; font-weight: 800; color: #dc2626;">-Rs.${(item.unitLoss || 0).toFixed(2)}</td>
          <td style="text-align: right; font-weight: 900; color: #dc2626;">-Rs.${(item.totalLoss || 0).toFixed(2)}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (totalLossElem) {
      totalLossElem.textContent = `-Rs. ${totalLossSum.toFixed(2)}`;
    }

    const appObj = window.app || (typeof app !== 'undefined' ? app : null);
    if (appObj && typeof appObj.openModal === 'function') {
      appObj.openModal('negative-margin-modal');
    }
  }

  cancelAndAdjustDiscounts() {
    const appObj = window.app || (typeof app !== 'undefined' ? app : null);
    if (appObj && typeof appObj.closeModal === 'function') {
      appObj.closeModal('negative-margin-modal');
    }
    const firstLossInput = document.querySelector('#pos-cart-tbody tr[style*="fff1f2"] .pos-disc-input') || document.querySelector('#pos-cart-tbody .pos-disc-input');
    if (firstLossInput) {
      firstLossInput.focus();
      firstLossInput.select();
    }
  }

  confirmAndApproveLossSale() {
    const appObj = window.app || (typeof app !== 'undefined' ? app : null);
    if (appObj && typeof appObj.closeModal === 'function') {
      appObj.closeModal('negative-margin-modal');
    }
    this.completeSale(this.pendingShouldPrint !== undefined ? this.pendingShouldPrint : true, true);
  }

  completeSaleOnly(forceApprove = false) {
    this.completeSale(false, forceApprove);
  }

  completeSaleAndPrint(forceApprove = false) {
    this.completeSale(true, forceApprove);
  }

  completeSale(shouldPrint = true, forceApprove = false) {
    this.pendingShouldPrint = shouldPrint;
    const list = (this.cartItems && this.cartItems.length) ? this.cartItems : [];
    if (!list.length) {
      this.showToast('Cannot complete sale with an empty bill! Add medicines first.', 'warning');
      return;
    }

    // Checkout Guardrail: Scan for Loss-making line items
    const lossItems = this.cartItems.filter(item => item.isLoss || (item.profit !== undefined && item.profit < -0.005));
    if (lossItems.length > 0 && !forceApprove) {
      this.openNegativeMarginModal(lossItems);
      return;
    }

    const custSelect = document.getElementById('pos-customer-select') || document.getElementById('bill-customer-select');
    const custId = custSelect ? custSelect.value : '';
    const customers = storage.getCustomers ? storage.getCustomers() : [];
    const cust = customers.find(c => c.id === custId) || { id: 'CUST-104', name: 'Walk-in Customer', shopName: 'Retail', phone: '', address: 'Mardan', remainingBalance: 0 };

    let grossTotal = 0, totalDiscount = 0, totalTax = 0, totalProfit = 0, totalCOGS = 0;
    const items = list.map(ci => {
      const qty = parseInt(ci.quantity) || 1;
      const bns = parseInt(ci.bonus) || 0;
      const price = parseFloat(ci.price || ci.unitPrice || ci.salePrice) || 0;
      const tp = parseFloat(ci.tp || ci.tradePrice) || (price || 0);
      const purchaseCost = parseFloat(ci.purchaseCost || ci.purchasePrice || ci.costPrice) || (tp * 0.85);
      const purDisc = ci.purchaseDiscountPercent !== undefined 
        ? parseFloat(ci.purchaseDiscountPercent) 
        : (tp > 0 && purchaseCost > 0 && purchaseCost < tp ? Utils.round(((tp - purchaseCost) / tp) * 100, 2) : 0);
      const discPercent = parseFloat(ci.discountPercent) || 0;
      const extPercent = parseFloat(ci.extPercent) || 0;
      const taxPercent = parseFloat(ci.taxPercent) || 0;

      const calc = Utils.calcWholesaleLine(qty, price, bns, discPercent, extPercent, taxPercent, tp, purchaseCost, purDisc);
      grossTotal += calc.grossSubtotal;
      totalDiscount += (calc.disAmount + calc.extAmount);
      totalTax += calc.taxAmount;
      totalCOGS += calc.cogs;
      totalProfit += calc.profit;

      return {
        productId: ci.productId || ci.id,
        itemNo: ci.itemNo || ci.code || 'MED',
        name: ci.name,
        packSize: ci.packSize || '10x10',
        batchNumber: ci.batchNumber || '',
        expiryDate: ci.expiryDate || '',
        quantity: qty,
        bonus: bns,
        totalQty: calc.stockDeduction,
        price: price,
        tp: tp,
        tradePrice: tp,
        purchaseCost: purchaseCost,
        purchaseDiscountPercent: purDisc,
        discountPercent: discPercent,
        discountAmount: calc.disAmount,
        extPercent: extPercent,
        extAmount: calc.extAmount,
        taxPercent: taxPercent,
        taxAmount: calc.taxAmount,
        netUnitPrice: calc.netUnitPrice,
        totalAmount: calc.lineAmount,
        cogs: calc.cogs,
        marginPercent: calc.marginPercent,
        unitProfit: calc.unitProfit,
        itemProfit: calc.profit,
        realizedMarginPercent: calc.marginPercent
      };
    });

    grossTotal = Utils.round(grossTotal);
    totalDiscount = Utils.round(totalDiscount);
    totalTax = Utils.round(totalTax);
    const netAmount = Math.max(0, Utils.round(grossTotal - totalDiscount + totalTax));

    const paidInput = document.getElementById('pos-paid-input') || document.getElementById('bill-paid-amount');
    let paid = parseFloat(paidInput ? paidInput.value : 0) || 0;
    const payMethodElem = document.getElementById('pos-payment-method') || document.getElementById('bill-payment-method');
    const payMethod = payMethodElem ? payMethodElem.value : 'Cash';

    if (payMethod === 'Cash' && paid <= 0) {
      paid = netAmount;
    }

    paid = Utils.round(paid);
    const remaining = Math.max(0, Utils.round(netAmount - paid));
    const invNumElem = document.getElementById('pos-invoice-num') || document.getElementById('bill-invoice-num');
    const invNum = invNumElem ? invNumElem.value : ("MYU-INV-" + String(storage.getSales().length + 1).padStart(6, '0'));

    const savedSale = storage.addSale({
      invoiceNumber: invNum,
      date: Utils.todayStr(),
      time: Utils.nowTimeStr(),
      customerId: cust.id,
      customerName: cust.name,
      customerShop: cust.shopName || '',
      customerPhone: cust.phone || '',
      customerAddress: cust.address || '',
      paymentMethod: payMethod,
      items: items,
      grossTotal: grossTotal,
      totalDiscount: totalDiscount,
      tax: totalTax,
      previousBalance: cust.remainingBalance || 0,
      netAmount: netAmount,
      paidAmount: paid,
      remainingBalance: remaining
    });

    if (shouldPrint) {
      this.showToast(`Invoice ${savedSale.invoiceNumber} saved! Printing...`, 'success', 2500);
      this.triggerPrintInvoice(savedSale);
    } else {
      this.showToast(`Invoice ${savedSale.invoiceNumber} saved successfully (Inventory updated)!`, 'success', 3000);
    }

    this.resetBill();
    if (window.app && typeof window.app.refreshCurrentView === 'function') {
      window.app.refreshCurrentView();
    }
  }

  triggerPrintInvoice(sale) {
    if (!sale) return;
    const container = document.getElementById('printable-invoice');
    if (!container) return;
    const settings = storage.getSettings ? storage.getSettings() : {};

    let html = '';
    if (window.salesModule && typeof window.salesModule.buildInvoiceTemplate === 'function') {
      html = window.salesModule.buildInvoiceTemplate(sale, settings, true);
    } else if (typeof SalesModule !== 'undefined' && SalesModule.prototype.buildInvoiceTemplate) {
      html = SalesModule.prototype.buildInvoiceTemplate(sale, settings, true);
    }

    if (html) {
      container.innerHTML = html;
      setTimeout(() => {
        window.print();
      }, 200);
    }
  }
}

if (typeof global !== 'undefined') {
  global.BillingModule = BillingModule;
}
if (typeof window !== 'undefined') {
  window.BillingModule = BillingModule;
  window.billingModule = window.billingModule || new BillingModule();
}
