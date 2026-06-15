export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" title="Vovonacci Reader">
      <span className="brand-mark">v</span>
      {!compact && (
        <span className="brand-word">
          vovonacci<span className="brand-dot">·</span>
          <span className="brand-sub">READER</span>
        </span>
      )}
    </div>
  );
}
