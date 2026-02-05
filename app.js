/* ========================================
   CierresPro - Professional CRM & Analytics
   Reorganized & Optimized Version 1.2
   ======================================== */

// ========================================
// 1. Data Store (State Management)
// ========================================
const AppState = {
    currentData: null,
    historicalData: [],
    managedClients: [],
    settings: {
        revenueColumn: '',
        costColumn: '',
        dateColumn: '',
        categoryColumn: ''
    },
    processedData: null,
    yoyMetrics: { revenueChange: 0, marginChange: 0, available: false },
    budgetMetrics: { revenueAchievement: 0, marginAchievement: 0, available: false },
    charts: {}
};

// Column mapping for Excel structure (Version 48 columns)
const EXCEL_COLUMNS = {
    planta: 'Planta',
    codGrupo: 'Cod_grupo',
    nomGrupo: 'Nom_grupo',
    codCliente: 'Cod_cliente',
    nomCliente: 'Nom_cliente',
    codCentro: 'Cod_centro',
    nomCentro: 'Nom_centro',
    lineaNegocio: 'Lin_negocio',
    tipo: 'Tipo',
    numero: 'Número',
    nombre: 'Nombre',
    estado: 'Estado',
    categoria: 'Categoría',
    apertura: 'Apertura',
    cierre: 'Cierre',
    ultFactura: 'Ult_factura',
    presVenta: 'Pres_venta',
    presCoste: 'Pres_coste',
    ingreso: 'Ingreso',
    venta: 'Venta',
    ventaPendAlb: 'Venta_pend_alb',
    ventaPendPed: 'Venta_pend_ped',
    ventaPendFac: 'Venta_pend_fac',
    costeLanzado: 'Coste_lanzado',
    costeMT: 'Coste_MT',
    costeSR: 'Coste_SR',
    costeMN: 'Coste_MN',
    costeDS: 'Coste_DS',
    costeOT: 'Coste_OT',
    coste: 'Coste',
    margen: 'Margen',
    margenPct: 'Margen_%_vta',
    margen2: 'Margen_2',
    margen2Pct: 'Margen_2_%_vta',
    horasPrev: 'Horas_prev',
    horasReales: 'Horas_reales',
    garantiaMT: 'Garantia_MT',
    garantiaSR: 'Garantia_SR',
    garantiaMN: 'Garantia_MN',
    garantiaDS: 'Garantia_DS',
    garantiaOT: 'Garantia_OT',
    garantia: 'Garantia',
    ingresoPeriodo: 'Ingreso_periodo',
    ventaAcumulado: 'Venta_acumulado',
    costeAcumulado: 'Coste_acumulado',
    garantiaAcumulado: 'Garantia_acumulado',
    margenAcumulado: 'Margen_acumulado',
    margenAcumuladoPct: 'Margen_acumulado_%_vta'
};

// ========================================
// 2. Application Lifecycle
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadManagedClients();
    initNavigation();
    initUploadHandlers();
    initCharts();
    initClientManager();
    loadSettings();
    loadHistoryFromStorage();
    initModalHandlers();
    initPdfGlobalHandler();
});

function initModalHandlers() {
    const modal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };
}

function initPdfGlobalHandler() {
    const btn = document.getElementById('exportPdfBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection) {
                const period = document.getElementById('currentPeriod').textContent;
                exportToPDF(activeSection.id, `Reporte_${activeSection.id.toUpperCase()}_${period}`);
            }
        });
    }
}

// ========================================
// 3. Navigation & Routing
// ========================================
function initNavigation() {
    const navContainer = document.querySelector('.sidebar-nav');
    const pageTitle = document.getElementById('pageTitle');
    const headerSubtitle = document.querySelector('.header-subtitle');

    function refreshNavigation() {
        document.querySelectorAll('.nav-item-dynamic').forEach(el => el.remove());
        const sectionInfo = {
            dashboard: { title: 'Dashboard', subtitle: 'Resumen de rendimientos y costes' },
            upload: { title: 'Cargar Datos', subtitle: 'Importar archivo Excel mensual' },
            history: { title: 'Histórico', subtitle: 'Cierres de meses anteriores', onEnter: renderHistory },
            analysis: { title: 'Análisis', subtitle: 'Detalle de centros y rentabilidad', onEnter: renderAnalysis },
            clients: { title: 'Clientes', subtitle: 'Análisis por cliente', onEnter: renderClients },
            settings: { title: 'Configuración', subtitle: 'Ajustes de la aplicación' }
        };

        AppState.managedClients.forEach(client => {
            sectionInfo[client.id] = {
                title: client.name,
                subtitle: 'Seguimiento especializado',
                onEnter: () => renderClientDashboard(client.name, client.id)
            };
            const navLink = document.createElement('a');
            navLink.href = '#';
            navLink.className = 'nav-item nav-item-dynamic';
            navLink.dataset.section = client.id;
            navLink.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M15 3.13a4 4 0 0 1 0 7.75"></path></svg>${client.name}`;
            const settingsNav = navContainer.querySelector('[data-section="settings"]');
            navContainer.insertBefore(navLink, settingsNav);
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToSection(newItem.dataset.section, sectionInfo);
            });
        });
    }

    function navigateToSection(sectionId, infoMap) {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');
        navItems.forEach(nav => nav.classList.toggle('active', nav.dataset.section === sectionId));
        sections.forEach(section => section.classList.toggle('active', section.id === sectionId));
        const info = infoMap[sectionId];
        if (info) {
            pageTitle.textContent = info.title;
            headerSubtitle.textContent = info.subtitle;
            if (info.onEnter) info.onEnter();
        }
    }

    window.refreshNavigation = refreshNavigation;
    window.navigateToSection = (id) => {
        const nav = document.querySelector(`[data-section="${id}"]`);
        if (nav) nav.click();
    };
    refreshNavigation();
}

