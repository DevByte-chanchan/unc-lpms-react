import React, { useEffect, useState } from 'react';
import { generateCoaepPdf } from '../utils/generateCoaepPdf';

const FilledCOAEPDF = ({ data }) => {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    generateCoaepPdf(data)
      .then((blobUrl) => { if (!cancelled) setUrl(blobUrl); })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [data]);

  if (err) return <div style={{ padding: 32, color: '#b91c1c' }}>Error: {err}</div>;
  if (!url) return <div style={{ padding: 32, color: '#64748b' }}>Generating PDF&hellip;</div>;

  return (
    <iframe
      title="COAEP"
      src={`${url}#toolbar=0&navpanes=0`}
      style={{ flex: 1, width: '100%', border: 'none', background: '#FFFFFF' }}
    />
  );
};

export default FilledCOAEPDF;
