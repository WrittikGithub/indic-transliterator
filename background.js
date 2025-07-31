// Test message handler to verify background script is working
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  console.log('Sender:', sender);
  console.log('Message action:', request.action);
  
  // Simple test handler
  if (request.action === 'test') {
    console.log('🧪 Test message received');
    sendResponse({ success: true, message: 'Background script is working' });
    return true;
  }
  
  // Test transliteration function
  if (request.action === 'testTransliteration') {
    console.log('🧪 Testing transliteration function');
    const testText = 'ಕನ್ನಡ';
    const result = transliterateTextClient(testText, 'kan', 'hin');
    console.log('Test transliteration result:', testText, '→', result);
    sendResponse({ success: true, result: result });
    return true;
  }
  
  if (request.action === 'transliterate') {
    console.log('Processing transliteration request:', request);
    
    // Handle single text transliteration
    if (request.text) {
      console.log('Transliterating single text:', request.text.substring(0, 50) + '...');
      transliterateText(request.text, request.sourceLang, request.targetLang)
        .then(result => {
          console.log('Transliteration result:', result);
          sendResponse({ result });
        })
        .catch(error => {
          console.error('Transliteration error:', error);
          sendResponse({ error: error.message });
        });
      return true;
    }
    // Handle batch transliteration
    else if (request.batch) {
      console.log(`Transliterating batch of ${request.batch.length} texts`);
      console.log('Batch sample:', request.batch.slice(0, 3));
      console.log('Target language:', request.targetLang);
      
      // Process batch transliteration
      transliterateBatch(request.batch, request.targetLang)
        .then(result => {
          console.log(`Batch transliteration completed with ${result.length} results`);
          console.log('Batch result sample:', result.slice(0, 3));
          console.log('Sending response to content script...');
          sendResponse({ result });
        })
        .catch(error => {
          console.error('Batch transliteration error:', error);
          console.log('Sending error response to content script...');
          sendResponse({ error: error.message });
        });
      return true;
    }
  }
  
           // If we get here, the message wasn't handled
         console.log('Unhandled message:', request);
         sendResponse({ error: 'Unknown action' });
         return true;
       });
       
       // Handle context menu clicks
       chrome.contextMenus.onClicked.addListener((info, tab) => {
         console.log('🎯 Context menu clicked:', info.menuItemId);
         console.log('Selected text:', info.selectionText);
         console.log('Tab:', tab);
         
         if (info.menuItemId.startsWith('transliterate_')) {
           const targetLang = info.menuItemId.replace('transliterate_', '');
           
           console.log('🎯 Target language:', targetLang);
           
           // Send message to content script to handle the selection transliteration
           chrome.tabs.sendMessage(tab.id, {
             action: 'transliterateSelection',
             targetLang: targetLang
           });
         }
       });

// Service worker installation event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
  
  // Create context menu for transliteration
  chrome.contextMenus.create({
    id: 'transliterate',
    title: 'Transliterate to...',
    contexts: ['selection']
  });
  
  // Create submenus for different target languages
  const targetLanguages = [
    { id: 'hin', title: 'हिंदी (Hindi)' },
    { id: 'ben', title: 'বাংলা (Bengali)' },
    { id: 'kan', title: 'ಕನ್ನಡ (Kannada)' },
    { id: 'tel', title: 'తెలుగు (Telugu)' },
    { id: 'tam', title: 'தமிழ் (Tamil)' },
    { id: 'mal', title: 'മലയാളം (Malayalam)' },
    { id: 'guj', title: 'ગુજરાતી (Gujarati)' },
    { id: 'ori', title: 'ଓଡ଼ିଆ (Oriya)' },
    { id: 'pan', title: 'ਗੁਰਮੁਖੀ (Gurmukhi)' }
  ];
  
  targetLanguages.forEach(lang => {
    chrome.contextMenus.create({
      id: `transliterate_${lang.id}`,
      title: lang.title,
      parentId: 'transliterate',
      contexts: ['selection']
    });
  });
});



async function transliterateText(text, sourceLang, targetLang) {
  if (!text.trim()) return text;
  
  console.log('Transliterating text:', text.substring(0, 30) + '...');
  
  // Use client-side transliteration (no API calls)
  try {
    const result = transliterateTextClient(text, sourceLang, targetLang);
    console.log('✅ Client-side transliteration result:', result);
    return result;
  } catch (error) {
    console.error('❌ Transliteration failed:', error);
    return text; // Return original text if transliteration fails
  }
}

