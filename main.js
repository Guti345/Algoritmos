class Grafo {
  constructor(aeropuertos, vuelos) {
    this.aeropuertos = aeropuertos;
    this.vuelos = vuelos;
    this.indicePorId = new Map();
    
    aeropuertos.forEach((airport, idx) => {
      this.indicePorId.set(airport.id, idx);
    });
    
    const n = aeropuertos.length;
    this.adj = Array.from({ length: n }, () => []);
    
    vuelos.forEach(vuelo => {
      const origenIdx = this.indicePorId.get(vuelo.origen);
      const destinoIdx = this.indicePorId.get(vuelo.destino);
      if (origenIdx !== undefined && destinoIdx !== undefined) {
        this.adj[origenIdx].push({
          destino: destinoIdx,
          distancia: vuelo.distancia,
          aerolinea: vuelo.aerolinea,
          codigo: vuelo.codigoAerolinea
        });
      }
    });
  }

  vecinos(idx) {
    return this.adj[idx] || [];
  }

  dijkstra(origenIdx, destinoIdx) {
    const n = this.aeropuertos.length;
    const dist = Array(n).fill(Infinity);
    const prev = Array(n).fill(-1);
    const visitado = new Set();
    const pq = [[0, origenIdx]];
    
    dist[origenIdx] = 0;
    
    while (pq.length > 0) {
      pq.sort((a, b) => a[0] - b[0]);
      const [distActual, u] = pq.shift();
      
      if (visitado.has(u)) continue;
      if (u === destinoIdx) break;
      
      visitado.add(u);
      
      this.vecinos(u).forEach(conexion => {
        const v = conexion.destino;
        const peso = conexion.distancia;
        const alt = dist[u] + peso;
        
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = u;
          pq.push([alt, v]);
        }
      });
    }
    
    const ruta = [];
    if (dist[destinoIdx] === Infinity) return { ruta: [], distancia: Infinity };
    
    for (let v = destinoIdx; v !== -1; v = prev[v]) {
      ruta.unshift(v);
    }
    
    return { ruta, distancia: dist[destinoIdx] };
  }

  buscarAeropuerto(query) {
    const q = query.toLowerCase();
    return this.aeropuertos.filter(airport => 
      airport.nombre.toLowerCase().includes(q) ||
      airport.ciudad.toLowerCase().includes(q) ||
      airport.pais.toLowerCase().includes(q) ||
      (airport.iata && airport.iata.toLowerCase().includes(q)) ||
      (airport.icao && airport.icao.toLowerCase().includes(q))
    ).slice(0, 10);
  }
}

let mapa, grafo, clusterGroup, vuelosLayer, rutaLayer;
let aeropuertos = [];
let vuelos = [];
let marcadores = new Map();

function parsearCSV(texto, separador = ',') {
  const lineas = texto.trim().split('\n');
  const headers = lineas[0].split(separador);
  return lineas.slice(1).map(linea => {
    const valores = [];
    let valorActual = '';
    let dentroComillas = false;
    
    for (let i = 0; i < linea.length; i++) {
      const char = linea[i];
      if (char === '"') {
        dentroComillas = !dentroComillas;
      } else if (char === separador && !dentroComillas) {
        valores.push(valorActual.trim());
        valorActual = '';
      } else {
        valorActual += char;
      }
    }
    valores.push(valorActual.trim());
    
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header.trim()] = valores[idx] || '';
    });
    return obj;
  });
}

async function cargarDatos() {
  try {
    document.getElementById('progreso').textContent = 'Cargando aeropuertos...';
    
    const [nodosRaw, aristasRaw] = await Promise.all([
      fetch('data/nodes.csv').then(r => r.text()),
      fetch('data/edges.csv').then(r => r.text())
    ]);

    document.getElementById('progreso').textContent = 'Procesando aeropuertos...';
    
    const nodosData = parsearCSV(nodosRaw);
    aeropuertos = nodosData.map((row, idx) => ({
      id: parseInt(row['id'] || row[' id']) || idx,
      indice: parseInt(row['# index'] || row.index || row['index']),
      nombre: row['name'] || row[' name'] || '',
      ciudad: row['city'] || row[' city'] || '',
      pais: row['country'] || row[' country'] || '',
      iata: row['IATA/FAA'] || row['IATA'] || '',
      icao: row['ICAO'] || row[' ICAO'] || '',
      lat: parseFloat(row['latitude'] || row[' latitude']) || 0,
      lng: parseFloat(row['longitude'] || row[' longitude']) || 0,
      altitud: parseInt(row['altitude'] || row[' altitude']) || 0
    })).filter(airport => !isNaN(airport.lat) && !isNaN(airport.lng));

    document.getElementById('progreso').textContent = 'Procesando vuelos...';
    
    const aristasData = parsearCSV(aristasRaw);
    vuelos = aristasData.map(row => ({
      origen: parseInt(row['source'] || row['# source']) || 0,
      destino: parseInt(row['target'] || row[' target']) || 0,
      distancia: parseFloat(row['distance'] || row[' distance']) || 0,
      aerolinea: row['airline'] || row[' airline'] || '',
      codigoAerolinea: parseInt(row['airline_code'] || row[' airline_code']) || 0
    })).filter(vuelo => vuelo.distancia > 0);

    return { aeropuertos, vuelos };
  } catch (error) {
    console.error('Error cargando datos:', error);
    document.getElementById('progreso').textContent = 'Error cargando datos';
    return null;
  }
}

