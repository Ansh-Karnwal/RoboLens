interface StatusBadgeProps {
  connected: boolean;
}

export default function StatusBadge({ connected }: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-rl-green animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className="text-[10px] text-gray-400">
        Vultr Backend:{' '}
        <span className={connected ? 'text-rl-green' : 'text-red-400'}>
          {connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </span>
    </div>
  );
}
