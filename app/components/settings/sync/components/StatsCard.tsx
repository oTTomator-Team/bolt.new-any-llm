import { classNames } from '~/utils/classNames';

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  trend?: { value: number; isPositive: boolean } | null;
}

export function StatsCard({ icon, label, value, color = 'blue', trend }: StatsCardProps) {
  return (
    <div className="bg-bolt-elements-background-depth-3 p-3 rounded-lg border border-bolt-elements-borderColor/10">
      <div className="flex items-center gap-2 mb-2">
        <div className={classNames(icon, `text-${color}-400`)} />
        <div className="text-sm text-bolt-elements-textSecondary">{label}</div>
      </div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-medium text-bolt-elements-textPrimary">{value}</div>
        {trend && (
          <div
            className={classNames(
              'text-xs flex items-center gap-0.5 mb-1',
              trend.isPositive ? 'text-green-400' : 'text-red-400',
            )}
          >
            <div className={trend.isPositive ? 'i-ph:trend-up' : 'i-ph:trend-down'} />
            {trend.value}%
          </div>
        )}
      </div>
    </div>
  );
}
