const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'nousresearch/deephermes-3-llama-3-8b-preview:free',
  'nvidia/llama-3.1-nemotron-nano-8b-v1:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1-0528:free'
];

const SYSTEM_PROMPT = `Kamu adalah CyChat, seorang psikolog virtual yang ramah, empatik, dan suportif. Spesialisasimu adalah membantu remaja dan dewasa muda usia 20-27 tahun yang mengalami stres akibat beban kehidupan.

Panduan perilaku:
- Gunakan bahasa Indonesia yang santai, hangat, dan tidak menggurui.
- Panggil user dengan "kamu" dan posisikan diri sebagai teman yang mendengarkan.
- Selalu validasi perasaan user terlebih dahulu sebelum memberikan saran.
- Gunakan pendekatan berbasis CBT (Cognitive Behavioral Therapy) dan mindfulness.
- Berikan saran yang praktis, actionable, dan relevan untuk anak muda.
- Jika user menunjukkan tanda-tanda bahaya (self-harm, suicidal thought), dorong mereka untuk menghubungi profesional: Into The Light Indonesia (119 ext. 8), atau LSM Jangan Bunuh Diri (021-9696 9293).
- Jangan pernah mendiagnosis. Kamu bukan pengganti psikolog profesional.
- Gunakan emoji secukupnya untuk membuat percakapan terasa lebih ramah.
- Jawab dengan singkat dan personal, hindari respons yang terlalu panjang kecuali diminta.
- Topik yang sering muncul: burnout kuliah/kerja, Quarter Life Crisis, tekanan keluarga, masalah finansial, kesepian, overthinking, kecemasan sosial, patah hati, insecurity, dan quarter-life crisis.`;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  apiKey: '',
  chats: JSON.parse(localStorage.getItem('cychat_chats') || '[]'),
  activeChatId: null
};

let els = {};

async function loadEnv() {
  try {
    const res = await fetch('.env', { cache: 'no-store' });
    const text = await res.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim();
      if (key === 'OPENROUTER_API_KEY') {
        state.apiKey = val;
      }
    }
  } catch (e) {
    console.log('.env not found, checking config.js...');
  }

  if (!state.apiKey && typeof CONFIG !== 'undefined' && CONFIG.OPENROUTER_API_KEY) {
    state.apiKey = CONFIG.OPENROUTER_API_KEY;
    console.log('API key loaded from config.js');
  }
}

function saveChats() {
  localStorage.setItem('cychat_chats', JSON.stringify(state.chats));
}

