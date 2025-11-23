
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
  // Pattern: Starts with number, optional .0, optional pipe or space
  clean = clean.replace(/^(\d+)(\.0)?\s*\|?\s*/, (match, p1) => {
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

  return clean.trim();
};
