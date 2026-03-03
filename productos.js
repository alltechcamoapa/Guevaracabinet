/**
 * ALLTECH - Products / Services Module
 * Management of catalog for proformas and other uses
 */

const ProductosModule = (() => {
  let filterState = { search: '', tipo: 'all', estado: 'all' };

  // ========== RENDER FUNCTIONS ==========

  const render = () => {
    const productos = DataService.getProductosFiltered(filterState);
    const user = State.get('user');
    const canCreate = DataService.canPerformAction(user.role, 'productos', 'create');

    return `
      <div class="module-container">
        <div class="module-header">
          <div class="module-header__left">
            <h2 class="module-title">Productos y Servicios</h2>
            <p class="module-subtitle">${productos.length} items registrados</p>
          </div>
          <div class="module-header__right">
            ${canCreate ? `
            <button class="btn btn--primary" onclick="ProductosModule.openCreateModal()">
              ${Icons.plus} Nuevo Item
            </button>
            ` : ''}
          </div>
        </div>

        <!-- Filters -->
        <div class="module-filters card">
          <div class="card__body">
            <div class="filters-row">
              <div class="search-input" style="flex: 1; max-width: 400px;">
                <span class="search-input__icon">${Icons.search}</span>
                <input type="text" class="form-input" placeholder="Buscar por nombre, código o descripción..." 
                       value="${filterState.search}"
                       onkeyup="ProductosModule.handleSearch(this.value)">
              </div>
              <select class="form-select" style="width: 150px;" 
                      onchange="ProductosModule.handleTipoFilter(this.value)">
                <option value="all">Tipos (Todos)</option>
                <option value="Producto" ${filterState.tipo === 'Producto' ? 'selected' : ''}>Producto</option>
                <option value="Servicio" ${filterState.tipo === 'Servicio' ? 'selected' : ''}>Servicio</option>
              </select>
              <select class="form-select" style="width: 150px;" 
                      onchange="ProductosModule.handleEstadoFilter(this.value)">
                <option value="all">Estados (Todos)</option>
                <option value="Activo" ${filterState.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                <option value="Inactivo" ${filterState.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Products Table -->
        <div class="card">
          <div class="card__body" style="padding: 0;">
            ${productos.length > 0 ? renderTable(productos) : renderEmptyState()}
          </div>
        </div>
      </div>
      <div id="productosModal"></div>
    `;
  };

  const renderTable = (productos) => {
    const user = State.get('user');
    const canUpdate = DataService.canPerformAction(user.role, 'productos', 'update');
    const canDelete = DataService.canPerformAction(user.role, 'productos', 'delete');

    return `
      <table class="data-table">
        <thead class="data-table__head">
          <tr>
            <th>Código</th>
            <th>Nombre / Descripción</th>
            <th>Moneda</th>
            <th>Tipo</th>
            <th>Precio Unit.</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody class="data-table__body">
          ${productos.map(p => `
            <tr>
              <td data-label="Código"><span class="font-medium">${p.codigo}</span></td>
              <td data-label="Nombre / Descripción">
                <div class="font-medium">${p.nombre}</div>
                <div class="text-xs text-muted">${p.descripcion || ''}</div>
              </td>
              <td data-label="Moneda">${p.moneda === 'NIO' ? 'Córdobas (C$)' : 'Dólares ($)'}</td>
              <td data-label="Tipo">
                <span class="badge ${p.tipo === 'Servicio' ? 'badge--info' : 'badge--primary'}">${p.tipo}</span>
              </td>
              <td data-label="Precio Unit." class="font-medium">${p.moneda === 'NIO' ? 'C$' : '$'}${parseFloat(p.precio_venta || p.precio || 0).toFixed(2)}</td>
              <td data-label="Estado">
                <span class="badge ${p.estado === 'Activo' ? 'badge--success' : 'badge--warning'}">
                  ${p.estado}
                </span>
              </td>
              <td data-label="Acciones">
                <div class="flex gap-xs">
                  ${canUpdate ? `
                  <button class="btn btn--ghost btn--icon btn--sm" onclick="ProductosModule.openEditModal('${p.id}')" title="Editar">
                    ${Icons.edit}
                  </button>
                  ` : ''}
                  ${canDelete ? `
                  <button class="btn btn--ghost btn--icon btn--sm text-danger" onclick="ProductosModule.deleteItem('${p.id}')" title="Eliminar">
                    ${Icons.trash}
                  </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const renderEmptyState = () => {
    const user = State.get('user');
    const canCreate = DataService.canPerformAction(user.role, 'productos', 'create');

    return `
      <div class="empty-state">
        <div class="empty-state__icon">${Icons.package}</div>
        <h3 class="empty-state__title">No hay productos ni servicios</h3>
        <p class="empty-state__description">Comienza agregando items al catálogo para usarlos en proformas.</p>
        ${canCreate ? `
        <button class="btn btn--primary" onclick="ProductosModule.openCreateModal()">
          ${Icons.plus} Nuevo Item
        </button>
        ` : ''}
      </div>
    `;
  };

  // ========== FORM MODAL ==========

  const handleTipoChange = (tipoStr) => {
    // Only update if adding new
    const codigoInput = document.getElementById('codigoInput');
    if (codigoInput && !codigoInput.hasAttribute('data-isedit')) {
      codigoInput.value = DataService.getNextProductoCode(tipoStr);
    }
  };

  const renderFormModal = (producto = null) => {
    const isEdit = producto !== null;
    const defaultTipo = producto?.tipo || 'Producto';
    const codigoActual = producto?.codigo || DataService.getNextProductoCode(defaultTipo);

    return `
      <div class="modal-overlay open">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">${isEdit ? 'Editar Item' : 'Nuevo Producto / Servicio'}</h3>
            <button class="modal__close" onclick="ProductosModule.closeModal()">${Icons.x}</button>
          </div>
          <form class="modal__body" onsubmit="ProductosModule.handleSubmit(event)">
            <input type="hidden" name="id" value="${producto?.id || ''}">
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label form-label--required">Tipo</label>
                <select name="tipo" class="form-select" required onchange="ProductosModule.handleTipoChange(this.value)">
                  <option value="Producto" ${defaultTipo === 'Producto' ? 'selected' : ''}>Producto</option>
                  <option value="Servicio" ${defaultTipo === 'Servicio' ? 'selected' : ''}>Servicio</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label form-label--required">Código</label>
                <input type="text" name="codigo" id="codigoInput" class="form-input" 
                       value="${codigoActual}" ${isEdit ? 'data-isedit="true" readonly' : ''} required>
              </div>
            </div>

            <div class="form-group">
                <label class="form-label form-label--required">Nombre</label>
                <input type="text" name="nombre" class="form-input" 
                       value="${producto?.nombre || ''}" required placeholder="Nombre corto del item">
            </div>

            <div class="form-group">
              <label class="form-label">Descripción Detallada</label>
              <textarea name="descripcion" class="form-textarea" rows="2" 
                        placeholder="Detalles técnicos o descripción extendida...">${producto?.descripcion || ''}</textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label form-label--required">Moneda</label>
                <select name="moneda" class="form-select" required>
                  <option value="USD" ${producto?.moneda === 'USD' ? 'selected' : (!producto ? 'selected' : '')}>Dólares ($)</option>
                  <option value="NIO" ${producto?.moneda === 'NIO' ? 'selected' : ''}>Córdobas (C$)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label form-label--required">Precio Unitario</label>
                <input type="number" name="precio" class="form-input" 
                       value="${producto?.precio_venta || producto?.precio || 0}" min="0" step="0.01" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Estado</label>
              <select name="estado" class="form-select">
                <option value="Activo" ${producto?.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                <option value="Inactivo" ${producto?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
              </select>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn--secondary" onclick="ProductosModule.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn--primary">${isEdit ? 'Guardar Cambios' : 'Crear'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  };

  // ========== EVENT HANDLERS ==========

  const handleSearch = (value) => { filterState.search = value; App.refreshCurrentModule(); };
  const handleTipoFilter = (value) => { filterState.tipo = value; App.refreshCurrentModule(); };
  const handleEstadoFilter = (value) => { filterState.estado = value; App.refreshCurrentModule(); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Convert numbers
    data.precio = parseFloat(data.precio);

    try {
      if (data.id) {
        await DataService.updateProducto(data.id, data);
        App.showNotification?.('Producto actualizado correctamente', 'success');
      } else {
        await DataService.createProducto(data);
        App.showNotification?.('Producto creado correctamente', 'success');
      }
      closeModal();
      App.refreshCurrentModule();
    } catch (e) {
      console.error(e);
      App.showNotification?.('Error al guardar: ' + e.message, 'error') || alert('Error: ' + e.message);
    }
  };

  const deleteItem = async (id) => {
    if (confirm('¿Estás seguro de eliminar este item?')) {
      try {
        await DataService.deleteProducto(id);
        App.showNotification?.('Producto eliminado', 'success');
        App.refreshCurrentModule();
      } catch (e) {
        console.error(e);
        App.showNotification?.('Error al eliminar: ' + e.message, 'error') || alert('Error: ' + e.message);
      }
    }
  };

  const openCreateModal = () => {
    document.getElementById('productosModal').innerHTML = renderFormModal();
  };

  const openEditModal = (id) => {
    const producto = DataService.getProductoById(id);
    if (producto) {
      document.getElementById('productosModal').innerHTML = renderFormModal(producto);
    }
  };

  const closeModal = (event) => {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('productosModal').innerHTML = '';
  };

  // ========== PUBLIC API ==========
  return {
    render,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSearch,
    handleTipoFilter,
    handleEstadoFilter,
    handleTipoChange,
    handleSubmit,
    deleteItem
  };
})();
