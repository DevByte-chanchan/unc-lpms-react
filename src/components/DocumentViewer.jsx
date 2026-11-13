import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Download, ExternalLink, FileText, Loader, AlertCircle, Image as ImageIcon, Search } from 'react-feather';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
import styles from '../styles/AttachmentPreviewModal.module.sass';

export const getFileType = (filename = '') => {
    const ext = (filename || '').toLowerCase().split('.').pop();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'excel';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
    if (['txt', 'log', 'md'].includes(ext)) return 'text';
    return 'other';
};

export const canPreviewFile = (filename = '') => {
    return /\.(pdf|docx|doc|xlsx|xls|csv|png|jpe?g|webp|gif|svg|txt|log|md)$/i.test(filename || '');
};

export const getNewTabUrl = (file) => {
    if (!file) return '#';
    const filepath = file.filepath || '';
    const filename = file.filename || filepath;
    return `/preview-attachment?filepath=${encodeURIComponent(filepath)}&filename=${encodeURIComponent(filename)}`;
};

const DocumentViewer = ({ file, mode = 'modal', onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sheetsData, setSheetsData] = useState(null);
    const [activeSheet, setActiveSheet] = useState('');
    const [textContent, setTextContent] = useState('');
    const [docxBuffer, setDocxBuffer] = useState(null);
    const docxRef = useRef(null);

    const filename = file?.filename || file?.filepath || 'Document';
    const fileType = file ? getFileType(filename) : null;
    const fileUrl = file ? (file.url || `/api/attachments/download/${encodeURIComponent(file.filepath)}?inline=1`) : '';
    const downloadUrl = file ? `/api/attachments/download/${encodeURIComponent(file.filepath)}?name=${encodeURIComponent(filename)}` : '';

    // Handle Escape key
    useEffect(() => {
        if (!onClose) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Load file content based on type
    useEffect(() => {
        if (!file) {
            setLoading(false);
            setError(null);
            setSheetsData(null);
            setDocxBuffer(null);
            setTextContent('');
            return;
        }

        setError(null);
        setDocxBuffer(null);
        setSheetsData(null);
        setTextContent('');

        if (fileType === 'docx') {
            setLoading(true);
            fetch(fileUrl)
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
                    return res.arrayBuffer();
                })
                .then(buffer => {
                    setDocxBuffer(buffer);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Word preview error:', err);
                    setError('Unable to preview this Word document directly. You can download it to view it.');
                    setLoading(false);
                });
        } else if (fileType === 'excel') {
            setLoading(true);
            fetch(fileUrl)
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
                    return res.arrayBuffer();
                })
                .then(buffer => {
                    const workbook = XLSX.read(buffer, { type: 'array' });
                    const sheetNames = workbook.SheetNames || [];
                    const sheetsMap = {};
                    sheetNames.forEach(name => {
                        const worksheet = workbook.Sheets[name];
                        const html = XLSX.utils.sheet_to_html(worksheet, { header: '', footer: '' });
                        sheetsMap[name] = html;
                    });
                    setSheetsData({ sheetNames, sheetsMap });
                    setActiveSheet(sheetNames[0] || '');
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Excel preview error:', err);
                    setError('Unable to preview this spreadsheet directly. You can download it to view it.');
                    setLoading(false);
                });
        } else if (fileType === 'text') {
            setLoading(true);
            fetch(fileUrl)
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
                    return res.text();
                })
                .then(txt => {
                    setTextContent(txt);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Text preview error:', err);
                    setError('Unable to preview this text file.');
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [file, fileType, fileUrl]);

    // Render Word document once docxBuffer and docxRef DOM node are ready
    useEffect(() => {
        if (!docxBuffer || !docxRef.current) return;
        docxRef.current.innerHTML = '';
        renderAsync(docxBuffer, docxRef.current, null, {
            className: 'docx',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
            useBase64URL: true,
            renderHeaders: true,
            renderFooters: true
        }).catch(err => {
            console.error('Word render error:', err);
            setError('Unable to preview this Word document directly. You can download it to view it.');
        });
    }, [docxBuffer]);

    const renderBadge = () => {
        if (fileType === 'pdf') return <span className={`${styles.badge} ${styles.badgePdf}`}>PDF</span>;
        if (fileType === 'docx') return <span className={`${styles.badge} ${styles.badgeDocx}`}>DOCX</span>;
        if (fileType === 'excel') return <span className={`${styles.badge} ${styles.badgeExcel}`}>SPREADSHEET</span>;
        if (fileType === 'image') return <span className={`${styles.badge} ${styles.badgeImage}`}>IMAGE</span>;
        if (fileType === 'text') return <span className={`${styles.badge} ${styles.badgeText}`}>TEXT</span>;
        return <span className={`${styles.badge} ${styles.badgeGeneric}`}>DOCUMENT</span>;
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className={styles.loadingWrap}>
                    <Loader size={32} className={styles.spinner} />
                    <span>Loading document preview…</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className={styles.errorWrap}>
                    <AlertCircle size={36} color="#DC2626" />
                    <p>{error}</p>
                    <a href={downloadUrl} download={filename} className={styles.actionBtn}>
                        <Download size={14} /> Download File
                    </a>
                </div>
            );
        }

        if (fileType === 'pdf') {
            return (
                <iframe
                    src={fileUrl}
                    className={styles.iframe}
                    title={filename}
                />
            );
        }

        if (fileType === 'docx') {
            return (
                <div className={styles.docxContainer}>
                    <div ref={docxRef} />
                </div>
            );
        }

        if (fileType === 'excel' && sheetsData) {
            const currentHtml = (sheetsData.sheetsMap && sheetsData.sheetsMap[activeSheet]) || '';
            return (
                <div className={styles.sheetsContainer}>
                    {sheetsData.sheetNames.length > 1 && (
                        <div className={styles.sheetTabs}>
                            {sheetsData.sheetNames.map(name => (
                                <button
                                    key={name}
                                    type="button"
                                    className={`${styles.sheetTab}${activeSheet === name ? ` ${styles.sheetTabActive}` : ''}`}
                                    onClick={() => setActiveSheet(name)}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className={styles.sheetTableWrap}>
                        {!currentHtml ? (
                            <div className={styles.loadingWrap}>This sheet is empty.</div>
                        ) : (
                            <div
                                className={styles.excelHtmlWrap}
                                dangerouslySetInnerHTML={{ __html: currentHtml }}
                            />
                        )}
                    </div>
                </div>
            );
        }

        if (fileType === 'image') {
            return (
                <div className={styles.imageContainer}>
                    <img src={fileUrl} alt={filename} className={styles.imagePreview} />
                </div>
            );
        }

        if (fileType === 'text') {
            return (
                <div className={styles.textContainer}>
                    <pre className={styles.textPre}>{textContent}</pre>
                </div>
            );
        }

        return (
            <div className={styles.errorWrap}>
                <FileText size={36} color="#6B7280" />
                <p>Preview is not supported for this file format.</p>
                <a href={downloadUrl} download={filename} className={styles.actionBtn}>
                    <Download size={14} /> Download File
                </a>
            </div>
        );
    };

    const newTabUrl = getNewTabUrl(file);

    return (
        <div className={mode === 'page' ? styles.standalonePage : styles.modal}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    {fileType === 'image' ? (
                        <ImageIcon size={20} className={styles.fileIcon} />
                    ) : (
                        <FileText size={20} className={styles.fileIcon} />
                    )}
                    <h3 className={styles.title} title={filename}>{filename}</h3>
                    {renderBadge()}
                </div>
                <div className={styles.headerRight}>
                    {mode === 'modal' && (
                        <a
                            href={newTabUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.actionBtn}
                            title="Open preview in a new browser tab"
                        >
                            <ExternalLink size={14} />
                            <span>New Tab</span>
                        </a>
                    )}
                    <a
                        href={downloadUrl}
                        download={filename}
                        className={styles.actionBtn}
                        title="Download file"
                    >
                        <Download size={14} />
                        <span>Download</span>
                    </a>
                    {onClose && (
                        <button
                            type="button"
                            className={styles.closeBtn}
                            onClick={onClose}
                            title={mode === 'page' ? "Close tab" : "Close preview"}
                            aria-label="Close"
                        >
                            <X size={14} strokeWidth={2.4} />
                            <span>Close</span>
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.body}>
                {renderContent()}
            </div>
        </div>
    );
};

export default DocumentViewer;
