/**
 * ALLTECH - Configuracion Module
 * Settings for Theme and Exchange Rate
 */

const ConfiguracionModule = (() => {
  // ========== RENDER FUNCTIONS ==========

  const render = () => {
    const config = DataService.getConfig();

    return `
      <div class="module-container" style="max-width: 800px;">
        <div class="module-header">
          <div class="module-header__left">
            <h2 class="module-title">Configuración del Sistema</h2>
            <p class="module-subtitle">Ajusta las preferencias generales de la aplicación</p>
          </div>
        </div>

        <div class="card">
          <div class="card__body">
            <h3 style="margin-bottom: var(--spacing-lg); color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-sm);">
              ${Icons.settings} Preferencias Generales
            </h3>

            <!-- Theme Setting -->
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl);">
              <div>
                <h4 style="color: var(--text-primary); margin-bottom: var(--spacing-xs);">Tema de la Aplicación</h4>
                <p class="text-sm text-muted">Selecciona el modo visual: claro u oscuro.</p>
              </div>
              <div class="theme-toggle">
                <select id="themeSelect" class="form-select" style="width: 150px;" onchange="ConfiguracionModule.handleThemeChange(this.value)">
                  <option value="dark" ${config.theme === 'dark' ? 'selected' : ''}>Oscuro</option>
                  <option value="light" ${config.theme === 'light' ? 'selected' : ''}>Claro</option>
                </select>
              </div>
            </div>

            <!-- Exchange Rate Setting -->
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl);">
               <div>
                <h4 style="color: var(--text-primary); margin-bottom: var(--spacing-xs);">Tasa de Cambio</h4>
                <p class="text-sm text-muted">Valor del Dólar (USD) respecto al Córdoba (NIO).</p>
              </div>
              <div class="flex items-center gap-sm">
                <span class="text-muted">C$</span>
                <input type="number" id="tasaCambioInput" class="form-input" style="width: 120px;" 
                       value="${config.tipoCambio}" min="1" step="0.01">
                <button class="btn btn--primary" onclick="ConfiguracionModule.saveExchangeRate()">Guardar</button>
              </div>
            </div>



            <!-- About / Copyright Section -->
            <div class="setting-row" style="margin-top: var(--spacing-xxl); padding-top: var(--spacing-xl); border-top: 1px solid var(--border-color); text-align: center;">
              <h4 style="color: var(--text-primary); margin-bottom: var(--spacing-sm);">Acerca del Sistema</h4>
              <p class="text-sm text-muted" style="line-height: 1.6; font-size: 0.9rem;">
                Creado por Alltech 2026 <br>
                Ing. Emilio Urbina <br>
                Camoapa, Nicaragua
              </p>
            </div>

          </div>
        </div>
      </div>
    `;
  };

  const handleThemeChange = (newTheme) => {
    DataService.updateConfig({ theme: newTheme });
    App.applyTheme(newTheme);
    App.showNotification?.('Tema actualizado', 'success');
  };

  const saveExchangeRate = () => {
    const newVal = parseFloat(document.getElementById('tasaCambioInput').value);
    if (!isNaN(newVal) && newVal > 0) {
      DataService.updateConfig({ tipoCambio: newVal });
      App.showNotification?.('Tasa de cambio actualizada correctamente', 'success');
    } else {
      App.showNotification?.('Valor inválido', 'error');
    }
  };

  // ========== PUBLIC API ==========
  return {
    render,
    handleThemeChange,
    saveExchangeRate
  };
})();
