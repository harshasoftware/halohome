/**
 * LandingAIDemo - AI Astrologer chat demo for landing page
 *
 * Features:
 * - Simulated chat interface with typing animation
 * - Auto-cycling through sample conversations
 * - Demonstrates AI capabilities for astrology questions
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Sparkles, Send, MapPin, Heart, Briefcase, Home } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
  typing?: boolean;
}

interface Conversation {
  icon: React.ReactNode;
  label: string;
  color: string;
  messages: Omit<Message, 'typing'>[];
}

// Sample conversations - showing personalized, actionable insights
const CONVERSATIONS: Conversation[] = [
  {
    icon: <Heart className="w-4 h-4" />,
    label: 'Love',
    color: '#FFB6C1',
    messages: [
      { role: 'user', content: 'Why do my relationships keep failing?' },
      { role: 'ai', content: 'Your Venus line runs through Bali, not New York where you live. You\'re literally in the wrong place for love. Move to your Venus line and watch everything shift. Want me to find cities along that line?' },
    ],
  },
  {
    icon: <Briefcase className="w-4 h-4" />,
    label: 'Career',
    color: '#FFD700',
    messages: [
      { role: 'user', content: 'I feel stuck in my career.' },
      { role: 'ai', content: 'You\'re working against your chart. Your Sun-Jupiter intersection is in Tokyo, not LA. That\'s where you\'d get recognized and promoted. Even a 2-week trip there could unlock opportunities. Should I show you the exact coordinates?' },
    ],
  },
  {
    icon: <Home className="w-4 h-4" />,
    label: 'Home',
    color: '#C0C0DC',
    messages: [
      { role: 'user', content: 'I never feel settled anywhere.' },
      { role: 'ai', content: 'That restlessness? Your Moon line is in Portugal, not where you\'ve been living. Lisbon specifically activates your IC point — that\'s deep ancestral belonging. You\'d finally feel "home" there.' },
    ],
  },
];

const TypingIndicator = () => (
  <div className="typing-indicator">
    <span />
    <span />
    <span />
  </div>
);

const ChatMessage = memo(({ message, color }: { message: Message; color: string }) => (
  <div className={`chat-message ${message.role}`}>
    {message.role === 'ai' && (
      <div className="ai-avatar" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
        <Sparkles className="w-3 h-3" />
      </div>
    )}
    <div className={`message-bubble ${message.role}`}>
      {message.typing ? <TypingIndicator /> : message.content}
    </div>
  </div>
));

const TopicButton = memo(({
  conversation,
  isActive,
  onClick
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`topic-btn ${isActive ? 'active' : ''}`}
    style={{
      '--topic-color': conversation.color,
    } as React.CSSProperties}
  >
    {conversation.icon}
    <span>{conversation.label}</span>
  </button>
));

export const LandingAIDemo = memo(() => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const activeConversation = CONVERSATIONS[activeIndex];

  // Intersection observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Animate messages when conversation changes
  useEffect(() => {
    if (!isInView) return;

    setDisplayedMessages([]);
    setIsTyping(false);

    const messages = activeConversation.messages;
    let timeouts: NodeJS.Timeout[] = [];

    // Show user message first
    timeouts.push(setTimeout(() => {
      setDisplayedMessages([messages[0]]);
    }, 300));

    // Show typing indicator
    timeouts.push(setTimeout(() => {
      setIsTyping(true);
    }, 800));

    // Show AI response
    timeouts.push(setTimeout(() => {
      setIsTyping(false);
      setDisplayedMessages([messages[0], messages[1]]);
    }, 2000));

    return () => timeouts.forEach(clearTimeout);
  }, [activeIndex, activeConversation.messages, isInView]);

  // Auto-cycle conversations
  useEffect(() => {
    if (!isInView) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CONVERSATIONS.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isInView]);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [displayedMessages, isTyping]);

  return (
    <section className="ai-demo-section" ref={containerRef}>
      <div className="ai-demo-container">
        {/* Left side - Content */}
        <div className="ai-demo-content">
          <h2 className="ai-demo-title text-gradient">
            Finally, Answers<br />That Make Sense
          </h2>

          <div className="ai-demo-divider" />

          <p className="ai-demo-intro">
            <Sparkles className="w-4 h-4 inline mr-2 text-purple-400" />
            Ask anything. Get real answers.
          </p>

          <p className="ai-demo-text">
            No more vague horoscopes. Ask why you feel stuck, where you'd thrive,
            or what's blocking your love life. Get specific, actionable guidance
            based on your actual birth chart and planetary lines.
          </p>

          {/* Topic buttons */}
          <div className="topic-buttons">
            {CONVERSATIONS.map((conv, i) => (
              <TopicButton
                key={conv.label}
                conversation={conv}
                isActive={activeIndex === i}
                onClick={() => setActiveIndex(i)}
              />
            ))}
          </div>

          <a href="/guest" className="demo-cta ai-cta">
            Ask Your First Question Free
            <span className="demo-cta-arrow">→</span>
          </a>
        </div>

        {/* Right side - Chat interface */}
        <div className="ai-chat-wrapper">
          <div className="ai-chat-window">
            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-header-avatar" style={{ background: `linear-gradient(135deg, ${activeConversation.color}, ${activeConversation.color}88)` }}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="chat-header-info">
                <span className="chat-header-name">Cosmic Guide</span>
                <span className="chat-header-status">
                  <span className="status-dot" />
                  Online
                </span>
              </div>
            </div>

            {/* Chat messages */}
            <div className="chat-messages" ref={chatRef}>
              {displayedMessages.map((msg, i) => (
                <ChatMessage key={i} message={msg} color={activeConversation.color} />
              ))}
              {isTyping && (
                <ChatMessage
                  message={{ role: 'ai', content: '', typing: true }}
                  color={activeConversation.color}
                />
              )}
            </div>

            {/* Chat input */}
            <div className="chat-input-area">
              <div className="chat-input">
                <MapPin className="w-4 h-4 text-zinc-500" />
                <span className="input-placeholder">Ask about your cosmic path...</span>
                <button className="send-btn">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default LandingAIDemo;
