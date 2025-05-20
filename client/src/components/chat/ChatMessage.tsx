import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  UserIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  DocumentTextIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { messageBubbleStyles, markdownStyles } from './chatStyles';
import { useTheme } from '../../contexts/ThemeContext';
import { RagSource } from '../../services/ragChatService';

interface ChatMessageProps {
  message: ChatMessageType & {
    sources?: RagSource[];
    useRag?: boolean;
  };
  isAI?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isAI = false }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<boolean>(false);
  const { isDarkTheme } = useTheme();

  // Function to copy code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Determine if this is a system message (from Chat2SQL)
  const isSystemMessage = message.content.includes('```sql') || message.content.startsWith('Error:') || message.content === 'No results found';

  // Determine if this is a SQL response
  const isSQLResponse = message.content.includes('```sql');

  // Split SQL response into query and results
  const splitSQLResponse = (content: string) => {
    // If content starts with "Error:", it's just an error message
    if (content.startsWith('Error:')) {
      return { errorMessage: content, query: '', results: '' };
    }

    const parts = content.split('\n\n');
    let query = '';
    let results = '';
    
    // Extract query - only get the SQL query without any additional text
    if (parts[0].includes('```sql')) {
      query = parts[0].replace(/```sql\n|\n```/g, '').trim();
    }
    
    // Extract results
    if (parts[1]) {
      results = parts[1].trim();
    }
    
    return { errorMessage: '', query, results };
  };

  // Render SQL response
  const renderSQLResponse = (content: string) => {
    const { errorMessage, query, results } = splitSQLResponse(content);
    
    // If it's just an error message, show it and return
    if (errorMessage) {
      return (
        <div style={{
          color: 'var(--color-error)',
          fontSize: '0.95rem',
          padding: '0.5rem',
          backgroundColor: isDarkTheme ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.05)',
          borderRadius: '0.5rem'
        }}>
          {errorMessage}
        </div>
      );
    }
    
    // Function to download table data as CSV
    const downloadTableData = () => {
      if (!results || results === 'No results found') return;
      
      // Parse the tab-separated data
      const lines = results.split('\n');
      const headers = lines[0].split('\t');
      const data = lines.slice(1).map(line => line.split('\t'));
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.join(','))
      ].join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'query_results.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    return (
      <div style={{ width: '100%' }}>
        {/* SQL Query Box */}
        {query && (
          <div style={{
            marginBottom: '1rem',
            backgroundColor: isDarkTheme ? '#1e1e1e' : '#f8fafc',
            borderRadius: '0.5rem',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: isDarkTheme ? '#252526' : '#f0f4f8',
              borderBottom: `1px solid ${isDarkTheme ? '#3E3E42' : '#e2e8f0'}`,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <button
                onClick={() => copyToClipboard(query)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: copiedCode === query ? 'var(--color-success)' : isDarkTheme ? '#e6e6e6' : '#64748b',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  transition: 'all 0.2s ease'
                }}
                title="Copy SQL"
              >
                {copiedCode === query ? (
                  <>
                    <CheckIcon className="w-4 h-4 mr-1" /> Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1" /> Copy
                  </>
                )}
              </button>
            </div>
            <SyntaxHighlighter
              language="sql"
              style={isDarkTheme ? vscDarkPlus : oneLight}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.9rem'
              }}
            >
              {query}
            </SyntaxHighlighter>
          </div>
        )}

        {/* Results Box */}
        {results && results !== 'No results found' && (
          <div style={{
            backgroundColor: isDarkTheme ? '#1e1e1e' : '#f8fafc',
            borderRadius: '0.5rem',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: isDarkTheme ? '#252526' : '#f0f4f8',
              borderBottom: `1px solid ${isDarkTheme ? '#3E3E42' : '#e2e8f0'}`,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <button
                onClick={downloadTableData}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: isDarkTheme ? '#e6e6e6' : '#64748b',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  transition: 'all 0.2s ease'
                }}
                title="Download Results"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-1" /> Download
              </button>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
                backgroundColor: isDarkTheme ? '#1e1e1e' : '#ffffff'
              }}>
                <thead>
                  <tr>
                    {results.split('\n')[0].split('\t').map((header, index) => (
                      <th key={index} style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        borderBottom: `2px solid ${isDarkTheme ? '#3E3E42' : '#e2e8f0'}`,
                        backgroundColor: isDarkTheme ? '#252526' : '#f8fafc',
                        color: isDarkTheme ? '#e6e6e6' : '#334155',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.split('\n').slice(1).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.split('\t').map((cell, cellIndex) => (
                        <td key={cellIndex} style={{
                          padding: '0.75rem',
                          borderBottom: `1px solid ${isDarkTheme ? '#3E3E42' : '#e2e8f0'}`,
                          color: isDarkTheme ? '#e6e6e6' : '#334155',
                          whiteSpace: 'nowrap'
                        }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!results && query && (
          <div style={{
            color: 'var(--color-text)',
            fontSize: '0.95rem',
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '0.5rem'
          }}>
            No results found
          </div>
        )}
      </div>
    );
  };

  // Render code blocks with syntax highlighting and copy button
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const code = String(children).replace(/\n$/, '');

      return !inline && match ? (
        <div style={messageBubbleStyles.ai.codeBlock}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            backgroundColor: isDarkTheme ? '#252526' : '#f0f4f8',
            borderBottom: `1px solid ${isDarkTheme ? '#3E3E42' : '#e2e8f0'}`,
            fontSize: '0.8rem',
            color: isDarkTheme ? '#e6e6e6' : '#334155',
            borderRadius: '0.5rem 0.5rem 0 0'
          }}>
            <span style={{
              fontWeight: 600,
              color: isDarkTheme ? 'var(--color-primary-light)' : 'var(--color-primary)'
            }}>
              {match[1]}
            </span>
            <button
              onClick={() => copyToClipboard(code)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: copiedCode === code ? 'var(--color-success)' : isDarkTheme ? '#e6e6e6' : '#64748b',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s ease'
              }}
              title="Copy code"
            >
              {copiedCode === code ? (
                <>
                  <CheckIcon className="w-4 h-4 mr-1" /> Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4 mr-1" /> Copy
                </>
              )}
            </button>
          </div>
          <SyntaxHighlighter
            language={match[1]}
            style={isDarkTheme ? vscDarkPlus : oneLight}
            customStyle={{
              margin: 0,
              borderRadius: '0 0 0.5rem 0.5rem',
              padding: '1rem'
            }}
            {...props}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code style={messageBubbleStyles.ai.inlineCode} {...props}>
          {children}
        </code>
      );
    }
  };

  // Add or update these helper functions for the status display
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'UPLOADED':
        return 'var(--color-info)';
      case 'PROCESSING':
      case 'EMBEDDING':
        return 'var(--color-warning)';
      case 'PROCESSED':
        return 'var(--color-success)';
      case 'ERROR':
        return 'var(--color-error)';
      default:
        return 'var(--color-text-muted)';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'UPLOADED':
        return 'Uploaded';
      case 'PROCESSING':
        return 'Processing';
      case 'EMBEDDING':
        return 'Generating embeddings';
      case 'PROCESSED':
        return 'Ready';
      case 'ERROR':
        return 'Error';
      default:
        return status;
    }
  };

  return (
    <div style={isAI ? messageBubbleStyles.ai.container : messageBubbleStyles.user.container}>
      <div style={isAI ? messageBubbleStyles.ai.header : messageBubbleStyles.user.header}>
        {isAI ? (
          <div style={messageBubbleStyles.ai.avatar}>
            {isSQLResponse ? 'SQL' : isSystemMessage ? 'AI' : 'AI'}
          </div>
        ) : (
          <div style={messageBubbleStyles.user.avatar}>
            <UserIcon className="w-5 h-5" />
          </div>
        )}
        <div style={isAI ? messageBubbleStyles.ai.timestamp : messageBubbleStyles.user.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div style={isAI ? messageBubbleStyles.ai.content : messageBubbleStyles.user.content}>
        {!isAI ? (
          // User message - just show the content
          <div style={{
            ...markdownStyles.container,
            fontSize: '0.95rem',
            lineHeight: '1.6',
          }}>
            {message.content}
          </div>
        ) : isSQLResponse ? (
          // SQL response - show query and results
          renderSQLResponse(message.content)
        ) : (
          // Regular AI response or error message
          <div style={{
            color: message.content.startsWith('Error:') ? 'var(--color-error)' : 'var(--color-text)',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            backgroundColor: message.content.startsWith('Error:') ? 
              (isDarkTheme ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.05)') : 
              'transparent',
            padding: message.content.startsWith('Error:') ? '0.5rem' : '0',
            borderRadius: message.content.startsWith('Error:') ? '0.5rem' : '0',
          }}>
            {message.content}
          </div>
        )}
      </div>

      {/* Add CSS for animations */}
      <style>
        {`
          .animate-pulse {
            animation: pulse 1.5s infinite;
          }

          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
          }

          .animate-pulse span {
            animation: pulse 1.5s infinite;
            display: inline-block;
          }

          .animate-pulse span:nth-child(1) {
            animation-delay: 0s;
          }

          .animate-pulse span:nth-child(2) {
            animation-delay: 0.3s;
          }

          .animate-pulse span:nth-child(3) {
            animation-delay: 0.6s;
          }

          /* Code block styling */
          pre {
            position: relative;
            overflow-x: auto;
            border-radius: 0 0 0.5rem 0.5rem !important;
          }

          code {
            font-family: Menlo, Monaco, Consolas, "Courier New", monospace !important;
          }

          /* Improve table styling */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
          }

          /* Improve link styling */
          a {
            transition: color 0.2s ease;
          }

          a:hover {
            text-decoration: underline;
            opacity: 0.9;
          }

          /* Typing animation */
          .typing-animation {
            display: inline-flex;
            align-items: center;
            height: 24px;
          }

          .typing-animation .dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 6px;
            background-color: var(--color-primary);
            animation: typing-dot 1.4s infinite ease-in-out both;
          }

          .typing-animation .dot:nth-child(1) {
            animation-delay: -0.32s;
          }

          .typing-animation .dot:nth-child(2) {
            animation-delay: -0.16s;
          }

          @keyframes typing-dot {
            0%, 80%, 100% {
              transform: scale(0.6);
              opacity: 0.6;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ChatMessage;