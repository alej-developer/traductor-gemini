/**
 * Traductor Gemini Enterprise - Frontend Logic
 * Arquitectura modular y asincrónica para interacción con la API FastAPI,
 * integración con motor 3D Three.js, sintetizador de audio ambiental Web Audio API
 * y orquestación de microanimaciones mediante GSAP.
 */

// Estado global de la aplicación
const state = {
  languages: [],
  currentTranslation: null,
  history: [],
  isTranslating: false,
};

// Elementos DOM
const dom = {
  sourceLangSelect: document.getElementById('sourceLangSelect'),
  targetLangSelect: document.getElementById('targetLangSelect'),
  sourceTextInput: document.getElementById('sourceTextInput'),
  targetPlaceholder: document.getElementById('targetPlaceholder'),
  targetContent: document.getElementById('targetContent'),
  translateActionBtn: document.getElementById('translateActionBtn'),
  clearSourceBtn: document.getElementById('clearSourceBtn'),
  toneSelect: document.getElementById('toneSelect'),
  studyModeToggle: document.getElementById('studyModeToggle'),
  charCount: document.getElementById('charCount'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingMsg: document.getElementById('loadingMsg'),
  latencyBadge: document.getElementById('latencyBadge'),
  providerBadge: document.getElementById('providerBadge'),
  listenAudioBtn: document.getElementById('listenAudioBtn'),
  copyResultBtn: document.getElementById('copyResultBtn'),
  detectedSourceBadge: document.getElementById('detectedSourceBadge'),
  detectedSrcName: document.getElementById('detectedSrcName'),
  analysisSection: document.getElementById('analysisSection'),
  vocabCardsGrid: document.getElementById('vocabCardsGrid'),
  grammarNotesList: document.getElementById('grammarNotesList'),
  engineStatusBadge: document.getElementById('engineStatusBadge'),
  engineStatusText: document.getElementById('engineStatusText'),
  historyDrawerBtn: document.getElementById('historyDrawerBtn'),
  historyDrawer: document.getElementById('historyDrawer'),
  closeDrawerBtn: document.getElementById('closeDrawerBtn'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  historyListContainer: document.getElementById('historyListContainer'),
  historySearchInput: document.getElementById('historySearchInput'),
  toastNotification: document.getElementById('toastNotification'),
  exportAnkiBtn: document.getElementById('exportAnkiBtn'),
  exportMarkdownBtn: document.getElementById('exportMarkdownBtn'),
  ambientSoundBtn: document.getElementById('ambientSoundBtn'),
  soundBtnText: document.getElementById('soundBtnText'),
};

/**
 * Muestra notificación toast temporal
 */
function showToast(message, duration = 3000) {
  dom.toastNotification.textContent = message;
  dom.toastNotification.classList.add('show');
  setTimeout(() => {
    dom.toastNotification.classList.remove('show');
  }, duration);
}

/**
 * Inicializa idiomas y estado del motor desde la API
 */
async function initApp() {
  try {
    // 1. Cargar estado de salud y motor
    checkEngineHealth();

    // 2. Cargar catálogo de idiomas
    const resp = await fetch('/api/v1/languages');
    if (resp.ok) {
      state.languages = await resp.json();
      populateLanguageDropdowns();
    }

    // 3. Orquestación cinemática GSAP de entrada
    if (typeof gsap !== 'undefined') {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.app-header', { y: -25, opacity: 0, duration: 0.8 })
        .from('.toolbar-card', { y: 20, opacity: 0, duration: 0.7 }, '-=0.4')
        .from('.translation-grid', { y: 25, opacity: 0, duration: 0.8 }, '-=0.4');
    }
  } catch (err) {
    console.error('Error inicializando app:', err);
    dom.engineStatusText.textContent = 'Modo Offline / Servidor Inaccesible';
    dom.engineStatusBadge.className = 'status-pill status-fallback';
  }
}

/**
 * Comprueba salud del motor y disponibilidad de Gemini
 */
async function checkEngineHealth() {
  try {
    const res = await fetch('/health/ready');
    if (res.ok) {
      const data = await res.json();
      const geminiOnline = data.providers?.gemini?.available;
      if (geminiOnline) {
        dom.engineStatusText.textContent = `Google Gemini Activo (${data.providers.gemini.model})`;
        dom.engineStatusBadge.className = 'status-pill status-online';
      } else {
        dom.engineStatusText.textContent = 'Deep-Translator (Modo Fallback)';
        dom.engineStatusBadge.className = 'status-pill status-fallback';
      }
    }
  } catch (err) {
    dom.engineStatusText.textContent = 'Error de conexión';
    dom.engineStatusBadge.className = 'status-pill status-fallback';
  }
}

/**
 * Rellena los selectores de idioma
 */
function populateLanguageDropdowns() {
  dom.sourceLangSelect.innerHTML = '<option value="auto" selected>Detectar Idioma Automático</option>';
  dom.targetLangSelect.innerHTML = '';

  state.languages.forEach((lang) => {
    const optSrc = document.createElement('option');
    optSrc.value = lang.code;
    optSrc.textContent = `${lang.flag} ${lang.name} (${lang.native_name})`;
    dom.sourceLangSelect.appendChild(optSrc);

    const optTgt = document.createElement('option');
    optTgt.value = lang.code;
    optTgt.textContent = `${lang.flag} ${lang.name} (${lang.native_name})`;
    if (lang.code === 'es') {
      optTgt.selected = true;
    }
    dom.targetLangSelect.appendChild(optTgt);
  });
}

/**
 * Ejecuta la traducción conectando con /api/v1/translate
 */
async function performTranslation() {
  const text = dom.sourceTextInput.value.trim();
  if (!text) {
    showToast('Por favor, ingresa texto para traducir');
    dom.sourceTextInput.focus();
    return;
  }

  if (state.isTranslating) return;
  state.isTranslating = true;

  // Disparar ráfaga de viento en la escena 3D (Three.js)
  if (window.ForestScene?.triggerGust) {
    window.ForestScene.triggerGust(2.6, 3000);
  }

  dom.loadingOverlay.classList.remove('hidden');
  dom.loadingMsg.textContent = dom.studyModeToggle.checked
    ? 'Analizando con IA lingüística y extrayendo vocabulario...'
    : 'Traduciendo texto...';

  const payload = {
    text: text,
    source_lang: dom.sourceLangSelect.value,
    target_lang: dom.targetLangSelect.value,
    tone: dom.toneSelect.value,
    include_analysis: dom.studyModeToggle.checked,
  };

  try {
    const response = await fetch('/api/v1/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Fallo en la llamada de traducción');
    }

    const data = await response.json();
    state.currentTranslation = data;
    renderTranslationResult(data);
  } catch (error) {
    console.error('Error traduciendo:', error);
    showToast(`Error: ${error.message}`);
  } finally {
    state.isTranslating = false;
    dom.loadingOverlay.classList.add('hidden');
  }
}

/**
 * Renderiza el resultado de la traducción, metadatos y sección de estudio
 */
function renderTranslationResult(data) {
  // 1. Mostrar texto traducido con fade in suave
  dom.targetPlaceholder.classList.add('hidden');
  dom.targetContent.classList.remove('hidden');
  dom.targetContent.textContent = data.translated_text;

  if (typeof gsap !== 'undefined') {
    gsap.fromTo(dom.targetContent, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }

  // 2. Activar botones de acción
  dom.copyResultBtn.disabled = false;
  dom.listenAudioBtn.disabled = false;

  // 3. Metadatos de latencia y proveedor
  dom.latencyBadge.classList.remove('hidden');
  dom.latencyBadge.textContent = `${data.latency_ms}ms`;

  dom.providerBadge.classList.remove('hidden');
  dom.providerBadge.textContent = data.cached
    ? 'Caché'
    : (data.provider_used === 'gemini' ? 'Gemini AI' : 'Deep-Translator');

  // 4. Idioma detectado
  if (data.detected_source_lang && data.detected_source_lang !== 'auto') {
    dom.detectedSourceBadge.classList.remove('hidden');
    const matchedLang = state.languages.find((l) => l.code === data.detected_source_lang);
    dom.detectedSrcName.textContent = matchedLang ? matchedLang.name : data.detected_source_lang;
  } else {
    dom.detectedSourceBadge.classList.add('hidden');
  }

  // 5. Análisis pedagógico (Vocabulario & Gramática)
  const hasVocab = data.vocabulary && data.vocabulary.length > 0;
  const hasGrammar = data.grammar_notes && data.grammar_notes.length > 0;

  if (hasVocab || hasGrammar) {
    dom.analysisSection.classList.remove('hidden');
    renderVocabulary(data.vocabulary || []);
    renderGrammarNotes(data.grammar_notes || []);

    if (typeof gsap !== 'undefined') {
      gsap.from(dom.analysisSection, { opacity: 0, y: 30, duration: 0.6, ease: 'power3.out' });
      gsap.from('.vocab-card', { opacity: 0, y: 20, stagger: 0.07, duration: 0.5, ease: 'power2.out', delay: 0.2 });
      gsap.from('.grammar-card', { opacity: 0, y: 20, stagger: 0.09, duration: 0.5, ease: 'power2.out', delay: 0.3 });
    }
  } else {
    dom.analysisSection.classList.add('hidden');
  }
}

/**
 * Renderiza tarjetas interactivas de vocabulario
 */
function renderVocabulary(vocabList) {
  dom.vocabCardsGrid.innerHTML = '';
  if (vocabList.length === 0) {
    dom.vocabCardsGrid.innerHTML = '<p class="text-muted">No se extrajo vocabulario específico en este fragmento.</p>';
    return;
  }

  vocabList.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.innerHTML = `
      <div class="vocab-card-header">
        <span class="vocab-word">${escapeHtml(item.word)}</span>
        ${item.difficulty_cefr ? `<span class="cefr-badge">${escapeHtml(item.difficulty_cefr)}</span>` : ''}
      </div>
      ${item.phonetic ? `<div class="vocab-phonetic">${escapeHtml(item.phonetic)}</div>` : ''}
      ${item.part_of_speech ? `<div class="vocab-pos">${escapeHtml(item.part_of_speech)}</div>` : ''}
      <div class="vocab-def">${escapeHtml(item.translation_es)}</div>
      ${item.context_example ? `<div class="vocab-example">&ldquo;${escapeHtml(item.context_example)}&rdquo;</div>` : ''}
    `;
    dom.vocabCardsGrid.appendChild(card);
  });
}

