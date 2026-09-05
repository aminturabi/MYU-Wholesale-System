/* ==================== REPORTS & CHART.JS MODULE ==================== */
class ReportsModule {
        constructor() { this.currentReportData = []; this.currentReportHeaders = []; this.currentReportName = "Report"; }

        generateReport() {
          const selectElem = document.getElementById('report-type-select');
          const type = selectElem ? selectElem.value : 'dailySales';
          const table = document.getElementById('report-output-table');
          const title = document.getElementById('report-title-display');
          if (!table || !title) return;
          const settings = (storage && typeof storage.getSettings === 'function') ? storage.getSettings() : { currency: 'Rs.' };

          switch (type) {
            case 'dailySales': this.generateDailySales(table, title, settings); break;
            case 'monthlySales': this.generateMonthlySales(table, title, settings); break;
            case 'profit': this.generateProfitReport(table, title, settings); break;
            case 'companyProfitLoss': this.generateCompanyProfitLossReport(table, title, settings); break;
            case 'productPerformance': this.generateProductPerformanceReport(table, title, settings); break;
            case 'companyPurchases': this.generateCompanyPurchasesReport(table, title, settings); break;
            case 'lowStock': this.generateLowStockReport(table, title, settings); break;
            case 'expiry': this.generateExpiryReport(table, title, settings); break;
            default: this.generateDailySales(table, title, settings); break;
          }
        }

