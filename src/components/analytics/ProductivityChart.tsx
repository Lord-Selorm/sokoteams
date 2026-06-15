import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props { data: Array<{ name: string; completed: number; pending: number }>; }

export default function ProductivityChart({ data }: Props) {
  if (data.length === 0) return <div className="card p-5"><h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Task Completion</h3><p className="text-sm text-gray-500 dark:text-gray-400">No data</p></div>;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Task Completion</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} labelStyle={{ fontWeight: 600, marginBottom: 4 }} />
          <Legend verticalAlign="bottom" height={32} iconType="circle" formatter={(v: string) => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>} />
          <Bar dataKey="completed" fill="#3b82f6" name="Completed" radius={[3, 3, 0, 0]} maxBarSize={32} />
          <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