/**
 * Renderiza notas gramaticales y pedagógicas
 */
function renderGrammarNotes(notes) {
  dom.grammarNotesList.innerHTML = '';
  if (notes.length === 0) {
    dom.grammarNotesList.innerHTML = '<p class="text-muted">No se detectaron notas gramaticales críticas.</p>';
    return;
  }

  notes.forEach((note) => {
    const card = document.createElement('div');
    card.className = 'grammar-card';
    card.innerHTML = `
      <div class="grammar-pattern">${escapeHtml(note.pattern_or_term)}</div>
      <div class="grammar-explanation">${escapeHtml(note.explanation)}</div>
      ${note.pedagogical_tip ? `<div class="grammar-tip"><strong>Consejo:</strong> ${escapeHtml(note.pedagogical_tip)}</div>` : ''}
    `;
    dom.grammarNotesList.appendChild(card);
  });
}

/**
 * Abre el cajón lateral de historial y solicita datos a la API
 */
async function openDrawer() {
  dom.historyDrawer.classList.add('open');
  dom.drawerBackdrop.classList.add('active');

  try {
    const res = await fetch('/api/v1/history?limit=30');
    if (res.ok) {
      state.history = await res.json();
      renderHistoryList(state.history);
    }
  } catch (err) {
    console.error('Error cargando historial:', err);
    dom.historyListContainer.innerHTML = '<div class="empty-history">Error al cargar historial.</div>';
  }
}

