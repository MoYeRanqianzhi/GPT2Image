import { renderHeader } from '../components/header.js';
import { renderInputBar } from '../components/input-bar.js';
import { renderImageCard } from '../components/image-card.js';
import { openLightbox } from '../components/lightbox.js';
import { showToast } from '../components/toast.js';
import { iconRetry, iconChevronLeft, iconChevronRight } from '../icons.js';
import { getConfig, getConversation, saveConversation, generateId } from '../store.js';
import { generateImage } from '../api.js';
import { renderMarkdown } from '../markdown.js';

function getVariants(msg) {
  if (msg.variants) return msg.variants;
  if (msg.imageBase64) return [{ imageBase64: msg.imageBase64, size: msg.size, timestamp: msg.timestamp }];
  return [];
}

function getActiveVariant(msg) {
  const variants = getVariants(msg);
  const idx = msg.activeVariant || 0;
  return variants[idx] || variants[0] || null;
}

export function chatView(container, { conversationId, prompt, size, thinking, images, autoSend } = {}) {
  let conversation = null;

  renderHeader(container, { activeTab: 'create', showNewChat: true });

  const messagesEl = document.createElement('div');
  messagesEl.className = 'chat-messages';

  const inputWrap = document.createElement('div');
  inputWrap.style.cssText = 'padding:0 24px 16px;';

  let isGenerating = false;
  let retryingIdx = -1;

  const { textInput, getThinking } = renderInputBar(inputWrap, {
    placeholder: 'Continue creating...',
    onSend: handleSend,
    initialThinking: thinking || 'low',
  });

  container.appendChild(messagesEl);
  container.appendChild(inputWrap);

  (async () => {
    conversation = conversationId ? await getConversation(conversationId) : null;
    if (!conversation) {
      conversation = {
        id: generateId(),
        createdAt: Date.now(),
        messages: [],
      };
    }
    renderMessages();
    if (autoSend && prompt) {
      handleSend({ prompt, size: size || 'auto', thinking: thinking || 'low', images: images || [] });
    }
  })();

  async function handleSend({ prompt, size, thinking: thinkingLevel, images: refImages }) {
    if (isGenerating || !conversation) return;
    isGenerating = true;

    conversation.messages.push({
      role: 'user',
      text: prompt,
      imageDataUrl: refImages?.length ? refImages[0] : undefined,
      timestamp: Date.now(),
    });
    await saveConversation(conversation);
    renderMessages();
    scrollToBottom();

    const streamBubble = createStreamingBubble();
    messagesEl.appendChild(streamBubble.element);
    scrollToBottom();

    try {
      const historyMessages = conversation.messages.slice(0, -1);
      const result = await generateImage({
        prompt,
        size,
        thinking: thinkingLevel,
        action: refImages?.length ? 'edit' : 'auto',
        images: refImages || [],
        history: historyMessages,
        onStream: (delta) => {
          streamBubble.update(delta);
          if (isNearBottom()) scrollToBottom();
        },
      });

      conversation.messages.push({
        role: 'assistant',
        variants: [{ text: result.text, imageBase64: result.imageBase64, thinking: result.thinking, size, timestamp: Date.now() }],
        activeVariant: 0,
        timestamp: Date.now(),
      });
      await saveConversation(conversation);
    } catch (err) {
      showToast(err.message || 'Generation failed', { type: 'error' });
      conversation.messages.push({
        role: 'assistant',
        error: err.message,
        timestamp: Date.now(),
      });
      await saveConversation(conversation);
    } finally {
      streamBubble.element.remove();
      isGenerating = false;
      renderMessages();
      scrollToBottom();
    }
  }

  async function handleRetry(msgIdx) {
    if (isGenerating || !conversation) return;
    const msg = conversation.messages[msgIdx];

    let userMsg = null;
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') { userMsg = conversation.messages[i]; break; }
    }
    if (!userMsg) return;

    isGenerating = true;
    retryingIdx = msgIdx;
    renderMessages();
    scrollToBottom();

    const streamBubble = createStreamingBubble();
    const target = messagesEl.children[msgIdx];
    if (target) {
      messagesEl.replaceChild(streamBubble.element, target);
    } else {
      messagesEl.appendChild(streamBubble.element);
    }
    scrollToBottom();

    try {
      const refImages = userMsg.imageDataUrl ? [userMsg.imageDataUrl] : [];
      const retrySize = getActiveVariant(msg)?.size || 'auto';
      const thinkingLevel = getThinking ? getThinking() : 'low';

      const historyMessages = conversation.messages.slice(0, msgIdx);
      const result = await generateImage({
        prompt: userMsg.text,
        size: retrySize,
        thinking: thinkingLevel,
        action: refImages.length ? 'edit' : 'auto',
        images: refImages,
        history: historyMessages,
        onStream: (delta) => {
          streamBubble.update(delta);
          if (isNearBottom()) scrollToBottom();
        },
      });

      if (msg.error) {
        conversation.messages[msgIdx] = {
          role: 'assistant',
          variants: [{ text: result.text, imageBase64: result.imageBase64, thinking: result.thinking, size: retrySize, timestamp: Date.now() }],
          activeVariant: 0,
          timestamp: Date.now(),
        };
      } else {
        if (!msg.variants) {
          msg.variants = [{ imageBase64: msg.imageBase64, size: msg.size, timestamp: msg.timestamp }];
        }
        msg.variants.push({ text: result.text, imageBase64: result.imageBase64, thinking: result.thinking, size: retrySize, timestamp: Date.now() });
        msg.activeVariant = msg.variants.length - 1;
      }
      await saveConversation(conversation);
    } catch (err) {
      showToast(err.message || 'Retry failed', { type: 'error' });
    } finally {
      retryingIdx = -1;
      isGenerating = false;
      renderMessages();
      scrollToBottom();
    }
  }

  function renderMessages() {
    messagesEl.innerHTML = '';
    if (!conversation) return;
    for (let i = 0; i < conversation.messages.length; i++) {
      const msg = conversation.messages[i];
      if (msg.role === 'user') {
        const el = document.createElement('div');
        el.className = 'message message-user';
        const bubble = document.createElement('div');
        bubble.className = 'bubble-user';
        if (msg.imageDataUrl) {
          bubble.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">
            <img src="${msg.imageDataUrl}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">
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

        if (retryingIdx >= 0 && i === retryingIdx) {
          const bubble = document.createElement('div');
          bubble.className = 'bubble-ai';
          bubble.style.cssText = 'display:flex;align-items:center;gap:8px;color:var(--text-tertiary);font-size:16px;';
          bubble.innerHTML = '<span class="loading-dot"></span> Generating...';
          el.appendChild(bubble);
          messagesEl.appendChild(el);
          continue;
        }

        if (msg.error) {
          const bubble = document.createElement('div');
          bubble.className = 'bubble-ai';
          bubble.style.color = '#b53333';
          bubble.textContent = msg.error;
          el.appendChild(bubble);
        } else {
          const variant = getActiveVariant(msg);
          if (variant) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble-ai';

            const showThinking = getConfig()?.showThinking;
            if (showThinking && variant.thinking) {
              const details = document.createElement('details');
              details.className = 'thinking-block';
              const summary = document.createElement('summary');
              summary.className = 'thinking-summary';
              summary.textContent = 'Thinking';
              const content = document.createElement('div');
              content.className = 'thinking-content';
              content.textContent = variant.thinking;
              details.appendChild(summary);
              details.appendChild(content);
              bubble.appendChild(details);
            }

            if (variant.text) {
              const textEl = document.createElement('div');
              textEl.className = 'bubble-ai-text markdown-body';
              textEl.innerHTML = renderMarkdown(variant.text);
              bubble.appendChild(textEl);
              if (variant.imageBase64) {
                textEl.style.marginBottom = '10px';
              }
            }

            if (variant.imageBase64) {
              const card = renderImageCard(variant.imageBase64, {
                size: variant.size,
                onEdit: (src) => {
                  textInput.focus();
                  showToast('Reference image attached — describe your edits');
                },
                onFullscreen: (src) => {
                  const userMsg = findPrecedingUserMsg(i);
                  openLightbox(src, { prompt: userMsg?.text || '' });
                },
              });
              bubble.appendChild(card);
            }

            el.appendChild(bubble);
          }
        }

        const actions = document.createElement('div');
        actions.className = 'message-actions';

        const variants = getVariants(msg);
        if (variants.length > 1) {
          const nav = document.createElement('div');
          nav.className = 'variant-nav';

          const prevBtn = document.createElement('button');
          prevBtn.className = 'variant-nav-btn';
          prevBtn.innerHTML = iconChevronLeft().replace('width="24" height="24"', 'width="14" height="14"');
          prevBtn.disabled = (msg.activeVariant || 0) === 0;
          prevBtn.addEventListener('click', async () => {
            if ((msg.activeVariant || 0) > 0) {
              msg.activeVariant--;
              await saveConversation(conversation);
              renderMessages();
            }
          });

          const counter = document.createElement('span');
          counter.textContent = `${(msg.activeVariant || 0) + 1} / ${variants.length}`;

          const nextBtn = document.createElement('button');
          nextBtn.className = 'variant-nav-btn';
          nextBtn.innerHTML = iconChevronRight().replace('width="24" height="24"', 'width="14" height="14"');
          nextBtn.disabled = (msg.activeVariant || 0) >= variants.length - 1;
          nextBtn.addEventListener('click', async () => {
            if ((msg.activeVariant || 0) < variants.length - 1) {
              msg.activeVariant++;
              await saveConversation(conversation);
              renderMessages();
            }
          });

          nav.appendChild(prevBtn);
          nav.appendChild(counter);
          nav.appendChild(nextBtn);
          actions.appendChild(nav);
        }

        const retryBtn = document.createElement('button');
        retryBtn.className = 'message-retry';
        retryBtn.innerHTML = iconRetry().replace('width="24" height="24"', 'width="16" height="16"');
        retryBtn.title = msg.error ? 'Retry generation' : 'Generate another variant';
        const msgIdx = i;
        retryBtn.addEventListener('click', () => handleRetry(msgIdx));
        actions.appendChild(retryBtn);

        el.appendChild(actions);
        messagesEl.appendChild(el);
      }
    }
  }

  function findPrecedingUserMsg(aiIdx) {
    for (let i = aiIdx - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') return conversation.messages[i];
    }
    return null;
  }

  function createStreamingBubble() {
    const el = document.createElement('div');
    el.className = 'message message-ai';

    const bubble = document.createElement('div');
    bubble.className = 'bubble-ai';

    const thinkingBlock = document.createElement('details');
    thinkingBlock.className = 'thinking-block';
    thinkingBlock.style.display = 'none';
    thinkingBlock.open = true;
    const thinkingSummary = document.createElement('summary');
    thinkingSummary.className = 'thinking-summary';
    thinkingSummary.textContent = 'Thinking';
    const thinkingContent = document.createElement('div');
    thinkingContent.className = 'thinking-content';
    thinkingBlock.appendChild(thinkingSummary);
    thinkingBlock.appendChild(thinkingContent);
    bubble.appendChild(thinkingBlock);

    const textEl = document.createElement('div');
    textEl.className = 'bubble-ai-text markdown-body';
    textEl.style.display = 'none';
    bubble.appendChild(textEl);

    const loadingIndicator = document.createElement('div');
    loadingIndicator.style.cssText = 'display:flex;align-items:center;gap:8px;color:var(--text-tertiary);font-size:16px;';
    loadingIndicator.innerHTML = '<span class="loading-dot"></span> Generating...';
    bubble.appendChild(loadingIndicator);

    el.appendChild(bubble);

    return {
      element: el,
      update({ text, thinking, imageBase64, done }) {
        const showThinking = getConfig()?.showThinking;
        if (showThinking && thinking) {
          thinkingBlock.style.display = '';
          thinkingContent.textContent = thinking;
        }
        if (text) {
          textEl.style.display = '';
          textEl.innerHTML = renderMarkdown(text);
          loadingIndicator.style.display = 'none';
        }
        if (imageBase64) {
          let img = bubble.querySelector('.streaming-image');
          if (!img) {
            img = document.createElement('img');
            img.className = 'streaming-image';
            img.style.cssText = 'max-width:280px;border-radius:var(--radius-lg);display:block;margin-top:10px;';
            bubble.appendChild(img);
          }
          img.src = `data:image/png;base64,${imageBase64}`;
          loadingIndicator.style.display = 'none';
        }
        if (done) {
          loadingIndicator.style.display = 'none';
        }
      }
    };
  }

  function isNearBottom() {
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 100;
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
