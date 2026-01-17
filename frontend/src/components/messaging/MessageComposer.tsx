import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Send, AttachFile, PhotoCamera, Emergency } from '@mui/icons-material';

interface MessageComposerProps {
  onSendMessage: (message: string, type?: 'text' | 'emergency', attachments?: File[]) => void;
  disabled?: boolean;
  allowEmergency?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  disabled = false,
  allowEmergency = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [message, setMessage] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), isEmergency ? 'emergency' : 'text');
      setMessage('');
      setIsEmergency(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onSendMessage('', 'text', files);
      e.target.value = '';
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 1, sm: 2 },
        borderRadius: 0,
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        {allowEmergency && (
          <IconButton
            size="small"
            color={isEmergency ? 'error' : 'default'}
            onClick={() => setIsEmergency(!isEmergency)}
            title="Emergency message"
            sx={{ mb: { xs: 0.5, sm: 1 } }}
          >
            <Emergency />
          </IconButton>
        )}
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={isEmergency ? 'Emergency message...' : 'Type a message...'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          size={isMobile ? 'small' : 'medium'}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
            },
          }}
        />
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            title="Attach image"
          >
            <PhotoCamera fontSize={isMobile ? 'small' : 'medium'} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach file"
          >
            <AttachFile fontSize={isMobile ? 'small' : 'medium'} />
          </IconButton>
          <Button
            variant="contained"
            color={isEmergency ? 'error' : 'primary'}
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            size={isMobile ? 'small' : 'medium'}
            sx={{ minWidth: { xs: 'auto', sm: '80px' } }}
          >
            <Send fontSize={isMobile ? 'small' : 'medium'} />
            {!isMobile && <Box component="span" sx={{ ml: 0.5 }}>Send</Box>}
          </Button>
        </Box>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          onChange={handleFileSelect}
          accept="*/*"
        />
        <input
          ref={imageInputRef}
          type="file"
          hidden
          multiple
          onChange={handleFileSelect}
          accept="image/*"
        />
      </Box>
      {isEmergency && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="error" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
            ⚠️ This will send an emergency alert
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
