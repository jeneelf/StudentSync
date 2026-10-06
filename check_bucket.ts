import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// Initialize Firebase Admin for Server-side Storage
initializeApp({
  credential: applicationDefault(),
  storageBucket: firebaseConfig.storageBucket
});

async function checkBucket() {
  const bucketName = firebaseConfig.storageBucket;
  const storage = getStorage();
  
  if (!bucketName) {
    console.error('No Firebase Storage bucket is configured.');
    return;
  }

  try {
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    
    console.log({
      projectId: firebaseConfig.projectId,
      configuredBucket: bucketName,
      resolvedBucket: bucket.name,
      bucketExists: exists
    });
  } catch (err) {
    console.error('Error checking bucket:', err);
  }
}

checkBucket();
