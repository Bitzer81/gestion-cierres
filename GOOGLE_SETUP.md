# 🔑 Configuración de Google Cloud para CierresPro

Para conectar la aplicación con tu Google Drive, necesitas obtener dos claves de Google (es gratuito). Sigue estos pasos:

## Paso 1: Crear Proyecto
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Arriba a la izquierda, haz clic en el selector de proyectos y luego el "Nuevo Proyecto".
3. Nombre: `CierresPro` (o lo que quieras).
4. Dale a **Crear**.

## Paso 2: Activar API Google Drive
1. En el menú de la izquierda, ve a **APIs y servicios** > **Biblioteca**.
2. Busca "Google Drive API".
3. Haz clic en ella y dale a **Habilitar**.

## Paso 3: Pantalla de Consentimiento
1. Ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth**.
2. Selecciona **External** (Externo) y dale a Crear.
3. Rellena los datos básicos (Nombre app: CierresPro, email soporte: tu email).
4. Dale a Guardar y Continuar hasta el final.
5. **IMPORTANTE**: En "Usuarios de prueba", añade tu propio email de Gmail. (Sin esto no funcionará hasta que Google verifique la app, pero como test user sí te dejará).

## Paso 4: Crear Credenciales
1. Ve a **APIs y servicios** > **Credenciales**.
2. Arriba, dale a **+ CREAR CREDENCIALES** > **Clave de API**.
   - Copia la clave (empieza por `AIza...`). Esta es tu `API_KEY`.
3. Dale otra vez a **+ CREAR CREDENCIALES** > **ID de cliente de OAuth**.
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: Cierres Web.
   - En **Orígenes autorizados de JavaScript**, añade estas dos URLs:
     - `http://127.0.0.1:5500` (o localhost, para pruebas locales)
     - `https://bitzer81.github.io` (para tu web publicada)
   - Dale a Crear.
   - Copia el `ID de cliente` (termina en `.apps.googleusercontent.com`). Este es tu `CLIENT_ID`.

## Paso 5: Poner las claves en CierresPro
1. Abre CierresPro.
2. Ve a **Configuración**.
3. Pega las claves en los campos correspondientes de "Integración Google Drive".
