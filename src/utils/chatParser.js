// src/utils/chatParser.js

// 1. Comprehensive Emoji Regex
// Matches standard emojis, skin tones, flags, and newer Unicode sets (e.g., highly specific symbols)
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}]/gu;

export const parseChat = (fileContent) => {
  const lines = fileContent.split('\n');
  const messages = [];
  const participants = new Set();
  
  // 2. Universal Regex for WhatsApp (Android & iOS)
  // Supports: [24/08/25, 10:00 AM] Name: Msg  OR  24/08/25, 10:00 am - Name: Msg
  const regex = /^\[?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]?\s-?\s?([^:]+):\s(.*)$/;

  let currentMsg = null;

  lines.forEach((line) => {
    // Clean invisible control characters (LTR/RTL marks)
    const cleanLine = line.replace(/[\u200E\u200F]/g, "").trim();
    if (!cleanLine) return;

    const match = cleanLine.match(regex);

    if (match) {
      if (currentMsg) messages.push(currentMsg);

      const [_, dateStr, timeStr, senderRaw, contentRaw] = match;
      const sender = senderRaw.trim();
      const content = contentRaw.trim();

      // 3. Strict System Message Filtering
      // We do NOT want these to count as "Ghosting" or "Activity"
      const systemKeywords = [
        "Messages and calls are end-to-end encrypted",
        "created group",
        "added you",
        "left",
        "changed the subject",
        "security code changed",
        "disappearing messages",
        "changed the group description",
        "changed this group's icon"
      ];

      if (systemKeywords.some(keyword => sender.includes(keyword))) {
          return; 
      }

      participants.add(sender);

      // 4. Robust Date Parsing
      let dateObj = new Date();
      try {
          const fullDateStr = `${dateStr} ${timeStr}`;
          const normDate = fullDateStr.replace(/-/g, '/'); // Normalize separators
          
          // Heuristic: Try DD/MM/YYYY first (common in exports)
          const dateParts = normDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
          if (dateParts) {
             const d = parseInt(dateParts[1]);
             // If d > 12, it is definitely Day-Month. Swap for JS (Month-Day)
             if (d > 12) {
                 const jsDateStr = normDate.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, '$2/$1/$3');
                 dateObj = new Date(jsDateStr);
             } else {
                 // Try standard parsing
                 dateObj = new Date(normDate);
                 // If invalid, try swapping assuming it was DD/MM
                 if (isNaN(dateObj.getTime())) {
                     const jsDateStr = normDate.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, '$2/$1/$3');
                     dateObj = new Date(jsDateStr);
                 }
             }
          } else {
             dateObj = new Date(normDate);
          }
      } catch (e) {
          console.error("Date error:", e);
      }

      // 5. Advanced Content Tagging
      const isMedia = content.includes('<Media omitted>') || content.includes('image omitted') || content.includes('video omitted') || content.includes('sticker omitted') || content.includes('GIF omitted');
      const isDeleted = content.includes('You deleted this message') || content.includes('This message was deleted');
      const isEdited = content.includes('<This message was edited>');
      const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
      
      // 6. Extract Clean Words
      // Removes URLs and punctuation, keeps text. Used for "Top Words" analysis.
      const cleanWords = content.toLowerCase()
          .replace(/https?:\/\/[^\s]+/g, "") // Remove URLs first
          .replace(/[.,!?;:"()\[\]{}*~_]/g, "") // Remove punctuation
          .split(/\s+/)
          .filter(w => w.length > 0 && !EMOJI_REGEX.test(w)); // Filter empty and emojis

      const emojis = content.match(EMOJI_REGEX) || [];

      currentMsg = {
        id: Math.random().toString(36).substr(2, 9),
        date: dateObj,
        timestamp: dateObj.getTime(),
        sender: sender,
        content: content,
        isMedia,
        isDeleted,
        isEdited,
        linkCount,
        emojis,
        charCount: content.length,
        wordCount: cleanWords.length,
        words: cleanWords,
      };

    } else if (currentMsg) {
      // Append multi-line messages
      currentMsg.content += `\n${cleanLine}`;
      
      const newEmojis = cleanLine.match(EMOJI_REGEX) || [];
      currentMsg.emojis.push(...newEmojis);

      const newWords = cleanLine.toLowerCase()
          .replace(/https?:\/\/[^\s]+/g, "")
          .replace(/[.,!?;:"()\[\]{}*~_]/g, "")
          .split(/\s+/)
          .filter(w => w.length > 0 && !EMOJI_REGEX.test(w));
      
      currentMsg.words.push(...newWords);
      currentMsg.charCount += cleanLine.length;
      currentMsg.wordCount += newWords.length;
      
      // Check for links in appended lines
      const newLinks = (cleanLine.match(/https?:\/\/[^\s]+/g) || []).length;
      currentMsg.linkCount += newLinks;
    }
  });

  if (currentMsg) messages.push(currentMsg);

  return { 
      messages: messages.sort((a, b) => a.timestamp - b.timestamp), 
      participants: Array.from(participants) 
  };
};