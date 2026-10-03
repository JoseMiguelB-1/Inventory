// ID de tu Google Sheet / Excel en Drive
const SPREADSHEET_ID = '1fP3PWiWY13KpIT62uLwh-DpW76Pc6t_y';

// URL de descarga directa compatible con archivos Excel subidos a Google Drive
const excelUrl = `https://docs.google.com/uc?export=download&id=${SPREADSHEET_ID}`;

let globalInventoryData = [];

function formatCurrency(amount) {
    const cleanNum = parseFloat(String(amount).replace(/[^0-9,.-]+/g,"").replace(',', '.')) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cleanNum);
}

function loadGoogleSheetData() {
    const statusEl = document.getElementById('statusIndicator');
    statusEl.textContent = "Conectando...";
    statusEl.className = "text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium";

    // Usamos un proxy CORS alternativo y seguro para descargar el binario del Excel
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(excelUrl)}`;

    fetch(proxyUrl)
        .then(response => {
            if (!response.ok) throw new Error("No se pudo descargar el archivo.");
            return response.arrayBuffer();
        })
        .then(buffer => {
            // Leer el archivo Excel con SheetJS
            const workbook = XLSX.read(buffer, { type: 'array' });
            
            // Tomar la primera pestaña del libro
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir la hoja a una matriz (array de filas)
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            processData(rows);
            
            statusEl.textContent = "Sincronizado";
            statusEl.className = "text-xs px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium";
        })
        .catch(err => {
            console.error("Error al leer el archivo:", err);
            statusEl.textContent = "Error de conexión";
            statusEl.className = "text-xs px-3 py-1 rounded-full bg-red-100 text-red-800 font-medium";
            document.getElementById('inventoryTableBody').innerHTML = `<tr><td colspan="4" class="text-center py-8 text-red-500">No se pudo cargar el archivo. Verifica que el archivo esté compartido como "Cualquier usuario con el enlace puede ser Lector".</td></tr>`;
        });
}

function processData(rows) {
    globalInventoryData = [];
    
    rows.forEach((row) => {
        // Estructura basada en tus columnas:
        // Columna C (índice 2): Nombre
        // Columna D (índice 3): Cantidad
        // Columna K (índice 10 u 11): Precio Total / Venta
        // Columna L (índice 11 u 12): Restantes (Stock)
        const nombre = row[2];
        const cantidad = row[3];
        const precio = row[10] !== undefined ? row[10] : row[11]; 
        const restantes = row[11] !== undefined ? row[11] : row[12];

        if (nombre && String(nombre).trim() !== "" && String(nombre).toLowerCase() !== "nombre" && String(nombre).toLowerCase() !== "totalc") {
            globalInventoryData.push({
                nombre: String(nombre).trim(),
                cantidad: cantidad || "0",
                restantes: restantes !== undefined ? restantes : "0",
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
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-400">No se encontraron registros de perfumes válidos en el archivo.</td></tr>`;
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

// Buscador en tiempo real
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = globalInventoryData.filter(item => item.nombre.toLowerCase().includes(query));
    renderTable(filtered);
});

// Cargar datos automáticamente al iniciar
loadGoogleSheetData();
