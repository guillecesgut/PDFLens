# PDFLens 🔴

**Herramienta de análisis de documentos PDF**  
Extrae metadatos, perfil de color (RGB/CMYK), tamaño en centímetros y peso de cualquier PDF al instante.

---

## 🚀 Deploy en Vercel (recomendado)

### Opción A — Desde GitHub (más fácil)

1. Sube esta carpeta a un repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/pdflens.git
   git push -u origin main
   ```

2. Ve a [vercel.com](https://vercel.com) → **Add New Project**

3. Importa tu repositorio de GitHub

4. Vercel detecta Vite automáticamente. Haz clic en **Deploy** ✅

5. En ~30 segundos tendrás una URL pública: `https://pdflens.vercel.app`

---

### Opción B — Vercel CLI (sin GitHub)

```bash
# Instala Vercel CLI globalmente
npm install -g vercel

# Dentro de la carpeta del proyecto
vercel

# Sigue las instrucciones en pantalla
# Al terminar obtienes la URL de producción
```

---

## 💻 Desarrollo local

```bash
# Instala dependencias
npm install

# Inicia servidor de desarrollo
npm run dev
# → http://localhost:5173

# Build de producción
npm run build

# Vista previa del build
npm run preview
```

---

## 📁 Estructura del proyecto

```
pdflens/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx        ← Componente principal con toda la lógica
│   └── main.jsx       ← Punto de entrada React
├── index.html
├── vite.config.js
├── vercel.json        ← Configuración para Vercel (SPA routing)
├── package.json
└── .gitignore
```

---

## ✨ Funcionalidades

- 🔐 Login / Crear cuenta
- 📂 Subida de PDF por drag & drop o explorador
- 🎨 Detección de perfil de color: **RGB** o **CMYK**
- 📐 Dimensiones de página en **centímetros**
- ⚖️ Peso del archivo
- 📄 Vista previa del documento
- 📋 Metadatos: versión PDF, páginas, cifrado

---

## 🛠️ Stack

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [Vercel](https://vercel.com/)
