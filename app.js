/* ========================================
   CierresPro - Main Application Logic
   ======================================== */

// ========================================
// Data Store
// ========================================
const AppState = {
    currentData: null,
    historicalData: [],
    managedClients: [], // [{name: 'ALIMERKA', color: '#ff0000', id: 'alimerka'}]
    settings: {
        revenueColumn: '',
        costColumn: '',
        dateColumn: '',
        categoryColumn: ''
    },
    processedData: null, // Stores current processed snapshot
    yoyMetrics: {
        revenueChange: 0,
        marginChange: 0,
        available: false
    },
    budgetMetrics: {
        revenueAchievement: 0,
        marginAchievement: 0,
        available: false
    },
    charts: {} // Dynamic charts stored here
};

// ========================================
// Initialize Application
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadManagedClients();
    initNavigation();
    initUploadHandlers();
    initCharts();
    initClientManager();
    loadSettings();
    loadHistoricalData();
});

// ========================================
// Navigation & Section Management
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
            navLink.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M15 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                ${client.name}
            `;
            const settingsNav = navContainer.querySelector('[data-section="settings"]');
            navContainer.insertBefore(navLink, settingsNav);
        });

        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = newItem.dataset.section;
                navigateToSection(sectionId, sectionInfo);
            });
        });

        const activeItem = document.querySelector('.nav-item.active');
        if (activeItem) {
            const sectionId = activeItem.dataset.section;
            const info = sectionInfo[sectionId];
            if (info) {
                pageTitle.textContent = info.title;
                headerSubtitle.textContent = info.subtitle;
            }
        }
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
        // Find existing listener or just trigger click
        const nav = document.querySelector(`[data-section="${id}"]`);
        if (nav) nav.click();
    };

    refreshNavigation();

    document.getElementById('uploadBtn').addEventListener('click', () => {
        const uploadNav = document.querySelector('[data-section="upload"]');
        if (uploadNav) uploadNav.click();
    });
}

// ========================================
// File Upload Handlers
// ========================================
function initUploadHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');

    // Click to select
    selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener('click', () => fileInput.click());

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Cancel and Confirm buttons
    document.getElementById('cancelUpload').addEventListener('click', () => {
        document.getElementById('previewContainer').style.display = 'none';
        AppState.currentData = null;
    });

    document.getElementById('confirmUpload').addEventListener('click', () => {
        console.log('Confirm Upload clicked');
        if (AppState.currentData) {
            try {
                console.log('Processing data...');
                processData(AppState.currentData);
                console.log('Data processed. Hiding preview...');
                document.getElementById('previewContainer').style.display = 'none';
                document.querySelector('[data-section="dashboard"]').click();
                showToast('Datos cargados correctamente', 'success');
            } catch (error) {
                console.error('Error processing data:', error);
                showToast('Error al procesar datos: ' + error.message, 'error');
            }
        } else {
            console.warn('No currentData to process');
        }
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Filter listeners
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

    // Template Download
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadTemplate);
    }
}

function downloadTemplate() {
    // Standard headers as required by the app
    const headers = [
        'Planta', 'Cod_grupo', 'Nom_grupo', 'Cod_cliente', 'Nom_cliente',
        'Cod_centro', 'Nom_centro', 'Lin_negocio', 'Tipo', 'Número',
        'Nombre', 'Estado', 'Categoría', 'Apertura', 'Cierre',
        'Ult_factura', 'Pres_venta', 'Pres_coste', 'Ingreso', 'Venta',
        'Venta_pend_alb', 'Venta_pend_ped', 'Venta_pend_fac',
        'Coste_lanzado', 'Coste_MT', 'Coste_SR', 'Coste_MN', 'Coste_DS',
        'Coste_OT', 'Coste', 'Margen', 'Margen_%_vta', 'Margen_2',
        'Margen_2_%_vta', 'Horas_prev', 'Horas_reales', 'Garantia_MT',
        'Garantia_SR', 'Garantia_MN', 'Garantia_DS', 'Garantia_OT',
        'Garantia', 'Ingreso_periodo', 'Venta_acumulado',
        'Coste_acumulado', 'Garantia_acumulado', 'Margen_acumulado',
        'Margen_acumulado_%_vta'
    ];

    // Create a new workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);

    // Add a sample row (optional, helpful for user)
    const sampleRow = new Array(headers.length).fill('');
    // Fill key columns with example data
    const idx = (name) => headers.indexOf(name);
    sampleRow[idx('Nom_centro')] = 'Centro Ejemplo';
    sampleRow[idx('Lin_negocio')] = 'Mantenimiento';
    sampleRow[idx('Venta')] = 1000;
    sampleRow[idx('Coste')] = 800;
    sampleRow[idx('Margen')] = 200;
    sampleRow[idx('Margen_%_vta')] = 20;

    XLSX.utils.sheet_add_aoa(worksheet, [sampleRow], { origin: -1 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");

    // Generate file and trigger download
    XLSX.writeFile(workbook, "Plantilla_Cierre_Mensual.xlsx");
}

// ========================================
// Excel File Processing
// ========================================
function handleFile(file) {
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
    ];

    const extension = file.name.split('.').pop().toLowerCase();
    const isValidExtension = ['xlsx', 'xls', 'csv'].includes(extension);

    if (!isValidExtension) {
        showToast('Formato de archivo no soportado. Use .xlsx, .xls o .csv', 'error');
        return;
    }

    showToast('Procesando archivo...', 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) {
                showToast('El archivo está vacío', 'error');
                return;
            }

            AppState.currentData = {
                fileName: file.name,
                sheetName: firstSheetName,
                headers: jsonData[0],
                rows: jsonData.slice(1),
                rawWorkbook: workbook
            };

            showPreview(AppState.currentData);
            showToast('Archivo leído correctamente', 'success');
        } catch (error) {
            console.error('Error parsing file:', error);
            showToast('Error al leer el archivo: ' + error.message, 'error');
        }
    };

    reader.onerror = () => {
        showToast('Error al leer el archivo', 'error');
    };

    reader.readAsArrayBuffer(file);
}

function showPreview(data) {
    const previewContainer = document.getElementById('previewContainer');
    const previewHead = document.getElementById('previewTableHead');
    const previewBody = document.getElementById('previewTableBody');

    // Clear previous content
    previewHead.innerHTML = '';
    previewBody.innerHTML = '';

    // Log headers for debugging
    console.log('=== CABECERAS DEL EXCEL ===');
    console.log(data.headers);
    console.log('===========================');

    // Define which columns to show in preview (only the relevant ones)
    const relevantColumns = [
        'Nombre', 'Nom_centro', 'Lin_negocio', 'Nom_cliente', 'Estado',
        'Venta', 'Coste', 'Margen', 'Margen_%_vta'
    ];

    // Find indices of relevant columns
    const columnIndices = [];
    const displayHeaders = [];
    const headerLabels = {
        'Nombre': 'Nombre',
        'Nom_centro': 'Centro',
        'Lin_negocio': 'Línea Negocio',
        'Nom_cliente': 'Cliente',
        'Estado': 'Estado',
        'Venta': 'Venta',
        'Coste': 'Coste',
        'Margen': 'Margen',
        'Margen_%_vta': 'Margen %'
    };

    relevantColumns.forEach(colName => {
        const idx = data.headers.findIndex(h =>
            h && h.toLowerCase().trim() === colName.toLowerCase().trim()
        );
        if (idx !== -1) {
            columnIndices.push(idx);
            displayHeaders.push(headerLabels[colName] || colName);
        }
    });

    // Build header with only relevant columns
    const headerRow = document.createElement('tr');
    displayHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.style.cssText = 'white-space: nowrap; padding: 10px 14px; font-size: 0.8rem;';
        headerRow.appendChild(th);
    });
    previewHead.appendChild(headerRow);

    // Build body with only relevant columns (show max 15 rows)
    const previewRows = data.rows.slice(0, 15);
    previewRows.forEach(row => {
        const tr = document.createElement('tr');
        columnIndices.forEach(idx => {
            const td = document.createElement('td');
            const value = row[idx] !== undefined ? row[idx] : '';
            // Format numbers
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && typeof value === 'number') {
                td.textContent = numValue.toLocaleString('es-ES', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                });
                td.style.textAlign = 'right';
            } else {
                td.textContent = value;
            }
            td.style.cssText += 'white-space: nowrap; padding: 8px 14px; font-size: 0.85rem; max-width: 180px; overflow: hidden; text-overflow: ellipsis;';
            td.title = value; // Tooltip
            tr.appendChild(td);
        });
        previewBody.appendChild(tr);
    });

    if (data.rows.length > 15) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = columnIndices.length;
        td.textContent = `... y ${data.rows.length - 15} filas más`;
        td.style.cssText = 'text-align: center; color: #64748b; font-style: italic; padding: 12px;';
        tr.appendChild(td);
        previewBody.appendChild(tr);
    }

    previewContainer.style.display = 'block';
}

// ========================================
// Data Processing & Analytics
// ========================================

// Column mapping for the specific Excel structure
// Based on user's Excel with 48 columns
const EXCEL_COLUMNS = {
    // Identificación
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
    // Fechas
    apertura: 'Apertura',
    cierre: 'Cierre',
    ultFactura: 'Ult_factura',
    // Presupuestos
    presVenta: 'Pres_venta',
    presCoste: 'Pres_coste',
    // Ventas
    ingreso: 'Ingreso',
    venta: 'Venta',
    ventaPendAlb: 'Venta_pend_alb',
    ventaPendPed: 'Venta_pend_ped',
    ventaPendFac: 'Venta_pend_fac',
    // Costes
    costeLanzado: 'Coste_lanzado',
    costeMT: 'Coste_MT',
    costeSR: 'Coste_SR',
    costeMN: 'Coste_MN',
    costeDS: 'Coste_DS',
    costeOT: 'Coste_OT',
    coste: 'Coste',
    // Márgenes
    margen: 'Margen',
    margenPct: 'Margen_%_vta',
    margen2: 'Margen_2',
    margen2Pct: 'Margen_2_%_vta',
    // Horas
    horasPrev: 'Horas_prev',
    horasReales: 'Horas_reales',
    garantiaMT: 'Garantia_MT',
    garantiaSR: 'Garantia_SR',
    garantiaMN: 'Garantia_MN',
    garantiaDS: 'Garantia_DS',
    garantiaOT: 'Garantia_OT',
    garantia: 'Garantia',
    // Acumulados
    ingresoPeriodo: 'Ingreso_periodo',
    ventaAcumulado: 'Venta_acumulado',
    costeAcumulado: 'Coste_acumulado',
    garantiaAcumulado: 'Garantia_acumulado',
    margenAcumulado: 'Margen_acumulado',
    margenAcumuladoPct: 'Margen_acumulado_%_vta'
};

function getColumnIndex(headers, columnName) {
    // Normalize both headers and search name
    const normalizeStr = (str) => {
        return String(str)
            .toLowerCase()
            .trim()
            .replace(/_/g, '')  // Remove underscores
            .replace(/\s+/g, '') // Remove spaces
            .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove accents
    };

    const searchName = normalizeStr(columnName);

    // 1. Try Exact Match First
    for (let i = 0; i < headers.length; i++) {
        const headerNorm = normalizeStr(headers[i]);
        if (headerNorm === searchName) {
            return i;
        }
    }

    // 2. Try Partial Match (only if exact match fails)
    // Warning: This can match 'Coste_MT' for 'Coste', so we only use it as fallback
    for (let i = 0; i < headers.length; i++) {
        const headerNorm = normalizeStr(headers[i]);
        if (headerNorm.includes(searchName)) {
            console.warn(`Approximate column match: '${headers[i]}' for '${columnName}'`);
            return i;
        }
    }

    return -1;
}

function calculateMarginPercentage(venta, margen) {
    if (!venta || venta === 0) return 0;
    let pct = (margen / venta) * 100;

    // User Rule: If both Venta and Margen are negative, the % should be expressed as negative
    if (venta < 0 && margen < 0) {
        pct = -Math.abs(pct);
    }
    return pct;
}

function processData(data) {
    const headers = data.headers;

    // Debug: Log all headers found
    console.log('Excel headers found:', headers);

    // Find column indices using exact column names
    const colIdx = {
        planta: getColumnIndex(headers, EXCEL_COLUMNS.planta),
        nomGrupo: getColumnIndex(headers, EXCEL_COLUMNS.nomGrupo),
        nomCliente: getColumnIndex(headers, EXCEL_COLUMNS.nomCliente),
        nomCentro: getColumnIndex(headers, EXCEL_COLUMNS.nomCentro),
        lineaNegocio: getColumnIndex(headers, EXCEL_COLUMNS.lineaNegocio),
        tipo: getColumnIndex(headers, EXCEL_COLUMNS.tipo),
        numero: getColumnIndex(headers, EXCEL_COLUMNS.numero),
        nombre: getColumnIndex(headers, EXCEL_COLUMNS.nombre),
        estado: getColumnIndex(headers, EXCEL_COLUMNS.estado),
        categoria: getColumnIndex(headers, EXCEL_COLUMNS.categoria),
        venta: getColumnIndex(headers, EXCEL_COLUMNS.venta),
        presVenta: getColumnIndex(headers, EXCEL_COLUMNS.presVenta),
        presCoste: getColumnIndex(headers, EXCEL_COLUMNS.presCoste),
        costeMT: getColumnIndex(headers, EXCEL_COLUMNS.costeMT),
        coste: getColumnIndex(headers, EXCEL_COLUMNS.coste),
        margen: getColumnIndex(headers, EXCEL_COLUMNS.margen),
        margenPct: getColumnIndex(headers, EXCEL_COLUMNS.margenPct),
        margen2: getColumnIndex(headers, EXCEL_COLUMNS.margen2),
        margen2Pct: getColumnIndex(headers, EXCEL_COLUMNS.margen2Pct)
    };

    console.log('Column indices found:', colIdx);

    // Check if critical columns were found
    const missingCols = [];
    if (colIdx.venta === -1) missingCols.push('Venta');
    if (colIdx.coste === -1) missingCols.push('Coste');
    if (colIdx.margen === -1) missingCols.push('Margen');

    if (missingCols.length > 0) {
        showToast(`Columnas no encontradas: ${missingCols.join(', ')}. Revisa la consola (F12) para ver los encabezados.`, 'warning');
    } else {
        showToast('Columnas detectadas correctamente', 'success');
    }

    // Process all rows
    let totalVenta = 0;
    let totalCoste = 0;
    let totalCosteMT = 0;
    let totalMargen = 0;
    let totalMargen2 = 0;
    let totalPresVenta = 0;
    let totalPresCoste = 0;

    const byCenter = {};
    const byLineaNegocio = {};
    const byEstado = {};
    const processedRows = [];

    data.rows.forEach((row, rowIndex) => {
        // Skip empty rows
        if (!row || row.length === 0) return;

        const centro = row[colIdx.nomCentro] || 'Sin Centro';
        const nombre = row[colIdx.nombre] || '';

        // Skip "Total" or summary rows usually found at the bottom
        // refined to avoid false positives (e.g. "Estación Total")
        const centerUpper = String(centro).toUpperCase().trim();
        const nameUpper = String(nombre).toUpperCase().trim();

        if (
            centerUpper === 'TOTAL' || centerUpper === 'TOTALES' ||
            nameUpper === 'TOTAL' || nameUpper === 'TOTALES' ||
            centerUpper.startsWith('TOTAL GEN') ||
            centerUpper.startsWith('SUMA TOTAL')
        ) {
            console.log(`Skipping summary row at index ${rowIndex}:`, row);
            return;
        }

        const lineaNegocio = row[colIdx.lineaNegocio] || 'Sin Línea';
        const tipo = row[colIdx.tipo] || '';
        const numero = row[colIdx.numero] || '';
        const estado = row[colIdx.estado] || 'Sin Estado';
        const cliente = row[colIdx.nomCliente] || '';
        const venta = parseNumber(row[colIdx.venta]);
        const presVenta = parseNumber(row[colIdx.presVenta]);
        const presCoste = parseNumber(row[colIdx.presCoste]);
        const costeMT = parseNumber(row[colIdx.costeMT]);
        const coste = parseNumber(row[colIdx.coste]);
        const margen = parseNumber(row[colIdx.margen]);
        // Recalculate margin % to ensure consistency with custom rule
        const margenPct = calculateMarginPercentage(venta, margen);

        // Debug first 5 rows to verify parsing
        if (rowIndex < 5) {
            console.log(`Row ${rowIndex} Debug:`, JSON.stringify({
                rawVenta: row[colIdx.venta],
                parsedVenta: venta,
                rawCoste: row[colIdx.coste],
                parsedCoste: coste,
                rawMargen: row[colIdx.margen],
                parsedMargen: margen,
                calculatedMargenPct: margenPct
            }, null, 2));
        }

        const margen2 = parseNumber(row[colIdx.margen2]);
        // const margen2Pct = parseNumber(row[colIdx.margen2Pct]); // This was not used in the original code, keeping it commented out.

        // Accumulate totals
        totalVenta += venta;
        totalCoste += coste;
        totalCosteMT += costeMT;
        totalMargen += margen;
        totalMargen2 += margen2;
        totalPresVenta += presVenta;
        totalPresCoste += presCoste;

        // Group by Center
        if (!byCenter[centro]) {
            byCenter[centro] = { venta: 0, coste: 0, costeMT: 0, margen: 0, margen2: 0, count: 0, presVenta: 0 };
        }
        byCenter[centro].venta += venta;
        byCenter[centro].coste += coste;
        byCenter[centro].costeMT += costeMT;
        byCenter[centro].margen += margen;
        byCenter[centro].margen2 += margen2;
        byCenter[centro].presVenta += presVenta;
        byCenter[centro].count++;

        // Group by Línea de Negocio
        if (!byLineaNegocio[lineaNegocio]) {
            byLineaNegocio[lineaNegocio] = { venta: 0, coste: 0, margen: 0, count: 0 };
        }
        byLineaNegocio[lineaNegocio].venta += venta;
        byLineaNegocio[lineaNegocio].coste += coste;
        byLineaNegocio[lineaNegocio].margen += margen;
        byLineaNegocio[lineaNegocio].count++;

        // Group by Estado
        if (!byEstado[estado]) {
            byEstado[estado] = { count: 0, venta: 0 };
        }
        byEstado[estado].venta += venta;
        byEstado[estado].count++;

        // Store processed row
        processedRows.push({
            centro, cliente, lineaNegocio, estado, venta, coste, margen, margenPct, margen2
        });
    });

    const period = extractPeriodFromFileName(data.fileName);

    const processedSnapshot = {
        period: period,
        fileName: data.fileName,
        rows: processedRows,
        totals: {
            totalVenta, totalCoste, totalCosteMT, totalMargen, totalMargen2,
            totalPresVenta, totalPresCoste
        },
        byCenter,
        byLineaNegocio,
        byEstado,
        timestamp: new Date().toISOString()
    };

    AppState.processedData = processedSnapshot;

    // Calculate YoY
    calculateYoY(processedSnapshot);

    // Calculate Budget Metrics
    calculateBudgets(processedSnapshot);

    // Populate filters with unique values
    populateFilters(processedRows);

    // Update UI
    updateDashboard(processedSnapshot);

    // Update current period display
    document.getElementById('currentPeriod').textContent = period;

    // Save to history
    saveToHistory(processedSnapshot);
}

function calculateYoY(current) {
    const parts = current.period.split(' ');
    if (parts.length !== 2) return;

    const month = parts[0];
    const year = parseInt(parts[1]);
    const prevYearPeriod = `${month} ${year - 1}`;

    const prevYearData = AppState.historicalData.find(h => h.period === prevYearPeriod);

    if (prevYearData) {
        const revChange = ((current.totals.totalVenta - prevYearData.totals.totalVenta) / prevYearData.totals.totalVenta) * 100;
        const marChange = ((current.totals.totalMargen - prevYearData.totals.netMargin) / prevYearData.totals.netMargin) * 100;

        AppState.yoyMetrics = {
            revenueChange: revChange,
            marginChange: marChange,
            available: true
        };
    } else {
        AppState.yoyMetrics.available = false;
    }
}

function calculateBudgets(current) {
    const totalPresVenta = current.totals.totalPresVenta;
    const totalPresMargen = current.totals.totalPresVenta - current.totals.totalPresCoste;

    if (totalPresVenta > 0) {
        AppState.budgetMetrics = {
            revenueAchievement: (current.totals.totalVenta / totalPresVenta) * 100,
            marginAchievement: (current.totals.totalMargen / totalPresMargen) * 100,
            available: true
        };
    } else {
        AppState.budgetMetrics.available = false;
    }
}

// ========================================
// Filter & Dashboard Logic
// ========================================
function populateFilters(rows) {
    const centros = [...new Set(rows.map(r => r.centro).filter(Boolean))].sort();
    const lineas = [...new Set(rows.map(r => r.lineaNegocio).filter(Boolean))].sort();
    const estados = [...new Set(rows.map(r => r.estado).filter(Boolean))].sort();

    const updateSelect = (id, options) => {
        const select = document.getElementById(id);
        const currentValue = select.value;
        select.innerHTML = '<option value="">Todos</option>';
        options.forEach(opt => {
            if (opt === 'Sin Centro' || opt === 'Sin Línea' || opt === 'Sin Estado') return;
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
        });
        if (options.includes(currentValue)) {
            select.value = currentValue;
        }
    };

    updateSelect('filterCentro', centros);
    updateSelect('filterLinea', lineas);
    updateSelect('filterEstado', estados);
}

function filterData() {
    if (!AppState.processedData) return;

    const centro = document.getElementById('filterCentro').value;
    const linea = document.getElementById('filterLinea').value;
    const estado = document.getElementById('filterEstado').value;
    const lowPerf = document.getElementById('filterLowPerf').checked;

    const filteredRows = AppState.processedData.rows.filter(row => {
        const matchCentro = !centro || row.centro === centro;
        const matchLinea = !linea || row.lineaNegocio === linea;
        const matchEstado = !estado || row.estado === estado;
        const matchPerf = !lowPerf || row.margenPct < 20;

        return matchCentro && matchLinea && matchEstado && matchPerf;
    });

    // Recalculate totals for filtered data
    const totals = filteredRows.reduce((acc, row) => {
        acc.totalVenta += row.venta;
        acc.totalCoste += row.coste;
        acc.totalMargen += row.margen;
        return acc;
    }, { totalVenta: 0, totalCoste: 0, totalMargen: 0 });

    const filteredData = {
        rows: filteredRows,
        totals: totals
    };

    updateDashboard(filteredData);
}

function updateDashboard(data) {
    const totals = data.totals;
    const rows = data.rows;
    const performance = totals.totalVenta ? (totals.totalMargen / totals.totalVenta) * 100 : 0;

    // Create view model for UI updates
    const viewModel = {
        totalRevenue: totals.totalVenta,
        totalCost: totals.totalCoste,
        netMargin: totals.totalMargen,
        performance: performance
    };

    updateKPIs(viewModel);
    updateDataTable(rows);

    // Re-aggregate specific breakdowns for charts based on filtered rows
    const byCenter = {};
    const byLineaNegocio = {};

    rows.forEach(row => {
        // Aggregate by Center
        if (!byCenter[row.centro]) {
            byCenter[row.centro] = { revenue: 0, cost: 0, margin: 0 };
        }
        byCenter[row.centro].revenue += row.venta;
        byCenter[row.centro].cost += row.coste;
        byCenter[row.centro].margin += row.margen;

        // Aggregate by Business Line
        if (!byLineaNegocio[row.lineaNegocio]) {
            byLineaNegocio[row.lineaNegocio] = { venta: 0, coste: 0, margen: 0 };
        }
        byLineaNegocio[row.lineaNegocio].venta += row.venta;
        byLineaNegocio[row.lineaNegocio].coste += row.coste;
        byLineaNegocio[row.lineaNegocio].margen += row.margen;
    });

    // Update charts
    if (AppState.charts && AppState.charts.monthly) { // Check if charts exist
        updateCharts(byLineaNegocio, byCenter);
    }

    // Refresh dynamic client dashboards
    AppState.managedClients.forEach(client => {
        const section = document.getElementById(client.id);
        if (section) {
            renderClientDashboard(client.name, client.id);
        }
    });
}

function findColumnIndex(headers, keywords) {
    for (let i = 0; i < headers.length; i++) {
        for (const keyword of keywords) {
            if (headers[i].includes(keyword)) {
                return i;
            }
        }
    }
    return -1;
}

function parseNumber(value) {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;

    let str = String(value).trim();
    let isExplicitlyNegative = false;

    // Check for accounting negative format (100) or 100-
    if (str.startsWith('(') && str.endsWith(')')) {
        isExplicitlyNegative = true;
        str = str.replace(/[()]/g, '');
    } else if (str.endsWith('-')) {
        isExplicitlyNegative = true;
        str = str.slice(0, -1);
    }

    // Remove currency symbols, thousands separators (dots), and spaces
    const cleaned = str
        .replace(/[€$]/g, '')
        .replace(/\./g, '')
        .replace(/\s/g, '') // Handle spaces like '1 000,00'
        .replace(',', '.');

    let num = parseFloat(cleaned);

    if (isNaN(num)) return 0;

    // Apply negative sign if detected via special formatting
    if (isExplicitlyNegative) {
        num = -Math.abs(num);
    }

    return num;
}

function extractPeriodFromFileName(fileName) {
    const months = {
        'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo',
        'abril': 'Abril', 'mayo': 'Mayo', 'junio': 'Junio',
        'julio': 'Julio', 'agosto': 'Agosto', 'septiembre': 'Septiembre',
        'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre',
        'january': 'Enero', 'february': 'Febrero', 'march': 'Marzo',
        'april': 'Abril', 'may': 'Mayo', 'june': 'Junio',
        'july': 'Julio', 'august': 'Agosto', 'september': 'Septiembre',
        'october': 'Octubre', 'november': 'Noviembre', 'december': 'Diciembre'
    };

    const nameLower = fileName.toLowerCase();
    for (const [key, value] of Object.entries(months)) {
        if (nameLower.includes(key)) {
            // Try to extract year
            const yearMatch = nameLower.match(/20\d{2}/);
            const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
            return `${value} ${year}`;
        }
    }
    return fileName.replace(/\.[^/.]+$/, '');
}

// ========================================
// Client-Specific Logic
// ========================================
function renderClientDashboard(clientName, containerId) {
    if (!AppState.processedData) return;

    const rows = AppState.processedData.rows.filter(r =>
        String(r.cliente).toUpperCase().includes(clientName) ||
        String(r.nombre).toUpperCase().includes(clientName)
    );

    const totals = rows.reduce((acc, r) => {
        acc.venta += r.venta;
        acc.coste += r.coste;
        acc.margen += r.margen;
        return acc;
    }, { venta: 0, coste: 0, margen: 0 });

    const performance = totals.venta ? (totals.margen / totals.venta) * 100 : 0;

    // Render KPIs
    const kpiContainer = document.getElementById(`${containerId}KPIs`);
    kpiContainer.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-content">
                <span class="kpi-label">Ventas ${clientName}</span>
                <span class="kpi-value">${formatCurrency(totals.venta)}</span>
            </div>
        </div>
        <div class="kpi-card">
            <div class="kpi-content">
                <span class="kpi-label">Margen (€)</span>
                <span class="kpi-value">${formatCurrency(totals.margen)}</span>
            </div>
        </div>
        <div class="kpi-card">
            <div class="kpi-content">
                <span class="kpi-label">Margen (%)</span>
                <span class="kpi-value">${performance.toFixed(1)}%</span>
            </div>
        </div>
        <div class="kpi-card">
            <div class="kpi-content">
                <span class="kpi-label">Nº Centros</span>
                <span class="kpi-value">${rows.length}</span>
            </div>
        </div>
    `;

    // Render Table
    const tableBody = document.getElementById(`${containerId}TableBody`);
    tableBody.innerHTML = rows.map(r => `
        <tr>
            <td>${r.centro}</td>
            <td><span class="badge">${r.lineaNegocio}</span></td>
            <td class="text-right">${formatCurrency(r.venta)}</td>
            <td class="text-right ${r.margenPct < 20 ? 'text-danger' : 'text-success'}">${r.margenPct.toFixed(1)}%</td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="text-center">No hay datos para este cliente</td></tr>';

    // Update Chart
    const chart = AppState.charts[containerId];
    if (chart) {
        // Group by center for the chart
        const byCenter = rows.reduce((acc, r) => {
            acc[r.centro] = (acc[r.centro] || 0) + r.venta;
            return acc;
        }, {});

        const labels = Object.keys(byCenter);
        const values = Object.values(byCenter);

        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update();
    }
}
// ========================================
// UI Updates
// ========================================
function updateKPIs(data) {
    document.getElementById('totalRevenue').textContent = formatCurrency(data.totalVenta);
    document.getElementById('totalCost').textContent = formatCurrency(data.totalCoste);
    document.getElementById('netMargin').textContent = formatCurrency(data.totalMargen);
    const performance = data.totalVenta ? (data.totalMargen / data.totalVenta) * 100 : 0;
    document.getElementById('performance').textContent = performance.toFixed(1) + '%';

    // Update YoY Badges
    const revYoY = document.getElementById('revenueYoY');
    const marYoY = document.getElementById('marginYoY');

    if (AppState.yoyMetrics.available) {
        updateYoYBadge(revYoY, AppState.yoyMetrics.revenueChange);
        updateYoYBadge(marYoY, AppState.yoyMetrics.marginChange);
    } else {
        revYoY.style.display = 'none';
        marYoY.style.display = 'none';
    }

    // Update Budget Badges
    const revBudget = document.getElementById('revenueBudget');
    const marBudget = document.getElementById('marginBudget');

    if (AppState.budgetMetrics.available) {
        updateBudgetBadge(revBudget, AppState.budgetMetrics.revenueAchievement);
        updateBudgetBadge(marBudget, AppState.budgetMetrics.marginAchievement);
    } else {
        revBudget.style.display = 'none';
        marBudget.style.display = 'none';
    }
}

function updateYoYBadge(el, value) {
    el.style.display = 'inline-flex';
    el.className = `kpi-badge yoy ${value >= 0 ? 'positive' : 'negative'}`;
    el.textContent = `${value >= 0 ? '▲' : '▼'} ${Math.abs(value).toFixed(1)}% YoY`;
}

function updateBudgetBadge(el, value) {
    el.style.display = 'inline-flex';
    el.className = `kpi-badge budget ${value >= 100 ? 'positive' : 'warning'}`;
    el.textContent = `🎯 ${value.toFixed(0)}%`;
}

function updateDataTable(rows, totalVenta, totalCoste) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="7">
                    <div class="empty-message">
                        <p>No hay datos para mostrar</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Show ALL rows sorted by venta descending
    const sortedRows = [...rows].sort((a, b) => b.venta - a.venta);

    sortedRows.forEach(row => {
        const tr = document.createElement('tr');
        const margenColor = row.margen >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)';

        // Highlight critical rows
        if (row.margenPct < 20) {
            tr.classList.add('critical-row');
        }

        tr.innerHTML = `
            <td title="${row.nombre}">${truncateText(row.nombre, 30)}</td>
            <td><span class="badge badge-center">${truncateText(row.centro, 15)}</span></td>
            <td><span class="badge badge-linea">${truncateText(row.lineaNegocio, 15)}</span></td>
            <td style="text-align: right; color: var(--color-revenue);">${formatCurrency(row.venta)}</td>
            <td style="text-align: right; color: var(--color-cost);">${formatCurrency(row.coste)}</td>
            <td style="text-align: right; color: ${margenColor};">${formatCurrency(row.margen)}</td>
            <td style="text-align: right; color: ${margenColor};">${row.margenPct.toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });

    // Update table header to show count
    const tableHeader = document.querySelector('.table-header h3');
    if (tableHeader) {
        tableHeader.textContent = `Detalle del Período (${rows.length} registros)`;
    }
}


