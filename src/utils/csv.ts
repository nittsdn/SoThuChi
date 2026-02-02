export const parseCSV = (text: string): string[][] => {
  const lines = text.split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  });
};

export const csvToObjects = <T>(csv: string[][], headers?: string[]): T[] => {
  if (csv.length === 0) return [];
  
  const headerRow = headers || csv[0];
  const dataRows = headers ? csv : csv.slice(1);
  
  return dataRows.map(row => {
    const obj: any = {};
    headerRow.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj as T;
  });
};
