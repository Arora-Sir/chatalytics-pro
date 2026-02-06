import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Upload, Moon, Sun, MessageCircle, Image as ImageIcon, 
  Zap, Clock, Trash2, Edit2, Link as LinkIcon, Smile, 
  Activity, Crown, TrendingUp, Search, BookOpen, Coffee, 
  BarChart2, Award, Calendar, ChevronRight,
  // NEW ICONS ADDED HERE:
  FileText, Smartphone, MoreVertical, Shield
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, PieChart, Pie, Cell, ScatterChart, 
  Scatter, ZAxis 
} from 'recharts';
import { parseChat } from './utils/chatParser';
import { useAdvancedStats } from './hooks/useAdvancedStats';

// --- CONSTANTS ---
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- STYLES FOR INFINITE SCROLL ---
const scrollStyles = `
  @keyframes scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-scroll {
    animation: scroll 40s linear infinite;
  }
  .animate-scroll:hover {
    animation-play-state: paused;
  }
`;

// --- HELPER COMPONENTS ---

// 1. Improved Custom Tooltip (Fixes Date Visibility)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Format date if needed, or use label directly
    const dateLabel = new Date(label).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    
    return (
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 p-4 rounded-xl shadow-2xl text-white text-xs z-50 min-w-[150px]">
        <p className="font-bold text-sm mb-3 text-gray-100 border-b border-gray-700 pb-2">
          {dateLabel === 'Invalid Date' ? label : dateLabel}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="font-medium text-gray-300">{entry.name}</span>
            </div>
            <span className="font-mono font-bold text-white">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// 2. Infinite Marquee Widget
const InfiniteWidget = ({ awards, stats }) => {
  // Extra fun stats
  const extraCards = [
    {
        title: "📚 Novelist",
        winner: "Total Words",
        desc: `You've written ${(stats.participantStats.reduce((a,b)=>a+b.words,0) / 50000).toFixed(1)} novels.`,
        icon: <BookOpen size={40} className="text-white/20" />,
        color: "from-blue-600 to-indigo-700"
    },
    {
        title: "☕ Reading Time",
        winner: `${(stats.participantStats.reduce((a,b)=>a+b.words,0) / 200 / 60).toFixed(0)} Hours`,
        desc: "Time needed to read this whole history.",
        icon: <Coffee size={40} className="text-white/20" />,
        color: "from-emerald-600 to-teal-700"
    },
    {
        title: "📅 Daily Avg",
        winner: `${Math.round(stats.totalMessages / (stats.finalTimeline.length || 1))} Msgs`,
        desc: "Messages exchanged per active day.",
        icon: <Calendar size={40} className="text-white/20" />,
        color: "from-orange-500 to-red-600"
    }
  ];

  // Duplicate list for seamless loop
  const allItems = [...awards, ...extraCards, ...awards, ...extraCards];

  return (
    <div className="w-full overflow-hidden py-4 relative group">
      <div className="flex w-max animate-scroll gap-6">
        {allItems.map((item, i) => (
            <div key={i} className={`relative overflow-hidden rounded-2xl p-5 w-[260px] h-[140px] shadow-lg bg-gradient-to-br ${item.color} text-white flex-shrink-0 border border-white/10`}>
              <div className="absolute top-0 right-0 p-3">
                {item.icon || <Award size={50} className="text-white/20" />}
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <span className="bg-black/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        {item.title}
                    </span>
                    <h3 className="text-xl font-extrabold mt-2 truncate drop-shadow-sm">{item.winner}</h3>
                </div>
                <p className="text-white/90 text-xs font-medium leading-tight">{item.desc}</p>
              </div>
            </div>
        ))}
      </div>
      {/* Fade Edges */}
      <div className="absolute top-0 left-0 h-full w-20 bg-gradient-to-r from-[#f8fafc] dark:from-[#0f172a] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-[#f8fafc] dark:from-[#0f172a] to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

// 3. GitHub Heatmap (Fixed Labels)
const HeatmapGrid = ({ data }) => {
  return (
    <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
      <div className="flex flex-col gap-1 min-w-max">
         <div className="flex text-[10px] font-mono text-gray-400 gap-[52px] px-1 mb-1">
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => <span key={m}>{m}</span>)}
         </div>
         <div className="grid grid-rows-7 grid-flow-col gap-[3px] h-[90px]">
            {data.map((d, i) => {
                let color = 'bg-gray-200 dark:bg-gray-800';
                if (d.level === 1) color = 'bg-green-300 dark:bg-green-900';
                if (d.level === 2) color = 'bg-green-400 dark:bg-green-700';
                if (d.level === 3) color = 'bg-green-500 dark:bg-green-500';
                if (d.level === 4) color = 'bg-green-600 dark:bg-green-400';

                return (
                    <div key={i} className={`w-3 h-3 rounded-[2px] ${color} relative group`}>
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none shadow-xl border border-gray-700">
                            <span className="font-bold text-gray-300">{d.date}:</span> {d.count} msgs
                        </div>
                    </div>
                )
            })}
         </div>
      </div>
    </div>
  )
};

// 4. "Visible Details" Card (Replaces Hover Clouds)
const VisibleDetailCard = ({ items, title, type }) => {
    return (
        <div className="bg-white dark:bg-gray-800/60 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 dark:border-gray-700 h-full">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
               {type === 'emoji' ? <Smile className="text-orange-500"/> : <Zap className="text-yellow-500"/>}
               {title}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.slice(0, 8).map((item, idx) => { // Top 8 items
                    const topUser = Object.entries(item.breakdown).sort((a,b)=>b[1]-a[1])[0];
                    const winnerName = topUser?.[0] || 'N/A';
                    const winnerCount = topUser?.[1] || 0;
                    
                    return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                            {/* Left: Content */}
                            <div className="h-10 w-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm text-2xl">
                                {type === 'emoji' ? item.char : item.text.slice(0,2)}
                            </div>
                            
                            {/* Middle: Stats */}
                            <div className="flex-1 min-w-0 z-10">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-bold truncate text-sm">{type === 'emoji' ? 'Emoji' : item.text}</span>
                                    <span className="text-xs font-mono opacity-50">{item.total}</span>
                                </div>
                                
                                {/* Visible Bar Chart */}
                                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                                   {Object.entries(item.breakdown).sort((a,b)=>b[1]-a[1]).map(([user, count], i) => (
                                      <div key={user} style={{ width: `${(count/item.total)*100}%` }} className={`h-full ${i===0 ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                                   ))}
                                </div>
                                <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Crown size={10} className="text-yellow-500" fill="currentColor"/>
                                    <span className="truncate">{winnerName.split(' ')[0]}</span>
                                    <span className="opacity-50">({Math.round((winnerCount/item.total)*100)}%)</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            {items.length === 0 && <div className="text-center py-10 text-gray-400">No data available.</div>}
        </div>
    )
}

// 5. Leaderboard Row (Visible Summary)
const LeaderboardRow = ({ stats }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.participantStats.sort((a,b) => b.messages - a.messages).map((p, idx) => (
            <div key={p.name} className="bg-white dark:bg-gray-800/80 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg" style={{backgroundColor: COLORS[idx % COLORS.length]}}>
                        {p.name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-800 font-bold">
                        #{idx+1}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{p.name}</h4>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><MessageCircle size={10}/> {p.messages.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Zap size={10}/> {p.words.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        ))}
    </div>
)


// --- MAIN APP ---

export default function App() {
  const [chatData, setChatData] = useState(null); 
  const [timeFilter, setTimeFilter] = useState('all'); 
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [wordLength, setWordLength] = useState(5); 

  const stats = useAdvancedStats(chatData?.messages, timeFilter, selectedParticipants, wordLength);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/zip" || file.name.endsWith(".zip")) {
        try {
            const zip = await JSZip.loadAsync(file);
            const chatFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith(".txt") && !f.name.includes("__MACOSX") && !f.dir);
            if (chatFile) {
                const content = await chatFile.async("string");
                const parsed = parseChat(content);
                setChatData(parsed);
                setSelectedParticipants(parsed.participants);
            } else alert("No .txt file found in ZIP.");
        } catch (err) { alert("Invalid Zip file."); }
    } else {
        const reader = new FileReader();
        reader.onload = (event) => {
            const parsed = parseChat(event.target.result);
            setChatData(parsed);
            setSelectedParticipants(parsed.participants);
        };
        reader.readAsText(file);
    }
  };

  const resetApp = () => { setChatData(null); };
  const toggleParticipant = (name) => {
    setSelectedParticipants(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#020617] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 selection:bg-blue-500 selection:text-white">
      <style>{scrollStyles}</style>

      {/* HEADER */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#020617]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group w-full md:w-auto justify-between" onClick={resetApp}>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30"><Activity size={20} /></div>
                    <span className="font-bold text-lg tracking-tight">Chatalytics <span className="text-blue-500">Pro</span></span>
                </div>
                <button onClick={() => setDarkMode(!darkMode)} className="md:hidden p-2 bg-gray-100 dark:bg-gray-800 rounded-full">{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
            </div>

            {chatData && (
                <div className="flex-1 w-full overflow-x-auto scrollbar-hide masking-gradient">
                    <div className="flex gap-2 min-w-max px-2">
                        {chatData.participants.map((p, idx) => (
                            <button key={p} onClick={() => toggleParticipant(p)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all border ${selectedParticipants.includes(p) ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent scale-105 shadow' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-500'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${selectedParticipants.includes(p) ? 'animate-pulse' : ''}`} style={{backgroundColor: COLORS[idx % COLORS.length]}}/>
                                {p.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!chatData ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in">
             
             {/* HERO TITLE */}
             <div className="text-center space-y-4 max-w-2xl mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold uppercase tracking-wider mb-2">
                    <Shield size={12} /> Private & Secure
                </div>
                <h1 className="text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-500 to-cyan-500 pb-2">
                    Decode Your Chat
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                    Visualize your WhatsApp history without data leaving your device.
                </p>
             </div>

             {/* HOW IT WORKS STEPS */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center group hover:border-blue-500/50 transition-colors">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Smartphone size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">1. Open WhatsApp</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Open any chat (individual or group) and tap the contact name or three dots.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center group hover:border-blue-500/50 transition-colors">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <MoreVertical size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">2. Export Chat</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tap <b>More &gt; Export Chat &gt; Without Media</b>. Save the .zip or .txt file.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center group hover:border-blue-500/50 transition-colors">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">3. Upload Here</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Drop the exported file into the box below to start analyzing.</p>
                </div>
             </div>

             {/* UPLOAD BOX */}
             <label className="group relative w-full max-w-lg h-40 border-4 border-dashed border-gray-300 dark:border-gray-700 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all bg-white dark:bg-gray-900/50">
                <div className="flex flex-col items-center gap-3 group-hover:scale-105 transition-transform">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300"><Upload size={24}/></div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">Drop .txt or .zip file here</span>
                </div>
                <input type="file" accept=".txt,.zip" onChange={handleFileUpload} className="hidden" />
             </label>

          </div>
        ) : (
          <div className="space-y-8 animate-fade-in pb-20">
            
            {/* 1. INFINITE WIDGET */}
            {stats && <InfiniteWidget awards={stats.awards} stats={stats} />}

            {/* 2. LEADERBOARD */}
            {stats && <LeaderboardRow stats={stats} />}

            {/* 3. MAIN DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 3A. Left Column: Quick Stats */}
                <div className="lg:col-span-1 grid grid-cols-2 gap-3 h-min">
                    {[
                        { l: 'Messages', v: stats.totalMessages, i: MessageCircle, c: 'text-blue-500' },
                        { l: 'Words', v: stats.participantStats.reduce((a,b)=>a+b.words,0), i: Zap, c: 'text-yellow-500' },
                        { l: 'Media', v: stats.participantStats.reduce((a,b)=>a+b.media,0), i: ImageIcon, c: 'text-purple-500' },
                        { l: 'Emojis', v: stats.participantStats.reduce((a,b)=>a+b.emojis,0), i: Smile, c: 'text-orange-500' },
                        { l: 'Links', v: stats.participantStats.reduce((a,b)=>a+b.links,0), i: LinkIcon, c: 'text-pink-500' },
                        { l: 'Deleted', v: stats.participantStats.reduce((a,b)=>a+b.deleted,0), i: Trash2, c: 'text-gray-500' },
                    ].map((s, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                            <div className={`${s.c} mb-2`}><s.i size={20}/></div>
                            <div><h4 className="text-xl font-bold">{s.v.toLocaleString()}</h4><p className="text-[10px] uppercase font-bold text-gray-400">{s.l}</p></div>
                        </div>
                    ))}
                </div>

                {/* 3B. Center: Timeline & Heatmap */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Activity className="text-blue-500"/> Chat Velocity</h3>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                            {['all', 'year', 'month', 'week'].map(tf => (
                                <button key={tf} onClick={() => setTimeFilter(tf)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${timeFilter === tf ? 'bg-white dark:bg-gray-600 shadow text-blue-500' : 'text-gray-500'}`}>{tf}</button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[220px] w-full mb-6">
                        <ResponsiveContainer>
                            <AreaChart data={stats.finalTimeline}>
                                <defs>
                                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                </defs>
                                <Tooltip content={<CustomTooltip />} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                                <XAxis dataKey="date" hide />
                                <Area type="monotone" dataKey={selectedParticipants[0]} stroke="#3b82f6" fill="url(#grad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs font-bold text-gray-500 uppercase">Daily Activity (Last 365 Days)</h4>
                             <div className="flex items-center gap-1 text-[10px] text-gray-400"><span>Less</span><div className="w-2 h-2 bg-gray-200 dark:bg-gray-800 rounded mx-1"></div><div className="w-2 h-2 bg-green-500 rounded mx-1"></div><span>More</span></div>
                        </div>
                        <HeatmapGrid data={stats.heatmapData} />
                    </div>
                </div>
            </div>

            {/* 4. VISIBLE DETAILS (Vocabulary & Emojis) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Emojis Card */}
                <VisibleDetailCard title="Top Emojis" items={stats.topEmojis} type="emoji" />

                {/* Vocabulary Card with Slider */}
                <div className="bg-white dark:bg-gray-800/60 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 dark:border-gray-700 h-full">
                    <div className="flex justify-between items-center mb-5">
                         <h3 className="text-lg font-bold flex items-center gap-2"><Zap className="text-yellow-500"/> Vocabulary</h3>
                         <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Len: {wordLength}</span>
                            <input type="range" min="3" max="10" value={wordLength} onChange={(e) => setWordLength(Number(e.target.value))} className="w-20 h-1 accent-blue-500"/>
                        </div>
                    </div>
                    {/* Re-use visible card logic for words */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {stats.topWords.slice(0, 8).map((item, idx) => {
                             const topUser = Object.entries(item.breakdown).sort((a,b)=>b[1]-a[1])[0];
                             return (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <div className="h-10 w-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm text-xs font-bold">{item.text.slice(0,3)}..</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold truncate text-sm">{item.text}</span>
                                            <span className="text-xs font-mono opacity-50">{item.total}</span>
                                        </div>
                                        <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                                            {Object.entries(item.breakdown).sort((a,b)=>b[1]-a[1]).map(([user, count], i) => (
                                                <div key={user} style={{ width: `${(count/item.total)*100}%` }} className={`h-full ${i===0 ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                                            ))}
                                        </div>
                                        <div className="mt-1 text-[10px] text-gray-500 flex items-center gap-1">
                                            <Crown size={10} className="text-yellow-500" fill="currentColor"/> {topUser?.[0].split(' ')[0]}
                                        </div>
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                </div>
            </div>

            {/* 5. DEEP INSIGHTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Instigator */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Crown className="text-orange-500"/> The Instigator</h3>
                    <div className="h-[200px] relative">
                         <ResponsiveContainer>
                            <PieChart>
                                <Pie data={Object.entries(stats.starters).map(([name, val]) => ({name, value: val}))} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {Object.entries(stats.starters).map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                         </ResponsiveContainer>
                         <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <span className="text-3xl font-bold">{Object.entries(stats.starters).sort((a,b)=>b[1]-a[1])[0]?.[0].charAt(0)}</span>
                            <span className="text-[10px] uppercase opacity-50">Winner</span>
                         </div>
                    </div>
                </div>

                {/* Peak Hours (Fixed Opacity) */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 col-span-2">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><TrendingUp className="text-purple-500"/> Peak Activity Hours</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer>
                            <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                <XAxis type="number" dataKey="hour" domain={[0, 23]} tickCount={12} tick={{fontSize: 10}} stroke="#888" />
                                <YAxis type="number" dataKey="day" domain={[0, 6]} tickFormatter={t => DAYS[t]} tick={{fontSize: 10}} stroke="#888" width={30}/>
                                <ZAxis type="number" dataKey="size" range={[20, 300]} /> 
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                <Scatter data={stats.peakActivityMatrix.flatMap((d, day) => d.map((v, hour) => ({ day, hour, size: v, value: v, name: 'Msgs' }))).filter(x => x.size > 0)} fill="#8884d8">
                                    {stats.peakActivityMatrix.flat().map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />)}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}