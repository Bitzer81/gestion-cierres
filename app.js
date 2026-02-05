/* ========================================
   CierresPro - Professional CRM & Analytics
   Reorganized & Optimized Version 1.4.1
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
    initClientsHubHandlers();
});

function initClientsHubHandlers() {
    const btn = document.getElementById('clientsHubBtn');
    const modal = document.getElementById('clientsHubModal');
    const closeBtn = document.getElementById('closeClientsHub');

    if (btn) btn.addEventListener('click', openClientsHub);
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';

    // Extender el handler de window.onclick existente
    const oldWinClick = window.onclick;
    window.onclick = (e) => {
        if (oldWinClick) oldWinClick(e);
        if (e.target == modal) modal.style.display = 'none';
    };
}

function initModalHandlers() {
    const modal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('closeModal');
    const searchInput = document.getElementById('modalSearch');

    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';

    // Global click to close
    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = 'none';
    };

    // Search functionality
    if (searchInput) {
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = currentModalRows.filter(r =>
                (r.centro && r.centro.toLowerCase().includes(term)) ||
                (r.lineaNegocio && r.lineaNegocio.toLowerCase().includes(term)) ||
                (r.cliente && r.cliente.toLowerCase().includes(term))
            );
            renderModalTable(filtered);
        };
    }
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
    const pageTitle = document.getElementById('pageTitle');
    const headerSubtitle = document.querySelector('.header-subtitle');

    const sectionInfo = {
        dashboard: { title: 'Resumen General', subtitle: 'Vista combinada de métricas y análisis' },
        clients: { title: 'Gestión de Clientes', subtitle: 'Análisis detallado por cliente', onEnter: renderClients },
        history: { title: 'Histórico de Cierres', subtitle: 'Registros de meses anteriores', onEnter: renderHistory },
        settings: { title: 'Configuración', subtitle: 'Ajustes del sistema y datos', onEnter: loadSettings }
    };

    function navigateToSection(sectionId) {
        if (sectionId === 'upload') {
            toggleUploadPanel(true);
            return;
        }

        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');

        navItems.forEach(nav => nav.classList.toggle('active', nav.dataset.section === sectionId));
        sections.forEach(section => {
            if (section.id !== 'upload') {
                section.classList.toggle('active', section.id === sectionId);
            }
        });

        const info = sectionInfo[sectionId];
        if (info) {
            pageTitle.textContent = info.title;
            headerSubtitle.textContent = info.subtitle;
            if (info.onEnter) info.onEnter();
        }
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToSection(item.dataset.section);
        });
    });

    window.navigateToSection = navigateToSection;
}

function toggleUploadPanel(show) {
    const uploadSec = document.getElementById('upload');
    uploadSec.style.display = show ? 'flex' : 'none';
    uploadSec.classList.toggle('active', show);
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
        toggleUploadPanel(false);
        AppState.currentData = null;
    });

    document.getElementById('confirmUpload').addEventListener('click', () => {
        if (AppState.currentData) {
            try {
                processData(AppState.currentData);
                toggleUploadPanel(false);
                window.navigateToSection('dashboard');
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
            toggleUploadPanel(true);
        });
    }

    document.getElementById('filterCliente')?.addEventListener('change', filterData);
    document.getElementById('filterCentro')?.addEventListener('change', filterData);
    document.getElementById('filterLinea')?.addEventListener('change', filterData);
    document.getElementById('filterEstado')?.addEventListener('change', filterData);
    document.getElementById('filterLowPerf')?.addEventListener('change', filterData);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('filterCliente', '');
        setVal('filterCentro', '');
        setVal('filterLinea', '');
        setVal('filterEstado', '');
        const lp = document.getElementById('filterLowPerf'); if (lp) lp.checked = false;
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
    if (!venta || venta === 0) return 0;
    // Standard margin percentage: (Margen / Venta) * 100
    // Handle all sign combinations correctly
    const pct = (margen / venta) * 100;
    // If both are negative (credit notes), preserve negative percentage
    // If venta is negative but margen positive (unusual), show positive
    return pct;
}

function processData(data) {
    const heads = data.headers;
    const colIdx = {};
    Object.keys(EXCEL_COLUMNS).forEach(key => colIdx[key] = getColumnIndex(heads, EXCEL_COLUMNS[key]));

    if (colIdx.venta === -1 || colIdx.coste === -1) {
        throw new Error('No se han encontrado las columnas de "Venta" o "Coste". Revisa la configuración o usa la plantilla.');
    }

    let totalV = 0, totalC = 0, totalM = 0, totalPV = 0, totalPC = 0;
    const byCenter = {}, byLinea = {}, processedRows = [];
    const forbiddenKeywords = ['TOTAL', 'SUBTOTAL', 'STOTAL', 'SUMA', 'RESULTADO', 'PROMEDIO', 'ACUMULADO', 'VARIACION'];

    data.rows.forEach(row => {
        if (!row || !row.length) return;

        // Extraer valores básicos - separamos Nom_cliente del Nombre del pedido
        const nomCliente = String(row[colIdx.nomCliente] || '').trim();
        const nombrePedido = String(row[colIdx.nombre] || '').trim();
        const centroRaw = String(row[colIdx.nomCentro] || '').trim();
        const codCli = String(row[colIdx.codCliente] || '').trim();
        const codCen = String(row[colIdx.codCentro] || '').trim();

        // Para validación usamos el nombre del cliente o el del pedido
        const nameRaw = nomCliente || nombrePedido;
        const name = nameRaw.toUpperCase();
        const centro = centroRaw;
        const linea = String(row[colIdx.lineaNegocio] || 'Sin Línea').trim();
        const estado = String(row[colIdx.estado] || 'Sin Estado').trim();

        // 1. FILTRADO DE FILAS VACÍAS O DE ENCABEZADO REPETIDO
        if (!name || name === 'UNDEFINED' || name === 'NULL' || name === 'NOMBRE' || name === 'NOM_CLIENTE') return;

        // 2. FILTRADO ULTRA-ESTRICTO DE SUB-TOTALES Y RESÚMENES
        const isSummaryRow = row.some(cell => {
            if (typeof cell !== 'string') return false;
            const c = cell.toUpperCase();
            return forbiddenKeywords.some(key => c.includes(key));
        });
        if (isSummaryRow) return;

        // 3. VALIDACIÓN DE IDENTIDAD
        if (!codCli && !codCen && !centroRaw && !nameRaw) return;

        const venta = parseNumber(row[colIdx.venta]);
        const coste = parseNumber(row[colIdx.coste]);
        const margen = parseNumber(row[colIdx.margen]);
        const mPct = parseNumber(row[colIdx.margenPct]);
        const m2Pct = parseNumber(row[colIdx.margen2Pct]);
        const presV = parseNumber(row[colIdx.presVenta]);
        const presC = parseNumber(row[colIdx.presCoste]);

        // 4. IGNORAR FILAS SIN ACTIVIDAD REAL
        if (!centroRaw && venta === 0 && coste === 0 && margen === 0) return;

        // Si hemos pasado todos los filtros, acumulamos
        totalV += venta;
        totalC += coste;
        totalM += margen;
        totalPV += presV;
        totalPC += presC;

        if (!byCenter[centro]) byCenter[centro] = { venta: 0, coste: 0, margen: 0, presVenta: 0, presCoste: 0 };
        byCenter[centro].venta += venta;
        byCenter[centro].coste += coste;
        byCenter[centro].margen += margen;
        byCenter[centro].presVenta += presV;
        byCenter[centro].presCoste += presC;

        if (!byLinea[linea]) byLinea[linea] = { venta: 0, margen: 0 };
        byLinea[linea].venta += venta;
        byLinea[linea].margen += margen;

        processedRows.push({
            codCliente: codCli,
            nomCliente: nomCliente || 'Sin Cliente',
            centro,
            cliente: nombrePedido || nameRaw || 'Sin Cliente',
            lineaNegocio: linea,
            estado,
            venta,
            coste,
            margen,
            margenPct: mPct || calculateMarginPercentage(venta, margen),
            margen2Pct: m2Pct,
            presVenta: presV,
            allData: row
        });
    });

    const period = extractPeriodFromFileName(data.fileName);
    AppState.processedData = {
        period,
        rows: processedRows,
        totals: {
            totalVenta: totalV,
            totalCoste: totalC,
            totalMargen: totalM,
            totalPresVenta: totalPV,
            totalPresCoste: totalPC
        },
        byCenter,
        byLineaNegocio: byLinea
    };

    calculateYoY(AppState.processedData);
    calculateBudgets(AppState.processedData);
    populateFilters(processedRows);
    updateDashboard(AppState.processedData);
    document.getElementById('currentPeriod').textContent = period;
    saveToHistory(AppState.processedData);
}

function parseNumber(v) {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return v;

    let s = String(v).trim();
    if (!s) return 0;

    // Detectar signo negativo
    let neg = false;
    if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.replace(/[()]/g, ''); }
    else if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
    else if (s.startsWith('-')) { neg = true; s = s.slice(1); }

    s = s.replace(/[€$£\s]/g, '');

    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    if (lastComma > lastDot) {
        // Formato Europeo: 1.234,56
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // Formato Americano: 1,234.56
        s = s.replace(/,/g, '');
    } else {
        if (lastComma !== -1) s = s.replace(',', '.');
    }

    const n = parseFloat(s);
    return isNaN(n) ? 0 : (neg ? -Math.abs(n) : n);
}

function extractPeriodFromFileName(f) {
    const ms = { 'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril', 'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto', 'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre' };
    const low = f.toLowerCase();
    for (const [k, v] of Object.entries(ms)) { if (low.includes(k)) return `${v} ${low.match(/20\d{2}/)?.[0] || new Date().getFullYear()}`; }
    return f.replace(/\.[^/.]+$/, '');
}

function calculateYoY(data) {
    // Find same period from previous year in historical data
    const currentPeriod = data.period;
    if (!currentPeriod) {
        AppState.yoyMetrics = { revenueChange: 0, marginChange: 0, available: false };
        return;
    }

    // Extract month and compare with history
    const monthMatch = currentPeriod.match(/^(\w+)\s+(\d{4})$/);
    if (!monthMatch) {
        AppState.yoyMetrics = { revenueChange: 0, marginChange: 0, available: false };
        return;
    }

    const [, month, year] = monthMatch;
    const prevYear = parseInt(year) - 1;
    const prevPeriod = `${month} ${prevYear}`;

    const prevData = AppState.historicalData.find(h => h.period === prevPeriod);
    if (!prevData) {
        AppState.yoyMetrics = { revenueChange: 0, marginChange: 0, available: false };
        return;
    }

    const revChange = prevData.totals.totalVenta !== 0
        ? ((data.totals.totalVenta - prevData.totals.totalVenta) / Math.abs(prevData.totals.totalVenta)) * 100
        : 0;
    const marChange = prevData.totals.totalMargen !== 0
        ? ((data.totals.totalMargen - prevData.totals.totalMargen) / Math.abs(prevData.totals.totalMargen)) * 100
        : 0;

    AppState.yoyMetrics = { revenueChange: revChange, marginChange: marChange, available: true };
}

function calculateBudgets(data) {
    const totals = data.totals;
    if (!totals.totalPresVenta || totals.totalPresVenta === 0) {
        AppState.budgetMetrics = { revenueAchievement: 0, marginAchievement: 0, available: false };
        return;
    }

    // Revenue Achievement: (Actual Sales / Budget Sales) * 100
    const revAchievement = (totals.totalVenta / totals.totalPresVenta) * 100;

    // Margin Achievement: (Actual Margin / Budget Margin) * 100
    // Budget Margin = Budget Sales - Budget Cost
    const budgetMargin = totals.totalPresVenta - (totals.totalPresCoste || 0);
    const marAchievement = budgetMargin !== 0
        ? (totals.totalMargen / budgetMargin) * 100
        : 100;

    AppState.budgetMetrics = {
        revenueAchievement: revAchievement,
        marginAchievement: marAchievement,
        available: true
    };
}

function refreshNavigation() {
    // Refresh nav items after client changes
    renderClientSettingsList();
}

window.refreshNavigation = refreshNavigation;


// ========================================
// 6. UI Controller
// ========================================
function updateKPIs(data) {
    // Handle both direct totals and nested totals object
    const totals = data.totals || data;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    const venta = totals.totalVenta || totals.totalRevenue || 0;
    const coste = totals.totalCoste || totals.totalCost || 0;
    const margen = totals.totalMargen || totals.netMargin || 0;

    set('totalRevenue', formatCurrency(venta));
    set('totalCost', formatCurrency(coste));
    set('netMargin', formatCurrency(margen));

    // Calculate performance percentage
    const perf = totals.performance || (venta ? ((margen / venta) * 100) : 0);
    set('performance', perf.toFixed(1) + '%');

    const revY = document.getElementById('revenueYoY'), marY = document.getElementById('marginYoY');
    if (AppState.yoyMetrics.available) {
        if (revY) updateYoYBadge(revY, AppState.yoyMetrics.revenueChange);
        if (marY) updateYoYBadge(marY, AppState.yoyMetrics.marginChange);
    } else {
        if (revY) revY.style.display = 'none';
        if (marY) marY.style.display = 'none';
    }

    const revB = document.getElementById('revenueBudget'), marB = document.getElementById('marginBudget');
    if (AppState.budgetMetrics.available) {
        if (revB) updateBudgetBadge(revB, AppState.budgetMetrics.revenueAchievement);
        if (marB) updateBudgetBadge(marB, AppState.budgetMetrics.marginAchievement);
    } else {
        if (revB) revB.style.display = 'none';
        if (marB) marB.style.display = 'none';
    }
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
    tbody.innerHTML = rows.length ? [...rows].sort((a, b) => b.venta - a.venta).map(row => {
        const isLow = row.margenPct < 20;
        return `
        <tr class="${isLow ? 'critical-row' : ''}">
            <td title="${row.cliente}">${truncateText(row.cliente, 30)}</td>
            <td><span class="badge badge-center">${truncateText(row.centro, 15)}</span></td>
            <td><span class="badge badge-linea">${truncateText(row.lineaNegocio, 15)}</span></td>
            <td class="text-right" style="color: var(--color-revenue)">${formatCurrency(row.venta)}</td>
            <td class="text-right" style="color: var(--color-cost)">${formatCurrency(row.coste)}</td>
            <td class="text-right" style="color: ${row.margen >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)'}">${formatCurrency(row.margen)}</td>
            <td class="text-right ${isLow ? 'critical-margin' : ''}">
                ${isLow ? '⚠️ ' : ''}${row.margenPct.toFixed(1)}%
            </td>
        </tr>`;
    }).join('') : '<tr class="empty-state"><td colspan="7">No hay datos</td></tr>';
    const header = document.querySelector('.table-header h3');
    if (header) header.textContent = `Detalle del Período (${rows.length} registros)`;
}

function renderAnalysis() {
    const tb = document.getElementById('detailedTableBody');
    if (!tb || !AppState.processedData) return;
    tb.innerHTML = AppState.processedData.rows.map(r => {
        const isLow = r.margenPct < 20;
        return `
        <tr class="${isLow ? 'critical-row' : ''}">
            <td>${r.centro}</td>
            <td>${r.cliente}</td>
            <td><span class="badge">${r.lineaNegocio}</span></td>
            <td><span class="badge">${r.estado}</span></td>
            <td class="text-right">${formatCurrency(r.venta)}</td>
            <td class="text-right">${formatCurrency(r.coste)}</td>
            <td class="text-right" style="color: ${r.margen >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)'}">${formatCurrency(r.margen)}</td>
            <td class="text-right ${isLow ? 'critical-margin' : ''}">${isLow ? '⚠️ ' : ''}${r.margenPct.toFixed(1)}%</td>
        </tr>`;
    }).join('');
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
    const fill = (id, opts, label = 'Todos') => {
        const s = document.getElementById(id);
        if (!s) return;
        const cur = s.value;
        s.innerHTML = `<option value="">${label}</option>` + opts.map(o => `<option value="${o}">${o}</option>`).join('');
        s.value = opts.includes(cur) ? cur : '';
    };
    fill('filterCliente', getU('nomCliente'), 'Todos');
    fill('filterCentro', getU('centro'), 'Todos');
    fill('filterLinea', getU('lineaNegocio'), 'Todas');
    fill('filterEstado', getU('estado'), 'Todos');
}

function filterData() {
    if (!AppState.processedData) return;
    const cli = document.getElementById('filterCliente')?.value || '';
    const c = document.getElementById('filterCentro')?.value || '';
    const l = document.getElementById('filterLinea')?.value || '';
    const e = document.getElementById('filterEstado')?.value || '';
    const lp = document.getElementById('filterLowPerf')?.checked || false;

    const fil = AppState.processedData.rows.filter(r =>
        (!cli || r.nomCliente === cli) &&
        (!c || r.centro === c) &&
        (!l || r.lineaNegocio === l) &&
        (!e || r.estado === e) &&
        (!lp || r.margenPct < 20)
    );
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
    renderAnalysis();
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
    l.innerHTML = cs.map(c => {
        const mPct = calculateMarginPercentage(c.totalVenta, c.totalMargen);
        const isLow = mPct < 20;
        return `
        <div class="client-item ${isLow ? 'critical-row' : ''}" onclick="selectClient('${c.name.replace(/'/g, "\\'")}')">
            <div class="client-item-header">
                <span>${truncateText(c.name, 25)}</span>
                <strong>${formatCurrency(c.totalVenta)}</strong>
            </div>
            <div class="client-metrics">
                <span>${c.centers.length} Centros</span>
                <span style="color:${c.totalMargen >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}" class="${isLow ? 'critical-margin' : ''}">
                    ${isLow ? '⚠️ ' : ''}${mPct.toFixed(1)}%
                </span>
            </div>
        </div>`;
    }).join('');
}

window.selectClient = (name) => {
    const c = currentClientsData.find(cl => cl.name === name); if (!c) return;
    const v = document.getElementById('clientDetailView');
    const mTotal = calculateMarginPercentage(c.totalVenta, c.totalMargen);
    v.innerHTML = `
        <div class="client-detail-header ${mTotal < 20 ? 'critical-row' : ''}" style="padding:15px; border-radius:8px;">
            <h2>${c.name}</h2>
            <div class="text-right">
                <h3>${formatCurrency(c.totalVenta)}</h3>
                <span class="${mTotal < 20 ? 'critical-margin' : ''}">${mTotal < 20 ? '⚠️ ' : ''}MG: ${mTotal.toFixed(1)}%</span>
            </div>
        </div>
        <table class="modal-table">
            <thead>
                <tr>
                    <th>Centro</th>
                    <th class="text-right">Venta</th>
                    <th class="text-right">Margen</th>
                </tr>
            </thead>
            <tbody>
                ${c.centers.map(r => {
        const isLow = r.margenPct < 20;
        return `
                    <tr class="${isLow ? 'critical-row' : ''}">
                        <td>${r.centro}</td>
                        <td class="text-right">${formatCurrency(r.venta)}</td>
                        <td class="text-right ${isLow ? 'critical-margin' : ''}">${isLow ? '⚠️ ' : ''}${r.margenPct.toFixed(1)}%</td>
                    </tr>`;
    }).join('')}
            </tbody>
        </table>`;
};

function initClientManager() {
    renderClientSettingsList();
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
    // Ya no generamos secciones dinámicas para simplificar la página.
    // Los clientes favoritos se mostrarán dentro de la vista de "Clientes".
}

function renderClientDashboard(name, id) {
    if (!AppState.processedData) return;
    const rows = AppState.processedData.rows.filter(r => String(r.cliente).toUpperCase().includes(name));
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
    // Chart.js Global Defaults for Light Theme
    Chart.defaults.color = '#64748b';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.scale.grid.color = 'rgba(226, 232, 240, 0.4)';

    const common = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    color: '#475569'
                }
            },
            tooltip: {
                backgroundColor: '#ffffff',
                titleColor: '#0f172a',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                boxPadding: 6,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null && context.parsed.y !== undefined) {
                            label += formatCurrency(context.chart.config.options.indexAxis === 'y' ? context.parsed.x : context.parsed.y);
                        } else if (context.parsed !== null && context.parsed !== undefined) {
                            label += formatCurrency(context.parsed);
                        }
                        return label;
                    }
                }
            }
        }
    };

    AppState.charts.monthly = new Chart(document.getElementById('monthlyChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Ingresos', borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.05)', fill: true, tension: 0.4 }, { label: 'Costes', borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', fill: true, tension: 0.4 }] }, options: common });

    AppState.charts.distribution = new Chart(document.getElementById('costDistributionChart'), { type: 'doughnut', data: { labels: [], datasets: [{ backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'], borderWidth: 2, borderColor: '#ffffff' }] }, options: common });

    AppState.charts.topVentas = new Chart(document.getElementById('topVentasChart'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Ventas (€)', backgroundColor: '#10b981', borderRadius: 4 }] },
        options: { ...common, indexAxis: 'y', onClick: (e, els) => { if (els.length) showDetailModal(AppState.charts.topVentas.data.labels[els[0].index]); } }
    });

    AppState.charts.topMargen = new Chart(document.getElementById('topMargenChart'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Margen (€)', backgroundColor: '#6366f1', borderRadius: 4 }] },
        options: { ...common, indexAxis: 'y', onClick: (e, els) => { if (els.length) showDetailModal(AppState.charts.topMargen.data.labels[els[0].index]); } }
    });

    AppState.charts.distribution.options.onClick = (e, els) => { if (els.length) showBusinessLineDetail(AppState.charts.distribution.data.labels[els[0].index]); };
    initModalHandlers();
}

function updateCharts(byL, byC) {
    // Distribution chart - Ventas por línea de negocio
    if (AppState.charts.distribution) {
        const ls = Object.keys(byL).sort((a, b) => byL[b].venta - byL[a].venta).slice(0, 8);
        AppState.charts.distribution.data.labels = ls;
        AppState.charts.distribution.data.datasets[0].data = ls.map(l => byL[l].venta);
        AppState.charts.distribution.update();
    }

    // Top 5 Centros por Venta
    if (AppState.charts.topVentas) {
        const topVentas = Object.keys(byC)
            .filter(c => c && c.trim() !== '')
            .map(c => ({ name: c, venta: byC[c].venta }))
            .sort((a, b) => b.venta - a.venta)
            .slice(0, 5);
        AppState.charts.topVentas.data.labels = topVentas.map(c => c.name);
        AppState.charts.topVentas.data.datasets[0].data = topVentas.map(c => c.venta);
        AppState.charts.topVentas.update();
    }

    // Top 5 Centros por Margen
    if (AppState.charts.topMargen) {
        const topMargen = Object.keys(byC)
            .filter(c => c && c.trim() !== '')
            .map(c => ({ name: c, margen: byC[c].margen }))
            .sort((a, b) => b.margen - a.margen)
            .slice(0, 5);
        AppState.charts.topMargen.data.labels = topMargen.map(c => c.name);
        AppState.charts.topMargen.data.datasets[0].data = topMargen.map(c => c.margen);
        AppState.charts.topMargen.update();
    }

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
// Store current modal rows for searching
let currentModalRows = [];

function renderModalTable(rows) {
    const tableBody = document.getElementById('modalTableBody');
    tableBody.innerHTML = rows.map(r => `
        <tr>
            <td>${r.centro || r.lineaNegocio}</td>
            <td class="text-right">${formatCurrency(r.venta)}</td>
            <td class="text-right">${r.presVenta ? formatCurrency(r.presVenta) : '-'}</td>
            <td class="text-right ${r.margen >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(r.margen)}</td>
        </tr>
    `).join('');
}

function showDetailModal(center) {
    const modal = document.getElementById('detailModal'), d = AppState.processedData?.byCenter[center]; if (!d) return;
    const searchInput = document.getElementById('modalSearch');

    document.getElementById('modalTitle').textContent = `Detalle: ${center}`;
    if (searchInput) searchInput.value = '';

    document.getElementById('modalKPIs').innerHTML = `<div class="kpi-card"><span>Ventas</span><strong>${formatCurrency(d.venta)}</strong></div><div class="kpi-card"><span>Margen (€)</span><strong>${formatCurrency(d.margen)}</strong></div><div class="kpi-card"><span>Rendimiento</span><strong>${calculateMarginPercentage(d.venta, d.margen).toFixed(1)}%</strong></div>`;

    currentModalRows = AppState.processedData.rows.filter(r => r.centro === center);
    renderModalTable(currentModalRows);

    modal.style.display = 'block';
}

function showBusinessLineDetail(line) {
    const modal = document.getElementById('detailModal'); if (!AppState.processedData) return;
    const searchInput = document.getElementById('modalSearch');

    document.getElementById('modalTitle').textContent = `Línea: ${line}`;
    if (searchInput) searchInput.value = '';

    currentModalRows = AppState.processedData.rows.filter(r => r.lineaNegocio === line);
    const tots = currentModalRows.reduce((a, r) => { a.v += r.venta; a.m += r.margen; return a; }, { v: 0, m: 0 });

    document.getElementById('modalKPIs').innerHTML = `<div class="kpi-card"><span>Ventas</span><strong>${formatCurrency(tots.v)}</strong></div><div class="kpi-card"><span>Margen</span><strong>${formatCurrency(tots.m)}</strong></div><div class="kpi-card"><span>Rendimiento</span><strong>${calculateMarginPercentage(tots.v, tots.m).toFixed(1)}%</strong></div>`;

    renderModalTable(currentModalRows);
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
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
        const img = canvas.toDataURL('image/png'), pdf = new jsPDF('p', 'mm', 'a4');
        const props = pdf.getImageProperties(img), w = pdf.internal.pageSize.getWidth(), h = (props.height * w) / props.width;
        pdf.addImage(img, 'PNG', 0, 0, w, h); pdf.save(`${name}.pdf`); showToast('PDF exportado', 'success');
    } catch (e) { showToast('Error al exportar PDF', 'error'); }
}

function openClientsHub() {
    if (!AppState.processedData) return showToast('Primero carga los datos del período', 'warning');

    const d = AppState.processedData.rows;
    const map = {};
    d.forEach(r => {
        const n = r.cliente || r.nombre || 'Desconocido';
        if (!map[n]) map[n] = { name: n, venta: 0, margen: 0, centers: 0 };
        map[n].venta += r.venta;
        map[n].margen += r.margen;
        map[n].centers++;
    });

    const ranking = Object.values(map)
        .sort((a, b) => b.venta - a.venta)
        .slice(0, 10);

    const list = document.getElementById('clientsHubRanking');
    const totalVenta = AppState.processedData.totals.totalVenta;

    list.innerHTML = ranking.map((c, i) => `
        <div class="ranking-item" onclick="viewClientDetailFromHub('${c.name.replace(/'/g, "\\'")}')">
            <div class="ranking-pos">${i + 1}</div>
            <div class="ranking-info">
                <span class="ranking-name">${c.name}</span>
                <span class="ranking-meta">${c.centers} centros activos</span>
            </div>
            <div class="ranking-value">
                <span class="ranking-amount">${formatCurrency(c.venta)}</span>
                <span class="ranking-pct">${((c.venta / totalVenta) * 100).toFixed(1)}% del total</span>
            </div>
        </div>
    `).join('');

    document.getElementById('clientsHubModal').style.display = 'block';
}

window.viewClientDetailFromHub = (name) => {
    document.getElementById('clientsHubModal').style.display = 'none';
    window.navigateToSection('clients');
    setTimeout(() => {
        window.selectClient(name);
        const searchInput = document.getElementById('clientSearch');
        if (searchInput) {
            searchInput.value = name;
            searchInput.dispatchEvent(new Event('input'));
        }
    }, 100);
};

// Global Exports
window.exportData = exportData;
window.exportHistory = exportHistory;
window.importHistory = importHistory;
window.renderClients = renderClients;
window.renderAnalysis = renderAnalysis;
window.saveSettings = saveSettings;
window.openClientsHub = openClientsHub;
