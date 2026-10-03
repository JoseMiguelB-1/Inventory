const SPREADSHEET_ID = '1fP3PWiWY13KpIT62uLwh-DpW76Pc6t_y';
const GID = '108359074';

const CSV_URLS = [
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID}`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`
];

// Índices de columna (base 0): A=0, B=1, C=2 ...
const COL = {
    ID: 1,        // B
    NOMBRE: 2,    // C
    CANTIDAD: 3,  // D
    FRASCO: 8,    // I  (Frasco de lujo)
    PRECIO_FRASCO: 9, // J (Precio Frasco)
    RESTANTES: 11 // L
};

const PRECIO_CON_FRASCO = 57000;
const PRECIO_SIN_FRASCO = 42000;

let globalInventoryData = [];

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function setStatus(text, colors) {
    const statusEl = document.getElementById('statusIndicator');
    statusEl.textContent = text;
    statusEl.className = `text-xs px-3 py-1 rounded-full ${colors} font-medium`;
}

// Parser CSV que respeta comillas (campos con comas, saltos de línea, "" escapadas)
function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];

        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            row.push(field); field = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            rows.push(row); row = [];
        } else {
            field += c;
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
}

async function fetchCSV() {
    let lastError;
    for (const url of CSV_URLS) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (err) {
            lastError = err;
            console.warn('Falló', url, err);
        }
    }
    throw lastError;
}

async function loadGoogleSheetData() {
    setStatus('Conectando...', 'bg-blue-100 text-blue-800');
    try {
        const csvText = await fetchCSV();
        processCSVText(csvText);
        setStatus('Sincronizado', 'bg-green-100 text-green-800');
    } catch (err) {
        console.error('Fallo total de conexión:', err);
        setStatus('Error de conexión', 'bg-red-100 text-red-800');
        document.getElementById('inventoryTableBody').innerHTML =
            `<tr><td colspan="5" class="text-center py-8 text-red-500">No se pudo cargar el archivo. Verifica los permisos de acceso público.</td></tr>`;
    }
}

function cell(row, idx) {
    return (row[idx] || '').trim();
}

function processCSVText(text) {
    const rows = parseCSV(text);
    globalInventoryData = [];

    rows.forEach(row => {
        const id = cell(row, COL.ID);
        const nombre = cell(row, COL.NOMBRE);

        // Solo filas de perfumes reales: ID numérico y nombre con texto
        // (descarta encabezados, "Factura 1", "TotalC", filas vacías)
        if (!/^\d+$/.test(id) || nombre === '') return;

        const cantidad = cell(row, COL.CANTIDAD) || '0';
        const frascoNombre = cell(row, COL.FRASCO);
        const precioFrasco = cell(row, COL.PRECIO_FRASCO);

        const tieneFrasco = frascoNombre !== '' || precioFrasco !== '';
        const restantes = cell(row, COL.RESTANTES) || '0';

        globalInventoryData.push({
            nombre,
            cantidad,
            tieneFrasco,
            frascoNombre,
            restantes,
            precio: tieneFrasco ? PRECIO_CON_FRASCO : PRECIO_SIN_FRASCO
        });
    });

    renderTable(globalInventoryData);
}

function renderTable(data) {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-400">No se encontraron registros de perfumes válidos.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';

        const numRestantes = parseInt(item.restantes) || 0;
        const stockBadgeClass = numRestantes > 0
            ? 'bg-green-100 text-green-800 font-semibold'
            : 'bg-red-100 text-red-800 font-semibold';

        const frascoBadgeClass = item.tieneFrasco
            ? 'bg-green-100 text-green-700 font-bold'
            : 'bg-red-100 text-red-600 font-medium';
        const frascoTexto = item.tieneFrasco
            ? `SÍ${item.frascoNombre ? ' · ' + item.frascoNombre : ''}`
            : 'NO';

        tr.innerHTML = `
            <td class="py-3 px-6 font-medium text-gray-900">${item.nombre}</td>
            <td class="py-3 px-6 text-center text-gray-600">${item.cantidad}</td>
            <td class="py-3 px-6 text-center">
                <span class="px-2.5 py-1 rounded-full text-xs ${frascoBadgeClass}">${frascoTexto}</span>
            </td>
            <td class="py-3 px-6 text-center">
                <span class="px-2.5 py-1 rounded-full text-xs ${stockBadgeClass}">${numRestantes} disp.</span>
            </td>
            <td class="py-3 px-6 text-right font-semibold text-indigo-600">${formatCurrency(item.precio)}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    renderTable(globalInventoryData.filter(item => item.nombre.toLowerCase().includes(query)));
});

loadGoogleSheetData();