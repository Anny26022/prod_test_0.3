import Papa from 'papaparse';

export interface IndustrySectorInfo {
  name: string;
  industry: string;
  sector: string;
}

let mapping: Record<string, IndustrySectorInfo> = {};
let loaded = false;

export async function loadIndustrySectorMapping(): Promise<void> {
  if (loaded) return;
  return new Promise((resolve, reject) => {
    Papa.parse('/name_sector_industry.csv', {
      download: true,
      header: true,
      complete: (results) => {
        mapping = {};
        for (const row of results.data as any[]) {
          if (!row['Stock Name']) continue;
          mapping[row['Stock Name'].toUpperCase()] = {
            name: row['Stock Name'],
            industry: row['Basic Industry'] || '',
            sector: row['Sector'] || '',
          };
        }
        loaded = true;
        resolve();
      },
      error: (err) => reject(err),
    });
  });
}

export function getIndustrySectorByName(name: string): IndustrySectorInfo | undefined {
  return mapping[name.toUpperCase()];
}

export function getAllIndustrySectorMappings(): IndustrySectorInfo[] {
  return Object.values(mapping);
} 