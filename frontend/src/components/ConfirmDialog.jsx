export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>
        <p style={{ color: '#d8e4ff', margin: '0 0 1.5rem' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
          <button
            className="action-btn btn-delete"
            style={{ padding: '0.65rem 1.3rem', fontSize: '0.95rem' }}
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
