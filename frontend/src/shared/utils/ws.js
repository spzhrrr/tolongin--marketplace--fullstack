// Realtime Socket.IO client for chat. Auto-reconnects.
// Backend gateway: namespace '/chat', path '/api/socket.io'
import { io } from "socket.io-client";
import { store } from "../../app/store.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;
const DEBUG = import.meta.env.DEV;

class WSClient {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
    this.activeConversationId = null;
  }

  connect() {
    const token = store.getState().token;
    if (!token) return;
    if (this.socket && this.socket.connected) return;

    try {
      this.socket = io(`${BACKEND_URL}/chat`, {
        path: "/api/socket.io",
        transports: ["websocket", "polling"],
        auth: { token },
        query: { token },
        reconnection: true,
        reconnectionDelay: 2000,
      });
    } catch (e) {
      if (DEBUG) console.warn("[ws] connect failed", e);
      return;
    }

    this.socket.on("connect", () => {
      if (DEBUG) console.log("[ws] open");
      if (this.activeConversationId) {
        this.socket.emit("join", { conversationId: this.activeConversationId });
      }
    });

    this.socket.on("disconnect", () => {
      if (DEBUG) console.log("[ws] close");
    });

    // Backend emits "new-message" (room broadcast) and "new-message-notify" (private)
    const fanOut = (eventName) => (data) => {
      const payload = {
        type: eventName === "typing" ? "typing" : "message",
        conversationId: data?.conversationId || data?.conversationId,
        data,
      };
      // helper: for chat page, push a uniform shape
      if (eventName === "new-message" || eventName === "new-message-notify") {
        payload.conversationId = data?.conversationId;
      }
      this.listeners.forEach((fn) => fn(payload));
    };
    this.socket.on("new-message", fanOut("new-message"));
    this.socket.on("new-message-notify", fanOut("new-message-notify"));
    this.socket.on("typing", fanOut("typing"));
  }

  join(conversationId) {
    this.activeConversationId = conversationId;
    if (this.socket && this.socket.connected && conversationId) {
      this.socket.emit("join", { conversationId });
    }
  }

  // High-level helper for chat page
  send(payload) {
    if (!this.socket || !this.socket.connected) return;
    if (payload?.type === "typing" && payload.conversationId) {
      this.socket.emit("typing", { conversationId: payload.conversationId });
    } else if (payload?.type === "send-message") {
      this.socket.emit("send-message", {
        conversationId: payload.conversationId,
        content: payload.content,
        attachment: payload.attachment,
      });
    }
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  close() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (err) {
        if (DEBUG) console.warn("[ws] close failed", err);
      }
    }
    this.socket = null;
    this.activeConversationId = null;
  }
}

export const ws = new WSClient();

// Auto connect/disconnect based on auth state
store.subscribe((state) => {
  if (state.token) ws.connect();
  else ws.close();
});

// Try initial connect if already logged in
if (store.getState().token) {
  setTimeout(() => ws.connect(), 100);
}