function showToast(msg) {
  const existing = $('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  els.app.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 2500);
}

function openSidebar() {
  els.sidebar.classList.add('open');
  els.sidebarOverlay.classList.add('active');
}

function closeSidebar() {
  els.sidebar.classList.remove('open');
  els.sidebarOverlay.classList.remove('active');
}

function showScreen(screen) {
  els.welcomeScreen.classList.remove('active');
  els.chatScreen.classList.remove('active');
  screen.classList.add('active');
}

function createChat(firstMessage) {
  const chat = {
    id: Date.now().toString(),
    title: firstMessage.slice(0, 40),
    messages: [],
    createdAt: new Date().toISOString()
  };
  state.chats.unshift(chat);
  state.activeChatId = chat.id;
  saveChats();
  renderChatHistory();
  return chat;
}

function getActiveChat() {
  return state.chats.find(c => c.id === state.activeChatId);
}

function renderChatHistory() {
  els.chatHistory.innerHTML = '';
  state.chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = `chat-history-item${chat.id === state.activeChatId ? ' active' : ''}`;
    item.innerHTML = `
      <span class="item-title">${escapeHtml(chat.title)}</span>
      <button class="item-delete" aria-label="Hapus">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;
    item.querySelector('.item-title').addEventListener('click', () => {
      state.activeChatId = chat.id;
      renderChatHistory();
      renderMessages();
      showScreen(els.chatScreen);
      closeSidebar();
    });
    item.querySelector('.item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    });
    els.chatHistory.appendChild(item);
  });
}

function deleteChat(id) {
  state.chats = state.chats.filter(c => c.id !== id);
  saveChats();
  if (state.activeChatId === id) {
    state.activeChatId = null;
    showScreen(els.welcomeScreen);
  }
  renderChatHistory();
}

function clearAllChats() {
  state.chats = [];
  state.activeChatId = null;
  saveChats();
  renderChatHistory();
  showScreen(els.welcomeScreen);
  closeSidebar();
  showToast('Semua chat dihapus');
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function parseMarkdown(text) {
  const codeBlocks = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return placeholder;
  });

  const inlineCodes = [];
  processed = processed.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `__INLINE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });

  processed = escapeHtml(processed);

  codeBlocks.forEach((block, i) => {
    processed = processed.replace(`__CODEBLOCK_${i}__`, block);
  });
  inlineCodes.forEach((code, i) => {
    processed = processed.replace(`__INLINE_${i}__`, code);
  });

  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');

  const lines = processed.split('\n');
  let result = [];
  let inList = false;
  let listType = '';
  let listIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const h3Match = line.match(/^#{3,}\s+(.*)/);
    const h2Match = line.match(/^##\s+(.*)/);
    const h1Match = line.match(/^#\s+(.*)/);

    if (h3Match) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      result.push(`<h4>${h3Match[1]}</h4>`);
      continue;
    }
    if (h2Match) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      result.push(`<h3>${h2Match[1]}</h3>`);
      continue;
    }
    if (h1Match) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      result.push(`<h3>${h1Match[1]}</h3>`);
      continue;
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      result.push('<hr>');
      continue;
    }

    const ulMatch = line.match(/^\s*[\-\*]\s+(.*)/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)/);
    const indentSpaces = line.match(/^(\s*)/)[1].length;

    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      if (line.trim() === '') {
        result.push('<br>');
      } else if (line.includes('__CODEBLOCK_')) {
        result.push(line);
      } else {
        result.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) result.push(`</${listType}>`);

  return result.join('');
}

function renderMessages() {
  const chat = getActiveChat();
  if (!chat) return;

  els.messagesContainer.innerHTML = '';

  chat.messages.forEach((msg, idx) => {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;

    if (msg.role === 'bot') {
      row.innerHTML = `
        <div class="bot-avatar">
          <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="20" fill="url(#avgrad)"/>
            <path d="M12 20C12 15.58 15.58 12 20 12C22.4 12 24.6 13.1 26 14.8" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <circle cx="20" cy="20" r="2.5" fill="white"/>
            <path d="M28 20C28 24.42 24.42 28 20 28C17.6 28 15.4 26.9 14 25.2" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <defs><linearGradient id="avgrad" x1="0" y1="0" x2="40" y2="40"><stop stop-color="#7c9a8e"/><stop offset="1" stop-color="#5f7d71"/></linearGradient></defs>
          </svg>
        </div>
        <div>
          <div class="message-bubble${msg.error ? ' error-bubble' : ''}">${msg.error ? escapeHtml(msg.content) : parseMarkdown(msg.content)}</div>
          <div class="message-actions">
            <button class="action-btn copy-btn" aria-label="Salin" data-idx="${idx}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
      `;
    } else {
      row.innerHTML = `<div class="message-bubble">${escapeHtml(msg.content)}</div>`;
    }

    els.messagesContainer.appendChild(row);
  });

  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
  });
}

function addTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typingIndicator';
  indicator.innerHTML = `
    <div class="bot-avatar">
      <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="20" fill="url(#avgrad2)"/>
        <path d="M12 20C12 15.58 15.58 12 20 12C22.4 12 24.6 13.1 26 14.8" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="2.5" fill="white"/>
        <path d="M28 20C28 24.42 24.42 28 20 28C17.6 28 15.4 26.9 14 25.2" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <defs><linearGradient id="avgrad2" x1="0" y1="0" x2="40" y2="40"><stop stop-color="#7c9a8e"/><stop offset="1" stop-color="#5f7d71"/></linearGradient></defs>
      </svg>
    </div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  els.messagesContainer.appendChild(indicator);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = $('#typingIndicator');
  if (indicator) indicator.remove();
}

async function callApi(messages) {
  let lastError = '';
  for (let i = 0; i < FREE_MODELS.length; i++) {
    try {
      console.log(`Mencoba model: ${FREE_MODELS[i]}`);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'CyChat'
        },
        body: JSON.stringify({
          model: FREE_MODELS[i],
          messages: messages,
          temperature: 0.7,
          max_tokens: 4096
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || '';
        if (text) {
          console.log(`Berhasil dengan model: ${FREE_MODELS[i]}`);
          return { success: true, text };
        }
      }

      const err = await response.json().catch(() => ({}));
      lastError = err?.error?.message || `Error ${response.status}`;
      console.log(`Model ${FREE_MODELS[i]} gagal: ${lastError}`);
      continue;
    } catch (e) {
      lastError = e.message;
      console.log(`Model ${FREE_MODELS[i]} error: ${e.message}`);
      continue;
    }
  }

  return { success: false, text: `Semua model gagal. Error terakhir: ${lastError}` };
}

async function sendMessage(text) {
  if (!text.trim()) return;
  if (!state.apiKey || state.apiKey === 'TARUH_OPENROUTER_KEY_DISINI') {
    showToast('Taruh API key OpenRouter di file .env dulu');
    return;
  }

  let chat = getActiveChat();
  if (!chat) {
    chat = createChat(text);
    showScreen(els.chatScreen);
  }

  chat.messages.push({ role: 'user', content: text.trim() });
  saveChats();
  renderMessages();

  els.chatInput.value = '';
  els.btnSendChat.disabled = true;

  addTypingIndicator();

  try {
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chat.messages.map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    const result = await callApi(apiMessages);
    removeTypingIndicator();

    chat.messages.push({
      role: 'bot',
      content: result.text,
      error: !result.success
    });

    saveChats();
    renderMessages();
  } catch (err) {
    removeTypingIndicator();
    chat.messages.push({ role: 'bot', content: `Gagal menghubungi API: ${err.message}`, error: true });
    saveChats();
    renderMessages();
  }
}

function setupInputHandlers(input, btn) {
  input.addEventListener('input', () => {
    btn.disabled = !input.value.trim();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && input.value.trim()) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });
  btn.addEventListener('click', () => {
    if (input.value.trim()) sendMessage(input.value);
  });
}

async function init() {
  els = {
    welcomeScreen: $('#welcomeScreen'),
    chatScreen: $('#chatScreen'),
    sidebar: $('#sidebar'),
    sidebarOverlay: $('#sidebarOverlay'),
    chatHistory: $('#chatHistory'),
    messagesContainer: $('#messagesContainer'),
    welcomeInput: $('#welcomeInput'),
    chatInput: $('#chatInput'),
    btnSendWelcome: $('#btnSendWelcome'),
    btnSendChat: $('#btnSendChat'),
    app: $('#app')
  };

  await loadEnv();

  setupInputHandlers(els.welcomeInput, els.btnSendWelcome);
  setupInputHandlers(els.chatInput, els.btnSendChat);

  $('#btnOpenSidebar').addEventListener('click', openSidebar);
  $('#btnCloseSidebar').addEventListener('click', closeSidebar);
  els.sidebarOverlay.addEventListener('click', closeSidebar);

  $('#btnBack').addEventListener('click', () => {
    state.activeChatId = null;
    showScreen(els.welcomeScreen);
    els.welcomeInput.value = '';
    els.btnSendWelcome.disabled = true;
  });

  $('#btnNewChat').addEventListener('click', () => {
    state.activeChatId = null;
    showScreen(els.welcomeScreen);
    closeSidebar();
    els.welcomeInput.value = '';
    els.btnSendWelcome.disabled = true;
  });

  $('#btnDeleteChat').addEventListener('click', () => {
    if (state.activeChatId) deleteChat(state.activeChatId);
  });

  $('#btnClearAll').addEventListener('click', clearAllChats);

  $$('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => sendMessage(chip.dataset.prompt));
  });

  els.messagesContainer.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      const idx = parseInt(copyBtn.dataset.idx);
      const chat = getActiveChat();
      if (chat && chat.messages[idx]) {
        navigator.clipboard.writeText(chat.messages[idx].content).then(() => {
          copyBtn.classList.add('copied');
          showToast('Disalin ✓');
          setTimeout(() => copyBtn.classList.remove('copied'), 2000);
        });
      }
    }
  });

  renderChatHistory();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
}

document.addEventListener('DOMContentLoaded', init);