        generateCompanyProfitLossReport(table, title, settings) {
          title.innerHTML = `<i class="fa-solid fa-chart-line" style="color: #10b981;"></i> Company-wise Individual Profit & Loss Report`;
          const companies = (storage && typeof storage.getCompanies === 'function') ? storage.getCompanies() : [];

          this.currentReportHeaders = ["Company Name", "Products Catalog", "Sales Revenue", "Cost of Goods (TP)", "Net Profit / Loss", "Margin %", "Unsold Stock Value", "Payable Balance"];
          this.currentReportName = "Company_Profit_Loss_Report";

          const rowsData = [];
          this.currentReportData = [];

          companies.forEach(c => {
            const pnl = (purchasesModule && typeof purchasesModule.calculateCompanyProfitLossData === 'function')
              ? purchasesModule.calculateCompanyProfitLossData(c.id, 'all')
              : { grossRevenue: 0, totalCOGS: 0, netProfit: 0, profitMargin: 0, currentStockCostValue: 0, companyProducts: [] };
            const rev = pnl ? pnl.grossRevenue || 0 : 0;
            const cost = pnl ? pnl.totalCOGS || 0 : 0;
            const profit = pnl ? pnl.netProfit || 0 : 0;
            const margin = pnl ? pnl.profitMargin || 0 : 0;
            const stockVal = pnl ? pnl.currentStockCostValue || 0 : 0;
            const prodCount = pnl && pnl.companyProducts ? pnl.companyProducts.length : 0;

            rowsData.push({
              id: c.id,
              name: c.name,
              prodCount: prodCount,
              revenue: rev,
              cost: cost,
              netProfit: profit,
              margin: margin,
              stockValue: stockVal,
              payable: c.remainingPayable || 0
            });

            this.currentReportData.push([
              c.name,
              prodCount,
              rev.toFixed(2),
              cost.toFixed(2),
              profit.toFixed(2),
              `${margin.toFixed(1)}%`,
              stockVal.toFixed(2),
              (c.remainingPayable || 0).toFixed(2)
            ]);
          });

          rowsData.sort((a, b) => b.netProfit - a.netProfit);

          let html = `<thead><tr><th>Company Name</th><th style="text-align: center;">Catalog Products</th><th>Sales Revenue</th><th>Cost (COGS)</th><th>Net Profit / Loss</th><th style="text-align: center;">Margin %</th><th>Unsold Stock Val</th><th>Payable Balance</th><th style="text-align: center;">Actions</th></tr></thead><tbody>`;

          if (!rowsData.length) {
            html += `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No companies found in database.</td></tr>`;
          } else {
            let totRev = 0, totCost = 0, totProfit = 0, totStock = 0, totPay = 0;
            rowsData.forEach(r => {
              totRev += r.revenue;
              totCost += r.cost;
              totProfit += r.netProfit;
              totStock += r.stockValue;
              totPay += r.payable;
              const isProfit = r.netProfit >= 0;

              html += `
              <tr>
                <td><strong style="color: var(--primary); font-size: 0.95rem;">${r.name}</strong></td>
                <td style="text-align: center;">${r.prodCount} items</td>
                <td style="font-weight: 700;">${Utils.formatCurrency(r.revenue, settings.currency)}</td>
                <td style="color: #64748b;">${Utils.formatCurrency(r.cost, settings.currency)}</td>
                <td style="font-weight: 800; color: ${isProfit ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(r.netProfit, settings.currency)}</td>
                <td style="text-align: center;">${Utils.badge(r.margin.toFixed(1) + '%', isProfit ? '' : 'badge-expired')}</td>
                <td>${Utils.formatCurrency(r.stockValue, settings.currency)}</td>
                <td style="font-weight: 700; color: ${r.payable > 0 ? '#ef4444' : '#10b981'};">${Utils.formatCurrency(r.payable, settings.currency)}</td>
                <td style="text-align: center;">
                  <button class="btn-sm-myu" style="background: #10b981; color: #ffffff; border: none; font-weight: 700; padding: 4px 8px; font-size: 0.78rem;" onclick="purchasesModule.openCompanyProfitLossModal('${r.id}')" title="Open Detailed P&L Statement">
                    <i class="fa-solid fa-chart-line"></i> View P&L
                  </button>
                </td>
              </tr>
            `;
            });

            // Grand Total Footer Row
            const overallMargin = totRev > 0 ? (totProfit / totRev) * 100 : 0;
            html += `
            <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid var(--border-color);">
              <td colspan="2" style="text-align: right; text-transform: uppercase;">Total All Companies:</td>
              <td style="color: var(--primary);">${Utils.formatCurrency(totRev, settings.currency)}</td>
              <td style="color: #64748b;">${Utils.formatCurrency(totCost, settings.currency)}</td>
              <td style="color: ${totProfit >= 0 ? '#10b981' : '#ef4444'}; font-size: 0.95rem;">${Utils.formatCurrency(totProfit, settings.currency)}</td>
              <td style="text-align: center;">${overallMargin.toFixed(1)}%</td>
              <td>${Utils.formatCurrency(totStock, settings.currency)}</td>
              <td style="color: #ef4444;">${Utils.formatCurrency(totPay, settings.currency)}</td>
              <td></td>
            </tr>
          `;
          }

          html += `</tbody>`;
          table.innerHTML = html;
        }