// ========================================
// 4. Data Ingestion (Upload & Parsing)
// ========================================
function initUploadHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');

    selectFileBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });

    document.getElementById('cancelUpload').addEventListener('click', () => {
        document.getElementById('previewContainer').style.display = 'none';
        AppState.currentData = null;
    });

    document.getElementById('confirmUpload').addEventListener('click', () => {
        if (AppState.currentData) {
            try {
                processData(AppState.currentData);
                document.getElementById('previewContainer').style.display = 'none';
                document.querySelector('[data-section="dashboard"]').click();
                showToast('Datos cargados correctamente', 'success');
            } catch (error) {
                showToast('Error al procesar datos: ' + error.message, 'error');
            }
        }
    });

    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Header Upload Button
    const headerUpload = document.getElementById('uploadBtn');
    if (headerUpload) {
        headerUpload.addEventListener('click', () => {
            document.querySelector('[data-section="upload"]').click();
        });
    }

    document.getElementById('filterCentro').addEventListener('change', filterData);
    document.getElementById('filterLinea').addEventListener('change', filterData);
    document.getElementById('filterEstado').addEventListener('change', filterData);
    document.getElementById('filterLowPerf').addEventListener('change', filterData);
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        document.getElementById('filterCentro').value = '';
        document.getElementById('filterLinea').value = '';
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterLowPerf').checked = false;
        filterData();
    });

    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) downloadTemplateBtn.addEventListener('click', downloadTemplate);
}

function handleFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
        showToast('Formato de archivo no soportado', 'error');
        return;
    }
    showToast('Procesando archivo...', 'info');
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (!jsonData.length) return showToast('El archivo está vacío', 'error');

            AppState.currentData = {
                fileName: file.name,
                headers: jsonData[0],
                rows: jsonData.slice(1),
                rawWorkbook: workbook
            };
            showPreview(AppState.currentData);
            showToast('Archivo leído correctamente', 'success');
        } catch (error) {
            showToast('Error al leer el archivo: ' + error.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function showPreview(data) {
    const previewHead = document.getElementById('previewTableHead');
    const previewBody = document.getElementById('previewTableBody');
    previewHead.innerHTML = ''; previewBody.innerHTML = '';

    const relevant = ['Nombre', 'Nom_centro', 'Lin_negocio', 'Nom_cliente', 'Estado', 'Venta', 'Coste', 'Margen'];
    const indices = [];
    const headerRow = document.createElement('tr');

    relevant.forEach(col => {
        const idx = data.headers.findIndex(h => h && h.toLowerCase().trim() === col.toLowerCase().trim());
        if (idx !== -1) {
            indices.push(idx);
            const th = document.createElement('th'); th.textContent = col;
            headerRow.appendChild(th);
        }
    });
    previewHead.appendChild(headerRow);

    data.rows.slice(0, 15).forEach(row => {
        const tr = document.createElement('tr');
        indices.forEach(idx => {
            const td = document.createElement('td');
            const val = row[idx];
            td.textContent = typeof val === 'number' ? val.toLocaleString('es-ES') : val;
            tr.appendChild(td);
        });
        previewBody.appendChild(tr);
    });
    document.getElementById('previewContainer').style.display = 'block';
}

function downloadTemplate() {
    const headers = Object.values(EXCEL_COLUMNS);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Cierre_Mensual.xlsx");
}

// ========================================
// 5. Analytics Engine (Logic Core)
// ========================================
function getColumnIndex(headers, columnName) {
    const norm = (s) => String(s).toLowerCase().trim().replace(/_/g, '').replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = norm(columnName);
    for (let i = 0; i < headers.length; i++) { if (norm(headers[i]) === search) return i; }
    for (let i = 0; i < headers.length; i++) { if (norm(headers[i]).includes(search)) return i; }
    return -1;
}

function calculateMarginPercentage(venta, margen) {
    if (!venta) return 0;
    let pct = (margen / venta) * 100;
    return (venta < 0 && margen < 0) ? -Math.abs(pct) : pct;
}

function processData(data) {
    const heads = data.headers;
    const colIdx = {};
    Object.keys(EXCEL_COLUMNS).forEach(key => colIdx[key] = getColumnIndex(heads, EXCEL_COLUMNS[key]));

    if (colIdx.venta === -1 || colIdx.coste === -1) {
        throw new Error('No se han encontrado las columnas de "Venta" o "Coste". Revisa la configuración o usa la plantilla.');
    }
    let totalV = 0, totalC = 0, totalM = 0, totalPV = 0, totalPC = 0;
    const byCenter = {}, byLinea = {}, byEstado = {}, processedRows = [];

    data.rows.forEach(row => {
        if (!row || !row.length) return;
        const centro = row[colIdx.nomCentro] || 'Sin Centro';
        const name = String(row[colIdx.nombre] || '').toUpperCase();
        if (name.includes('TOTAL') || name.startsWith('SUMA')) return;

        const venta = parseNumber(row[colIdx.venta]);
        const coste = parseNumber(row[colIdx.coste]);
        const margen = parseNumber(row[colIdx.margen]);
        const presV = parseNumber(row[colIdx.presVenta]);
        const presC = parseNumber(row[colIdx.presCoste]);
        const linea = row[colIdx.lineaNegocio] || 'Sin Línea';
        const estado = row[colIdx.estado] || 'Sin Estado';

        totalV += venta; totalC += coste; totalM += margen; totalPV += presV; totalPC += presC;

        if (!byCenter[centro]) byCenter[centro] = { venta: 0, margen: 0, presVenta: 0 };
        byCenter[centro].venta += venta; byCenter[centro].margen += margen; byCenter[centro].presVenta += presV;

        if (!byLinea[linea]) byLinea[linea] = { venta: 0, margen: 0 };
        byLinea[linea].venta += venta; byLinea[linea].margen += margen;

        processedRows.push({ centro, cliente: row[colIdx.nomCliente], lineaNegocio: linea, estado, venta, coste, margen, margenPct: calculateMarginPercentage(venta, margen), presVenta: presV });
    });

    const period = extractPeriodFromFileName(data.fileName);
    AppState.processedData = { period, rows: processedRows, totals: { totalVenta: totalV, totalCoste: totalC, totalMargen: totalM, totalPresVenta: totalPV, totalPresCoste: totalPC }, byCenter, byLineaNegocio: byLinea };

    calculateYoY(AppState.processedData);
    calculateBudgets(AppState.processedData);
    populateFilters(processedRows);
    updateDashboard(AppState.processedData);
    document.getElementById('currentPeriod').textContent = period;
    saveToHistory(AppState.processedData);
}

function calculateYoY(current) {
    const parts = current.period.split(' ');
    if (parts.length !== 2) return;
    const prevPeriod = `${parts[0]} ${parseInt(parts[1]) - 1}`;
    const prev = AppState.historicalData.find(h => h.period === prevPeriod);
    if (prev) {
        AppState.yoyMetrics = { revenueChange: ((current.totals.totalVenta - prev.totals.totalVenta) / prev.totals.totalVenta) * 100, marginChange: ((current.totals.totalMargen - prev.totals.totalMargen) / prev.totals.totalMargen) * 100, available: true };
    } else AppState.yoyMetrics.available = false;
}

function calculateBudgets(current) {
    const pv = current.totals.totalPresVenta, pm = pv - current.totals.totalPresCoste;
    if (pv > 0) AppState.budgetMetrics = { revenueAchievement: (current.totals.totalVenta / pv) * 100, marginAchievement: (current.totals.totalMargen / pm) * 100, available: true };
    else AppState.budgetMetrics.available = false;
}

function parseNumber(v) {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return v;
    let s = String(v).trim(), neg = false;
    if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.replace(/[()]/g, ''); }
    else if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
    const n = parseFloat(s.replace(/[€$]/g, '').replace(/\./g, '').replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : (neg ? -Math.abs(n) : n);
}

function extractPeriodFromFileName(f) {
    const ms = { 'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril', 'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto', 'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre' };
    const low = f.toLowerCase();
    for (const [k, v] of Object.entries(ms)) { if (low.includes(k)) return `${v} ${low.match(/20\d{2}/)?.[0] || new Date().getFullYear()}`; }
    return f.replace(/\.[^/.]+$/, '');
}

// ========================================
// 6. UI Controller
// ========================================
function updateKPIs(data) {
    const set = (id, val) => document.getElementById(id).textContent = val;
    set('totalRevenue', formatCurrency(data.totalVenta || data.totalRevenue));
    set('totalCost', formatCurrency(data.totalCoste || data.totalCost));
    set('netMargin', formatCurrency(data.totalMargen || data.netMargin));
    set('performance', (data.performance || ((data.totalMargen / data.totalVenta) * 100)).toFixed(1) + '%');

    const revY = document.getElementById('revenueYoY'), marY = document.getElementById('marginYoY');
    if (AppState.yoyMetrics.available) { updateYoYBadge(revY, AppState.yoyMetrics.revenueChange); updateYoYBadge(marY, AppState.yoyMetrics.marginChange); }
    else { revY.style.display = 'none'; marY.style.display = 'none'; }

    const revB = document.getElementById('revenueBudget'), marB = document.getElementById('marginBudget');
    if (AppState.budgetMetrics.available) { updateBudgetBadge(revB, AppState.budgetMetrics.revenueAchievement); updateBudgetBadge(marB, AppState.budgetMetrics.marginAchievement); }
    else { revB.style.display = 'none'; marB.style.display = 'none'; }
}

function updateYoYBadge(el, v) {
    el.style.display = 'inline-flex';
    el.className = `kpi-badge yoy ${v >= 0 ? 'positive' : 'negative'}`;
    el.textContent = `${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}% YoY`;
}

function updateBudgetBadge(el, v) {
    el.style.display = 'inline-flex';
    el.className = `kpi-badge budget ${v >= 100 ? 'positive' : 'warning'}`;
    el.textContent = `🎯 ${v.toFixed(0)}%`;
}

function updateDataTable(rows) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = rows.length ? [...rows].sort((a, b) => b.venta - a.venta).map(row => `
        <tr class="${row.margenPct < 20 ? 'critical-row' : ''}">
            <td title="${row.nombre}">${truncateText(row.nombre, 30)}</td>
            <td><span class="badge badge-center">${truncateText(row.centro, 15)}</span></td>
            <td><span class="badge badge-linea">${truncateText(row.lineaNegocio, 15)}</span></td>
            <td class="text-right" style="color: var(--color-revenue)">${formatCurrency(row.venta)}</td>
            <td class="text-right" style="color: var(--color-cost)">${formatCurrency(row.coste)}</td>
            <td class="text-right" style="color: ${row.margen >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)'}">${formatCurrency(row.margen)}</td>
            <td class="text-right">${row.margenPct.toFixed(1)}%</td>
        </tr>`).join('') : '<tr class="empty-state"><td colspan="7">No hay datos</td></tr>';
    const header = document.querySelector('.table-header h3');
    if (header) header.textContent = `Detalle del Período (${rows.length} registros)`;
}

function renderAnalysis() {
    const tb = document.getElementById('detailedTableBody');
    if (!tb || !AppState.processedData) return;
    tb.innerHTML = AppState.processedData.rows.map(r => `<tr><td>${r.centro}</td><td>${r.cliente || r.nombre}</td><td><span class="badge">${r.lineaNegocio}</span></td><td><span class="badge">${r.estado}</span></td><td class="text-right">${formatCurrency(r.venta)}</td><td class="text-right">${formatCurrency(r.coste)}</td><td class="text-right" style="color: ${r.margen >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)'}">${formatCurrency(r.margen)}</td><td class="text-right">${r.margenPct.toFixed(1)}%</td></tr>`).join('');
    const summ = document.getElementById('reportSummary');
    if (summ) summ.innerHTML = generateSmartSummary(AppState.processedData);
}

function generateSmartSummary(d) {
    const mP = calculateMarginPercentage(d.totals.totalVenta, d.totals.totalMargen);
    const cs = Object.keys(d.byCenter).map(c => ({ name: c, ...d.byCenter[c], pct: calculateMarginPercentage(d.byCenter[c].venta, d.byCenter[c].margen) }));
    const top = cs.sort((a, b) => b.margen - a.margen)[0];
    return `<div style="line-height:1.6"><strong>Resumen Ejecutivo:</strong> Ventas de <strong>${formatCurrency(d.totals.totalVenta)}</strong> con margen de <strong>${formatCurrency(d.totals.totalMargen)}</strong> (${mP.toFixed(1)}%).<br><strong>Puntos Clave:</strong> Mayor contribución de <em>${top?.name || 'N/A'}</em>. Se detectan <strong>${cs.filter(c => c.pct < 20).length}</strong> centros críticos.</div>`;
}

function truncateText(t, l) { return t?.length > l ? t.substring(0, l) + '...' : t; }
function formatCurrency(v) { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v); }
function showToast(m, t = 'info') {
    const c = document.getElementById('toastContainer'), el = document.createElement('div');
    el.className = `toast ${t}`;
    el.innerHTML = `<span>${m}</span>`;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
}

