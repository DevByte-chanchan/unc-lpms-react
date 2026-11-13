import React from 'react';
import { createPortal } from 'react-dom';
import DocumentViewer, { getFileType, canPreviewFile, getNewTabUrl } from './DocumentViewer.jsx';
import styles from '../styles/AttachmentPreviewModal.module.sass';

export { getFileType, canPreviewFile, getNewTabUrl };

const AttachmentPreviewModal = ({ isOpen, file, onClose }) => {
    if (!isOpen || !file) return null;

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div onClick={e => e.stopPropagation()}>
                <DocumentViewer file={file} mode="modal" onClose={onClose} />
            </div>
        </div>,
        document.body
    );
};

export default AttachmentPreviewModal;
