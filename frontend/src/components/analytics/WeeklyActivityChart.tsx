import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props { data: Array<{ day: string; tasks: number }>; }

export default function WeeklyActivityChart({ data }: Props) {
  if (data.length === 0) return <div className="card p-5"><h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Activity</h3><p className="text-sm text-gray-500 dark:text-gray-400">No data</p></div>;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Activity</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
          <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} labelStyle={{ fontWeight: 600, marginBottom: 4 }} />
          <Line type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }} activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
