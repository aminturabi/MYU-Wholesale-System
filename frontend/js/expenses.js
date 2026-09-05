/* ==================== EXPENSES & MANUAL INCOME MODULE ==================== */
class ExpensesModule {
        constructor() {
          this.currentPeriod = 'thisMonth';
          this.activeTab = 'expenses';
        }

        setPeriodFilter(period, btnElem) {
          this.currentPeriod = period;
          document.querySelectorAll('.pnl-range-btn').forEach(btn => btn.classList.remove('active'));
          if (btnElem) btnElem.classList.add('active');

          const customContainer = document.getElementById('pnl-custom-date-container');
          if (customContainer) {
            customContainer.style.display = period === 'custom' ? 'flex' : 'none';
          }

          if (period !== 'custom') {
            this.renderExpensesView();
          }
        }

        switchLedgerTab(tab) {
          this.activeTab = tab;
          const expBtn = document.getElementById('pnl-tab-expenses-btn');
          const incBtn = document.getElementById('pnl-tab-incomes-btn');
          if (expBtn && incBtn) {
            if (tab === 'expenses') {
              expBtn.classList.add('active');
              incBtn.classList.remove('active');
            } else {
              incBtn.classList.add('active');
              expBtn.classList.remove('active');
            }
          }
          this.renderExpensesTable();
        }

        openAddExpenseModal() {
          const form = document.getElementById('expense-form');
          if (form && typeof form.reset === 'function') form.reset();
          const dateInput = document.getElementById('exp-date');
          if (dateInput) dateInput.value = Utils.todayStr();
          const appObj = window.app || (typeof app !== 'undefined' ? app : null);
          if (appObj && typeof appObj.openModal === 'function') {
            appObj.openModal('expense-modal');
          } else {
            const m = document.getElementById('expense-modal');
            if (m) { m.style.display = 'flex'; m.classList.add('show'); }
          }
        }

        openAddIncomeModal() {
          const form = document.getElementById('income-form');
          if (form && typeof form.reset === 'function') form.reset();
          const dateInput = document.getElementById('inc-date');
          if (dateInput) dateInput.value = Utils.todayStr();
          const appObj = window.app || (typeof app !== 'undefined' ? app : null);
          if (appObj && typeof appObj.openModal === 'function') {
            appObj.openModal('income-modal');
          } else {
            const m = document.getElementById('income-modal');
            if (m) { m.style.display = 'flex'; m.classList.add('show'); }
          }
        }

        saveExpenseForm(e) {
          if (e) e.preventDefault();
          const date = (document.getElementById('exp-date') ? document.getElementById('exp-date').value : '') || Utils.todayStr();
          const category = (document.getElementById('exp-category') ? document.getElementById('exp-category').value : '') || 'Office Expense';
          const title = (document.getElementById('exp-title') ? document.getElementById('exp-title').value.trim() : '');
          const amount = parseFloat(document.getElementById('exp-amount') ? document.getElementById('exp-amount').value : 0) || 0;
          const paymentMethod = (document.getElementById('exp-payment-method') ? document.getElementById('exp-payment-method').value : '') || 'Cash';
          const notes = (document.getElementById('exp-notes') ? document.getElementById('exp-notes').value.trim() : '');
          const appObj = window.app || (typeof app !== 'undefined' ? app : null);

          if (!title) {
            if (appObj && typeof appObj.showToast === 'function') appObj.showToast('Please enter an expense title / description.', 'warning');
            return;
          }

          if (amount <= 0 || isNaN(amount)) {
            if (appObj && typeof appObj.showToast === 'function') appObj.showToast('Please enter a valid expense amount (> 0).', 'warning');
            return;
          }

          storage.addExpense({ date, category, title, amount, paymentMethod, notes });
          if (appObj) {
            if (typeof appObj.showToast === 'function') appObj.showToast('New expense recorded successfully!', 'success');
            if (typeof appObj.closeModal === 'function') appObj.closeModal('expense-modal');
          }
          this.renderExpensesView();
          if (appObj && typeof appObj.refreshCurrentView === 'function') appObj.refreshCurrentView();
        }