function inicializarMapa() {
  mapa = L.map('mapa', {
    center: [20, 0],
    zoom: 3,
    zoomControl: false,
    attributionControl: false
  });
  
  const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB',
    maxZoom: 18
  });
  
  tileLayer.addTo(mapa);
  
  L.control.zoom({ position: 'bottomright' }).addTo(mapa);
  
  mapa.on('zoomend', actualizarStats);
}

function crearMarcadorAeropuerto(airport, idx) {
  const esImportante = grafo.vecinos(idx).length > 10;
  const color = esImportante ? '#fbbf24' : '#3b82f6';
  const radio = esImportante ? 6 : 4;
  
  const marcador = L.circleMarker([airport.lat, airport.lng], {
    radius: radio,
    fillColor: color,
    color: '#ffffff',
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.7
  });
  
  const conexiones = grafo.vecinos(idx).length;
  const tooltip = `
    <div style="font-size: 12px; line-height: 1.4;">
      <strong>${airport.nombre}</strong><br>
      <em>${airport.ciudad}, ${airport.pais}</em><br>
      <span style="color: #3b82f6;">${airport.iata}</span> • 
      <span style="color: #06b6d4;">${conexiones} vuelos</span>
    </div>
  `;
  
  marcador.bindTooltip(tooltip, { 
    direction: 'top',
    offset: [0, -10]
  });
  
  marcador.on('click', () => enfocarAeropuerto(idx));
  
  marcadores.set(idx, marcador);
  return marcador;
}

function mostrarAeropuertos() {
  document.getElementById('progreso').textContent = 'Creando marcadores...';
  
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      let className = 'marker-cluster-';
      if (count < 10) className += 'small';
      else if (count < 100) className += 'medium';
      else className += 'large';
      
      return L.divIcon({
        html: count,
        className: className,
        iconSize: [40, 40]
      });
    }
  });
  
  const marcadoresArray = aeropuertos.map((airport, idx) => {
    const grafoIdx = grafo.indicePorId.get(airport.id);
    if (grafoIdx !== undefined) {
      return crearMarcadorAeropuerto(airport, grafoIdx);
    }
    return null;
  }).filter(Boolean);
  
  clusterGroup.addLayers(marcadoresArray);
  mapa.addLayer(clusterGroup);
}

function mostrarVuelos(filtro = 2) {
  if (vuelosLayer) {
    mapa.removeLayer(vuelosLayer);
  }
  
  if (filtro === 1) return;
  
  const lineasVuelo = [];
  const maxVuelos = filtro === 2 ? 1000 : vuelos.length;
  
  vuelos.slice(0, maxVuelos).forEach(vuelo => {
    const origenAirport = aeropuertos.find(a => a.id === vuelo.origen);
    const destinoAirport = aeropuertos.find(a => a.id === vuelo.destino);
    
    if (origenAirport && destinoAirport) {
      const linea = L.polyline([
        [origenAirport.lat, origenAirport.lng],
        [destinoAirport.lat, destinoAirport.lng]
      ], {
        color: '#06b6d4',
        weight: 1,
        opacity: 0.3
      });
      
      lineasVuelo.push(linea);
    }
  });
  
  vuelosLayer = L.layerGroup(lineasVuelo);
  mapa.addLayer(vuelosLayer);
}

function configurarAutocompletado() {
  const inputs = ['buscarAeropuerto', 'origen', 'destino'];
  
  inputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    let timeoutId;
    
    input.addEventListener('input', function() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const valor = this.value.trim();
        if (valor.length < 2) {
          limpiarAutocomplete(inputId);
          return;
        }
        
        const resultados = grafo.buscarAeropuerto(valor);
        mostrarAutocomplete(inputId, resultados);
      }, 300);
    });
  });
}

function mostrarAutocomplete(inputId, resultados) {
  limpiarAutocomplete(inputId);
  
  if (resultados.length === 0) return;
  
  const input = document.getElementById(inputId);
  const contenedor = document.createElement('div');
  contenedor.className = 'autocomplete-items';
  
  resultados.forEach(airport => {
    const item = document.createElement('div');
    item.innerHTML = `
      <strong>${airport.nombre}</strong><br>
      <small>${airport.ciudad}, ${airport.pais} • ${airport.iata}</small>
    `;
    
    item.addEventListener('click', () => {
      input.value = `${airport.nombre} (${airport.iata})`;
      input.dataset.airportId = airport.id;
      limpiarAutocomplete(inputId);
      
      if (inputId === 'buscarAeropuerto') {
        const idx = grafo.indicePorId.get(airport.id);
        if (idx !== undefined) {
          enfocarAeropuerto(idx);
        }
      }
    });
    
    contenedor.appendChild(item);
  });
  
  input.parentNode.appendChild(contenedor);
}

function limpiarAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  const existing = input.parentNode.querySelector('.autocomplete-items');
  if (existing) {
    existing.remove();
  }
}

function enfocarAeropuerto(idx) {
  const airport = aeropuertos.find(a => a.id === grafo.aeropuertos[idx].id);
  if (airport) {
    mapa.setView([airport.lat, airport.lng], 8);
    
    const marcador = marcadores.get(idx);
    if (marcador) {
      marcador.openTooltip();
    }
  }
}

function calcularRuta() {
  const origenInput = document.getElementById('origen');
  const destinoInput = document.getElementById('destino');
  
  const origenId = parseInt(origenInput.dataset.airportId);
  const destinoId = parseInt(destinoInput.dataset.airportId);
  
  if (!origenId || !destinoId) {
    alert('Selecciona aeropuertos válidos de origen y destino');
    return;
  }
  
  const origenIdx = grafo.indicePorId.get(origenId);
  const destinoIdx = grafo.indicePorId.get(destinoId);
  
  if (origenIdx === undefined || destinoIdx === undefined) {
    alert('Aeropuertos no encontrados en la red');
    return;
  }
  
  const resultado = grafo.dijkstra(origenIdx, destinoIdx);
  
  if (resultado.ruta.length === 0) {
    alert('No se encontró ruta entre los aeropuertos');
    return;
  }
  
  mostrarRuta(resultado);
}

function mostrarRuta(resultado) {
  if (rutaLayer) {
    mapa.removeLayer(rutaLayer);
  }
  
  const coordenadas = resultado.ruta.map(idx => {
    const airport = aeropuertos.find(a => a.id === grafo.aeropuertos[idx].id);
    return [airport.lat, airport.lng];
  });
  
  rutaLayer = L.polyline(coordenadas, {
    color: '#ef4444',
    weight: 4,
    opacity: 0.8
  }).addTo(mapa);
  
  mapa.fitBounds(rutaLayer.getBounds(), { padding: [50, 50] });
  
  const rutaInfo = document.getElementById('rutaInfo');
  const detalles = document.getElementById('rutaDetalles');
  
  const distanciaTotal = resultado.distancia.toFixed(0);
  const escalas = resultado.ruta.length - 1;
  
  detalles.innerHTML = `
    <div style="margin-bottom: 10px;">
      <strong>Distancia total:</strong> ${distanciaTotal} km
    </div>
    <div style="margin-bottom: 15px;">
      <strong>Escalas:</strong> ${escalas}
    </div>
    <div style="font-size: 0.9em;">
      ${resultado.ruta.map((idx, i) => {
        const airport = aeropuertos.find(a => a.id === grafo.aeropuertos[idx].id);
        const prefijo = i === 0 ? '🛫' : i === resultado.ruta.length - 1 ? '🛬' : '✈️';
        return `${prefijo} ${airport.nombre} (${airport.iata})`;
      }).join('<br>')}
    </div>
  `;
  
  rutaInfo.style.display = 'block';
}

function filtrarVuelos() {
  const filtro = parseInt(document.getElementById('filtroVuelos').value);
  mostrarVuelos(filtro);
}

function resetearVista() {
  mapa.setView([20, 0], 3);
  
  if (rutaLayer) {
    mapa.removeLayer(rutaLayer);
  }
  
  document.getElementById('rutaInfo').style.display = 'none';
}

function actualizarStats() {
  const zoom = mapa.getZoom();
  document.getElementById('nivelZoom').textContent = zoom;
  
  const bounds = mapa.getBounds();
  const aeropuertosVisibles = aeropuertos.filter(airport => 
    bounds.contains([airport.lat, airport.lng])
  ).length;
  
  document.getElementById('aeropuertosVisibles').textContent = aeropuertosVisibles;
}

async function init() {
  const datos = await cargarDatos();
  if (!datos) return;
  
  document.getElementById('progreso').textContent = 'Inicializando grafo...';
  grafo = new Grafo(datos.aeropuertos, datos.vuelos);
  
  document.getElementById('progreso').textContent = 'Creando mapa...';
  inicializarMapa();
  
  mostrarAeropuertos();
  mostrarVuelos();
  
  configurarAutocompletado();
  
  document.getElementById('totalAeropuertos').textContent = aeropuertos.length.toLocaleString();
  document.getElementById('totalVuelos').textContent = vuelos.length.toLocaleString();
  
  actualizarStats();
  
  document.getElementById('cargando').style.display = 'none';
  
  window.grafo = grafo;
  window.aeropuertos = aeropuertos;
  window.vuelos = vuelos;
  
  console.log('Red de aerolíneas cargada:', {
    aeropuertos: aeropuertos.length,
    vuelos: vuelos.length
  });
}

window.calcularRuta = calcularRuta;
window.resetearVista = resetearVista;
window.filtrarVuelos = filtrarVuelos;

document.addEventListener('click', function(e) {
  if (!e.target.closest('.autocomplete')) {
    document.querySelectorAll('.autocomplete-items').forEach(item => item.remove());
  }
});

document.addEventListener('DOMContentLoaded', init);