// ========================================
// 7. Filter & Dashboard Logic
// ========================================
function populateFilters(rows) {
    const getU = (key) => [...new Set(rows.map(r => r[key]).filter(Boolean))].sort();
    const fill = (id, opts) => {
        const s = document.getElementById(id), cur = s.value;
        s.innerHTML = '<option value="">Todos</option>' + opts.map(o => `<option value="${o}">${o}</option>`).join('');
        s.value = opts.includes(cur) ? cur : '';
    };
    fill('filterCentro', getU('centro')); fill('filterLinea', getU('lineaNegocio')); fill('filterEstado', getU('estado'));
}

function filterData() {
    if (!AppState.processedData) return;
    const c = document.getElementById('filterCentro').value, l = document.getElementById('filterLinea').value, e = document.getElementById('filterEstado').value, lp = document.getElementById('filterLowPerf').checked;
    const fil = AppState.processedData.rows.filter(r => (!c || r.centro === c) && (!l || r.lineaNegocio === l) && (!e || r.estado === e) && (!lp || r.margenPct < 20));
    const tots = fil.reduce((a, r) => { a.totalVenta += r.venta; a.totalCoste += r.coste; a.totalMargen += r.margen; return a; }, { totalVenta: 0, totalCoste: 0, totalMargen: 0 });
    updateDashboard({ rows: fil, totals: tots });
}

