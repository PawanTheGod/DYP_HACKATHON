// TODO: Person 3 implements JSON export/import for data portability
export function exportUserData(data: any): string {
  return JSON.stringify(data);
}

export function importUserData(json: string): any {
  return JSON.parse(json);
}