        saveIncomeForm(e) {
          if (e) e.preventDefault();
          const date = (document.getElementById('inc-date') ? document.getElementById('inc-date').value : '') || Utils.todayStr();
          const category = (document.getElementById('inc-category') ? document.getElementById('inc-category').value : '') || 'Other Income';
          const title = (document.getElementById('inc-title') ? document.getElementById('inc-title').value.trim() : '');
          const amount = parseFloat(document.getElementById('inc-amount') ? document.getElementById('inc-amount').value : 0) || 0;
          const notes = (document.getElementById('inc-notes') ? document.getElementById('inc-notes').value.trim() : '');
          const appObj = window.app || (typeof app !== 'undefined' ? app : null);

          if (!title) {
            if (appObj && typeof appObj.showToast === 'function') appObj.showToast('Please enter an income title / description.', 'warning');
            return;
          }

          if (amount <= 0 || isNaN(amount)) {
            if (appObj && typeof appObj.showToast === 'function') appObj.showToast('Please enter a valid income amount (> 0).', 'warning');
            return;
          }

          storage.addManualIncome({ date, category, title, amount, notes });
          if (appObj) {
            if (typeof appObj.showToast === 'function') appObj.showToast('New income record saved!', 'success');
            if (typeof appObj.closeModal === 'function') appObj.closeModal('income-modal');
          }
          this.renderExpensesView();
          if (appObj && typeof appObj.refreshCurrentView === 'function') appObj.refreshCurrentView();
        }

        deleteExpense(id) {
          const appObj = window.app || (typeof app !== 'undefined' ? app : null);
          const proceed = () => {
            storage.deleteExpense(id);
            if (appObj && typeof appObj.showToast === 'function') appObj.showToast('Expense record deleted.', 'info');
            this.renderExpensesView();
            if (appObj && typeof appObj.refreshCurrentView === 'function') appObj.refreshCurrentView();
          };
          if (appObj && typeof appObj.confirmDelete === 'function') {
            appObj.confirmDelete('Are you sure you want to delete this expense record?', proceed);
          } else if (typeof confirm !== 'undefined' ? confirm('Are you sure you want to delete this expense record?') : true) {
            proceed();
          }
        }

        deleteIncome(id) {
          const appObj = window.app || (typeof app !== 'undefined' ? app : null);
          const proceed = () => {
            storage.deleteManualIncome(id);
            if (appObj && typeof appObj.showToast === 'function') appObj.showToast('Income record deleted.', 'info');
            this.renderExpensesView();
            if (appObj && typeof appObj.refreshCurrentView === 'function') appObj.refreshCurrentView();
          };
          if (appObj && typeof appObj.confirmDelete === 'function') {
            appObj.confirmDelete('Are you sure you want to delete this income record?', proceed);
          } else if (typeof confirm !== 'undefined' ? confirm('Are you sure you want to delete this income record?') : true) {
            proceed();
          }
        }

        getDateBounds() {
          const today = new Date();
          let startDate = null, endDate = null;

          if (this.currentPeriod === 'today') {
            const tStr = Utils.todayStr();
            startDate = tStr; endDate = tStr;
          } else if (this.currentPeriod === 'thisMonth') {
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            startDate = `${year}-${month}-01`;
            endDate = Utils.todayStr();
          } else if (this.currentPeriod === 'lastMonth') {
            const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const year = prevMonthDate.getFullYear();
            const month = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
            const lastDay = new Date(year, prevMonthDate.getMonth() + 1, 0).getDate();
            startDate = `${year}-${month}-01`;
            endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
          } else if (this.currentPeriod === 'thisYear') {
            const year = today.getFullYear();
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
          } else if (this.currentPeriod === 'all') {
            startDate = '1970-01-01';
            endDate = '2099-12-31';
          } else if (this.currentPeriod === 'custom') {
            startDate = (document.getElementById('pnl-start-date') && document.getElementById('pnl-start-date').value) || '1970-01-01';
            endDate = (document.getElementById('pnl-end-date') && document.getElementById('pnl-end-date').value) || '2099-12-31';
          }

          return { startDate, endDate };
        }

