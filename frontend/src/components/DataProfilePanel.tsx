import { motion } from 'framer-motion';
import { 
  Database, Columns, HardDrive, AlertTriangle, 
  CheckCircle2, FileType, Hash, Type, Info
} from 'lucide-react';
import clsx from 'clsx';
import type { DataProfile, ColumnProfile } from '../types';

interface DataProfilePanelProps {
  profile: DataProfile;
}

function formatMemory(mb: number): string {
  if (mb < 0.01) {
    const kb = mb * 1024;
    return `${kb.toFixed(2)} KB`;
  }
  return `${mb.toFixed(2)} MB`;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-panel-solid p-3 flex flex-col items-center text-center">
      <div className="w-9 h-9 rounded-lg bg-surface-overlay flex items-center justify-center mb-2">
        <Icon className="w-4 h-4 text-accent-primary" />
      </div>
      <p className="text-lens-500 text-xs">{label}</p>
      <p className="text-lens-100 text-lg font-medium truncate w-full">{value}</p>
    </div>
  );
}

function ColumnCard({ column, totalRows }: { column: ColumnProfile; totalRows: number }) {
  const isNumeric = column.mean !== null && column.mean !== undefined;
  const Icon = isNumeric ? Hash : Type;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel-solid p-4 hover:border-accent-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-accent-muted shrink-0" />
          <span className="font-mono text-sm text-lens-200 truncate">
            {column.name}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-lens-500 shrink-0">
          {column.dtype}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-lens-400">
          <span>Non-null</span>
          <span className="text-lens-200">{column.non_null_count.toLocaleString()}</span>
        </div>

        {column.null_percentage > 0 && (
          <div>
            <div className="flex justify-between text-lens-400">
              <span>Missing</span>
              <span className={clsx(
                column.null_percentage > 20 ? 'text-warning' : 'text-lens-200'
              )}>
                {column.null_percentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-lens-600 text-xs mt-1">
              {column.null_count} of {totalRows} rows are empty
            </p>
          </div>
        )}

        <div className="flex justify-between text-lens-400">
          <span>Unique</span>
          <span className="text-lens-200">{column.unique_count.toLocaleString()}</span>
        </div>

        {isNumeric && column.mean !== null && column.mean !== undefined && (
          <>
            <div className="border-t border-surface-highlight my-2" />
            <div className="flex justify-between text-lens-400">
              <span>Mean</span>
              <span className="text-lens-200">{column.mean.toFixed(2)}</span>
            </div>
            {column.min !== null && column.min !== undefined &&
             column.max !== null && column.max !== undefined && (
              <div className="flex justify-between text-lens-400">
                <span>Range</span>
                <span className="text-lens-200">
                  {column.min.toFixed(1)} — {column.max.toFixed(1)}
                </span>
              </div>
            )}
          </>
        )}

        {column.top_values && column.top_values.length > 0 && !isNumeric && (
          <>
            <div className="border-t border-surface-highlight my-2" />
            <p className="text-lens-500 text-xs mb-1">Top values</p>
            <div className="space-y-1">
              {column.top_values.slice(0, 3).map((v, i) => (
                <div key={i} className="flex justify-between text-xs gap-2">
                  <span className="text-lens-400 truncate">{v.value}</span>
                  <span className="text-lens-500 shrink-0">{v.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export function DataProfilePanel({ profile }: DataProfilePanelProps) {
  const qualityColor = profile.quality_score >= 90
    ? 'text-success'
    : profile.quality_score >= 70
      ? 'text-warning'
      : 'text-error';

  const qualityBg = profile.quality_score >= 90
    ? 'bg-success/10'
    : profile.quality_score >= 70
      ? 'bg-warning/10'
      : 'bg-error/10';

  // Calculate total missing cells for explanation
  const totalCells = profile.row_count * profile.column_count;
  const totalMissing = profile.columns.reduce((sum, col) => sum + col.null_count, 0);
  const missingPercentage = totalCells > 0 ? (totalMissing / totalCells * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl text-lens-100 truncate">{profile.filename}</h2>
            <p className="text-lens-500 text-sm mt-1">
              Uploaded and ready for analysis
            </p>
          </div>
          <div className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-xl shrink-0',
            qualityBg
          )}>
            {profile.quality_score >= 90 ? (
              <CheckCircle2 className={clsx('w-4 h-4', qualityColor)} />
            ) : (
              <AlertTriangle className={clsx('w-4 h-4', qualityColor)} />
            )}
            <div className="text-right">
              <span className={clsx('font-medium text-lg leading-none', qualityColor)}>
                {profile.quality_score.toFixed(0)}%
              </span>
              <p className={clsx('text-xs', qualityColor)}>Quality</p>
            </div>
          </div>
        </div>

        {/* Quality explanation */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-overlay/50">
          <Info className="w-4 h-4 text-lens-500 shrink-0 mt-0.5" />
          <p className="text-lens-500 text-xs">
            Quality score is based on data completeness.
            {totalMissing > 0
              ? ` Your dataset has ${missingPercentage}% empty cells (${totalMissing} of ${totalCells} total cells).`
              : ' Your dataset has no missing values.'
            }
          </p>
        </div>
      </div>

      {/* Stats Grid - 2x2 on mobile */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Database}
          label="Rows"
          value={profile.row_count.toLocaleString()}
        />
        <StatCard
          icon={Columns}
          label="Columns"
          value={profile.column_count}
        />
        <StatCard
          icon={HardDrive}
          label="Memory"
          value={formatMemory(profile.memory_usage_mb)}
        />
        <StatCard
          icon={FileType}
          label="Type"
          value={profile.file_type.toUpperCase()}
        />
      </div>

      {/* Warnings */}
      {profile.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-panel-solid p-4 border-warning/30"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-warning font-medium mb-2">Data Quality Warnings</p>
              <ul className="space-y-1">
                {profile.warnings.map((warning, i) => (
                  <li key={i} className="text-lens-400 text-sm break-words">• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Column Profiles */}
      <div>
        <h3 className="text-lens-300 font-medium mb-4">Column Profiles</h3>
        <div className="grid grid-cols-1 gap-3">
          {profile.columns.map((column) => (
            <ColumnCard key={column.name} column={column} totalRows={profile.row_count} />
          ))}
        </div>
      </div>

      {/* Sample Data Preview */}
      <div>
        <h3 className="text-lens-300 font-medium mb-4">Data Preview</h3>
        <div className="glass-panel-solid overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-highlight">
                  {profile.columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-3 py-2 text-left text-lens-400 font-mono font-normal whitespace-nowrap text-xs"
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.sample_data.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-surface-highlight/50 last:border-0 hover:bg-surface-overlay/50"
                  >
                    {profile.columns.map((col) => (
                      <td
                        key={col.name}
                        className="px-3 py-2 text-lens-200 whitespace-nowrap text-xs"
                      >
                        {row[col.name] !== null && row[col.name] !== undefined
                          ? String(row[col.name])
                          : <span className="text-lens-600 italic">null</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}