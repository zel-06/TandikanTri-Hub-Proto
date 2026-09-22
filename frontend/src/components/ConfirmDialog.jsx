export default function ConfirmDialog({
  open, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel, theme = 'dark',
}) {
  if (!open) return null;

  const light = theme === 'light';

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>
        <p style={{ color: light ? '#475569' : '#d8e4ff', margin: '0 0 1.5rem' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className={light ? 'btn btn-outline' : 'btn btn-secondary'} type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={light ? 'btn btn-primary' : 'action-btn btn-delete'}
            style={light ? { padding: '0.75rem 1.5rem', fontSize: '0.95rem' } : { padding: '0.65rem 1.3rem', fontSize: '0.95rem' }}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
