# Traductor Gemini Enterprise

[![CI Pipeline](https://github.com/alej-developer/traductor-gemini/actions/workflows/ci.yml/badge.svg)](https://github.com/alej-developer/traductor-gemini/actions/workflows/ci.yml)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Code Style: Ruff](https://img.shields.io/badge/Code%20Style-Ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![Checked with mypy](https://img.shields.io/badge/mypy-checked-blue)](https://mypy-lang.org/)

Plataforma empresarial de traducción multilingüe de alta fidelidad, análisis gramatical y extracción pedagógica de vocabulario asistida por **Google Gemini AI** y **Deep-Translator**, diseñada bajo principios de **Clean Architecture**, resiliencia y estándares de ingeniería senior.

---

## Características Principales

* **Motor Híbrido Resiliente (Multi-Provider):**
  * **Google Gemini AI (`google-genai` SDK):** Traducciones contextuales con modismos, selección de tonos (literario, formal, casual, académico) y disección pedagógica.
  * **Deep-Translator Fallback:** Degradación elegante automática sin caídas de servicio ante cuotas agotadas o falta de conexión con la IA.
* **Modo Estudio y Extracción Lingüística:**
  * Desglose instantáneo de palabras clave con pronunciación fonética (IPA), categoría gramatical, nivel MCER aproximado (A1-C2) y ejemplos contextuales.
  * Identificación de patrones gramaticales y advertencias sobre *falsos amigos* culturales.
* **Caché Determinista y Persistencia:**
  * Capa de caché en memoria con hasheo SHA256 determinista para respuestas en sub-milisegundos.
  * Base de datos asincrónica (SQLAlchemy 2.0 + SQLite/aiosqlite) para almacenar el historial de consultas.
* **Herramientas de Estudio (Anki y Markdown):**
  * Exportación con un solo clic a mazos compatibles con **Anki** (`.tsv`) para repetición espaciada.
  * Exportación de cuadernos de notas formateados en **Markdown** (`.md`).
* **Experiencia Multicanal:**
  * **Web App Moderna:** Interfaz con diseño glassmorphism, paleta HSL balanceada, dark mode, síntesis de voz (Web Speech API) y atajos de teclado (`Ctrl + Enter`).
  * **CLI / Terminal:** Consola enriquecida con `rich`, tablas visuales y menús ergonómicos.
* **DevOps y Calidad de Código:**
  * Gestor moderno de paquetes con `uv` (resolución en milisegundos).
  * Linter y formateador ultrarrápido con `ruff`.
  * Verificación de tipos estática con `mypy`.
  * Suite de pruebas automatizadas con `pytest` y cobertura de código.
  * Contenedorización `Dockerfile` multi-stage (usuario no-root seguro) y orquestación con `docker-compose.yml`.
  * Pipeline de Integración Continua (CI) en **GitHub Actions**.

---

## Arquitectura del Sistema (Clean Architecture)

```text
traductor-gemini/
├── src/
│   ├── domain/               # Entidades de negocio, Value Objects y Puertos (Interfaces)
│   │   ├── models.py         # TranslationRequest, TranslationResponse, VocabularyItem
│   │   └── ports.py          # ITranslationProvider, ICacheRepository, IHistoryRepository
│   ├── application/          # Casos de uso y orquestador
│   │   ├── engine.py         # Orquestador multi-proveedor con fallback y caché
│   │   └── use_cases/        # translate_text.py, export_cards.py
│   ├── infrastructure/       # Implementaciones técnicas y adaptadores
│   │   ├── config.py         # Configuración tipada con Pydantic Settings
│   │   ├── languages.py      # Catálogo de idiomas con metadatos y códigos ISO
│   │   ├── providers/        # gemini_provider.py, deep_translator_provider.py
│   │   ├── cache/            # memory_cache.py (hasheo determinista y TTL)
│   │   └── database/         # models_orm.py, session.py, history_repo.py
│   └── presentation/         # Clientes y puntos de entrada
│       └── api/              # FastAPI app, routers v1, healthchecks y static mounting
├── static/                   # Frontend Web App (HTML5, CSS3 Glassmorphism, JS moderno)
├── tests/                    # Suite de pruebas automatizadas (Domain, Cache, Engine, API)
├── .github/workflows/        # Pipeline CI en GitHub Actions
├── pyproject.toml            # Configuración unificada (uv, ruff, mypy, pytest)
├── Dockerfile                # Multi-stage Dockerfile para producción
├── docker-compose.yml        # Orquestación de servicios (API + Redis)
└── traductor.py              # CLI interactivo y lanzador del servidor (--serve)
```

---

## Instalación y Puesta en Marcha

### Prerrequisitos
* Python 3.11+
* [uv](https://github.com/astral-sh/uv) (Recomendado) o `pip` estándar

### 1. Clonar el Repositorio
```bash
git clone https://github.com/alej-developer/traductor-gemini.git
cd traductor-gemini
```

### 2. Configuración del Entorno
Copia la plantilla de variables de entorno:
```bash
cp .env.example .env
```
Edita `.env` e introduce tu clave de API si deseas activar Gemini AI:
```env
GEMINI_API_KEY=tu_api_key_de_google_gemini
GEMINI_MODEL=gemini-2.5-flash
```
*(Nota: Si no configuras una API key, el sistema funcionará automáticamente en modo fallback usando `deep-translator` sin interrupciones).*

### 3. Instalar Dependencias
Con **uv**:
```bash
uv sync
```

---

## Modos de Uso

### Modo 1: Aplicación Web Interactiva y API REST
Inicia el servidor backend y la interfaz gráfica web en un solo comando:
```bash
# Opción directa:
uv run python traductor.py --serve

# O mediante uvicorn:
uv run uvicorn src.presentation.api.main:app --reload --port 8000
```
* **Interfaz Web:** Abre tu navegador en [http://localhost:8000](http://localhost:8000)
* **Documentación OpenAPI / Swagger:** Disponible en [http://localhost:8000/docs](http://localhost:8000/docs)
* **Comprobación de Salud:** [http://localhost:8000/health/ready](http://localhost:8000/health/ready)

### Modo 2: Consola Interactiva (CLI)
Para utilizar la aplicación en la terminal con tablas y estilos de `rich`:
```bash
uv run python traductor.py
```

### Modo 3: Contenedor Docker y Docker Compose
Para desplegar la aplicación completa con caché en producción:
```bash
docker-compose up --build -d
```

---

## Pruebas y Calidad de Código

El proyecto incluye una suite completa de pruebas unitarias y de integración:

```bash
# Ejecutar todas las pruebas con reporte de cobertura
uv run pytest

# Ejecutar el linter
uv run ruff check .

# Formatear el código automáticamente
uv run ruff format .

# Verificación de tipos estática
uv run mypy src
```

---

## Autor y Agradecimientos
* **Desarrollador:** Alejandro Peña
* **Arquitectura:** Pair-programming y diseño asistido por **Google Gemini**