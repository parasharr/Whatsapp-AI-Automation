const conversations = new Map();

export function getConversation(phone) {
    return conversations.get(phone) || [];
}

export function setConversation(phone, conversation) {
    conversations.set(phone, conversation);
}

export function addMessage(phone, role, content) {

    const conversation = conversations.get(phone) || [];

    conversation.push({
        role,
        content,
    });

    // Keep only last 30 messages
    if (conversation.length > 30) {
        conversation.splice(0, conversation.length - 30);
    }

    conversations.set(phone, conversation);

    return conversation;
}

export function hasConversation(phone) {
    return conversations.has(phone);
}

export function clearConversation(phone) {
    conversations.delete(phone);
}