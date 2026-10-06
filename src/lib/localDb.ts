import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'nexus-study-local-files';
const DB_VERSION = 1;

interface LocalSourceFile {
  sourceId: string;
  userId: string;
  courseId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  blob: Blob;
  savedAt: string;
  updatedAt: string;
}

interface LocalExtraction {
  sourceId: string;
  courseId: string;
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
  fullText: string;
  extractedAt: string;
  parserVersion: string;
}

let dbPromise: Promise<IDBPDatabase<any>>;

function getDb(): Promise<IDBPDatabase<any>> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'sourceId' });
        }
        if (!db.objectStoreNames.contains('extractions')) {
          db.createObjectStore('extractions', { keyPath: 'sourceId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveLocalSourceFile(record: LocalSourceFile) {
  const db = await getDb();
  await db.put('files', record);
}

export async function getLocalSourceFile(sourceId: string): Promise<LocalSourceFile | undefined> {
  const db = await getDb();
  return db.get('files', sourceId);
}

export async function hasLocalSourceFile(sourceId: string): Promise<boolean> {
  const db = await getDb();
  return !!(await db.getKey('files', sourceId));
}

export async function deleteLocalSourceFile(sourceId: string) {
  const db = await getDb();
  await db.delete('files', sourceId);
  await db.delete('extractions', sourceId);
}

export async function saveLocalExtraction(extraction: LocalExtraction) {
  const db = await getDb();
  await db.put('extractions', extraction);
}

export async function getLocalExtraction(sourceId: string): Promise<LocalExtraction | undefined> {
  const db = await getDb();
  return db.get('extractions', sourceId);
}
