// Opens and closes its content by sliding its height (index.css: .reveal), instead of popping in. While closed the
// content stays mounted but is hidden from screen readers and the keyboard.
const Reveal = ({ open, children }) => (
  <div className="reveal" data-open={open || undefined} inert={!open} aria-hidden={!open}>
    <div className="reveal-inner">{children}</div>
  </div>
)

export default Reveal
