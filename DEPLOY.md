# 🌐 Guía de Despliegue y Acceso Web

Para que **CierresPro** esté accesible desde cualquier navegador (móvil, tablet, otros PCs), utilizaremos **GitHub Pages**. Es un servicio gratuito incluido en tu repositorio.

## 1. Activar GitHub Pages

1. Entra a tu repositorio en GitHub: [https://github.com/Bitzer81/gestion-cierres](https://github.com/Bitzer81/gestion-cierres)
2. Ve a la pestaña **Settings** (Configuración).
3. En el menú lateral izquierdo, baja hasta la sección **Code and automation** y haz clic en **Pages**.
4. En **Build and deployment** > **Source**, selecciona **Deploy from a branch**.
5. En **Branch**, selecciona `main` y la carpeta `/(root)`.
6. Haz clic en **Save**.

⏳ **Espera unos minutos** (1-3 min). Verás un mensaje arriba que dice *"Your site is live at..."*.
🔗 Tu URL será: **https://bitzer81.github.io/gestion-cierres/**

---

## 2. Gestión de Datos en la Nube

⚠️ **Importante**: CierresPro guarda los datos en el navegador (`localStorage`) por privacidad y velocidad. Esto significa que **si abres la app en otro PC, estará vacía al principio**.

**¿Cómo llevar tus datos contigo?**

### Paso A: En tu PC principal
1. Ve a la sección **Histórico**.
2. Pulsa **Exportar Backup** (arriba a la derecha).
3. Se descargará un archivo `CierresPro_Backup.json`.
4. Guárdalo en una nube (Google Drive, OneDrive, o envíatelo por email).

### Paso B: En el nuevo dispositivo (ej. Tablet)
1. Abre la web `https://bitzer81.github.io/gestion-cierres/`.
2. Ve a la sección **Histórico**.
3. Pulsa **Importar Backup** y selecciona el archivo `.json`.
4. ¡Listo! Tendrás todos tus cierres e informes al instante.

---

## 3. Actualizaciones

Cada vez que hagamos cambios y yo ejecute `git push`, la página web se actualizará automáticamente en unos minutos. Solo tendrás que recargar la página.