function updateDashboard(data) {
    updateKPIs(data);
    updateDataTable(data.rows);
    const byC = {}, byL = {};
    data.rows.forEach(r => {
        if (!byC[r.centro]) {
            byC[r.centro] = { revenue: r.venta, cost: r.coste, margin: r.margen, venta: r.venta, margen: r.margen, presVenta: r.presVenta || 0 };
        } else {
            byC[r.centro].revenue += r.venta;
            byC[r.centro].cost += r.coste;
            byC[r.centro].margin += r.margen;
            byC[r.centro].venta += r.venta;
            byC[r.centro].margen += r.margen;
            byC[r.centro].presVenta += (r.presVenta || 0);
        }
        if (!byL[r.lineaNegocio]) byL[r.lineaNegocio] = { venta: 0, margen: 0 };
        byL[r.lineaNegocio].venta += r.venta; byL[r.lineaNegocio].margen += r.margen;
    });
    if (AppState.charts.monthly) updateCharts(byL, byC);
    AppState.managedClients.forEach(cl => { if (document.getElementById(cl.id)) renderClientDashboard(cl.name, cl.id); });
}

// ========================================
// 8. Client Modules
// ========================================
let currentClientsData = [];
function renderClients() {
    const d = AppState.processedData?.rows; if (!d) return;
    const map = {};
    d.forEach(r => {
        const n = r.cliente || r.nombre || 'Desconocido';
        if (!map[n]) map[n] = { name: n, centers: [], totalVenta: 0, totalMargen: 0 };
        map[n].centers.push(r); map[n].totalVenta += r.venta; map[n].totalMargen += r.margen;
    });
    currentClientsData = Object.values(map).sort((a, b) => b.totalVenta - a.totalVenta);
    renderClientList(currentClientsData);
    const s = document.getElementById('clientSearch');
    if (s) s.oninput = (e) => renderClientList(currentClientsData.filter(c => c.name.toLowerCase().includes(e.target.value.toLowerCase())));
}

function renderClientList(cs) {
    const l = document.getElementById('clientsList');
    l.innerHTML = cs.map(c => `<div class="client-item" onclick="selectClient('${c.name.replace(/'/g, "\\'")}')"><div class="client-item-header"><span>${truncateText(c.name, 25)}</span><strong>${formatCurrency(c.totalVenta)}</strong></div><div class="client-metrics"><span>${c.centers.length} Centros</span><span style="color:${c.totalMargen >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">${calculateMarginPercentage(c.totalVenta, c.totalMargen).toFixed(1)}%</span></div></div>`).join('');
}

window.selectClient = (name) => {
    const c = currentClientsData.find(cl => cl.name === name); if (!c) return;
    const v = document.getElementById('clientDetailView');
    v.innerHTML = `<div class="client-detail-header"><h2>${c.name}</h2><div class="text-right"><h3>${formatCurrency(c.totalVenta)}</h3><span>MG: ${calculateMarginPercentage(c.totalVenta, c.totalMargen).toFixed(1)}%</span></div></div><table class="modal-table"><thead><tr><th>Centro</th><th class="text-right">Venta</th><th class="text-right">Margen</th></tr></thead><tbody>${c.centers.map(r => `<tr><td>${r.centro}</td><td class="text-right">${formatCurrency(r.venta)}</td><td class="text-right">${formatCurrency(r.margen)}</td></tr>`).join('')}</tbody></table>`;
};

function initClientManager() {
    const add = document.getElementById('addClientBtn');
    if (add) add.onclick = () => {
        const n = document.getElementById('newClientName').value.trim().toUpperCase();
        if (!n || AppState.managedClients.some(c => c.name === n)) return showToast('Nombre inválido o duplicado', 'warning');
        AppState.managedClients.push({ name: n, color: document.getElementById('newClientColor').value, id: n.toLowerCase().replace(/[^a-z0-9]/g, '-') });
        saveManagedClients(); renderClientSettingsList(); refreshDynamicSections(); window.refreshNavigation();
        document.getElementById('newClientName').value = ''; showToast('Cliente añadido', 'success');
    };
    renderClientSettingsList(); refreshDynamicSections();
}

