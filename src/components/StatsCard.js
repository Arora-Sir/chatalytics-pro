import React from 'react';

const StatsCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between hover:scale-[1.02] transition-transform">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <h3 className="text-3xl font-bold mt-2 text-text">{value}</h3>
      </div>
      {Icon && <div className={`p-3 rounded-full ${color} bg-opacity-20 text-opacity-100`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>}
    </div>
    {subtext && <p className="text-xs text-gray-400 mt-4">{subtext}</p>}
  </div>
);

export default StatsCard;