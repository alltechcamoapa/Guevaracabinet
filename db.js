const DataService = (() => {
    let memoryDb = {
        clientes: [],
        productos: [],
        proformas: [],
        facturas: []
    };

    const init = async () => {
        const stored = localStorage.getItem('guevara_db');
        if (stored) {
            const parsed = JSON.parse(stored);
            memoryDb = { ...memoryDb, ...parsed };
            // Ensure facturas array exists even for old data
            if (!memoryDb.facturas) memoryDb.facturas = [];
        }
    };

    const save = () => {
        localStorage.setItem('guevara_db', JSON.stringify(memoryDb));
    };

    const generateId = () => crypto.randomUUID();

    // Clientes
    const getClientesFiltered = (filter) => {
        let res = memoryDb.clientes;
        if (filter.search) res = res.filter(c => c.nombreCliente.toLowerCase().includes(filter.search.toLowerCase()));
        if (filter.status !== 'all') res = res.filter(c => c.estado === filter.status);
        return res;
    };
    const getClientesSync = () => memoryDb.clientes;
    const getClienteById = (id) => memoryDb.clientes.find(c => c.clienteId === id || c.id === id);
    const getNextClienteCode = () => {
        let max = 0;
        memoryDb.clientes.forEach(c => {
            if (c.clienteId && c.clienteId.startsWith('CL-')) {
                const num = parseInt(c.clienteId.replace('CL-', ''));
                if (!isNaN(num) && num > max) max = num;
            }
        });
        return 'CL-' + String(max + 1).padStart(4, '0');
    };

    const createCliente = async (data) => {
        data.id = getNextClienteCode();
        data.clienteId = data.id; // compat
        data.fechaCreacion = new Date().toISOString();
        if (!data.estado) data.estado = 'Activo';
        memoryDb.clientes.push(data);
        save();
    };
    const updateCliente = async (id, data) => {
        const index = memoryDb.clientes.findIndex(c => c.clienteId === id || c.id === id);
        if (index > -1) {
            memoryDb.clientes[index] = { ...memoryDb.clientes[index], ...data };
            save();
        }
    };
    const deleteCliente = async (id) => {
        memoryDb.clientes = memoryDb.clientes.filter(c => c.clienteId !== id && c.id !== id);
        save();
    };

    // Relaciones
    const getProformasByCliente = (id) => memoryDb.proformas.filter(p => p.clienteId === id || p.cliente_id === id);
    const getFacturasByCliente = (id) => memoryDb.facturas.filter(f => f.clienteId === id || f.cliente_id === id);

    // Productos
    const getProductosFiltered = (filter) => {
        let res = memoryDb.productos;
        if (filter.search) res = res.filter(p => p.nombre.toLowerCase().includes(filter.search.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(filter.search.toLowerCase())));
        if (filter.tipo !== 'all') res = res.filter(p => p.tipo === filter.tipo);
        if (filter.estado !== 'all') res = res.filter(p => p.estado === filter.estado);
        return res;
    };
    const getProductosSync = () => memoryDb.productos;
    const getProductoById = (id) => memoryDb.productos.find(p => p.id === id);

    const getNextProductoCode = (tipo) => {
        const prefix = tipo === 'Servicio' ? 'SO-' : 'PO-';
        const matchingCount = memoryDb.productos.filter(p => p.tipo === tipo).length;
        return prefix + String(matchingCount + 1).padStart(4, '0');
    };

    const createProducto = async (data) => {
        data.id = generateId();
        if (!data.codigo) {
            data.codigo = getNextProductoCode(data.tipo);
        }
        if (!data.estado) data.estado = 'Activo';
        memoryDb.productos.push(data);
        save();
    };
    const updateProducto = async (id, data) => {
        const index = memoryDb.productos.findIndex(p => p.id === id);
        if (index > -1) {
            memoryDb.productos[index] = { ...memoryDb.productos[index], ...data };
            save();
        }
    };
    const deleteProducto = async (id) => {
        memoryDb.productos = memoryDb.productos.filter(p => p.id !== id);
        save();
    };

    // Proformas
    const getProformasFiltered = (filter) => {
        let res = memoryDb.proformas;
        if (filter.search) {
            const term = filter.search.toLowerCase();
            res = res.filter(p => {
                const cliente = getClienteById(p.clienteId || p.cliente_id);
                const nombreCliente = cliente ? cliente.nombreCliente.toLowerCase() : '';
                return (p.numero && p.numero.toString().includes(filter.search)) ||
                    (p.numero_proforma && p.numero_proforma.toString().includes(filter.search)) ||
                    nombreCliente.includes(term);
            });
        }
        if (filter.clienteId !== 'all') res = res.filter(p => p.clienteId === filter.clienteId || p.cliente_id === filter.clienteId);
        if (filter.estado !== 'all') res = res.filter(p => p.estado === filter.estado);
        return res;
    };
    const getProformasStats = () => {
        const stats = { total: memoryDb.proformas.length, aprobadas: 0, activas: 0, valorAprobado: 0 };
        memoryDb.proformas.forEach(p => {
            if (p.estado === 'Aprobada') { stats.aprobadas++; stats.valorAprobado += parseFloat(p.total || p.subtotal || 0); }
            if (p.estado === 'Activa') stats.activas++;
        });
        return stats;
    };
    const getProformaById = (id) => memoryDb.proformas.find(p => p.proformaId === id || p.codigo_proforma === id);
    const getProformasByRango = (inicio, fin) => {
        return memoryDb.proformas.filter(p => {
            const num = parseInt(p.numero || p.numero_proforma || 0);
            return num >= inicio && num <= fin;
        });
    };
    const createProforma = async (data) => {
        data.proformaId = generateId();
        data.codigo_proforma = data.proformaId;
        const nextNum = memoryDb.proformas.length > 0 ? Math.max(...memoryDb.proformas.map(p => parseInt(p.numero || p.numero_proforma || 0))) + 1 : 1;
        data.numero = nextNum;
        data.numero_proforma = nextNum;
        data.estado = data.estado || 'Activa';

        // Calculate totals since the UI might only pass items
        const items = data.items || [];
        const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
        data.subtotal = subtotal;
        data.total = subtotal; // Assuming no tax right now

        memoryDb.proformas.push(data);
        save();
    };
    const updateProforma = async (id, data) => {
        const index = memoryDb.proformas.findIndex(p => p.proformaId === id || p.codigo_proforma === id);
        if (index > -1) {
            const items = data.items || memoryDb.proformas[index].items || [];
            const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
            data.subtotal = subtotal;
            data.total = subtotal;

            memoryDb.proformas[index] = { ...memoryDb.proformas[index], ...data };
            save();
        }
    };
    const deleteProforma = async (id) => {
        memoryDb.proformas = memoryDb.proformas.filter(p => p.proformaId !== id && p.codigo_proforma !== id);
        save();
    };
    const aprobarProforma = async (id, datosFactura) => {
        const index = memoryDb.proformas.findIndex(p => p.proformaId === id || p.codigo_proforma === id);
        if (index > -1) {
            const proforma = memoryDb.proformas[index];
            proforma.estado = 'Aprobada';

            if (datosFactura) {
                const totalFactura = parseFloat(proforma.total) || 0;
                const montoPagado = parseFloat(datosFactura.montoPagado) || 0;
                const saldoPendiente = Math.max(0, totalFactura - montoPagado);
                const estadoFactura = saldoPendiente > 0.01 ? 'Crédito' : 'Pagada';

                const historialAbonos = [];
                if (montoPagado > 0) {
                    historialAbonos.push({
                        id: generateId(),
                        fecha: new Date().toISOString(),
                        monto: montoPagado,
                        formaPago: datosFactura.formaPago,
                        nota: 'Abono inicial'
                    });
                }

                const facturaData = {
                    facturaId: generateId(),
                    clienteId: proforma.clienteId || proforma.cliente_id,
                    proformaIdRef: proforma.proformaId || proforma.codigo_proforma,
                    fecha: new Date().toISOString(),
                    formaPago: datosFactura.formaPago,
                    moneda: proforma.moneda,
                    subtotal: proforma.subtotal,
                    total: proforma.total,
                    items: JSON.parse(JSON.stringify(proforma.items || [])),
                    numero: memoryDb.facturas.length > 0 ? Math.max(...memoryDb.facturas.map(f => parseInt(f.numero || 0))) + 1 : 1,
                    montoPagado: montoPagado,
                    saldoPendiente: saldoPendiente,
                    plazoCredito: datosFactura.plazoCredito || 0,
                    historialAbonos: historialAbonos,
                    estado: estadoFactura
                };
                memoryDb.facturas.push(facturaData);
            }
            save();
        }
    };

    const addAbonoFactura = async (id, abonoData) => {
        const factura = memoryDb.facturas.find(f => f.facturaId === id);
        if (!factura) throw new Error('Factura no encontrada');
        const monto = parseFloat(abonoData.monto) || 0;
        if (monto <= 0) throw new Error('Monto de abono inválido');
        if (monto > (factura.saldoPendiente + 0.01)) throw new Error('El abono es mayor al saldo pendiente');

        factura.montoPagado = (parseFloat(factura.montoPagado) || 0) + monto;
        factura.saldoPendiente = (parseFloat(factura.saldoPendiente) || 0) - monto;

        if (!factura.historialAbonos) factura.historialAbonos = [];

        factura.historialAbonos.push({
            id: generateId(),
            fecha: new Date().toISOString(),
            monto: monto,
            formaPago: abonoData.formaPago || 'Efectivo',
            nota: abonoData.nota || ''
        });

        if (factura.saldoPendiente <= 0.01) {
            factura.saldoPendiente = 0;
            factura.estado = 'Pagada';
        }

        save();
    };

    // Facturas
    const getFacturasFiltered = (filter) => {
        let res = memoryDb.facturas;
        if (filter.search) {
            const term = filter.search.toLowerCase();
            res = res.filter(f => {
                const cliente = getClienteById(f.clienteId);
                const nombreCliente = cliente ? cliente.nombreCliente.toLowerCase() : '';
                return (f.numero && f.numero.toString().includes(filter.search)) ||
                    nombreCliente.includes(term);
            });
        }
        if (filter.clienteId !== 'all') res = res.filter(f => f.clienteId === filter.clienteId);
        if (filter.estado !== 'all') res = res.filter(f => f.estado === filter.estado);
        return res;
    };
    const getFacturaById = (id) => memoryDb.facturas.find(f => f.facturaId === id);
    const deleteFactura = async (id) => {
        memoryDb.facturas = memoryDb.facturas.filter(f => f.facturaId !== id);
        save();
    };
    const getFacturasStats = () => {
        const stats = { total: memoryDb.facturas.length, valorTotal: 0, saldoPendienteTotal: 0 };
        memoryDb.facturas.forEach(f => {
            stats.valorTotal += parseFloat(f.total || 0);
            stats.saldoPendienteTotal += parseFloat(f.saldoPendiente || 0);
        });
        return stats;
    };

    const getConfig = () => {
        const stored = localStorage.getItem('guevara_config');
        return stored ? JSON.parse(stored) : { tipoCambio: 36.6, theme: 'dark' };
    };

    const updateConfig = (newConfig) => {
        const current = getConfig();
        const updated = { ...current, ...newConfig };
        localStorage.setItem('guevara_config', JSON.stringify(updated));
        return updated;
    };

    const canPerformAction = (role, module, action) => true;

    return {
        init,
        getClientesFiltered, getClientesSync, getClienteById, createCliente, updateCliente, deleteCliente,
        getProformasByCliente, getFacturasByCliente,
        getProductosFiltered, getProductosSync, getProductoById, getNextProductoCode, createProducto, updateProducto, deleteProducto,
        getProformasFiltered, getProformasStats, getProformaById, getProformasByRango, createProforma, updateProforma, deleteProforma, aprobarProforma,
        getFacturasFiltered, getFacturaById, deleteFactura, getFacturasStats, addAbonoFactura,
        getConfig, updateConfig, canPerformAction
    };
})();
