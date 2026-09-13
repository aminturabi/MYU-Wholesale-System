/* ==================== PURCHASES & SUPPLIER MODULE ==================== */
class PurchasesModule {
        constructor() {
          this.lineItems = [];
          this.bindEvents();
          if (typeof document !== 'undefined') {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
              setTimeout(() => this.initPurchaseForm(), 50);
            } else {
              document.addEventListener('DOMContentLoaded', () => this.initPurchaseForm());
            }
          }
        }

        bindEvents() {
          const addLineBtn = document.getElementById('btn-add-pur-line');
          if (addLineBtn) addLineBtn.addEventListener('click', () => this.addPurchaseLineItem());

          const purForm = document.getElementById('purchase-entry-form');
          if (purForm) purForm.addEventListener('submit', (e) => { e.preventDefault(); this.savePurchaseForm(); });

          const paidInput = document.getElementById('pur-paid-amount');
          if (paidInput) paidInput.addEventListener('input', () => this.calculatePurchaseTotals());

          const compSearch = document.getElementById('comp-search-input');
          if (compSearch) compSearch.addEventListener('input', () => this.renderCompanies());

          const compForm = document.getElementById('company-form');
          if (compForm) compForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveCompanyForm(); });

          const spayForm = document.getElementById('supplier-payment-form');
          if (spayForm) spayForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveSupplierPaymentForm(); });
        }

        initPurchaseForm() {
          try {
            const settings = (storage && typeof storage.getSettings === 'function') ? storage.getSettings() : {};
            const purchases = (storage && typeof storage.getPurchases === 'function') ? storage.getPurchases() : [];
            const companies = (storage && typeof storage.getCompanies === 'function') ? storage.getCompanies() : [];

            const prefix = settings.purchasePrefix || 'MYU-PUR-';
            const nextNum = prefix + String((purchases || []).length + 1).padStart(6, '0');

            const purNumElem = document.getElementById('pur-num') || document.getElementById('pur-number');
            if (purNumElem) purNumElem.value = nextNum;

            const dateElem = document.getElementById('pur-date');
            if (dateElem) dateElem.value = Utils.todayStr();

            const select = document.getElementById('pur-company-select');
            if (select) {
              Utils.populateSelect(select, companies || [], 'id', c => `${c.name} (${c.contactPerson || 'No Contact'})`, '', '-- Select Company / Supplier --');
            }

            this.lineItems = [];
            this.addPurchaseLineItem();
            this.calculatePurchaseTotals();
          } catch (e) {
            console.error('Error in PurchasesModule.initPurchaseForm:', e);
          }
        }

        addPurchaseLineItem() {
          this.lineItems.push({ productId: '', itemNo: '', name: '', batchNumber: '', expiryDate: '', quantity: 1, bonus: 0, tp: 0, discountPercent: 0, totalAmount: 0 });
          this.renderPurchaseLineItemsTable();
        }

        onNewProductAdded(newProduct) {
          if (!newProduct) {
            this.renderPurchaseLineItemsTable();
            return;
          }
          if (!this.lineItems || !this.lineItems.length) {
            this.lineItems = [];
          }
          let emptyIdx = this.lineItems.findIndex(i => !i.productId);
          if (emptyIdx === -1) {
            this.lineItems.push({ productId: '', itemNo: '', name: '', batchNumber: '', expiryDate: '', quantity: 1, bonus: 0, tp: 0, discountPercent: 0, totalAmount: 0 });
            emptyIdx = this.lineItems.length - 1;
          }
          this.onProductSelectChange(emptyIdx, newProduct.id);
          app.showToast(`New product "${newProduct.name}" added & selected for purchase!`, 'info');
        }

        removePurchaseLineItem(index) {
          if (this.lineItems.length <= 1) { app.showToast('Purchase invoice must contain at least one line item.', 'warning'); return; }
          this.lineItems.splice(index, 1);
          this.renderPurchaseLineItemsTable();
          this.calculatePurchaseTotals();
        }

        renderPurchaseLineItemsTable() {
          const tbody = document.getElementById('pur-items-tbody');
          if (!tbody) return;

          const products = storage.getProducts();
          let html = '';
          this.lineItems.forEach((item, idx) => {
            let prodOptions = '<option value="">-- Select Product --</option>';
            products.forEach(p => {
              const sel = p.id === item.productId ? 'selected' : '';
              prodOptions += `<option value="${p.id}" ${sel}>${p.itemNo} - ${p.name} (Batch: ${p.batchNumber})</option>`;
            });

            const lineTotalFormatted = (item.totalAmount !== undefined && !isNaN(item.totalAmount)) ? Number(item.totalAmount).toFixed(2) : '0.00';

            html += `
            <tr>
              <td><select class="form-control-myu" style="padding: 8px 10px; font-weight: 500; min-width: 260px;" onchange="purchasesModule.onProductSelectChange(${idx}, this.value)">${prodOptions}</select></td>
              <td><input type="text" class="form-control-myu" style="padding: 8px 10px; text-align: center;" value="${item.batchNumber || ''}" oninput="purchasesModule.updateLineItem(${idx}, 'batchNumber', this.value)" onchange="purchasesModule.updateLineItem(${idx}, 'batchNumber', this.value)"></td>
              <td><input type="date" class="form-control-myu" style="padding: 8px 6px; text-align: center;" value="${item.expiryDate || ''}" oninput="purchasesModule.updateLineItem(${idx}, 'expiryDate', this.value)" onchange="purchasesModule.updateLineItem(${idx}, 'expiryDate', this.value)"></td>
              <td><input type="number" class="form-control-myu pur-qty-input" style="padding: 8px 8px; text-align: center;" value="${item.quantity}" min="1" oninput="purchasesModule.updateLineItem(${idx}, 'quantity', this.value)" onchange="purchasesModule.updateLineItem(${idx}, 'quantity', this.value)"></td>
              <td><input type="number" class="form-control-myu pur-bonus-input" style="padding: 8px 8px; text-align: center;" value="${item.bonus || 0}" min="0" oninput="purchasesModule.updateLineItem(${idx}, 'bonus', this.value)" onchange="purchasesModule.updateLineItem(${idx}, 'bonus', this.value)"></td>
              <td><input type="number" step="0.01" class="form-control-myu pur-tp-input" style="padding: 8px 8px; text-align: center; font-weight: 600;" value="${item.tp || 0}" oninput="purchasesModule.updateLineItem(${idx}, 'tp', this.value)" onchange="purchasesModule.updateLineItem(${idx}, 'tp', this.value)"></td>
              <td><input type="number" step="0.1" class="form-control-myu pur-disc-input" style="padding: 8px 8px; text-align: center;" value="${item.discountPercent || 0}" oninput="purchasesModule.updateLineItem(${idx}, 'discountPercent', this.value)" onchange="purchasesModule.updateLineItem(${idx}, 'discountPercent', this.value)"></td>
              <td id="pur-line-total-${idx}" class="pur-line-total" style="font-weight: 700; color: var(--primary); text-align: right; white-space: nowrap;">Rs. ${lineTotalFormatted}</td>
              <td style="text-align: center;"><button type="button" class="btn-danger-myu btn-sm-myu" onclick="purchasesModule.removePurchaseLineItem(${idx})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
          `;
          });
          tbody.innerHTML = html;
        }

        onProductSelectChange(index, productId) {
          const prod = storage.getProducts().find(p => p.id === productId);
          if (prod) {
            this.lineItems[index].productId = prod.id;
            this.lineItems[index].itemNo = prod.itemNo;
            this.lineItems[index].name = prod.name;
            this.lineItems[index].batchNumber = prod.batchNumber || '';
            this.lineItems[index].expiryDate = prod.expiryDate || '';
            this.lineItems[index].tp = parseFloat(prod.tp) || 0;
            this.lineItems[index].discountPercent = parseFloat(prod.discount) || 0;
          } else {
            this.lineItems[index].productId = '';
            this.lineItems[index].itemNo = '';
            this.lineItems[index].name = '';
          }
          this.updateLineCalculations(index);
          this.renderPurchaseLineItemsTable();
          this.calculatePurchaseTotals();
        }

        updateLineItem(index, key, val) {
          if (!this.lineItems || !this.lineItems[index]) return;
          this.lineItems[index][key] = val;
          this.updateLineCalculations(index);
          this.updateRowDom(index);
          this.calculatePurchaseTotals();
        }

        updateLineCalculations(index) {
          const item = this.lineItems[index];
          if (!item) return;
          const qty = parseInt(item.quantity) || 0;
          const tp = parseFloat(item.tp) || 0;
          const disc = parseFloat(item.discountPercent) || 0;
          item.totalAmount = Utils.calcLineTotal(qty, tp, disc);
        }

        updateRowDom(index) {
          const item = this.lineItems[index];
          if (!item) return;
          const formatted = (item.totalAmount !== undefined && !isNaN(item.totalAmount)) ? Number(item.totalAmount).toFixed(2) : '0.00';
          const cell = document.getElementById(`pur-line-total-${index}`);
          if (cell) {
            cell.textContent = `Rs. ${formatted}`;
          } else {
            const tbody = document.getElementById('pur-items-tbody');
            if (tbody && tbody.children[index]) {
              const totalTd = tbody.children[index].querySelector('.pur-line-total') || tbody.children[index].children[7];
              if (totalTd) {
                totalTd.textContent = `Rs. ${formatted}`;
              }
            }
          }
        }

        calculatePurchaseTotals() {
          let subtotal = 0, totalDiscount = 0;
          this.lineItems.forEach(item => {
            const qty = parseInt(item.quantity) || 0;
            const tp = parseFloat(item.tp) || 0;
            const disc = parseFloat(item.discountPercent) || 0;
            const gross = Utils.round(qty * tp);
            const lineDisc = Utils.round((gross * disc) / 100);
            subtotal = Utils.round(subtotal + gross);
            totalDiscount = Utils.round(totalDiscount + lineDisc);
          });

          const grandTotal = Utils.round(subtotal - totalDiscount);
          const paidInput = document.getElementById('pur-paid-amount');
          const paid = paidInput ? (parseFloat(paidInput.value) || 0) : 0;
          const remaining = Math.max(0, Utils.round(grandTotal - paid));
          const settings = storage.getSettings();

          const subElem = document.getElementById('pur-subtotal');
          if (subElem) subElem.textContent = Utils.formatCurrency(subtotal, settings.currency);
          const discElem = document.getElementById('pur-total-disc');
          if (discElem) discElem.textContent = Utils.formatCurrency(totalDiscount, settings.currency);
          const grandElem = document.getElementById('pur-grand-total');
          if (grandElem) grandElem.textContent = Utils.formatCurrency(grandTotal, settings.currency);
          const remElem = document.getElementById('pur-remaining-amount');
          if (remElem) remElem.textContent = Utils.formatCurrency(remaining, settings.currency);
        }

        savePurchaseForm() {
          const compId = document.getElementById('pur-company-select').value;
          if (!compId) { app.showToast('Please select a supplier company.', 'warning'); return; }

          const validItems = this.lineItems.filter(i => i.productId);
          if (!validItems.length) { app.showToast('Please select at least one valid product.', 'warning'); return; }

          const comp = storage.getCompanies().find(c => c.id === compId);
          let subtotal = 0, totalDiscount = 0;
          const formattedItems = validItems.map(i => {
            const qty = parseInt(i.quantity) || 0;
            const bonus = parseInt(i.bonus) || 0;
            const tp = Utils.round(parseFloat(i.tp) || 0);
            const disc = Utils.round(parseFloat(i.discountPercent) || 0);
            const gross = Utils.round(qty * tp);
            const lineDisc = Utils.round((gross * disc) / 100);
            const totalAmount = Utils.calcLineTotal(qty, tp, disc);

            subtotal = Utils.round(subtotal + gross);
            totalDiscount = Utils.round(totalDiscount + lineDisc);

            return {
              ...i,
              quantity: qty,
              bonus: bonus,
              tp: tp,
              discountPercent: disc,
              totalAmount: totalAmount
            };
          });

          const grandTotal = Utils.round(subtotal - totalDiscount);
          const paid = Utils.round(parseFloat(document.getElementById('pur-paid-amount').value) || 0);
          const remaining = Math.max(0, Utils.round(grandTotal - paid));

          storage.addPurchase({
            purchaseNumber: document.getElementById('pur-num').value,
            invoiceNumber: document.getElementById('pur-inv-num').value,
            date: document.getElementById('pur-date').value,
            companyId: comp.id,
            companyName: comp.name,
            companyContact: comp.phone,
            paymentType: document.getElementById('pur-payment-type').value,
            items: formattedItems,
            subtotal,
            totalDiscount,
            tax: 0,
            grandTotal,
            paidAmount: paid,
            remainingAmount: remaining,
            notes: document.getElementById('pur-notes').value
          });

          app.showToast('Purchase invoice saved & inventory updated!', 'success');
          app.switchView('purchase-history-view');
        }

        renderPurchaseHistory() {
          const tbody = document.getElementById('purchase-history-tbody');
          if (!tbody) return;

          const purchases = storage.getPurchases();
          const settings = storage.getSettings();

          if (!purchases.length) { Utils.emptyTable(tbody, 9, 'No stock purchases recorded yet.'); return; }

          let html = '';
          purchases.slice().reverse().forEach(p => {
            const rem = p.remainingAmount !== undefined ? p.remainingAmount : (p.remainingBalance || 0);
            html += `
            <tr>
              <td><span style="font-weight: 700; color: var(--primary);">${p.purchaseNumber}</span></td>
              <td>${p.date}</td>
              <td><div style="font-weight: 700;">${p.companyName}</div></td>
              <td>${p.invoiceNumber || '-'}</td>
              <td style="font-weight: 700;">${Utils.formatCurrency(p.grandTotal, settings.currency)}</td>
              <td style="color: #059669; font-weight: 600;">${Utils.formatCurrency(p.paidAmount, settings.currency)}</td>
              <td style="color: #ef4444; font-weight: 700;">${Utils.formatCurrency(rem, settings.currency)}</td>
              <td>${Utils.badge(p.paymentType || 'Cash')}</td>
              <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <button class="btn-primary-myu btn-sm-myu" style="padding: 4px 8px; font-size: 0.78rem;" onclick="purchasesModule.printPurchaseDirect('${p.id || p.purchaseNumber}')" title="Print Purchase Invoice"><i class="fa-solid fa-print"></i> Print</button>
                  <button class="btn-secondary-myu btn-sm-myu" style="padding: 4px 8px; font-size: 0.78rem;" onclick="purchasesModule.viewPurchaseModal('${p.id || p.purchaseNumber}')" title="View Purchase Details"><i class="fa-solid fa-eye"></i> View</button>
                  <button class="btn-danger-myu btn-sm-myu" style="padding: 4px 8px; font-size: 0.78rem;" onclick="purchasesModule.deletePurchase('${p.id || p.purchaseNumber}')" title="Delete Purchase Invoice"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
          });
          tbody.innerHTML = html;
        }

        viewPurchaseModal(purchaseId) {
          const purchases = storage.getPurchases();
          const pur = purchases.find(p => (p.id && p.id === purchaseId) || (p.purchaseNumber && p.purchaseNumber === purchaseId));
          if (!pur) return;

          const settings = storage.getSettings();
          const container = document.getElementById('view-purchase-modal-content');
          if (container) {
            container.innerHTML = this.buildPurchaseModalHtml(pur, settings);
          }

          const printBtn = document.getElementById('btn-modal-print-purchase');
          if (printBtn) {
            printBtn.onclick = () => this.printPurchaseDirect(pur.id || pur.purchaseNumber);
          }

          const appObj = window.app || (typeof app !== 'undefined' ? app : null);
          if (appObj && typeof appObj.openModal === 'function') {
            appObj.openModal('view-purchase-modal');
          }
        }

        printPurchaseDirect(purchaseId) {
          const purchases = storage.getPurchases();
          const pur = purchases.find(p => (p.id && p.id === purchaseId) || (p.purchaseNumber && p.purchaseNumber === purchaseId));
          if (!pur) return;

          const container = document.getElementById('printable-invoice');
          if (container) {
            container.innerHTML = this.buildPurchasePrintTemplate(pur, storage.getSettings());
          }
          setTimeout(() => { window.print(); }, 250);
        }

        buildPurchaseModalHtml(pur, settings) {
          const fmt = (val) => {
            const num = parseFloat(val) || 0;
            return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          };

          const items = pur.items || [];
          let totalQtySum = 0;
          let rowsHtml = '';

          items.forEach((item, idx) => {
            const qty = parseInt(item.quantity !== undefined ? item.quantity : (item.qty || 0)) || 0;
            const bns = parseInt(item.bonus !== undefined ? item.bonus : (item.bns || 0)) || 0;
            totalQtySum += qty;
            const tp = parseFloat(item.tradePrice !== undefined ? item.tradePrice : (item.tp !== undefined ? item.tp : (item.price || 0))) || 0;
            const mrp = parseFloat(item.retailPrice !== undefined ? item.retailPrice : (item.mrp || 0)) || (tp ? Utils.round(tp / 0.85, 2) : 0);
            const dis = parseFloat(item.discountPercent !== undefined ? item.discountPercent : (item.disPercent !== undefined ? item.disPercent : (item.discount || 0))) || 0;
            const advTax = parseFloat(item.taxPercent !== undefined ? item.taxPercent : (item.advTax !== undefined ? item.advTax : (item.tax || 0))) || 0;
            const discCost = tp * (1 - dis / 100);
            const unitNet = parseFloat(item.netPrice || item.purchaseCost || item.unitCost || item.costPrice) || (discCost + (discCost * advTax / 100));
            const lineNet = parseFloat(item.totalAmount || item.lineNet || item.total) || (qty * unitNet);

            rowsHtml += `
              <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.82rem;">
                <td style="padding: 6px 4px; text-align: center; color: #64748b; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px 6px; font-weight: 700; color: var(--primary);">${item.itemNo || item.code || '-'}</td>
                <td style="padding: 6px 6px; font-weight: 700; color: #0f172a;">${item.name || item.productName || 'Medicine Item'}</td>
                <td style="padding: 6px 6px; color: #334155;">${item.batchNumber || item.batch || '-'}</td>
                <td style="padding: 6px 6px; color: #334155;">${item.expiryDate || item.expiry || '-'}</td>
                <td style="padding: 6px 6px; text-align: right; color: #64748b;">Rs. ${fmt(mrp)}</td>
                <td style="padding: 6px 6px; text-align: right; font-weight: 600;">Rs. ${fmt(tp)}</td>
                <td style="padding: 6px 6px; text-align: center; font-weight: 800;">${qty}${bns ? ` <span style="color: #059669; font-size: 0.72rem;">(+${bns})</span>` : ''}</td>
                <td style="padding: 6px 6px; text-align: center; color: #059669; font-weight: 700;">${dis}%</td>
                <td style="padding: 6px 6px; text-align: center; color: #6366f1; font-weight: 700;">${advTax}%</td>
                <td style="padding: 6px 6px; text-align: right; font-weight: 700;">Rs. ${fmt(unitNet)}</td>
                <td style="padding: 6px 6px; text-align: right; font-weight: 800; color: var(--primary);">Rs. ${fmt(lineNet)}</td>
              </tr>
            `;
          });

          if (!rowsHtml) {
            rowsHtml = `<tr><td colspan="12" style="text-align: center; padding: 20px; color: #64748b;">No item breakdown available for this purchase invoice.</td></tr>`;
          }

          const rem = pur.remainingAmount !== undefined ? pur.remainingAmount : (pur.remainingBalance || 0);
          const status = rem <= 0 ? 'Paid' : (pur.paidAmount > 0 ? 'Partially Paid' : 'Unpaid');

          return `
            <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0f172a;">
              <!-- METADATA HEADER -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #64748b;">Supplier / Company</div>
                  <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${pur.companyName || 'General Supplier'}</div>
                  ${pur.companyContact ? `<div style="font-size: 0.76rem; color: #475569;">Contact: ${pur.companyContact}</div>` : ''}
                </div>
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #64748b;">Purchase Reference</div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-top: 2px;">${pur.purchaseNumber}</div>
                  <div style="font-size: 0.76rem; color: #475569;">Supplier Ref #: <strong>${pur.invoiceNumber || '-'}</strong></div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #64748b;">Date & Payment Mode</div>
                  <div style="font-size: 0.88rem; font-weight: 700; color: #0f172a; margin-top: 2px;">${pur.date} ${pur.time || ''}</div>
                  <div style="font-size: 0.76rem; color: #475569;">Method: <strong>${pur.paymentType || 'Cash'}</strong> | ${Utils.badge(status)}</div>
                </div>
              </div>

              <!-- ITEMS TABLE -->
              <div style="overflow-x: auto; max-height: 320px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;">
                <table class="custom-table" style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
                  <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 2; border-bottom: 1.5px solid #cbd5e1;">
                    <tr>
                      <th style="padding: 6px 4px; text-align: center; width: 30px;">#</th>
                      <th style="padding: 6px 6px;">Code</th>
                      <th style="padding: 6px 6px;">Product Name</th>
                      <th style="padding: 6px 6px;">Batch</th>
                      <th style="padding: 6px 6px;">Expiry</th>
                      <th style="padding: 6px 6px; text-align: right;">MRP</th>
                      <th style="padding: 6px 6px; text-align: right;">TP</th>
                      <th style="padding: 6px 6px; text-align: center;">Qty</th>
                      <th style="padding: 6px 6px; text-align: center;">Dis%</th>
                      <th style="padding: 6px 6px; text-align: center;">Adv Tax%</th>
                      <th style="padding: 6px 6px; text-align: right;">Unit Net</th>
                      <th style="padding: 6px 6px; text-align: right;">Line Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- TOTALS & SETTLEMENT BREAKDOWN -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 0.8rem;">
                  <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">Purchase Summary Notes:</div>
                  <div style="color: #64748b; font-size: 0.78rem; line-height: 1.4;">
                    ${pur.notes || `Stock inward purchase record containing ${items.length} product line(s) totaling ${totalQtySum} units.`}
                  </div>
                </div>

                <div style="width: 320px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; font-size: 0.84rem;">
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
                  <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #cbd5e1; padding-top: 6px; margin-bottom: 6px; font-size: 1rem; font-weight: 900; color: var(--primary);">
                    <span>Grand Total:</span>
                    <span>Rs. ${fmt(pur.grandTotal)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #059669; font-weight: 700;">
                    <span>Amount Paid:</span>
                    <span>Rs. ${fmt(pur.paidAmount)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 4px; color: ${rem > 0 ? '#ef4444' : '#10b981'}; font-weight: 800;">
                    <span>Remaining Balance:</span>
                    <span>Rs. ${fmt(rem)}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        }

        buildPurchasePrintTemplate(pur, settings) {
          const fmt = (val) => {
            const num = parseFloat(val) || 0;
            return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          };

          const items = pur.items || [];
          let totalQtySum = 0;
          let rowsHtml = '';

          items.forEach((item, idx) => {
            const qty = parseInt(item.quantity !== undefined ? item.quantity : (item.qty || 0)) || 0;
            const bns = parseInt(item.bonus !== undefined ? item.bonus : (item.bns || 0)) || 0;
            totalQtySum += qty;
            const tp = parseFloat(item.tradePrice !== undefined ? item.tradePrice : (item.tp !== undefined ? item.tp : (item.price || 0))) || 0;
            const mrp = parseFloat(item.retailPrice !== undefined ? item.retailPrice : (item.mrp || 0)) || (tp ? Utils.round(tp / 0.85, 2) : 0);
            const dis = parseFloat(item.discountPercent !== undefined ? item.discountPercent : (item.disPercent !== undefined ? item.disPercent : (item.discount || 0))) || 0;
            const advTax = parseFloat(item.taxPercent !== undefined ? item.taxPercent : (item.advTax !== undefined ? item.advTax : (item.tax || 0))) || 0;
            const discCost = tp * (1 - dis / 100);
            const unitNet = parseFloat(item.netPrice || item.purchaseCost || item.unitCost || item.costPrice) || (discCost + (discCost * advTax / 100));
            const lineNet = parseFloat(item.totalAmount || item.lineNet || item.total) || (qty * unitNet);

            rowsHtml += `
              <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.72rem;">
                <td style="padding: 4px 2px; text-align: center; color: #64748b;">${idx + 1}</td>
                <td style="padding: 4px 4px; font-weight: 700; color: #0284c7; white-space: nowrap;">${item.itemNo || item.code || '-'}</td>
                <td style="padding: 4px 4px; font-weight: 700; color: #0f172a;">${item.name || item.productName || 'Medicine'}</td>
                <td style="padding: 4px 3px; text-align: center; color: #334155; white-space: nowrap;">${item.batchNumber || item.batch || '-'}</td>
                <td style="padding: 4px 3px; text-align: center; color: #334155; white-space: nowrap;">${item.expiryDate || item.expiry || '-'}</td>
                <td style="padding: 4px 4px; text-align: right; color: #64748b; white-space: nowrap;">${fmt(mrp)}</td>
                <td style="padding: 4px 4px; text-align: right; color: #334155; white-space: nowrap;">${fmt(tp)}</td>
                <td style="padding: 4px 3px; text-align: center; font-weight: 800; color: #0f172a;">${qty}${bns ? ` (+${bns})` : ''}</td>
                <td style="padding: 4px 3px; text-align: center; color: #059669; font-weight: 700;">${dis}%</td>
                <td style="padding: 4px 3px; text-align: center; color: #6366f1; font-weight: 700;">${advTax}%</td>
                <td style="padding: 4px 4px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">${fmt(unitNet)}</td>
                <td style="padding: 4px 4px; text-align: right; font-weight: 800; color: #0f172a; white-space: nowrap;">${fmt(lineNet)}</td>
              </tr>
            `;
          });

          const rem = pur.remainingAmount !== undefined ? pur.remainingAmount : (pur.remainingBalance || 0);

          return `
            <div style="width: 100%; max-width: 980px; margin: 0 auto; background: #ffffff; padding: 14px 16px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0f172a; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">
              
              <!-- TOP BRAND HEADER -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${MYU_OFFICIAL_LOGO_B64}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 6px; background: #000; padding: 2px;" alt="Logo">
                  <div>
                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">${settings.shopName || 'MYU Medicine Wholesale'}</h2>
                    <div style="font-size: 0.8rem; color: #475569;">${settings.address || 'Jail Road, Mardan'} &bull; Phone: ${settings.phone || '03445094631'}</div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 1.15rem; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px;">Purchase Inward Invoice</div>
                  <div style="font-size: 0.85rem; font-weight: 800; color: #334155;"># ${pur.purchaseNumber}</div>
                </div>
              </div>

              <!-- INVOICE & SUPPLIER DETAILS -->
              <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; margin: 12px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 0.8rem;">
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Supplier / Pharmaceutical Company:</div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${pur.companyName || 'General Supplier'}</div>
                  ${pur.companyContact ? `<div style="color: #475569; font-size: 0.78rem;">Contact: ${pur.companyContact}</div>` : ''}
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span style="color: #64748b;">Purchase Date:</span>
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
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                <thead>
                  <tr style="background: #0f172a; color: #ffffff; font-size: 0.72rem;">
                    <th style="padding: 5px 2px; text-align: center; width: 22px;">#</th>
                    <th style="padding: 5px 4px; text-align: left;">Code</th>
                    <th style="padding: 5px 4px; text-align: left;">Item Name</th>
                    <th style="padding: 5px 3px; text-align: center;">Batch</th>
                    <th style="padding: 5px 3px; text-align: center;">Expiry</th>
                    <th style="padding: 5px 4px; text-align: right;">MRP</th>
                    <th style="padding: 5px 4px; text-align: right;">TP</th>
                    <th style="padding: 5px 3px; text-align: center;">Qty</th>
                    <th style="padding: 5px 3px; text-align: center;">Dis%</th>
                    <th style="padding: 5px 3px; text-align: center;">Adv Tax%</th>
                    <th style="padding: 5px 4px; text-align: right;">Unit Net</th>
                    <th style="padding: 5px 4px; text-align: right;">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <!-- SUMMARY BLOCK -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px;">
                <div style="font-size: 0.76rem; color: #64748b; max-width: 50%;">
                  <div>Total Line Items: <strong>${items.length}</strong> | Total Quantity: <strong>${totalQtySum}</strong></div>
                  <div style="margin-top: 4px; line-height: 1.3;">${pur.notes || 'Goods received in sound condition & added to inventory stock.'}</div>
                </div>
                <div style="width: 280px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span style="color: #64748b;">Gross Subtotal:</span>
                    <strong style="color: #0f172a;">Rs. ${fmt(pur.subtotal)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span style="color: #64748b;">Total Discounts:</span>
                    <strong style="color: #059669;">- Rs. ${fmt(pur.totalDiscount)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #64748b;">Advance Tax Total:</span>
                    <strong style="color: #6366f1;">+ Rs. ${fmt(pur.tax)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #cbd5e1; padding-top: 4px; margin-bottom: 4px; font-size: 0.95rem; font-weight: 900; color: #0f766e;">
                    <span>Grand Total:</span>
                    <span>Rs. ${fmt(pur.grandTotal)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; color: #059669; font-weight: 700; margin-bottom: 2px;">
                    <span>Amount Paid:</span>
                    <span>Rs. ${fmt(pur.paidAmount)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 2px; color: ${rem > 0 ? '#ef4444' : '#10b981'}; font-weight: 800;">
                    <span>Remaining Balance:</span>
                    <span>Rs. ${fmt(rem)}</span>
                  </div>
                </div>
              </div>

              <!-- SIGNATURES -->
              <div style="display: flex; justify-content: space-between; margin-top: 36px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 0.74rem; color: #64748b;">
                <div>Received By (Storekeeper / Incharge): _____________________</div>
                <div>Verified & Approved By: _____________________</div>
              </div>
            </div>
          `;
        }

        deletePurchase(id) {
          app.confirmDelete('Revert purchase invoice? Inventory and supplier balance will be adjusted.', () => {
            storage.deletePurchase(id); app.showToast('Purchase invoice deleted & stock adjusted.', 'info'); app.refreshCurrentView();
          });
        }

        renderCompanies() {
          const tbody = document.getElementById('companies-tbody');
          if (!tbody) return;

          const companies = storage.getCompanies();
          const settings = storage.getSettings();
          const searchInput = document.getElementById('comp-search-input');
          const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

          const filtered = companies.filter(c => !query || c.name.toLowerCase().includes(query) || (c.contactPerson || '').toLowerCase().includes(query) || (c.phone || '').toLowerCase().includes(query) || (c.address || '').toLowerCase().includes(query));

          if (!filtered.length) { Utils.emptyTable(tbody, 8, 'No supplier companies found.'); return; }

          let html = '';
          filtered.forEach(c => {
            const wa = Utils.whatsappLink(c.whatsapp);
            html += `
            <tr>
              <td><div style="font-weight: 700; font-size: 0.95rem;">${c.name}</div><div style="font-size: 0.75rem; color: var(--text-muted);">${c.address || ''}</div></td>
              <td>${c.contactPerson || '-'}</td>
              <td>
                <div>${c.phone || '-'}</div>
                ${wa ? `<a href="${wa}" target="_blank" class="whatsapp-link" style="font-size: 0.8rem; text-decoration: none;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}
              </td>
              <td>${c.email || '-'}</td>
              <td style="font-weight: 600;">${Utils.formatCurrency(c.totalPurchases, settings.currency)}</td>
              <td style="color: #059669;">${Utils.formatCurrency(c.totalPayments, settings.currency)}</td>
              <td style="font-weight: 800; color: ${(c.remainingPayable || 0) > 0 ? '#ef4444' : '#10b981'};">${Utils.formatCurrency(c.remainingPayable, settings.currency)}</td>
              <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <button class="btn-sm-myu" style="background: #10b981; color: #ffffff; border: none; font-weight: 700; padding: 4px 8px; font-size: 0.78rem;" onclick="purchasesModule.openCompanyProfitLossModal('${c.id}')" title="Individual Company Profit & Loss Breakdown"><i class="fa-solid fa-chart-line"></i> P&L</button>
                  <button class="btn-secondary-myu btn-sm-myu" onclick="purchasesModule.viewCompanyDetails('${c.id}')" title="View Profile & Ledger"><i class="fa-solid fa-eye"></i></button>
                  <button class="btn-primary-myu btn-sm-myu" onclick="purchasesModule.openSupplierPaymentModalForCompany('${c.id}')" title="Pay Supplier"><i class="fa-solid fa-hand-holding-dollar"></i></button>
                  <button class="btn-secondary-myu btn-sm-myu" onclick="purchasesModule.openCompanyEditModal('${c.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                  <button class="btn-danger-myu btn-sm-myu" onclick="purchasesModule.deleteCompany('${c.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
          });
          tbody.innerHTML = html;
        }

        viewCompanyDetails(id) {
          const c = storage.getCompanies().find(comp => comp.id === id);
          if (!c) return;

          const settings = storage.getSettings();
          const purchases = storage.getPurchases().filter(p => p.companyId === id);
          const payments = storage.getSupplierPayments().filter(p => p.companyId === id);
          const content = document.getElementById('comp-details-content');
          if (!content) return;

          const pnl = this.calculateCompanyProfitLossData(c.id, 'all');
          const isProfit = (pnl ? pnl.netProfit : 0) >= 0;
          const profitColor = isProfit ? '#10b981' : '#ef4444';

          const wa = Utils.whatsappLink(c.whatsapp);
          let purRows = purchases.map(p => `<tr><td><strong>${p.purchaseNumber}</strong></td><td>${p.date}</td><td>${p.invoiceNumber || '-'}</td><td>${Utils.formatCurrency(p.grandTotal, settings.currency)}</td><td style="color: #059669;">${Utils.formatCurrency(p.paidAmount, settings.currency)}</td><td style="color: #ef4444; font-weight: 700;">${Utils.formatCurrency(p.remainingAmount, settings.currency)}</td></tr>`).join('');
          if (!purRows) purRows = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No purchases recorded for this company.</td></tr>`;

          let payRows = payments.map(p => `<tr><td>${p.date}</td><td>${Utils.badge(p.method)}</td><td style="font-weight: 700; color: var(--primary);">${Utils.formatCurrency(p.amount, settings.currency)}</td><td>${p.reference || '-'}</td></tr>`).join('');
          if (!payRows) payRows = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No payments recorded.</td></tr>`;

          content.innerHTML = `
          <div style="background: #f8fafc; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
              <div>
                <h2 style="color: var(--primary); font-size: 1.3rem; font-weight: 800;">${c.name}</h2>
                <p style="font-size: 0.88rem; color: var(--text-muted);"><i class="fa-solid fa-user"></i> Contact: <strong>${c.contactPerson || 'N/A'}</strong></p>
                <p style="font-size: 0.88rem; color: var(--text-muted);"><i class="fa-solid fa-phone"></i> Phone: <strong>${c.phone || 'N/A'}</strong> ${wa ? `<a href="${wa}" target="_blank" class="whatsapp-link"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}</p>
                <p style="font-size: 0.88rem; color: var(--text-muted);"><i class="fa-solid fa-envelope"></i> Email: ${c.email || 'N/A'}</p>
                <p style="font-size: 0.88rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> Address: ${c.address || 'N/A'}</p>
              </div>
              <div style="text-align: right; background: #ffffff; padding: 12px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color); min-width: 220px;">
                <div style="font-size: 0.78rem; color: var(--text-muted);">Total Purchases: <strong>${Utils.formatCurrency(c.totalPurchases, settings.currency)}</strong></div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px;">Total Payments: <strong style="color: #059669;">${Utils.formatCurrency(c.totalPayments, settings.currency)}</strong></div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px;">Payable Balance: <strong style="color: ${(c.remainingPayable || 0) > 0 ? '#ef4444' : '#10b981'}; font-size: 1rem;">${Utils.formatCurrency(c.remainingPayable, settings.currency)}</strong></div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Company Sales Net P&L:</div>
                  <div style="font-size: 1.05rem; font-weight: 800; color: ${profitColor};">${Utils.formatCurrency(pnl.netProfit, settings.currency)} (${pnl.profitMargin.toFixed(1)}%)</div>
                </div>
                <button class="btn-primary-myu btn-sm-myu" style="width: 100%; justify-content: center; margin-top: 8px; background: #10b981; border: none; font-weight: 700;" onclick="app.closeModal('company-details-modal'); purchasesModule.openCompanyProfitLossModal('${c.id}');">
                  <i class="fa-solid fa-chart-line"></i> Full P&L Statement
                </button>
              </div>
            </div>
          </div>
          <h4 style="font-weight: 700; margin-bottom: 8px; color: var(--primary);">Purchase History</h4>
          <div class="table-responsive" style="margin-bottom: 16px;"><table class="custom-table"><thead><tr><th>Purchase #</th><th>Date</th><th>Invoice #</th><th>Grand Total</th><th>Paid</th><th>Remaining</th></tr></thead><tbody>${purRows}</tbody></table></div>
          <h4 style="font-weight: 700; margin-bottom: 8px; color: var(--primary);">Payment Logs</h4>
          <div class="table-responsive"><table class="custom-table"><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Ref #</th></tr></thead><tbody>${payRows}</tbody></table></div>
        `;
          app.openModal('company-details-modal');
        }

        openCompanyProfitLossModal(companyId) {
          const c = storage.getCompanies().find(comp => comp.id === companyId);
          if (!c) return;

          this.activePnLCompanyId = companyId;
          document.getElementById('comp-pnl-modal-title').innerHTML = `<i class="fa-solid fa-chart-line" style="color: #10b981;"></i> ${c.name} - Individual Profit & Loss`;
          document.getElementById('comp-pnl-modal-subtitle').textContent = `Contact: ${c.contactPerson || 'N/A'} (${c.phone || 'N/A'}) | Address: ${c.address || 'N/A'}`;
          document.getElementById('comp-pnl-date-filter').value = 'all';
          const customContainer = document.getElementById('comp-pnl-custom-date-container');
          if (customContainer) customContainer.style.display = 'none';

          this.updateCompanyProfitLossView();
          app.openModal('company-pnl-modal');
        }

        onCompanyPnLFilterChange() {
          const filterVal = document.getElementById('comp-pnl-date-filter').value;
          const customContainer = document.getElementById('comp-pnl-custom-date-container');
          if (customContainer) {
            customContainer.style.display = filterVal === 'custom' ? 'flex' : 'none';
          }
          this.updateCompanyProfitLossView();
        }

        calculateCompanyProfitLossData(companyId, filterType = 'all', startDate = '', endDate = '') {
          const company = storage.getCompanies().find(c => c.id === companyId);
          if (!company) return { grossRevenue: 0, totalCOGS: 0, netProfit: 0, profitMargin: 0, totalSalesQty: 0, currentStockCostValue: 0, currentStockRetailValue: 0, potentialStockProfit: 0, productStats: [], salesInvoices: [] };

          const allProducts = storage.getProducts();
          const allSales = storage.getSales();
          const settings = storage.getSettings();

          const compNameLower = (company.name || '').toLowerCase().trim();
          const companyProducts = allProducts.filter(p => {
            if (p.companyId && p.companyId === company.id) return true;
            if (p.company && p.company.toLowerCase().trim() === compNameLower) return true;
            return false;
          });

          const compProductIds = new Set(companyProducts.map(p => p.id));
          const compItemNos = new Set(companyProducts.map(p => p.itemNo));
          const compNames = new Set(companyProducts.map(p => p.name.toLowerCase().trim()));

          const todayStr = Utils.todayStr(0);
          const thisMonthStr = todayStr.substring(0, 7);
          const lastMonthDate = new Date();
          lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
          const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);
          const thisYearStr = todayStr.substring(0, 4);

          const filteredSales = allSales.filter(s => {
            const sDate = s.date || '';
            if (filterType === 'today') return sDate === todayStr;
            if (filterType === 'thisMonth') return sDate.startsWith(thisMonthStr);
            if (filterType === 'lastMonth') return sDate.startsWith(lastMonthStr);
            if (filterType === 'thisYear') return sDate.startsWith(thisYearStr);
            if (filterType === 'custom') {
              if (startDate && sDate < startDate) return false;
              if (endDate && sDate > endDate) return false;
              return true;
            }
            return true;
          });

          const returns = (storage && typeof storage.getReturns === 'function') ? storage.getReturns() : [];
          const filteredReturns = returns.filter(r => {
            const rDate = r.date || '';
            if (filterType === 'today') return rDate === todayStr;
            if (filterType === 'thisMonth') return rDate.startsWith(thisMonthStr);
            if (filterType === 'lastMonth') return rDate.startsWith(lastMonthStr);
            if (filterType === 'thisYear') return rDate.startsWith(thisYearStr);
            if (filterType === 'custom') {
              if (startDate && rDate < startDate) return false;
              if (endDate && rDate > endDate) return false;
              return true;
            }
            return true;
          });

          const productStatsMap = {};
          companyProducts.forEach(p => {
            productStatsMap[p.id || p.itemNo] = {
              id: p.id, itemNo: p.itemNo, name: p.name, category: p.category || 'Medicines',
              tp: parseFloat(p.tp) || 0, salePrice: parseFloat(p.salePrice) || 0, availableQty: parseInt(p.availableQty) || 0,
              soldQty: 0, totalRevenue: 0, totalCost: 0, netProfit: 0
            };
          });

          let companyTotalSalesQty = 0;
          let companyGrossRevenue = 0;
          let companyTotalCOGS = 0;
          let companyNetProfit = 0;
          const matchingSalesInvoices = [];

          filteredSales.forEach(sale => {
            let saleHasCompanyItem = false;
            let saleCompanyRev = 0;
            let saleCompanyCost = 0;
            let saleCompanyProfit = 0;
            let saleCompanyItemsQty = 0;

            (sale.items || []).forEach(item => {
              const isMatch = (item.productId && compProductIds.has(item.productId)) ||
                (item.itemNo && compItemNos.has(item.itemNo)) ||
                (item.name && compNames.has(item.name.toLowerCase().trim()));

              if (isMatch) {
                saleHasCompanyItem = true;
                const q = parseInt(item.quantity) || 0;
                const bns = parseInt(item.bonus) || 0;
                const price = parseFloat(item.price) || 0;
                const tp = parseFloat(item.tp) || 0;
                const discPercent = parseFloat(item.discountPercent) || 0;
                const extPercent = parseFloat(item.extPercent) || 0;
                const taxPercent = parseFloat(item.taxPercent) || 0;
                const costPrice = parseFloat(item.purchaseCost || item.purchasePrice || item.costPrice) || (tp * 0.85);

                const calc = Utils.calcWholesaleLine(q, price, bns, discPercent, extPercent, taxPercent, tp, costPrice);
                const rev = calc.lineAmount;
                const cost = calc.cogs;
                const profit = calc.profit;

                saleCompanyItemsQty += q;
                saleCompanyRev += rev;
                saleCompanyCost += cost;
                saleCompanyProfit += profit;

                const pKey = item.productId || item.itemNo;
                if (!productStatsMap[pKey]) {
                  productStatsMap[pKey] = {
                    id: item.productId, itemNo: item.itemNo, name: item.name, category: 'Medicines',
                    tp: tp, salePrice: price, availableQty: 0, soldQty: 0, totalRevenue: 0, totalCost: 0, netProfit: 0
                  };
                }
                productStatsMap[pKey].soldQty += q;
                productStatsMap[pKey].totalRevenue += rev;
                productStatsMap[pKey].totalCost += cost;
                productStatsMap[pKey].netProfit += profit;
              }
            });

            if (saleHasCompanyItem) {
              companyTotalSalesQty += saleCompanyItemsQty;
              companyGrossRevenue += saleCompanyRev;
              companyTotalCOGS += saleCompanyCost;
              companyNetProfit += saleCompanyProfit;
              matchingSalesInvoices.push({
                invoiceNumber: sale.invoiceNumber,
                date: sale.date,
                customerName: sale.customerName,
                itemsQty: saleCompanyItemsQty,
                revenue: Utils.round(saleCompanyRev),
                cost: Utils.round(saleCompanyCost),
                profit: Utils.round(saleCompanyProfit)
              });
            }
          });

          // Account for Sales Returns on Company Products
          filteredReturns.forEach(ret => {
            (ret.items || []).forEach(ri => {
              const isMatch = (ri.productId && compProductIds.has(ri.productId)) ||
                (ri.itemNo && compItemNos.has(ri.itemNo)) ||
                (ri.name && compNames.has(ri.name.toLowerCase().trim()));

              if (isMatch) {
                const rQty = parseInt(ri.returnQty) || 0;
                const rRefund = Utils.round(parseFloat(ri.lineRefund) || (rQty * (parseFloat(ri.unitPrice) || 0)));
                const rCost = Utils.round(parseFloat(ri.returnedCogs) || (rQty * (parseFloat(ri.tradePrice) || 0)));
                const rProfitRev = Utils.round(parseFloat(ri.lineProfitReversed) || (rRefund - rCost));

                companyTotalSalesQty -= rQty;
                companyGrossRevenue -= rRefund;
                companyTotalCOGS -= rCost;
                companyNetProfit -= rProfitRev;

                const pKey = ri.productId || ri.itemNo;
                if (productStatsMap[pKey]) {
                  productStatsMap[pKey].soldQty -= rQty;
                  productStatsMap[pKey].totalRevenue -= rRefund;
                  productStatsMap[pKey].totalCost -= rCost;
                  productStatsMap[pKey].netProfit -= rProfitRev;
                }
              }
            });
          });

          companyGrossRevenue = Utils.round(Math.max(0, companyGrossRevenue));
          companyTotalCOGS = Utils.round(Math.max(0, companyTotalCOGS));
          companyNetProfit = Utils.round(companyGrossRevenue - companyTotalCOGS);

          // 7. Inventory Valuation
          let currentStockCostValue = 0;
          let currentStockRetailValue = 0;
          companyProducts.forEach(p => {
            const qty = Math.max(0, parseInt(p.availableQty) || 0);
            currentStockCostValue += qty * (parseFloat(p.tp) || 0);
            currentStockRetailValue += qty * (parseFloat(p.salePrice) || 0);
          });

          currentStockCostValue = Utils.round(currentStockCostValue);
          currentStockRetailValue = Utils.round(currentStockRetailValue);
          const potentialStockProfit = Utils.round(currentStockRetailValue - currentStockCostValue);
          const profitMargin = companyGrossRevenue > 0 ? (companyNetProfit / companyGrossRevenue) * 100 : 0;

          // Round product stats
          Object.values(productStatsMap).forEach(ps => {
            ps.totalRevenue = Utils.round(ps.totalRevenue);
            ps.totalCost = Utils.round(ps.totalCost);
            ps.netProfit = Utils.round(ps.netProfit);
          });

          return {
            company,
            settings,
            companyProducts,
            totalSalesQty: Math.max(0, companyTotalSalesQty),
            grossRevenue: companyGrossRevenue,
            totalCOGS: companyTotalCOGS,
            netProfit: companyNetProfit,
            profitMargin,
            currentStockCostValue,
            currentStockRetailValue,
            potentialStockProfit,
            productStats: Object.values(productStatsMap),
            salesInvoices: matchingSalesInvoices
          };
        }

        updateCompanyProfitLossView() {
          const companyId = this.activePnLCompanyId;
          if (!companyId) return;

          const container = document.getElementById('comp-pnl-modal-content');
          if (!container) return;

          const filterType = document.getElementById('comp-pnl-date-filter').value;
          const startDate = document.getElementById('comp-pnl-start-date').value;
          const endDate = document.getElementById('comp-pnl-end-date').value;

          const data = this.calculateCompanyProfitLossData(companyId, filterType, startDate, endDate);
          if (!data) return;

          const { company, settings, companyProducts, totalSalesQty, grossRevenue, totalCOGS, netProfit, profitMargin, currentStockCostValue, currentStockRetailValue, potentialStockProfit, productStats, salesInvoices } = data;

          const isProfit = netProfit >= 0;
          const profitColor = isProfit ? '#10b981' : '#ef4444';
          const profitBadgeClass = isProfit ? 'badge-in-stock' : 'badge-expired';
          const profitStatusText = isProfit ? 'NET PROFIT' : 'NET LOSS';

          let html = `
          <!-- KPI FINANCIAL CARDS -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
            <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-top: 4px solid var(--primary); box-shadow: var(--shadow-sm);">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Gross Sales Revenue</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary); margin-top: 4px;">${Utils.formatCurrency(grossRevenue, settings.currency)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Units Sold: <strong>${totalSalesQty}</strong></div>
            </div>

            <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-top: 4px solid #64748b; box-shadow: var(--shadow-sm);">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Cost of Goods Sold (TP)</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: #334155; margin-top: 4px;">${Utils.formatCurrency(totalCOGS, settings.currency)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Total Product Cost</div>
            </div>

            <div style="background: ${isProfit ? '#f0fdf4' : '#fff5f5'}; padding: 16px; border-radius: var(--radius-md); border: 1px solid ${isProfit ? '#bbf7d0' : '#fecaca'}; border-top: 4px solid ${profitColor}; box-shadow: var(--shadow-sm);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${profitStatusText}</div>
                ${Utils.badge(profitStatusText, profitBadgeClass)}
              </div>
              <div style="font-size: 1.45rem; font-weight: 800; color: ${profitColor}; margin-top: 4px;">${Utils.formatCurrency(netProfit, settings.currency)}</div>
              <div style="font-size: 0.78rem; color: ${profitColor}; margin-top: 2px; font-weight: 700;">Margin: ${profitMargin.toFixed(1)}%</div>
            </div>

            <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-top: 4px solid #0284c7; box-shadow: var(--shadow-sm);">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Unsold Stock Value (TP)</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: #0284c7; margin-top: 4px;">${Utils.formatCurrency(currentStockCostValue, settings.currency)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Retail Val: <strong>${Utils.formatCurrency(currentStockRetailValue, settings.currency)}</strong></div>
            </div>
          </div>

          <!-- SECONDARY SUMMARY BAR -->
          <div style="background: #f8fafc; padding: 12px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <span style="font-size: 0.82rem; color: var(--text-muted);">Supplier Company:</span>
              <strong style="font-size: 0.95rem; color: var(--primary); margin-left: 6px;">${company.name}</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 10px;">(Catalog: ${companyProducts.length} Medicines)</span>
            </div>
            <div style="display: flex; gap: 16px; font-size: 0.85rem;">
              <div>Total Purchases: <strong>${Utils.formatCurrency(company.totalPurchases, settings.currency)}</strong></div>
              <div>Paid: <strong style="color: #059669;">${Utils.formatCurrency(company.totalPayments, settings.currency)}</strong></div>
              <div>Payable: <strong style="color: ${(company.remainingPayable || 0) > 0 ? '#ef4444' : '#10b981'}; font-weight: 700;">${Utils.formatCurrency(company.remainingPayable, settings.currency)}</strong></div>
            </div>
          </div>

          <!-- PRODUCT-LEVEL PROFIT & LOSS BREAKDOWN TABLE -->
          <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h4 style="font-size: 1rem; font-weight: 800; color: var(--primary); margin: 0;">
                <i class="fa-solid fa-pills"></i> Product-wise Profit & Loss Performance
              </h4>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Breakdown of all medicines for ${company.name}</span>
            </div>
            <div class="table-responsive">
              <table class="custom-table" style="font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>Item #</th>
                    <th>Product Name</th>
                    <th>Available Stock</th>
                    <th>Unit TP (Cost)</th>
                    <th>Unit Sale</th>
                    <th style="text-align: center;">Qty Sold</th>
                    <th style="text-align: right;">Sales Revenue</th>
                    <th style="text-align: right;">Cost (COGS)</th>
                    <th style="text-align: right;">Net Profit / Loss</th>
                    <th style="text-align: center;">Margin</th>
                  </tr>
                </thead>
                <tbody>
        `;

          if (!productStats.length) {
            html += `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">No products recorded for this company.</td></tr>`;
          } else {
            productStats.forEach(p => {
              const pProfit = p.netProfit || 0;
              const pMargin = p.totalRevenue > 0 ? (pProfit / p.totalRevenue) * 100 : 0;
              const isPProfit = pProfit >= 0;
              html += `
              <tr>
                <td><span style="font-weight: 700; color: var(--primary);">${p.itemNo}</span></td>
                <td><div style="font-weight: 700;">${p.name}</div><div style="font-size: 0.72rem; color: var(--text-muted);">${p.category}</div></td>
                <td><span style="font-weight: 700; color: ${p.availableQty <= 0 ? '#ef4444' : 'var(--text-main)'};">${p.availableQty}</span></td>
                <td>${Utils.formatCurrency(p.tp, settings.currency)}</td>
                <td>${Utils.formatCurrency(p.salePrice, settings.currency)}</td>
                <td style="text-align: center; font-weight: 700;">${p.soldQty}</td>
                <td style="text-align: right; font-weight: 700;">${Utils.formatCurrency(p.totalRevenue, settings.currency)}</td>
                <td style="text-align: right; color: #64748b;">${Utils.formatCurrency(p.totalCost, settings.currency)}</td>
                <td style="text-align: right; font-weight: 800; color: ${isPProfit ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(pProfit, settings.currency)}</td>
                <td style="text-align: center;">${Utils.badge(pMargin.toFixed(1) + '%', isPProfit ? '' : 'badge-expired')}</td>
              </tr>
            `;
            });

            // Subtotal footer row
            html += `
            <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid var(--border-color);">
              <td colspan="5" style="text-align: right; text-transform: uppercase;">Company Total:</td>
              <td style="text-align: center;">${totalSalesQty}</td>
              <td style="text-align: right; color: var(--primary);">${Utils.formatCurrency(grossRevenue, settings.currency)}</td>
              <td style="text-align: right; color: #64748b;">${Utils.formatCurrency(totalCOGS, settings.currency)}</td>
              <td style="text-align: right; color: ${profitColor}; font-size: 0.95rem;">${Utils.formatCurrency(netProfit, settings.currency)}</td>
              <td style="text-align: center;">${profitMargin.toFixed(1)}%</td>
            </tr>
          `;
          }

          html += `
                </tbody>
              </table>
            </div>
          </div>

          <!-- SALES TRANSACTIONS LOG FOR THIS COMPANY -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h4 style="font-size: 1rem; font-weight: 800; color: var(--primary); margin: 0;">
                <i class="fa-solid fa-receipt"></i> Sales Invoices Log (${company.name} Products)
              </h4>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${salesInvoices.length} Invoices Found</span>
            </div>
            <div class="table-responsive">
              <table class="custom-table" style="font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Customer / Pharmacy</th>
                    <th style="text-align: center;">Company Items Qty</th>
                    <th style="text-align: right;">Sales Revenue</th>
                    <th style="text-align: right;">Cost (COGS)</th>
                    <th style="text-align: right;">Net Profit / Loss</th>
                  </tr>
                </thead>
                <tbody>
        `;

          if (!salesInvoices.length) {
            html += `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 18px;">No sales transactions containing ${company.name} products recorded in this period.</td></tr>`;
          } else {
            salesInvoices.slice().reverse().forEach(inv => {
              const invProfit = inv.profit || 0;
              const isInvProfit = invProfit >= 0;
              html += `
              <tr>
                <td><strong style="color: var(--primary);">${inv.invoiceNumber}</strong></td>
                <td>${inv.date}</td>
                <td><strong>${inv.customerName}</strong></td>
                <td style="text-align: center;">${inv.itemsQty}</td>
                <td style="text-align: right; font-weight: 700;">${Utils.formatCurrency(inv.revenue, settings.currency)}</td>
                <td style="text-align: right; color: #64748b;">${Utils.formatCurrency(inv.cost, settings.currency)}</td>
                <td style="text-align: right; font-weight: 800; color: ${isInvProfit ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(invProfit, settings.currency)}</td>
              </tr>
            `;
            });
          }

          html += `
                </tbody>
              </table>
            </div>
          </div>
        `;

          container.innerHTML = html;
        }

        printCompanyProfitLoss() {
          const companyId = this.activePnLCompanyId;
          if (!companyId) return;

          const filterType = document.getElementById('comp-pnl-date-filter').value;
          const startDate = document.getElementById('comp-pnl-start-date').value;
          const endDate = document.getElementById('comp-pnl-end-date').value;

          const data = this.calculateCompanyProfitLossData(companyId, filterType, startDate, endDate);
          if (!data) return;

          const { company, settings, grossRevenue, totalCOGS, netProfit, profitMargin, currentStockCostValue, productStats } = data;

          const filterTextMap = { all: 'All Time History', today: 'Today', thisMonth: 'This Month', lastMonth: 'Last Month', thisYear: 'This Year', custom: `Custom (${startDate} to ${endDate})` };
          const filterPeriod = filterTextMap[filterType] || 'All Time';
          const isProfit = netProfit >= 0;

          let itemsRows = '';
          productStats.forEach((p, idx) => {
            const pProfit = p.netProfit || 0;
            itemsRows += `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.8rem;">
              <td style="padding: 6px; text-align: center;">${idx + 1}</td>
              <td style="padding: 6px; font-weight: 700;">${p.itemNo}</td>
              <td style="padding: 6px; font-weight: 700;">${p.name}</td>
              <td style="padding: 6px; text-align: center;">${p.soldQty}</td>
              <td style="padding: 6px; text-align: center;">${p.availableQty}</td>
              <td style="padding: 6px; text-align: right;">${Utils.formatCurrency(p.tp, settings.currency)}</td>
              <td style="padding: 6px; text-align: right;">${Utils.formatCurrency(p.salePrice, settings.currency)}</td>
              <td style="padding: 6px; text-align: right; font-weight: 700;">${Utils.formatCurrency(p.totalRevenue, settings.currency)}</td>
              <td style="padding: 6px; text-align: right;">${Utils.formatCurrency(p.totalCost, settings.currency)}</td>
              <td style="padding: 6px; text-align: right; font-weight: 800; color: ${pProfit >= 0 ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(pProfit, settings.currency)}</td>
            </tr>
          `;
          });

          const printHTML = `
          <div style="max-width: 800px; margin: 0 auto; background: #ffffff; padding: 20px; font-family: 'Inter', system-ui, sans-serif; color: #0f172a;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px;">
              <div>
                <h2 style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #0f766e;">${settings.shopName || 'MYU Medicine Wholesale'}</h2>
                <div style="font-size: 0.82rem; color: #475569;">${settings.address || 'Mardan'} | Phone: ${settings.phone || ''}</div>
              </div>
              <div style="text-align: right;">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Company P&L Statement</h3>
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Generated: ${Utils.todayStr()} ${Utils.nowTimeStr()}</div>
              </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; flex-wrap: wrap;">
              <div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #0f766e;">Company: ${company.name}</div>
                <div style="font-size: 0.82rem; color: #475569; margin-top: 2px;">Contact: ${company.contactPerson || 'N/A'} | Phone: ${company.phone || 'N/A'}</div>
                <div style="font-size: 0.82rem; color: #475569;">Time Period: <strong>${filterPeriod}</strong></div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.82rem; color: #64748b;">Remaining Payable: <strong style="color: #ef4444;">${Utils.formatCurrency(company.remainingPayable, settings.currency)}</strong></div>
                <div style="font-size: 0.82rem; color: #64748b;">Stock Cost Value: <strong>${Utils.formatCurrency(currentStockCostValue, settings.currency)}</strong></div>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 0.85rem; background: #f1f5f9; border: 1px solid #cbd5e1;">
              <thead>
                <tr style="background: #e2e8f0; font-weight: 800;">
                  <th style="padding: 8px; text-align: left;">Gross Revenue</th>
                  <th style="padding: 8px; text-align: left;">Cost of Goods (TP)</th>
                  <th style="padding: 8px; text-align: left;">Net ${isProfit ? 'Profit' : 'Loss'}</th>
                  <th style="padding: 8px; text-align: right;">Margin %</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 8px; font-weight: 800; color: #0f766e;">${Utils.formatCurrency(grossRevenue, settings.currency)}</td>
                  <td style="padding: 8px; font-weight: 700;">${Utils.formatCurrency(totalCOGS, settings.currency)}</td>
                  <td style="padding: 8px; font-weight: 800; color: ${isProfit ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(netProfit, settings.currency)}</td>
                  <td style="padding: 8px; text-align: right; font-weight: 800;">${profitMargin.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>

            <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f766e; margin: 0 0 8px 0;">Itemized Product Profit & Loss Breakdown</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-size: 0.8rem;">
                  <th style="padding: 6px; text-align: center;">#</th>
                  <th style="padding: 6px; text-align: left;">Item #</th>
                  <th style="padding: 6px; text-align: left;">Product Name</th>
                  <th style="padding: 6px; text-align: center;">Sold</th>
                  <th style="padding: 6px; text-align: center;">Stock</th>
                  <th style="padding: 6px; text-align: right;">TP</th>
                  <th style="padding: 6px; text-align: right;">Sale</th>
                  <th style="padding: 6px; text-align: right;">Revenue</th>
                  <th style="padding: 6px; text-align: right;">Cost</th>
                  <th style="padding: 6px; text-align: right;">Net P&L</th>
                </tr>
              </thead>
              <tbody>${itemsRows}</tbody>
            </table>

            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 0.8rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              <div>Prepared By: ___________________</div>
              <div>Authorized Stamp/Signature: ___________________</div>
            </div>
          </div>
        `;

          const container = document.getElementById('printable-invoice');
          if (container) {
            container.innerHTML = printHTML;
            setTimeout(() => { window.print(); }, 250);
          }
        }

        deleteCompany(id) {
          app.confirmDelete('Are you sure you want to delete this supplier company profile?', () => {
            storage.deleteCompany(id); app.showToast('Supplier company deleted.', 'info'); app.refreshCurrentView();
          });
        }

        openCompanyModal() {
          document.getElementById('comp-modal-title').textContent = 'Add Supplier Company';
          document.getElementById('company-form').reset();
          document.getElementById('comp-edit-id').value = '';
          app.openModal('company-modal');
        }

        openCompanyEditModal(id) {
          const c = storage.getCompanies().find(comp => comp.id === id);
          if (!c) return;
          document.getElementById('comp-modal-title').textContent = 'Edit Company Details';
          document.getElementById('comp-edit-id').value = c.id;
          document.getElementById('cm-name').value = c.name;
          document.getElementById('cm-person').value = c.contactPerson || '';
          document.getElementById('cm-phone').value = c.phone || '';
          document.getElementById('cm-whatsapp').value = c.whatsapp || '';
          document.getElementById('cm-email').value = c.email || '';
          document.getElementById('cm-opening').value = c.openingBalance || 0;
          document.getElementById('cm-address').value = c.address || '';
          document.getElementById('cm-notes').value = c.notes || '';
          app.openModal('company-modal');
        }

        saveCompanyForm() {
          const editId = document.getElementById('comp-edit-id').value;
          const data = {
            name: document.getElementById('cm-name').value, contactPerson: document.getElementById('cm-person').value,
            phone: document.getElementById('cm-phone').value, whatsapp: document.getElementById('cm-whatsapp').value,
            email: document.getElementById('cm-email').value, openingBalance: parseFloat(document.getElementById('cm-opening').value) || 0,
            address: document.getElementById('cm-address').value, notes: document.getElementById('cm-notes').value
          };

          if (editId) { storage.updateCompany(editId, data); app.showToast('Company info updated.', 'success'); }
          else { storage.addCompany(data); app.showToast('New company added.', 'success'); }
          app.closeModal('company-modal'); app.refreshCurrentView();
        }

        openSupplierPaymentModal() {
          const select = document.getElementById('spay-company-select');
          Utils.populateSelect(select, storage.getCompanies(), 'id', c => `${c.name} (Payable: ${Utils.formatCurrency(c.remainingPayable)})`, '', '-- Select Company --');
          document.getElementById('spay-date').value = Utils.todayStr();
          document.getElementById('supplier-payment-form').reset();
          document.getElementById('spay-date').value = Utils.todayStr();
          app.openModal('supplier-payment-modal');
        }

        openSupplierPaymentModalForCompany(compId) {
          this.openSupplierPaymentModal();
          document.getElementById('spay-company-select').value = compId;
        }

        saveSupplierPaymentForm() {
          const compId = document.getElementById('spay-company-select').value;
          const comp = storage.getCompanies().find(c => c.id === compId);
          if (!comp) return;

          storage.addSupplierPayment({
            companyId: comp.id, companyName: comp.name, amount: parseFloat(document.getElementById('spay-amount').value) || 0,
            date: document.getElementById('spay-date').value, method: document.getElementById('spay-method').value, reference: document.getElementById('spay-ref').value
          });

          app.showToast('Payment recorded for supplier company!', 'success');
          app.closeModal('supplier-payment-modal'); app.refreshCurrentView();
        }

        renderSupplierPayments() {
          const tbody = document.getElementById('supplier-payments-tbody');
          if (!tbody) return;

          const payments = storage.getSupplierPayments();
          const settings = storage.getSettings();

          if (!payments.length) { Utils.emptyTable(tbody, 6, 'No supplier payments recorded yet.'); return; }

          let html = '';
          payments.slice().reverse().forEach(p => {
            html += `
            <tr>
              <td>${p.date}</td>
              <td><span style="font-weight: 700;">${p.companyName}</span></td>
              <td>${Utils.badge(p.method)}</td>
              <td style="font-weight: 800; color: var(--primary);">${Utils.formatCurrency(p.amount, settings.currency)}</td>
              <td>${p.reference || '-'}</td>
              <td>${p.notes || '-'}</td>
            </tr>
          `;
          });
          tbody.innerHTML = html;
        }
      }

      var purchasesModule = window.purchasesModule || new PurchasesModule();


      /* ==================== SALES & CUSTOMER MODULE ==================== */

if (typeof global !== 'undefined') {
  global.PurchasesModule = PurchasesModule;
}
if (typeof window !== 'undefined') {
  window.PurchasesModule = PurchasesModule;
  window.purchasesModule = window.purchasesModule || new PurchasesModule();
}