// Client-side transliteration function using Unicode mapping
function transliterateTextClient(text, sourceLang, targetLang) {
  console.log('Transliterating text:', text.substring(0, 30) + '...');
  
  if (!text.trim()) return text;
  
  // Map language codes to script names
  const scriptMap = {
    'hin': 'Devanagari',
    'ben': 'Bengali', 
    'kan': 'Kannada',
    'tel': 'Telugu',
    'tam': 'Tamil',
    'mal': 'Malayalam',
    'guj': 'Gujarati',
    'ori': 'Oriya',
    'pan': 'Gurmukhi'
  };
  
  const sourceScript = scriptMap[sourceLang];
  const targetScript = scriptMap[targetLang];
  
  if (!sourceScript || !targetScript) {
    console.log('Unsupported language combination, returning original text');
    return text;
  }
  
  console.log(`Transliterating from ${sourceScript} to ${targetScript}`);
  
  // First convert to Devanagari (if not already)
  let devanagariText = text;
  if (sourceScript !== 'Devanagari') {
    devanagariText = convertToDevanagari(text, sourceScript);
  }
  
  // Then convert from Devanagari to target script
  let result = devanagariText;
  if (targetScript !== 'Devanagari') {
    result = convertFromDevanagari(devanagariText, targetScript);
  }
  
  console.log('Transliteration result:', result);
  return result;
}

function convertToDevanagari(text, fromScript) {
  let out = "";
  
  for (let i = 0; i < text.length; i++) {
    let number = text.charCodeAt(i);
    let devnum = number;
    let addnum = 0;
    
    // Convert from various scripts to Devanagari
    if (fromScript === 'Kannada') {
      if (number > 3200 && number < 3327) devnum = number - 896;
    } else if (fromScript === 'Telugu') {
      if (number > 3072 && number < 3199) devnum = number - 768;
    } else if (fromScript === 'Bengali') {
      if (number > 2433 && number < 2554) devnum = number - 128;
      // Special cases for Bengali
      if (devnum === 2544) { number = 2480; addnum = 0; }
      if (devnum === 2545) { number = 2485; addnum = 0; }
      if (devnum === 2527) { number = 2479; addnum = 0; }
    } else if (fromScript === 'Malayalam') {
      if (number > 3328 && number < 3455) devnum = number - 1024;
      // Special cases for Malayalam
      if (devnum === 3450) { number = 3375; addnum = 2381; }
      if (devnum === 3451) { number = 3376; addnum = 2381; }
      if (devnum === 3452) { number = 3377; addnum = 2381; }
      if (devnum === 3453) { number = 3378; addnum = 2381; }
      if (devnum === 3454) { number = 3379; addnum = 2381; }
      if (devnum === 3455) { number = 3400; addnum = 2381; }
    } else if (fromScript === 'Tamil') {
      if (number > 2944 && number < 3070) devnum = number - 640;
    } else if (fromScript === 'Oriya') {
      if (number > 2816 && number < 2944) devnum = number - 512;
    } else if (fromScript === 'Gujarati') {
      if (number > 2688 && number < 2815) devnum = number - 384;
    } else if (fromScript === 'Gurmukhi') {
      if (number > 2560 && number < 2687) devnum = number - 256;
    }
    
    out += String.fromCharCode(devnum);
    if (addnum > 0) {
      out += String.fromCharCode(addnum);
    }
  }
  
  return out;
}

