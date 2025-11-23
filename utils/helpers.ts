
export const parseAgeGroupToRange = (ageGroup: string): [number, number] | null => {
  if (!ageGroup) return null;
  
  if (ageGroup.includes('רב גילאי') || ageGroup.includes('לכל המשפחה')) {
    return [0, 120];
  }
  
  const olderMatch = ageGroup.match(/(\d+)\s*ומעלה/);
  if (olderMatch) {
    return [parseInt(olderMatch[1], 10), 120];
  }
  
  const fromAgeMatch = ageGroup.match(/מגיל\s*(\d+)/);
  if (fromAgeMatch) {
     return [parseInt(fromAgeMatch[1], 10), 120];
  }

  const rangeMatch = ageGroup.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    return [parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10)];
  }

  const singleNumberMatch = ageGroup.match(/\d+/);
  if (singleNumberMatch) {
    const age = parseInt(singleNumberMatch[0], 10);
    return [age, age + 1]; 
  }

  return null;
};

export const formatSchedule = (schedule: string): string => {
  if (!schedule) return '';

  let clean = schedule;

  // 1. Replace Python list syntax ["a", "b"] with simple list
  if (clean.includes('[')) {
      clean = clean.replace(/\[(.*?)\]/g, (match, content) => {
          // Remove all quotes (' or ")
          return content.replace(/['"]/g, '').trim();
      });
  }

  // 2. Handle Frequency numbers (1.0, 2.0) at the start
  // Pattern: Starts with number, optional .0, optional pipe, AND optional existing frequency text to avoid duplication
  clean = clean.replace(/^(\d+)(\.0)?\s*(\|)?\s*(פעמים בשבוע|פעם בשבוע|פעמים)?\.?\s*/, (match, p1) => {
      const num = parseInt(p1, 10);
      let text = '';
      switch (num) {
          case 1: text = 'פעם בשבוע'; break;
          case 2: text = 'פעמיים בשבוע'; break;
          default: text = `${num} פעמים בשבוע`; break;
      }
      return text + '. ';
  });

  // 3. Clean up any remaining pipes or ugly formatting
  clean = clean.replace(/\|/g, '.'); // Replace pipes with dots
  clean = clean.replace(/\s\./g, '.'); // Remove space before dot
  clean = clean.replace(/\.\./g, '.'); // Remove double dots
  clean = clean.replace(/\.\s*\./g, '.'); // Remove dot space dot

  return clean.trim();
};

export const formatStringList = (str: string): string => {
  if (!str) return '';
  
  // Check if string looks like a JSON array or Python list (starts with [ and ends with ])
  if (str.trim().startsWith('[') && str.trim().endsWith(']')) {
      const content = str.trim().slice(1, -1);
      if (!content.trim()) return ''; // Empty list
      
      // Split by comma, but be careful about commas inside quotes if possible
      // For simplicity given the data format ["A", "B"], split by comma is usually safe enough 
      // after removing brackets.
      const parts = content.split(',');
      
      return parts.map(part => {
          let p = part.trim();
          // Remove wrapping quotes (' or ")
          if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
              p = p.slice(1, -1);
          }
          // Unescape common escapes if needed
          p = p.replace(/\\'/g, "'").replace(/\\"/g, '"');
          return p.trim();
      }).filter(p => p.length > 0).join(', ');
  }
  
  return str;
};
