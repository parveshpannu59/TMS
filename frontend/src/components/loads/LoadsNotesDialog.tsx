import { memo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

type LoadsNotesDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  notes: string;
};

export const LoadsNotesDialog = memo<LoadsNotesDialogProps>(function LoadsNotesDialog({
  open,
  onClose,
  title,
  notes,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          rows={10}
          value={notes}
          disabled
          sx={{
            mt: 1,
            '& .MuiInputBase-input': {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
});
