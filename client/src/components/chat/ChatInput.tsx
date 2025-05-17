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
  onSendMessage: (message: string, file?: File) => void;
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

  const handleToggle = () => setChat2sqlEnabled((prev) => !prev);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    if (chat2sqlEnabled) {
      setLoading(true);
      try {
        // Send user's message first (this will appear on the right)
        onSendMessage(`[USER] ${input.trim()}`);
        
        // Execute the query through the API endpoint
        const result = await chat2sqlService.executeQuery(input.trim());
        
        if (result.sql && result.data) {
          // Format the SQL query and results
          let message = `[SYSTEM] \`\`\`sql\n${result.sql}\n\`\`\``;
          
          if (result.data.length > 0) {
            const header = result.columns.join(" | ");
            const separator = result.columns.map(() => "---").join(" | ");
            const rows = result.data
              .map((row: any) => result.columns.map(col => row[col]).join(" | "))
              .join("\n");
            message += `\n\n${header}\n${separator}\n${rows}`;
          } else {
            message += "\n\nNo results found.";
          }
          
          // Send the formatted response as a system message (this will appear on the left)
          onSendMessage(message);
        } else if (result.detail) {
          onSendMessage(`[SYSTEM] Error: ${result.detail}`);
        }
      } catch (err) {
        onSendMessage(`[SYSTEM] Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Only use model if Chat2SQL is disabled
      onSendMessage(input.trim());
    }
    setInput("");
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
      {selectedFile && (
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
            placeholder={isEmpty ? "Ask anything" : "Ask anything..."}
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
            disabled={isLoading || isUploading}
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
                disabled={input.trim() === '' || isLoading || isUploading}
                style={{
                  ...chatInputStyles.sendButton,
                  ...(input.trim() === '' || isLoading || isUploading ? chatInputStyles.disabledSendButton : {}),
                  transform: input.trim() !== '' && !isLoading && !isUploading ? 'scale(1.05)' : 'scale(1)',
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
          <FileUploadButton
            onFileSelect={handleFileSelect}
            onAutoUpload={handleAutoUpload}
            autoUpload={true}
            isLoading={isLoading || isUploading}
            acceptedFileTypes=".pdf,.docx,.txt"
            disabled={isStreaming}
          />

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

          <button
            type="button"
            onClick={handleToggle}
            style={{
              ...chatInputStyles.ragToggleButton,
              ...(chat2sqlEnabled ? chatInputStyles.ragToggleEnabled : chatInputStyles.ragToggleDisabled),
              opacity: chat2sqlEnabled ? 1 : 0.6,
              cursor: 'pointer',
            }}
            className="hover:bg-opacity-90 transition-all"
            aria-label="Convert chat to SQL"
            title="Convert chat to SQL"
          >
            <DocumentTextIcon className="h-4 w-4 mr-1" />
            Chat2SQL
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;