function saveManagedClients() { localStorage.setItem('cpro_managed_clients', JSON.stringify(AppState.managedClients)); }
function loadManagedClients() {
    const s = localStorage.getItem('cpro_managed_clients');
    AppState.managedClients = s ? JSON.parse(s) : [{ name: 'ALIMERKA', color: '#10b981', id: 'alimerka' }, { name: 'CARREFOUR', color: '#3b82f6', id: 'carrefour' }, { name: 'BASIC-FIT', color: '#ff7000', id: 'basicfit' }];
    if (!s) saveManagedClients();
}

function renderClientSettingsList() {
    const c = document.getElementById('clientListSettings'); if (!c) return;
    c.innerHTML = `<table class="settings-table"><thead><tr><th>Cliente</th><th>Color</th><th class="text-right">Acciones</th></tr></thead><tbody>${AppState.managedClients.map((cl, i) => `<tr><td>${cl.name}</td><td><div style="width:20px;height:20px;background:${cl.color}"></div></td><td class="text-right"><button class="btn btn-outline-danger btn-sm" onclick="removeManagedClient(${i})">Eliminar</button></td></tr>`).join('')}</tbody></table>`;
}

window.removeManagedClient = (i) => {
    if (confirm(`¿Eliminar dashboard de ${AppState.managedClients[i].name}?`)) { AppState.managedClients.splice(i, 1); saveManagedClients(); renderClientSettingsList(); refreshDynamicSections(); window.refreshNavigation(); }
};

function refreshDynamicSections() {
    const main = document.querySelector('.main-content');
    document.querySelectorAll('.content-section-dynamic').forEach(el => el.remove());
    AppState.managedClients.forEach(cl => {
        const sec = document.createElement('section'); sec.id = cl.id; sec.className = 'content-section content-section-dynamic';
        sec.innerHTML = `<div class="header-banner" style="--banner-accent:${cl.color}"><div style="display:flex;justify-content:space-between"><div><h2>Dashboard ${cl.name}</h2></div><button class="btn btn-primary btn-sm" onclick="exportToPDF('${cl.id}', 'Dashboard_${cl.name}')">PDF Report</button></div></div><div class="kpi-grid" id="${cl.id}KPIs"></div><div class="charts-grid"><div class="chart-card full-width"><h3>Distribución por Centro</h3><div class="chart-container"><canvas id="${cl.id}Chart"></canvas></div></div></div><div class="table-card"><table class="client-table"><thead><tr><th>Centro</th><th>Línea</th><th class="text-right">Venta</th><th class="text-right">Margen %</th></tr></thead><tbody id="${cl.id}TableBody"></tbody></table></div>`;
        main.insertBefore(sec, document.getElementById('clients'));
        initDynamicClientChart(cl.id);
    });
}

function renderClientDashboard(name, id) {
    if (!AppState.processedData) return;
    const rows = AppState.processedData.rows.filter(r => String(r.cliente).toUpperCase().includes(name) || String(r.nombre).toUpperCase().includes(name));
    const tots = rows.reduce((a, r) => { a.v += r.venta; a.m += r.margen; return a; }, { v: 0, m: 0 });
    document.getElementById(`${id}KPIs`).innerHTML = `<div class="kpi-card"><span>Ventas</span><strong>${formatCurrency(tots.v)}</strong></div><div class="kpi-card"><span>Margen (€)</span><strong>${formatCurrency(tots.m)}</strong></div><div class="kpi-card"><span>Margen (%)</span><strong>${calculateMarginPercentage(tots.v, tots.m).toFixed(1)}%</strong></div><div class="kpi-card"><span>Centros</span><strong>${rows.length}</strong></div>`;
    document.getElementById(`${id}TableBody`).innerHTML = rows.map(r => `<tr><td>${r.centro}</td><td>${r.lineaNegocio}</td><td class="text-right">${formatCurrency(r.venta)}</td><td class="text-right">${r.margenPct.toFixed(1)}%</td></tr>`).join('');
    const ch = AppState.charts[id];
    if (ch) { const map = rows.reduce((a, r) => { a[r.centro] = (a[r.centro] || 0) + r.venta; return a; }, {}); ch.data.labels = Object.keys(map); ch.data.datasets[0].data = Object.values(map); ch.update(); }
}