        generateDailySales(table, title, settings) {
          title.innerHTML = `<i class="fa-solid fa-calendar-day" style="color: var(--primary);"></i> Daily Sales Breakdown Report`;
          const sales = (storage && typeof storage.getSales === 'function') ? storage.getSales() : [];
          const returns = (storage && typeof storage.getReturns === 'function') ? storage.getReturns() : [];
          const map = {};

          sales.forEach(s => {
            const d = s.date || 'Unknown';
            if (!map[d]) map[d] = { date: d, count: 0, gross: 0, discount: 0, net: 0, paid: 0, balance: 0, profit: 0 };
            map[d].count++;
            map[d].gross += (s.grossTotal || 0);
            map[d].discount += (s.totalDiscount || 0);
            map[d].net += (s.netAmount || 0);
            map[d].paid += (s.paidAmount || 0);
            map[d].balance += (s.remainingBalance || 0);
            map[d].profit += (s.totalProfit || 0);
          });

          // Account for returns on each day
          returns.forEach(r => {
            const d = r.date || 'Unknown';
            if (!map[d]) map[d] = { date: d, count: 0, gross: 0, discount: 0, net: 0, paid: 0, balance: 0, profit: 0 };
            map[d].net -= (r.totalRefundAmount || 0);
            map[d].profit -= (r.totalProfitReversed || 0);
          });

          this.currentReportHeaders = ["Date", "Invoices Count", "Gross Sales", "Discounts", "Net Revenue", "Collected", "Balance Due", "Profit"];
          this.currentReportName = "Daily_Sales_Report";

          let rows = Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
          this.currentReportData = rows.map(r => [
            r.date,
            r.count,
            Utils.round(r.gross).toFixed(2),
            Utils.round(r.discount).toFixed(2),
            Utils.round(r.net).toFixed(2),
            Utils.round(r.paid).toFixed(2),
            Utils.round(r.balance).toFixed(2),
            Utils.round(r.profit).toFixed(2)
          ]);

          let html = `<thead><tr><th>Date</th><th>Invoices</th><th>Gross Sales</th><th>Discount</th><th>Net Revenue</th><th>Collected</th><th>Balance</th><th>Profit</th></tr></thead><tbody>`;
          if (!rows.length) {
            html += `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No sales invoices recorded yet.</td></tr>`;
          } else {
            rows.forEach(r => {
              const netVal = Utils.round(r.net);
              const profVal = Utils.round(r.profit);
              html += `<tr><td><strong>${r.date}</strong></td><td>${r.count}</td><td>${Utils.formatCurrency(r.gross, settings.currency)}</td><td style="color: #059669;">${Utils.formatCurrency(r.discount, settings.currency)}</td><td style="font-weight: 800; color: var(--primary);">${Utils.formatCurrency(netVal, settings.currency)}</td><td style="color: #059669;">${Utils.formatCurrency(r.paid, settings.currency)}</td><td style="color: #ef4444; font-weight: 700;">${Utils.formatCurrency(r.balance, settings.currency)}</td><td style="color: ${profVal >= 0 ? '#10b981' : '#ef4444'}; font-weight: 800;">${Utils.formatCurrency(profVal, settings.currency)}</td></tr>`;
            });
          }
          html += `</tbody>`; table.innerHTML = html;
        }

        generateMonthlySales(table, title, settings) {
          title.innerHTML = `<i class="fa-solid fa-calendar-days" style="color: var(--primary);"></i> Monthly Sales Report`;
          const map = {};
          const sales = (storage && typeof storage.getSales === 'function') ? storage.getSales() : [];
          const returns = (storage && typeof storage.getReturns === 'function') ? storage.getReturns() : [];

          sales.forEach(s => {
            const m = (s.date || '').substring(0, 7) || 'Unknown';
            if (!map[m]) map[m] = { month: m, count: 0, net: 0, paid: 0, balance: 0, profit: 0 };
            map[m].count++;
            map[m].net += (s.netAmount || 0);
            map[m].paid += (s.paidAmount || 0);
            map[m].balance += (s.remainingBalance || 0);
            map[m].profit += (s.totalProfit || 0);
          });

          // Account for returns in monthly grouping
          returns.forEach(r => {
            const m = (r.date || '').substring(0, 7) || 'Unknown';
            if (!map[m]) map[m] = { month: m, count: 0, net: 0, paid: 0, balance: 0, profit: 0 };
            map[m].net -= (r.totalRefundAmount || 0);
            map[m].profit -= (r.totalProfitReversed || 0);
          });

          this.currentReportHeaders = ["Month", "Invoices Count", "Net Revenue", "Paid", "Remaining Balance", "Total Profit"];
          this.currentReportName = "Monthly_Sales_Report";

          let rows = Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
          this.currentReportData = rows.map(r => [
            r.month,
            r.count,
            Utils.round(r.net).toFixed(2),
            Utils.round(r.paid).toFixed(2),
            Utils.round(r.balance).toFixed(2),
            Utils.round(r.profit).toFixed(2)
          ]);

          let html = `<thead><tr><th>Month</th><th>Invoices</th><th>Net Revenue</th><th>Collected</th><th>Credit Balance</th><th>Total Profit</th></tr></thead><tbody>`;
          if (!rows.length) {
            html += `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No sales recorded yet.</td></tr>`;
          } else {
            rows.forEach(r => {
              const netVal = Utils.round(r.net);
              const profVal = Utils.round(r.profit);
              html += `<tr><td><strong style="color: var(--primary);">${r.month}</strong></td><td>${r.count}</td><td style="font-weight: 800;">${Utils.formatCurrency(netVal, settings.currency)}</td><td style="color: #059669;">${Utils.formatCurrency(r.paid, settings.currency)}</td><td style="color: #ef4444; font-weight: 700;">${Utils.formatCurrency(r.balance, settings.currency)}</td><td style="color: ${profVal >= 0 ? '#10b981' : '#ef4444'}; font-weight: 800;">${Utils.formatCurrency(profVal, settings.currency)}</td></tr>`;
            });
          }
          html += `</tbody>`; table.innerHTML = html;
        }