function closeDrawer() {
  dom.historyDrawer.classList.remove('open');
  dom.drawerBackdrop.classList.remove('active');
}

/**
 * Renderiza la lista de elementos en el historial
 */
function renderHistoryList(items) {
  dom.historyListContainer.innerHTML = '';
  if (items.length === 0) {
    dom.historyListContainer.innerHTML = '<div class="empty-history">No hay traducciones registradas aún.</div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'history-item-card';
    const dateStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    card.innerHTML = `
      <div class="history-item-meta">
        <span>${item.source_lang.toUpperCase()} &rarr; ${item.target_lang.toUpperCase()}</span>
        <span>${dateStr}</span>
      </div>
      <div class="history-item-orig">${escapeHtml(item.original_text)}</div>
      <div class="history-item-trans">${escapeHtml(item.translated_text)}</div>
    `;

    card.addEventListener('click', () => {
      dom.sourceTextInput.value = item.original_text;
      dom.sourceLangSelect.value = item.source_lang;
      dom.targetLangSelect.value = item.target_lang;
      dom.charCount.textContent = `${item.original_text.length} / 10,000 caracteres`;
      closeDrawer();
      performTranslation();
    });

    dom.historyListContainer.appendChild(card);
  });
}

/**
 * Síntesis de voz Web Speech API
 */
