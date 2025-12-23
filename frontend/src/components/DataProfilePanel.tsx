import { motion } from 'framer-motion';
import { 
  Database, Columns, HardDrive, AlertTriangle, 
  CheckCircle2, TrendingUp, Hash, Type
} from 'lucide-react';
import clsx from 'clsx';
import type { DataProfile, ColumnProfile } from '../types';

interface DataProfilePanelProps {
  profile: DataProfile;
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subtext?: string;
}) {
  return (
    <div className="glass-panel-solid p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-overlay flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-accent-primary" />
        </div>
        <div>
          <p className="text-lens-500 text-sm">{label}</p>
          <p className="text-lens-100 text-xl font-medium">{value}</p>
          {subtext && <p className="text-lens-600 text-xs mt-0.5">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function ColumnCard({ column }: { column: ColumnProfile }) {
  const isNumeric = column.mean !== undefined;
  const Icon = isNumeric ? Hash : Type;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel-solid p-4 hover:border-accent-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent-muted" />
          <span className="font-mono text-sm text-lens-200 truncate max-w-[150px]">
            {column.name}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-lens-500">
          {column.dtype}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-lens-400">
          <span>Non-null</span>
          <span className="text-lens-200">{column.non_null_count.toLocaleString()}</span>
        </div>
        
        {column.null_percentage > 0 && (
          <div className="flex justify-between text-lens-400">
            <span>Missing</span>
            <span className={clsx(
              column.null_percentage > 20 ? 'text-warning' : 'text-lens-200'
            )}>
              {column.null_percentage.toFixed(1)}%
            </span>
          </div>
        )}

        <div className="flex justify-between text-lens-400">
          <span>Unique</span>
          <span className="text-lens-200">{column.unique_count.toLocaleString()}</span>
        </div>

        {isNumeric && (
          <>
            <div className="border-t border-surface-highlight my-2" />
            <div className="flex justify-between text-lens-400">
              <span>Mean</span>
              <span className="text-lens-200">{column.mean?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lens-400">
              <span>Range</span>
              <span className="text-lens-200">
                {column.min?.toFixed(1)} — {column.max?.toFixed(1)}
              </span>
            </div>
          </>
        )}

        {column.top_values && column.top_values.length > 0 && !isNumeric && (
          <>
            <div className="border-t border-surface-highlight my-2" />
            <p className="text-lens-500 text-xs mb-1">Top values</p>
            <div className="space-y-1">
              {column.top_values.slice(0, 3).map((v, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-lens-400 truncate max-w-[100px]">{v.value}</span>
                  <span className="text-lens-500">{v.percentage.toFixed(1)}%</span>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-lens-100">{profile.filename}</h2>
          <p className="text-lens-500 text-sm mt-1">
            Uploaded and ready for analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl',
            profile.quality_score >= 90 ? 'bg-success/10' : 
            profile.quality_score >= 70 ? 'bg-warning/10' : 'bg-error/10'
          )}>
            {profile.quality_score >= 90 ? (
              <CheckCircle2 className={clsx('w-4 h-4', qualityColor)} />
            ) : (
              <AlertTriangle className={clsx('w-4 h-4', qualityColor)} />
            )}
            <span className={clsx('font-medium', qualityColor)}>
              {profile.quality_score.toFixed(0)}% Quality
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          value={`${profile.memory_usage_mb.toFixed(1)} MB`} 
        />
        <StatCard 
          icon={TrendingUp} 
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
            <div>
              <p className="text-warning font-medium mb-2">Data Quality Warnings</p>
              <ul className="space-y-1">
                {profile.warnings.map((warning, i) => (
                  <li key={i} className="text-lens-400 text-sm">• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Column Profiles */}
      <div>
        <h3 className="text-lens-300 font-medium mb-4">Column Profiles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.columns.map((column, i) => (
            <ColumnCard key={column.name} column={column} />
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
                      className="px-4 py-3 text-left text-lens-400 font-mono font-normal whitespace-nowrap"
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
                        className="px-4 py-3 text-lens-200 whitespace-nowrap"
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
