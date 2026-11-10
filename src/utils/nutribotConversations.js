export const MAX_NUTRIBOT_CONTEXT_MESSAGES = 12;

export function createNutriBotConversation(initialMessage, timestamp = Date.now()) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `chat-${timestamp}-${Math.random().toString(36).slice(2, 9)}`,
    title: 'New chat',
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [initialMessage]
  };
}

function isValidMessage(message) {
  return message
    && ['user', 'assistant'].includes(message.role)
    && typeof message.text === 'string';
}

function recoverInterruptedConversation(conversation) {
  const messages = conversation.messages.filter((message) => !message.isThinking);
  if (messages.length !== conversation.messages.length) {
    messages.push({
      role: 'assistant',
      text: 'Nagambala ang sagot ko noong isinara o iniwan ang chat. Puwede mong ipadala ulit ang tanong.'
    });
  }
  return { ...conversation, messages };
}

export function loadNutriBotConversations(savedState, legacyMessages, initialMessage, timestamp = Date.now()) {
  try {
    const parsedState = savedState ? JSON.parse(savedState) : null;
    if (
      Array.isArray(parsedState?.conversations)
      && parsedState.conversations.length > 0
    ) {
      const conversations = parsedState.conversations
        .filter((conversation) => (
          conversation
          && typeof conversation.id === 'string'
          && Array.isArray(conversation.messages)
          && conversation.messages.length > 0
          && conversation.messages.every(isValidMessage)
        ))
        .map(recoverInterruptedConversation);

      if (conversations.length > 0) {
        return {
          conversations,
          activeConversationId: conversations.some(({ id }) => id === parsedState.activeConversationId)
            ? parsedState.activeConversationId
            : conversations[0].id
        };
      }
    }

    const parsedLegacyMessages = legacyMessages ? JSON.parse(legacyMessages) : null;
    const messages = Array.isArray(parsedLegacyMessages)
      ? parsedLegacyMessages.filter(isValidMessage)
      : [];
    const initialConversation = createNutriBotConversation(initialMessage, timestamp);
    if (messages.length > 0) initialConversation.messages = messages;

    return {
      conversations: [recoverInterruptedConversation(initialConversation)],
      activeConversationId: initialConversation.id
    };
  } catch (error) {
    console.warn('NutriBot conversations could not be loaded:', error);
    const initialConversation = createNutriBotConversation(initialMessage, timestamp);
    return {
      conversations: [initialConversation],
      activeConversationId: initialConversation.id
    };
  }
}

export function getNutriBotConversationTitle(messages) {
  const firstUserMessage = messages.find(({ role }) => role === 'user')?.text?.trim();
  if (!firstUserMessage) return 'New chat';
  return firstUserMessage.length > 42
    ? `${firstUserMessage.slice(0, 39).trimEnd()}...`
    : firstUserMessage;
}

export function getNutriBotContext(messages) {
  const conversation = messages
    .filter((message) => !message.isThinking)
    .slice(-MAX_NUTRIBOT_CONTEXT_MESSAGES)
    .map((message) => ({
      ...message,
      text: message.text.slice(0, 4000)
    }));
  const firstMessage = conversation[0];
  if (firstMessage?.role === 'model') {
    return conversation.slice(1);
  }
  return conversation;
}
