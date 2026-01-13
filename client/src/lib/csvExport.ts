/**
 * Utility functions for exporting data to CSV format
 */

export function downloadCSV(data: Record<string, unknown>[], filename: string, columns?: string[]) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Get columns from first object if not provided
  const cols = columns || Object.keys(data[0]);

  // Create CSV header
  const header = cols.join(',');

  // Create CSV rows
  const rows = data.map(item => {
    return cols.map(col => {
      const value = item[col];
      
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      
      // Handle objects/arrays
      if (typeof value === 'object') return JSON.stringify(value);
      
      // Escape values containing commas or quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  });

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columnMapping?: Record<string, string> // Maps data keys to display names
) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const keys = Object.keys(data[0]);
  const headers = columnMapping 
    ? keys.map(key => columnMapping[key] || key)
    : keys;

  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      keys.map(key => {
        let value = row[key];
        
        // Handle special types
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') value = JSON.stringify(value);
        if (typeof value === 'boolean') value = value ? 'Yes' : 'No';
        
        // Escape and quote if necessary
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}