// ========================================
// 9. Chart Controller
// ========================================
function initCharts() {
    const common = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } } };

    AppState.charts.monthly = new Chart(document.getElementById('monthlyChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Ingresos', borderColor: '#10b981', fill: true }, { label: 'Costes', borderColor: '#ef4444', fill: true }] }, options: common });
    AppState.charts.distribution = new Chart(document.getElementById('costDistributionChart'), { type: 'doughnut', data: { labels: [], datasets: [{ backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'] }] }, options: common });
    AppState.charts.lowPerf = new Chart(document.getElementById('lowPerfChart'), { type: 'bar', data: { labels: [], datasets: [{ label: 'Margen %', backgroundColor: '#ef4444' }] }, options: { ...common, indexAxis: 'y' } });
    AppState.charts.bva = new Chart(document.getElementById('bvaChart'), { type: 'bar', data: { labels: [], datasets: [] }, options: { ...common, onClick: (e, els) => { if (els.length) showDetailModal(AppState.charts.bva.data.labels[els[0].index]); } } });

    AppState.charts.lowPerf.options.onClick = (e, els) => { if (els.length) showDetailModal(AppState.charts.lowPerf.data.labels[els[0].index]); };
    AppState.charts.distribution.options.onClick = (e, els) => { if (els.length) showBusinessLineDetail(AppState.charts.distribution.data.labels[els[0].index]); };
    initModalHandlers();
}

function updateCharts(byL, byC) {
    const ls = Object.keys(byL).sort((a, b) => byL[b].venta - byL[a].venta).slice(0, 8);
    AppState.charts.distribution.data.labels = ls; AppState.charts.distribution.data.datasets[0].data = ls.map(l => byL[l].venta); AppState.charts.distribution.update();

    const low = Object.keys(byC).map(c => ({ name: c, pct: calculateMarginPercentage(byC[c].venta, byC[c].margen) })).filter(c => c.pct < 20).sort((a, b) => a.pct - b.pct).slice(0, 10);
    AppState.charts.lowPerf.data.labels = low.map(c => c.name); AppState.charts.lowPerf.data.datasets[0].data = low.map(c => c.pct); AppState.charts.lowPerf.update();

    const bva = Object.keys(byC).map(c => ({ name: c, act: byC[c].venta, bud: byC[c].presVenta })).filter(c => c.bud > 0).sort((a, b) => b.act - a.act).slice(0, 5);
    AppState.charts.bva.data.labels = bva.map(c => c.name); AppState.charts.bva.data.datasets = [{ label: 'Real', data: bva.map(c => c.act), backgroundColor: '#10b981' }, { label: 'Presupuesto', data: bva.map(c => c.bud), backgroundColor: '#6366f1' }]; AppState.charts.bva.update();
    updateMonthlyChart();
}

function updateMonthlyChart() {
    const h = AppState.historicalData; if (!h.length) return;
    AppState.charts.monthly.data.labels = h.map(x => x.period); AppState.charts.monthly.data.datasets[0].data = h.map(x => x.totals.totalVenta); AppState.charts.monthly.data.datasets[1].data = h.map(x => x.totals.totalCoste); AppState.charts.monthly.update();
}

function initDynamicClientChart(id) {
    AppState.charts[id] = new Chart(document.getElementById(`${id}Chart`), { type: 'bar', data: { labels: [], datasets: [{ label: 'Venta (€)', backgroundColor: '#6366f1' }] }, options: { responsive: true, maintainAspectRatio: false } });
}

// ========================================
// 10. Interactivity (Modals)
// ========================================
function showDetailModal(center) {
    const modal = document.getElementById('detailModal'), d = AppState.processedData?.byCenter[center]; if (!d) return;
    document.getElementById('modalTitle').textContent = `Detalle: ${center}`;
    document.getElementById('modalKPIs').innerHTML = `<div class="kpi-card"><span>Ventas</span><strong>${formatCurrency(d.venta)}</strong></div><div class="kpi-card"><span>Margen (€)</span><strong>${formatCurrency(d.margen)}</strong></div><div class="kpi-card"><span>Rendimiento</span><strong>${calculateMarginPercentage(d.venta, d.margen).toFixed(1)}%</strong></div>`;
    const rows = AppState.processedData.rows.filter(r => r.centro === center);
    document.getElementById('modalTableBody').innerHTML = rows.map(r => `<tr><td>${r.lineaNegocio}</td><td class="text-right">${formatCurrency(r.venta)}</td><td class="text-right">${r.presVenta ? formatCurrency(r.presVenta) : '-'}</td><td class="text-right">${formatCurrency(r.margen)}</td></tr>`).join('');
    modal.style.display = 'block';
}

function showBusinessLineDetail(line) {
    const modal = document.getElementById('detailModal'); if (!AppState.processedData) return;
    document.getElementById('modalTitle').textContent = `Línea: ${line}`;
    const rows = AppState.processedData.rows.filter(r => r.lineaNegocio === line);
    const tots = rows.reduce((a, r) => { a.v += r.venta; a.m += r.margen; return a; }, { v: 0, m: 0 });
    document.getElementById('modalKPIs').innerHTML = `<div class="kpi-card"><span>Ventas</span><strong>${formatCurrency(tots.v)}</strong></div><div class="kpi-card"><span>Margen</span><strong>${formatCurrency(tots.m)}</strong></div><div class="kpi-card"><span>Rendimiento</span><strong>${calculateMarginPercentage(tots.v, tots.m).toFixed(1)}%</strong></div>`;
    document.getElementById('modalTableBody').innerHTML = rows.map(r => `<tr><td>${r.centro}</td><td class="text-right">${formatCurrency(r.venta)}</td><td class="text-right">${formatCurrency(r.presVenta)}</td><td class="text-right">${formatCurrency(r.margen)}</td></tr>`).join('');
    modal.style.display = 'block';
}

// ========================================
// 11. Persistence & Settings
// ========================================
function saveToHistory(d) {
    const idx = AppState.historicalData.findIndex(h => h.period === d.period);
    if (idx >= 0) AppState.historicalData[idx] = d; else AppState.historicalData.push(d);
    localStorage.setItem('cierresPro_history', JSON.stringify(AppState.historicalData));
    renderHistory(); updateMonthlyChart();
}

function loadHistoryFromStorage() {
    const s = localStorage.getItem('cierresPro_history');
    if (s) { try { AppState.historicalData = JSON.parse(s); renderHistory(); updateMonthlyChart(); } catch (e) { } }
}

function renderHistory() {
    const g = document.getElementById('historyGrid'); if (!g) return;
    if (!AppState.historicalData.length) { g.innerHTML = '<div class="empty-state-large"><h3>Sin histórico</h3></div>'; return; }
    g.innerHTML = AppState.historicalData.slice().reverse().map((item, i) => {
        const idx = AppState.historicalData.length - 1 - i;
        return `<div class="history-card" onclick="loadHistoryItem(${idx})"><div class="history-header"><span>${item.period}</span><button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteHistoryItem(${idx})">×</button></div><div class="history-stats"><div>Ventas: ${formatCurrency(item.totals.totalVenta)}</div><div>Margen: ${formatCurrency(item.totals.totalMargen)}</div></div></div>`;
    }).join('');
}

window.deleteHistoryItem = (i) => { if (confirm('¿Eliminar registro?')) { AppState.historicalData.splice(i, 1); localStorage.setItem('cierresPro_history', JSON.stringify(AppState.historicalData)); renderHistory(); updateMonthlyChart(); } };
window.loadHistoryItem = (i) => {
    const it = AppState.historicalData[i]; if (!it) return;
    AppState.processedData = it; updateDashboard(it); document.getElementById('currentPeriod').textContent = it.period; window.navigateToSection('dashboard');
};

function saveSettings() {
    AppState.settings = { revenueColumn: document.getElementById('revenueColumn').value, costColumn: document.getElementById('costColumn').value, dateColumn: document.getElementById('dateColumn').value, categoryColumn: document.getElementById('categoryColumn').value };
    localStorage.setItem('cierresPro_settings', JSON.stringify(AppState.settings)); showToast('Ajustes guardados', 'success');
}

function loadSettings() {
    const s = JSON.parse(localStorage.getItem('cierresPro_settings') || '{}');
    AppState.settings = s;['revenueColumn', 'costColumn', 'dateColumn', 'categoryColumn'].forEach(k => { const el = document.getElementById(k); if (el) el.value = s[k] || ''; });
}

// ========================================
// 12. Backup & Export
// ========================================
function exportData() {
    const rows = [['Período', 'Ventas', 'Costes', 'Margen']]; AppState.historicalData.forEach(h => rows.push([h.period, h.totals.totalVenta, h.totals.totalCoste, h.totals.totalMargen]));
    const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen'); XLSX.writeFile(wb, `CierresPro_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportHistory() {
    const b = new Blob([JSON.stringify(AppState.historicalData)], { type: 'application/json' }), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = 'CierresPro_Backup.json'; a.click();
}

function importHistory() {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json';
    i.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (Array.isArray(d)) { AppState.historicalData = d; localStorage.setItem('cierresPro_history', JSON.stringify(d)); renderHistory(); updateMonthlyChart(); showToast('Backup restaurado', 'success'); } } catch (err) { } };
        reader.readAsText(e.target.files[0]);
    }; i.click();
}

// ========================================
// 13. PDF Export
// ========================================
async function exportToPDF(id, name) {
    const el = document.getElementById(id); if (!el) return;
    showToast('Generando PDF...', 'info');
    try {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
        const img = canvas.toDataURL('image/png'), pdf = new jsPDF('p', 'mm', 'a4');
        const props = pdf.getImageProperties(img), w = pdf.internal.pageSize.getWidth(), h = (props.height * w) / props.width;
        pdf.addImage(img, 'PNG', 0, 0, w, h); pdf.save(`${name}.pdf`); showToast('PDF exportado', 'success');
    } catch (e) { showToast('Error al exportar PDF', 'error'); }
}

// Global Exports
window.exportData = exportData;
window.exportHistory = exportHistory;
window.importHistory = importHistory;
window.renderClients = renderClients;
window.renderAnalysis = renderAnalysis;
window.saveSettings = saveSettings;
