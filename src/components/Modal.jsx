import { useEffect } from 'react';

export default function Modal({ title, subtitle, onClose, children }) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="modal-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <div className="modal" role="dialog" aria-modal="true">
                <div className="modal-header">
                    <div>
                        <h2>{title}</h2>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        닫기
                    </button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}
