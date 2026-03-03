/**
 * ALLTECH - Facturas Module
 * Invoice management and PDF generation
 */

const FacturasModule = (() => {
  let filterState = { search: '', clienteId: 'all', estado: 'all' };
  let currentItems = [];
  let currentFormCurrency = 'USD';

  // ========== RENDER FUNCTIONS ==========

  const render = () => {
    const facturas = DataService.getFacturasFiltered(filterState);
    const clientes = DataService.getClientesSync();

    return `
      <div class="module-container">
        <div class="module-header">
          <div class="module-header__left">
            <h2 class="module-title">Facturas</h2>
            <p class="module-subtitle">${facturas.length} facturas registradas</p>
          </div>
          <div class="module-header__right" style="display: flex; gap: 10px;">
            <button class="btn btn--secondary" onclick="FacturasModule.generateReporteCreadas()">
              ${Icons.barChart} Reporte Creadas
            </button>
            <button class="btn btn--secondary" onclick="FacturasModule.generateReportePagos()">
              ${Icons.barChart} Reporte Abonos
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="module-stats">
          ${renderStats()}
        </div>

        <!-- Filters -->
        <div class="module-filters card">
          <div class="card__body">
            <div class="filters-row">
              <div class="search-input" style="flex: 1; max-width: 300px;">
                <span class="search-input__icon">${Icons.search}</span>
                <input type="text" class="form-input" placeholder="Buscar por número..." 
                       value="${filterState.search}"
                       onkeyup="FacturasModule.handleSearch(this.value)">
              </div>
              <select class="form-select" style="width: 250px;" 
                      onchange="FacturasModule.handleClienteFilter(this.value)">
                <option value="all">Todos los clientes</option>
                ${clientes.map(c => `
                  <option value="${c.id}" ${filterState.clienteId === c.id ? 'selected' : ''}>
                    ${c.nombreCliente}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!--Facturas Table-->
  <div class="card">
    <div class="card__body" style="padding: 0;">
      ${facturas.length > 0 ? renderTable(facturas) : renderEmptyState()}
    </div>
  </div>
      </div>
  <div id="facturaModal"></div>
`;
  };

  const renderStats = () => {
    const stats = DataService.getFacturasStats();
    return `
  <div class="stat-card stat-card--success">
        <div class="stat-card__icon">${Icons.checkCircle}</div>
        <span class="stat-card__label">Total Facturas</span>
        <span class="stat-card__value">${stats.total}</span>
      </div>
      <div class="stat-card stat-card--primary">
        <div class="stat-card__icon">${Icons.wallet}</div>
        <span class="stat-card__label">Valor Total Facturado</span>
        <span class="stat-card__value">$${stats.valorTotal.toFixed(2)}</span>
      </div>
      <div class="stat-card stat-card--warning">
        <div class="stat-card__icon">${Icons.alertCircle || Icons.alertCircle}</div>
        <span class="stat-card__label">Saldo Pendiente a Cobrar</span>
        <span class="stat-card__value text-warning">$${(stats.saldoPendienteTotal || 0).toFixed(2)}</span>
      </div>
`;
  };

  const renderTable = (facturas) => {
    const user = State.get('user');
    const canDelete = DataService.canPerformAction(user.role, 'facturas', 'delete');

    return `
  <table class="data-table">
        <thead class="data-table__head">
          <tr>
            <th>Nº Factura</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Forma de Pago</th>
            <th>Total</th>
            <th>Saldo Pend.</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody class="data-table__body">
          ${facturas.map(factura => {
      const cliente = DataService.getClienteById(factura.clienteId);
      const totalValue = parseFloat(factura.total) || 0;
      return `
              <tr>
                <td data-label="Nº Factura"><span class="font-medium">FAC-${String(factura.numero).padStart(4, '0')}</span></td>
                <td data-label="Cliente">
                  <div class="font-medium">${cliente?.nombreCliente || 'N/A'}</div>
                </td>
                <td data-label="Fecha">
                  <div>${factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-NI') : '-'}</div>
                </td>
                <td data-label="Forma de Pago">
                  <span class="badge badge--info">${factura.formaPago}</span>
                </td>
                <td data-label="Total">
                  <span class="font-medium">${factura.moneda === 'USD' ? '$' : 'C$'}${totalValue.toFixed(2)}</span>
                </td>
                <td data-label="Saldo Pend.">
                  <span class="font-medium text-danger">${factura.moneda === 'USD' ? '$' : 'C$'}${(parseFloat(factura.saldoPendiente) || 0).toFixed(2)}</span>
                </td>
                <td data-label="Estado">
                  <span class="badge ${factura.estado === 'Crédito' ? 'badge--warning' : 'badge--success'}">${factura.estado}</span>
                </td>
                <td data-label="Acciones">
                  <div class="flex gap-xs">
                    <button class="btn btn--ghost btn--icon btn--sm" onclick="FacturasModule.viewDetail('${factura.facturaId}')" title="Ver Detalle">
                      ${Icons.eye}
                    </button>
                    ${factura.estado === 'Crédito' ? `
                      <button class="btn btn--ghost btn--icon btn--sm text-success" onclick="FacturasModule.openAbonoModal('${factura.facturaId}')" title="Aplicar Abono">
                        ${Icons.wallet}
                      </button>
                    ` : ''}

                    <button class="btn btn--ghost btn--icon btn--sm" onclick="FacturasModule.generatePDF('${factura.facturaId}')" title="Imprimir PDF">
                      ${Icons.fileText}
                    </button>
                    ${canDelete ? `
                      <button class="btn btn--ghost btn--icon btn--sm text-danger" onclick="FacturasModule.deleteFactura('${factura.facturaId}')" title="Eliminar">
                        ${Icons.trash}
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
  `;
  };

  const renderEmptyState = () => {
    return `
  <div class="empty-state">
        <div class="empty-state__icon">${Icons.fileText}</div>
        <h3 class="empty-state__title">No hay facturas</h3>
        <p class="empty-state__description">Aprueba proformas para generar facturas automáticamente.</p>
        <button class="btn btn--primary" onclick="App.navigate('proformas')">
          Ir a Proformas
        </button>
      </div>
  `;
  };

  const renderDetailModal = (factura) => {
    const cliente = DataService.getClienteById(factura.clienteId);
    const subtotalValue = parseFloat(factura.subtotal) || 0;
    const totalValue = parseFloat(factura.total) || 0;

    return `
  <div class="modal-overlay open">
    <div class="modal modal--lg" onclick="event.stopPropagation()">
      <div class="modal__header">
        <div>
          <h3 class="modal__title">Factura FAC-${String(factura.numero).padStart(4, '0')}</h3>
          <p class="text-sm text-muted">ID: ${factura.facturaId}</p>
        </div>
        <button class="modal__close" onclick="FacturasModule.closeModal()">${Icons.x}</button>
      </div>
      <div class="modal__body">
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-item__label">Cliente</div>
            <div class="detail-item__value">${cliente?.nombreCliente || 'N/A'}</div>
          </div>

          <div class="detail-item">
            <div class="detail-item__label">Fecha</div>
            <div class="detail-item__value">${new Date(factura.fecha).toLocaleString('es-NI')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item__label">Forma de Pago</div>
            <div class="detail-item__value"><span class="badge badge--info">${factura.formaPago}</span></div>
          </div>
          <div class="detail-item">
            <div class="detail-item__label">Estado</div>
            <div class="detail-item__value">
              <span class="badge ${factura.estado === 'Crédito' ? 'badge--warning' : 'badge--success'}">${factura.estado}</span>
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-item__label">Saldo Pendiente</div>
            <div class="detail-item__value font-medium text-danger">${factura.moneda === 'USD' ? '$' : 'C$'}${(parseFloat(factura.saldoPendiente) || 0).toFixed(2)}</div>
          </div>
        </div>

        <div style="margin-top: var(--spacing-lg);">
          <h4 style="margin-bottom: var(--spacing-sm); color: var(--text-primary);">Detalle de Items</h4>
          <table class="data-table">
            <thead class="data-table__head">
              <tr>
                <th>Cantidad</th>
                <th>Descripción</th>
                <th>P. Unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody class="data-table__body">
              ${factura.items.map(item => `
                    <tr>
                      <td>${item.cantidad}</td>
                      <td>${item.descripcion}</td>
                      <td>${factura.moneda === 'USD' ? '$' : 'C$'}${(parseFloat(item.precioUnitario || item.precio_unitario) || 0).toFixed(2)}</td>
                      <td class="font-medium">${factura.moneda === 'USD' ? '$' : 'C$'}${(parseFloat(item.total) || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
            </tbody>
          </table>
        </div>

        <div class="proforma-totals" style="margin-top: var(--spacing-md);">
          <div class="proforma-totals__row">
            <span>Subtotal:</span>
            <span>${factura.moneda === 'USD' ? '$' : 'C$'}${subtotalValue.toFixed(2)}</span>
          </div>
          <div class="proforma-totals__row proforma-totals__row--total">
            <span>Total:</span>
            <span>${factura.moneda === 'USD' ? '$' : 'C$'}${totalValue.toFixed(2)}</span>
          </div>
        </div>

        ${(factura.historialAbonos && factura.historialAbonos.length > 0) ? `
             <div style="margin-top: var(--spacing-lg);">
              <h4 style="margin-bottom: var(--spacing-sm); color: var(--text-primary);">Historial de Abonos</h4>
              <table class="data-table">
                <thead class="data-table__head">
                  <tr>
                    <th>Fecha</th>
                    <th>Forma</th>
                    <th>Nota</th>
                    <th>Monto</th>
                    <th>Comprobante</th>
                  </tr>
                </thead>
                <tbody class="data-table__body">
                  ${factura.historialAbonos.map((abono, idx) => `
                    <tr>
                      <td>${new Date(abono.fecha).toLocaleString('es-NI')}</td>
                      <td>${abono.formaPago}</td>
                      <td>${abono.nota || '-'}</td>
                      <td class="font-medium text-success">+${factura.moneda === 'USD' ? '$' : 'C$'}${(parseFloat(abono.monto) || 0).toFixed(2)}</td>
                      <td>
                        <button class="btn btn--ghost btn--icon btn--sm" onclick="FacturasModule.generateComprobantePDF('${factura.facturaId}', ${idx})" title="Imprimir Comprobante">
                          ${Icons.fileText}
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" onclick="FacturasModule.closeModal()">Cerrar</button>
        <button class="btn btn--primary" onclick="FacturasModule.generatePDF('${factura.facturaId}')">${Icons.fileText} Imprimir / PDF</button>
      </div>
    </div>
      </div>
  `;
  };

  // ========== PDF GENERATION ==========

  const generatePDF = (facturaId) => {
    const factura = DataService.getFacturaById(facturaId);
    if (!factura) return;

    const cliente = DataService.getClienteById(factura.clienteId);
    const simbolo = factura.moneda === 'USD' ? '$' : 'C$';
    const subtotalValue = parseFloat(factura.subtotal) || 0;
    const totalValue = parseFloat(factura.total) || 0;

    const companyConfig = State.get('companyConfig') || { name: "GUEVARA'S CABINET", logoUrl: '' };
    const content = `
  <div class="header">
        <div class="company-info">
          ${companyConfig.logoUrl ? `<img src="${companyConfig.logoUrl}" alt="Logo" style="max-height: 85px; margin-bottom: 5px;">` : ''}
          <h1>${companyConfig.name}</h1>
          <p>Factura Original</p>
          <p>Cel: 8655-0650</p>
        </div>
        <div class="proforma-info">
          <h2>FACTURA</h2>
          <p><strong>Nº:</strong> FAC-${String(factura.numero).padStart(4, '0')}</p>
          <p><strong>Fecha:</strong> ${new Date(factura.fecha).toLocaleDateString('es-NI')}</p>
          <p><strong>Forma de Pago:</strong> ${factura.formaPago}</p>
        </div>
      </div>

  <div class="section">
    <div class="section-title">Facturado a</div>
        <div class="client-info">
          <p><strong>${cliente?.nombreCliente || 'N/A'}</strong></p>
          <p>${cliente?.direccion || ''}</p>
    <p>Tel: ${cliente?.telefono || ''}</p>
  </div>
      </div>

      <div class="section">
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">Cant.</th>
              <th>Descripción</th>
              <th style="width: 100px;">P. Unitario</th>
              <th style="width: 100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${factura.items.map(item => `
              <tr>
                <td style="text-align: center;">${item.cantidad}</td>
                <td>${item.descripcion}</td>
                <td style="text-align: right;">${simbolo}${(parseFloat(item.precioUnitario || item.precio_unitario) || 0).toFixed(2)}</td>
                <td style="text-align: right;">${simbolo}${(parseFloat(item.total) || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>${simbolo}${subtotalValue.toFixed(2)}</span>
        </div>
        <div class="totals-row totals-row--total">
          <span>TOTAL PAGADO:</span>
          <span>${simbolo}${totalValue.toFixed(2)}</span>
        </div>
      </div>

      <div class="validity-notice" style="background: transparent; border:none; text-align: center; margin-top: 80px;">
        <p>___________________________________</p>
        <p style="margin-top: 5px;">Firma de Recibido / Cancelado</p>
        <p style="margin-top: 20px;">¡Gracias por su compra en ${companyConfig.name}!</p>
      </div>
`;

    window.exportAndSharePDF(`Factura_FAC - ${factura.numero} `, content);
  };

  const generateReporteCreadas = () => {
    const facturas = DataService.getFacturasFiltered(filterState);
    const companyConfig = State.get('companyConfig') || { name: "GUEVARA'S CABINET", logoUrl: '' };

    let totalFacturadoUSD = 0;
    let totalFacturadoNIO = 0;

    const rows = facturas.map(f => {
      const cliente = DataService.getClienteById(f.clienteId);
      const val = parseFloat(f.total) || 0;
      if (f.moneda === 'USD') totalFacturadoUSD += val; else totalFacturadoNIO += val;

      return `
  <tr>
          <td>FAC-${String(f.numero).padStart(4, '0')}</td>
          <td>${new Date(f.fecha).toLocaleDateString('es-NI')}</td>
          <td>${cliente?.nombreCliente || 'N/A'}</td>
          <td>${f.estado}</td>
          <td style="text-align: right;">${f.moneda === 'USD' ? '$' : 'C$'}${val.toFixed(2)}</td>
        </tr>
  `;
    }).join('');

    const content = `
  <div class="header">
    <div class="company-info" style="text-align: center;">
      ${companyConfig.logoUrl ? `<img src="${companyConfig.logoUrl}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
      <h2>${companyConfig.name}</h2>
      <h3>Reporte de Facturas Creadas</h3>
      <p>Generado: ${new Date().toLocaleString('es-NI')}</p>
    </div>
      </div>
      <div class="section">
        <table>
          <thead>
            <tr>
              <th>Nº Factura</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;">No hay facturas creadas</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="totals" style="margin-top: 30px; border-top: 2px solid #ccc; padding-top: 10px; text-align: right;">
        <p><strong>Total Facturado (USD):</strong> $${totalFacturadoUSD.toFixed(2)}</p>
        <p><strong>Total Facturado (NIO):</strong> C$${totalFacturadoNIO.toFixed(2)}</p>
      </div>
`;

    window.exportAndSharePDF('Reporte_Facturas_Creadas', content);
  };

  const generateReportePagos = () => {
    const facturas = DataService.getFacturasFiltered(filterState);
    const companyConfig = State.get('companyConfig') || { name: "GUEVARA'S CABINET", logoUrl: '' };

    let totalPagosUSD = 0;
    let totalPagosNIO = 0;

    // Extraer todos los abonos
    const abonosList = [];
    facturas.forEach(f => {
      if (f.historialAbonos && f.historialAbonos.length > 0) {
        f.historialAbonos.forEach(abono => {
          abonosList.push({
            ...abono,
            facturaNumero: f.numero,
            clienteId: f.clienteId,
            moneda: f.moneda
          });
        });
      }
    });

    // Sort abonos by date descending
    abonosList.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const rows = abonosList.map(abono => {
      const cliente = DataService.getClienteById(abono.clienteId);
      const val = parseFloat(abono.monto) || 0;
      if (abono.moneda === 'USD') totalPagosUSD += val; else totalPagosNIO += val;

      return `
  <tr>
          <td>${new Date(abono.fecha).toLocaleString('es-NI')}</td>
          <td>FAC-${String(abono.facturaNumero).padStart(4, '0')}</td>
          <td>${cliente?.nombreCliente || 'N/A'}</td>
          <td>${abono.formaPago}</td>
          <td style="text-align: right;">${abono.moneda === 'USD' ? '$' : 'C$'}${val.toFixed(2)}</td>
        </tr>
  `;
    }).join('');

    const content = `
  <div class="header">
    <div class="company-info" style="text-align: center;">
      ${companyConfig.logoUrl ? `<img src="${companyConfig.logoUrl}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
      <h2>${companyConfig.name}</h2>
      <h3>Reporte de Abonos Realizados</h3>
      <p>Generado: ${new Date().toLocaleString('es-NI')}</p>
    </div>
      </div>
      <div class="section">
        <table>
          <thead>
            <tr>
              <th>Fecha del Pago</th>
              <th>Nº Factura</th>
              <th>Cliente</th>
              <th>Forma Pago</th>
              <th style="text-align: right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;">No hay pagos registrados</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="totals" style="margin-top: 30px; border-top: 2px solid #ccc; padding-top: 10px; text-align: right;">
        <p><strong>Total Recaudado (USD):</strong> $${totalPagosUSD.toFixed(2)}</p>
        <p><strong>Total Recaudado (NIO):</strong> C$${totalPagosNIO.toFixed(2)}</p>
      </div>
`;

    window.exportAndSharePDF('Reporte_Pagos_Abonos', content);
  };

  // ========== EVENT HANDLERS ==========

  const handleSearch = (value) => { filterState.search = value; App.refreshCurrentModule(); };
  const handleClienteFilter = (value) => { filterState.clienteId = value; App.refreshCurrentModule(); };

  const deleteFactura = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta factura?')) {
      try {
        await DataService.deleteFactura(id);
        App.refreshCurrentModule();
        App.showNotification?.('Factura eliminada', 'success');
      } catch (error) {
        alert('Error al eliminar: ' + error.message);
      }
    }
  };

  const viewDetail = (id) => {
    const factura = DataService.getFacturaById(id);
    if (factura) document.getElementById('facturaModal').innerHTML = renderDetailModal(factura);
  };

  const openAbonoModal = (facturaId) => {
    const factura = DataService.getFacturaById(facturaId);
    if (!factura) return;
    const divisa = factura.moneda === 'USD' ? '$' : 'C$';
    const maxAbono = parseFloat(factura.saldoPendiente) || 0;

    const content = `
  <div class="modal-overlay open">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal__header">
        <h3 class="modal__title">${Icons.wallet} Aplicar Abono a FAC-${String(factura.numero).padStart(4, '0')}</h3>
        <button class="modal__close" onclick="FacturasModule.closeModal()">${Icons.x}</button>
      </div>
      <div class="modal__body">
        <div class="alert alert--info" style="margin-bottom: var(--spacing-md); padding: 10px; background: rgba(14,165,233,0.1); border-radius: 8px;">
          Saldo Pendiente: <strong>${divisa}${maxAbono.toFixed(2)}</strong>
        </div>

        <div class="form-group">
          <label class="form-label form-label--required">Monto a Abonar (${divisa})</label>
          <input type="number" id="abonoMontoInput" class="form-input" value="${maxAbono.toFixed(2)}" step="0.01" min="0.01" max="${maxAbono}">
        </div>

        <div class="form-group">
          <label class="form-label form-label--required">Forma de Pago</label>
          <select id="abonoFormaPagoSelect" class="form-select">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia Bancaria</option>
            <option value="Tarjeta">Tarjeta (Crédito/Débito)</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nota o Referencia</label>
          <input type="text" id="abonoNotaInput" class="form-input" placeholder="Opcional. Ej. Depósito Ref 123">
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" onclick="FacturasModule.closeModal()">Cancelar</button>
        <button class="btn btn--success" onclick="FacturasModule.submitAbono('${facturaId}')">Registrar Abono</button>
      </div>
    </div>
          </div>
  `;
    document.getElementById('facturaModal').innerHTML = content;
  };

  const submitAbono = async (facturaId) => {
    const monto = parseFloat(document.getElementById('abonoMontoInput').value) || 0;
    const formaPago = document.getElementById('abonoFormaPagoSelect').value;
    const nota = document.getElementById('abonoNotaInput').value;

    try {
      await DataService.addAbonoFactura(facturaId, { monto, formaPago, nota });
      App.refreshCurrentModule();
      closeModal();
      App.showNotification?.('Abono registrado correctamente', 'success');
    } catch (error) {
      alert('Error al aplicar abono: ' + error.message);
    }
  };

  const renderItemsEditor = () => {
    const symbol = currentFormCurrency === 'USD' ? '$' : 'C$';
    return currentItems.map((item, index) => `
  <div class="proforma-item" data-index="${index}">
        <div class="proforma-item__row">
          <input type="number" class="form-input proforma-item__qty" 
                 value="${item.cantidad}" min="1" step="1"
                 placeholder="Cant."
                 onchange="FacturasModule.updateItem(${index}, 'cantidad', this.value)">
          <input type="text" class="form-input proforma-item__desc" 
                 value="${item.descripcion}" 
                 placeholder="Descripción del producto o servicio"
                 onchange="FacturasModule.updateItem(${index}, 'descripcion', this.value)">
          <input type="number" class="form-input proforma-item__price" 
                 value="${item.precioUnitario || item.precio_unitario || 0}" min="0" step="0.01"
                 placeholder="Precio Unit."
                 onchange="FacturasModule.updateItem(${index}, 'precioUnitario', this.value)">
          <span class="proforma-item__total">${symbol}${(parseFloat(item.total) || 0).toFixed(2)}</span>
          ${currentItems.length > 1 ? `
            <button type="button" class="btn btn--ghost btn--icon btn--sm text-danger" onclick="FacturasModule.removeItem(${index})">
              ${Icons.trash}
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  };

  const addItem = () => {
    currentItems.push({ cantidad: 1, descripcion: '', precioUnitario: 0, total: 0 });
    document.getElementById('facturaItemsEditor').innerHTML = renderItemsEditor();
  };

  const removeItem = (index) => {
    if (currentItems.length > 1) {
      currentItems.splice(index, 1);
      document.getElementById('facturaItemsEditor').innerHTML = renderItemsEditor();
      calculateTotals();
    }
  };

  const updateItem = (index, field, value) => {
    if (field === 'cantidad' || field === 'precioUnitario') {
      currentItems[index][field] = parseFloat(value) || 0;
      let pV = currentItems[index].precioUnitario;
      if (pV === undefined) pV = currentItems[index].precio_unitario || 0;
      currentItems[index].total = currentItems[index].cantidad * pV;
    } else {
      currentItems[index][field] = value;
    }
    document.getElementById('facturaItemsEditor').innerHTML = renderItemsEditor();
    calculateTotals();
  };

  const calculateTotals = () => {
    const symbol = currentFormCurrency === 'USD' ? '$' : 'C$';
    const subtotal = currentItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    document.getElementById('facturaSubtotal').textContent = `${symbol}${subtotal.toFixed(2)}`;
    document.getElementById('facturaTotal').textContent = `${symbol}${subtotal.toFixed(2)}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    const subtotal = currentItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    // Preparar objeto para actualización
    const facturaUpdate = {
      clienteId: data.clienteId,
      fecha: data.fecha,
      formaPago: data.formaPago,
      estado: data.estado,
      items: currentItems,
      subtotal: subtotal,
      total: subtotal
    };

    try {
      if (data.facturaId) {
        await DataService.updateFactura(data.facturaId, facturaUpdate);
        if (App && App.showNotification) App.showNotification('Factura actualizada correctamente', 'success');
      }
      closeModal();
      if (App && App.refreshCurrentModule) App.refreshCurrentModule();
    } catch (err) {
      alert('Error updating factura: ' + err.message);
    }
  };

  const generateComprobantePDF = (facturaId, abonoIndex) => {
    const factura = DataService.getFacturaById(facturaId);
    if (!factura || !factura.historialAbonos || !factura.historialAbonos[abonoIndex]) return;

    const abono = factura.historialAbonos[abonoIndex];
    const cliente = DataService.getClienteById(factura.clienteId);
    const simbolo = factura.moneda === 'USD' ? '$' : 'C$';
    const companyConfig = State.get('companyConfig') || { name: "GUEVARA'S CABINET", logoUrl: '' };

    const content = `
      <div class="header">
        <div class="company-info">
          ${companyConfig.logoUrl ? `<img src="${companyConfig.logoUrl}" alt="Logo" style="max-height: 85px; margin-bottom: 5px;">` : ''}
          <h1>${companyConfig.name}</h1>
          <p>Comprobante de Pago</p>
          <p>Cel: 8655-0650</p>
        </div>
        <div class="proforma-info">
          <h2>RECIBO</h2>
          <p><strong>Factura Nº:</strong> FAC-${String(factura.numero).padStart(4, '0')}</p>
          <p><strong>Fecha Pago:</strong> ${new Date(abono.fecha).toLocaleDateString('es-NI')}</p>
          <p><strong>Forma de Pago:</strong> ${abono.formaPago}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Recibí de:</div>
        <div class="client-info">
          <p><strong>${cliente?.nombreCliente || 'N/A'}</strong></p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Detalle del Abono</div>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th style="width: 150px; text-align: right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Abono a factura FAC-${String(factura.numero).padStart(4, '0')} ${abono.nota ? '(' + abono.nota + ')' : ''}</td>
              <td style="text-align: right;">${simbolo}${(parseFloat(abono.monto) || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="totals-row totals-row--total">
          <span>TOTAL RECIBIDO:</span>
          <span>${simbolo}${(parseFloat(abono.monto) || 0).toFixed(2)}</span>
        </div>
        <div class="totals-row">
          <span>Saldo Restante:</span>
          <span>${simbolo}${(parseFloat(factura.saldoPendiente) || 0).toFixed(2)}</span>
        </div>
      </div>

      <div class="validity-notice" style="background: transparent; border:none; text-align: center; margin-top: 80px;">
        <p>___________________________________</p>
        <p style="margin-top: 5px;">Firma de Recibido</p>
        <p style="margin-top: 20px;">¡Gracias por su pago!</p>
      </div>
`;

    window.exportAndSharePDF(`Comprobante_FAC - ${factura.numero}_${new Date(abono.fecha).getTime()} `, content);
  };

  const closeModal = (event) => {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('facturaModal').innerHTML = '';
  };

  // ========== PUBLIC API ==========
  return {
    render,
    viewDetail,
    openAbonoModal,
    submitAbono,
    closeModal,
    handleSearch,
    handleClienteFilter,
    deleteFactura,
    generatePDF,
    generateReporteCreadas,
    generateReportePagos,
    
    handleSubmit,
    addItem,
    removeItem,
    updateItem,
    generateComprobantePDF
  };
})();
