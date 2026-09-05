/* ==================== MAIN APP CONTROLLER & VIEW ROUTER ==================== */
class App {
        constructor() {
          this.currentView = 'dashboard-view';
          this.salesChart = null;
          this.deleteCallback = null;
        }

        init() {
          this.bindEvents();
          this.loadShopBranding();
          if (typeof billingModule !== 'undefined' && typeof billingModule.initView === 'function') billingModule.initView();
          if (typeof purchasesModule !== 'undefined' && typeof purchasesModule.initPurchaseForm === 'function') purchasesModule.initPurchaseForm();
          if (typeof salesModule !== 'undefined' && typeof salesModule.renderSalesHistory === 'function') salesModule.renderSalesHistory();
          if (typeof salesModule !== 'undefined' && typeof salesModule.renderReturnsView === 'function') salesModule.renderReturnsView();
          if (typeof productsModule !== 'undefined' && typeof productsModule.renderProducts === 'function') productsModule.renderProducts();
          if (typeof expensesModule !== 'undefined' && typeof expensesModule.renderExpensesView === 'function') expensesModule.renderExpensesView();
          this.refreshCurrentView();
        }

        bindEvents() {
          const sbToggle = document.getElementById('sidebar-toggle');
          if (sbToggle) sbToggle.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));

          document.querySelectorAll('.menu-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => { e.preventDefault(); this.switchView(item.getAttribute('data-view')); });
          });

          const lowBtn = document.getElementById('btn-low-stock-alert');
          if (lowBtn) lowBtn.addEventListener('click', () => this.switchView('inventory-view'));
          const expBtn = document.getElementById('btn-expiry-alert');
          if (expBtn) expBtn.addEventListener('click', () => this.switchView('expiry-view'));

          const chartFilter = document.getElementById('dash-chart-filter');
          if (chartFilter) chartFilter.addEventListener('change', () => this.renderDashboardChart());

          const delBtn = document.getElementById('btn-confirm-delete-action');
          if (delBtn) delBtn.addEventListener('click', () => {
            if (typeof this.deleteCallback === 'function') { this.deleteCallback(); this.closeModal('delete-confirm-modal'); }
          });

          const settingsForm = document.getElementById('settings-form');
          if (settingsForm) settingsForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveSettings(); });

          const expDataBtn = document.getElementById('btn-export-data');
          if (expDataBtn) expDataBtn.addEventListener('click', () => this.exportDataBackup());
          const impDataBtn = document.getElementById('btn-import-data');
          if (impDataBtn) impDataBtn.addEventListener('click', () => this.importDataBackup());

          // Ctrl + K Global Shortcut for Quick Product Search
          document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault();
              const dashInput = document.getElementById('dash-product-search');
              if (dashInput) {
                if (this.currentView !== 'dashboard-view') this.switchView('dashboard-view');
                dashInput.focus();
                dashInput.select();
              }
            }
          });

          // Ctrl + S Global Shortcut for Saving (Without Printing)
          document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
              e.preventDefault();

              // 1. In Billing / POS View: save invoice only without printing
              if (this.currentView === 'billing-view') {
                if (window.billingModule && window.billingModule.cartItems && window.billingModule.cartItems.length > 0) {
                  window.billingModule.completeSaleOnly();
                } else {
                  this.showToast('Please add medicines to bill before saving invoice.', 'warning');
                }
                return;
              }

              // 2. If Product / Purchase modal is active, trigger save
              const activeModal = document.querySelector('.modal-backdrop-myu.active, .modal-backdrop-myu.show');
              if (activeModal) {
                const saveBtn = activeModal.querySelector('#btn-save-purchase-invoice, #btn-save-product, #btn-save-customer, button[type="submit"]');
                if (saveBtn) {
                  saveBtn.click();
                  return;
                }
              }

              // 3. General Fallback
              if (window.billingModule && window.billingModule.cartItems && window.billingModule.cartItems.length > 0) {
                this.switchView('billing-view');
                window.billingModule.completeSaleOnly();
              }
            }
          });

          // Ctrl + P Global Shortcut for Printing Invoices / Reports
          document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
              e.preventDefault();

              // 1. If Wholesale Invoice Modal is open, trigger direct print
              const invModal = document.getElementById('invoice-modal');
              if (invModal && (invModal.classList.contains('show') || invModal.style.display === 'flex' || invModal.style.display === 'block')) {
                const printBtn = document.getElementById('btn-modal-print-invoice');
                if (printBtn) {
                  printBtn.click();
                  return;
                }
              }

              // 2. If Return Voucher Modal is open, trigger return print
              const retModal = document.getElementById('return-details-modal');
              if (retModal && (retModal.classList.contains('show') || retModal.style.display === 'flex' || retModal.style.display === 'block')) {
                if (window.salesModule && typeof window.salesModule.triggerPrintReturnVoucher === 'function') {
                  window.salesModule.triggerPrintReturnVoucher();
                  return;
                }
              }

              // 3. If Purchase Details Modal is open, trigger purchase print
              const purModal = document.getElementById('view-purchase-modal');
              if (purModal && (purModal.classList.contains('show') || purModal.style.display === 'flex' || purModal.style.display === 'block')) {
                const purPrintBtn = document.getElementById('btn-modal-print-purchase');
                if (purPrintBtn) {
                  purPrintBtn.click();
                  return;
                }
              }

              // 4. In Billing / POS View: complete sale and print invoice
              if (this.currentView === 'billing-view') {
                if (window.billingModule && window.billingModule.cartItems && window.billingModule.cartItems.length > 0) {
                  window.billingModule.completeSaleAndPrint();
                } else {
                  this.showToast('Please add medicines to bill before printing invoice.', 'warning');
                }
                return;
              }

              // 5. In Sales View: print latest sale if available
              if (this.currentView === 'sales-view') {
                const sales = storage.getSales ? storage.getSales() : [];
                if (sales.length > 0) {
                  const lastSale = sales[sales.length - 1];
                  if (window.salesModule && typeof window.salesModule.printInvoiceDirect === 'function') {
                    window.salesModule.printInvoiceDirect(lastSale.id || lastSale.invoiceNumber);
                    this.showToast(`Printing invoice: ${lastSale.invoiceNumber}`, 'info', 2000);
                    return;
                  }
                }
              }

              // 6. In Reports View
              if (this.currentView === 'reports-view') {
                if (window.reportsModule && typeof window.reportsModule.printReport === 'function') {
                  window.reportsModule.printReport();
                  return;
                }
              }

              // 7. General Fallback
              const printable = document.getElementById('printable-invoice');
              if (printable && printable.innerHTML.trim().length > 0) {
                window.print();
              } else if (window.billingModule && window.billingModule.cartItems && window.billingModule.cartItems.length > 0) {
                this.switchView('billing-view');
                window.billingModule.completeSaleAndPrint();
              } else {
                window.print();
              }
            }
          });

          // Universal Enter Key Navigation -> Moves focus to the next input field across all forms, tables & modals
          document.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;

            const target = e.target;
            if (!target) return;

            const tag = target.tagName ? target.tagName.toUpperCase() : '';
            const type = (target.type || '').toLowerCase();

            // Allow normal multi-line writing inside textarea elements
            if (tag === 'TEXTAREA') return;

            // Allow normal activation on buttons
            if (tag === 'BUTTON' || type === 'submit' || type === 'button') return;

            // Allow dropdown search selection if dropdown results are actively shown
            if (target.id === 'pos-product-search' || target.id === 'dash-product-search' || target.id === 'pur-product-search') {
              const dropdown = document.getElementById(target.id.replace('-product-search', '-search-results')) || document.getElementById('pos-search-results') || document.getElementById('dash-search-results');
              if (dropdown && dropdown.classList.contains('active') && dropdown.querySelector('.search-result-item, .dash-search-result-item')) {
                return; // Let medicine search selection handle Enter
              }
            }

            // Let POS cart table manage cell-to-cell navigation on Enter
            if (target.closest('#pos-cart-tbody')) {
              return;
            }

            // Only navigate for input and select controls
            if (tag !== 'INPUT' && tag !== 'SELECT') return;

            // Prevent default form submit or unintended page reload
            e.preventDefault();

            // Identify active scope: active modal, active form, table container, or active view page
            let container = null;
            const activeModal = document.querySelector('.modal-backdrop-myu.show, .modal-backdrop-myu[style*="display: flex"], .modal-backdrop-myu[style*="display: block"]');
            if (activeModal && activeModal.contains(target)) {
              container = activeModal.querySelector('.modal-box') || activeModal;
            } else if (target.closest('form')) {
              container = target.closest('form');
            } else if (target.closest('table')) {
              container = target.closest('.billing-container') || target.closest('.view-page:not(.hidden)') || target.closest('table');
            } else {
              container = document.querySelector('.view-page:not(.hidden)') || document.body;
            }

            if (!container) container = document.body;

            // Collect all potential focusable elements in logical DOM order
            const selector = 'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly]), button[type="submit"], button.btn-primary-myu:not([disabled]), #btn-complete-sale';
            const allElements = Array.from(container.querySelectorAll(selector));

            // Keep only visible and interactive elements
            const focusables = allElements.filter(el => {
              if (el.disabled || el.type === 'hidden') return false;
              if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });

            const currentIndex = focusables.indexOf(target);
            if (currentIndex !== -1 && currentIndex + 1 < focusables.length) {
              const nextEl = focusables[currentIndex + 1];
              nextEl.focus();
              if (typeof nextEl.select === 'function' && nextEl.tagName !== 'BUTTON' && nextEl.type !== 'checkbox' && nextEl.type !== 'radio' && nextEl.type !== 'date') {
                nextEl.select();
              }
            } else if (currentIndex !== -1 && currentIndex === focusables.length - 1) {
              // At the end of inputs, focus the primary submit / action button
              const submitBtn = container.querySelector('button[type="submit"], button.btn-primary-myu, #btn-complete-sale');
              if (submitBtn && submitBtn !== target) {
                submitBtn.focus();
              }
            }
          });

          // Dashboard Large Quick Product Search
          const dashSearchInput = document.getElementById('dash-product-search');
          const dashSearchDropdown = document.getElementById('dash-search-results');
          if (dashSearchInput && dashSearchDropdown) {
            this.selectedDashIndex = 0;
            dashSearchInput.addEventListener('input', (e) => {
              this.selectedDashIndex = 0;
              this.renderDashboardSearchResults(e.target.value.toLowerCase().trim());
            });
            dashSearchInput.addEventListener('keydown', (e) => {
              const items = Array.from(dashSearchDropdown.querySelectorAll('.dash-search-result-item'));
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (items.length > 0) {
                  this.selectedDashIndex = (this.selectedDashIndex + 1) % items.length;
                  this.highlightDashResult(items, this.selectedDashIndex);
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (items.length > 0) {
                  this.selectedDashIndex = (this.selectedDashIndex - 1 + items.length) % items.length;
                  this.highlightDashResult(items, this.selectedDashIndex);
                }
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (items.length > 0) {
                  const idx = (this.selectedDashIndex >= 0 && this.selectedDashIndex < items.length) ? this.selectedDashIndex : 0;
                  const targetItem = items[idx];
                  const prodId = targetItem ? targetItem.getAttribute('data-product-id') : null;
                  if (prodId) {
                    this.addProductToSaleFromDashboard(prodId);
                  }
                }
              } else if (e.key === 'Escape') {
                dashSearchDropdown.classList.remove('active');
              }
            });
            document.addEventListener('click', (e) => {
              if (dashSearchInput && dashSearchDropdown && !dashSearchInput.contains(e.target) && !dashSearchDropdown.contains(e.target)) {
                dashSearchDropdown.classList.remove('active');
              }
            });
          }

          const searchInput = document.getElementById('global-search-input');
          if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                const query = searchInput.value.trim().toLowerCase();
                if (query) {
                  this.switchView('products-view');
                  const pInput = document.getElementById('prod-search-input');
                  if (pInput) { pInput.value = query; productsModule.renderProducts(); }
                }
              }
            });
          }

          const btnRet = document.getElementById('btn-process-new-return');
          if (btnRet) {
            btnRet.addEventListener('click', (e) => {
              e.preventDefault();
              window.openProcessReturnModal();
            });
          }

          const retSearch = document.getElementById('ret-search');
          if (retSearch) {
            retSearch.addEventListener('input', () => salesModule.filterReturnsHistory());
          }
        }

        highlightDashResult(items, index) {
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

        setHoverDashIndex(idx) {
          this.selectedDashIndex = idx;
          const dropdown = document.getElementById('dash-search-results');
          if (!dropdown) return;
          const items = Array.from(dropdown.querySelectorAll('.dash-search-result-item'));
          this.highlightDashResult(items, idx);
        }

        renderDashboardSearchResults(query) {
          const dropdown = document.getElementById('dash-search-results');
          if (!dropdown) return;

          if (!query) { dropdown.classList.remove('active'); return; }

          const products = storage.getProducts();
          const settings = storage.getSettings();

          const filtered = products.filter(p => {
            return p.name.toLowerCase().includes(query) || (p.genericName || '').toLowerCase().includes(query) || p.itemNo.toLowerCase().includes(query) || (p.batchNumber || '').toLowerCase().includes(query) || (p.company || '').toLowerCase().includes(query);
          });

          if (!filtered.length) {
            dropdown.innerHTML = `<div style="padding: 14px; text-align: center; color: var(--text-muted);">No medicine found matching "${query}".</div>`;
            dropdown.classList.add('active'); return;
          }

          if (this.selectedDashIndex < 0 || this.selectedDashIndex >= filtered.length) {
            this.selectedDashIndex = 0;
          }

          let html = '';
          filtered.slice(0, 10).forEach((p, idx) => {
            const isOut = p.availableQty <= 0;
            const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
            const badgeText = isOut ? 'Out of Stock' : (isExpired ? 'EXPIRED' : `${p.availableQty} in stock`);
            const isSelected = idx === this.selectedDashIndex;
            const activeStyle = isSelected ? 'background-color: #ecfdf5; border-left: 4px solid var(--primary, #059669); outline: 1px solid #10b981;' : 'background-color: #ffffff; border-left: 4px solid transparent; outline: none;';

            html += `
            <div class="dash-search-result-item ${isSelected ? 'highlighted' : ''}" 
                 data-index="${idx}"
                 data-product-id="${p.id}"
                 onmouseenter="app.setHoverDashIndex(${idx});"
                 style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center; ${activeStyle}">
              <div style="flex: 1;" onclick="app.addProductToSaleFromDashboard('${p.id}')">
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">
                  ${p.name} <span style="font-size: 0.78rem; color: var(--primary); font-weight: 600;">(${p.itemNo})</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                  Company: <strong>${p.company || 'N/A'}</strong> | Batch: ${p.batchNumber || '-'} | Exp: ${p.expiryDate || '-'}
                </div>
              </div>
              <div style="text-align: right; margin-right: 8px;">
                <div style="font-size: 0.75rem; color: var(--text-muted);">TP: ${Utils.formatCurrency(p.tp, settings.currency)}</div>
                <div style="font-weight: 800; color: var(--primary); font-size: 1rem;">Sale: ${Utils.formatCurrency(p.salePrice, settings.currency)}</div>
                ${Utils.badge(badgeText)}
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="btn-secondary-myu btn-sm-myu" onclick="app.viewProductFromDash('${p.id}')">View</button>
                <button class="btn-primary-myu btn-sm-myu" onclick="app.addProductToSaleFromDashboard('${p.id}')" ${isOut ? 'disabled style="opacity:0.5;"' : ''}>
                  <i class="fa-solid fa-cart-plus"></i> Add to Sale
                </button>
              </div>
            </div>
          `;
          });

          dropdown.innerHTML = html;
          dropdown.classList.add('active');
        }

        viewProductFromDash(productId) {
          document.getElementById('dash-search-results').classList.remove('active');
          this.switchView('products-view');
          productsModule.openEditModal(productId);
        }

        addProductToSaleFromDashboard(productId) {
          const prod = storage.getProducts().find(p => p.id === productId);
          if (!prod) return;

          if (prod.availableQty <= 0) {
            this.showToast(`Cannot sell ${prod.name}! Item is Out of Stock (0 available).`, 'danger');
            return;
          }

          document.getElementById('dash-search-results').classList.remove('active');
          document.getElementById('dash-product-search').value = '';
          this.switchView('billing-view');
          billingModule.addProductToCart(productId);
        }

        createPurchaseForProduct(productId) {
          const prod = storage.getProducts().find(p => p.id === productId);
          if (!prod) return;

          this.switchView('purchases-view');
          const compSelect = document.getElementById('pur-company-select');
          if (compSelect && prod.company) {
            const comp = storage.getCompanies().find(c => c.name.toLowerCase() === prod.company.toLowerCase());
            if (comp) compSelect.value = comp.id;
          }

          if (purchasesModule.lineItems.length > 0) {
            purchasesModule.lineItems[0].productId = prod.id;
            purchasesModule.lineItems[0].itemNo = prod.itemNo;
            purchasesModule.lineItems[0].name = prod.name;
            purchasesModule.lineItems[0].batchNumber = prod.batchNumber || '';
            purchasesModule.lineItems[0].expiryDate = prod.expiryDate || '';
            purchasesModule.lineItems[0].tp = prod.tp || 0;
            purchasesModule.lineItems[0].discountPercent = prod.discount || 0;
            purchasesModule.updateLineCalculations(0);
            purchasesModule.renderPurchaseLineItemsTable();
            purchasesModule.calculatePurchaseTotals();
          }
          this.showToast(`Pre-filled purchase entry for ${prod.name}.`, 'info');
        }

        filterSalesToday() {
          this.switchView('sales-view');
          const dateInput = document.getElementById('sales-date-filter');
          if (dateInput) {
            dateInput.value = Utils.todayStr();
            salesModule.renderSalesHistory();
          }
        }

        openTodayProfitReport() {
          this.switchView('reports-view');
          const typeSelect = document.getElementById('report-type-select');
          if (typeSelect) {
            typeSelect.value = 'profit';
            reportsModule.generateReport();
          }
        }

        filterInventoryStatus(status) {
          this.switchView('inventory-view');
          const statusSelect = document.getElementById('inv-status-filter');
          if (statusSelect) {
            statusSelect.value = status;
            productsModule.renderInventory();
          }
        }

        toggleSidebar() {
          const sidebar = document.getElementById('sidebar');
          if (sidebar) sidebar.classList.toggle('collapsed');
        }

        handleLogoClick(e) {
          if (e) e.preventDefault();
          this.toggleSidebar();
          this.switchView('dashboard-view');
          return false;
        }

        toggleSidebarCategory(headerElem) {
          if (!headerElem) return;
          const content = headerElem.nextElementSibling;
          if (content && content.classList.contains('menu-category-content')) {
            const isOpen = headerElem.classList.contains('active');
            if (isOpen) {
              headerElem.classList.remove('active');
              content.classList.remove('active');
            } else {
              headerElem.classList.add('active');
              content.classList.add('active');
            }
          }
        }

        switchView(viewId) {
          document.querySelectorAll('.menu-item[data-view]').forEach(item => {
            if (item.getAttribute('data-view') === viewId) {
              item.classList.add('active');
              const parentContent = item.closest('.menu-category-content');
              if (parentContent) {
                parentContent.classList.add('active');
                const header = parentContent.previousElementSibling;
                if (header && header.classList.contains('menu-category-header')) {
                  header.classList.add('active');
                }
              }
            } else {
              item.classList.remove('active');
            }
          });
          document.querySelectorAll('.view-page').forEach(page => page.classList.add('hidden'));

          const target = document.getElementById(viewId);
          if (target) {
            target.classList.remove('hidden');
            this.currentView = viewId;
            this.refreshCurrentView();
          }
        }

        refreshCurrentView() {
          this.updateHeaderCounters();
          const salesMod = window.salesModule || (typeof salesModule !== 'undefined' ? salesModule : null);
          const billingMod = window.billingModule || (typeof billingModule !== 'undefined' ? billingModule : null);
          const purchasesMod = window.purchasesModule || (typeof purchasesModule !== 'undefined' ? purchasesModule : null);
          const productsMod = window.productsModule || (typeof productsModule !== 'undefined' ? productsModule : null);
          const expensesMod = window.expensesModule || (typeof expensesModule !== 'undefined' ? expensesModule : null);
          const reportsMod = window.reportsModule || (typeof reportsModule !== 'undefined' ? reportsModule : null);

          switch (this.currentView) {
            case 'dashboard-view': this.renderDashboard(); break;
            case 'billing-view': if (billingMod && typeof billingMod.initView === 'function') billingMod.initView(); break;
            case 'sales-view': if (salesMod && typeof salesMod.renderSalesHistory === 'function') salesMod.renderSalesHistory(); break;
            case 'returns-view': if (salesMod && typeof salesMod.renderReturnsView === 'function') salesMod.renderReturnsView(); break;
            case 'products-view': if (productsMod && typeof productsMod.renderProducts === 'function') productsMod.renderProducts(); break;
            case 'inventory-view': if (productsMod && typeof productsMod.renderInventory === 'function') productsMod.renderInventory(); break;
            case 'expiry-view': if (productsMod && typeof productsMod.renderExpiry === 'function') productsMod.renderExpiry(); break;
            case 'purchases-view': if (purchasesMod && typeof purchasesMod.initPurchaseForm === 'function') purchasesMod.initPurchaseForm(); break;
            case 'purchase-history-view': if (purchasesMod && typeof purchasesMod.renderPurchaseHistory === 'function') purchasesMod.renderPurchaseHistory(); break;
            case 'companies-view': if (purchasesMod && typeof purchasesMod.renderCompanies === 'function') purchasesMod.renderCompanies(); break;
            case 'customers-view': if (salesMod && typeof salesMod.renderCustomers === 'function') salesMod.renderCustomers(); break;
            case 'supplier-payments-view': if (purchasesMod && typeof purchasesMod.renderSupplierPayments === 'function') purchasesMod.renderSupplierPayments(); break;
            case 'customer-payments-view': if (salesMod && typeof salesMod.renderCustomerPayments === 'function') salesMod.renderCustomerPayments(); break;
            case 'pnl-expenses-view': if (expensesMod && typeof expensesMod.renderExpensesView === 'function') expensesMod.renderExpensesView(); break;
            case 'reports-view': if (reportsMod && typeof reportsMod.generateReport === 'function') reportsMod.generateReport(); break;
            case 'settings-view': this.loadSettingsForm(); break;
          }
        }

        loadShopBranding() {
          const s = storage.getSettings();
          const sbName = document.getElementById('sidebar-shop-name');
          if (sbName) sbName.textContent = s.shopName.split(" ")[0] + " Wholesale";
          const navInfo = document.getElementById('nav-shop-info');
          if (navInfo) navInfo.textContent = `${s.shopName} - ${s.address}`;
        }

        updateHeaderCounters() {
          const stats = storage.getDashboardStats();
          const expiryStatus = storage.getExpiryStatus();

          const lowElem = document.getElementById('counter-low-stock');
          if (lowElem) lowElem.textContent = stats.lowStockCount + stats.outOfStockCount;
          const expElem = document.getElementById('counter-expiry-alert');
          if (expElem) expElem.textContent = expiryStatus.expired.length + expiryStatus.within30.length;
        }

        renderDashboard() {
          const stats = storage.getDashboardStats();
          const settings = storage.getSettings();
          const sales = storage.getSales();
          const purchases = storage.getPurchases();
          const products = storage.getProducts();
          const customers = storage.getCustomers();
          const companies = storage.getCompanies();
          const expiryStatus = storage.getExpiryStatus();

          const todayStr = Utils.todayStr(0);
          const todaySales = sales.filter(s => s.date === todayStr);

          // 4 Primary Metric Cards
          const tsElem = document.getElementById('dash-today-sales');
          if (tsElem) tsElem.textContent = Utils.formatCurrency(stats.todaySales, settings.currency);
          const tscElem = document.getElementById('dash-today-sales-count');
          if (tscElem) tscElem.textContent = `${todaySales.length} Invoices today`;
          const tpElem = document.getElementById('dash-today-profit');
          if (tpElem) tpElem.textContent = Utils.formatCurrency(stats.todayProfit, settings.currency);
          const custElem = document.getElementById('dash-customer-receivables');
          if (custElem) custElem.textContent = Utils.formatCurrency(stats.customerReceivables, settings.currency);
          const compElem = document.getElementById('dash-company-payables');
          if (compElem) compElem.textContent = Utils.formatCurrency(stats.companyPayables, settings.currency);

          // Stock Overview Strip
          const tpCountElem = document.getElementById('dash-total-products');
          if (tpCountElem) tpCountElem.textContent = stats.totalProducts;
          const taqElem = document.getElementById('dash-total-available-qty');
          if (taqElem) taqElem.textContent = `${stats.totalAvailableQty.toLocaleString()} Units`;
          const lscElem = document.getElementById('dash-low-stock-count');
          if (lscElem) lscElem.textContent = stats.lowStockCount;
          const oscElem = document.getElementById('dash-out-stock-count');
          if (oscElem) oscElem.textContent = stats.outOfStockCount;
          const nreElem = document.getElementById('dash-near-expiry-count');
          if (nreElem) nreElem.textContent = expiryStatus.expired.length + expiryStatus.within30.length;

          this.renderDashboardLowStockAlerts();
          this.renderDashboardExpiryAlerts();
        }

        renderDashboardLowStockAlerts() {
          const container = document.getElementById('dash-low-stock-alert-list');
          if (!container) return;

          const products = storage.getProducts();
          const settings = storage.getSettings();

          const lowProds = products.filter(p => p.availableQty <= (p.minStockLevel || settings.minStockAlert));

          if (!lowProds.length) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> All products are sufficiently stocked!</div>`;
            return;
          }

          let html = '';
          lowProds.slice(0, 5).forEach(p => {
            const isOut = p.availableQty <= 0;
            html += `
            <div class="dash-alert-card-item">
              <div>
                <div style="font-weight: 700; font-size: 0.88rem; color: ${isOut ? '#ef4444' : '#d97706'};">
                  ${p.name}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  Avail: <strong style="color: ${isOut ? '#ef4444' : '#d97706'};">${p.availableQty}</strong> | Min Required: ${p.minStockLevel || 10}
                </div>
              </div>
              <div style="display: flex; gap: 4px;">
                <button class="btn-secondary-myu btn-sm-myu" onclick="app.viewProductFromDash('${p.id}')">View</button>
                <button class="btn-primary-myu btn-sm-myu" onclick="app.createPurchaseForProduct('${p.id}')">
                  <i class="fa-solid fa-cart-flatbed"></i> Purchase
                </button>
              </div>
            </div>
          `;
          });

          container.innerHTML = html;
        }

        renderDashboardExpiryAlerts() {
          const container = document.getElementById('dash-expiry-alert-list');
          if (!container) return;

          const expiryStatus = storage.getExpiryStatus();
          const urgent = [...expiryStatus.expired, ...expiryStatus.within30];

          if (!urgent.length) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> No expired or near-expiry medicines!</div>`;
            return;
          }

          let html = '';
          urgent.slice(0, 5).forEach(p => {
            const isExpired = p.daysRemaining < 0;
            html += `
            <div class="dash-alert-card-item" style="background: ${isExpired ? '#fff5f5' : '#ffffff'};">
              <div>
                <div style="font-weight: 700; font-size: 0.88rem; color: ${isExpired ? '#ef4444' : '#f59e0b'};">
                  ${p.name}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  Batch: ${p.batchNumber || '-'} | Exp: <strong>${p.expiryDate}</strong> (${isExpired ? 'EXPIRED' : p.daysRemaining + ' days remaining'})
                </div>
              </div>
              <div>
                ${Utils.badge(isExpired ? 'EXPIRED' : `Exp ${p.daysRemaining}d`, isExpired ? 'badge-expired' : '')}
              </div>
            </div>
          `;
          });

          container.innerHTML = html;
        }

        renderDashboardTodaySalesTable() {
          const tbody = document.getElementById('dash-today-sales-tbody');
          if (!tbody) return;

          const settings = storage.getSettings();
          const todayStr = Utils.todayStr(0);
          const todaySales = storage.getSales().filter(s => s.date === todayStr);

          if (!todaySales.length) {
            Utils.emptyTable(tbody, 7, 'No sales transactions recorded today yet.');
            return;
          }

          let html = '';
          todaySales.slice().reverse().slice(0, 5).forEach(s => {
            html += `
            <tr>
              <td><span style="font-weight: 700; color: var(--primary);">${s.invoiceNumber}</span></td>
              <td><div style="font-weight: 700;">${s.customerName}</div></td>
              <td>${s.items.length} Items</td>
              <td style="font-weight: 800; color: var(--primary);">${Utils.formatCurrency(s.netAmount, settings.currency)}</td>
              <td>${Utils.badge(s.status)}</td>
              <td style="font-size: 0.78rem; color: var(--text-muted);">${s.time || ''}</td>
              <td>
                <button class="btn-secondary-myu btn-sm-myu" onclick="salesModule.viewInvoiceModal('${s.id}')">View</button>
              </td>
            </tr>
          `;
          });

          tbody.innerHTML = html;
        }

        renderDashboardRecentPurchasesTable() {
          const tbody = document.getElementById('dash-recent-purchases-tbody');
          if (!tbody) return;

          const settings = storage.getSettings();
          const purchases = storage.getPurchases().slice().reverse().slice(0, 5);

          if (!purchases.length) {
            Utils.emptyTable(tbody, 5, 'No stock purchases recorded yet.');
            return;
          }

          let html = '';
          purchases.forEach(p => {
            html += `
            <tr>
              <td><span style="font-weight: 700; color: var(--primary);">${p.purchaseNumber}</span></td>
              <td><div style="font-weight: 700;">${p.companyName}</div></td>
              <td style="font-weight: 700;">${Utils.formatCurrency(p.grandTotal, settings.currency)}</td>
              <td style="color: #059669;">${Utils.formatCurrency(p.paidAmount, settings.currency)}</td>
              <td style="font-size: 0.78rem; color: var(--text-muted);">${p.date}</td>
            </tr>
          `;
          });

          tbody.innerHTML = html;
        }

        renderDashboardMoneyCollectPay() {
          const custContainer = document.getElementById('dash-customers-collect-list');
          const suppContainer = document.getElementById('dash-suppliers-pay-list');
          const settings = storage.getSettings();

          // Customers to Collect
          if (custContainer) {
            const custs = storage.getCustomers().filter(c => (c.remainingBalance || 0) > 0).sort((a, b) => b.remainingBalance - a.remainingBalance);
            if (!custs.length) {
              custContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 16px; font-size: 0.82rem;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> No outstanding customer credit!</div>`;
            } else {
              let cHtml = '';
              custs.slice(0, 4).forEach(c => {
                cHtml += `
                <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">${c.name}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${c.shopName || 'Pharmacy'}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 800; color: #ef4444; font-size: 0.9rem;">${Utils.formatCurrency(c.remainingBalance, settings.currency)}</div>
                    <button class="btn-primary-myu btn-sm-myu" onclick="salesModule.openCustomerPaymentModalForCust('${c.id}')" style="padding: 2px 8px; font-size: 0.72rem; margin-top: 2px;">Receive</button>
                  </div>
                </div>
              `;
              });
              custContainer.innerHTML = cHtml;
            }
          }

          // Suppliers to Pay
          if (suppContainer) {
            const supps = storage.getCompanies().filter(c => (c.remainingPayable || 0) > 0).sort((a, b) => b.remainingPayable - a.remainingPayable);
            if (!supps.length) {
              suppContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 16px; font-size: 0.82rem;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> All supplier balances cleared!</div>`;
            } else {
              let sHtml = '';
              supps.slice(0, 4).forEach(c => {
                sHtml += `
                <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">${c.name}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${c.contactPerson || 'Company'}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 800; color: #ef4444; font-size: 0.9rem;">${Utils.formatCurrency(c.remainingPayable, settings.currency)}</div>
                    <button class="btn-primary-myu btn-sm-myu" onclick="purchasesModule.openSupplierPaymentModalForCompany('${c.id}')" style="padding: 2px 8px; font-size: 0.72rem; margin-top: 2px;">Pay</button>
                  </div>
                </div>
              `;
              });
              suppContainer.innerHTML = sHtml;
            }
          }
        }

        renderDashboardChart() {
          const canvas = document.getElementById('dashboardSalesChart');
          if (!canvas) return;

          const sales = storage.getSales();
          const returns = storage.getReturns();
          const filter = document.getElementById('dash-chart-filter').value || 'thisMonth';

          let labels = [], salesData = [], profitData = [];

          if (filter === 'last7') {
            for (let i = 6; i >= 0; i--) {
              const d = new Date(); d.setDate(d.getDate() - i);
              const dateStr = d.toISOString().split('T')[0];
              labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
              const daySales = sales.filter(s => s.date === dateStr);
              const dayReturns = returns.filter(r => r.date === dateStr);
              const sNet = daySales.reduce((a, b) => a + (b.netAmount || 0), 0) - dayReturns.reduce((a, b) => a + (b.totalRefundAmount || 0), 0);
              const sProf = daySales.reduce((a, b) => a + (b.totalProfit || 0), 0) - dayReturns.reduce((a, b) => a + (b.totalProfitReversed || 0), 0);
              salesData.push(Utils.round(Math.max(0, sNet)));
              profitData.push(Utils.round(sProf));
            }
          } else if (filter === 'thisMonth') {
            const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            const yearMonth = new Date().toISOString().substring(0, 7);
            for (let day = 1; day <= days; day++) {
              const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
              labels.push(`Day ${day}`);
              const daySales = sales.filter(s => s.date === dateStr);
              const dayReturns = returns.filter(r => r.date === dateStr);
              const sNet = daySales.reduce((a, b) => a + (b.netAmount || 0), 0) - dayReturns.reduce((a, b) => a + (b.totalRefundAmount || 0), 0);
              const sProf = daySales.reduce((a, b) => a + (b.totalProfit || 0), 0) - dayReturns.reduce((a, b) => a + (b.totalProfitReversed || 0), 0);
              salesData.push(Utils.round(Math.max(0, sNet)));
              profitData.push(Utils.round(sProf));
            }
          } else if (filter === 'thisYear') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const yearStr = new Date().getFullYear().toString();
            months.forEach((m, idx) => {
              labels.push(m);
              const monthPrefix = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
              const monthSales = sales.filter(s => (s.date || '').startsWith(monthPrefix));
              const monthReturns = returns.filter(r => (r.date || '').startsWith(monthPrefix));
              const sNet = monthSales.reduce((a, b) => a + (b.netAmount || 0), 0) - monthReturns.reduce((a, b) => a + (b.totalRefundAmount || 0), 0);
              const sProf = monthSales.reduce((a, b) => a + (b.totalProfit || 0), 0) - monthReturns.reduce((a, b) => a + (b.totalProfitReversed || 0), 0);
              salesData.push(Utils.round(Math.max(0, sNet)));
              profitData.push(Utils.round(sProf));
            });
          }

          if (this.salesChart) this.salesChart.destroy();
          const ctx = canvas.getContext('2d');
          this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [
                { label: 'Sales Revenue (Rs.)', data: salesData, borderColor: '#0f766e', backgroundColor: 'rgba(15, 118, 110, 0.1)', fill: true, tension: 0.3, borderWidth: 3 },
                { label: 'Profit (Rs.)', data: profitData, borderColor: '#10b981', backgroundColor: 'transparent', borderDash: [5, 5], tension: 0.3, borderWidth: 2 }
              ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
          });
        }

        loadSettingsForm() {
          const s = storage.getSettings();
          document.getElementById('set-shop-name').value = s.shopName || '';
          document.getElementById('set-shop-address').value = s.address || '';
          document.getElementById('set-shop-phone').value = s.phone || '';
          document.getElementById('set-shop-whatsapp').value = s.whatsapp || '';
          document.getElementById('set-currency').value = s.currency || 'Rs.';
          document.getElementById('set-min-stock').value = s.minStockAlert || 15;
          document.getElementById('set-invoice-footer').value = s.invoiceFooter || '';
        }

        saveSettings() {
          storage.saveSettings({
            shopName: document.getElementById('set-shop-name').value,
            address: document.getElementById('set-shop-address').value,
            phone: document.getElementById('set-shop-phone').value,
            whatsapp: document.getElementById('set-shop-whatsapp').value,
            currency: document.getElementById('set-currency').value,
            minStockAlert: parseInt(document.getElementById('set-min-stock').value) || 15,
            invoiceFooter: document.getElementById('set-invoice-footer').value
          });
          this.loadShopBranding();
          this.showToast('Shop Settings updated successfully!', 'success');
        }

        exportDataBackup() {
          const jsonStr = storage.exportJSON();
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `MYU_Wholesale_Backup_${Utils.todayStr()}.json`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.showToast('Backup JSON file downloaded successfully!', 'success');
        }

        importDataBackup() {
          const fileInput = document.getElementById('import-json-file');
          if (!fileInput.files || !fileInput.files[0]) { this.showToast('Please select a valid JSON backup file first.', 'warning'); return; }
          var reader = window.reader || new FileReader();
          reader.onload = (e) => {
            if (storage.importJSON(e.target.result)) {
              this.showToast('Database restored successfully from backup!', 'success');
              this.loadShopBranding(); this.refreshCurrentView();
            } else { this.showToast('Failed to import data. Invalid JSON structure.', 'danger'); }
          };
          reader.readAsText(fileInput.files[0]);
        }

        clearAllDummyData() {
          if (window.confirm("⚠️ Are you SURE you want to clear ALL dummy data?\n\nThis will wipe out all demo products, sales, purchases, customers, companies, expenses, and returns so you can start entering real data.")) {
            if (window.storage && typeof window.storage.clearAllData === 'function') {
              window.storage.clearAllData();
            } else {
              localStorage.clear();
              localStorage.setItem('myu_demo_cleared_v1', 'true');
            }
            alert("✅ All dummy data has been removed! The page will now reload with a clean database.");
            window.location.reload();
          }
        }

        openModal(modalId) {
          const m = document.getElementById(modalId);
          if (m) {
            m.style.display = 'flex';
            m.classList.add('show');
            m.style.opacity = '1';
            m.style.visibility = 'visible';
            m.style.pointerEvents = 'auto';
          }
        }

        closeModal(modalId) {
          const m = document.getElementById(modalId);
          if (m) {
            m.classList.remove('show');
            m.style.display = 'none';
            m.style.opacity = '';
            m.style.visibility = '';
            m.style.pointerEvents = '';
          }
          if (modalId === 'delete-confirm-modal') {
            this.deleteCallback = null;
          }
        }

        confirmDelete(msg, onConfirm) {
          const msgElem = document.getElementById('delete-modal-msg');
          if (msgElem) msgElem.textContent = msg;
          this.deleteCallback = onConfirm;
          this.openModal('delete-confirm-modal');
        }

        showToast(msg, type = 'info', duration = 3500) {
          const container = document.getElementById('toast-container');
          if (!container) return;
          const toast = document.createElement('div');
          toast.className = `toast-myu ${type}`;
          let icon = type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-circle-xmark' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'));
          toast.innerHTML = `<i class="fa-solid ${icon}"></i><span style="font-size: 0.88rem; font-weight: 500; color: var(--text-main);">${msg}</span>`;
          container.appendChild(toast);
          setTimeout(() => {
            toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
          }, duration);
        }
      }
if (typeof global !== 'undefined') {
  global.App = App;
}
if (typeof window !== 'undefined') {
  window.App = App;
  window.openModal = function(id) {
    if (window.app && typeof window.app.openModal === 'function') {
      window.app.openModal(id);
    } else {
      const m = document.getElementById(id);
      if (m) {
        m.style.display = 'flex';
        m.classList.add('show');
        m.style.opacity = '1';
        m.style.visibility = 'visible';
        m.style.pointerEvents = 'auto';
      }
    }
  };
  window.closeModal = function(id) {
    if (window.app && typeof window.app.closeModal === 'function') {
      window.app.closeModal(id);
    } else {
      const m = document.getElementById(id);
      if (m) {
        m.classList.remove('show');
        m.style.display = 'none';
        m.style.opacity = '';
        m.style.visibility = '';
        m.style.pointerEvents = '';
      }
    }
  };
}
