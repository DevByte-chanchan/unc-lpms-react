import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Plus, X } from 'react-feather';
import styles from '../styles/SyllabusSections.module.sass';

const LibraryDirectorSuggestions = ({ courseCode, onAddReferences }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [acceptedReferences, setAcceptedReferences] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    // Get suggestions from localStorage
    const allSuggestions = JSON.parse(localStorage.getItem('library_suggestions') || '{}');
    const courseSuggestions = allSuggestions[courseCode] || [];
    setSuggestions(courseSuggestions);
  }, [courseCode]);

  const handleAcceptReference = (index, reference) => {
    setAcceptedReferences(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleAddSelectedReferences = () => {
    const selected = Object.keys(acceptedReferences)
      .filter(key => acceptedReferences[key])
      .map(index => {
        const ref = suggestions[index];
        return {
          id: `lib_${ref.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
          title: ref.name,
          authors: 'Director of Libraries Recommendation',
          type: 'Library Resource',
          link: ref.name,
          year: new Date(ref.uploadedAt).getFullYear()
        };
      });

    if (selected.length > 0) {
      onAddReferences(selected);
      // Mark as used
      const updatedSuggestions = suggestions.filter((_, i) => !acceptedReferences[i]);
      setSuggestions(updatedSuggestions);
      setAcceptedReferences({});
      alert(`Added ${selected.length} reference(s) from library suggestions.`);
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#ecfdf5',
      border: '2px solid #10b981',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={24} style={{ color: '#10b981' }} />
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#065f46' }}>Library Director Suggestions</h3>
            <p style={{ margin: '0', fontSize: '14px', color: '#059669' }}>
              {suggestions.length} reference(s) suggested by SANTOS, MARIA (Director of Libraries)
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#059669',
            padding: '5px'
          }}
        >
          {showSuggestions ? '▼' : '▶'}
        </button>
      </div>

      {showSuggestions && (
        <>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            marginBottom: '16px',
            backgroundColor: '#fff',
            borderRadius: '6px',
            padding: '12px'
          }}>
            {suggestions.map((reference, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '12px',
                borderBottom: index < suggestions.length - 1 ? '1px solid #d1fae5' : 'none',
                gap: '12px'
              }}>
                <input
                  type="checkbox"
                  checked={acceptedReferences[index] || false}
                  onChange={() => handleAcceptReference(index, reference)}
                  style={{
                    marginTop: '4px',
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: '500', color: '#065f46' }}>
                    {reference.name}
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#059669' }}>
                    {reference.type} • {new Date(reference.uploadedAt).toLocaleDateString()}
                  </p>
                  <p style={{ margin: '0', fontSize: '11px', color: '#0d9488' }}>
                    Suggested by {reference.suggestedBy} • {new Date(reference.suggestedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {Object.values(acceptedReferences).some(v => v) && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAddSelectedReferences}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} />
                Add Selected to References
              </button>
              <button
                onClick={() => setAcceptedReferences({})}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#e0fdf4',
                  color: '#059669',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Clear Selection
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LibraryDirectorSuggestions;
