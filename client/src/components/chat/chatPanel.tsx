'use client';

import { useEffect, useRef } from 'react';
import { FaArrowUp, FaPaperclip } from 'react-icons/fa6';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { WiCloudUp } from 'react-icons/wi';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

interface ChatPanelProps {
  onFileUpload: (file: File) => void;
  onExtractedText: (text: string) => void;
  user: {
    profilePic?: string;
  };
  userInput: string;
  setUserInput: (value: string) => void;
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  handleSend: () => void;
  loading: boolean;
  chatLog: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const formatAssistantMessage = (content: string) => {
  const normalized = content.replace(/\r\n/g, '\n').trim();

  const splitInlineLists = normalized
    // Put numbered items on their own lines even when the model returns them inline.
    .replace(/([^\n])\s+(?=\d+\.\s)/g, '$1\n')
    // Do the same for bullets.
    .replace(/([^\n])\s+(?=[•*-]\s)/g, '$1\n')
    // If a list follows a sentence, create a visual block break.
    .replace(/([:])\n(?=\d+\.\s|[•*-]\s)/g, '$1\n\n')
    // Ensure adjacent list items don't collapse together.
    .replace(/(\n\d+\.\s[^\n]+)\n(?=\d+\.\s)/g, '$1\n')
    .replace(/(\n[•*-]\s[^\n]+)\n(?=[•*-]\s)/g, '$1\n');

  const lines = splitInlineLists
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const rebuilt: string[] = [];

  for (const line of lines) {
    const isListItem = /^(\d+\.\s|[•*-]\s)/.test(line);
    const previousLine = rebuilt[rebuilt.length - 1];
    const previousWasList = previousLine ? /^(\d+\.\s|[•*-]\s)/.test(previousLine) : false;

    if (isListItem && rebuilt.length > 0 && !previousWasList) {
      rebuilt.push('');
    }

    rebuilt.push(line);
  }

  return rebuilt.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

type AssistantBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'unordered-list'; items: string[] };

const parseAssistantBlocks = (content: string): AssistantBlock[] => {
  const lines = formatAssistantMessage(content).split('\n');
  const blocks: AssistantBlock[] = [];

  let paragraphBuffer: string[] = [];
  let orderedItems: string[] = [];
  let unorderedItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraphBuffer.join(' ').trim() });
      paragraphBuffer = [];
    }
  };

  const flushOrdered = () => {
    if (orderedItems.length > 0) {
      blocks.push({ type: 'ordered-list', items: orderedItems });
      orderedItems = [];
    }
  };

  const flushUnordered = () => {
    if (unorderedItems.length > 0) {
      blocks.push({ type: 'unordered-list', items: unorderedItems });
      unorderedItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushOrdered();
      flushUnordered();
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushUnordered();
      orderedItems.push(orderedMatch[1].trim());
      continue;
    }

    const unorderedMatch = line.match(/^[•*-]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushOrdered();
      unorderedItems.push(unorderedMatch[1].trim());
      continue;
    }

    flushOrdered();
    flushUnordered();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushOrdered();
  flushUnordered();

  return blocks;
};

const markdownComponents = {
  h1: ({node, ...props}: any) => (
    <h1 className="mt-4 mb-2 text-xl font-bold text-white" {...props} />
  ),
  h2: ({node, ...props}: any) => (
    <h2 className="mt-4 mb-2 text-lg font-semibold text-white" {...props} />
  ),
  h3: ({node, ...props}: any) => (
    <h3 className="mt-3 mb-2 text-base font-semibold text-white" {...props} />
  ),
  p: ({node, ...props}: any) => (
    <span className="whitespace-pre-wrap leading-7" {...props} />
  ),
  strong: ({node, ...props}: any) => (
    <strong className="font-semibold" {...props} />
  ),
  em: ({node, ...props}: any) => (
    <em className="italic" {...props} />
  ),
  blockquote: ({node, ...props}: any) => (
    <blockquote className="my-3 border-l-2 border-green-400/60 pl-4 italic" {...props} />
  ),
  code: ({node, className, children, ...props}: any) => (
    <code
      className={`rounded bg-black/40 px-1.5 py-0.5 text-sm ${className || ''}`}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({node, ...props}: any) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-black/50 p-3 text-sm" {...props} />
  ),
};

