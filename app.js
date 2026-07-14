// Tablero de monitoreo climático y de nivel de ríos - SAT - PMA
// Lógica de la aplicación

document.addEventListener('DOMContentLoaded', async () => {
  // ─── Fuentes de Datos Google Sheets ──────────────────────────────────────────
  let CLIMATE_DATA = {};

  const GOOGLE_SHEETS = [
    {
      name: "Nuevo Paraíso",
      dept: "Amazonas",
      lat: -3.758222,
      lon: -70.402,
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTn81KX0w9iczQV6Vy88dNP0JR_45_lSNKwqLHANTJpk2BjJgQVBJHcGN7pNLoDCw/pub?output=csv"
    },
    {
      name: "Santa Sofía",
      dept: "Amazonas",
      lat: -4.006722,
      lon: -70.132833,
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRSydPgLqNepElqO674k-OQ0qZRjC8PuswJwBenqt4G9nSDI_wl9o4XeFdrI0R0tA/pub?output=csv"
    },
    {
      name: "El Progreso",
      dept: "Amazonas",
      lat: -4.015389,
      lon: -70.113250,
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZ_gh8Kc8Ou8nxQt-Kmg9ePOkwBznvfDg2MJFnE9Niyo9mNBrsBvBcy4PlCow2Yg/pub?output=csv"
    },
    {
      name: "Resguardo San Miguel",
      dept: "Caquetá",
      lat: 1.12525,
      lon: -76.237722,
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTN9yuTNqMhhify9Bp98E6yW0-ITR0yeT--RkeR_P164Ym20MVzOF4LllQndnnd9A/pub?output=csv"
    },
    {
      name: "La Primavera",
      dept: "Caquetá",
      lat: 1.153083,
      lon: -76.210389,
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTGva9izFfN1OCRtKID64d6lYbeJY7erz-WuZyBKxub3jh-wJDfgdpCNemt64_N2Q/pub?output=csv"
    },
    {
      name: "Resguardo Yarinal",
      dept: "Putumayo",
      lat: 0.328119,
      lon: -76.849465,
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQG0Evez5m07QZVBwM3GTFFM4u2kw8dOWdv_YKsUDsy-q8wEoIhiu6UZbJfimX4eg/pub?output=csv"
    }
  ];

  // ─── Identidad visual por departamento ───────────────────────────────────────
  const DEPT_META = {
    'Amazonas': { color: '#10b981', glow: 'rgba(16,185,129,0.15)', fill: 'rgba(16,185,129,0.7)',  style: 'amazonas' },
    'Caquetá':  { color: '#0284c7', glow: 'rgba(2,132,199,0.15)',  fill: 'rgba(2,132,199,0.7)',   style: 'caqueta'  },
    'Putumayo': { color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)', fill: 'rgba(139,92,246,0.7)',  style: 'putumayo' }
  };

  function deptMeta(dept) {
    return DEPT_META[dept] || DEPT_META['Amazonas'];
  }

  function parseVal(val) {
    if (val === undefined || val === null || val.trim() === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }

  function parseCSVDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  }

  const statusText = document.getElementById('header-status-text');
  const pulseDot = statusText.parentElement.querySelector('.pulse-dot');

  statusText.textContent = 'Sincronizando con Google Sheets...';
  pulseDot.style.backgroundColor = '#fbbf24';

  try {
    const fetchPromises = GOOGLE_SHEETS.map(sheet => {
      return new Promise((resolve, reject) => {
        Papa.parse(sheet.url, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: function(results) {
            const datos = results.data
              .filter(row => row.Fecha || row.fecha) // Tolerar "Fecha" o "fecha"
              .map(row => {
                const rawDate = row.Fecha || row.fecha;
                const p = row.prec || row.Precipitacion || row.precipitacion;
                const tmin = row.tmin || row.Tmin;
                const tmax = row.tmax || row.Tmax;
                const nivelRio = row.nivel_rio || row.nivelRio || row.nivel || row['nivel del rio'] || row.Nivel || row.Nivel_rio || '';

                return {
                  fecha: parseCSVDate(rawDate),
                  precipitacion: parseVal(p),
                  tmin: parseVal(tmin),
                  tmax: parseVal(tmax),
                  nivel_rio: typeof nivelRio === 'string' ? nivelRio.trim() : ''
                };
              });
            resolve({ sheetInfo: sheet, datos: datos });
          },
          error: function(err) {
            reject(err);
          }
        });
      });
    });

    const allData = await Promise.all(fetchPromises);

    allData.forEach(item => {
      CLIMATE_DATA[item.sheetInfo.name] = {
        departamento: item.sheetInfo.dept,
        lat: item.sheetInfo.lat,
        lon: item.sheetInfo.lon,
        datos: item.datos
      };
    });

    statusText.textContent = 'Conectado a Google Sheets en tiempo real';
    pulseDot.style.backgroundColor = '#10b981';

  } catch (err) {
    console.error('Error al cargar datos desde Google Sheets:', err);
    statusText.textContent = 'Error al conectar con Google Sheets';
    pulseDot.style.backgroundColor = '#ef4444';
    return;
  }

  // ─── Elementos del DOM ───────────────────────────────────────────────────────
  const listAmazonas    = document.getElementById('list-amazonas');
  const listCaqueta     = document.getElementById('list-caqueta');
  const listPutumayo    = document.getElementById('list-putumayo');
  const kpisContainer   = document.getElementById('kpis-container');
  const mapTargetName   = document.getElementById('map-target-name');
  const tempTargetName  = document.getElementById('temp-target-name');
  const rainTargetName  = document.getElementById('rain-target-name');
  const tempWarning     = document.getElementById('temp-warning');
  const rainWarning     = document.getElementById('rain-warning');
  const tempPeriod      = document.getElementById('temp-period');
  const rainPeriod      = document.getElementById('rain-period');
  const riverPeriod     = document.getElementById('river-period');
  const dataTable       = document.getElementById('data-table');
  const tableTitle      = document.getElementById('table-title');
  const themeToggleBtn  = document.getElementById('theme-toggle');
  const startDateInput  = document.getElementById('start-date');
  const endDateInput    = document.getElementById('end-date');
  const monthSelect     = document.getElementById('month-select');
  const introBanner     = document.getElementById('intro-banner');
  const introCloseBtn   = document.getElementById('intro-close-btn');
  const mobileMenuBtn   = document.getElementById('mobile-menu-btn');
  const mobileCloseBtn  = document.getElementById('mobile-close-btn');
  const sidebarOverlay  = document.getElementById('sidebar-overlay');
  const sidebar         = document.getElementById('sidebar');

  // Botón de colapsar banner introductorio
  if (introCloseBtn && introBanner) {
    introCloseBtn.addEventListener('click', () => {
      introBanner.classList.toggle('collapsed');
    });
  }

  // ─── Lógica menú móvil ────────────────────────────────────────────────────────
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
  if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  // ─── Estado global ────────────────────────────────────────────────────────────
  let mapInstance       = null;
  let tileLayerDark     = null;
  let tileLayerLight    = null;
  let markersGroup      = [];
  let tempChartInstance  = null;
  let rainChartInstance  = null;
  let riverChartInstance = null;
  let currentViewState   = ''; // Nombre de la comunidad activa (se define en el arranque)
  let isLightTheme       = false;
  let lastRiverStats     = null; // Conteos del último gráfico de río (para copiar imagen)

  // ─── Utilidades de fecha ─────────────────────────────────────────────────────
  function getAllDates() {
    const all = [];
    Object.values(CLIMATE_DATA).forEach(info => {
      info.datos.forEach(d => all.push(d.fecha));
    });
    return all.sort();
  }

  function initDateInputs() {
    const allDates = getAllDates();
    const min = allDates[0];
    const max = allDates[allDates.length - 1];
    startDateInput.min = min;
    startDateInput.max = max;
    endDateInput.min   = min;
    endDateInput.max   = max;
    startDateInput.value = min;
    endDateInput.value   = max;
  }

  function getFilteredData(datos) {
    const start = startDateInput.value;
    const end   = endDateInput.value;
    return datos.filter(d => d.fecha >= start && d.fecha <= end);
  }

  // ─── Selector de mes ─────────────────────────────────────────────────────────
  // Construye las opciones del selector a partir de los meses que tienen datos
  function initMonthSelect() {
    const monthsSet = new Set();
    getAllDates().forEach(f => {
      if (f && f.length >= 7) monthsSet.add(f.slice(0, 7)); // 'YYYY-MM'
    });
    const months = Array.from(monthsSet).sort();

    monthSelect.innerHTML = '';

    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'Todo el periodo';
    monthSelect.appendChild(optAll);

    const optCustom = document.createElement('option');
    optCustom.value = 'custom';
    optCustom.textContent = 'Personalizado';
    optCustom.hidden = true; // Solo se activa al modificar fechas manualmente
    monthSelect.appendChild(optCustom);

    months.forEach(ym => {
      const [year, month] = ym.split('-');
      const opt = document.createElement('option');
      opt.value = ym;
      const nombreMes = MESES_ES[parseInt(month, 10) - 1];
      opt.textContent = `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} de ${year}`;
      monthSelect.appendChild(opt);
    });

    monthSelect.value = 'all';

    monthSelect.addEventListener('change', () => {
      const val = monthSelect.value;
      if (val === 'custom') return;

      if (val === 'all') {
        startDateInput.value = startDateInput.min;
        endDateInput.value   = endDateInput.max;
      } else {
        const [year, month] = val.split('-').map(n => parseInt(n, 10));
        const firstDay = `${val}-01`;
        const lastDay  = `${val}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
        // Ajustar a los límites del periodo con datos
        startDateInput.value = firstDay < startDateInput.min ? startDateInput.min : firstDay;
        endDateInput.value   = lastDay  > endDateInput.max   ? endDateInput.max   : lastDay;
      }
      renderDashboard();
    });
  }

  // Al modificar fechas manualmente, el selector pasa a "Personalizado"
  function syncMonthSelect() {
    if (startDateInput.value === startDateInput.min && endDateInput.value === endDateInput.max) {
      monthSelect.value = 'all';
      return;
    }
    const startYM = startDateInput.value.slice(0, 7);
    const endYM   = endDateInput.value.slice(0, 7);
    if (startYM === endYM && [...monthSelect.options].some(o => o.value === startYM)) {
      monthSelect.value = startYM;
    } else {
      monthSelect.value = 'custom';
    }
  }

  // Etiqueta del mes seleccionado (ej. "Marzo de 2026") o null si no aplica
  function getSelectedMonthLabel() {
    const val = monthSelect.value;
    if (val === 'all' || val === 'custom') return null;
    const [year, month] = val.split('-');
    const nombreMes = MESES_ES[parseInt(month, 10) - 1];
    return `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} de ${year}`;
  }

  // Muestra u oculta el mes seleccionado bajo los títulos de los tres gráficos
  function updatePeriodLabels() {
    const label = getSelectedMonthLabel();
    [tempPeriod, rainPeriod, riverPeriod].forEach(el => {
      if (!el) return;
      if (label) {
        el.textContent = label;
        el.style.display = 'block';
      } else {
        el.textContent = '';
        el.style.display = 'none';
      }
    });
  }

  // ─── Control de calidad de datos ─────────────────────────────────────────────
  const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Umbrales de plausibilidad para temperaturas en la Amazonía colombiana (°C)
  const TEMP_MIN_PLAUSIBLE = 10;
  const TEMP_MAX_PLAUSIBLE = 45;

  // Detecta registros de temperatura sospechosos: mínima mayor que máxima,
  // o valores fuera del rango plausible.
  function detectTempAnomalies(datos) {
    let count = 0;
    datos.forEach(d => {
      const hasMin = d.tmin !== null && d.tmin !== undefined;
      const hasMax = d.tmax !== null && d.tmax !== undefined;
      if (hasMin && hasMax && d.tmin > d.tmax) { count++; return; }
      if (hasMax && (d.tmax > TEMP_MAX_PLAUSIBLE || d.tmax < TEMP_MIN_PLAUSIBLE)) { count++; return; }
      if (hasMin && (d.tmin > TEMP_MAX_PLAUSIBLE || d.tmin < TEMP_MIN_PLAUSIBLE)) { count++; }
    });
    return count;
  }

  // Detecta meses con más de tres días consecutivos sin datos para las variables
  // indicadas. La evaluación se limita al periodo con registros de la comunidad
  // (entre su primera y última fecha dentro del filtro activo).
  function detectGapMonths(datos, fields) {
    if (datos.length === 0) return [];

    const validDates = new Set();
    datos.forEach(d => {
      const hasValue = fields.some(f => d[f] !== null && d[f] !== undefined && d[f] !== '');
      if (hasValue && d.fecha) validDates.add(d.fecha);
    });

    const fechas = datos.map(d => d.fecha).filter(Boolean).sort();
    if (fechas.length === 0) return [];

    const startDate = new Date(fechas[0] + 'T00:00:00');
    const endDate   = new Date(fechas[fechas.length - 1] + 'T00:00:00');

    const gapMonths = new Set();
    let streak = 0;
    let streakMonths = new Set();

    const closeStreak = () => {
      if (streak > 3) streakMonths.forEach(m => gapMonths.add(m));
      streak = 0;
      streakMonths = new Set();
    };

    for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
      const iso = dt.toISOString().slice(0, 10);
      if (!validDates.has(iso)) {
        streak++;
        streakMonths.add(`${MESES_ES[dt.getMonth()]} de ${dt.getFullYear()}`);
      } else {
        closeStreak();
      }
    }
    closeStreak();

    return Array.from(gapMonths);
  }

  // Construye el texto de advertencia de un gráfico para la comunidad activa
  function buildWarnings(fields, checkTemp) {
    const messages = [];
    const datos = getFilteredData(CLIMATE_DATA[currentViewState].datos);

    if (checkTemp) {
      const anomalies = detectTempAnomalies(datos);
      if (anomalies > 0) {
        messages.push(`${anomalies} registro${anomalies > 1 ? 's' : ''} de temperatura con valores atípicos (mínima mayor que la máxima o fuera del rango ${TEMP_MIN_PLAUSIBLE}–${TEMP_MAX_PLAUSIBLE} °C).`);
      }
    }

    const gaps = detectGapMonths(datos, fields);
    if (gaps.length > 0) {
      messages.push(`Vacíos de más de tres días consecutivos sin datos en ${gaps.join(', ')}.`);
    }

    return messages;
  }

  function renderWarning(element, messages) {
    if (!element) return;
    if (messages.length === 0) {
      element.style.display = 'none';
      element.innerHTML = '';
    } else {
      element.style.display = 'block';
      element.innerHTML = '⚠ ' + messages.join('<br>⚠ ');
    }
  }

  // ─── Colores de Chart.js según tema ──────────────────────────────────────────
  function getChartColors() {
    return {
      tickColor:  isLightTheme ? '#475569' : '#94a3b8',
      gridColor:  isLightTheme ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)',
      legendColor: isLightTheme ? '#0f172a' : '#f8fafc',
    };
  }

  // ─── 1. Sidebar dinámico ─────────────────────────────────────────────────────
  function setActiveButton(btn) {
    document.querySelectorAll('.community-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function initializeSidebar() {
    listAmazonas.innerHTML = '';
    listCaqueta.innerHTML  = '';
    listPutumayo.innerHTML = '';

    Object.keys(CLIMATE_DATA).forEach(comunidad => {
      const info = CLIMATE_DATA[comunidad];
      const btn  = document.createElement('button');
      btn.className = 'community-btn';
      btn.setAttribute('data-community', comunidad);
      btn.setAttribute('data-dept', info.departamento);

      btn.innerHTML = `
        <span>${comunidad}</span>
      `;

      btn.addEventListener('click', () => {
        setActiveButton(btn);
        currentViewState = comunidad;
        renderDashboard();
        closeSidebar(); // Cerrar menú en móvil al seleccionar
      });

      if (comunidad === currentViewState) btn.classList.add('active');

      if (info.departamento === 'Amazonas') {
        listAmazonas.appendChild(btn);
      } else if (info.departamento === 'Caquetá') {
        listCaqueta.appendChild(btn);
      } else {
        listPutumayo.appendChild(btn);
      }
    });
  }

  // ─── 2. Mapa (Leaflet) ───────────────────────────────────────────────────────
  function initializeMap() {
    mapInstance = L.map('map-container', {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([-1.2, -73.2], 6);

    tileLayerDark = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }
    );

    tileLayerLight = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }
    );

    tileLayerDark.addTo(mapInstance);

    markersGroup = [];
    Object.keys(CLIMATE_DATA).forEach(comunidad => {
      const info  = CLIMATE_DATA[comunidad];
      if (info.lat && info.lon) {
        const color = deptMeta(info.departamento).color;

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px ${color};"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([info.lat, info.lon], { icon: customIcon }).addTo(mapInstance);
        buildPopup(marker, comunidad, info, color);

        markersGroup.push({ name: comunidad, marker, lat: info.lat, lon: info.lon });
      }
    });
  }

  function buildPopup(marker, comunidad, info, color) {
    const datos       = getFilteredData(info.datos);
    const totalPrec   = datos.reduce((acc, d) => acc + (d.precipitacion || 0), 0);
    const tmaxList    = datos.map(d => d.tmax).filter(t => t !== null && t !== undefined);
    const avgMax      = tmaxList.length > 0 ? tmaxList.reduce((a, b) => a + b, 0) / tmaxList.length : null;

    const popupContent = `
      <div class="popup-info" style="font-family:'Outfit',sans-serif;">
        <h4 style="margin:0 0 4px 0;color:var(--text-main);font-size:1rem;font-weight:600;">${comunidad}</h4>
        <p style="margin:0 0 8px 0;color:${color};font-size:0.75rem;font-weight:700;text-transform:uppercase;">${info.departamento}</p>
        <div style="font-size:0.8rem;color:var(--text-muted);display:grid;grid-template-columns:auto 1fr;gap:4px 10px;">
          <span>Precipit. acumulada:</span><strong style="color:var(--text-main);">${totalPrec.toFixed(1)} mm</strong>
          <span>Temp. máx. promedio:</span><strong style="color:var(--text-main);">${avgMax !== null ? avgMax.toFixed(1) + ' °C' : 'N/D'}</strong>
        </div>
        <button class="popup-btn" style="margin-top:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:var(--text-main);padding:4px 8px;border-radius:4px;font-size:0.75rem;cursor:pointer;width:100%;font-family:'Outfit';transition:all 0.2s;" onclick="document.querySelector('[data-community=\\'${comunidad}\\']').click()">Ver detalles</button>
      </div>
    `;
    marker.bindPopup(popupContent);
  }

  function refreshMarkerPopups() {
    markersGroup.forEach(({ name, marker }) => {
      const info  = CLIMATE_DATA[name];
      const color = deptMeta(info.departamento).color;
      buildPopup(marker, name, info, color);
    });
  }

  // ─── 3. KPIs ─────────────────────────────────────────────────────────────────
  function renderKPIs() {
    kpisContainer.innerHTML = '';

    const info      = CLIMATE_DATA[currentViewState];
    const styleType = deptMeta(info.departamento).style;
    const datos     = getFilteredData(info.datos);

    const tmaxList = datos.map(d => d.tmax).filter(t => t !== null && t !== undefined);
    const tminList = datos.map(d => d.tmin).filter(t => t !== null && t !== undefined);

    const avgTmax  = tmaxList.length > 0 ? tmaxList.reduce((a, b) => a + b, 0) / tmaxList.length : 0;
    const avgTmin  = tminList.length > 0 ? tminList.reduce((a, b) => a + b, 0) / tminList.length : 0;

    const totalPrec  = datos.reduce((acc, d) => acc + (d.precipitacion || 0), 0);
    const diasLluvia = datos.filter(d => (d.precipitacion || 0) > 0).length;

    // Card 1: Temp máx. promedio
    createKPICard(
      'Temperatura máx. promedio',
      `${avgTmax.toFixed(1)} °C`,
      'Promedio de las temperaturas máximas diarias',
      styleType,
      `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v15m0-15a3 3 0 0 1 3 3v2a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm0 15a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" /></svg>`
    );

    // Card 2: Temp mín. promedio
    createKPICard(
      'Temperatura mín. promedio',
      `${avgTmin.toFixed(1)} °C`,
      'Promedio de las temperaturas mínimas diarias',
      styleType,
      `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v15m0-15a3 3 0 0 1 3 3v2a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm0 15a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" /></svg>`
    );

    // Card 3: Precipitación acumulada
    createKPICard(
      'Precipitación acumulada',
      `${totalPrec.toFixed(1)} mm`,
      'Volumen total de agua captada en el periodo',
      styleType,
      `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>`
    );

    // Card 4: Días con precipitación
    createKPICard(
      'Días con precipitación',
      `${diasLluvia} días`,
      `${datos.length > 0 ? ((diasLluvia / datos.length) * 100).toFixed(0) : 0}% del periodo con eventos de lluvia`,
      styleType,
      `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18" /></svg>`
    );
  }

  function createKPICard(title, value, desc, styleType, iconSvg) {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.setAttribute('data-style', styleType);
    card.innerHTML = `
      <div class="kpi-header">
        <span class="kpi-title">${title}</span>
        <div class="kpi-icon">${iconSvg}</div>
      </div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-desc">${desc}</div>
    `;
    kpisContainer.appendChild(card);
  }

  // ─── 4. Mapa: actualización de vista ─────────────────────────────────────────
  function updateMap() {
    if (!mapInstance) return;
    refreshMarkerPopups();

    const info = CLIMATE_DATA[currentViewState];
    const meta = deptMeta(info.departamento);
    mapTargetName.textContent = currentViewState;
    mapTargetName.style.backgroundColor = meta.glow;
    mapTargetName.style.color = meta.color;
    mapInstance.setView([info.lat, info.lon], 11, { animate: true, duration: 1 });
    const targetMarker = markersGroup.find(m => m.name === currentViewState);
    if (targetMarker) targetMarker.marker.openPopup();
  }

  // ─── 5. Gráficos (Chart.js) ──────────────────────────────────────────────────
  function renderCharts() {
    if (tempChartInstance) tempChartInstance.destroy();
    if (rainChartInstance) rainChartInstance.destroy();

    const tempCtx = document.getElementById('tempChart').getContext('2d');
    const rainCtx = document.getElementById('rainChart').getContext('2d');
    const { tickColor, gridColor, legendColor } = getChartColors();

    tempTargetName.textContent = currentViewState;
    rainTargetName.textContent = currentViewState;

    // Mensajes de control de calidad bajo los títulos
    renderWarning(tempWarning, buildWarnings(['tmin', 'tmax'], true));
    renderWarning(rainWarning, buildWarnings(['precipitacion'], false));

    const info      = CLIMATE_DATA[currentViewState];
    const datos     = getFilteredData(info.datos);
    const meta      = deptMeta(info.departamento);
    const deptColor = meta.color;
    const deptGlow  = meta.glow;

    const fechas   = datos.map(d => d.fecha);
    const tmaxData = datos.map(d => d.tmax);
    const tminData = datos.map(d => d.tmin);
    const precData = datos.map(d => d.precipitacion);

    tempChartInstance = new Chart(tempCtx, {
      type: 'line',
      data: {
        labels: fechas,
        datasets: [
          {
            label: 'Temperatura máxima (°C)',
            data: tmaxData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.05)',
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#ef4444',
            spanGaps: true
          },
          {
            label: 'Temperatura mínima (°C)',
            data: tminData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.05)',
            borderWidth: 2.5,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: legendColor, font: { family: 'Outfit' } } }
        },
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Outfit', size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Outfit' } } }
        }
      }
    });

    rainChartInstance = new Chart(rainCtx, {
      type: 'bar',
      data: {
        labels: fechas,
        datasets: [{
          label: 'Precipitación diaria (mm)',
          data: precData,
          backgroundColor: deptGlow,
          borderColor: deptColor,
          borderWidth: 1.5,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Outfit', size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Outfit' } }, title: { display: true, text: 'Lluvia (mm)', color: tickColor } }
        }
      }
    });
  }

  // ─── 6. Tabla de datos ───────────────────────────────────────────────────────
  function renderTable() {
    dataTable.innerHTML = '';

    tableTitle.textContent = `Registros históricos diarios - ${currentViewState}`;

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <th>Fecha</th>
      <th>Precipitación (mm)</th>
      <th>Temperatura mínima (°C)</th>
      <th>Temperatura máxima (°C)</th>
      <th>Condición climática</th>
    `;
    dataTable.appendChild(headerRow);

    const datos = getFilteredData(CLIMATE_DATA[currentViewState].datos);
    const datosOrdenados = [...datos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    datosOrdenados.forEach(r => {
      const row = document.createElement('tr');

      const precVal = r.precipitacion !== null && r.precipitacion !== undefined ? `${r.precipitacion.toFixed(1)} mm` : 'N/D';
      const tminVal = r.tmin !== null && r.tmin !== undefined ? `${r.tmin.toFixed(1)} °C` : 'N/D';
      const tmaxVal = r.tmax !== null && r.tmax !== undefined ? `${r.tmax.toFixed(1)} °C` : 'N/D';

      let condicionText  = 'Seco';
      let condicionStyle = 'color:var(--text-muted);';
      const prec = r.precipitacion || 0;

      if (prec > 50) {
        condicionText  = 'Precipitación extrema';
        condicionStyle = 'color:#ef4444;font-weight:600;';
      } else if (prec > 10) {
        condicionText  = 'Lluvia fuerte';
        condicionStyle = 'color:#3b82f6;font-weight:500;';
      } else if (prec > 0) {
        condicionText  = 'Llovizna';
        condicionStyle = 'color:#60a5fa;';
      }

      row.innerHTML = `
        <td style="font-family:monospace;color:var(--text-main);">${r.fecha}</td>
        <td style="font-weight:500;color:var(--text-main);">${precVal}</td>
        <td style="color:#60a5fa;">${tminVal}</td>
        <td style="color:#f87171;">${tmaxVal}</td>
        <td><span style="${condicionStyle}">${condicionText}</span></td>
      `;
      dataTable.appendChild(row);
    });
  }

  // ─── 7. Gráfico de Nivel del Río ─────────────────────────────────────────────
  function renderRiverChart() {
    if (riverChartInstance) riverChartInstance.destroy();

    const riverLegend   = document.getElementById('river-legend');
    const riverNoData   = document.getElementById('river-no-data');
    const riverLayout   = document.querySelector('.river-level-layout');
    const riverTarget   = document.getElementById('river-target-name');
    const riverCtx      = document.getElementById('riverChart').getContext('2d');

    riverTarget.textContent = currentViewState;

    // Colores y etiquetas de cada nivel
    const niveles = [
      { key: 'Alto',  label: 'Alto',  color: '#1e3a8a', light: '#3b82f6' },
      { key: 'Medio', label: 'Medio', color: '#0e7490', light: '#22d3ee' },
      { key: 'Bajo',  label: 'Bajo',  color: '#d97706', light: '#fbbf24' },
    ];

    // Acumular conteos de la comunidad activa
    const conteos = { Alto: 0, Medio: 0, Bajo: 0 };

    getFilteredData(CLIMATE_DATA[currentViewState].datos).forEach(d => {
      const n = (d.nivel_rio || '').charAt(0).toUpperCase() + (d.nivel_rio || '').slice(1).toLowerCase();
      if (conteos.hasOwnProperty(n)) conteos[n]++;
    });

    const totalDias = Object.values(conteos).reduce((a, b) => a + b, 0);
    lastRiverStats = { conteos: { ...conteos }, totalDias, niveles };

    // Si no hay ningún dato de nivel, mostrar mensaje
    if (totalDias === 0) {
      riverLayout.style.display = 'none';
      riverNoData.style.display = 'block';
      return;
    }

    riverLayout.style.display = 'flex';
    riverNoData.style.display = 'none';

    const useDark = !isLightTheme;

    // Construir leyenda
    riverLegend.innerHTML = '';
    niveles.forEach(nv => {
      const dotColor = useDark ? nv.color : nv.light;
      const count    = conteos[nv.key];
      const pct      = totalDias > 0 ? ((count / totalDias) * 100).toFixed(0) : 0;
      const item     = document.createElement('div');
      item.className = 'river-legend-item';
      item.innerHTML = `
        <div class="river-legend-dot" style="background:${dotColor};"></div>
        <div class="river-legend-info">
          <div class="river-legend-label">${nv.label}</div>
        </div>
        <div style="text-align:right;">
          <div class="river-legend-count" style="color:${dotColor};">${count}</div>
          <div class="river-legend-days">${pct}% · días</div>
        </div>
      `;
      riverLegend.appendChild(item);
    });

    // Gráfico Donut
    riverChartInstance = new Chart(riverCtx, {
      type: 'doughnut',
      data: {
        labels: niveles.map(nv => nv.label),
        datasets: [{
          data: niveles.map(nv => conteos[nv.key]),
          backgroundColor: useDark
            ? ['#1e3a8a', '#0e7490', '#d97706']
            : ['#3b82f6', '#22d3ee', '#fbbf24'],
          borderColor: 'transparent',
          borderWidth: 0,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} días (${totalDias > 0 ? ((ctx.parsed / totalDias) * 100).toFixed(0) : 0}%)`
            },
            bodyFont: { family: 'Outfit' },
            titleFont: { family: 'Outfit', weight: '600' }
          }
        }
      }
    });
  }

  // ─── 8. Copiar gráficas como imágenes ────────────────────────────────────────
  const CHART_TITLES = {
    tempChart:  'Temperatura',
    rainChart:  'Precipitación',
    riverChart: 'Nivel del río'
  };

  function slugify(text) {
    return text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Compone la gráfica en un lienzo con fondo, título y (para el río) leyenda
  function composeChartCanvas(canvasId) {
    const src = document.getElementById(canvasId);
    if (!src || src.width === 0) return null;

    const dpr    = window.devicePixelRatio || 1;
    const pad    = 20 * dpr;
    const titleH = 52 * dpr;
    const isRiver = canvasId === 'riverChart';
    const legendH = (isRiver && lastRiverStats && lastRiverStats.totalDias > 0)
      ? (lastRiverStats.niveles.length * 26 + 10) * dpr
      : 0;

    const out = document.createElement('canvas');
    out.width  = src.width + pad * 2;
    out.height = src.height + titleH + legendH + pad * 2;
    const ctx = out.getContext('2d');

    // Fondo sólido (según tema)
    ctx.fillStyle = isLightTheme ? '#ffffff' : '#0f172a';
    ctx.fillRect(0, 0, out.width, out.height);

    // Título y subtítulo
    const textMain  = isLightTheme ? '#0f172a' : '#f8fafc';
    const textMuted = isLightTheme ? '#475569' : '#94a3b8';
    const monthLabel = getSelectedMonthLabel();
    const subtitle = monthLabel
      ? `${currentViewState} · ${monthLabel}`
      : `${currentViewState} · ${startDateInput.value} a ${endDateInput.value}`;

    ctx.fillStyle = textMain;
    ctx.font = `600 ${15 * dpr}px Outfit, sans-serif`;
    ctx.fillText(CHART_TITLES[canvasId] || 'Gráfica', pad, pad + 14 * dpr);

    ctx.fillStyle = textMuted;
    ctx.font = `400 ${12 * dpr}px Outfit, sans-serif`;
    ctx.fillText(subtitle, pad, pad + 32 * dpr);

    // Gráfica
    ctx.drawImage(src, pad, titleH + pad);

    // Leyenda del nivel del río (el donut no la incluye en el canvas)
    if (legendH > 0) {
      const useDark = !isLightTheme;
      let y = titleH + pad + src.height + 20 * dpr;
      lastRiverStats.niveles.forEach(nv => {
        const count = lastRiverStats.conteos[nv.key];
        const pct   = lastRiverStats.totalDias > 0 ? ((count / lastRiverStats.totalDias) * 100).toFixed(0) : 0;
        const dotColor = useDark ? nv.color : nv.light;

        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(pad + 6 * dpr, y - 4 * dpr, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = textMain;
        ctx.font = `500 ${12 * dpr}px Outfit, sans-serif`;
        ctx.fillText(`${nv.label}: ${count} días (${pct}%)`, pad + 18 * dpr, y);

        y += 26 * dpr;
      });
    }

    return out;
  }

  function showCopyFeedback(btn, ok) {
    const original = btn.innerHTML;
    btn.innerHTML = ok
      ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>`;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = original;
      btn.classList.remove('copied');
    }, 1600);
  }

  async function copyChartImage(canvasId, btn) {
    const composed = composeChartCanvas(canvasId);
    if (!composed) return;

    composed.toBlob(async (blob) => {
      if (!blob) return;
      try {
        // Copiar al portapapeles (requiere contexto seguro: localhost o HTTPS)
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showCopyFeedback(btn, true);
      } catch (err) {
        // Alternativa: descargar como archivo PNG
        console.warn('No fue posible copiar al portapapeles; se descargará la imagen.', err);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${slugify(CHART_TITLES[canvasId] || 'grafica')}_${slugify(currentViewState)}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
        showCopyFeedback(btn, false);
      }
    }, 'image/png');
  }

  document.querySelectorAll('.copy-chart-btn').forEach(btn => {
    btn.addEventListener('click', () => copyChartImage(btn.dataset.chart, btn));
  });

  // ─── 9. Cambio de tema ───────────────────────────────────────────────────────
  function applyTheme() {
    const body    = document.body;
    const sunIcon  = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');

    if (isLightTheme) {
      body.classList.add('light-theme');
      sunIcon.style.display  = 'none';
      moonIcon.style.display = 'block';
      // Cambiar al tile layer claro
      if (mapInstance) {
        tileLayerDark.remove();
        tileLayerLight.addTo(mapInstance);
      }
    } else {
      body.classList.remove('light-theme');
      sunIcon.style.display  = 'block';
      moonIcon.style.display = 'none';
      // Cambiar al tile layer oscuro
      if (mapInstance) {
        tileLayerLight.remove();
        tileLayerDark.addTo(mapInstance);
      }
    }

    // Redibujar gráficos con nuevos colores
    renderCharts();
    renderRiverChart();
  }

  themeToggleBtn.addEventListener('click', () => {
    isLightTheme = !isLightTheme;
    applyTheme();
  });

  // ─── 10. Renderizado maestro ─────────────────────────────────────────────────
  function renderDashboard() {
    updatePeriodLabels();
    renderKPIs();
    updateMap();
    renderCharts();
    renderRiverChart();
    renderTable();
  }

  // ─── 11. Listeners de fechas ─────────────────────────────────────────────────
  startDateInput.addEventListener('change', () => {
    if (startDateInput.value > endDateInput.value) {
      endDateInput.value = startDateInput.value;
    }
    syncMonthSelect();
    renderDashboard();
  });

  endDateInput.addEventListener('change', () => {
    if (endDateInput.value < startDateInput.value) {
      startDateInput.value = endDateInput.value;
    }
    syncMonthSelect();
    renderDashboard();
  });

  // ─── Arranque ────────────────────────────────────────────────────────────────
  currentViewState = Object.keys(CLIMATE_DATA)[0]; // Primera comunidad como vista inicial
  initDateInputs();
  initMonthSelect();
  initializeSidebar();
  initializeMap();
  renderDashboard();

  document.getElementById('header-status-text').textContent = 'Conectado a datos locales';
});
