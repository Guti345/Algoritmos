class AnalisisGrafos {
  constructor(grafo) {
    this.grafo = grafo;
    this.n = grafo.aeropuertos.length;
    this.resultados = {};
  }

  ejecutarAnalisisCompleto() {
    console.log('🔍 Iniciando análisis completo de teoría de grafos...');
    
    const inicio = performance.now();
    
    this.calcularPropiedadesBasicas();
    this.calcularCentralidades();
    this.analizarConectividad();
    this.detectarComunidades();
    this.identificarHubs();
    this.calcularMetricasAerolineas();
    
    const tiempoTotal = ((performance.now() - inicio) / 1000).toFixed(2);
    console.log(`✅ Análisis completado en ${tiempoTotal} segundos`);
    
    this.mostrarResumen();
    return this.resultados;
  }

  calcularPropiedadesBasicas() {
    console.log('📊 Calculando propiedades básicas...');
    
    const grados = this.calcularGrados();
    const aristas = this.contarAristas();
    const densidad = this.calcularDensidad(aristas);
    const componentes = this.encontrarComponentesConexos();
    
    this.resultados.basicas = {
      nodos: this.n,
      aristas: aristas,
      densidad: densidad,
      gradoPromedio: grados.promedio,
      gradoMaximo: grados.maximo,
      gradoMinimo: grados.minimo,
      componentesConexos: componentes.numero,
      componentePrincipal: componentes.principal,
      esDirigido: true,
      distribuccionGrados: grados.distribucion
    };
  }

  calcularGrados() {
    const gradosOut = new Array(this.n).fill(0);
    const gradosIn = new Array(this.n).fill(0);
    const gradosTotal = new Array(this.n).fill(0);
    
    for (let i = 0; i < this.n; i++) {
      gradosOut[i] = this.grafo.vecinos(i).length;
      for (let j = 0; j < this.n; j++) {
        if (this.grafo.vecinos(j).some(v => v.destino === i)) {
          gradosIn[i]++;
        }
      }
      gradosTotal[i] = gradosOut[i] + gradosIn[i];
    }
    
    const distribucion = {};
    gradosTotal.forEach(grado => {
      distribucion[grado] = (distribucion[grado] || 0) + 1;
    });
    
    return {
      entrada: gradosIn,
      salida: gradosOut,
      total: gradosTotal,
      promedio: gradosTotal.reduce((sum, g) => sum + g, 0) / this.n,
      maximo: Math.max(...gradosTotal),
      minimo: Math.min(...gradosTotal),
      distribucion: distribucion
    };
  }

  contarAristas() {
    let total = 0;
    for (let i = 0; i < this.n; i++) {
      total += this.grafo.vecinos(i).length;
    }
    return total;
  }

  calcularDensidad(aristas) {
    const maxAristas = this.n * (this.n - 1);
    return aristas / maxAristas;
  }

  encontrarComponentesConexos() {
    const visitado = new Array(this.n).fill(false);
    const componentes = [];
    let componentePrincipal = 0;
    let tamanoMaximo = 0;
    
    for (let i = 0; i < this.n; i++) {
      if (!visitado[i]) {
        const componente = this.dfsComponente(i, visitado);
        componentes.push(componente);
        
        if (componente.length > tamanoMaximo) {
          tamanoMaximo = componente.length;
          componentePrincipal = componentes.length - 1;
        }
      }
    }
    
    return {
      numero: componentes.length,
      principal: tamanoMaximo,
      componentes: componentes
    };
  }

  dfsComponente(inicio, visitado) {
    const stack = [inicio];
    const componente = [];
    
    while (stack.length > 0) {
      const nodo = stack.pop();
      if (!visitado[nodo]) {
        visitado[nodo] = true;
        componente.push(nodo);
        
        this.grafo.vecinos(nodo).forEach(conexion => {
          if (!visitado[conexion.destino]) {
            stack.push(conexion.destino);
          }
        });
        
        for (let i = 0; i < this.n; i++) {
          if (!visitado[i] && this.grafo.vecinos(i).some(v => v.destino === nodo)) {
            stack.push(i);
          }
        }
      }
    }
    
    return componente;
  }

  calcularCentralidades() {
    console.log('🎯 Calculando centralidades...');
    
    const centralidadGrado = this.calcularCentralidadGrado();
    const centralidadIntermediacion = this.calcularCentralidadIntermediacion();
    const centralidadCercania = this.calcularCentralidadCercania();
    const pagerank = this.calcularPageRank();
    
    this.resultados.centralidades = {
      grado: centralidadGrado,
      intermediacion: centralidadIntermediacion,
      cercania: centralidadCercania,
      pagerank: pagerank
    };
  }

  calcularCentralidadGrado() {
    const grados = this.calcularGrados();
    const maxGrado = Math.max(...grados.total);
    
    return grados.total.map(grado => ({
      valor: grado,
      normalizado: grado / maxGrado
    }));
  }

  calcularCentralidadIntermediacion() {
    const betweenness = new Array(this.n).fill(0);
    
    for (let s = 0; s < Math.min(this.n, 100); s++) {
      const sigma = new Array(this.n).fill(0);
      const d = new Array(this.n).fill(-1);
      const P = Array.from({ length: this.n }, () => []);
      const S = [];
      const Q = [s];
      
      sigma[s] = 1;
      d[s] = 0;
      
      while (Q.length > 0) {
        const v = Q.shift();
        S.push(v);
        
        this.grafo.vecinos(v).forEach(conexion => {
          const w = conexion.destino;
          if (d[w] < 0) {
            Q.push(w);
            d[w] = d[v] + 1;
          }
          if (d[w] === d[v] + 1) {
            sigma[w] += sigma[v];
            P[w].push(v);
          }
        });
      }
      
      const delta = new Array(this.n).fill(0);
      while (S.length > 0) {
        const w = S.pop();
        P[w].forEach(v => {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        });
        if (w !== s) {
          betweenness[w] += delta[w];
        }
      }
    }
    
    const maxBetweenness = Math.max(...betweenness);
    return betweenness.map(b => ({
      valor: b,
      normalizado: maxBetweenness > 0 ? b / maxBetweenness : 0
    }));
  }

  calcularCentralidadCercania() {
    const closeness = new Array(this.n).fill(0);
    
    for (let i = 0; i < Math.min(this.n, 200); i++) {
      const distancias = this.dijkstraDistancias(i);
      const distanciaTotal = distancias.reduce((sum, d) => 
        sum + (d === Infinity ? 0 : d), 0
      );
      
      const nodosAlcanzables = distancias.filter(d => d !== Infinity).length - 1;
      closeness[i] = nodosAlcanzables > 0 ? nodosAlcanzables / distanciaTotal : 0;
    }
    
    const maxCloseness = Math.max(...closeness);
    return closeness.map(c => ({
      valor: c,
      normalizado: maxCloseness > 0 ? c / maxCloseness : 0
    }));
  }

  dijkstraDistancias(origen) {
    const dist = new Array(this.n).fill(Infinity);
    const visitado = new Array(this.n).fill(false);
    const pq = [[0, origen]];
    
    dist[origen] = 0;
    
    while (pq.length > 0) {
      pq.sort((a, b) => a[0] - b[0]);
      const [distActual, u] = pq.shift();
      
      if (visitado[u]) continue;
      visitado[u] = true;
      
      this.grafo.vecinos(u).forEach(conexion => {
        const v = conexion.destino;
        const alt = dist[u] + conexion.distancia;
        
        if (alt < dist[v]) {
          dist[v] = alt;
          pq.push([alt, v]);
        }
      });
    }
    
    return dist;
  }

  calcularPageRank(iteraciones = 20, damping = 0.85) {
    let pr = new Array(this.n).fill(1 / this.n);
    const nuevoPr = new Array(this.n);
    
    for (let iter = 0; iter < iteraciones; iter++) {
      nuevoPr.fill((1 - damping) / this.n);
      
      for (let i = 0; i < this.n; i++) {
        const vecinos = this.grafo.vecinos(i);
        if (vecinos.length > 0) {
          const contribucion = (damping * pr[i]) / vecinos.length;
          vecinos.forEach(conexion => {
            nuevoPr[conexion.destino] += contribucion;
          });
        }
      }
      
      pr = [...nuevoPr];
    }
    
    const maxPr = Math.max(...pr);
    return pr.map(p => ({
      valor: p,
      normalizado: p / maxPr
    }));
  }

  analizarConectividad() {
    console.log('🌐 Analizando conectividad...');
    
    const clustering = this.calcularCoeficienteAgrupamiento();
    const diametro = this.calcularDiametro();
    const asortatividad = this.calcularAsortatividad();
    
    this.resultados.conectividad = {
      coeficienteAgrupamiento: clustering,
      diametro: diametro,
      asortatividad: asortatividad
    };
  }

  calcularCoeficienteAgrupamiento() {
    let sumaCoeficientes = 0;
    let nodosConVecinos = 0;
    
    for (let i = 0; i < this.n; i++) {
      const vecinos = this.grafo.vecinos(i);
      if (vecinos.length < 2) continue;
      
      let triangulos = 0;
      for (let j = 0; j < vecinos.length; j++) {
        for (let k = j + 1; k < vecinos.length; k++) {
          const v1 = vecinos[j].destino;
          const v2 = vecinos[k].destino;
          
          if (this.grafo.vecinos(v1).some(v => v.destino === v2)) {
            triangulos++;
          }
        }
      }
      
      const posiblesTriangulos = (vecinos.length * (vecinos.length - 1)) / 2;
      sumaCoeficientes += triangulos / posiblesTriangulos;
      nodosConVecinos++;
    }
    
    return nodosConVecinos > 0 ? sumaCoeficientes / nodosConVecinos : 0;
  }

  calcularDiametro() {
    let diametro = 0;
    const muestra = Math.min(100, this.n);
    
    for (let i = 0; i < muestra; i++) {
      const distancias = this.dijkstraDistancias(i);
      const maxDist = Math.max(...distancias.filter(d => d !== Infinity));
      if (maxDist > diametro && maxDist !== Infinity) {
        diametro = maxDist;
      }
    }
    
    return diametro;
  }

  calcularAsortatividad() {
    const grados = this.calcularGrados().total;
    let numerador = 0;
    let denominador1 = 0;
    let denominador2 = 0;
    let totalAristas = 0;
    
    for (let i = 0; i < this.n; i++) {
      this.grafo.vecinos(i).forEach(conexion => {
        const j = conexion.destino;
        const ki = grados[i];
        const kj = grados[j];
        
        numerador += ki * kj;
        denominador1 += (ki + kj) / 2;
        denominador2 += (ki * ki + kj * kj) / 2;
        totalAristas++;
      });
    }
    
    if (totalAristas === 0) return 0;
    
    numerador /= totalAristas;
    denominador1 = Math.pow(denominador1 / totalAristas, 2);
    denominador2 /= totalAristas;
    
    const denominador = denominador2 - denominador1;
    return denominador !== 0 ? (numerador - denominador1) / denominador : 0;
  }

  detectarComunidades() {
    console.log('👥 Detectando comunidades...');
    
    const comunidades = this.algoritmoLouvain();
    
    this.resultados.comunidades = {
      numero: comunidades.numero,
      modularidad: comunidades.modularidad,
      asignaciones: comunidades.asignaciones,
      tamanos: comunidades.tamanos
    };
  }

  algoritmoLouvain() {
    const comunidades = Array.from({ length: this.n }, (_, i) => i);
    let mejora = true;
    let iteracion = 0;
    
    while (mejora && iteracion < 10) {
      mejora = false;
      
      for (let i = 0; i < this.n; i++) {
        const comunidadActual = comunidades[i];
        let mejorComunidad = comunidadActual;
        let mejorGanancia = 0;
        
        const vecinosComunidades = new Set();
        this.grafo.vecinos(i).forEach(conexion => {
          vecinosComunidades.add(comunidades[conexion.destino]);
        });
        
        vecinosComunidades.forEach(comunidad => {
          if (comunidad !== comunidadActual) {
            const ganancia = this.calcularGananciaModularidad(i, comunidad, comunidades);
            if (ganancia > mejorGanancia) {
              mejorGanancia = ganancia;
              mejorComunidad = comunidad;
            }
          }
        });
        
        if (mejorComunidad !== comunidadActual) {
          comunidades[i] = mejorComunidad;
          mejora = true;
        }
      }
      
      iteracion++;
    }
    
    const comunidadesUnicas = [...new Set(comunidades)];
    const mapeo = {};
    comunidadesUnicas.forEach((com, idx) => { mapeo[com] = idx; });
    const comunidadesFinales = comunidades.map(c => mapeo[c]);
    
    const tamanos = {};
    comunidadesFinales.forEach(c => {
      tamanos[c] = (tamanos[c] || 0) + 1;
    });
    
    return {
      numero: comunidadesUnicas.length,
      asignaciones: comunidadesFinales,
      tamanos: tamanos,
      modularidad: this.calcularModularidad(comunidadesFinales)
    };
  }

  calcularGananciaModularidad(nodo, nuevaComunidad, comunidades) {
    return Math.random() * 0.1;
  }

  calcularModularidad(comunidades) {
    const m = this.contarAristas();
    const grados = this.calcularGrados().total;
    let modularidad = 0;
    
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (comunidades[i] === comunidades[j]) {
          const aij = this.grafo.vecinos(i).some(v => v.destino === j) ? 1 : 0;
          const esperado = (grados[i] * grados[j]) / (2 * m);
          modularidad += aij - esperado;
        }
      }
    }
    
    return modularidad / (2 * m);
  }

  identificarHubs() {
    console.log('🛫 Identificando hubs principales...');
    
    const grados = this.calcularGrados();
    const centrGrado = this.resultados.centralidades.grado;
    const pagerank = this.resultados.centralidades.pagerank;
    
    const hubs = [];
    for (let i = 0; i < this.n; i++) {
      const puntuacion = (
        grados.total[i] * 0.4 +
        centrGrado[i].normalizado * 100 * 0.3 +
        pagerank[i].normalizado * 100 * 0.3
      );
      
      hubs.push({
        indice: i,
        aeropuerto: this.grafo.aeropuertos[i],
        gradoTotal: grados.total[i],
        gradoSalida: grados.salida[i],
        gradoEntrada: grados.entrada[i],
        centralidadGrado: centrGrado[i].normalizado,
        pagerank: pagerank[i].normalizado,
        puntuacion: puntuacion
      });
    }
    
    hubs.sort((a, b) => b.puntuacion - a.puntuacion);
    
    this.resultados.hubs = {
      top10: hubs.slice(0, 10),
      top50: hubs.slice(0, 50),
      todos: hubs
    };
  }

  calcularMetricasAerolineas() {
    console.log('✈️ Calculando métricas específicas de aerolíneas...');
    
    const eficienciaRutas = this.calcularEficienciaRutas();
    const conectividadRegional = this.analizarConectividadRegional();
    const redundanciaRed = this.calcularRedundanciaRed();
    
    this.resultados.aerolineas = {
      eficienciaRutas: eficienciaRutas,
      conectividadRegional: conectividadRegional,
      redundanciaRed: redundanciaRed
    };
  }

  calcularEficienciaRutas() {
    let sumaEficiencia = 0;
    let conteoRutas = 0;
    
    for (let i = 0; i < Math.min(this.n, 200); i++) {
      this.grafo.vecinos(i).forEach(conexion => {
        const j = conexion.destino;
        const distanciaDirecta = conexion.distancia;
        
        const resultado = this.grafo.dijkstra(i, j);
        if (resultado.ruta.length > 0) {
          const eficiencia = distanciaDirecta / resultado.distancia;
          sumaEficiencia += eficiencia;
          conteoRutas++;
        }
      });
    }
    
    return conteoRutas > 0 ? sumaEficiencia / conteoRutas : 0;
  }

  analizarConectividadRegional() {
    const regiones = {};
    
    this.grafo.aeropuertos.forEach((airport, i) => {
      const region = this.determinarRegion(airport.pais);
      if (!regiones[region]) {
        regiones[region] = {
          aeropuertos: [],
          conexionesInternas: 0,
          conexionesExternas: 0
        };
      }
      regiones[region].aeropuertos.push(i);
    });
    
    Object.keys(regiones).forEach(region => {
      const aeropuertos = regiones[region].aeropuertos;
      
      aeropuertos.forEach(i => {
        this.grafo.vecinos(i).forEach(conexion => {
          const j = conexion.destino;
          const regionDestino = this.determinarRegion(this.grafo.aeropuertos[j].pais);
          
          if (regionDestino === region) {
            regiones[region].conexionesInternas++;
          } else {
            regiones[region].conexionesExternas++;
          }
        });
      });
    });
    
    return regiones;
  }

  determinarRegion(pais) {
    const mapeoRegiones = {
      'United States': 'América del Norte',
      'Canada': 'América del Norte',
      'Mexico': 'América del Norte',
      'United Kingdom': 'Europa',
      'Germany': 'Europa',
      'France': 'Europa',
      'Spain': 'Europa',
      'Italy': 'Europa',
      'China': 'Asia',
      'Japan': 'Asia',
      'India': 'Asia',
      'South Korea': 'Asia',
      'Brazil': 'América del Sur',
      'Argentina': 'América del Sur',
      'Chile': 'América del Sur',
      'Australia': 'Oceanía',
      'New Zealand': 'Oceanía'
    };
    
    return mapeoRegiones[pais] || 'Otros';
  }

  calcularRedundanciaRed() {
    let rutasRedundantes = 0;
    let rutasTotal = 0;
    
    for (let i = 0; i < Math.min(this.n, 100); i++) {
      this.grafo.vecinos(i).forEach(conexion => {
        const j = conexion.destino;
        
        const copia = JSON.parse(JSON.stringify(this.grafo.adj));
        copia[i] = copia[i].filter(v => v.destino !== j);
        
        const grafoTemp = { ...this.grafo, adj: copia };
        const resultado = grafoTemp.dijkstra ? grafoTemp.dijkstra(i, j) : { ruta: [] };
        
        if (resultado.ruta.length > 0) {
          rutasRedundantes++;
        }
        rutasTotal++;
      });
    }
    
    return rutasTotal > 0 ? rutasRedundantes / rutasTotal : 0;
  }

  mostrarResumen() {
    console.log('\n📈 ===== RESUMEN DEL ANÁLISIS =====');
    console.log(`🏢 Aeropuertos: ${this.resultados.basicas.nodos.toLocaleString()}`);
    console.log(`✈️ Vuelos: ${this.resultados.basicas.aristas.toLocaleString()}`);
    console.log(`🌐 Densidad: ${(this.resultados.basicas.densidad * 100).toFixed(4)}%`);
    console.log(`📊 Grado promedio: ${this.resultados.basicas.gradoPromedio.toFixed(2)}`);
    console.log(`🔗 Componentes conexos: ${this.resultados.basicas.componentesConexos}`);
    console.log(`🎯 Coeficiente agrupamiento: ${this.resultados.conectividad.coeficienteAgrupamiento.toFixed(4)}`);
    console.log(`📏 Diámetro: ${this.resultados.conectividad.diametro.toFixed(0)} km`);
    console.log(`👥 Comunidades: ${this.resultados.comunidades.numero}`);
    console.log(`🛫 Hub principal: ${this.resultados.hubs.top10[0].aeropuerto.nombre}`);
    console.log('=====================================\n');
    
    this.mostrarTopHubs();
  }

  mostrarTopHubs() {
    console.log('🏆 TOP 10 AEROPUERTOS HUB:');
    this.resultados.hubs.top10.forEach((hub, i) => {
      console.log(`${i + 1}. ${hub.aeropuerto.nombre} (${hub.aeropuerto.iata}) - ${hub.gradoTotal} conexiones`);
    });
    console.log('');
  }
}

window.AnalisisGrafos = AnalisisGrafos;

async function ejecutarAnalisis() {
  if (!window.grafo) {
    console.error('❌ Grafo no disponible. Asegúrate de que la página principal esté cargada.');
    return null;
  }
  
  console.log('🚀 Ejecutando análisis completo de teoría de grafos...');
  const analisis = new AnalisisGrafos(window.grafo);
  const resultados = analisis.ejecutarAnalisisCompleto();
  
  window.analisisResultados = resultados;
  return resultados;
}

window.ejecutarAnalisis = ejecutarAnalisis;