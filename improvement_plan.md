# Plan de Mejoras: CierresPro

Este documento detalla la hoja de ruta para optimizar el rendimiento y ampliar la funcionalidad de la aplicación CierresPro.

## 1. Rendimiento y Escalabilidad

### 🚧 Problemas Actuales
- El procesamiento de archivos Excel muy grandes (>50k filas) bloquea la interfaz.
- El renderizado de tablas con miles de filas (vista Clientes/Detalle) puede ser lento.
- El uso de memoria aumenta linealmente con el tamaño del histórico.

### 🚀 Soluciones Propuestas
1.  **Web Workers para Procesamiento de Datos**
    - **Objetivo**: Mover la lógica de `processData` y `XLSX.read` a un hilo secundario.
    - **Beneficio**: La UI nunca se congelará durante la carga de archivos.

2.  **Virtualización de Tablas (Virtual Scrolling)**
    - **Objetivo**: Renderizar solo las filas visibles en el DOM (usando librerías como `tanstack-virtual` o implementación propia).
    - **Beneficio**: Scroll fluido instantáneo incluso con 100,000 registros.

3.  **Gestión de Memoria en Histórico**
    - **Objetivo**: Implementar paginación o carga bajo demanda para el histórico almacenado en `localStorage` (o migrar a IndexedDB).
    - **Beneficio**: Evita exceder el límite de 5MB del LocalStorage y mejora la velocidad de carga inicial.

## 2. Nuevas Funcionalidades

### 📊 Análisis Avanzado
- **Comparativa Multianual**: Poder seleccionar dos períodos arbitrarios para comparar no solo el mes anterior (YoY).
- **Drill-down Interactivo**: Navegación profunda (Cliente -> Centro -> Línea -> Factura/Detalle).
- **Proyecciones (Forecasting)**: Algoritmo simple de regresión lineal para predecir cierre basado en históricos.

### 🛠️ Herramientas de Gestión
- **Editor de Mapeo Visual**: Interfaz gráfica para seleccionar qué columna del Excel corresponde a los campos del sistema (drag & drop).
- **Gestión de Errores**: Panel de logs para ver filas descartadas o con errores de formato.

## 3. Experiencia de Usuario (UX/UI)

### 🎨 Mejoras Visuales
- **Modo Claro/Oscuro Automático**: Detectar preferencia del sistema.
- **Tour Guiado**: Tutorial interactivo para nuevos usuarios (usando `driver.js`).
- **Dashboards Personalizables**: Permitir al usuario elegir qué tarjetas KPI ver en la pantalla principal.

## 🚧 Priorización (Roadmap)
1.  **Q2 2026**: Virtualización de tablas y migración a IndexedDB (Crítico para rendimiento).
2.  **Q3 2026**: Web Workers y Comparativa Multianual.
3.  **Q4 2026**: Mapeo visual y Dashboards personalizables.
