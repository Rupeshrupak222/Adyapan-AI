"use client";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.06), transparent)",
        borderColor: "var(--border-color)",
      }}>
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {description && <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