function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// ========================================
// Charts
// ========================================
function initCharts() {
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    const distributionCtx = document.getElementById('costDistributionChart').getContext('2d');

    // Monthly Evolution Chart
    AppState.charts.monthly = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Ingresos',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Costes',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });

    // Cost Distribution Chart
    AppState.charts.distribution = new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
                    '#f97316', '#eab308', '#22c55e', '#14b8a6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        padding: 12,
                        usePointStyle: true
                    }
                }
            },
            cutout: '65%'
        }
    });

    // Low Performance Chart (Horizontal Bar)
    const lowPerfCtx = document.getElementById('lowPerfChart').getContext('2d');
    AppState.charts.lowPerf = new Chart(lowPerfCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return new Intl.NumberFormat('es-ES', {
                                style: 'percent', minimumFractionDigits: 1
                            }).format(context.raw / 100);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) { return value + '%'; }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#cbd5e1', font: { weight: '500' } }
                }
            }
        }
    });

    // Budget vs Actual Chart (BvA)
    const bvaCtx = document.getElementById('bvaChart').getContext('2d');
    AppState.charts.bva = new Chart(bvaCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8' } }
            },
            scales: {
                y: { ticks: { color: '#64748b', callback: (v) => formatCurrency(v) } },
                x: { ticks: { color: '#64748b' } }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const centerName = AppState.charts.bva.data.labels[idx];
                    showDetailModal(centerName);
                }
            }
        }
    });

    // Add click handler to lowPerfChart
    AppState.charts.lowPerf.options.onClick = (e, elements) => {
        if (elements.length > 0) {
            const idx = elements[0].index;
            const centerName = AppState.charts.lowPerf.data.labels[idx];
            showDetailModal(centerName);
        }
    };

    // Add click handler to distribution chart
    AppState.charts.distribution.options.onClick = (e, elements) => {
        if (elements.length > 0) {
            const idx = elements[0].index;
            const businessLine = AppState.charts.distribution.data.labels[idx];
            showBusinessLineDetail(businessLine);
        }
    };

    initModalHandlers();
}

