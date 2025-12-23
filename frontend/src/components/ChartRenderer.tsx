import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { ChartData } from '../types';

interface ChartRendererProps {
  chart: ChartData;
}

const COLORS = [
  '#e8c4a0',
  '#c9a87c',
  '#8b7355',
  '#d2bab0',
  '#a18072',
  '#977669',
  '#4ade80',
  '#fbbf24',
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1c1c1f',
    border: '1px solid #242428',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  },
  labelStyle: { color: '#e0cec7', fontWeight: 500 },
  itemStyle: { color: '#bfa094' },
};

const axisStyle = {
  tick: { fill: '#846358' },
  axisLine: { stroke: '#242428' },
};

export function ChartRenderer({ chart }: ChartRendererProps) {
  const { type, title, data, x_key, y_keys } = chart;

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-lens-500">
        No data to display
      </div>
    );
  }

  const xKey = x_key || Object.keys(data[0])[0];
  const yKeysList = y_keys.length > 0 ? y_keys : Object.keys(data[0]).filter(k => k !== xKey);

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#242428" />
            <XAxis dataKey={xKey} {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            {yKeysList.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[i % COLORS.length], strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#242428" />
            <XAxis dataKey={xKey} {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            {yKeysList.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#242428" />
            <XAxis dataKey={xKey} {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            {yKeysList.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#242428" />
            <XAxis dataKey={xKey} {...axisStyle} name={xKey} />
            <YAxis dataKey={yKeysList[0]} {...axisStyle} name={yKeysList[0]} />
            <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name={title} data={data} fill={COLORS[0]} />
          </ScatterChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKeysList[0] || 'value'}
              nameKey={xKey || 'name'}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
              paddingAngle={2}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ stroke: '#846358' }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend />
          </PieChart>
        );

      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#242428" />
            <XAxis dataKey={xKey} {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            {yKeysList.map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div>
      {title && (
        <h4 className="text-lens-200 font-medium mb-4 text-center">{title}</h4>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