        generateProfitReport(table, title, settings) {
          title.innerHTML = `<i class="fa-solid fa-sack-dollar" style="color: #10b981;"></i> Profit & Margin Analysis Report`;
          const sales = (storage && typeof storage.getSales === 'function') ? storage.getSales() : [];

          this.currentReportHeaders = ["Invoice #", "Date", "Customer", "Net Revenue", "Cost (COGS)", "Net Profit", "Margin %"];
          this.currentReportName = "Profit_Analysis_Report";
          this.currentReportData = sales.map(s => {
            const netAmt = Utils.round(s.netAmount || 0);
            const prof = Utils.round(s.totalProfit || 0);
            let cost = s.totalCOGS !== undefined ? Utils.round(s.totalCOGS) : Utils.round(netAmt - prof);
            const margin = netAmt > 0 ? ((prof / netAmt) * 100).toFixed(1) : 0;
            return [s.invoiceNumber, s.date, s.customerName, netAmt.toFixed(2), cost.toFixed(2), prof.toFixed(2), `${margin}%`];
          });

          let html = `<thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Net Sale</th><th>Cost (COGS)</th><th>Gross Profit</th><th>Margin</th></tr></thead><tbody>`;
          if (!sales.length) {
            html += `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No sales profit records found.</td></tr>`;
          } else {
            sales.slice().reverse().forEach(s => {
              const netAmt = Utils.round(s.netAmount || 0);
              const prof = Utils.round(s.totalProfit || 0);
              let cost = s.totalCOGS !== undefined ? Utils.round(s.totalCOGS) : Utils.round(netAmt - prof);
              const margin = netAmt > 0 ? ((prof / netAmt) * 100).toFixed(1) : 0;
              const isProfit = prof >= 0;
              html += `<tr><td><strong style="color: var(--primary);">${s.invoiceNumber}</strong></td><td>${s.date}</td><td>${s.customerName}</td><td>${Utils.formatCurrency(netAmt, settings.currency)}</td><td>${Utils.formatCurrency(cost, settings.currency)}</td><td style="font-weight: 800; color: ${isProfit ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(prof, settings.currency)}</td><td>${Utils.badge(margin + '%', isProfit ? '' : 'badge-expired')}</td></tr>`;
            });
          }
          html += `</tbody>`; table.innerHTML = html;
        }