function initModalHandlers() {
    const modal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('closeModal');

    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

function showBusinessLineDetail(businessLine) {
    const modal = document.getElementById('detailModal');
    const title = document.getElementById('modalTitle');
    const kpiContainer = document.getElementById('modalKPIs');
    const tableBody = document.getElementById('modalTableBody');

    if (!AppState.processedData) return;

    title.textContent = `Línea de Negocio: ${businessLine}`;

    // Rows for this business line
    const blRows = AppState.processedData.rows.filter(r => r.lineaNegocio === businessLine);
    const totals = blRows.reduce((acc, r) => {
        acc.venta += r.venta;
        acc.margen += r.margen;
        return acc;
    }, { venta: 0, margen: 0 });

    kpiContainer.innerHTML = `
        <div class="kpi-card">
            <span class="kpi-label">Ventas Totales</span>
            <span class="kpi-value">${formatCurrency(totals.venta)}</span>
        </div>
        <div class="kpi-card">
            <span class="kpi-label">Margen Total</span>
            <span class="kpi-value">${formatCurrency(totals.margen)}</span>
        </div>
        <div class="kpi-card">
            <span class="kpi-label">Rendimiento</span>
            <span class="kpi-value">${calculateMarginPercentage(totals.venta, totals.margen).toFixed(1)}%</span>
        </div>
    `;

    tableBody.innerHTML = blRows.map(r => `
        <tr>
            <td>${r.centro}</td>
            <td class="text-right">${formatCurrency(r.venta)}</td>
            <td class="text-right">${r.presVenta ? formatCurrency(r.presVenta) : '-'}</td>
            <td class="text-right ${r.margen >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(r.margen)}</td>
        </tr>
    `).join('');

    modal.style.display = 'block';
}

function showDetailModal(centerName) {
    const modal = document.getElementById('detailModal');
    const title = document.getElementById('modalTitle');
    const kpiContainer = document.getElementById('modalKPIs');
    const tableBody = document.getElementById('modalTableBody');

    if (!AppState.processedData) return;

    const centerData = AppState.processedData.byCenter[centerName];
    if (!centerData) return;

    title.textContent = `Detalle: ${centerName}`;

    // KPIs in modal
    kpiContainer.innerHTML = `
        <div class="kpi-card">
            <span class="kpi-label">Ventas</span>
            <span class="kpi-value">${formatCurrency(centerData.venta)}</span>
        </div>
        <div class="kpi-card">
            <span class="kpi-label">Margen (€)</span>
            <span class="kpi-value">${formatCurrency(centerData.margen)}</span>
        </div>
        <div class="kpi-card">
            <span class="kpi-label">Rendimiento</span>
            <span class="kpi-value">${calculateMarginPercentage(centerData.venta, centerData.margen).toFixed(1)}%</span>
        </div>
    `;

    // Detailed table for the center (all lines/rows for this center)
    const centerRows = AppState.processedData.rows.filter(r => r.centro === centerName);

    tableBody.innerHTML = centerRows.map(r => `
        <tr>
            <td>${r.lineaNegocio}</td>
            <td class="text-right">${formatCurrency(r.venta)}</td>
            <td class="text-right">${r.presVenta ? formatCurrency(r.presVenta) : '-'}</td>
            <td class="text-right ${r.margen >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(r.margen)}</td>
        </tr>
    `).join('');

    modal.style.display = 'block';
}

function updateCharts(byLineaNegocio, byCenter) {
    // 1. Update Distribution Chart (Ventas por Línea de Negocio)
    const lineas = Object.keys(byLineaNegocio);
    const ventasByLinea = lineas.map(linea => byLineaNegocio[linea].venta);

    const sortedLineas = lineas
        .map((linea, i) => ({ linea, venta: ventasByLinea[i] }))
        .sort((a, b) => b.venta - a.venta)
        .slice(0, 8); // Top 8 lines

    if (AppState.charts.distribution) {
        AppState.charts.distribution.data.labels = sortedLineas.map(l => l.linea);
        AppState.charts.distribution.data.datasets[0].data = sortedLineas.map(l => l.venta);
        AppState.charts.distribution.update();
    }

    // 2. Update Low Performance Chart (< 20% Margin)
    const centros = Object.keys(byCenter);
    const lowPerfCentros = centros
        .map(centro => {
            const data = byCenter[centro];
            // Use standard helper for consistency
            const margenPct = calculateMarginPercentage(data.venta, data.margen);

            return {
                centro,
                margenPct: margenPct,
                venta: data.venta
            };
        })
        .filter(c => c.margenPct < 20 && Math.abs(c.venta) > 0.01) // Show active centers (pos or neg revenue)
        .sort((a, b) => a.margenPct - b.margenPct); // Lowest margin first

    if (AppState.charts.lowPerf) {
        AppState.charts.lowPerf.data.labels = lowPerfCentros.map(c => c.centro);
        AppState.charts.lowPerf.data.datasets = [{
            label: 'Margen %',
            data: lowPerfCentros.map(c => c.margenPct),
            backgroundColor: '#ef4444', // Red for danger
            borderRadius: 4
        }];
        AppState.charts.lowPerf.update();
    }

    // 3. Update BvA Chart (Budget vs Actual)
    if (AppState.charts.bva) {
        const centers = Object.keys(byCenter);
        const bvaData = centers
            .map(c => ({
                name: c,
                actual: byCenter[c].venta,
                budget: byCenter[c].presVenta
            }))
            .filter(c => c.budget > 0)
            .sort((a, b) => b.actual - a.actual)
            .slice(0, 5); // Top 5 centers with budget

        AppState.charts.bva.data.labels = bvaData.map(c => c.name);
        AppState.charts.bva.data.datasets = [
            {
                label: 'Real (€)',
                data: bvaData.map(c => c.actual),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderRadius: 4
            },
            {
                label: 'Presupuesto (€)',
                data: bvaData.map(c => c.budget),
                backgroundColor: 'rgba(99, 102, 241, 0.4)',
                borderRadius: 4
            }
        ];
        AppState.charts.bva.update();
    }

    // 4. Update Monthly Chart (if historical data exists)
    updateMonthlyChart();
}

function updateMonthlyChart() {
    const history = AppState.historicalData;
    if (history.length === 0) return;

    const labels = history.map(h => h.period);
    const revenues = history.map(h => h.totals.totalRevenue);
    const costs = history.map(h => h.totals.totalCost);

    AppState.charts.monthly.data.labels = labels;
    AppState.charts.monthly.data.datasets[0].data = revenues;
    AppState.charts.monthly.data.datasets[1].data = costs;
    AppState.charts.monthly.update();
}

// ========================================
// History Management
// ========================================
function saveToHistory(data) {
    // Check if this period already exists
    const existingIndex = AppState.historicalData.findIndex(h => h.period === data.period);
    if (existingIndex >= 0) {
        AppState.historicalData[existingIndex] = data;
    } else {
        AppState.historicalData.push(data);
    }

    // Save to localStorage
    try {
        localStorage.setItem('cierresPro_history', JSON.stringify(AppState.historicalData));
        renderHistory();
        showToast('Cierre guardado en histórico', 'success');
    } catch (e) {
        console.warn('LocalStorage full, could not save history', e);
        showToast('Memoria llena: No se pudo guardar en histórico', 'warning');
    }

    // Update charts to show trend including new data
    updateMonthlyChart();
}

// History on load handled by DOMContentLoaded in init
function loadHistoryFromStorage() {
    const stored = localStorage.getItem('cierresPro_history');
    if (stored) {
        try {
            AppState.historicalData = JSON.parse(stored);
            renderHistory();
            updateMonthlyChart();
        } catch (e) {
            console.error('Error loading history', e);
        }
    }
}

function renderHistory() {
    const historyGrid = document.getElementById('historyGrid');
    if (!historyGrid) return;

    const history = AppState.historicalData;

    if (history.length === 0) {
        historyGrid.innerHTML = `
            <div class="empty-state-large">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                <h3>Sin histórico</h3>
                <p>Carga tu primer archivo Excel para comenzar a generar histórico</p>
            </div>
        `;
        return;
    }

    historyGrid.innerHTML = history.slice().reverse().map((item, index) => {
        // Correct index because of reverse
        const realIndex = history.length - 1 - index;
        return `
            <div class="history-card" onclick="loadHistoryItem(${realIndex})">
                <div class="history-header">
                    <span class="history-period">${item.period}</span>
                    <span class="history-date">${new Date(item.date).toLocaleDateString()}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteHistoryItem(${realIndex})" title="Eliminar este mes">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                        </svg>
                    </button>
                </div>
                <div class="history-stats">
                    <div class="stat">
                        <span class="label">Ventas</span>
                        <span class="value">${formatCurrency(item.totals.totalRevenue)}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Margen</span>
                        <span class="value" style="color: ${item.totals.netMargin >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)'}">
                            ${formatCurrency(item.totals.netMargin)}
                        </span>
                    </div>
                    <div class="stat">
                        <span class="label">Rentabilidad</span>
                        <span class="value">${item.totals.performance.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-sm btn-outline-primary">Ver Datos</button>
                </div>
            </div>
        `;
    }).join('');
}

window.deleteHistoryItem = function (index) {
    const item = AppState.historicalData[index];
    if (confirm(`¿Estás seguro de que quieres eliminar el historial de "${item.period}"? Esta acción no se puede deshacer.`)) {
        AppState.historicalData.splice(index, 1);
        localStorage.setItem('cierresPro_history', JSON.stringify(AppState.historicalData));
        renderHistory();
        updateMonthlyChart();
        showToast('Historial eliminado', 'success');
    }
};

window.loadHistoryItem = function (index) {
    const item = AppState.historicalData[index];
    if (item) {
        // Update dashboard with historical data (summary)
        const reconstructedData = {
            rows: [],
            totals: {
                totalVenta: item.totals.totalRevenue,
                totalCoste: item.totals.totalCost,
                totalMargen: item.totals.netMargin,
                totalMargen2: item.totals.margen2 || 0
            },
            byCenter: item.byCenter,
            byLineaNegocio: item.byLineaNegocio,
            byEstado: {}
        };

        AppState.processedData = reconstructedData;
        updateDashboard(reconstructedData);

        document.getElementById('currentPeriod').textContent = item.period;
        window.navigateToSection('dashboard');
        showToast(`Cargado histórico: ${item.period}`, 'info');
    }
}

// ========================================
// Settings
// ========================================
function saveSettings() {
    AppState.settings = {
        revenueColumn: document.getElementById('revenueColumn').value,
        costColumn: document.getElementById('costColumn').value,
        dateColumn: document.getElementById('dateColumn').value,
        categoryColumn: document.getElementById('categoryColumn').value
    };

    localStorage.setItem('cierresPro_settings', JSON.stringify(AppState.settings));
    showToast('Configuración guardada', 'success');
}

function loadSettings() {
    const saved = localStorage.getItem('cierresPro_settings');
    if (saved) {
        AppState.settings = JSON.parse(saved);
        document.getElementById('revenueColumn').value = AppState.settings.revenueColumn || '';
        document.getElementById('costColumn').value = AppState.settings.costColumn || '';
        document.getElementById('dateColumn').value = AppState.settings.dateColumn || '';
        document.getElementById('categoryColumn').value = AppState.settings.categoryColumn || '';
    }
}

// ========================================
// Export Data
// ========================================
function exportData() {
    if (!AppState.currentData && AppState.historicalData.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }

    // Export historical summary
    const exportRows = [
        ['Período', 'Ingresos', 'Costes', 'Margen', 'Rendimiento %']
    ];

    AppState.historicalData.forEach(item => {
        exportRows.push([
            item.period,
            item.totals.totalRevenue,
            item.totals.totalCost,
            item.totals.netMargin,
            item.totals.performance.toFixed(2)
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
    XLSX.writeFile(wb, `CierresPro_Resumen_${new Date().toISOString().split('T')[0]}.xlsx`);

    showToast('Datos exportados correctamente', 'success');
}

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
        <span style="color: var(--accent-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'primary'})">${icons[type]}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ========================================
// Analysis & Reporting Module
// ========================================
function renderAnalysis() {
    const tableBody = document.getElementById('detailedTableBody');
    const reportSummary = document.getElementById('reportSummary');
    if (!tableBody || !AppState.processedData) return;

    // 1. Populate Detailed Table
    tableBody.innerHTML = AppState.processedData.rows.map(row => `
        <tr>
            <td>${row.centro}</td>
            <td>${row.cliente || row.nombre || ''}</td>
            <td><span class="badge badge-linea">${row.lineaNegocio}</span></td>
            <td><span class="badge badge-estado">${row.estado}</span></td>
            <td class="text-right">${formatCurrency(row.venta)}</td>
            <td class="text-right">${formatCurrency(row.coste)}</td>
            <td class="text-right" style="color: ${row.margen >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)'}">${formatCurrency(row.margen)}</td>
            <td class="text-right" style="color: ${row.margen >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)'}">${row.margenPct.toFixed(1)}%</td>
        </tr>
    `).join('');

    // 2. Generate Smart Summary
    if (reportSummary) {
        reportSummary.innerHTML = generateSmartSummary(AppState.processedData);
    }
}

function generateSmartSummary(data) {
    const totals = data.totals;
    const marginPct = calculateMarginPercentage(totals.totalVenta, totals.totalMargen);

    // Find top and bottom centers
    const centers = Object.keys(data.byCenter).map(c => ({ name: c, ...data.byCenter[c], pct: calculateMarginPercentage(data.byCenter[c].venta, data.byCenter[c].margen) }));
    const topCenter = [...centers].sort((a, b) => b.margen - a.margen)[0];
    const lowPerf = centers.filter(c => c.pct < 20).sort((a, b) => a.pct - b.pct);

    let html = `
        <div style="margin-bottom: 1rem; line-height: 1.6;">
            <strong>Resumen Ejecutivo:</strong><br>
            Durante el período actual se han procesado ventas totales por valor de <strong>${formatCurrency(totals.totalVenta)}</strong>, 
            generando un margen neto de <strong>${formatCurrency(totals.totalMargen)}</strong> (${marginPct.toFixed(1)}%).
        </div>
        <div style="margin-bottom: 1rem; line-height: 1.6;">
            <strong>Puntos Clave:</strong><br>
            • El centro con mayor contribución al margen ha sido <em>${topCenter?.name || 'N/A'}</em>.<br>
            • Se han detectado <strong>${lowPerf.length}</strong> centros con rentabilidad inferior al 20%.
        </div>
    `;
    return html;
}

// ========================================
// Backup / Portability
// ========================================
function exportHistory() {
    const data = JSON.stringify(AppState.historicalData);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CierresPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Copia de seguridad descargada', 'success');
}

function importHistory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    AppState.historicalData = imported;
                    localStorage.setItem('cierresPro_history', JSON.stringify(AppState.historicalData));
                    renderHistory();
                    updateMonthlyChart();
                    showToast('Backup restaurado correctamente', 'success');
                }
            } catch (err) {
                showToast('Error al leer el archivo de backup', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ========================================
// Client Analysis Module
// ========================================
let currentClientsData = [];

function renderClients() {
    const listContainer = document.getElementById('clientsList');
    if (!listContainer || !AppState.processedData || !AppState.processedData.rows) return;

    if (AppState.processedData.rows.length === 0) {
        listContainer.innerHTML = '<div class="empty-state-small">Sin datos cargados</div>';
        return;
    }

    // Aggregate by Client
    const clientsMap = {};
    AppState.processedData.rows.forEach(row => {
        const clientName = row.cliente || row.nombre || 'Desconocido';
        if (!clientsMap[clientName]) {
            clientsMap[clientName] = {
                name: clientName,
                centers: [],
                totalVenta: 0,
                totalCoste: 0,
                totalMargen: 0
            };
        }
        clientsMap[clientName].centers.push(row);
        clientsMap[clientName].totalVenta += row.venta;
        clientsMap[clientName].totalCoste += row.coste;
        clientsMap[clientName].totalMargen += row.margen;
    });

    currentClientsData = Object.values(clientsMap).sort((a, b) => b.totalVenta - a.totalVenta);
    renderClientList(currentClientsData);

    const searchInput = document.getElementById('clientSearch');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = currentClientsData.filter(c => c.name.toLowerCase().includes(term));
            renderClientList(filtered);
        };
    }
}

function renderClientList(clients) {
    const listContainer = document.getElementById('clientsList');
    if (!listContainer) return;
    listContainer.innerHTML = clients.map(client => {
        const marginPct = calculateMarginPercentage(client.totalVenta, client.totalMargen);
        return `
            <div class="client-item" onclick="selectClient('${client.name.replace(/'/g, "\\'")}')">
                <div class="client-item-header">
                    <span class="client-name">${truncateText(client.name, 25)}</span>
                    <span class="client-revenue">${formatCurrency(client.totalVenta)}</span>
                </div>
                <div class="client-metrics">
                    <span>${client.centers.length} Centros</span>
                    <span style="color: ${client.totalMargen >= 0 ? 'var(--color-revenue)' : 'var(--color-cost)'}">${marginPct.toFixed(1)}% MG</span>
                </div>
            </div>
        `;
    }).join('');
}

window.selectClient = function (clientName) {
    const client = currentClientsData.find(c => c.name === clientName);
    if (!client) return;
    document.querySelectorAll('.client-item').forEach(el => el.classList.remove('active'));

    const detailView = document.getElementById('clientDetailView');
    if (!detailView) return;
    const marginPct = calculateMarginPercentage(client.totalVenta, client.totalMargen);

    detailView.innerHTML = `
        <div class="client-detail-header">
            <div><h2>${client.name}</h2></div>
            <div style="text-align: right;">
                <div class="kpi-value">${formatCurrency(client.totalMargen)}</div>
                <div class="kpi-change">Margen: ${marginPct.toFixed(1)}%</div>
            </div>
        </div>
        <div class="detailed-table-container">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                        <th style="padding: 0.5rem;">Centro</th>
                        <th style="padding: 0.5rem; text-align: right;">Venta</th>
                        <th style="padding: 0.5rem; text-align: right;">Margen</th>
                    </tr>
                </thead>
                <tbody>
                    ${client.centers.map(center => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.75rem 0.5rem;">${center.centro}</td>
                            <td style="padding: 0.75rem 0.5rem; text-align: right;">${formatCurrency(center.venta)}</td>
                            <td style="padding: 0.75rem 0.5rem; text-align: right;">${formatCurrency(center.margen)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};


// ========================================
// Dynamic Client Management
// ========================================
function initClientManager() {
    const addBtn = document.getElementById('addClientBtn');
    const clientNameInput = document.getElementById('newClientName');
    const clientColorInput = document.getElementById('newClientColor');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const name = clientNameInput.value.trim().toUpperCase();
            if (!name) {
                showToast('Introduce un nombre para el cliente', 'warning');
                return;
            }

            // Check if exists
            if (AppState.managedClients.some(c => c.name === name)) {
                showToast('Este cliente ya existe', 'warning');
                return;
            }

            const client = {
                name: name,
                color: clientColorInput.value,
                id: name.toLowerCase().replace(/[^a-z0-9]/g, '-')
            };

            AppState.managedClients.push(client);
            saveManagedClients();
            renderClientSettingsList();
            refreshDynamicSections();
            window.refreshNavigation();

            clientNameInput.value = '';
            showToast(`Cliente ${name} añadido`, 'success');
        });
    }

    renderClientSettingsList();
    refreshDynamicSections();
}

function saveManagedClients() {
    localStorage.setItem('cpro_managed_clients', JSON.stringify(AppState.managedClients));
}

function loadManagedClients() {
    const saved = localStorage.getItem('cpro_managed_clients');
    if (saved) {
        AppState.managedClients = JSON.parse(saved);
    } else {
        AppState.managedClients = [
            { name: 'ALIMERKA', color: '#10b981', id: 'alimerka' },
            { name: 'CARREFOUR', color: '#3b82f6', id: 'carrefour' },
            { name: 'BASIC-FIT', color: '#ff7000', id: 'basicfit' }
        ];
        saveManagedClients();
    }
}

function renderClientSettingsList() {
    const container = document.getElementById('clientListSettings');
    if (!container) return;

    if (AppState.managedClients.length === 0) {
        container.innerHTML = '<p class="text-tertiary">No hay clientes personalizados configurados.</p>';
        return;
    }

    container.innerHTML = `
        <table class="settings-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="text-align: left; border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 10px;">Cliente</th>
                    <th style="padding: 10px;">Color</th>
                    <th style="padding: 10px; text-align: right;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${AppState.managedClients.map((client, index) => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 10px; font-weight: 600;">${client.name}</td>
                        <td style="padding: 10px;">
                            <div style="width: 20px; height: 20px; border-radius: 4px; background: ${client.color};"></div>
                        </td>
                        <td style="padding: 10px; text-align: right;">
                            <button class="btn btn-outline-danger btn-sm" onclick="removeManagedClient(${index})">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.removeManagedClient = (index) => {
    const client = AppState.managedClients[index];
    if (confirm(`¿Eliminar el dashboard de ${client.name}?`)) {
        AppState.managedClients.splice(index, 1);
        saveManagedClients();
        renderClientSettingsList();
        refreshDynamicSections();
        window.refreshNavigation();
        showToast(`Cliente eliminado`, 'info');
    }
};

function refreshDynamicSections() {
    const mainContent = document.querySelector('.main-content');
    document.querySelectorAll('.content-section-dynamic').forEach(el => el.remove());

    AppState.managedClients.forEach(client => {
        const section = document.createElement('section');
        section.id = client.id;
        section.className = 'content-section content-section-dynamic';

        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        const accentAlpha = hexToRgba(client.color, 0.1);

        section.innerHTML = `
            <div class="header-banner" style="--banner-accent: ${client.color}; --banner-accent-alpha: ${accentAlpha};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2>Dashboard ${client.name}</h2>
                        <p>Seguimiento específico de rendimiento para ${client.name}</p>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="exportToPDF('${client.id}', 'Dashboard_${client.name}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        PDF Report
                    </button>
                </div>
            </div>
            <div class="kpi-grid" id="${client.id}KPIs"></div>
            <div class="charts-grid">
                <div class="chart-card full-width">
                    <div class="chart-header"><h3>Distribución por Centro</h3></div>
                    <div class="chart-container"><canvas id="${client.id}Chart"></canvas></div>
                </div>
            </div>
            <div class="table-card">
                <div class="table-container">
                    <table class="client-table">
                        <thead>
                            <tr>
                                <th>Centro</th>
                                <th>Línea</th>
                                <th class="text-right">Venta</th>
                                <th class="text-right">Margen %</th>
                            </tr>
                        </thead>
                        <tbody id="${client.id}TableBody"></tbody>
                    </table>
                </div>
            </div>
        `;
        const clientsSection = document.getElementById('clients');
        mainContent.insertBefore(section, clientsSection);
        initDynamicClientChart(client.id);
    });
}

function initDynamicClientChart(id) {
    const canvas = document.getElementById(`${id}Chart`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (AppState.charts[id]) AppState.charts[id].destroy();

    AppState.charts[id] = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Vente (€)', data: [], backgroundColor: '#6366f1', borderRadius: 4 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { callback: (v) => formatCurrency(v) } } }
        }
    });
}

// ========================================
// PDF Export Functionality
// ========================================
async function exportToPDF(elementId, fileName = 'Reporte') {
    const element = document.getElementById(elementId);
    if (!element) return;

    showToast('Generando PDF...', 'info');

    try {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#0f172a' // Match app background
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);

        showToast('PDF generado correctamente', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error al generar el PDF', 'error');
    }
}

// Global initialization for main dashboard PDF
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('exportPdfBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            const period = document.getElementById('currentPeriod').textContent;
            exportToPDF('dashboard', `Dashboard_General_${period}`);
        });
    }
});

window.exportToPDF = exportToPDF;

// Make functions globally accessible
window.exportData = exportData;
window.exportHistory = exportHistory;
window.importHistory = importHistory;
window.loadHistoryItem = loadHistoryItem;
window.renderClients = renderClients;
window.renderAnalysis = renderAnalysis;
window.saveSettings = saveSettings;




