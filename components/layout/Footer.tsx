export function Footer() {
  return (
    <footer className="bg-surface-container-low flex flex-col gap-6 md:flex-row md:gap-8 justify-between items-center w-full px-12 py-10">
      <div className="font-body text-[10px] tracking-widest uppercase font-medium text-on-surface-variant order-1">
        © InnovateLocal // A Non-Profit Community Institution
      </div>
      <div className="font-body text-[10px] tracking-[0.28em] uppercase font-bold text-primary order-3 md:order-2">
        A Public Works for the AI Era.
      </div>
      <nav className="flex gap-8 order-2 md:order-3">
        <a
          href="#"
          className="font-body text-[10px] tracking-widest uppercase font-medium text-on-surface-variant hover:text-secondary transition-opacity"
        >
          Privacy
        </a>
        <a
          href="#"
          className="font-body text-[10px] tracking-widest uppercase font-medium text-on-surface-variant hover:text-secondary transition-opacity"
        >
          Terms
        </a>
        <a
          href="#"
          className="font-body text-[10px] tracking-widest uppercase font-medium text-on-surface-variant hover:text-secondary transition-opacity"
        >
          Contact
        </a>
      </nav>
    </footer>
  )
}
