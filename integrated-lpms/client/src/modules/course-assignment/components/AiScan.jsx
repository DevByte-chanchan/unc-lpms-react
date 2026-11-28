/**
 * The AI look shared by the features that scan a file (school calendar picture/PDF,
 * Program of Study PDF): the blue → purple → pink gradient used by the AI Topic &
 * Subtopic Suggestions dialog, so every "the system reads this for you" feature
 * looks the same.
 *
 *   <AiMark />                 gradient tile with a sparkle (dialog headers)
 *   <AiTitle>…</AiTitle>       gradient heading text
 *   <AiChip>…</AiChip>         small lavender pill ("Scanned by AI", "Read by OCR")
 *   <AiButton …>…</AiButton>   gradient primary button with a sparkle
 *   <AiOutlineButton …>        white button with a gradient border (secondary entry points)
 */
import React from 'react';

// Sampled from the team's AI logo: blue at the top-left, violet in the middle, pink at the bottom-right.
export const AI_BLUE = '#4F6FEE';
export const AI_VIOLET = '#9B59E2';
export const AI_PINK = '#E5569C';
export const AI_GRADIENT = `linear-gradient(90deg, ${AI_BLUE} 0%, ${AI_VIOLET} 55%, ${AI_PINK} 100%)`;
export const AI_GRADIENT_DIAGONAL = `linear-gradient(135deg, ${AI_BLUE} 0%, #6A6CF6 25%, ${AI_VIOLET} 58%, ${AI_PINK} 100%)`;
export const AI_PURPLE = '#7C3AED';
export const AI_TINT = '#F5F3FF';
export const AI_TINT_BORDER = '#DDD6FE';

/** The logo's four-point star: solid, with curved (concave) sides. Follows currentColor. */
export const Sparkle = ({ size = 16, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
    <path fill="currentColor"
      d="M12 1.5C12.9 8.1 15.9 11.1 22.5 12 15.9 12.9 12.9 15.9 12 22.5 11.1 15.9 8.1 12.9 1.5 12 8.1 11.1 11.1 8.1 12 1.5Z" />
  </svg>
);

/** The AI logo: a rounded gradient tile with a white star in the middle. */
export const AiMark = ({ size = 40 }) => (
  <span aria-hidden="true" style={{
    width: size, height: size, borderRadius: Math.round(size * 0.28), flexShrink: 0,
    background: AI_GRADIENT_DIAGONAL, color: '#FFFFFF',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    // The soft violet glow around the logo.
    boxShadow: '0 4px 14px rgba(124, 92, 236, 0.30), 0 0 0 4px rgba(155, 89, 226, 0.08)',
  }}>
    <Sparkle size={Math.round(size * 0.56)} />
  </span>
);

export const AiTitle = ({ children, size = 18, as = 'div', style }) => React.createElement(as, {
  style: {
    margin: 0, fontSize: size, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25,
    background: AI_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', WebkitTextFillColor: 'transparent', display: 'inline-block', ...style,
  },
}, children);

export const AiChip = ({ children, title }) => (
  <span title={title} style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 9999,
    background: AI_TINT, border: '1px solid ' + AI_TINT_BORDER, color: AI_PURPLE,
    fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.6,
  }}>
    {children}
  </span>
);

export function AiButton({ children, disabled, onClick, type = 'button', height = 40, icon = true, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type={type} onClick={onClick} disabled={disabled} {...rest}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        height, padding: '0 20px', borderRadius: 10, border: 'none',
        background: disabled ? '#C4B5FD' : AI_GRADIENT, color: '#FFFFFF',
        fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.7 : 1,
        boxShadow: disabled ? 'none' : hover ? '0 8px 20px rgba(139, 92, 246, 0.38)' : '0 4px 12px rgba(139, 92, 246, 0.25)',
        transform: hover && !disabled ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        ...style,
      }}>
      {icon && <Sparkle size={15} />}
      {children}
    </button>
  );
}

export function AiOutlineButton({ children, disabled, onClick, type = 'button', icon, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type={type} onClick={onClick} disabled={disabled} {...rest}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        height: 36, padding: '0 14px', borderRadius: 10,
        // Gradient border: white padding-box over the gradient border-box.
        border: '1.5px solid transparent',
        background: `linear-gradient(${hover && !disabled ? AI_TINT : '#FFFFFF'}, ${hover && !disabled ? AI_TINT : '#FFFFFF'}) padding-box, ${AI_GRADIENT} border-box`,
        color: AI_PURPLE, fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'background 0.15s ease',
        ...style,
      }}>
      {icon || <Sparkle size={14} />}
      {children}
    </button>
  );
}
