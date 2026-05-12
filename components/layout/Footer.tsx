export function Footer() {
  return (
    <footer className="bg-surface-container-low flex flex-col md:flex-row justify-between items-center w-full px-12 py-10">
      <div className="font-body text-[10px] tracking-widest uppercase font-medium text-primary mb-6 md:mb-0">
        © Innovate Local // A Non-Profit Community Institution
      </div>
      <nav className="flex gap-8">
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