export default function ChatPanel({
  onFileUpload,
  onExtractedText,
  userInput,
  setUserInput,
  uploadedFile,
  setUploadedFile,
  handleSend,
  loading,
  chatLog,
  messagesEndRef,
}: ChatPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleUploadClick = () => fileInputRef.current?.click();
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('📥 Incoming chat upload');
    
    if (!file) return;

    onFileUpload(file);
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.info('Uploading...');
      const res = await fetch('http://localhost:4004/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await res.json();
      toast.success('✅ Upload successful!');
      if (onExtractedText && data.extractedText) {
        onExtractedText(data.extractedText);
      }
    } catch (err) {
      toast.error('❌ Upload failed');
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full text-white font-mono">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatLog.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] lg:max-w-[60%] rounded-lg px-4 py-2 mx-3 ${
                  isUser
                    ? 'bg-white/10 text-white rounded-br-none'
                    : 'bg-white/10 text-green-300 rounded-bl-none'
                }`}
              >
                <div className="font-semibold mb-1">{isUser ? 'You' : 'Bolt AI'}</div>

                {msg.role === 'assistant' ? (
                  <div className="ai-markdown">
                    {parseAssistantBlocks(msg.content).map((block, blockIndex) => {
                      if (block.type === 'ordered-list') {
                        return (
                          <ol
                            key={blockIndex}
                            className="my-3 pl-5 list-decimal space-y-2"
                          >
                            {block.items.map((item, itemIndex) => (
                              <li key={itemIndex}>
                                <ReactMarkdown components={markdownComponents}>
                                  {item}
                                </ReactMarkdown>
                              </li>
                            ))}
                          </ol>
                        );
                      }

                      if (block.type === 'unordered-list') {
                        return (
                          <ul
                            key={blockIndex}
                            className="my-3 pl-5 list-disc space-y-2"
                          >
                            {block.items.map((item, itemIndex) => (
                              <li key={itemIndex}>
                                <ReactMarkdown components={markdownComponents}>
                                  {item}
                                </ReactMarkdown>
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      return (
                        <div key={blockIndex} className="my-2">
                          <ReactMarkdown components={markdownComponents}>
                            {block.content}
                          </ReactMarkdown>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {uploadedFile && isUser && (
                  <div className="text-xs mt-1 flex items-center">
                    <FaPaperclip className="mr-1" />
                    {uploadedFile.name}
                  </div>
                )}

                {msg.timestamp && (
                  <p className="text-xs opacity-70 mt-1 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-green-300 text-sm">
              <AiOutlineLoading3Quarters className="animate-spin" />
              <span>Bolt is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input & File */}
      <div className="p-4 border-t border-gray-800">
        {uploadedFile && (
          <div className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2 mb-2 max-w-4xl mx-auto">
            <div className="flex items-center">
              <FaPaperclip className="mr-2" />
              <span className="text-sm truncate max-w-xs">{uploadedFile.name}</span>
            </div>
            <button 
              onClick={() => setUploadedFile(null)} 
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-2 max-w-4xl mx-auto">
          <button
            onClick={handleUploadClick}
            className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition"
            title="Upload file"
          >
            <WiCloudUp size={20} />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </button>

          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your thought..."
            className="flex-1 bg-white/7 text-white rounded-lg py-2 px-4 border border-gray-900 focus:outline-none resize-none max-h-32"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || (!userInput.trim() && !uploadedFile)}
            className={`p-3 rounded-lg transition text-white ${
              loading || (!userInput.trim() && !uploadedFile)
                ? 'bg-white/20 opacity-50 cursor-not-allowed'
                : 'bg-white/9 hover:bg-white/50'
            }`}
          >
            <FaArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
