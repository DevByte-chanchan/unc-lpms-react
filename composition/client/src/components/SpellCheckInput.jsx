import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    tokenizeAndCheckText,
    getSuggestions,
    addToWhitelist,
    subscribeWhitelist
} from '../utils/spellChecker.js';
import styles from '../styles/SpellCheckInput.module.sass';

const MIRROR_STYLE_PROPS = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'textTransform',
    'wordSpacing',
    'textIndent',
    'textAlign',
    'lineHeight',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'boxSizing'
];

/**
 * Reusable SpellCheckInput / SpellCheckTextarea component.
 * Renders a native <input> or <textarea> (preserving 100% native caret behavior, undo/redo, selection, and styling)
 * paired with a synchronized mirror backdrop that renders red wavy underlines (`text-decoration: underline wavy #ef4444`)
 * strictly under misspelled words, plus a right-click context menu with `nspell.suggest(word)` suggestions and
 * an "Ignore / Add to Whitelist" action.
 */
const SpellCheckInput = ({
    multiline = false,
    value = '',
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    disabled = false,
    readOnly = false,
    placeholder = '',
    className = '',
    style,
    rows = 3,
    type = 'text',
    spellCheckEnabled = true,
    ...restProps
}) => {
    const inputRef = useRef(null);
    const backdropRef = useRef(null);
    const popoverRef = useRef(null);

    const [whitelistVersion, setWhitelistVersion] = useState(0);
    const [mirrorStyle, setMirrorStyle] = useState({});
    const [contextMenu, setContextMenu] = useState(null);

    const stringValue = value == null ? '' : String(value);
    const isSpellActive = Boolean(spellCheckEnabled && !disabled && !readOnly);

    // Subscribe to session whitelist updates so adding a word immediately removes all matching red underlines
    useEffect(() => {
        return subscribeWhitelist(() => {
            setWhitelistVersion(v => v + 1);
        });
    }, []);

    // Copy computed typography and padding styles from the native input/textarea so the mirror overlay aligns pixel-for-pixel
    const syncMirrorStyles = useCallback(() => {
        const el = inputRef.current;
        if (!el || typeof window === 'undefined') return;
        const computed = window.getComputedStyle(el);
        const nextStyle = {};
        MIRROR_STYLE_PROPS.forEach(prop => {
            nextStyle[prop] = computed[prop];
        });
        setMirrorStyle(prev => {
            const changed = MIRROR_STYLE_PROPS.some(p => prev[p] !== nextStyle[p]);
            return changed ? nextStyle : prev;
        });
    }, []);

    const syncScrollPosition = useCallback(() => {
        const el = inputRef.current;
        const backdrop = backdropRef.current;
        if (!el || !backdrop) return;
        backdrop.scrollTop = el.scrollTop;
        backdrop.scrollLeft = el.scrollLeft;
    }, []);

    useLayoutEffect(() => {
        syncMirrorStyles();
        syncScrollPosition();
    }, [syncMirrorStyles, syncScrollPosition, className, multiline, rows, stringValue]);

    useEffect(() => {
        if (typeof ResizeObserver === 'undefined' || !inputRef.current) return;
        const observer = new ResizeObserver(() => {
            syncMirrorStyles();
            syncScrollPosition();
        });
        observer.observe(inputRef.current);
        return () => observer.disconnect();
    }, [syncMirrorStyles, syncScrollPosition]);

    // Real-time word tokenization & spell checking as the user types
    const tokens = useMemo(() => {
        void whitelistVersion;
        if (!isSpellActive || !stringValue) return [];
        return tokenizeAndCheckText(stringValue, {
            requireBoundaryAtEnd: false
        });
    }, [stringValue, isSpellActive, whitelistVersion]);

    // Close context menu on outside click, scroll, or Escape key
    useEffect(() => {
        if (!contextMenu) return;

        const handleMouseDown = (e) => {
            if (popoverRef.current && popoverRef.current.contains(e.target)) return;
            setContextMenu(null);
        };

        const handleKeyDownWindow = (e) => {
            if (e.key === 'Escape') {
                setContextMenu(null);
            }
        };

        const handleScrollWindow = (e) => {
            if (popoverRef.current && popoverRef.current.contains(e.target)) return;
            setContextMenu(null);
        };

        document.addEventListener('mousedown', handleMouseDown, true);
        window.addEventListener('keydown', handleKeyDownWindow, true);
        window.addEventListener('scroll', handleScrollWindow, true);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown, true);
            window.removeEventListener('keydown', handleKeyDownWindow, true);
            window.removeEventListener('scroll', handleScrollWindow, true);
        };
    }, [contextMenu]);

    const emitChange = (nextText, nextCaretPos = null) => {
        if (!onChange) return;
        const syntheticEvent = {
            target: { value: nextText },
            currentTarget: { value: nextText }
        };
        onChange(syntheticEvent);

        if (nextCaretPos != null && inputRef.current) {
            requestAnimationFrame(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    try {
                        inputRef.current.setSelectionRange(nextCaretPos, nextCaretPos);
                    } catch {
                        // Ignore selection range errors on unsupported input types
                    }
                    syncScrollPosition();
                }
            });
        }
    };

    const handleInputChange = (e) => {
        if (contextMenu) setContextMenu(null);
        if (onChange) {
            onChange(e);
        }
        requestAnimationFrame(syncScrollPosition);
    };

    const handleFocus = (e) => {
        syncMirrorStyles();
        syncScrollPosition();
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e) => {
        syncScrollPosition();
        if (onBlur) onBlur(e);
    };

    /**
     * Right-click handler:
     * 1. Hit-tests the exact span in the mirror backdrop at (e.clientX, e.clientY).
     * 2. Falls back to checking if the current caret / selectionStart is inside a misspelled word.
     * 3. If a misspelled word is targeted, prevents the default browser context menu and opens the custom suggestion popover.
     */
    const handleContextMenu = (e) => {
        if (!isSpellActive || !stringValue) return;

        syncScrollPosition();

        let targetToken = null;
        const backdrop = backdropRef.current;

        // 1. Hit-test the exact span in the mirror backdrop at (e.clientX, e.clientY)
        if (backdrop) {
            const prevPointerEvents = backdrop.style.pointerEvents;
            const inputEl = inputRef.current;
            const prevInputPointer = inputEl ? inputEl.style.pointerEvents : '';

            try {
                if (inputEl) inputEl.style.pointerEvents = 'none';
                backdrop.style.pointerEvents = 'auto';
                const hitEl = document.elementFromPoint(e.clientX, e.clientY);
                if (hitEl && hitEl.dataset && hitEl.dataset.misspelledIndex != null) {
                    const tokenIdx = Number(hitEl.dataset.misspelledIndex);
                    const candidate = tokens[tokenIdx];
                    if (candidate && candidate.isWord && candidate.isMisspelled) {
                        targetToken = candidate;
                    }
                }
            } finally {
                backdrop.style.pointerEvents = prevPointerEvents;
                if (inputEl) inputEl.style.pointerEvents = prevInputPointer;
            }
        }

        // 2. Fallback: check if the current caret / selectionStart is inside a misspelled word
        if (!targetToken && inputRef.current && typeof inputRef.current.selectionStart === 'number') {
            const pos = inputRef.current.selectionStart;
            targetToken = tokens.find(
                t => t.isWord && t.isMisspelled && pos >= t.start && pos <= t.end
            ) || null;
        }

        if (!targetToken) {
            setContextMenu(null);
            return;
        }

        // Prevent native browser context menu for misspelled words
        e.preventDefault();
        e.stopPropagation();

        const suggestions = getSuggestions(targetToken.cleanWord, 6);

        // Keep popover within viewport bounds
        const menuWidth = 230;
        const menuEstimatedHeight = Math.min(300, 95 + Math.max(1, suggestions.length) * 32);
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        const left = Math.max(8, Math.min(e.clientX, viewportW - menuWidth - 12));
        const top = (e.clientY + menuEstimatedHeight + 12 > viewportH)
            ? Math.max(8, e.clientY - menuEstimatedHeight - 6)
            : e.clientY + 6;

        setContextMenu({
            word: targetToken.text,
            cleanWord: targetToken.cleanWord,
            start: targetToken.start,
            end: targetToken.end,
            suggestions,
            x: left,
            y: top
        });
    };

    const handleApplySuggestion = (suggestion) => {
        if (!contextMenu) return;
        const { start, end, word } = contextMenu;

        const leadingMatch = word.match(/^[^A-Za-z0-9]+/);
        const trailingMatch = word.match(/[^A-Za-z0-9]+$/);
        const leading = leadingMatch ? leadingMatch[0] : '';
        const trailing = trailingMatch ? trailingMatch[0] : '';

        const replacement = `${leading}${suggestion}${trailing}`;
        const nextText = stringValue.slice(0, start) + replacement + stringValue.slice(end);
        const nextCaret = start + replacement.length;

        setContextMenu(null);
        emitChange(nextText, nextCaret);
    };

    const handleIgnoreWord = () => {
        if (!contextMenu) return;
        addToWhitelist(contextMenu.cleanWord);
        setContextMenu(null);
    };

    const renderTokens = () =>
        tokens.map((token, idx) => {
            if (token.isWord && token.isMisspelled) {
                return (
                    <span
                        key={`${token.start}-${idx}`}
                        data-misspelled-index={idx}
                        className={styles.misspelledWord}
                    >
                        {token.text}
                    </span>
                );
            }
            return <React.Fragment key={`${token.start}-${idx}`}>{token.text}</React.Fragment>;
        });

    return (
        <div
            className={`${styles.spellWrapper} ${
                multiline ? styles.multilineWrapper : styles.singleLineWrapper
            }`}
        >
            {/* Synchronized Mirror Backdrop for Red Wavy Underlines */}
            {isSpellActive && stringValue.length > 0 && (
                <div
                    ref={backdropRef}
                    aria-hidden="true"
                    className={`${styles.mirrorBackdrop} ${
                        multiline ? styles.mirrorMultiline : styles.mirrorSingleLine
                    }`}
                    style={mirrorStyle}
                >
                    {multiline ? (
                        <>
                            {renderTokens()}
                            {stringValue.endsWith('\n') ? '\n' : null}
                        </>
                    ) : (
                        <span className={styles.mirrorInlineTrack}>
                            {renderTokens()}
                        </span>
                    )}
                </div>
            )}

            {/* Native Input or Textarea */}
            {multiline ? (
                <textarea
                    ref={inputRef}
                    rows={rows}
                    className={`${className} ${styles.spellNativeControl}`}
                    disabled={disabled}
                    readOnly={readOnly}
                    value={stringValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyUp={syncScrollPosition}
                    onClick={syncScrollPosition}
                    onSelect={syncScrollPosition}
                    onScroll={syncScrollPosition}
                    onContextMenu={handleContextMenu}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    style={style}
                    {...restProps}
                />
            ) : (
                <input
                    ref={inputRef}
                    type={type}
                    className={`${className} ${styles.spellNativeControl}`}
                    disabled={disabled}
                    readOnly={readOnly}
                    value={stringValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyUp={syncScrollPosition}
                    onClick={syncScrollPosition}
                    onSelect={syncScrollPosition}
                    onScroll={syncScrollPosition}
                    onContextMenu={handleContextMenu}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    style={style}
                    {...restProps}
                />
            )}

            {/* Custom Right-Click Suggestion Dropdown / Popover */}
            {contextMenu && typeof document !== 'undefined' && createPortal(
                <div
                    ref={popoverRef}
                    className={styles.suggestionPopover}
                    style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                    role="menu"
                    aria-label={`Spelling suggestions for ${contextMenu.cleanWord}`}
                >
                    <div className={styles.popoverHeader}>
                        <span className={styles.popoverLabel}>Spelling Suggestions</span>
                        <span className={styles.flaggedWordPill}>{contextMenu.cleanWord}</span>
                    </div>

                    <div className={styles.suggestionList}>
                        {contextMenu.suggestions.length > 0 ? (
                            contextMenu.suggestions.map((sug) => (
                                <button
                                    key={sug}
                                    type="button"
                                    className={styles.suggestionItem}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleApplySuggestion(sug);
                                    }}
                                >
                                    <span className={styles.suggestionWord}>{sug}</span>
                                    <span className={styles.replaceHint}>Replace</span>
                                </button>
                            ))
                        ) : (
                            <div className={styles.noSuggestions}>No suggestions found</div>
                        )}
                    </div>

                    <div className={styles.popoverDivider} />

                    <button
                        type="button"
                        className={styles.whitelistBtn}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleIgnoreWord();
                        }}
                    >
                        <span>Ignore / Add to Whitelist</span>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SpellCheckInput;