        generateProductPerformanceReport(table, title, settings) {
          title.innerHTML = `<i class="fa-solid fa-chart-bar" style="color: var(--primary);"></i> Product Sales Performance (Best Sellers)`;
          const map = {};
          const sales = (storage && typeof storage.getSales === 'function') ? storage.getSales() : [];
          const returns = (storage && typeof storage.getReturns === 'function') ? storage.getReturns() : [];

          sales.forEach(s => {
            (s.items || []).forEach(item => {
              const id = item.productId || item.itemNo;
              if (!map[id]) map[id] = { itemNo: item.itemNo, name: item.name, qtySold: 0, totalSales: 0, totalProfit: 0 };
              map[id].qtySold += (parseInt(item.quantity) || 0);
              map[id].totalSales += (parseFloat(item.totalAmount) || 0);
              map[id].totalProfit += (parseFloat(item.itemProfit) || 0);
            });
          });

          // Deduct product returns
          returns.forEach(r => {
            (r.items || []).forEach(item => {
              const id = item.productId || item.itemNo;
              if (map[id]) {
                map[id].qtySold -= (parseInt(item.returnQty) || 0);
                map[id].totalSales -= (parseFloat(item.lineRefund) || 0);
                map[id].totalProfit -= (parseFloat(item.lineProfitReversed) || 0);
              }
            });
          });

          const rows = Object.values(map).sort((a, b) => b.qtySold - a.qtySold);
          this.currentReportHeaders = ["Item #", "Product Name", "Units Sold", "Total Revenue", "Total Profit"];
          this.currentReportName = "Product_Performance_Report";
          this.currentReportData = rows.map(r => [
            r.itemNo,
            r.name,
            Math.max(0, r.qtySold),
            Utils.round(Math.max(0, r.totalSales)).toFixed(2),
            Utils.round(r.totalProfit).toFixed(2)
          ]);

          let html = `<thead><tr><th>Item #</th><th>Product Name</th><th>Qty Sold</th><th>Total Revenue</th><th>Total Profit</th></tr></thead><tbody>`;
          if (!rows.length) {
            html += `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No product sales data recorded yet.</td></tr>`;
          } else {
            rows.forEach(r => {
              const soldUnits = Math.max(0, r.qtySold);
              const netSales = Utils.round(Math.max(0, r.totalSales));
              const prof = Utils.round(r.totalProfit);
              html += `<tr><td><strong style="color: var(--primary);">${r.itemNo}</strong></td><td><strong>${r.name}</strong></td><td><strong style="font-size: 0.95rem;">${soldUnits}</strong></td><td>${Utils.formatCurrency(netSales, settings.currency)}</td><td style="font-weight: 800; color: ${prof >= 0 ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(prof, settings.currency)}</td></tr>`;
            });
          }
          html += `</tbody>`; table.innerHTML = html;
        }

        generateCompanyPurchasesReport(table, title, settings) {
          title.innerHTML = `<i class="fa-solid fa-building-flag" style="color: var(--primary);"></i> Company & Supplier Purchase Ledger Report`;
          const companies = (storage && typeof storage.getCompanies === 'function') ? storage.getCompanies() : [];

          this.currentReportHeaders = ["Company Name", "Contact", "Phone", "Total Purchases", "Total Payments", "Remaining Payable"];
          this.currentReportName = "Supplier_Purchases_Report";
          this.currentReportData = companies.map(c => [c.name, c.contactPerson || '-', c.phone || '-', (c.totalPurchases || 0).toFixed(2), (c.totalPayments || 0).toFixed(2), (c.remainingPayable || 0).toFixed(2)]);

          let html = `<thead><tr><th>Company Name</th><th>Contact</th><th>Phone</th><th>Total Purchases</th><th>Total Payments</th><th>Remaining Payable</th></tr></thead><tbody>`;
          if (!companies.length) {
            html += `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No suppliers/companies found.</td></tr>`;
          } else {
            companies.forEach(c => {
              html += `<tr><td><strong>${c.name}</strong></td><td>${c.contactPerson || '-'}</td><td>${c.phone || '-'}</td><td>${Utils.formatCurrency(c.totalPurchases, settings.currency)}</td><td style="color: #059669;">${Utils.formatCurrency(c.totalPayments, settings.currency)}</td><td style="font-weight: 800; color: ${(c.remainingPayable || 0) > 0 ? '#ef4444' : '#10b981'};">${Utils.formatCurrency(c.remainingPayable, settings.currency)}</td></tr>`;
            });
          }
          html += `</tbody>`; table.innerHTML = html;
        }

