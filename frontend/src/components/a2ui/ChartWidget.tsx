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
  { bg: 'rgba(28, 25, 23, 0.75)', border: '#1c1917' },
  { bg: 'rgba(120, 113, 108, 0.7)', border: '#78716c' },
  { bg: 'rgba(180, 83, 9, 0.7)', border: '#b45309' },
  { bg: 'rgba(21, 128, 61, 0.7)', border: '#15803d' },
  { bg: 'rgba(2, 132, 199, 0.7)', border: '#0284c7' },
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
          color: '#57534e',
          font: { size: 11, family: 'Public Sans' },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: '#1c1917',
        titleColor: '#faf9f5',
        bodyColor: '#e7e5e4',
        borderColor: '#44403c',
        borderWidth: 1,
        padding: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(229, 227, 220, 0.8)' },
        ticks: { color: '#78716c', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(229, 227, 220, 0.8)' },
        ticks: { color: '#78716c', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="my-3 rounded-lg border border-[#e5e3dc] bg-white p-3.5">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[#1c1917]">
        {isLine ? (
          <LineChartIcon className="w-3.5 h-3.5 text-[#78716c]" />
        ) : (
          <BarChart3 className="w-3.5 h-3.5 text-[#78716c]" />
        )}
        <span>{title || (isLine ? 'Trend Chart' : 'Metric Comparison')}</span>
      </div>
      <div className="h-56 w-full">
        {isLine ? <Line data={chartData} options={options} /> : <Bar data={chartData} options={options} />}
      </div>
    </div>
  );
};
