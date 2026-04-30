import { Download } from "lucide-react";

interface PublicProtocolActionsProps {
  pdfSignedUrl: string | null;
}

export function PublicProtocolActions({
  pdfSignedUrl,
}: PublicProtocolActionsProps) {
  if (!pdfSignedUrl) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={pdfSignedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-solid_hover"
      >
        <Download className="h-4 w-4" />
        Stiahnuť PDF
      </a>
    </div>
  );
}