        filterByDateRange(items) {
          const { startDate, endDate } = this.getDateBounds();
          if (!startDate || !endDate) return items;
          return items.filter(item => {
            if (!item.date) return true;
            return item.date >= startDate && item.date <= endDate;
          });
        }

        renderExpensesView() {
          const settings = storage.getSettings();
          const sales = this.filterByDateRange(storage.getSales());
          const returns = this.filterByDateRange(storage.getReturns());
          const expenses = this.filterByDateRange(storage.getExpenses());
          const incomes = this.filterByDateRange(storage.getManualIncomes());

          // 9.1 & 9.2: Net Sales Revenue (Before Tax) and Net COGS
          let grossSalesRevenue = 0;
          let totalTaxCollected = 0;
          let originalCOGS = 0;
          let salesGrossProfit = 0;

          sales.forEach(s => {
            const taxAmt = parseFloat(s.tax) || 0;
            const netAmt = parseFloat(s.netAmount) || 0;
            const revBeforeTax = Math.max(0, netAmt - taxAmt);

            grossSalesRevenue += revBeforeTax;
            totalTaxCollected += taxAmt;

            let saleCogs = s.totalCOGS;
            if (saleCogs === undefined || isNaN(saleCogs)) {
              saleCogs = (s.items || []).reduce((acc, item) => {
                const q = parseInt(item.quantity) || 0;
                const b = parseInt(item.bonus) || 0;
                const tp = parseFloat(item.tp) || 0;
                return acc + ((q + b) * tp);
              }, 0);
            }
            originalCOGS += saleCogs;
            salesGrossProfit += (s.totalProfit !== undefined ? s.totalProfit : (revBeforeTax - saleCogs));
          });

          let totalReturnsRevenue = 0;
          let totalReturnsTax = 0;
          let totalReturnedCOGS = 0;
          let totalReturnsProfitReversed = 0;

          returns.forEach(r => {
            const retTax = r.totalTaxReversed !== undefined ? parseFloat(r.totalTaxReversed) : 0;
            const retRefund = parseFloat(r.totalRefundAmount) || 0;
            const retRev = r.totalRevenueReversed !== undefined ? parseFloat(r.totalRevenueReversed) : Math.max(0, retRefund - retTax);

            totalReturnsRevenue += retRev;
            totalReturnsTax += retTax;

            let retCogs = r.totalCogsReversed;
            if (retCogs === undefined || isNaN(retCogs)) {
              retCogs = (r.items || []).reduce((acc, item) => {
                const rq = parseInt(item.returnQty) || 0;
                const tp = parseFloat(item.tradePrice) || 0;
                return acc + (rq * tp);
              }, 0);
            }
            totalReturnedCOGS += retCogs;
            totalReturnsProfitReversed += (r.totalProfitReversed !== undefined ? r.totalProfitReversed : (retRev - retCogs));
          });

          grossSalesRevenue = Utils.round(grossSalesRevenue);
          totalReturnsRevenue = Utils.round(totalReturnsRevenue);
          const netSalesRevenue = Math.max(0, Utils.round(grossSalesRevenue - totalReturnsRevenue));

          originalCOGS = Utils.round(originalCOGS);
          totalReturnedCOGS = Utils.round(totalReturnedCOGS);
          const netCOGS = Math.max(0, Utils.round(originalCOGS - totalReturnedCOGS));

          // 9.3 Gross Profit = Net Sales Revenue - Net COGS (Government Tax excluded)
          const grossProfit = Utils.round(netSalesRevenue - netCOGS);

          // 9.4 Other Business Income
          let totalOtherIncome = 0;
          incomes.forEach(i => {
            totalOtherIncome += (parseFloat(i.amount) || 0);
          });
          totalOtherIncome = Utils.round(totalOtherIncome);

          // 9.6 Total Operating Expenses
          let totalExpenses = 0;
          const categoryTotals = {};
          expenses.forEach(e => {
            const amt = Utils.round(parseFloat(e.amount) || 0);
            totalExpenses += amt;
            const cat = e.category || 'Custom Expense';
            categoryTotals[cat] = Utils.round((categoryTotals[cat] || 0) + amt);
          });
          totalExpenses = Utils.round(totalExpenses);

          // 9.5 Total Income Before Operating Expenses = Gross Profit + Other Business Income
          const totalGrossProfitWithIncome = Utils.round(grossProfit + totalOtherIncome);
          const grossTotalIncome = Utils.round(netSalesRevenue + totalOtherIncome);

          // 9.7 & 10. FINAL NET BUSINESS PROFIT / LOSS = Total Income Before Expenses - Total Operating Expenses
          const netProfitOrLoss = Utils.round(totalGrossProfitWithIncome - totalExpenses);

          const revElem = document.getElementById('pnl-stat-revenue');
          if (revElem) revElem.textContent = Utils.formatCurrency(grossTotalIncome, settings.currency);

          const gpElem = document.getElementById('pnl-stat-grossprofit');
          if (gpElem) gpElem.textContent = Utils.formatCurrency(totalGrossProfitWithIncome, settings.currency);

          const expElem = document.getElementById('pnl-stat-expenses');
          if (expElem) expElem.textContent = Utils.formatCurrency(totalExpenses, settings.currency);

          const netElem = document.getElementById('pnl-stat-netprofit');
          const netBadge = document.getElementById('pnl-stat-net-badge');
          const netCardBox = document.getElementById('pnl-net-card-box');

          if (netElem) netElem.textContent = Utils.formatCurrency(Math.abs(netProfitOrLoss), settings.currency);

          if (netBadge && netCardBox) {
            if (netProfitOrLoss >= 0) {
              netElem.style.color = '#10b981';
              netCardBox.style.borderLeftColor = '#10b981';
              netBadge.innerHTML = `<span class="badge-status badge-paid" style="background: #d1fae5; color: #047857;"><i class="fa-solid fa-arrow-up"></i> Net Profit</span>`;
            } else {
              netElem.style.color = '#ef4444';
              netCardBox.style.borderLeftColor = '#ef4444';
              netBadge.innerHTML = `<span class="badge-status badge-out-stock" style="background: #ffe4e6; color: #be123c;"><i class="fa-solid fa-arrow-down"></i> Net Loss</span>`;
            }
          }

          const stmtSalesProf = document.getElementById('pnl-stmt-sales-profit');
          if (stmtSalesProf) stmtSalesProf.textContent = Utils.formatCurrency(grossProfit, settings.currency);

          const stmtOthInc = document.getElementById('pnl-stmt-other-income');
          if (stmtOthInc) stmtOthInc.textContent = `+ ${Utils.formatCurrency(totalOtherIncome, settings.currency)}`;

          const stmtTotExp = document.getElementById('pnl-stmt-total-expenses');
          if (stmtTotExp) stmtTotExp.textContent = `- ${Utils.formatCurrency(totalExpenses, settings.currency)}`;

          const stmtNetRes = document.getElementById('pnl-stmt-net-result');
          if (stmtNetRes) {
            stmtNetRes.textContent = Utils.formatCurrency(netProfitOrLoss, settings.currency);
            stmtNetRes.style.color = netProfitOrLoss >= 0 ? '#10b981' : '#ef4444';
          }

          const catBarsContainer = document.getElementById('pnl-category-bars');
          if (catBarsContainer) {
            const categories = ['Office Expense', 'Home Expense', 'Rent & Utilities', 'Salaries', 'Custom Expense'];
            const catColors = {
              'Office Expense': '#0284c7',
              'Home Expense': '#8b5cf6',
              'Rent & Utilities': '#f59e0b',
              'Salaries': '#059669',
              'Custom Expense': '#64748b'
            };

            if (totalExpenses === 0) {
              catBarsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 14px 0; font-size: 0.88rem;">No expenses recorded in this period.</div>`;
            } else {
              let barHtml = '';
              categories.forEach(cat => {
                const catAmt = categoryTotals[cat] || 0;
                if (catAmt > 0 || totalExpenses > 0) {
                  const percent = totalExpenses > 0 ? Math.round((catAmt / totalExpenses) * 100) : 0;
                  const color = catColors[cat] || '#64748b';
                  barHtml += `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                      <span style="font-weight: 600;">${cat}</span>
                      <span style="font-weight: 700; color: ${color};">${Utils.formatCurrency(catAmt, settings.currency)} (${percent}%)</span>
                    </div>
                    <div style="height: 8px; width: 100%; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                      <div style="height: 100%; width: ${percent}%; background: ${color}; transition: width 0.3s ease;"></div>
                    </div>
                  </div>
                `;
                }
              });
              catBarsContainer.innerHTML = barHtml;
            }
          }

          this.renderExpensesTable();
        }

