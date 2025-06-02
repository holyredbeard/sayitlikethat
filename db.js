// Database Module for Phrase Storage
const DB_VERSION = 1;
let db;

// Initialize the database
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PhraseDatabase', DB_VERSION);
    
    request.onerror = event => {
      console.error('Database error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = event => {
      db = event.target.result;
      console.log('Database opened successfully');
      resolve(db);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object stores (tables)
      if (!db.objectStoreNames.contains('phrases')) {
        const phrasesStore = db.createObjectStore('phrases', { keyPath: 'id', autoIncrement: true });
        // Create indexes for searching
        phrasesStore.createIndex('category', 'category', { unique: false });
        phrasesStore.createIndex('source_lang', 'lang', { unique: false });
        phrasesStore.createIndex('source_text', 'source', { unique: false });
        phrasesStore.createIndex('categoryAndLang', ['category', 'lang'], { unique: false });
        console.log('Phrases store created');
      }
      
      if (!db.objectStoreNames.contains('explanations')) {
        const explanationsStore = db.createObjectStore('explanations', { keyPath: 'id', autoIncrement: true });
        // Create composite index for source phrase and target language
        explanationsStore.createIndex('sourcePhrase', 'sourcePhrase', { unique: false });
        explanationsStore.createIndex('sourceLang', 'sourceLang', { unique: false });
        explanationsStore.createIndex('targetLang', 'targetLang', { unique: false });
        explanationsStore.createIndex('sourcePhraseAndLangs', ['sourcePhrase', 'sourceLang', 'targetLang'], { unique: true });
        console.log('Explanations store created');
      }
    };
  });
}

// Save phrases to the database
function savePhrases(phrases, category) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction(['phrases'], 'readwrite');
    const store = transaction.objectStore('phrases');
    
    let savedCount = 0;
    
    // Add each phrase to the database
    phrases.forEach(phrase => {
      // Add category to each phrase object
      const phraseWithCategory = { 
        ...phrase, 
        category,
        timestamp: new Date().toISOString()
      };
      
      const request = store.add(phraseWithCategory);
      
      request.onsuccess = () => {
        savedCount++;
        if (savedCount === phrases.length) {
          console.log(`Saved ${savedCount} phrases to the database`);
          resolve(savedCount);
        }
      };
      
      request.onerror = event => {
        console.error('Error saving phrase:', event.target.error);
        // Continue with other phrases even if one fails
      };
    });
    
    transaction.oncomplete = () => {
      console.log('Transaction completed');
    };
    
    transaction.onerror = event => {
      console.error('Transaction error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Get phrases from the database by category and language
function getPhrasesByCategory(category, lang) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction(['phrases'], 'readonly');
    const store = transaction.objectStore('phrases');
    const index = store.index('categoryAndLang');
    
    const request = index.getAll([category, lang]);
    
    request.onsuccess = event => {
      const phrases = event.target.result;
      console.log(`Found ${phrases.length} phrases for category "${category}" in language "${lang}"`);
      resolve(phrases);
    };
    
    request.onerror = event => {
      console.error('Error getting phrases:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Save explanation to the database
function saveExplanation(sourcePhrase, targetPhrase, explanation, sourceLang, targetLang) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction(['explanations'], 'readwrite');
    const store = transaction.objectStore('explanations');
    
    const explanationObj = {
      sourcePhrase,
      targetPhrase,
      explanation,
      sourceLang,
      targetLang,
      timestamp: new Date().toISOString()
    };
    
    const request = store.add(explanationObj);
    
    request.onsuccess = event => {
      console.log('Explanation saved successfully');
      resolve(event.target.result); // Returns the ID
    };
    
    request.onerror = event => {
      console.error('Error saving explanation:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Get explanation from the database
function getExplanation(sourcePhrase, sourceLang, targetLang) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction(['explanations'], 'readonly');
    const store = transaction.objectStore('explanations');
    const index = store.index('sourcePhraseAndLangs');
    
    const request = index.get([sourcePhrase, sourceLang, targetLang]);
    
    request.onsuccess = event => {
      const explanation = event.target.result;
      if (explanation) {
        console.log('Found explanation in database');
        resolve(explanation);
      } else {
        console.log('No explanation found in database');
        resolve(null);
      }
    };
    
    request.onerror = event => {
      console.error('Error getting explanation:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Get all phrases
function getAllPhrases() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction(['phrases'], 'readonly');
    const store = transaction.objectStore('phrases');
    
    const request = store.getAll();
    
    request.onsuccess = event => {
      const phrases = event.target.result;
      console.log(`Retrieved all ${phrases.length} phrases from database`);
      resolve(phrases);
    };
    
    request.onerror = event => {
      console.error('Error getting all phrases:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Export the database functions
window.phraseDB = {
  init: initDB,
  savePhrases,
  getPhrasesByCategory,
  saveExplanation,
  getExplanation,
  getAllPhrases
}; 