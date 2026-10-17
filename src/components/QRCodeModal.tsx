import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  url: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  url,
  title,
  isOpen,
  onClose,
}) => {
  const [svgString, setSvgString] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !url) return;
    QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((svg) => setSvgString(svg))
      .catch((err) => console.error('Failed to generate QR Code:', err));
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm font-mono text-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg solid-glass-panel p-5 flex flex-col gap-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--sg-panel-border)]">
          <div className="flex items-center gap-2 text-[var(--sg-text)] font-semibold text-sm">
            <QrCode className="w-4 h-4 text-[var(--sg-text-muted)]" />
            <span>Instant Mobile QR Code</span>
          </div>
          <button
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
            tabIndex={0}
            className="p-1 rounded-md solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--sg-text-muted)] truncate font-normal">
          {title}
        </p>

        {/* QR Code Container */}
        <div className="p-3 bg-white rounded-md flex items-center justify-center min-h-[220px] shadow-inner">
          {svgString ? (
            <div
              className="w-52 h-52 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
          ) : (
            <span className="text-zinc-600 text-sm">Generating QR...</span>
          )}
        </div>

        {/* Relative Link Display and Copy */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-md solid-glass-input overflow-hidden">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 bg-transparent px-2 text-xs text-[var(--sg-input-text)] outline-none select-all truncate font-mono"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-md solid-glass-btn-primary text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="text-[11px] text-[var(--sg-text-muted)] text-center font-normal">
          Scan with any mobile camera to view instantly.
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
