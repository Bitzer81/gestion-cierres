/* ========================================
   CierresPro - Professional CRM & Analytics
   Reorganized & Optimized Version 1.6.0
   ======================================== */

// ========================================
// 0. Constants & Configuration
// ========================================
const STORAGE_KEYS = {
    HISTORY: 'cierresPro_history',
    SETTINGS: 'cierresPro_settings',
    GOOGLE_CREDS: 'cpro_google_creds',
    MANAGED_CLIENTS: 'cpro_managed_clients'
};

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

// Modal state (declared early to avoid hoisting issues)
let currentModalRows = [];

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
}

function initModalHandlers() {
    const detailModal = document.getElementById('detailModal');
    const clientsHubModal = document.getElementById('clientsHubModal');
    const closeBtn = document.getElementById('closeModal');
    const searchInput = document.getElementById('modalSearch');

    if (closeBtn) closeBtn.onclick = () => detailModal.style.display = 'none';

    // Single global click handler for all modals (using addEventListener to avoid overwriting)
    window.addEventListener('click', (e) => {
        if (e.target === detailModal) detailModal.style.display = 'none';
        if (e.target === clientsHubModal) clientsHubModal.style.display = 'none';
    });

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
        reports: { title: 'Generador de Informes', subtitle: 'Redacción de informe ejecutivo', onEnter: () => { } },
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
    document.getElementById('previewContainer').style.display = 'flex';
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

    // Debug: mostrar columnas detectadas
    console.log('Columnas detectadas:', {
        nomCliente: colIdx.nomCliente,
        nomCentro: colIdx.nomCentro,
        nombre: colIdx.nombre,
        headers: heads.slice(0, 10)
    });

    if (colIdx.venta === -1 || colIdx.coste === -1) {
        throw new Error('No se han encontrado las columnas de "Venta" o "Coste". Revisa la configuración o usa la plantilla.');
    }

    let totalV = 0, totalC = 0, totalM = 0, totalPV = 0, totalPC = 0;
    const byCenter = {}, byLinea = {}, processedRows = [];
    const forbiddenKeywords = ['TOTAL', 'SUBTOTAL', 'STOTAL', 'SUMA', 'RESULTADO', 'PROMEDIO', 'ACUMULADO', 'VARIACION'];

    data.rows.forEach(row => {
        if (!row || !row.length) return;

        // Extraer valores bÃ¡sicos - separamos Nom_cliente del Nombre del pedido
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

        // 3. VALIDACIÃ“N DE IDENTIDAD
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

    // Eliminar caracteres invisibles, espacios y símbolos de moneda
    // \u00A0 es non-breaking space
    s = s.replace(/[\s\u00A0€$£%]/g, '');

    // Detectar signo negativo (paréntesis o signo menos al final/principio)
    let neg = false;
    if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.slice(1, -1); }
    else if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
    else if (s.startsWith('-')) { neg = true; s = s.slice(1); }

    // Determinar formato numérico
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    if (lastComma > lastDot) {
        // Formato Europeo probable: 1.234,56
        // Eliminamos puntos de miles y reemplazamos coma decimal por punto
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // Formato Americano probable: 1,234.56
        // Eliminamos comas de miles
        s = s.replace(/,/g, '');
    } else {
        // Solo hay comas o solo puntos, o ninguno
        // Si hay coma y no punto, asumimos decimal europeo (12,5)
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
                ${isLow ? 'âš ï¸ ' : ''}${row.margenPct.toFixed(1)}%
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
            <td class="text-right ${isLow ? 'critical-margin' : ''}">${isLow ? 'âš ï¸ ' : ''}${r.margenPct.toFixed(1)}%</td>
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

    // Performance: Limit data table rendering to top 100 rows
    updateDataTable(data.rows.slice(0, 100));

    // Consolidated Aggregation
    const agg = {
        byCenter: {},
        byLine: {},
        byStatus: {}
    };

    data.rows.forEach(r => {
        // By Center
        if (!agg.byCenter[r.centro]) {
            agg.byCenter[r.centro] = { revenue: r.venta, cost: r.coste, margin: r.margen, venta: r.venta, margen: r.margen, presVenta: r.presVenta || 0 };
        } else {
            const c = agg.byCenter[r.centro];
            c.revenue += r.venta; c.cost += r.coste; c.margin += r.margen;
            c.venta += r.venta; c.margen += r.margen; c.presVenta += (r.presVenta || 0);
        }

        // By Line
        if (!agg.byLine[r.lineaNegocio]) agg.byLine[r.lineaNegocio] = { venta: 0, margen: 0 };
        agg.byLine[r.lineaNegocio].venta += r.venta;
        agg.byLine[r.lineaNegocio].margen += r.margen;

        // By Status
        const estado = r.estado || 'Sin Estado';
        if (!agg.byStatus[estado]) agg.byStatus[estado] = { venta: 0, margen: 0 };
        agg.byStatus[estado].venta += r.venta;
        agg.byStatus[estado].margen += r.margen;
    });

    if (AppState.charts.monthly) updateCharts(agg.byLine, agg.byCenter, agg.byStatus);

    renderAnalysis();
    AppState.managedClients.forEach(cl => {
        if (document.getElementById(cl.id)) renderClientDashboard(cl.name, cl.id);
    });
}

// ========================================
// 8. Client Modules
// ========================================
let currentClientsData = [];

function renderClients() {
    const d = AppState.processedData?.rows;
    if (!d || !d.length) {
        const l = document.getElementById('clientsList');
        if (l) l.innerHTML = '<div class="empty-state-small">No hay datos cargados</div>';
        return;
    }

    // Función para extraer el nombre base del cliente desde el centro
    // Ej: "ALIMERKA,S.A." -> "ALIMERKA", "BAYER ASTURIAS" -> "BAYER"
    function extractClientName(centro) {
        if (!centro || centro === 'Sin centro') return null;

        // Lista de clientes conocidos para matchear
        const knownClients = ['ALIMERKA', 'CARREFOUR', 'BAYER', 'BASIC-FIT', 'BASICFIT', 'BASIC FIT',
            'HUCA', 'ALCAMPO', 'MERCADONA', 'EROSKI', 'DIA', 'LIDL', 'ALDI'];

        const centroUpper = centro.toUpperCase();

        // Primero intentar con clientes conocidos
        for (const client of knownClients) {
            if (centroUpper.includes(client)) {
                // Normalizar BASIC-FIT y variantes
                if (client === 'BASICFIT' || client === 'BASIC FIT') return 'BASIC-FIT';
                return client;
            }
        }

        // Si no es conocido, tomar la primera palabra significativa
        const firstWord = centro.split(/[\s,\.]+/)[0];
        return firstWord && firstWord.length > 2 ? firstWord.toUpperCase() : centro;
    }

    const map = {};
    d.forEach(r => {
        // Extraer nombre de cliente desde el centro
        const centroRaw = r.centro || r.nomCentro || '';
        const clientName = extractClientName(centroRaw);

        if (!clientName) return;

        if (!map[clientName]) map[clientName] = {
            name: clientName,
            centers: new Map(),
            totalVenta: 0,
            totalMargen: 0,
            totalCoste: 0,
            rowCount: 0
        };

        // Agregar centro único
        const centroName = centroRaw || 'Sin centro';
        if (!map[clientName].centers.has(centroName)) {
            map[clientName].centers.set(centroName, {
                name: centroName,
                venta: 0,
                coste: 0,
                margen: 0,
                lineaNegocio: r.lineaNegocio || '-',
                estado: r.estado || '-'
            });
        }
        const centro = map[clientName].centers.get(centroName);
        centro.venta += r.venta || 0;
        centro.coste += r.coste || 0;
        centro.margen += r.margen || 0;

        map[clientName].totalVenta += r.venta || 0;
        map[clientName].totalMargen += r.margen || 0;
        map[clientName].totalCoste += r.coste || 0;
        map[clientName].rowCount++;
    });

    // Convertir centers Map a Array y calcular margenPct
    currentClientsData = Object.values(map).map(c => ({
        ...c,
        centers: Array.from(c.centers.values()).map(ctr => ({
            ...ctr,
            margenPct: ctr.venta > 0 ? (ctr.margen / ctr.venta) * 100 : 0
        })).sort((a, b) => b.venta - a.venta)
    })).sort((a, b) => b.totalVenta - a.totalVenta);

    renderClientList(currentClientsData);

    const s = document.getElementById('clientSearch');
    if (s) {
        s.value = '';
        s.oninput = (e) => renderClientList(
            currentClientsData.filter(c =>
                c.name.toLowerCase().includes(e.target.value.toLowerCase())
            )
        );
    }
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
    const c = currentClientsData.find(cl => cl.name === name);
    if (!c) return;

    const v = document.getElementById('clientDetailView');
    const mTotal = calculateMarginPercentage(c.totalVenta, c.totalMargen);
    const isLowTotal = mTotal < 20;

    v.innerHTML = `
        <div class="client-detail-header" style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--bg-tertiary); border-radius: 12px; margin-bottom: 20px;">
            <div>
                <h2 style="margin: 0; font-size: 1.5rem; color: var(--text-primary);">👤 ${c.name}</h2>
                <span style="color: var(--text-muted); font-size: 0.9rem;">${c.centers.length} centros • ${c.rowCount || c.centers.length} registros</span>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.3rem; font-weight: 700; color: var(--accent-success);">${formatCurrency(c.totalVenta)}</div>
                <span class="${isLowTotal ? 'critical-margin' : ''}" style="font-size: 0.95rem;">
                    ${isLowTotal ? '⚠️ ' : '✅ '}Margen: ${mTotal.toFixed(1)}%
                </span>
            </div>
        </div>
        
        <div class="client-kpis" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
            <div class="history-stat-item">
                <div class="label">Venta Total</div>
                <div class="value">${formatCurrency(c.totalVenta)}</div>
            </div>
            <div class="history-stat-item">
                <div class="label">Coste Total</div>
                <div class="value negative">${formatCurrency(c.totalCoste)}</div>
            </div>
            <div class="history-stat-item">
                <div class="label">Margen Total</div>
                <div class="value ${c.totalMargen >= 0 ? 'positive' : 'negative'}">${formatCurrency(c.totalMargen)}</div>
            </div>
            <div class="history-stat-item">
                <div class="label">% Margen</div>
                <div class="value ${isLowTotal ? 'negative' : 'positive'}">${mTotal.toFixed(1)}%</div>
            </div>
        </div>
        
        <h3 style="margin-bottom: 12px; color: var(--text-secondary);">🔍 Centros de ${c.name}</h3>
        <div style="overflow-x: auto; max-height: 350px; overflow-y: auto;">
            <table class="modal-table" style="min-width: 600px;">
                <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
                    <tr>
                        <th>Centro</th>
                        <th>Línea</th>
                        <th class="text-right">Venta (€)</th>
                        <th class="text-right">Coste (€)</th>
                        <th class="text-right">Margen (€)</th>
                        <th class="text-right">% Margen</th>
                    </tr>
                </thead>
                <tbody>
                    ${c.centers.map(r => {
        const isLow = r.margenPct < 20;
        return `
                        <tr class="${isLow ? 'critical-row' : ''}">
                            <td title="${r.name}">${truncateText(r.name, 25)}</td>
                            <td><span class="badge badge-info">${r.lineaNegocio}</span></td>
                            <td class="text-right">${formatCurrency(r.venta)}</td>
                            <td class="text-right" style="color: var(--accent-danger);">${formatCurrency(r.coste)}</td>
                            <td class="text-right ${r.margen >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(r.margen)}</td>
                            <td class="text-right ${isLow ? 'critical-margin' : ''}">${isLow ? '⚠️ ' : ''}${r.margenPct.toFixed(1)}%</td>
                        </tr>`;
    }).join('')}
                </tbody>
            </table>
        </div>`;
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

    const kpisEl = document.getElementById(`${id}KPIs`);
    const tableEl = document.getElementById(`${id}TableBody`);

    if (kpisEl) {
        kpisEl.innerHTML = `<div class="kpi-card"><span>Ventas</span><strong>${formatCurrency(tots.v)}</strong></div><div class="kpi-card"><span>Margen (€)</span><strong>${formatCurrency(tots.m)}</strong></div><div class="kpi-card"><span>Margen (%)</span><strong>${calculateMarginPercentage(tots.v, tots.m).toFixed(1)}%</strong></div><div class="kpi-card"><span>Centros</span><strong>${rows.length}</strong></div>`;
    }
    if (tableEl) {
        tableEl.innerHTML = rows.map(r => `<tr><td>${r.centro}</td><td>${r.lineaNegocio}</td><td class="text-right">${formatCurrency(r.venta)}</td><td class="text-right">${r.margenPct.toFixed(1)}%</td></tr>`).join('');
    }
    const ch = AppState.charts[id];
    if (ch) { const map = rows.reduce((a, r) => { a[r.centro] = (a[r.centro] || 0) + r.venta; return a; }, {}); ch.data.labels = Object.keys(map); ch.data.datasets[0].data = Object.values(map); ch.update(); }
}

// ========================================
// 9. Chart Controller
// ========================================
function initCharts() {
    // Registrar plugin de datalabels
    Chart.register(ChartDataLabels);

    // Chart.js Global Defaults for Premium Light Theme
    Chart.defaults.color = '#64748b';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.weight = 500;
    Chart.defaults.scale.grid.color = 'rgba(226, 232, 240, 0.5)';

    // Premium color palettes
    const lineaColors = {
        gradient: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'],
        solid: ['#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48', '#ea580c', '#ca8a04']
    };

    const estadoColors = {
        'Cerrado': { bg: 'rgba(16, 185, 129, 0.85)', border: '#059669' },
        'En curso': { bg: 'rgba(59, 130, 246, 0.85)', border: '#2563eb' },
        'Pendiente': { bg: 'rgba(249, 115, 22, 0.85)', border: '#ea580c' },
        'Abierto': { bg: 'rgba(139, 92, 246, 0.85)', border: '#7c3aed' },
        'default': { bg: 'rgba(100, 116, 139, 0.85)', border: '#475569' }
    };

    // Función para formatear valores en K€
    const formatK = (value) => {
        if (Math.abs(value) >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M€';
        } else if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(0) + 'K€';
        }
        return value.toFixed(0) + '€';
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        },
        interaction: {
            mode: 'nearest',
            intersect: true
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 16,
                    color: '#475569',
                    font: { size: 12, weight: 500 }
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#ffffff',
                titleFont: { size: 14, weight: 700, family: "'Inter', sans-serif" },
                titleMarginBottom: 10,
                bodyColor: '#e2e8f0',
                bodyFont: { size: 13, weight: 500, family: "'Inter', sans-serif" },
                bodySpacing: 6,
                borderColor: 'rgba(99, 102, 241, 0.4)',
                borderWidth: 1,
                padding: { top: 14, bottom: 14, left: 16, right: 16 },
                cornerRadius: 12,
                displayColors: true,
                boxWidth: 12,
                boxHeight: 12,
                boxPadding: 6,
                usePointStyle: true,
                caretSize: 8,
                caretPadding: 10,
                callbacks: {
                    title: function (context) {
                        return context[0].label || '';
                    },
                    label: function (context) {
                        const value = context.chart.config.options.indexAxis === 'y'
                            ? context.parsed.x
                            : (context.parsed.y !== undefined ? context.parsed.y : context.parsed);
                        return `  ðŸ’° ${formatCurrency(value)}`;
                    },
                    afterLabel: function (context) {
                        // Para grÃ¡ficas doughnut, aÃ±adir porcentaje
                        if (context.chart.config.type === 'doughnut') {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `  ðŸ“Š ${pct}% del total`;
                        }
                        return '';
                    }
                }
            },
            datalabels: {
                display: false
            }
        }
    };

    // 1. Evolución Mensual - Line Chart with gradient fill
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    const gradientRevenue = monthlyCtx.createLinearGradient(0, 0, 0, 280);
    gradientRevenue.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    gradientRevenue.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
    const gradientCost = monthlyCtx.createLinearGradient(0, 0, 0, 280);
    gradientCost.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
    gradientCost.addColorStop(1, 'rgba(239, 68, 68, 0.02)');

    if (AppState.charts.monthly) AppState.charts.monthly.destroy();
    AppState.charts.monthly = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Ingresos',
                    borderColor: '#10b981',
                    backgroundColor: gradientRevenue,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Costes',
                    borderColor: '#ef4444',
                    backgroundColor: gradientCost,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: {
                        callback: function (value) {
                            return (value / 1000).toFixed(0) + 'K €';
                        }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });

    // 2. Ventas por Línea de Negocio - Enhanced Doughnut with values
    if (AppState.charts.distribution) AppState.charts.distribution.destroy();
    AppState.charts.distribution = new Chart(document.getElementById('costDistributionChart'), {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: lineaColors.gradient,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 12,
                borderRadius: 4
            }]
        },
        options: {
            ...commonOptions,
            cutout: '65%',
            plugins: {
                ...commonOptions.plugins,
                legend: {
                    ...commonOptions.plugins.legend,
                    position: 'right',
                    labels: {
                        ...commonOptions.plugins.legend.labels,
                        generateLabels: function (chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return {
                                        text: `${label} (${pct}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    ...commonOptions.plugins.tooltip
                }
            },
            onClick: (e, els) => { if (els.length) showBusinessLineDetail(AppState.charts.distribution.data.labels[els[0].index]); }
        }
    });

    // 3. Distribución por Estado - Doughnut Chart
    if (AppState.charts.byEstado) AppState.charts.byEstado.destroy();
    AppState.charts.byEstado = new Chart(document.getElementById('topVentasChart'), {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 10,
                borderRadius: 4
            }]
        },
        options: {
            ...commonOptions,
            cutout: '60%',
            plugins: {
                ...commonOptions.plugins,
                legend: {
                    ...commonOptions.plugins.legend,
                    position: 'right'
                },
                tooltip: {
                    ...commonOptions.plugins.tooltip
                }
            },
            onClick: (e, els) => { if (els.length) showEstadoDetail(AppState.charts.byEstado.data.labels[els[0].index]); }
        }
    });

    // 4. Margen por Línea de Negocio - Horizontal Bar with gradients
    if (AppState.charts.margenLinea) AppState.charts.margenLinea.destroy();
    AppState.charts.margenLinea = new Chart(document.getElementById('topMargenChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Margen (€)',
                data: [],
                backgroundColor: function (context) {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return '#6366f1';
                    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                    gradient.addColorStop(0, '#6366f1');
                    gradient.addColorStop(1, '#a855f7');
                    return gradient;
                },
                borderRadius: 6,
                borderSkipped: false,
                barThickness: 24
            }]
        },
        options: {
            ...commonOptions,
            indexAxis: 'y',
            plugins: {
                ...commonOptions.plugins,
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.5)' },
                    ticks: {
                        callback: function (value) {
                            return (value / 1000).toFixed(0) + 'K €';
                        }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        font: { weight: 500 },
                        color: '#334155'
                    }
                }
            },
            onClick: (e, els) => { if (els.length) showBusinessLineDetail(AppState.charts.margenLinea.data.labels[els[0].index]); }
        }
    });

    AppState.estadoColors = estadoColors;
}

function updateCharts(byL, byC, byStatus) {
    // 1. Ventas por Línea de Negocio (Doughnut)
    if (AppState.charts.distribution) {
        const ls = Object.keys(byL)
            .filter(l => l && l.trim() !== '' && l !== 'Sin Línea')
            .sort((a, b) => byL[b].venta - byL[a].venta)
            .slice(0, 8);
        AppState.charts.distribution.data.labels = ls;
        AppState.charts.distribution.data.datasets[0].data = ls.map(l => byL[l].venta);
        AppState.charts.distribution.update();
    }

    // 2. Distribución por Estado (Doughnut)
    if (AppState.charts.byEstado && byStatus) {
        // Optimization: Use pre-calculated status aggregation
        const estados = Object.keys(byStatus)
            .filter(e => e && e.trim() !== '' && e !== 'Sin Estado')
            .sort((a, b) => byStatus[b].venta - byStatus[a].venta)
            .slice(0, 8);

        const estadoColorPalette = [
            'rgba(16, 185, 129, 0.85)',   // Verde
            'rgba(59, 130, 246, 0.85)',    // Azul
            'rgba(249, 115, 22, 0.85)',    // Naranja
            'rgba(139, 92, 246, 0.85)',    // Púrpura
            'rgba(236, 72, 153, 0.85)',    // Rosa
            'rgba(234, 179, 8, 0.85)',     // Amarillo
            'rgba(20, 184, 166, 0.85)',    // Teal
            'rgba(244, 63, 94, 0.85)'      // Rojo
        ];

        AppState.charts.byEstado.data.labels = estados;
        AppState.charts.byEstado.data.datasets[0].data = estados.map(e => byStatus[e].venta);
        AppState.charts.byEstado.data.datasets[0].backgroundColor = estados.map((e, i) => estadoColorPalette[i % estadoColorPalette.length]);
        AppState.charts.byEstado.update();
    }

    // 3. Margen por Línea de Negocio (Horizontal Bar)
    if (AppState.charts.margenLinea) {
        const topLineas = Object.keys(byL)
            .filter(l => l && l.trim() !== '' && l !== 'Sin Línea')
            .map(l => ({ name: l, margen: byL[l].margen, venta: byL[l].venta }))
            .sort((a, b) => b.margen - a.margen)
            .slice(0, 6);

        AppState.charts.margenLinea.data.labels = topLineas.map(l => l.name);
        AppState.charts.margenLinea.data.datasets[0].data = topLineas.map(l => l.margen);
        AppState.charts.margenLinea.update();
    }

    updateMonthlyChart();
}

function updateMonthlyChart() {
    const h = AppState.historicalData; if (!h.length) return;
    AppState.charts.monthly.data.labels = h.map(x => x.period); AppState.charts.monthly.data.datasets[0].data = h.map(x => x.totals.totalVenta); AppState.charts.monthly.data.datasets[1].data = h.map(x => x.totals.totalCoste); AppState.charts.monthly.update();
}

function initDynamicClientChart(id) {
    if (AppState.charts[id]) AppState.charts[id].destroy();
    AppState.charts[id] = new Chart(document.getElementById(`${id}Chart`), { type: 'bar', data: { labels: [], datasets: [{ label: 'Venta (€)', backgroundColor: '#6366f1' }] }, options: { responsive: true, maintainAspectRatio: false } });
}

// ========================================
// 10. Interactivity (Modals)
// ========================================

function renderModalTable(rows) {
    const tableBody = document.getElementById('modalTableBody');
    if (!rows || rows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 40px; color: var(--text-muted);">No hay datos para mostrar</td></tr>';
        return;
    }
    tableBody.innerHTML = rows.map(r => {
        const margenPct = r.margenPct || calculateMarginPercentage(r.venta, r.margen);
        const isLowMargin = margenPct < 20;
        return `
        <tr class="${isLowMargin ? 'critical-row' : ''}">
            <td title="${r.nomCliente || r.cliente || '-'}">${truncateText(r.nomCliente || r.cliente || '-', 20)}</td>
            <td title="${r.centro || '-'}">${truncateText(r.centro || '-', 18)}</td>
            <td><span class="badge badge-info">${r.lineaNegocio || '-'}</span></td>
            <td><span class="badge ${getEstadoBadgeClass(r.estado)}">${r.estado || '-'}</span></td>
            <td class="text-right">${formatCurrency(r.venta)}</td>
            <td class="text-right" style="color: var(--accent-danger);">${formatCurrency(r.coste)}</td>
            <td class="text-right ${r.margen >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(r.margen)}</td>
            <td class="text-right ${isLowMargin ? 'critical-margin' : ''}">${margenPct.toFixed(1)}%</td>
        </tr>`;
    }).join('');
}

function getEstadoBadgeClass(estado) {
    const classes = {
        'Cerrado': 'badge-success',
        'En curso': 'badge-primary',
        'Abierto': 'badge-info',
        'Pendiente': 'badge-warning'
    };
    return classes[estado] || 'badge-secondary';
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

function showEstadoDetail(estado) {
    const modal = document.getElementById('detailModal');
    if (!AppState.processedData) return;
    const searchInput = document.getElementById('modalSearch');

    document.getElementById('modalTitle').textContent = `Estado: ${estado}`;
    if (searchInput) searchInput.value = '';

    currentModalRows = AppState.processedData.rows.filter(r => r.estado === estado);
    const tots = currentModalRows.reduce((a, r) => {
        a.v += r.venta;
        a.m += r.margen;
        a.count++;
        return a;
    }, { v: 0, m: 0, count: 0 });

    document.getElementById('modalKPIs').innerHTML = `
        <div class="kpi-card"><span>Ventas</span><strong>${formatCurrency(tots.v)}</strong></div>
        <div class="kpi-card"><span>Margen</span><strong>${formatCurrency(tots.m)}</strong></div>
        <div class="kpi-card"><span>Registros</span><strong>${tots.count}</strong></div>`;

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
    const g = document.getElementById('historyGrid');
    if (!g) return;

    if (!AppState.historicalData.length) {
        g.innerHTML = `
            <div class="empty-state-large" style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <div style="font-size: 3rem; margin-bottom: 16px;">📊</div>
                <h3>Sin datos históricos</h3>
                <p style="color: var(--text-muted); margin-top: 8px;">Carga archivos Excel para generar histórico</p>
            </div>`;
        return;
    }

    g.innerHTML = AppState.historicalData.slice().reverse().map((item, i) => {
        const idx = AppState.historicalData.length - 1 - i;
        const t = item.totals;
        const margenPct = t.totalVenta > 0 ? ((t.totalMargen / t.totalVenta) * 100).toFixed(1) : 0;
        const rowCount = item.rows ? item.rows.length : 0;

        return `
        <div class="history-card" onclick="loadHistoryItem(${idx})">
            <div class="history-header">
                <span>📅 ${item.period}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteHistoryItem(${idx})" title="Eliminar">×</button>
            </div>
            <div class="history-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="history-stat-item">
                    <div class="label">Ventas</div>
                    <div class="value">${formatCurrency(t.totalVenta)}</div>
                </div>
                <div class="history-stat-item">
                    <div class="label">Costes</div>
                    <div class="value" style="color: var(--accent-danger);">${formatCurrency(t.totalCoste)}</div>
                </div>
                <div class="history-stat-item">
                    <div class="label">Margen</div>
                    <div class="value ${t.totalMargen >= 0 ? 'positive' : 'negative'}">${formatCurrency(t.totalMargen)}</div>
                </div>
                <div class="history-stat-item">
                    <div class="label">% Margen</div>
                    <div class="value ${margenPct < 20 ? 'negative' : 'positive'}">${margenPct}%</div>
                </div>
            </div>
            ${rowCount > 0 ? `<div style="margin-top: 12px; font-size: 0.8rem; color: var(--text-muted);">📋 ${rowCount} registros</div>` : ''}
        </div>`;
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
        reader.onload = (ev) => {
            try {
                const d = JSON.parse(ev.target.result);
                if (Array.isArray(d)) {
                    AppState.historicalData = d;
                    localStorage.setItem('cierresPro_history', JSON.stringify(d));
                    renderHistory();
                    updateMonthlyChart();
                    showToast('Backup restaurado', 'success');
                } else {
                    showToast('El archivo no contiene datos válidos', 'warning');
                }
            } catch (err) {
                showToast('Error al importar: JSON inválido', 'error');
                console.error('Import error:', err);
            }
        };
        reader.readAsText(e.target.files[0]);
    };
    i.click();
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
    // Increased timeout for slower connections/devices
    setTimeout(() => {
        window.selectClient(name);
        const searchInput = document.getElementById('clientSearch');
        if (searchInput) {
            searchInput.value = name;
            searchInput.dispatchEvent(new Event('input'));
        }
    }, 300);
};

// Global Exports
window.exportData = exportData;
window.exportHistory = exportHistory;
window.importHistory = importHistory;
window.renderClients = renderClients;
window.renderAnalysis = renderAnalysis;
window.saveSettings = saveSettings;
window.openClientsHub = openClientsHub;

// ========================================
// 14. Reports Module
// ========================================
const REPORT_TEMPLATES = {
    intro: "## 1. Introducción\nEste informe presenta los resultados del cierre mensual correspondiente al período [PERIODO]. El objetivo es analizar el rendimiento financiero global, por centros y líneas de negocio.\n\n",
    kpis: "## 2. Resumen de KPIs\n- Ventas Totales: [VENTAS]\n- Coste Total: [COSTES]\n- Margen Neto: [MARGEN] ([MARGEN_PCT]%)\n- Comparativa vs año anterior: [YOY_CHANGE]\n\n",
    topClients: "## 3. Top Clientes\nLos 5 principales clientes por volumen de venta han sido:\n[LISTA_TOP_CLIENTES]\n\n",
    issues: "## 4. Incidencias Detectadas\nSe han observado márgenes inferiores al 20% en los siguientes centros clave:\n[LISTA_BAJO_MARGEN]\n\n",
    conclusions: "## 5. Conclusiones\nEl rendimiento general del mes ha sido [POSITIVO/NEGATIVO]. Se recomienda revisar costes en las líneas de negocio con menor rentabilidad y potenciar las ventas en [MEJOR_LINEA].\n"
};

window.insertTemplate = (key) => {
    const editor = document.getElementById('reportEditor');
    if (!editor) return;

    let text = REPORT_TEMPLATES[key] || '';

    // Replace placeholders if data is available
    if (AppState.processedData) {
        const d = AppState.processedData;
        const t = d.totals;
        const mpct = calculateMarginPercentage(t.totalVenta, t.totalMargen).toFixed(1);

        text = text.replace('[PERIODO]', d.period || 'Actual')
            .replace('[VENTAS]', formatCurrency(t.totalVenta))
            .replace('[COSTES]', formatCurrency(t.totalCoste))
            .replace('[MARGEN]', formatCurrency(t.totalMargen))
            .replace('[MARGEN_PCT]', mpct);

        // Simple Top lists logic if needed (can be enhanced)
        if (key === 'topClients' && currentClientsData.length) {
            const top5 = currentClientsData.slice(0, 5).map(c =>
                `- ${c.name}: ${formatCurrency(c.totalVenta)} (Mg: ${calculateMarginPercentage(c.totalVenta, c.totalMargen).toFixed(1)}%)`
            ).join('\n');
            text = text.replace('[LISTA_TOP_CLIENTES]', top5);
        }

        if (key === 'issues' && d.rows) {
            const issues = d.rows.filter(r => r.margenPct < 20 && r.venta > 1000).slice(0, 5) // Low margin high volume
                .map(r => `- ${r.nombre || r.cliente} (${formatCurrency(r.venta)}): Mg ${r.margenPct}%`)
                .join('\n');
            text = text.replace('[LISTA_BAJO_MARGEN]', issues || 'No se detectaron incidencias mayores.');
        }
    }

    editor.value += text;
    editor.scrollTop = editor.scrollHeight;
};

window.generateAutoReport = () => {
    const editor = document.getElementById('reportEditor');
    if (!editor) return;
    editor.value = '';

    // Insert all templates sequentially
    ['intro', 'kpis', 'topClients', 'issues', 'conclusions'].forEach(key => insertTemplate(key));
    showToast('Informe generado automáticamente', 'success');
};

window.copyReportToClipboard = async () => {
    const editor = document.getElementById('reportEditor');
    if (!editor) return;

    const text = editor.value;
    try {
        // Modern Clipboard API
        await navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles', 'success');
    } catch (err) {
        // Fallback for older browsers or non-HTTPS
        editor.select();
        document.execCommand('copy');
        showToast('Copiado al portapapeles', 'success');
    }
};

window.exportReportPDF = () => {
    const text = document.getElementById('reportEditor').value;
    if (!text) { showToast('El informe está vacío', 'warning'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text('Informe Ejecutivo de Cierre', 20, 20);

    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(text, 170);
    doc.text(splitText, 20, 40);

    doc.save('Informe_Cierre.pdf');
    showToast('Informe descargado', 'success');
};