        generateLowStockReport(table, title, settings) {
          title.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i> Low Stock & Inventory Reorder Report`;
          const products = (storage && typeof storage.getProducts === 'function') ? storage.getProducts() : [];
          const lowStock = products.filter(p => p.availableQty <= (p.minStockLevel || settings.minStockAlert || 10));

          this.currentReportHeaders = ["Item #", "Product Name", "Company", "Category", "Available Stock", "Min Stock", "Rack #", "Status"];
          this.currentReportName = "Low_Stock_Report";
          this.currentReportData = lowStock.map(p => [p.itemNo, p.name, p.company || '-', p.category, p.availableQty, p.minStockLevel || 10, p.rackNumber || '-', p.availableQty <= 0 ? 'Out of Stock' : 'Low Stock']);

          let html = `<thead><tr><th>Item #</th><th>Product Name</th><th>Company</th><th>Category</th><th>Stock</th><th>Min Threshold</th><th>Rack #</th><th>Status</th></tr></thead><tbody>`;
          if (!lowStock.length) {
            html += `<tr><td colspan="8" style="text-align: center; color: #10b981; font-weight: 600; padding: 30px;"><i class="fa-solid fa-circle-check"></i> Great news! All products are adequately stocked above minimum threshold.</td></tr>`;
          } else {
            lowStock.forEach(p => {
              const isOut = p.availableQty <= 0;
              html += `<tr><td><strong style="color: var(--primary);">${p.itemNo}</strong></td><td><strong>${p.name}</strong></td><td>${p.company || '-'}</td><td>${p.category}</td><td><strong style="color: ${isOut ? '#ef4444' : '#d97706'};">${p.availableQty}</strong></td><td>${p.minStockLevel || 10}</td><td>${p.rackNumber || '-'}</td><td>${Utils.badge(isOut ? 'Out of Stock' : 'Low Stock')}</td></tr>`;
            });
          }
          html += `</tbody>`; table.innerHTML = html;
        }

        generateExpiryReport(table, title, settings) {
          title.innerHTML = `<i class="fa-solid fa-calendar-xmark" style="color: #ef4444;"></i> Medicine Expiry Audit Report`;
          const expStatus = (storage && typeof storage.getExpiryStatus === 'function') ? storage.getExpiryStatus() : { expired: [], within30: [], within60: [], within90: [] };
          const list = [...(expStatus.expired || []), ...(expStatus.within30 || []), ...(expStatus.within60 || []), ...(expStatus.within90 || [])];

          this.currentReportHeaders = ["Item #", "Product Name", "Batch #", "Company", "Available Qty", "Expiry Date", "Days Remaining"];
          this.currentReportName = "Expiry_Audit_Report";
          this.currentReportData = list.map(p => [p.itemNo, p.name, p.batchNumber || '-', p.company || '-', p.availableQty, p.expiryDate, p.daysRemaining < 0 ? 'Expired' : `${p.daysRemaining} days`]);

          let html = `<thead><tr><th>Item #</th><th>Product Name</th><th>Batch #</th><th>Company</th><th>Stock</th><th>Expiry Date</th><th>Status</th></tr></thead><tbody>`;
          if (!list.length) {
            html += `<tr><td colspan="7" style="text-align: center; color: #10b981; font-weight: 600; padding: 30px;"><i class="fa-solid fa-circle-check"></i> Great news! No expired or near-expiry medicines found.</td></tr>`;
          } else {
            list.forEach(p => {
              const isExpired = p.daysRemaining < 0;
              html += `<tr><td><strong style="color: var(--primary);">${p.itemNo}</strong></td><td><strong>${p.name}</strong></td><td>${p.batchNumber || '-'}</td><td>${p.company || '-'}</td><td><strong>${p.availableQty}</strong></td><td><strong style="color: ${isExpired ? '#ef4444' : 'var(--text-main)'};">${p.expiryDate}</strong></td><td>${Utils.badge(isExpired ? 'EXPIRED' : `Expires in ${p.daysRemaining} days`, isExpired ? 'badge-expired' : '')}</td></tr>`;
            });
          }
          html += `</tbody>`; table.innerHTML = html;
        }

