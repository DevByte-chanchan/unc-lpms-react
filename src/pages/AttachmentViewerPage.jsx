import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DocumentViewer from '../components/DocumentViewer.jsx';

const AttachmentViewerPage = () => {
    const [searchParams] = useSearchParams();
    const filepath = searchParams.get('filepath') || '';
    const filename = searchParams.get('filename') || filepath || 'Attachment';

    useEffect(() => {
        if (filename) {
            document.title = `${filename} · LPMS Document Viewer`;
        }
    }, [filename]);

    if (!filepath) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, fontFamily: 'sans-serif', color: '#4B5563' }}>
                <h3 style={{ margin: 0, color: '#111827' }}>No file specified</h3>
                <p style={{ margin: 0 }}>Please provide a valid file path to preview.</p>
            </div>
        );
    }

    return (
        <DocumentViewer
            file={{ filepath, filename }}
            mode="page"
            onClose={() => window.close()}
        />
    );
};

export default AttachmentViewerPage;
