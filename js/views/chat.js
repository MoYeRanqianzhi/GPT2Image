import { renderHeader } from '../components/header.js';
import { renderInputBar } from '../components/input-bar.js';
import { renderImageCard } from '../components/image-card.js';
import { openLightbox } from '../components/lightbox.js';
import { showToast } from '../components/toast.js';
import { getConversation, saveConversation, generateId } from '../store.js';
import { generateImage } from '../api.js';

export function chatView(container, { conversationId, prompt, size, images, autoSend } = {}) {
  let conversation = conversationId ? getConversation(conversationId) : null;
  if (!conversation) {
    conversation = {
      id: generateId(),
      createdAt: Date.now(),
      messages: [],
    };
  }

  renderHeader(container, { activeTab: 'create', showNewChat: true });

  const messagesEl = document.createElement('div');
  messagesEl.className = 'chat-messages';

  const inputWrap = document.createElement('div');
  inputWrap.style.cssText = 'padding:0 20px 16px;';

  let isGenerating = false;

  const { textInput } = renderInputBar(inputWrap, {
    placeholder: 'Continue creating...',
    onSend: handleSend,
  });

  container.appendChild(messagesEl);
  container.appendChild(inputWrap);

  renderMessages();

  if (autoSend && prompt) {
    handleSend({ prompt, size: size || '1024x1024', images: images || [] });
  }

  async function handleSend({ prompt, size, images: refImages }) {
    if (isGenerating) return;
    isGenerating = true;

    const userMsg = {
      role: 'user',
      text: prompt,
      imageDataUrl: refImages?.length ? refImages[0] : undefined,
      timestamp: Date.now(),
    };
    conversation.messages.push(userMsg);
    saveConversation(conversation);
    renderMessages();
    scrollToBottom();

    const loadingEl = appendLoading();

    try {
      const result = await generateImage({
        prompt,
        size,
        action: refImages?.length ? 'edit' : 'auto',
        images: refImages || [],
      });

      conversation.messages.push({
        role: 'assistant',
        imageBase64: result.imageBase64,
        size,
        timestamp: Date.now(),
      });
      saveConversation(conversation);
    } catch (err) {
      showToast(err.message || 'Generation failed', { type: 'error' });
      conversation.messages.push({
        role: 'assistant',
        error: err.message,
        timestamp: Date.now(),
      });
      saveConversation(conversation);
    } finally {
      loadingEl.remove();
      isGenerating = false;
      renderMessages();
      scrollToBottom();
    }
  }

  function renderMessages() {
    messagesEl.innerHTML = '';
    for (const msg of conversation.messages) {
      if (msg.role === 'user') {
        const el = document.createElement('div');
        el.className = 'message message-user';
        const bubble = document.createElement('div');
        bubble.className = 'bubble-user';
        if (msg.imageDataUrl) {
          bubble.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">
            <img src="${msg.imageDataUrl}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;">
            <span>${escapeHtml(msg.text)}</span>
          </div>`;
        } else {
          bubble.textContent = msg.text;
        }
        el.appendChild(bubble);
        messagesEl.appendChild(el);
      } else if (msg.role === 'assistant') {
        const el = document.createElement('div');
        el.className = 'message message-ai';
        if (msg.error) {
          const bubble = document.createElement('div');
          bubble.className = 'bubble-ai';
          bubble.style.color = '#b53333';
          bubble.textContent = msg.error;
          el.appendChild(bubble);
        } else if (msg.imageBase64) {
          const bubble = document.createElement('div');
          bubble.className = 'bubble-ai';
          const card = renderImageCard(msg.imageBase64, {
            size: msg.size,
            onEdit: (src) => {
              textInput.focus();
              showToast('Reference image attached — describe your edits');
              renderInputBar.__lastInstance?.setImages?.([src]);
            },
            onFullscreen: (src) => {
              const userMsg = findPrecedingUserMsg(msg);
              openLightbox(src, { prompt: userMsg?.text || '' });
            },
          });
          bubble.appendChild(card);
          el.appendChild(bubble);
        }
        messagesEl.appendChild(el);
      }
    }
  }

  function findPrecedingUserMsg(aiMsg) {
    const idx = conversation.messages.indexOf(aiMsg);
    for (let i = idx - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') return conversation.messages[i];
    }
    return null;
  }

  function appendLoading() {
    const el = document.createElement('div');
    el.className = 'message message-ai';
    el.innerHTML = `<div class="bubble-ai" style="display:flex;align-items:center;gap:8px;color:var(--text-tertiary);font-size:13px;">
      <span class="loading-dot"></span> Generating...
    </div>`;
    messagesEl.appendChild(el);
    return el;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