        renderExpensesTable() {
          const tbody = document.getElementById('pnl-ledger-tbody');
          if (!tbody) return;

          const settings = storage.getSettings();
          const searchInput = document.getElementById('pnl-search-ledger');
          const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

          if (this.activeTab === 'expenses') {
            let list = this.filterByDateRange(storage.getExpenses());
            if (query) {
              list = list.filter(e => e.title.toLowerCase().includes(query) || e.category.toLowerCase().includes(query) || (e.notes && e.notes.toLowerCase().includes(query)));
            }

            if (!list.length) {
              Utils.emptyTable(tbody, 7, 'No expenses found for selected period/search.');
              return;
            }

            let html = '';
            list.slice().reverse().forEach(e => {
              html += `
              <tr>
                <td>${e.date}</td>
                <td>${Utils.badge(e.category)}</td>
                <td><strong style="color: var(--text-main);">${e.title}</strong></td>
                <td>${e.paymentMethod || 'Cash'}</td>
                <td style="font-weight: 800; color: #e11d48;">${Utils.formatCurrency(e.amount, settings.currency)}</td>
                <td>${e.notes || '-'}</td>
                <td>
                  <button type="button" class="btn-danger-myu btn-sm-myu" onclick="expensesModule.deleteExpense('${e.id}')" title="Delete Expense">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </td>
              </tr>
            `;
            });
            tbody.innerHTML = html;

          } else {
            let list = this.filterByDateRange(storage.getManualIncomes());
            if (query) {
              list = list.filter(i => i.title.toLowerCase().includes(query) || i.category.toLowerCase().includes(query) || (i.notes && i.notes.toLowerCase().includes(query)));
            }

            if (!list.length) {
              Utils.emptyTable(tbody, 7, 'No manual income records found for selected period/search.');
              return;
            }

            let html = '';
            list.slice().reverse().forEach(i => {
              html += `
              <tr>
                <td>${i.date}</td>
                <td>${Utils.badge(i.category, 'badge-paid')}</td>
                <td><strong style="color: var(--text-main);">${i.title}</strong></td>
                <td>Manual Income</td>
                <td style="font-weight: 800; color: #059669;">${Utils.formatCurrency(i.amount, settings.currency)}</td>
                <td>${i.notes || '-'}</td>
                <td>
                  <button type="button" class="btn-danger-myu btn-sm-myu" onclick="expensesModule.deleteIncome('${i.id}')" title="Delete Income">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </td>
              </tr>
            `;
            });
            tbody.innerHTML = html;
          }
        }
      }

      var expensesModule = window.expensesModule || new ExpensesModule();

      /* ==================== BILLING & POS ENGINE ==================== */

if (typeof global !== 'undefined') {
  global.ExpensesModule = ExpensesModule;
}
if (typeof window !== 'undefined') {
  window.ExpensesModule = ExpensesModule;
  window.expensesModule = window.expensesModule || new ExpensesModule();
}

