/**
 * High-End AI Q&A Web Application Controller
 * Handles real-time streaming, conversation sessions, Markdown parsing, and syntax highlighting.
 */

class AIChatApp {
  constructor() {
    this.currentSessionId = null;
    this.sessions = [];
    this.isGenerating = false;
    this.abortController = null;

    // DOM Elements
    this.sidebar = document.getElementById("sidebar");
    this.sidebarOverlay = document.getElementById("sidebar-overlay");
    this.sessionsList = document.getElementById("sessions-list");
    this.chatContainer = document.getElementById("chat-container");
    this.emptyState = document.getElementById("empty-state");
    this.messagesFeed = document.getElementById("messages-feed");
    this.chatTitle = document.getElementById("active-chat-title");
    this.messageInput = document.getElementById("message-input");
    this.sendBtn = document.getElementById("send-btn");
    this.sendIcon = document.getElementById("send-icon");
    this.stopIcon = document.getElementById("stop-icon");
    this.newChatBtn = document.getElementById("new-chat-btn");
    this.clearChatBtn = document.getElementById("clear-chat-btn");
    this.mobileMenuBtn = document.getElementById("mobile-menu-btn");
    this.closeSidebarBtn = document.getElementById("close-sidebar-btn");
    this.inputContainer = document.getElementById("input-container");
    this.inputCenterSlot = document.getElementById("input-center-slot");
    this.inputBottomSlot = document.getElementById("input-bottom-slot");

    this.init();
  }

  init() {
    this.configureMarked();
    this.bindEvents();
    this.updateInputPosition(true);
    this.loadSessions();
  }

  updateInputPosition(isEmpty) {
    if (!this.inputContainer || !this.inputCenterSlot || !this.inputBottomSlot) return;
    if (isEmpty) {
      if (!this.inputCenterSlot.contains(this.inputContainer)) {
        this.inputCenterSlot.appendChild(this.inputContainer);
        this.inputBottomSlot.classList.add("hidden");
      }
    } else {
      if (!this.inputBottomSlot.contains(this.inputContainer)) {
        this.inputBottomSlot.appendChild(this.inputContainer);
        this.inputBottomSlot.classList.remove("hidden");
      }
    }
  }

