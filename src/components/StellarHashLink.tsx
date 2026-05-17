import { ExternalLink, Link2 } from 'lucide-react';
import { stellarExplorerUrl, shortHash } from '@/lib/stellar';

export function StellarHashLink({ hash, label }: { hash?: string | null; label?: string }) {
  if (!hash) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-white/30 font-mono">
        <Link2 size={10} /> sem hash
      </span>
    );
  }
  return (
    <a
      href={stellarExplorerUrl(hash)}
      target="_blank"
      rel="noreferrer"
      title={`${label ? label + ' · ' : ''}${hash}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tikin-orange/10 border border-tikin-orange/30 text-tikin-orange text-[10px] font-mono hover:bg-tikin-orange/20 transition"
    >
      <Link2 size={10} /> {shortHash(hash)} <ExternalLink size={9} />
    </a>
  );
}

export function StellarBadge({ connected = true }: { connected?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-heading font-bold ${connected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-white/40'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
      STELLAR TESTNET
    </span>
  );
}
