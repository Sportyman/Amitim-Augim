
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