function speakTranslatedText() {
  if (!state.currentTranslation || !('speechSynthesis' in window)) {
    showToast('Síntesis de voz no disponible en este navegador');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(state.currentTranslation.translated_text);
  utterance.lang = dom.targetLangSelect.value;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
  showToast('Reproduciendo audio...');
}

/**
 * Copiar texto al portapapeles
 */
async function copyResult() {
  if (!state.currentTranslation) return;
  try {
    await navigator.clipboard.writeText(state.currentTranslation.translated_text);
    showToast('Traducción copiada al portapapeles');
  } catch (err) {
    showToast('No se pudo copiar automáticamente');
  }
}

/**
 * Escapar HTML para prevenir inyecciones
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==============================================================================
// Controladores de Eventos
// ==============================================================================

// Botón de traducción principal
dom.translateActionBtn.addEventListener('click', performTranslation);

// Atajo de teclado: Ctrl + Enter / Cmd + Enter
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    performTranslation();
  }
  if (e.key === 'Escape' && dom.historyDrawer.classList.contains('open')) {
    closeDrawer();
  }
});

// Contador de caracteres
dom.sourceTextInput.addEventListener('input', () => {
  const len = dom.sourceTextInput.value.length;
  dom.charCount.textContent = `${len.toLocaleString()} / 10,000 caracteres`;
});

// Limpiar campo
dom.clearSourceBtn.addEventListener('click', () => {
  dom.sourceTextInput.value = '';
  dom.charCount.textContent = '0 / 10,000 caracteres';
  dom.sourceTextInput.focus();
});

// Botones de prueba rápida
document.querySelectorAll('.sample-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    dom.sourceTextInput.value = btn.dataset.text;
    dom.targetLangSelect.value = btn.dataset.target;
    dom.charCount.textContent = `${btn.dataset.text.length} / 10,000 caracteres`;
    performTranslation();
  });
});

// Reproducir audio y copiar
dom.listenAudioBtn.addEventListener('click', speakTranslatedText);
dom.copyResultBtn.addEventListener('click', copyResult);

// Conmutador de Sonido Ambiental Procedural
if (dom.ambientSoundBtn) {
  dom.ambientSoundBtn.addEventListener('click', () => {
    if (window.forestAudio) {
      const isPlaying = window.forestAudio.toggle();
      dom.ambientSoundBtn.classList.toggle('active', isPlaying);
      dom.soundBtnText.textContent = isPlaying ? 'Ambiente: Activo' : 'Ambiente';
      showToast(isPlaying ? 'Sonido de bosque activado' : 'Sonido ambiental silenciado');
    }
  });
}

// Drawer de historial
dom.historyDrawerBtn.addEventListener('click', openDrawer);
dom.closeDrawerBtn.addEventListener('click', closeDrawer);
dom.drawerBackdrop.addEventListener('click', closeDrawer);

// Búsqueda en historial
dom.historySearchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = state.history.filter(
    (item) =>
      item.original_text.toLowerCase().includes(query) ||
      item.translated_text.toLowerCase().includes(query)
  );
  renderHistoryList(filtered);
});

// Descargas directas
dom.exportAnkiBtn.addEventListener('click', () => {
  window.open('/api/v1/export/anki', '_blank');
});
dom.exportMarkdownBtn.addEventListener('click', () => {
  window.open('/api/v1/export/markdown', '_blank');
});

// Movimiento del foco de iluminación ambiental (Spotlight)
document.addEventListener('mousemove', (e) => {
  document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
  document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
});

// Inicialización automática
document.addEventListener('DOMContentLoaded', initApp);
