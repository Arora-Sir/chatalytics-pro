import { useMemo } from 'react';
import { 
  startOfWeek, startOfMonth, startOfYear, format, getHours, getDay, 
  differenceInMinutes, differenceInDays, eachDayOfInterval, subDays, 
  isSameDay, addDays
} from 'date-fns';

export const useAdvancedStats = (rawMessages, timeFilter, selectedParticipants, targetWordLength = 0) => {
  
  // 1. Intelligent Filtering (Time & Participants)
  const filteredMessages = useMemo(() => {
    if (!rawMessages) return [];
    const now = new Date();
    let startDate = new Date(0); // Default: All Time

    if (timeFilter === 'week') startDate = startOfWeek(now);
    if (timeFilter === 'month') startDate = startOfMonth(now);
    if (timeFilter === 'year') startDate = startOfYear(now);

    return rawMessages.filter(msg => 
      msg.date >= startDate && selectedParticipants.includes(msg.sender)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }, [rawMessages, timeFilter, selectedParticipants]);

  // 2. The "Deep Analysis" Engine
  const stats = useMemo(() => {
    if (filteredMessages.length === 0) return null;

    // --- Init Data Containers ---
    const participantStats = {};
    selectedParticipants.forEach(p => {
        participantStats[p] = { 
            name: p, 
            messages: 0, words: 0, media: 0, emojis: 0, 
            links: 0, deleted: 0, edited: 0, 
            sentiment: { pos: 0, neg: 0, neutral: 0 },
            nightOwlScore: 0, // 12 AM - 5 AM
            earlyBirdScore: 0, // 5 AM - 9 AM
            doubleTexts: 0,   // Sending 2+ messages in a row
            sorryCount: 0,    // Apologies
            laughCount: 0,    // lol, haha, etc.
            longestMsg: 0     // Max chars in one go
        };
    });

    const timelineMap = {}; // { "2023-01-01": { date, Mohit: 5, Softy: 2 } }
    const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
    const weekdayData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => ({ day: d, count: 0 }));
    
    // 7 Days x 24 Hours Activity Matrix (for Bubble Chart)
    const peakActivityMatrix = Array(7).fill(0).map(() => Array(24).fill(0));

    // Analysis Maps
    const wordMap = {}; 
    const emojiMap = {}; 
    const heatmapData = {}; // { "2023-01-01": 50 }
    
    // Conversation Flow Tracking
    let lastMsg = null;
    const starters = {}; // Initiated conversation after >4h silence
    const replyTimes = {}; // Time taken to reply to someone else
    
    selectedParticipants.forEach(p => { 
        starters[p] = 0; 
        replyTimes[p] = []; 
    });

    // --- THE MAIN LOOP (Single Pass for Performance) ---
    filteredMessages.forEach((msg, idx) => {
      const p = participantStats[msg.sender];
      if (!p) return; 

      // A. Basic Counts
      p.messages++;
      p.media += (msg.isMedia ? 1 : 0);
      p.links += msg.linkCount;
      p.deleted += (msg.isDeleted ? 1 : 0);
      p.edited += (msg.isEdited ? 1 : 0);
      p.emojis += msg.emojis.length;
      if (msg.charCount > p.longestMsg) p.longestMsg = msg.charCount;

      // B. Temporal Analysis
      const hour = getHours(msg.date);
      const day = getDay(msg.date);
      
      hourlyData[hour].count++;
      weekdayData[day].count++;
      peakActivityMatrix[day][hour]++;

      // Fun Stats: Sleep Schedule
      if (hour >= 0 && hour < 5) p.nightOwlScore++;
      if (hour >= 5 && hour < 9) p.earlyBirdScore++;

      // C. Timeline & Heatmap
      const dateKey = format(msg.date, 'yyyy-MM-dd');
      
      // Line Chart Data
      if (!timelineMap[dateKey]) timelineMap[dateKey] = { date: dateKey };
      if (!timelineMap[dateKey][msg.sender]) timelineMap[dateKey][msg.sender] = 0;
      timelineMap[dateKey][msg.sender]++;

      // Heatmap Data
      if (!heatmapData[dateKey]) heatmapData[dateKey] = 0;
      heatmapData[dateKey]++;

      // D. Vocabulary & Sentiment
      msg.words.forEach(w => {
        // STRICT LENGTH CHECK:
        // If slider is set (>0), ONLY count words of EXACT length.
        // If slider is 0 (default), count words > 3 chars.
        const isValidLen = targetWordLength > 0 ? w.length === targetWordLength : w.length >= 3;

        if (isValidLen && !msg.isMedia) {
           p.words++; // Total word count for user stats
           
           if (!wordMap[w]) wordMap[w] = { total: 0, breakdown: {} };
           wordMap[w].total++;
           // Who said it? (Personalized Breakdown)
           wordMap[w].breakdown[msg.sender] = (wordMap[w].breakdown[msg.sender] || 0) + 1;

           // Sentiment & Fun keywords
           if (['good', 'love', 'happy', 'great', 'haha', 'lol', 'thanks', 'best', 'awesome', 'nice'].includes(w)) p.sentiment.pos++;
           if (['bad', 'sad', 'hate', 'angry', 'no', 'sorry', 'stupid', 'worst', 'miss', 'boring'].includes(w)) p.sentiment.neg++;
           
           // Fun Counts
           if (['sorry', 'maaf', 'galti', 'apology'].includes(w)) p.sorryCount++;
           if (['haha', 'lol', 'lmao', 'rofl', 'hehe', 'xd'].includes(w)) p.laughCount++;
        }
      });

      // E. Emoji Analysis
      msg.emojis.forEach(e => {
         if (!emojiMap[e]) emojiMap[e] = { total: 0, breakdown: {} };
         emojiMap[e].total++;
         emojiMap[e].breakdown[msg.sender] = (emojiMap[e].breakdown[msg.sender] || 0) + 1;
      });

      // F. Forensic Flow Analysis
      if (lastMsg) {
        const diffMins = differenceInMinutes(msg.date, lastMsg.date);
        
        // 1. INSTIGATOR: Gap > 4 hours (240 mins)
        if (diffMins > 240) {
            starters[msg.sender]++;
        } 
        // 2. REPLY TIME: Same convo (Gap < 4 hrs) AND different sender
        else if (msg.sender !== lastMsg.sender) {
            replyTimes[msg.sender].push(diffMins);
        }
        // 3. DOUBLE TEXTER: Same sender, gap < 5 mins
        else if (msg.sender === lastMsg.sender && diffMins < 5) {
            p.doubleTexts++;
        }
      }
      lastMsg = msg;
    });

    // --- Post-Processing ---

    // 1. Continuous Timeline (Fill missing days with 0)
    const sortedDates = Object.keys(timelineMap).sort();
    const finalTimeline = [];
    if (sortedDates.length > 0) {
        const start = new Date(sortedDates[0]);
        const end = new Date(sortedDates[sortedDates.length - 1]);
        const allDays = eachDayOfInterval({ start, end });
        
        allDays.forEach(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dataPoint = timelineMap[key] || { date: key };
            selectedParticipants.forEach(p => { if (!dataPoint[p]) dataPoint[p] = 0; });
            finalTimeline.push(dataPoint);
        });
    }

    // 2. Top Lists (Sorted)
    const topEmojis = Object.entries(emojiMap)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 12)
      .map(([char, data]) => ({ char, ...data })); 

    const topWords = Object.entries(wordMap)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 12) // Top 12 words
      .map(([text, data]) => ({ text, ...data }));

    // 3. Ghost Stats (Avg Reply Time)
    const ghostStats = Object.keys(replyTimes).map(user => {
      const times = replyTimes[user];
      const avg = times.length ? times.reduce((a,b)=>a+b,0) / times.length : 0;
      return { name: user, avgMinutes: Math.round(avg) };
    }).sort((a,b) => b.avgMinutes - a.avgMinutes);

    // 4. Streak Calculation (Longest & Current)
    const activeDates = Object.keys(heatmapData).sort();
    let longestStreak = 0, currentStreak = 0, tempStreak = 0, lastDate = null;
    
    activeDates.forEach((dateStr, idx) => {
      const currentDate = new Date(dateStr);
      if (lastDate && differenceInDays(currentDate, lastDate) === 1) {
          tempStreak++;
      } else { 
          longestStreak = Math.max(longestStreak, tempStreak); 
          tempStreak = 1; 
      }
      lastDate = currentDate;
      
      // Check active streak (if last msg was today/yesterday)
      if (idx === activeDates.length - 1) {
          const diffToNow = differenceInDays(new Date(), currentDate);
          if (diffToNow <= 1) currentStreak = tempStreak;
      }
    });
    longestStreak = Math.max(longestStreak, tempStreak);

    // 5. 🏆 Humorous Awards (The Widget Data)
    const awards = [
        {
            title: "👻 The Ghost",
            winner: ghostStats[0]?.name || "N/A",
            desc: `Takes ~${ghostStats[0]?.avgMinutes || 0}m to reply.`,
            color: "from-gray-700 to-gray-900"
        },
        {
            title: "📢 The Yapper",
            winner: Object.values(participantStats).sort((a,b) => b.words - a.words)[0]?.name || "N/A",
            desc: `Sent ${Object.values(participantStats).sort((a,b) => b.words - a.words)[0]?.words.toLocaleString()} words total.`,
            color: "from-blue-500 to-indigo-600"
        },
        {
            title: "🦉 Night Owl",
            winner: Object.values(participantStats).sort((a,b) => b.nightOwlScore - a.nightOwlScore)[0]?.name || "N/A",
            desc: "Most active between 12 AM - 5 AM.",
            color: "from-purple-600 to-indigo-900"
        },
        {
            title: "🧨 Instigator",
            winner: Object.entries(starters).sort((a,b) => b[1] - a[1])[0]?.[0] || "N/A",
            desc: "Revives dead chats after hours of silence.",
            color: "from-red-500 to-orange-600"
        },
        {
            title: "📸 Media Mogul",
            winner: Object.values(participantStats).sort((a,b) => b.media - a.media)[0]?.name || "N/A",
            desc: "Spams photos and videos the most.",
            color: "from-pink-500 to-rose-600"
        },
        {
            title: "📱 Double Texter",
            winner: Object.values(participantStats).sort((a,b) => b.doubleTexts - a.doubleTexts)[0]?.name || "N/A",
            desc: "Sends multiple messages in a row.",
            color: "from-emerald-500 to-teal-600"
        },
        {
            title: "📜 Novelist",
            winner: Object.values(participantStats).sort((a,b) => b.longestMsg - a.longestMsg)[0]?.name || "N/A",
            desc: "Wrote the single longest text message.",
            color: "from-amber-500 to-orange-500"
        },
        {
            title: "😂 Laughing Stock",
            winner: Object.values(participantStats).sort((a,b) => b.laughCount - a.laughCount)[0]?.name || "N/A",
            desc: "Uses 'haha', 'lol', 'rofl' the most.",
            color: "from-yellow-400 to-orange-500"
        },
        {
            title: "🥺 The Apologist",
            winner: Object.values(participantStats).sort((a,b) => b.sorryCount - a.sorryCount)[0]?.name || "N/A",
            desc: "Says 'sorry' way too much.",
            color: "from-cyan-500 to-blue-600"
        },
        {
            title: "🔗 Link Lord",
            winner: Object.values(participantStats).sort((a,b) => b.links - a.links)[0]?.name || "N/A",
            desc: "Shares the most URLs.",
            color: "from-indigo-400 to-blue-500"
        }
    ];

    // 6. Milestone Math
    const nextMilestone = Math.ceil(filteredMessages.length / 5000) * 5000;
    
    // 7. GitHub Heatmap (Last 365 Days)
    const heatmapArray = [];
    const oneYearAgo = subDays(new Date(), 365);
    const heatmapRange = eachDayOfInterval({ start: oneYearAgo, end: new Date() });
    
    heatmapRange.forEach(date => {
        const k = format(date, 'yyyy-MM-dd');
        const count = heatmapData[k] || 0;
        heatmapArray.push({
            date: k,
            count: count,
            level: count > 100 ? 4 : count > 50 ? 3 : count > 20 ? 2 : count > 0 ? 1 : 0
        });
    });

    return {
      totalMessages: filteredMessages.length,
      participantStats: Object.values(participantStats),
      finalTimeline,
      hourlyData,
      weekdayData,
      peakActivityMatrix,
      heatmapData: heatmapArray,
      replyStats: ghostStats,
      starters,
      topEmojis,
      topWords,
      streaks: { longest: longestStreak, current: currentStreak },
      milestone: { next: nextMilestone, current: filteredMessages.length },
      awards
    };
  }, [filteredMessages, targetWordLength, selectedParticipants]);

  return stats;
};