        exportCSV() {
          const appObj = window.app || (typeof app !== 'undefined' ? app : null);
          if (!this.currentReportData.length) { if (appObj) appObj.showToast('No report data available to export.', 'warning'); return; }
          let csvContent = "data:text/csv;charset=utf-8,";
          csvContent += this.currentReportHeaders.join(",") + "\n";
          this.currentReportData.forEach(r => { csvContent += r.map(i => `"${String(i).replace(/"/g, '""')}"`).join(",") + "\n"; });
          const encoded = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encoded);
          link.setAttribute("download", `${this.currentReportName}_${Utils.todayStr()}.csv`);
          document.body.appendChild(link); link.click(); document.body.removeChild(link);
          if (appObj) appObj.showToast('Report CSV file downloaded successfully!', 'success');
        }

        triggerPrintReport() {
          const container = document.getElementById('printable-invoice');
          if (!container) return;

          const settings = storage.getSettings();
          const titleText = (document.getElementById('report-title-display')?.innerText || 'Business Report').trim();
          const tableContent = document.getElementById('report-output-table')?.outerHTML || '';

          container.innerHTML = `
          <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; padding: 10px 14px; width: 100%; box-sizing: border-box; background: #ffffff;">
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px;">
              <div style="display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center;">
                <img src="${MYU_OFFICIAL_LOGO_B64}" style="width: 52px; height: 52px; object-fit: contain; border-radius: 8px; background: #090d16; padding: 3px; margin-bottom: 4px;" alt="MYU Logo">
                <div>
                  <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0; color: #0f172a; line-height: 1.2;">${settings.shopName || 'MYU Medicine Wholesale'}</h2>
                  <div style="font-size: 0.82rem; color: #475569; margin-top: 2px;">${settings.address || 'Jail Road, Mardan'} &bull; Phone: ${settings.phone || '03445094631'}</div>
                </div>
              </div>
              <div style="text-align: center; margin-top: 8px;">
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f766e; margin: 0; text-transform: uppercase;">${titleText}</h3>
                <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">Date: ${Utils.todayStr()} &bull; ${Utils.nowTimeStr()}</div>
              </div>
            </div>
            <div style="width: 100%; overflow: visible;">
              ${tableContent}
            </div>
            <div style="margin-top: 24px; font-size: 0.75rem; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              MYU Medicine & Wholesale System &bull; Official Business Report
            </div>
          </div>
        `;

          setTimeout(() => { window.print(); }, 250);
        }
      }

      var reportsModule = window.reportsModule || new ReportsModule();

      // Attach all modules to global window object before initializing App
      if (typeof window !== 'undefined') {
        if (typeof storage !== 'undefined') window.storage = storage;
        if (typeof productsModule !== 'undefined') window.productsModule = productsModule;
        if (typeof purchasesModule !== 'undefined') window.purchasesModule = purchasesModule;
        if (typeof salesModule !== 'undefined') window.salesModule = salesModule;
        if (typeof billingModule !== 'undefined') window.billingModule = billingModule;
        if (typeof reportsModule !== 'undefined') window.reportsModule = reportsModule;
        if (typeof expensesModule !== 'undefined') window.expensesModule = expensesModule;
      }

if (typeof global !== 'undefined') {
  global.ReportsModule = ReportsModule;
}
if (typeof window !== 'undefined') {
  window.ReportsModule = ReportsModule;
  window.reportsModule = window.reportsModule || new ReportsModule();
}