  configureMarked() {
    // Configure marked to format code blocks cleanly
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false,
    });
  }

  bindEvents() {
    // Input submit on Enter (Shift+Enter for new line)
    this.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    // Auto-resizing textarea
    this.messageInput.addEventListener("input", () => {
      this.autoResizeTextarea();
    });

    // Send / Stop button click
    this.sendBtn.addEventListener("click", () => {
      if (this.isGenerating) {
        this.stopGeneration();
      } else {
        this.handleSubmit();
      }
    });

    // New Chat buttons & shortcut
    this.newChatBtn.addEventListener("click", () => this.createNewSession());
    this.clearChatBtn.addEventListener("click", () => this.clearCurrentChat());

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.createNewSession();
      }
    });

    // Mobile sidebar toggle
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.addEventListener("click", () => this.toggleMobileSidebar(true));
    }
    if (this.closeSidebarBtn) {
      this.closeSidebarBtn.addEventListener("click", () => this.toggleMobileSidebar(false));
    }
    if (this.sidebarOverlay) {
      this.sidebarOverlay.addEventListener("click", () => this.toggleMobileSidebar(false));
    }

    // Quick starter prompt cards
    document.querySelectorAll(".quick-prompt-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const prompt = btn.getAttribute("data-prompt");
        if (prompt) {
          this.messageInput.value = prompt;
          this.autoResizeTextarea();
          this.handleSubmit();
        }
      });
    });
  }

  autoResizeTextarea() {
    this.messageInput.style.height = "auto";
    const newHeight = Math.min(this.messageInput.scrollHeight, 180);
    this.messageInput.style.height = `${Math.max(48, newHeight)}px`;
  }

  toggleMobileSidebar(open) {
    if (!this.sidebar) return;
    if (open) {
      this.sidebar.classList.remove("-translate-x-full");
      this.sidebarOverlay.classList.remove("hidden");
    } else {
      this.sidebar.classList.add("-translate-x-full");
      this.sidebarOverlay.classList.add("hidden");
    }
  }

  async loadSessions() {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      this.sessions = await res.json();
      this.renderSessionsList();
    } catch (err) {
      console.error("Error loading chat sessions:", err);
    }
  }

  groupSessionsByDate(sessions) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups = {
      "Hari Ini": [],
      "Kemarin": [],
      "7 Hari Terakhir": [],
      "Lebih Lama": [],
    };

    sessions.forEach((s) => {
      const date = new Date(s.created_at);
      if (date >= today) {
        groups["Hari Ini"].push(s);
      } else if (date >= yesterday) {
        groups["Kemarin"].push(s);
      } else if (date >= sevenDaysAgo) {
        groups["7 Hari Terakhir"].push(s);
      } else {
        groups["Lebih Lama"].push(s);
      }
    });

    return groups;
  }

  renderSessionsList() {
    if (!this.sessionsList) return;
    this.sessionsList.innerHTML = "";

    if (this.sessions.length === 0) {
      this.sessionsList.innerHTML = `
        <div class="px-3 py-6 text-center text-xs text-zinc-500">
          Belum ada riwayat obrolan.<br>Mulai percakapan baru!
        </div>
      `;
      return;
    }

    const grouped = this.groupSessionsByDate(this.sessions);

    Object.entries(grouped).forEach(([groupName, items]) => {
      if (items.length === 0) return;

      const groupHeader = document.createElement("div");
      groupHeader.className = "px-3 pt-4 pb-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider";
      groupHeader.textContent = groupName;
      this.sessionsList.appendChild(groupHeader);

      items.forEach((session) => {
        const item = document.createElement("div");
        const isActive = this.currentSessionId === session.id;

        item.className = `group relative flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer transition-all ${
          isActive
            ? "bg-zinc-800 text-zinc-100 font-medium shadow-sm"
            : "text-zinc-400 hover:bg-zinc-900/90 hover:text-zinc-200"
        }`;

        item.innerHTML = `
          <div class="flex items-center gap-2.5 truncate w-full pr-7">
            <svg class="w-4 h-4 shrink-0 ${isActive ? "text-sky-400" : "text-zinc-500"}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span class="truncate" title="${this.escapeHtml(session.title)}">${this.escapeHtml(session.title)}</span>
          </div>
          <button 
            type="button" 
            class="delete-session-btn absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-700/50 transition-all"
            title="Hapus obrolan"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        `;

        item.addEventListener("click", () => {
          this.switchSession(session.id);
          this.toggleMobileSidebar(false);
        });

        const deleteBtn = item.querySelector(".delete-session-btn");
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.deleteSession(session.id);
        });

        this.sessionsList.appendChild(item);
      });
    });
  }

  async switchSession(sessionId) {
    if (this.isGenerating) return;
    this.currentSessionId = sessionId;

    const currentSession = this.sessions.find((s) => s.id === sessionId);
    if (currentSession) {
      this.chatTitle.textContent = currentSession.title;
    }

    this.renderSessionsList();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const messages = await res.json();
      this.renderConversation(messages);
    } catch (err) {
      console.error("Error switching session:", err);
    }
  }

  renderConversation(messages) {
    this.messagesFeed.innerHTML = "";
    if (messages.length === 0) {
      this.emptyState.classList.remove("hidden");
      this.updateInputPosition(true);
    } else {
      this.emptyState.classList.add("hidden");
      this.updateInputPosition(false);
      messages.forEach((msg) => {
        if (msg.role === "user") {
          this.appendUserMessage(msg.content);
        } else {
          this.appendAssistantMessage(msg.content, false);
        }
      });
      this.highlightAndFormatCodeBlocks();
      this.scrollToBottom();
    }
  }

  createNewSession() {
    if (this.isGenerating) return;
    this.currentSessionId = null;
    this.chatTitle.textContent = "Obrolan Baru";
    this.messagesFeed.innerHTML = "";
    this.emptyState.classList.remove("hidden");
    this.updateInputPosition(true);
    this.renderSessionsList();
    this.messageInput.value = "";
    this.autoResizeTextarea();
    this.messageInput.focus();
    this.toggleMobileSidebar(false);
  }

  async clearCurrentChat() {
    if (this.currentSessionId) {
      await this.deleteSession(this.currentSessionId);
    } else {
      this.createNewSession();
    }
  }

  async deleteSession(sessionId) {
    if (this.isGenerating && this.currentSessionId === sessionId) {
      this.stopGeneration();
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        if (this.currentSessionId === sessionId) {
          this.createNewSession();
        }
        await this.loadSessions();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  }

  handleSubmit() {
    const text = this.messageInput.value.trim();
    if (!text || this.isGenerating) return;

    this.messageInput.value = "";
    this.autoResizeTextarea();
    this.sendMessage(text);
  }

  appendUserMessage(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "flex justify-end animate-fade-in";
    wrapper.innerHTML = `
      <div class="max-w-[85%] sm:max-w-[72%] w-fit rounded-2xl rounded-tr-sm bg-zinc-800/90 text-zinc-100 px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-sm whitespace-pre-wrap break-words text-[0.93rem] leading-snug border border-zinc-700/60">
        ${this.escapeHtml(text)}
      </div>
    `;
    this.messagesFeed.appendChild(wrapper);
    this.scrollToBottom();
  }

  createAssistantBubble() {
    const wrapper = document.createElement("div");
    wrapper.className = "flex items-start gap-3 animate-fade-in";
    wrapper.innerHTML = `
      <div class="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-sky-500/10 mt-0.5">
        <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div class="assistant-content flex-1 overflow-hidden prose-dark min-h-[28px] pt-0">
        <span class="typing-cursor"></span>
      </div>
    `;
    this.messagesFeed.appendChild(wrapper);
    this.scrollToBottom();
    return wrapper.querySelector(".assistant-content");
  }

  appendAssistantMessage(markdownContent, animateCursor = false) {
    const container = this.createAssistantBubble();
    container.innerHTML = marked.parse(markdownContent);
    return container;
  }

  async sendMessage(promptText) {
    this.emptyState.classList.add("hidden");
    this.updateInputPosition(false);
    this.appendUserMessage(promptText);

    const assistantBubble = this.createAssistantBubble();
    this.setGeneratingState(true);

    this.abortController = new AbortController();
    let accumulatedText = "";

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: this.currentSessionId,
          message: promptText,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP Error ${response.status}`);
      }

      // Read session metadata headers
      const resSessionId = response.headers.get("X-Session-Id");
      const resSessionTitle = response.headers.get("X-Session-Title");

      if (resSessionId && !this.currentSessionId) {
        this.currentSessionId = resSessionId;
        if (resSessionTitle) {
          this.chatTitle.textContent = resSessionTitle;
        }
        this.loadSessions();
      }

      // Stream body tokens via ReadableStream getReader()
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // Dynamic Markdown rendering with blinking typing cursor
        assistantBubble.innerHTML =
          marked.parse(accumulatedText) + '<span class="typing-cursor"></span>';
        this.scrollToBottom();
      }

      // Stream successfully finished
      assistantBubble.innerHTML = marked.parse(accumulatedText);
    } catch (err) {
      if (err.name === "AbortError") {
        assistantBubble.innerHTML =
          marked.parse(accumulatedText) +
          '\n\n<span class="text-xs text-zinc-500 italic block mt-2">[Respon dihentikan oleh pengguna]</span>';
      } else {
        console.error("Streaming error:", err);
        assistantBubble.innerHTML =
          marked.parse(accumulatedText) +
          `\n\n<div class="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm"><strong>Kesalahan Streaming:</strong> ${this.escapeHtml(
            err.message
          )}</div>`;
      }
    } finally {
      this.setGeneratingState(false);
      this.highlightAndFormatCodeBlocks();
      this.scrollToBottom();
      this.loadSessions();
    }
  }

  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  setGeneratingState(generating) {
    this.isGenerating = generating;
    if (generating) {
      this.sendIcon.classList.add("hidden");
      this.stopIcon.classList.remove("hidden");
      this.sendBtn.setAttribute("title", "Hentikan pembuatan respon");
      this.sendBtn.classList.add("bg-red-600", "hover:bg-red-500");
      this.sendBtn.classList.remove("bg-sky-500", "hover:bg-sky-400");
    } else {
      this.sendIcon.classList.remove("hidden");
      this.stopIcon.classList.add("hidden");
      this.sendBtn.setAttribute("title", "Kirim pesan");
      this.sendBtn.classList.remove("bg-red-600", "hover:bg-red-500");
      this.sendBtn.classList.add("bg-sky-500", "hover:bg-sky-400");
    }
  }

  highlightAndFormatCodeBlocks() {
    const codeBlocks = this.messagesFeed.querySelectorAll("pre code:not(.hljs)");
    codeBlocks.forEach((codeEl) => {
      // Extract language class e.g. language-python
      const pre = codeEl.parentElement;
      if (pre.parentElement.classList.contains("code-block-wrapper")) {
        return;
      }

      let lang = "code";
      const match = codeEl.className.match(/language-([a-z0-9_-]+)/i);
      if (match) {
        lang = match[1];
      }

      // Apply syntax highlighting
      try {
        hljs.highlightElement(codeEl);
      } catch (e) {
        console.warn("Highlight.js warning:", e);
      }

      // Wrap in custom dark terminal bar
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";

      const header = document.createElement("div");
      header.className = "code-header";
      header.innerHTML = `
        <span class="font-medium text-xs text-zinc-400">${this.escapeHtml(lang)}</span>
        <button class="copy-button" type="button">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <span class="copy-label">Salin</span>
        </button>
      `;

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      const copyBtn = header.querySelector(".copy-button");
      copyBtn.addEventListener("click", () => {
        const textToCopy = codeEl.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.classList.add("copied");
          copyBtn.querySelector(".copy-label").textContent = "Tersalin!";
          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.querySelector(".copy-label").textContent = "Salin";
          }, 2000);
        });
      });
    });
  }

  scrollToBottom() {
    this.chatContainer.scrollTo({
      top: this.chatContainer.scrollHeight,
      behavior: "smooth",
    });
  }

  escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.chatApp = new AIChatApp();
});

