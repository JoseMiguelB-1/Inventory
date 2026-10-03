// ID de tu Google Sheet y GID de la pestaña obtenidos de tu enlace
const SPREADSHEET_ID = '1fP3PWiWY13KpIT62uLwh-DpW76Pc6t_y';
const GID = '108359074';

// URL de exportación a CSV de Google Sheets
const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID}`;

let globalInventoryData = [];

function formatCurrency(amount) {
    const cleanNum = parseFloat(String(amount).replace(/[^0-9,.-]+/g,"").replace(',', '.')) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cleanNum);
}

function loadGoogleSheetData() {
    const statusEl = document.getElementById('statusIndicator');
    statusEl.textContent = "Conectando...";
    statusEl.className = "text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium";

    // Proxy público para evitar bloqueos CORS del navegador al consultar Google Sheets
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;

    Papa.parse(proxyUrl, {
        download: true,
        header: false,
        complete: function(results) {
            processData(results.data);
            statusEl.textContent = "Sincronizado";
            statusEl.className = "text-xs px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium";
        },
        error: function(err) {
            console.error("Error al leer el Google Sheet:", err);
            statusEl.textContent = "Error de conexión";
            statusEl.className = "text-xs px-3 py-1 rounded-full bg-red-100 text-red-800 font-medium";
            document.getElementById('inventoryTableBody').innerHTML = `<tr><td colspan="4" class="text-center py-8 text-red-500">No se pudo cargar el archivo. Asegúrate de que el Google Sheet esté compartido como público ("Cualquier usuario con el enlace puede ver").</td></tr>`;
        }
    });
}

function processData(rows) {
    globalInventoryData = [];
    
    rows.forEach((row) => {
        // Asignación basada en las columnas de tu hoja:
        // Columna C (índice 2): Nombre
        // Columna D (índice 3): Cantidad
        // Columna K (índice 11): Precio Total / Venta
        // Columna L (índice 12): Restantes (Stock)
        const nombre = row[2];
        const cantidad = row[3];
        const precio = row[11];
        const restantes = row[12];

        if (nombre && nombre.trim() !== "" && nombre.toLowerCase() !== "nombre" && nombre.toLowerCase() !== "totalc") {
            globalInventoryData.push({
                nombre: nombre.trim(),
                cantidad: cantidad || "0",
                restantes: restantes || "0",
                precio: precio || "$0"
            });
        }
    });

    renderTable(globalInventoryData);
}

function renderTable(data) {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-400">No se encontraron registros de perfumes válidos.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50";
        
        const numRestantes = parseInt(item.restantes) || 0;
        const stockBadgeClass = numRestantes > 0 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800";

        tr.innerHTML = `
            <td class="py-3 px-6 font-medium text-gray-900">${item.nombre}</td>
            <td class="py-3 px-6 text-center text-gray-600">${item.cantidad}</td>
            <td class="py-3 px-6 text-center">
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${stockBadgeClass}">
                    ${item.restantes} disp.
                </span>
            </td>
            <td class="py-3 px-6 text-right font-semibold text-indigo-600">${formatCurrency(item.precio)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Evento para el buscador en tiempo real
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = globalInventoryData.filter(item => item.nombre.toLowerCase().includes(query));
    renderTable(filtered);
});

// Cargar datos automáticamente al iniciar
loadGoogleSheetData();
