/* ==================== PRODUCTS & INVENTORY MODULE ==================== */
class ProductsModule {
  constructor() {
    this.stagedPurchaseItems = [];
    this.bindEvents();
  }

  bindEvents() {
    const search = document.getElementById('prod-search-input');
    const cat = document.getElementById('prod-category-filter');
    if (search) search.addEventListener('input', () => this.renderProducts());
    if (cat) cat.addEventListener('change', () => this.renderProducts());

    const invSearch = document.getElementById('inv-search-input');
    const invStatus = document.getElementById('inv-status-filter');
    if (invSearch) invSearch.addEventListener('input', () => this.renderInventory());
    if (invStatus) invStatus.addEventListener('change', () => this.renderInventory());

    const expFilter = document.getElementById('expiry-filter-select');
    if (expFilter) expFilter.addEventListener('change', () => this.renderExpiry());

    const prodForm = document.getElementById('product-form');
    if (prodForm) prodForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('prod-edit-id')?.value;
      if (editId) {
        this.saveSingleProductEdit();
      } else {
        this.stageCurrentItem();
      }
    });
  }

  renderProducts() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    const products = storage.getProducts();
    const settings = storage.getSettings();

    const query = (document.getElementById('prod-search-input').value || '').toLowerCase().trim();
    const category = document.getElementById('prod-category-filter').value || '';

    const filtered = products.filter(p => {
      const matchQuery = !query || p.name.toLowerCase().includes(query) || (p.genericName || '').toLowerCase().includes(query) || p.itemNo.toLowerCase().includes(query) || (p.company || '').toLowerCase().includes(query) || (p.batchNumber || '').toLowerCase().includes(query);
      return matchQuery && (!category || p.category === category);
    });

    if (!filtered.length) { Utils.emptyTable(tbody, 11, 'No products found matching search criteria.'); return; }

    let html = '';
    filtered.forEach(p => {
      const isOut = p.availableQty <= 0;
      const isLow = !isOut && p.availableQty <= (p.minStockLevel || settings.minStockAlert);
      const statusText = isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock');

      html += `
            <tr>
              <td><span style="font-weight: 700; color: var(--primary);">${p.itemNo}</span></td>
              <td><div style="font-weight: 700;">${p.name}</div><div style="font-size: 0.75rem; color: var(--text-muted);">${p.genericName || 'N/A'}</div></td>
              <td>${p.company || '-'}</td>
              <td><span style="background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${p.category}</span></td>
              <td><div style="font-size: 0.8rem; font-weight: 600;">${p.batchNumber || '-'}</div><div style="font-size: 0.72rem; color: var(--text-muted);">${p.expiryDate || 'No Expiry'}</div></td>
              <td style="font-weight: 600;">${Utils.formatCurrency(p.tradePrice !== undefined ? p.tradePrice : p.tp, settings.currency)}</td>
              <td style="font-weight: 700; color: var(--primary);">${Utils.formatCurrency(p.retailPrice !== undefined ? p.retailPrice : (p.tp ? (p.tp / 0.85) : p.salePrice), settings.currency)}</td>
              <td><span style="font-weight: 800; font-size: 0.95rem;">${p.availableQty}</span><span style="font-size: 0.7rem; color: var(--text-muted);"> (Min: ${p.minStockLevel || 10})</span></td>
              <td>${p.rackNumber || '-'}</td>
              <td>${Utils.badge(statusText)}</td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="btn-secondary-myu btn-sm-myu" onclick="productsModule.openEditModal('${p.id}')" title="Edit Product"><i class="fa-solid fa-pen-to-square"></i></button>
                  <button class="btn-danger-myu btn-sm-myu" onclick="productsModule.deleteProduct('${p.id}')" title="Delete Product"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
    });
    tbody.innerHTML = html;
  }

  populateCompanyDropdown(selectedCompany = '') {
    const select = document.getElementById('pm-company');
    if (!select) return;
    const companies = storage.getCompanies();
    Utils.populateSelect(select, companies, 'name', 'name', selectedCompany, '-- Select Company / Supplier --');
  }

  initPricingCalculator() {
    const rpInput = document.getElementById('pm-retail-price');
    const tpInput = document.getElementById('pm-tp');
    const discInput = document.getElementById('pm-discount-percent');
    const taxInput = document.getElementById('pm-advance-tax');
    const costInput = document.getElementById('pm-purchase-cost');
    const purQtyInput = document.getElementById('pm-purchased-qty');
    const totalNetInput = document.getElementById('pm-total-net');

    const calculateUnitCost = (tp, disPercent) => {
      if (tp <= 0) return 0;
      const unitDiscount = (tp * disPercent) / 100;
      return tp - unitDiscount;
    };

    const updateTotalNet = () => {
      const qty = parseInt(purQtyInput ? purQtyInput.value : 0) || 0;
      const tp = parseFloat(tpInput ? tpInput.value : 0) || 0;
      const dis = (discInput && discInput.value !== '' && !isNaN(parseFloat(discInput.value))) ? parseFloat(discInput.value) : 25;
      const tax = (taxInput && taxInput.value !== '' && !isNaN(parseFloat(taxInput.value))) ? parseFloat(taxInput.value) : 0;

      const unitCost = calculateUnitCost(tp, dis);
      const unitTax = (unitCost * tax) / 100;
      const total = Utils.round(qty * (unitCost + unitTax), 2);
      if (totalNetInput) {
        totalNetInput.value = (qty > 0 && unitCost > 0) ? total.toFixed(2) : '0.00';
      }
    };

    const updateTpAndCostFromMrp = () => {
      const mrp = parseFloat(rpInput.value) || 0;
      if (mrp > 0) {
        const tp = Utils.round(mrp * 0.85, 2);
        tpInput.value = tp.toFixed(2);
        const dis = (discInput && discInput.value !== '' && !isNaN(parseFloat(discInput.value))) ? parseFloat(discInput.value) : 25;
        const cost = calculateUnitCost(tp, dis);
        costInput.value = Utils.round(cost, 2).toFixed(2);
      } else if (!rpInput.value) {
        tpInput.value = '';
        costInput.value = '';
      }
      updateTotalNet();
    };

    const updateCostFromTpAndDisc = () => {
      const tp = parseFloat(tpInput.value) || 0;
      const dis = (discInput && discInput.value !== '' && !isNaN(parseFloat(discInput.value))) ? parseFloat(discInput.value) : 25;
      if (tp > 0) {
        const cost = calculateUnitCost(tp, dis);
        costInput.value = Utils.round(cost, 2).toFixed(2);
      } else if (!tpInput.value) {
        costInput.value = '';
      }
      updateTotalNet();
    };

    const updateDiscFromCost = () => {
      const tp = parseFloat(tpInput.value) || 0;
      const cost = parseFloat(costInput.value) || 0;
      if (tp > 0 && cost >= 0) {
        const unitDiscount = tp - cost;
        const dis = Utils.round((unitDiscount / tp) * 100, 2);
        if (discInput) discInput.value = dis.toFixed(1);
      }
      updateTotalNet();
    };

    if (rpInput) rpInput.oninput = updateTpAndCostFromMrp;
    if (tpInput) tpInput.oninput = updateCostFromTpAndDisc;
    if (discInput) discInput.oninput = updateCostFromTpAndDisc;
    if (taxInput) taxInput.oninput = updateTotalNet;
    if (costInput) costInput.oninput = updateDiscFromCost;
    if (purQtyInput) {
      purQtyInput.oninput = updateTotalNet;
      purQtyInput.onchange = updateTotalNet;
    }

    updateTotalNet();
  }

  openAddModal() {
    const titleElem = document.getElementById('prod-modal-title');
    if (titleElem) titleElem.textContent = 'Add New Product & Purchase Invoicing';

    const form = document.getElementById('product-form');
    if (form) form.reset();

    document.getElementById('prod-edit-id').value = '';
    this.populateCompanyDropdown();

    const invDate = document.getElementById('pm-inv-date');
    if (invDate) invDate.value = Utils.todayStr();

    const invRef = document.getElementById('pm-inv-ref');
    if (invRef) invRef.value = '';

    const invPayType = document.getElementById('pm-inv-paytype');
    if (invPayType) invPayType.value = 'Cash';

    this.stagedPurchaseItems = [];

    document.getElementById('pm-item-no').value = 'MED-' + (1000 + storage.getProducts().length + 1);

    const discElem = document.getElementById('pm-discount-percent');
    if (discElem) discElem.value = '25';

    const taxElem = document.getElementById('pm-advance-tax');
    if (taxElem) taxElem.value = '0';

    const defPriceElem = document.getElementById('pm-default-price');
    if (defPriceElem) defPriceElem.value = '';

    const purQtyElem = document.getElementById('pm-purchased-qty');
    if (purQtyElem) purQtyElem.value = '0';

    const bonusElem = document.getElementById('pm-bonus-qty');
    if (bonusElem) bonusElem.value = '0';

    const totalNetElem = document.getElementById('pm-total-net');
    if (totalNetElem) totalNetElem.value = '0.00';

    const paidElem = document.getElementById('pm-pay-paid-amount');
    if (paidElem) paidElem.value = '0';

    // Mode visibility
    const addActions = document.getElementById('pm-add-mode-actions');
    const editActions = document.getElementById('pm-edit-mode-actions');
    const stagedSection = document.getElementById('pm-staged-invoice-section');
    const paymentSection = document.getElementById('pm-payment-settlement-section');
    const addItemCol = document.getElementById('pm-add-item-col');

    if (addActions) addActions.style.display = 'flex';
    if (editActions) editActions.style.display = 'none';
    if (stagedSection) stagedSection.style.display = 'block';
    if (paymentSection) paymentSection.style.display = 'block';
    if (addItemCol) addItemCol.style.display = 'block';

    this.renderStagedItemsTable();
    this.calculatePaymentSettlement();
    this.initPricingCalculator();
    app.openModal('product-modal');
  }

  openEditModal(id) {
    const p = storage.getProducts().find(prod => prod.id === id);
    if (!p) return;

    const titleElem = document.getElementById('prod-modal-title');
    if (titleElem) titleElem.textContent = 'Edit Product Details';

    document.getElementById('prod-edit-id').value = p.id;
    document.getElementById('pm-item-no').value = p.itemNo;
    document.getElementById('pm-name').value = p.name;
    document.getElementById('pm-generic').value = p.genericName || '';
    this.populateCompanyDropdown(p.company || '');
    document.getElementById('pm-category').value = p.category || 'Medicines';
    document.getElementById('pm-batch').value = p.batchNumber || '';
    document.getElementById('pm-expiry').value = p.expiryDate || '';

    const tpVal = parseFloat(p.tradePrice !== undefined ? p.tradePrice : (p.tp || 0)) || 0;
    const retVal = parseFloat(p.retailPrice !== undefined ? p.retailPrice : (tpVal ? (tpVal / 0.85) : (p.salePrice || 0))) || 0;
    const costVal = parseFloat(p.purchaseCost !== undefined ? p.purchaseCost : (p.purchasePrice || p.costPrice || (tpVal ? (tpVal * 0.75) : 0))) || 0;
    const disVal = p.discount !== undefined ? parseFloat(p.discount) : (tpVal > 0 ? Utils.round(((tpVal - costVal) / tpVal) * 100, 2) : 25);
    const taxVal = p.advanceTax !== undefined ? parseFloat(p.advanceTax) : 0;

    const rpElem = document.getElementById('pm-retail-price');
    if (rpElem) rpElem.value = retVal > 0 ? retVal.toFixed(2) : '';

    const tpElem = document.getElementById('pm-tp');
    if (tpElem) tpElem.value = tpVal > 0 ? tpVal.toFixed(2) : '';

    const discElem = document.getElementById('pm-discount-percent');
    if (discElem) discElem.value = !isNaN(disVal) ? disVal : 25;

    const taxElem = document.getElementById('pm-advance-tax');
    if (taxElem) taxElem.value = !isNaN(taxVal) ? taxVal : 0;

    const defPriceElem = document.getElementById('pm-default-price');
    if (defPriceElem) defPriceElem.value = (p.defaultPrice !== undefined && p.defaultPrice !== null && p.defaultPrice !== '') ? p.defaultPrice : '';

    const costElem = document.getElementById('pm-purchase-cost');
    if (costElem) costElem.value = costVal > 0 ? costVal.toFixed(2) : '';

    document.getElementById('pm-purchased-qty').value = p.purchasedQty || p.availableQty || 0;
    const editBonusElem = document.getElementById('pm-bonus-qty');
    if (editBonusElem) editBonusElem.value = p.bonusQty || p.bonus || 0;
    document.getElementById('pm-rack').value = p.rackNumber || '';

    // Mode visibility
    const addActions = document.getElementById('pm-add-mode-actions');
    const editActions = document.getElementById('pm-edit-mode-actions');
    const stagedSection = document.getElementById('pm-staged-invoice-section');
    const paymentSection = document.getElementById('pm-payment-settlement-section');
    const addItemCol = document.getElementById('pm-add-item-col');

    if (addActions) addActions.style.display = 'none';
    if (editActions) editActions.style.display = 'flex';
    if (stagedSection) stagedSection.style.display = 'none';
    if (paymentSection) paymentSection.style.display = 'none';
    if (addItemCol) addItemCol.style.display = 'none';

    this.initPricingCalculator();
    app.openModal('product-modal');
  }

  stageCurrentItem() {
    const itemNoElem = document.getElementById('pm-item-no');
    const nameElem = document.getElementById('pm-name');
    let itemNo = (itemNoElem ? itemNoElem.value : '').trim();
    const name = (nameElem ? nameElem.value : '').trim();

    if (!name) {
      app.showToast('Please enter Product Name.', 'warning');
      if (nameElem) nameElem.focus();
      return;
    }

    if (!itemNo) {
      itemNo = 'MED-' + (1000 + storage.getProducts().length + 1);
    }

    const retailPriceVal = parseFloat(document.getElementById('pm-retail-price')?.value) || 0;
    let tpVal = parseFloat(document.getElementById('pm-tp')?.value) || (retailPriceVal ? Utils.round(retailPriceVal * 0.85, 2) : 0);

    if (tpVal <= 0 && retailPriceVal <= 0) {
      app.showToast('Please enter Trade Price (TP) or Retail Price (MRP).', 'warning');
      document.getElementById('pm-tp')?.focus();
      return;
    }
    if (tpVal <= 0 && retailPriceVal > 0) {
      tpVal = Utils.round(retailPriceVal * 0.85, 2);
    }

    const qty = parseInt(document.getElementById('pm-purchased-qty')?.value) || 0;
    const bonusQty = parseInt(document.getElementById('pm-bonus-qty')?.value) || 0;
    const discVal = parseFloat(document.getElementById('pm-discount-percent')?.value) || 0;
    const advTaxVal = parseFloat(document.getElementById('pm-advance-tax')?.value) || 0;
    const defaultPriceVal = parseFloat(document.getElementById('pm-default-price')?.value);
    const validDefaultPrice = (!isNaN(defaultPriceVal) && defaultPriceVal > 0) ? defaultPriceVal : null;

    const unitDiscount = (tpVal * discVal) / 100;
    const unroundedUnitCost = tpVal - unitDiscount;
    const advTaxAmount = (unroundedUnitCost * advTaxVal) / 100;
    const manualCost = parseFloat(document.getElementById('pm-purchase-cost')?.value);
    const finalUnitCost = !isNaN(manualCost) && manualCost > 0 ? manualCost : unroundedUnitCost;
    const lineNet = Utils.round(qty * (finalUnitCost + advTaxAmount), 2);

    // 1. Permanent Master Product Save (with duplicate check handled by storage.addProduct)
    const masterData = {
      itemNo: itemNo,
      name: name,
      genericName: document.getElementById('pm-generic')?.value || '',
      company: document.getElementById('pm-company')?.value || '',
      category: document.getElementById('pm-category')?.value || 'Medicines',
      batchNumber: document.getElementById('pm-batch')?.value || '',
      expiryDate: document.getElementById('pm-expiry')?.value || '',
      rackNumber: document.getElementById('pm-rack')?.value || '',
      retailPrice: retailPriceVal > 0 ? retailPriceVal : Utils.round(tpVal / 0.85, 2),
      tradePrice: tpVal,
      tp: tpVal,
      salePrice: tpVal,
      defaultPrice: validDefaultPrice,
      discount: discVal,
      purchaseDiscount: discVal,
      advanceTax: advTaxVal,
      purchaseCost: finalUnitCost,
      purchasePrice: finalUnitCost,
      costPrice: finalUnitCost,
      minStockLevel: 10,
      availableQty: qty > 0 ? (qty + bonusQty) : 0,
      purchasedQty: qty,
      bonusQty: bonusQty
    };

    let savedProduct = null;
    try {
      savedProduct = storage.addProduct(masterData);
    } catch (err) {
      console.error('Failed to save product:', err);
      app.showToast('Error saving product to database: ' + (err.message || err), 'danger');
      return;
    }

    if (!savedProduct || !savedProduct.id) {
      app.showToast('Could not save product record.', 'danger');
      return;
    }

    // 2. Refresh active UI views so the product immediately appears in Products List, Reports, etc.
    this.renderProducts();
    this.renderInventory();
    if (typeof purchasesModule !== 'undefined' && typeof purchasesModule.renderPurchaseLineItemsTable === 'function') {
      purchasesModule.renderPurchaseLineItemsTable();
    }
    if (window.app && typeof window.app.updateHeaderCounters === 'function') {
      window.app.updateHeaderCounters();
    }

    // 3. If quantity > 0, stage the item into the purchase invoice table
    if (qty > 0) {
      const stagedItem = {
        id: Utils.uid('STG'),
        productId: savedProduct.id,
        itemNo: savedProduct.itemNo,
        name: savedProduct.name,
        genericName: savedProduct.genericName,
        company: savedProduct.company,
        category: savedProduct.category,
        batchNumber: document.getElementById('pm-batch')?.value || '-',
        expiryDate: document.getElementById('pm-expiry')?.value || '-',
        rackNumber: savedProduct.rackNumber || '',
        retailPrice: savedProduct.retailPrice,
        tradePrice: savedProduct.tradePrice,
        tp: savedProduct.tp,
        defaultPrice: validDefaultPrice,
        quantity: qty,
        bonus: bonusQty,
        bonusQty: bonusQty,
        purchasedQty: qty,
        availableQty: qty,
        minStockLevel: 10,
        discountPercent: discVal,
        advanceTaxPercent: advTaxVal,
        unitDiscount: Utils.round(unitDiscount, 4),
        unitTax: Utils.round(advTaxAmount, 4),
        unitCost: Utils.round(finalUnitCost, 2),
        unroundedUnitCost: finalUnitCost,
        gross: Utils.round(qty * tpVal, 2),
        discountAmount: Utils.round(qty * unitDiscount, 2),
        taxAmount: Utils.round(qty * advTaxAmount, 2),
        lineNet: lineNet
      };

      if (!this.stagedPurchaseItems) this.stagedPurchaseItems = [];
      this.stagedPurchaseItems.push(stagedItem);
      app.showToast(`Product "${savedProduct.name}" saved permanently & added to invoice!`, 'success');
    } else {
      app.showToast(`Product "${savedProduct.name}" saved permanently to Products List!`, 'success');
    }

    // Reset line fields for next item
    document.getElementById('pm-name').value = '';
    document.getElementById('pm-generic').value = '';
    document.getElementById('pm-batch').value = '';
    document.getElementById('pm-expiry').value = '';
    document.getElementById('pm-retail-price').value = '';
    document.getElementById('pm-tp').value = '';
    document.getElementById('pm-purchased-qty').value = '0';
    const bonusResetElem = document.getElementById('pm-bonus-qty');
    if (bonusResetElem) bonusResetElem.value = '0';
    document.getElementById('pm-discount-percent').value = '25';
    document.getElementById('pm-advance-tax').value = '0';
    const defPriceReset = document.getElementById('pm-default-price');
    if (defPriceReset) defPriceReset.value = '';
    document.getElementById('pm-purchase-cost').value = '';
    document.getElementById('pm-total-net').value = '0.00';
    document.getElementById('pm-rack').value = '';

    // Generate next item code
    const nextSeq = 1000 + storage.getProducts().length + this.stagedPurchaseItems.length + 1;
    document.getElementById('pm-item-no').value = 'MED-' + nextSeq;

    this.renderStagedItemsTable();
    this.calculatePaymentSettlement();
    this.initPricingCalculator();

    setTimeout(() => {
      const nInput = document.getElementById('pm-name');
      if (nInput) nInput.focus();
    }, 50);
  }

  removeStagedItem(index) {
    if (!this.stagedPurchaseItems) return;
    this.stagedPurchaseItems.splice(index, 1);
    this.renderStagedItemsTable();
    this.calculatePaymentSettlement();
    app.showToast('Line item removed.', 'info');
  }

  clearStagedItems() {
    if (!this.stagedPurchaseItems || !this.stagedPurchaseItems.length) return;
    this.stagedPurchaseItems = [];
    this.renderStagedItemsTable();
    this.calculatePaymentSettlement();
    app.showToast('Invoice line items cleared.', 'info');
  }

  renderStagedItemsTable() {
    const tbody = document.getElementById('pm-staged-table-body');
    if (!tbody) return;

    const items = this.stagedPurchaseItems || [];
    const badge = document.getElementById('pm-staged-count-badge');
    if (badge) badge.textContent = `${items.length} Item${items.length === 1 ? '' : 's'}`;

    let totalQty = 0;
    let totalGross = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    if (!items.length) {
      tbody.innerHTML = `
              <tr>
                <td colspan="14" style="text-align: center; color: #94a3b8; padding: 20px; font-weight: 500;">
                  <i class="fa-solid fa-cart-arrow-down" style="font-size: 1.2rem; margin-bottom: 6px; display: block; color: #cbd5e1;"></i>
                  No line items staged. Fill product specifications above and click <strong>+ Add Item</strong>.
                </td>
              </tr>
            `;
    } else {
      let html = '';
      items.forEach((item, idx) => {
        totalQty += item.quantity;
        totalGross += item.gross;
        totalDiscount += item.discountAmount;
        totalTax += item.taxAmount;
        grandTotal += item.lineNet;

        html += `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.76rem;">
                  <td style="padding: 5px 6px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
                  <td style="padding: 5px 6px; font-weight: 700; color: #0284c7; white-space: nowrap;">${item.itemNo}</td>
                  <td style="padding: 5px 6px; font-weight: 700; color: #0f172a;">${item.name}</td>
                  <td style="padding: 5px 6px; color: #475569; white-space: nowrap;">${item.batchNumber || '-'}</td>
                  <td style="padding: 5px 6px; color: #475569; white-space: nowrap;">${item.expiryDate || '-'}</td>
                  <td style="padding: 5px 6px; text-align: right; color: #059669; font-weight: 600; white-space: nowrap;">${item.retailPrice > 0 ? item.retailPrice.toFixed(2) : '-'}</td>
                  <td style="padding: 5px 6px; text-align: right; font-weight: 600; white-space: nowrap;">${item.tp.toFixed(2)}</td>
                  <td style="padding: 5px 6px; text-align: center; font-weight: 800; color: #0284c7;">${item.quantity}</td>
                  <td style="padding: 5px 6px; text-align: center; font-weight: 800; color: #8b5cf6;">${item.bonus || 0}</td>
                  <td style="padding: 5px 6px; text-align: center; color: #d97706; font-weight: 700;">${item.discountPercent > 0 ? item.discountPercent + '%' : '-'}</td>
                  <td style="padding: 5px 6px; text-align: center; color: #6366f1; font-weight: 700;">${item.advanceTaxPercent > 0 ? item.advanceTaxPercent + '%' : '0%'}</td>
                  <td style="padding: 5px 6px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">${item.defaultPrice > 0 ? item.defaultPrice.toFixed(2) : '-'}</td>
                  <td style="padding: 5px 6px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">${item.unitCost.toFixed(2)}</td>
                  <td style="padding: 5px 6px; text-align: right; font-weight: 800; color: #047857; white-space: nowrap;">${item.lineNet.toFixed(2)}</td>
                  <td style="padding: 5px 6px; text-align: center;">
                    <button type="button" class="btn-danger-myu btn-sm-myu" onclick="productsModule.removeStagedItem(${idx})" style="padding: 2px 6px; font-size: 0.72rem;" title="Remove Line">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `;
      });
      tbody.innerHTML = html;
    }

    const qElem = document.getElementById('pm-summary-total-qty');
    const gElem = document.getElementById('pm-summary-gross');
    const dElem = document.getElementById('pm-summary-discount');
    const tElem = document.getElementById('pm-summary-tax');
    const gtElem = document.getElementById('pm-summary-grand-total');

    if (qElem) qElem.textContent = String(totalQty);
    if (gElem) gElem.textContent = 'Rs. ' + totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (dElem) dElem.textContent = 'Rs. ' + totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (tElem) tElem.textContent = 'Rs. ' + totalTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (gtElem) gtElem.textContent = 'Rs. ' + grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  calculatePaymentSettlement() {
    const items = this.stagedPurchaseItems || [];
    let grandTotal = 0;
    items.forEach(item => { grandTotal += item.lineNet; });
    grandTotal = Utils.round(grandTotal, 2);

    const paidInput = document.getElementById('pm-pay-paid-amount');
    const paidAmount = parseFloat(paidInput ? paidInput.value : 0) || 0;
    const remaining = Math.max(0, Utils.round(grandTotal - paidAmount, 2));

    const grandTotalDisplay = document.getElementById('pm-pay-grand-total');
    if (grandTotalDisplay) {
      grandTotalDisplay.textContent = 'Rs. ' + grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const remainingDisplay = document.getElementById('pm-pay-remaining-balance');
    if (remainingDisplay) {
      remainingDisplay.textContent = 'Rs. ' + remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const card = document.getElementById('pm-pay-remaining-card');
    const badge = document.getElementById('pm-pay-status-badge');

    if (grandTotal > 0 && remaining <= 0) {
      // Fully Paid
      if (card) { card.style.background = '#ecfdf5'; card.style.borderColor = '#a7f3d0'; }
      if (remainingDisplay) { remainingDisplay.style.color = '#059669'; }
      if (badge) {
        badge.textContent = 'Fully Paid';
        badge.style.background = '#10b981';
        badge.style.color = '#ffffff';
      }
    } else if (paidAmount > 0 && remaining > 0) {
      // Partially Paid
      if (card) { card.style.background = '#fffbeb'; card.style.borderColor = '#fde68a'; }
      if (remainingDisplay) { remainingDisplay.style.color = '#d97706'; }
      if (badge) {
        badge.textContent = 'Partially Paid';
        badge.style.background = '#f59e0b';
        badge.style.color = '#ffffff';
      }
    } else {
      // Unpaid / Credit
      if (card) { card.style.background = '#fef2f2'; card.style.borderColor = '#fecaca'; }
      if (remainingDisplay) { remainingDisplay.style.color = '#ef4444'; }
      if (badge) {
        badge.textContent = 'Unpaid / Credit';
        badge.style.background = '#ef4444';
        badge.style.color = '#ffffff';
      }
    }
  }

  setPaymentFull() {
    const items = this.stagedPurchaseItems || [];
    let grandTotal = 0;
    items.forEach(item => { grandTotal += item.lineNet; });
    grandTotal = Utils.round(grandTotal, 2);

    const paidInput = document.getElementById('pm-pay-paid-amount');
    if (paidInput) paidInput.value = grandTotal.toFixed(2);

    const payType = document.getElementById('pm-inv-paytype');
    if (payType) payType.value = 'Cash';

    this.calculatePaymentSettlement();
  }

  setPaymentUnpaid() {
    const paidInput = document.getElementById('pm-pay-paid-amount');
    if (paidInput) paidInput.value = '0';

    const payType = document.getElementById('pm-inv-paytype');
    if (payType) payType.value = 'Credit / Payable';

    this.calculatePaymentSettlement();
  }

  savePurchaseInvoice(andPrint = false) {
    // If no staged items, check if current active input has an item to stage automatically
    if (!this.stagedPurchaseItems || this.stagedPurchaseItems.length === 0) {
      const name = (document.getElementById('pm-name')?.value || '').trim();
      const tp = parseFloat(document.getElementById('pm-tp')?.value) || 0;
      const mrp = parseFloat(document.getElementById('pm-retail-price')?.value) || 0;
      const qty = parseInt(document.getElementById('pm-purchased-qty')?.value) || 0;

      if (name && (tp > 0 || mrp > 0) && qty > 0) {
        this.stageCurrentItem();
      } else {
        app.showToast('Please add at least one line item to the purchase invoice.', 'warning');
        return;
      }
    }

    const items = this.stagedPurchaseItems;
    if (!items || !items.length) {
      app.showToast('Purchase invoice is empty.', 'warning');
      return;
    }

    const companySelect = document.getElementById('pm-company');
    const companyName = companySelect ? companySelect.value : '';
    const companies = storage.getCompanies();
    const comp = companies.find(c => c.name === companyName) || null;

    const invRef = (document.getElementById('pm-inv-ref')?.value || '').trim();
    const invDate = document.getElementById('pm-inv-date')?.value || Utils.todayStr();
    const payType = document.getElementById('pm-inv-paytype')?.value || 'Cash';

    let totalGross = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    // 1. Link staged items with permanent product records and sync latest metadata
    const existingProducts = storage.getProducts();

    items.forEach(staged => {
      totalGross += staged.gross;
      totalDiscount += staged.discountAmount;
      totalTax += staged.taxAmount;
      grandTotal += staged.lineNet;

      let p = existingProducts.find(prod => 
        (staged.productId && prod.id === staged.productId) ||
        (staged.itemNo && prod.itemNo && prod.itemNo.toLowerCase() === staged.itemNo.toLowerCase()) ||
        (staged.name && prod.name && prod.name.toLowerCase() === staged.name.toLowerCase())
      );

      if (p) {
        staged.productId = p.id;
        if (staged.batchNumber && staged.batchNumber !== '-') p.batchNumber = staged.batchNumber;
        if (staged.expiryDate && staged.expiryDate !== '-') p.expiryDate = staged.expiryDate;
        p.tp = staged.tradePrice || p.tp;
        p.tradePrice = staged.tradePrice || p.tradePrice;
        p.retailPrice = staged.retailPrice || p.retailPrice;
        if (staged.defaultPrice !== undefined && staged.defaultPrice !== null) {
          p.defaultPrice = staged.defaultPrice;
        }
        if (staged.discountPercent !== undefined) {
          p.discount = staged.discountPercent;
          p.purchaseDiscount = staged.discountPercent;
        }
        if (staged.advanceTaxPercent !== undefined) {
          p.advanceTax = staged.advanceTaxPercent;
        }
        p.purchaseCost = staged.unitCost || p.purchaseCost;
        p.salePrice = staged.tradePrice || p.salePrice;
        storage.updateProduct(p.id, p);
      } else {
        const created = storage.addProduct({
          itemNo: staged.itemNo,
          name: staged.name,
          genericName: staged.genericName,
          company: staged.company || companyName,
          category: staged.category,
          batchNumber: staged.batchNumber !== '-' ? staged.batchNumber : '',
          expiryDate: staged.expiryDate !== '-' ? staged.expiryDate : '',
          tp: staged.tradePrice,
          tradePrice: staged.tradePrice,
          salePrice: staged.tradePrice,
          defaultPrice: staged.defaultPrice || null,
          retailPrice: staged.retailPrice,
          discount: staged.discountPercent,
          purchaseDiscount: staged.discountPercent,
          advanceTax: staged.advanceTaxPercent,
          purchaseCost: staged.unitCost,
          purchasePrice: staged.unitCost,
          costPrice: staged.unitCost,
          purchasedQty: 0,
          availableQty: 0,
          minStockLevel: staged.minStockLevel || 10,
          rackNumber: staged.rackNumber
        });
        if (created) staged.productId = created.id;
      }
    });

    // 2. Format Line Items for Unified Purchase Invoice Record
    const formattedItems = items.map(staged => ({
      productId: staged.productId || '',
      itemNo: staged.itemNo,
      code: staged.itemNo,
      name: staged.name,
      batchNumber: staged.batchNumber !== '-' ? staged.batchNumber : '',
      expiryDate: staged.expiryDate !== '-' ? staged.expiryDate : '',
      quantity: staged.quantity,
      bonus: staged.bonus || 0,
      price: staged.tradePrice,
      tp: staged.tradePrice,
      retailPrice: staged.retailPrice,
      discountPercent: staged.discountPercent,
      taxPercent: staged.advanceTaxPercent,
      purchaseCost: staged.unitCost,
      totalAmount: staged.lineNet
    }));

    const purchases = storage.getPurchases();
    const purchaseNumber = 'PUR-' + String(purchases.length + 1).padStart(6, '0');

    const finalGrandTotal = Utils.round(grandTotal, 2);
    const paidInput = document.getElementById('pm-pay-paid-amount');
    const paidAmount = Utils.round(Math.max(0, parseFloat(paidInput ? paidInput.value : 0) || 0), 2);
    const remainingAmount = Utils.round(Math.max(0, finalGrandTotal - paidAmount), 2);

    const purchaseInvoiceRecord = {
      purchaseNumber: purchaseNumber,
      invoiceNumber: invRef || purchaseNumber,
      date: invDate,
      time: Utils.nowTimeStr(),
      companyId: comp ? comp.id : '',
      companyName: companyName || (comp ? comp.name : 'General Supplier'),
      companyContact: comp ? comp.phone : '',
      paymentType: payType,
      items: formattedItems,
      subtotal: Utils.round(totalGross, 2),
      totalDiscount: Utils.round(totalDiscount, 2),
      tax: Utils.round(totalTax, 2),
      grandTotal: finalGrandTotal,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      notes: `Purchase invoice with ${items.length} line items.`
    };

    const savedPurchase = storage.addPurchase(purchaseInvoiceRecord);

    app.showToast(`Purchase Invoice ${savedPurchase.purchaseNumber} saved (Paid: Rs. ${paidAmount.toFixed(2)}, Balance: Rs. ${remainingAmount.toFixed(2)})!`, 'success');

    // 3. Trigger Print Preview if requested
    if (andPrint) {
      this.printPurchaseInvoice(savedPurchase);
    }

    // Reset state & close modal
    this.stagedPurchaseItems = [];
    app.closeModal('product-modal');
    app.refreshCurrentView();
  }

  saveSingleProductEdit() {
    const editId = document.getElementById('prod-edit-id')?.value;
    if (!editId) return;

    const itemNoElem = document.getElementById('pm-item-no');
    const nameElem = document.getElementById('pm-name');
    const itemNo = (itemNoElem ? itemNoElem.value : '').trim();
    const name = (nameElem ? nameElem.value : '').trim();

    if (!itemNo || !name) {
      app.showToast('Please enter both Item Code and Product Name.', 'warning');
      return;
    }

    const retailPriceVal = parseFloat(document.getElementById('pm-retail-price')?.value) || 0;
    const tpVal = parseFloat(document.getElementById('pm-tp')?.value) || (retailPriceVal ? Utils.round(retailPriceVal * 0.85, 2) : 0);
    const discVal = parseFloat(document.getElementById('pm-discount-percent')?.value) || 0;
    const advTaxVal = parseFloat(document.getElementById('pm-advance-tax')?.value) || 0;
    const defaultPriceVal = parseFloat(document.getElementById('pm-default-price')?.value);
    const validDefaultPrice = (!isNaN(defaultPriceVal) && defaultPriceVal > 0) ? defaultPriceVal : null;

    const unitDiscount = (tpVal * discVal) / 100;
    const advTaxAmount = (tpVal * advTaxVal) / 100;
    const calculatedCost = (tpVal - unitDiscount) + advTaxAmount;
    const purchaseCostVal = parseFloat(document.getElementById('pm-purchase-cost')?.value) || Utils.round(calculatedCost, 2);

    const existingP = storage.getProducts().find(p => p.id === editId);

    const data = {
      itemNo: itemNo,
      name: name,
      genericName: document.getElementById('pm-generic')?.value || '',
      company: document.getElementById('pm-company')?.value || '',
      category: document.getElementById('pm-category')?.value || 'Medicines',
      batchNumber: document.getElementById('pm-batch')?.value || '',
      expiryDate: document.getElementById('pm-expiry')?.value || '',
      tp: tpVal,
      tradePrice: tpVal,
      salePrice: tpVal,
      defaultPrice: validDefaultPrice,
      retailPrice: retailPriceVal,
      discount: discVal,
      purchaseDiscount: discVal,
      advanceTax: advTaxVal,
      purchaseCost: purchaseCostVal,
      purchasePrice: purchaseCostVal,
      costPrice: purchaseCostVal,
      purchasedQty: parseInt(document.getElementById('pm-purchased-qty')?.value) || (existingP ? existingP.purchasedQty : 0),
      bonusQty: parseInt(document.getElementById('pm-bonus-qty')?.value) || (existingP ? (existingP.bonusQty || 0) : 0),
      availableQty: (existingP && existingP.availableQty > 0) ? existingP.availableQty : (parseInt(document.getElementById('pm-purchased-qty')?.value) || (existingP ? existingP.availableQty : 0)),
      minStockLevel: existingP ? existingP.minStockLevel : 10,
      rackNumber: document.getElementById('pm-rack')?.value || ''
    };

    storage.updateProduct(editId, data);
    app.showToast(`Product "${data.name}" updated successfully!`, 'success');
    app.closeModal('product-modal');
    app.refreshCurrentView();
  }

  printPurchaseInvoice(purchase) {
    const container = document.getElementById('printable-invoice');
    if (!container) return;

    container.innerHTML = this.buildPurchaseInvoicePrintTemplate(purchase, storage.getSettings());
    setTimeout(() => { window.print(); }, 250);
  }

  buildPurchaseInvoicePrintTemplate(pur, settings) {
    const fmt = (v) => (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let rowsHtml = '';
    let totalQtySum = 0;

    (pur.items || []).forEach((item, idx) => {
      const q = parseInt(item.quantity) || 0;
      totalQtySum += q;
      const tp = parseFloat(item.tp || item.price) || 0;
      const mrp = parseFloat(item.retailPrice) || 0;
      const dis = parseFloat(item.discountPercent) || 0;
      const tax = parseFloat(item.taxPercent) || 0;
      const cost = parseFloat(item.purchaseCost) || 0;
      const net = parseFloat(item.totalAmount) || 0;

      rowsHtml += `
              <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.72rem;">
                <td style="padding: 5px 3px; text-align: center; color: #64748b;">${idx + 1}</td>
                <td style="padding: 5px 4px; font-weight: 700; color: #0284c7; white-space: nowrap;">${item.itemNo || item.code || 'MED'}</td>
                <td style="padding: 5px 4px; font-weight: 700; color: #0f172a;">${item.name}</td>
                <td style="padding: 5px 3px; text-align: center; color: #334155; white-space: nowrap;">${item.batchNumber || '-'}</td>
                <td style="padding: 5px 3px; text-align: center; color: #334155; white-space: nowrap;">${item.expiryDate || '-'}</td>
                <td style="padding: 5px 4px; text-align: right; color: #059669; white-space: nowrap;">${mrp > 0 ? fmt(mrp) : '-'}</td>
                <td style="padding: 5px 4px; text-align: right; color: #475569; white-space: nowrap;">${fmt(tp)}</td>
                <td style="padding: 5px 3px; text-align: center; font-weight: 800; color: #0284c7;">${q}</td>
                <td style="padding: 5px 3px; text-align: center; font-weight: 800; color: #8b5cf6;">${item.bonus || 0}</td>
                <td style="padding: 5px 3px; text-align: center; color: #d97706; font-weight: 700;">${dis > 0 ? dis + '%' : '-'}</td>
                <td style="padding: 5px 3px; text-align: center; color: #6366f1; font-weight: 700;">${tax > 0 ? tax + '%' : '0%'}</td>
                <td style="padding: 5px 4px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">${fmt(cost)}</td>
                <td style="padding: 5px 4px; text-align: right; font-weight: 800; color: #047857; white-space: nowrap;">${fmt(net)}</td>
              </tr>
            `;
    });

    return `
            <div style="width: 100%; max-width: 980px; margin: 0 auto; background: #ffffff; padding: 14px 16px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; box-sizing: border-box;">
              
              <!-- TOP BRAND HEADER -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${MYU_OFFICIAL_LOGO_B64}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 6px; background: #000; padding: 2px;" alt="Logo">
                  <div>
                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">${settings.shopName || 'MYU Medicine Wholesale'}</h2>
                    <div style="font-size: 0.8rem; color: #475569;">${settings.address || 'Jail Road, Mardan'} &bull; Phone: ${settings.phone || '03445094631'}</div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 1.15rem; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">Purchase Inward Invoice</div>
                  <div style="font-size: 0.8rem; font-weight: 700; color: #334155;"># ${pur.purchaseNumber}</div>
                </div>
              </div>

              <!-- INVOICE & SUPPLIER DETAILS -->
              <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; margin: 12px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 0.8rem;">
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Supplier / Company Details:</div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${pur.companyName || 'General Supplier'}</div>
                  <div style="color: #475569; font-size: 0.78rem;">Contact: ${pur.companyContact || '-'}</div>
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span style="color: #64748b;">Invoice Date:</span>
                    <strong style="color: #0f172a;">${pur.date} ${pur.time || ''}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span style="color: #64748b;">Supplier Ref #:</span>
                    <strong style="color: #0284c7;">${pur.invoiceNumber || '-'}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b;">Payment Method:</span>
                    <strong style="color: #059669;">${pur.paymentType || 'Cash'}</strong>
                  </div>
                </div>
              </div>

              <!-- LINE ITEMS TABLE -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
                <thead>
                  <tr style="background: #0f172a; color: #ffffff; font-size: 0.74rem;">
                    <th style="padding: 6px 3px; text-align: center; width: 25px;">#</th>
                    <th style="padding: 6px 4px; text-align: left;">Code</th>
                    <th style="padding: 6px 4px; text-align: left;">Item Description</th>
                    <th style="padding: 6px 3px; text-align: center;">Batch</th>
                    <th style="padding: 6px 3px; text-align: center;">Expiry</th>
                    <th style="padding: 6px 4px; text-align: right;">MRP</th>
                    <th style="padding: 6px 4px; text-align: right;">TP</th>
                    <th style="padding: 6px 3px; text-align: center;">Qty</th>
                    <th style="padding: 6px 3px; text-align: center;">Bonus</th>
                    <th style="padding: 6px 3px; text-align: center;">Dis%</th>
                    <th style="padding: 6px 3px; text-align: center;">Tax%</th>
                    <th style="padding: 6px 4px; text-align: right;">Unit Net</th>
                    <th style="padding: 6px 4px; text-align: right;">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <!-- SUMMARY BLOCK -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px;">
                <div style="font-size: 0.78rem; color: #64748b; max-width: 50%;">
                  <div>Total Line Items: <strong>${(pur.items || []).length}</strong> | Total Quantity: <strong>${totalQtySum}</strong></div>
                  <div style="margin-top: 4px;">System Generated Purchase Document &bull; MYU ERP</div>
                </div>
                <div style="width: 260px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; font-size: 0.8rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #64748b;">Gross Subtotal:</span>
                    <strong style="color: #0f172a;">Rs. ${fmt(pur.subtotal)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #64748b;">Total Discounts:</span>
                    <strong style="color: #059669;">- Rs. ${fmt(pur.totalDiscount)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #64748b;">Advance Tax Total:</span>
                    <strong style="color: #6366f1;">+ Rs. ${fmt(pur.tax)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #cbd5e1; padding-top: 6px; font-size: 0.95rem; font-weight: 800; color: #047857;">
                    <span>Grand Total:</span>
                    <span>Rs. ${fmt(pur.grandTotal)}</span>
                  </div>
                </div>
              </div>

              <!-- SIGNATURES -->
              <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 0.76rem; color: #64748b;">
                <div>Received By (Storekeeper / Incharge): _____________________</div>
                <div>Verified & Approved By: _____________________</div>
              </div>
            </div>
          `;
  }

  deleteProduct(id) {
    app.confirmDelete('Are you sure you want to remove this product from inventory?', () => {
      storage.deleteProduct(id); app.showToast('Product deleted.', 'info'); app.refreshCurrentView();
    });
  }

  renderInventory() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;

    const products = storage.getProducts();
    const settings = storage.getSettings();

    const query = (document.getElementById('inv-search-input').value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('inv-status-filter').value || '';

    const filtered = products.filter(p => {
      const matchQuery = !query || p.name.toLowerCase().includes(query) || p.itemNo.toLowerCase().includes(query) || (p.company || '').toLowerCase().includes(query) || (p.batchNumber || '').toLowerCase().includes(query);
      const isOut = p.availableQty <= 0;
      const isLow = !isOut && p.availableQty <= (p.minStockLevel || settings.minStockAlert);
      const status = isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock');
      return matchQuery && (!statusFilter || status === statusFilter);
    });

    if (!filtered.length) { Utils.emptyTable(tbody, 11, 'No inventory records match filter.'); return; }

    let html = '';
    filtered.forEach(p => {
      const isOut = p.availableQty <= 0;
      const isLow = !isOut && p.availableQty <= (p.minStockLevel || settings.minStockAlert);
      const statusText = isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock');

      html += `
            <tr>
              <td><span style="font-weight: 700; color: var(--primary);">${p.itemNo}</span></td>
              <td><div style="font-weight: 700;">${p.name}</div><div style="font-size: 0.72rem; color: var(--text-muted);">${p.rackNumber ? 'Rack: ' + p.rackNumber : ''}</div></td>
              <td>${p.company || '-'}</td>
              <td>${p.batchNumber || '-'}</td>
              <td>${p.expiryDate || '-'}</td>
              <td>${p.purchasedQty || 0}</td>
              <td>${p.bonusQty || 0}</td>
              <td><span style="font-weight: 800; font-size: 1rem; color: ${isOut ? '#ef4444' : 'var(--text-main)'};">${p.availableQty}</span></td>
              <td>${Utils.formatCurrency(p.tp, settings.currency)}</td>
              <td style="font-weight: 700; color: var(--primary);">${Utils.formatCurrency(p.salePrice, settings.currency)}</td>
              <td>${Utils.badge(statusText)}</td>
            </tr>
          `;
    });
    tbody.innerHTML = html;
  }

  renderExpiry() {
    const tbody = document.getElementById('expiry-tbody');
    if (!tbody) return;

    const expiryStatus = storage.getExpiryStatus();
    document.getElementById('exp-count-expired').textContent = `${expiryStatus.expired.length} Items`;
    document.getElementById('exp-count-30').textContent = `${expiryStatus.within30.length} Items`;
    document.getElementById('exp-count-60').textContent = `${expiryStatus.within60.length} Items`;
    document.getElementById('exp-count-90').textContent = `${expiryStatus.within90.length} Items`;

    const filterVal = document.getElementById('expiry-filter-select').value || 'all';
    let list = filterVal === 'all' ? [...expiryStatus.expired, ...expiryStatus.within30, ...expiryStatus.within60, ...expiryStatus.within90] : (expiryStatus[filterVal] || []);

    if (!list.length) { Utils.emptyTable(tbody, 8, '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> No products found for selected expiry alert.'); return; }

    let html = '';
    list.forEach(p => {
      const isExpired = p.daysRemaining < 0;
      const statusText = isExpired ? 'EXPIRED' : `Expires in ${p.daysRemaining} Days`;
      html += `
            <tr>
              <td><span style="font-weight: 700; color: var(--primary);">${p.itemNo}</span></td>
              <td><div style="font-weight: 700;">${p.name}</div></td>
              <td><span style="font-weight: 600;">${p.batchNumber || '-'}</span></td>
              <td>${p.company || '-'}</td>
              <td><span style="font-weight: 700;">${p.availableQty}</span></td>
              <td style="font-weight: 700;">${p.expiryDate}</td>
              <td>${isExpired ? 'Expired' : p.daysRemaining + ' days'}</td>
              <td>${Utils.badge(statusText, isExpired ? 'badge-expired' : '')}</td>
            </tr>
          `;
    });
    tbody.innerHTML = html;
  }
}

var productsModule = window.productsModule || new ProductsModule();


/* ==================== PURCHASES & SUPPLIER MODULE ==================== */

if (typeof global !== 'undefined') {
  global.ProductsModule = ProductsModule;
}
if (typeof window !== 'undefined') {
  window.ProductsModule = ProductsModule;
  window.productsModule = window.productsModule || new ProductsModule();
}
