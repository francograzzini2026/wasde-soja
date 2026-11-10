# Tablero WASDE · Complejo Soja

Hojas de balance del USDA para **soja, harina y aceite de soja** (más maíz y trigo como contexto). Van de lo macro (balance mundial) a lo micro (cada país, cada rubro), con comparaciones contra el informe anterior, contra la campaña anterior y contra el promedio de 5 años.

**Cada número es clickeable** y muestra su fuente oficial, con link directo al PDF del WASDE (en la página exacta), al XML o al CSV de PSD.

## Fuentes (oficiales, sin claves)

| Fuente | Qué aporta |
|---|---|
| USDA WASDE: XML de cada informe, archivo oficial [ESMIS](https://usda.library.cornell.edu/concern/publications/3t945q76s) | Último informe, columna del mes anterior y evolución de cada estimación informe a informe |
| USDA FAS [PSD Online](https://apps.fas.usda.gov/psdonline/): descargas masivas CSV | Historia desde 2000 por país y países que no figuran en las tablas del WASDE |

## Cómo funciona

```
scripts/build.py           descarga las fuentes y genera docs/data.js
docs/index.html + app.js   el tablero (estático, sin servidor)
data/wasde_xml/            copia de cada XML del WASDE (se acumula mes a mes = historial)
.github/workflows/         corre build.py de lunes a viernes después de las 12:00 ET
```

Si salió un WASDE nuevo, el proceso lo descarga, regenera `docs/data.js` y hace commit. GitHub Pages publica la página actualizada en uno o dos minutos. Si no hay nada nuevo, no cambia nada.

## Puesta en marcha (una sola vez)

1. Creá un repositorio nuevo en GitHub (p. ej. `wasde-soja`) y subí todos estos archivos.
2. **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`, carpeta `/docs`.
3. **Settings → Actions → General → Workflow permissions**: elegí *Read and write permissions*.
4. **Actions → "Actualizar datos WASDE / PSD" → Run workflow**, para probarlo a mano.

El tablero queda en `https://<tu-usuario>.github.io/wasde-soja/`.

## Correrlo localmente (opcional)

```bash
python scripts/build.py
```

Después abrí `docs/index.html` en el navegador.
