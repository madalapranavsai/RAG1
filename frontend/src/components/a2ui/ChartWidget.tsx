import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartWidgetProps {
  type: 'bar_chart' | 'line_chart';
  title?: string;
  labels?: string[];
  datasets?: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
}

const PALETTE = [
  { bg: 'rgba(99, 102, 241, 0.6)', border: '#6366f1' },
  { bg: 'rgba(14, 165, 233, 0.6)', border: '#0ea5e9' },
  { bg: 'rgba(168, 85, 247, 0.6)', border: '#a855f7' },
  { bg: 'rgba(16, 185, 129, 0.6)', border: '#10b981' },
  { bg: 'rgba(244, 63, 94, 0.6)', border: '#f43f5e' },
];

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  type,
  title,
  labels = [],
  datasets = [],
}) => {
  const isLine = type === 'line_chart';

  const chartData = {
    labels,
    datasets: datasets.map((ds, idx) => {
      const color = PALETTE[idx % PALETTE.length];
      return {
        label: ds.label || `Series ${idx + 1}`,
        data: ds.data || [],
        backgroundColor: ds.backgroundColor || color.bg,
        borderColor: ds.borderColor || color.border,
        borderWidth: 2,
        tension: 0.35,
        fill: isLine,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11 },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3.5 shadow-lg">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-200">
        {isLine ? (
          <LineChartIcon className="w-3.5 h-3.5 text-sky-400" />
        ) : (
          <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
        )}
        <span>{title || (isLine ? 'Trend Chart' : 'Metric Comparison')}</span>
      </div>
      <div className="h-56 w-full">
        {isLine ? <Line data={chartData} options={options} /> : <Bar data={chartData} options={options} />}
      </div>
    </div>
  );
};
