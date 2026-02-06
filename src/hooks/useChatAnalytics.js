// src/hooks/useChatAnalytics.js
import { useMemo } from 'react';
import { startOfWeek, startOfMonth, startOfYear, isWithinInterval, format, getHours, getDay } from 'date-fns';

export const useChatAnalytics = (rawMessages, timeFilter, selectedParticipants) => {
  
  // 1. Filter by Time Range
  const filteredMessages = useMemo(() => {
    if (!rawMessages) return [];
    const now = new Date();
    let startDate = new Date(0); // Beginning of time

    if (timeFilter === 'week') startDate = startOfWeek(now);
    if (timeFilter === 'month') startDate = startOfMonth(now);
    if (timeFilter === 'year') startDate = startOfYear(now);

    return rawMessages.filter(msg => 
      msg.date >= startDate && selectedParticipants.includes(msg.sender)
    );
  }, [rawMessages, timeFilter, selectedParticipants]);

  // 2. Generate Stats
  const stats = useMemo(() => {
    if (filteredMessages.length === 0) return null;

    const participantStats = {};
    const timelineData = {}; // For Line Chart
    const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
    const weekdayData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => ({ day: d, count: 0 }));

    let totalWords = 0;
    let totalMedia = 0;

    filteredMessages.forEach(msg => {
      // Participant Logic
      if (!participantStats[msg.sender]) {
        participantStats[msg.sender] = { name: msg.sender, messages: 0, words: 0, media: 0 };
      }
      participantStats[msg.sender].messages++;
      participantStats[msg.sender].words += msg.wordCount;
      if (msg.isMedia) participantStats[msg.sender].media++;

      totalWords += msg.wordCount;
      if (msg.isMedia) totalMedia++;

      // Hourly
      const hour = getHours(msg.date);
      hourlyData[hour].count++;

      // Weekday
      const day = getDay(msg.date);
      weekdayData[day].count++;

      // Timeline (Aggregate by day)
      const dateKey = format(msg.date, 'yyyy-MM-dd');
      if (!timelineData[dateKey]) timelineData[dateKey] = { date: dateKey };
      if (!timelineData[dateKey][msg.sender]) timelineData[dateKey][msg.sender] = 0;
      timelineData[dateKey][msg.sender]++;
    });

    // Format Timeline for Recharts
    const timelineArray = Object.values(timelineData).sort((a,b) => new Date(a.date) - new Date(b.date));

    return {
      totalMessages: filteredMessages.length,
      totalWords,
      totalMedia,
      participantStats: Object.values(participantStats).sort((a,b) => b.messages - a.messages),
      hourlyData,
      weekdayData,
      timelineArray
    };
  }, [filteredMessages]);

  return stats;
};