function convertFromDevanagari(text, toScript) {
  let out = "";
  
  for (let i = 0; i < text.length; i++) {
    let number = text.charCodeAt(i);
    let devnum = number;
    
    if (number > 2304 && number < 2428) {
      if (toScript === 'Kannada') {
        devnum = number + 896;
        if (devnum === 3252) { devnum = 3294; }
      } else if (toScript === 'Telugu') {
        devnum = number + 768;
      } else if (toScript === 'Oriya') {
        devnum = number + 512;
        if (devnum === 2886) devnum = 2887;
        if (devnum === 2890) devnum = 2891;
        if (devnum === 2868) { devnum = 2866; }
      } else if (toScript === 'Gujarati') {
        devnum = number + 384;
        if (devnum === 2758) devnum = 2759;
        if (devnum === 2762) devnum = 2763;
        if (devnum === 2740) { devnum = 2738; }
      } else if (toScript === 'Gurmukhi') {
        devnum = number + 256;
        if (devnum === 2630) devnum = 2631;
        if (devnum === 2615) devnum = 2614;
        if (devnum === 2634) devnum = 2635;
        if (devnum === 2612) { devnum = 1610; }
      } else if (toScript === 'Bengali') {
        devnum = number + 128;
        if (devnum === 2485) devnum = 2545;
        if (devnum === 2483) devnum = 2482;
        if (devnum === 2446) devnum = 2447;
        if (devnum === 2450) devnum = 2451;
        if (devnum === 2502) devnum = 2503;
        if (devnum === 2506) devnum = 2507;
        if (devnum === 2484) { devnum = 2482; }
      } else if (toScript === 'Malayalam') {
        devnum = number + 1024;
      } else if (toScript === 'Tamil') {
        devnum = number + 640;
        if (devnum === 2966) devnum = 2965;
        if (devnum === 2967) devnum = 2965;
        if (devnum === 2968) devnum = 2965;
        if (devnum === 2971) devnum = 2970;
        if (devnum === 2973) devnum = 2972;
        if (devnum === 2981) devnum = 2980;
        if (devnum === 2982) devnum = 2980;
        if (devnum === 2983) devnum = 2980;
        if (devnum === 2987) devnum = 2986;
        if (devnum === 2988) devnum = 2986;
        if (devnum === 2989) devnum = 2986;
        if (devnum === 2976) devnum = 2975;
        if (devnum === 2977) devnum = 2975;
        if (devnum === 2979) devnum = 2975;
      }
    }
    
    // Common character mappings
    if (devnum === 3300 || devnum === 2532 || devnum === 2660 || devnum === 2788 || devnum === 2916 || devnum === 3044 || devnum === 3172 || devnum === 3428) devnum = 124;
    if (devnum === 3295 || devnum === 3423 || devnum === 3167 || devnum === 3039 || devnum === 2783 || devnum === 2655) { devnum -= 48; }
    if (devnum === 2473 || devnum === 2601 || devnum === 2729 || devnum === 2857 || devnum === 3113 || devnum === 3241 || devnum === 3369) { devnum -= 1; }
    
    out += String.fromCharCode(devnum);
  }
  
  return out;
}

async function transliterateBatch(texts, targetLang) {
  console.log(`Starting batch transliteration for ${texts.length} texts`);
  console.log('Target language:', targetLang);
  
  // Use client-side transliteration for all texts
  console.log('🎯 Using client-side transliteration for all texts');
  return await processBatchWithClient(texts, targetLang);
}

async function processBatchWithClient(texts, targetLang) {
  console.log('🎯 Processing batch with client-side transliteration...');
  const results = [];
  
  // Process texts in chunks for better performance
  const CHUNK_SIZE = 100;
  const chunks = [];
  
  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    chunks.push(texts.slice(i, i + CHUNK_SIZE));
  }
  
  console.log(`Processing ${texts.length} texts in ${chunks.length} chunks of ${CHUNK_SIZE}`);
  
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} texts`);
    
    // Process chunk synchronously for better performance
    for (let i = 0; i < chunk.length; i++) {
      const text = chunk[i];
      if (!text.trim()) {
        results.push(text);
      } else {
        try {
          // Auto-detect source language for each text
          const sourceLang = detectSourceLanguage(text);
          const result = transliterateTextClient(text, sourceLang, targetLang);
          results.push(result);
        } catch (error) {
          console.error(`Transliteration failed for text ${i}:`, error);
          results.push(text); // Return original text if transliteration fails
        }
      }
    }
    
    console.log(`Completed chunk ${chunkIndex + 1}/${chunks.length}`);
    
    // Small delay between chunks to prevent UI blocking
    if (chunkIndex < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  console.log(`✅ Batch client-side processing completed. Processed ${results.length} texts`);
  return results;
}

// Function to detect source language from text
function detectSourceLanguage(text) {
  if (!text || text.length === 0) return 'hin'; // Default to Hindi
  
  // Check for different script ranges
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    
    // Bengali: 2433-2553
    if (charCode >= 2433 && charCode <= 2553) {
      return 'ben';
    }
    // Kannada: 3200-3327
    else if (charCode >= 3200 && charCode <= 3327) {
      return 'kan';
    }
    // Telugu: 3072-3199
    else if (charCode >= 3072 && charCode <= 3199) {
      return 'tel';
    }
    // Tamil: 2944-3070
    else if (charCode >= 2944 && charCode <= 3070) {
      return 'tam';
    }
    // Malayalam: 3328-3455
    else if (charCode >= 3328 && charCode <= 3455) {
      return 'mal';
    }
    // Gujarati: 2688-2815
    else if (charCode >= 2688 && charCode <= 2815) {
      return 'guj';
    }
    // Oriya: 2816-2944
    else if (charCode >= 2816 && charCode <= 2944) {
      return 'ori';
    }
    // Gurmukhi: 2560-2687
    else if (charCode >= 2560 && charCode <= 2687) {
      return 'pan';
    }
    // Devanagari: 2304-2428 (Hindi, Marathi, etc.)
    else if (charCode >= 2304 && charCode <= 2428) {
      return 'hin';
    }
  }
  
  // If no Indic script detected, assume it's English/Latin
  return 'eng';
}