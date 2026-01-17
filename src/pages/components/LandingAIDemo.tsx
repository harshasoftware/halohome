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
    icon: <Home className="w-4 h-4" />,
    label: 'Harmony',
    color: '#FFB6C1',
    messages: [
      { role: 'user', content: 'Is this property good for my family?' },
      { role: 'ai', content: 'This property has a harmony score of 78. The Northeast is clear which brings prosperity, but the Southwest needs strengthening. I recommend placing heavy furniture in the SW corner and keeping the NE open and bright.' },
    ],
  },
  {
    icon: <Briefcase className="w-4 h-4" />,
    label: 'Rooms',
    color: '#FFD700',
    messages: [
      { role: 'user', content: 'Where should I put my home office?' },
      { role: 'ai', content: 'Based on this property\'s layout, the West or Southwest zone is ideal for your office. This direction enhances focus and career growth. Avoid the Northeast — it\'s better suited for meditation or prayer rooms.' },
    ],
  },
  {
    icon: <Heart className="w-4 h-4" />,
    label: 'Remedies',
    color: '#C0C0DC',
    messages: [
      { role: 'user', content: 'How can I improve the energy in my bedroom?' },
      { role: 'ai', content: 'Your bedroom is in the Southeast, which creates restless energy. Simple fixes: move the bed to the Southwest corner, add earthy colors like beige or cream, and place a small water feature in the North. This will significantly improve sleep quality.' },
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
            AI That Understands<br />Your Space
          </h2>

          <div className="ai-demo-divider" />

          <p className="ai-demo-intro">
            <Sparkles className="w-4 h-4 inline mr-2 text-purple-400" />
            Ask anything about your property.
          </p>

          <p className="ai-demo-text">
            No more confusing Vastu jargon. Ask about room placement, energy flow,
            or how to improve harmony. Get specific, actionable guidance
            based on your property's actual layout and orientation.
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
            Ask About Any Property Free
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
                <span className="chat-header-name">Harmony Guide</span>
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
                <span className="input-placeholder">Ask about your property...</span>
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
