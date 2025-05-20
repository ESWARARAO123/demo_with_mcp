import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  StopIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  LightBulbIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { chatInputStyles } from './chatStyles';
import FileUploadButton from './FileUploadButton';
import FilePreview from './FilePreview';
import './ChatInput.css';
import { config } from '../../config';
import { chat2sqlService } from '../../services/chat2sqlService';

interface ChatInputProps {
  onSendMessage: (message: string, file?: File, isSystemMessage?: boolean) => void;
  isLoading: boolean;
  isEmpty?: boolean;
  isStreaming?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  onStopGeneration?: () => void;
  isRagAvailable?: boolean;
  isRagEnabled?: boolean;
  onToggleRag?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  isEmpty = false,
  isStreaming = false,
  isUploading = false,
  uploadProgress = 0,
  onStopGeneration,
  isRagAvailable = false,
  isRagEnabled = true,
  onToggleRag
}) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [chat2sqlEnabled, setChat2sqlEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isUploading) {
      inputRef.current?.focus();
    }
  }, [isLoading, isUploading]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleAutoUpload = (file: File) => {
    onSendMessage('', file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleToggle = () => {
    console.log('Chat2SQL toggle clicked, current state:', chat2sqlEnabled);
    setChat2sqlEnabled((prev) => !prev);
    // Clear any existing input when toggling
    setInput('');
    // Clear any selected file
    setSelectedFile(null);
  };

  const formatSQLResponse = (result: any) => {
    // Format SQL query in a code block
    const sqlBox = `SQL Query:\n\`\`\`sql\n${result.sql}\n\`\`\``;
    
    // Format results in a table
    let resultsBox = '';
    if (result.data && result.data.length > 0) {
      // Create a markdown table
      const header = result.columns.join(" | ");
      const separator = result.columns.map(() => "---").join(" | ");
      const rows = result.data
        .map((row: any) => result.columns.map(col => {
          const value = row[col];
          return value === null ? 'NULL' : String(value).replace(/\|/g, '\\|');
        }).join(" | "))
        .join("\n");
      
      resultsBox = `Query Results:\n\`\`\`\n${header}\n${separator}\n${rows}\n\`\`\``;
    } else {
      resultsBox = "No results found.";
    }
    
    // Combine both boxes with a separator
    return `${sqlBox}\n\n${resultsBox}`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    if (chat2sqlEnabled) {
      setLoading(true);
      try {
        // Send user's message first (this will appear on the right)
        const userMessage = input.trim();
        onSendMessage(userMessage, undefined, false); // false for user message
        
        // Execute the query through the API endpoint
        const result = await chat2sqlService.executeQuery(userMessage);
        
        if (result.sql && result.data) {
          // Format the SQL response with just the query and table data
          const formattedMessage = `\`\`\`sql\n${result.sql}\n\`\`\`\n\n${formatTableData(result.columns, result.data)}`;
          onSendMessage(formattedMessage, undefined, true); // true for system message
        } else if (result.detail) {
          // If there's an error message from the API, show it
          onSendMessage(result.detail, undefined, true);
        } else {
          // If no data and no error message, show message below the query
          const noResultsMessage = `\`\`\`sql\n${result.sql || input}\n\`\`\`\n\nNo results found`;
          onSendMessage(noResultsMessage, undefined, true);
        }
      } catch (err) {
        // On error, show the error message
        const errorMessage = err instanceof Error ? err.message : String(err);
        onSendMessage(errorMessage, undefined, true);
      } finally {
        setLoading(false);
      }
    } else {
      // Regular chat mode
      onSendMessage(input.trim());
    }
    setInput("");
  };

  // Helper function to format table data
  const formatTableData = (columns: string[], data: any[]): string => {
    if (!data || data.length === 0) return '';
    
    // Create header
    const header = columns.join("\t");
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col];
        return value === null ? 'NULL' : String(value);
      }).join("\t")
    ).join("\n");
    
    return `${header}\n${rows}`;
  };

  const showManualUploadButton = selectedFile && !isUploading && !isLoading;

  return (
    <div
      style={{
        ...chatInputStyles.container,
        maxWidth: isEmpty ? '650px' : '900px',
        width: isEmpty ? '90vw' : '100%',
        transform: 'none',
        transition: 'all 0.3s ease',
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        border: '1px solid var(--color-border)',
        marginTop: isEmpty ? '20px' : '0'
      }}
    >
      {selectedFile && !chat2sqlEnabled && (
        <div style={chatInputStyles.filePreviewContainer}>
          <FilePreview
            file={selectedFile}
            onRemove={handleRemoveFile}
            uploadProgress={isUploading ? uploadProgress : undefined}
          />
          {showManualUploadButton && (
            <button
              type="button"
              onClick={() => handleAutoUpload(selectedFile)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                marginLeft: '8px',
                cursor: 'pointer',
              }}
            >
              <ArrowUpTrayIcon className="h-3 w-3 mr-1" />
              Upload Now
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{
          ...chatInputStyles.inputRow,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1.5rem',
          padding: '0.25rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <textarea
            ref={inputRef}
            placeholder={chat2sqlEnabled ? "Ask a question about your data..." : (isEmpty ? "Ask anything" : "Ask anything...")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{
              ...chatInputStyles.input,
              padding: isEmpty ? '0.75rem 1rem' : '0.75rem 1rem',
              height: 'auto',
              minHeight: '44px',
              maxHeight: '150px',
              resize: 'none',
              overflow: 'auto',
              borderRadius: '1.5rem',
              border: 'none',
              backgroundColor: 'transparent',
            }}
            disabled={isLoading || isUploading || loading}
          />

          <div style={{ marginLeft: '0.5rem' }}>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopGeneration}
                style={{
                  ...chatInputStyles.sendButton,
                  backgroundColor: 'var(--color-error)',
                  transform: 'scale(1.05)',
                  transition: 'all 0.2s ease',
                }}
                aria-label="Stop generation"
                title="Stop generation"
              >
                <StopIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={input.trim() === '' || isLoading || isUploading || loading}
                style={{
                  ...chatInputStyles.sendButton,
                  ...(input.trim() === '' || isLoading || isUploading || loading ? chatInputStyles.disabledSendButton : {}),
                  transform: input.trim() !== '' && !isLoading && !isUploading && !loading ? 'scale(1.05)' : 'scale(1)',
                }}
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
            paddingLeft: '0.25rem',
            overflowX: 'auto',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
          }}
          className="hide-scrollbar"
        >
          {!chat2sqlEnabled && (
            <FileUploadButton
              onFileSelect={handleFileSelect}
              onAutoUpload={handleAutoUpload}
              autoUpload={true}
              isLoading={isLoading || isUploading}
              acceptedFileTypes=".pdf,.docx,.txt"
              disabled={isStreaming}
            />
          )}

          {!chat2sqlEnabled && (
            <button
              type="button"
              onClick={onToggleRag}
              disabled={!isRagAvailable || isLoading || isUploading || isStreaming}
              style={{
                ...chatInputStyles.ragToggleButton,
                ...(isRagEnabled && isRagAvailable ? chatInputStyles.ragToggleEnabled : chatInputStyles.ragToggleDisabled),
                opacity: (!isRagAvailable || isLoading || isUploading || isStreaming) ? 0.5 : 1,
                cursor: (!isRagAvailable || isLoading || isUploading || isStreaming) ? 'not-allowed' : 'pointer',
              }}
              className="hover:bg-opacity-90 transition-all"
              aria-label={isRagEnabled ? "Disable document-based answers" : "Enable document-based answers"}
              title={!isRagAvailable ? "Upload documents to enable RAG" : (isRagEnabled ? "Disable document-based answers" : "Enable document-based answers")}
            >
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              RAG
            </button>
          )}

          <button
            type="button"
            onClick={handleToggle}
            style={{
              ...chatInputStyles.ragToggleButton,
              ...(chat2sqlEnabled ? chatInputStyles.ragToggleEnabled : chatInputStyles.ragToggleDisabled),
              opacity: chat2sqlEnabled ? 1 : 0.6,
              cursor: 'pointer',
              backgroundColor: chat2sqlEnabled ? 'var(--color-primary)' : 'var(--color-background-secondary)',
              color: chat2sqlEnabled ? 'white' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
            className="hover:bg-opacity-90 transition-all"
            aria-label={chat2sqlEnabled ? "Disable Chat2SQL" : "Enable Chat2SQL"}
            title={chat2sqlEnabled ? "Disable Chat2SQL" : "Enable Chat2SQL"}
          >
            <DocumentTextIcon className="h-4 w-4" />
            {chat2sqlEnabled ? "Chat2SQL Enabled" : "Chat2SQL"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;