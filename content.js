let originalTextMap = new WeakMap();

console.log('Content script loaded and running');

// Test function to verify content script is working
function testContentScript() {
  console.log('🧪 Content script test function called');
  return 'Content script is working!';
}

// Make test function available globally for debugging
window.testContentScript = testContentScript;

chrome.runtime.onMessage.addListener((msg) => {
  console.log('Content script received message:', msg);
  if (msg.action === 'toggle') {
    console.log('Toggle action:', msg.state);
    msg.state ? transliteratePage() : revertTransliteration();
  } else if (msg.action === 'replaceSelectedText') {
    console.log('Content script received replaceSelectedText message');
    console.log('Original text:', msg.originalText);
    console.log('Transliterated text:', msg.transliteratedText);
    replaceSelectedText(msg.originalText, msg.transliteratedText);
  } else if (msg.action === 'transliterateSelection') {
    console.log('Transliterate selection action received, target language:', msg.targetLang);
    transliterateSelection(msg.targetLang);
  } else if (msg.action === 'testTransliteration') {
    console.log('🧪 Test transliteration action received');
    const testText = 'ಕನ್ನಡ';
    const testResult = transliterateTextClient(testText, 'kan', 'hin');
    console.log('🧪 Content script test transliteration:', testText, '→', testResult);
    // Send response back to popup
    return Promise.resolve({ success: true, result: testResult });
  }
});

function transliteratePage() {
  console.log('Starting transliteration...');
  
  // First test if background script is working
  chrome.runtime.sendMessage({ action: 'test' }, (response) => {
    console.log('Background script test response:', response);
    
    if (chrome.runtime.lastError) {
      console.error('Error communicating with background script:', chrome.runtime.lastError);
      return;
    }
    
    if (response && response.success) {
      console.log('Background script is working, proceeding with transliteration');
      chrome.storage.sync.get(['targetLang'], (data) => {
        console.log('Target language setting:', data.targetLang);
        collectAndTransliterateTexts(data.targetLang || 'hin');
      });
    } else {
      console.error('Background script is not responding properly:', response);
    }
  });
}

function collectAndTransliterateTexts(targetLang) {
  console.log('Collecting text nodes for batch transliteration...');
  
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

           let node;
         let nodeIndex = 0;
         
         while ((node = walker.nextNode())) {
    const text = node.nodeValue;
    if (text && text.trim()) {
      // Store original text for reversion
      originalTextMap.set(node, text);
      textNodes.push({
        node: node,
        text: text,
        index: nodeIndex++
      });
    }
  }

           console.log(`Collected ${textNodes.length} text nodes for transliteration`);

  if (textNodes.length === 0) {
    console.log('No text nodes found to transliterate');
    return;
  }

  // Extract just the text content for the batch request
  const texts = textNodes.map(item => item.text);

  // Send batch transliteration request
  console.log('Sending batch transliteration request to background script...');
  chrome.runtime.sendMessage({
    action: 'transliterate',
    batch: texts,
    targetLang
  }, (response) => {
    console.log('Received batch transliteration response:', response);
    
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError);
      return;
    }
    
    if (response && response.error) {
      console.error('Batch transliteration error:', response.error);
      return;
    }
    
    if (response && response.result && Array.isArray(response.result)) {
      console.log(`Processing ${response.result.length} transliterated results`);
      
      // Update each text node with its corresponding transliterated result
      textNodes.forEach((item, index) => {
        const originalText = item.text;
        const transliteratedText = response.result[index];
        
        if (transliteratedText && transliteratedText !== originalText) {
          item.node.nodeValue = transliteratedText;
          console.log(`Updated text ${index}: "${originalText.substring(0, 30)}..." → "${transliteratedText.substring(0, 30)}..."`);
        } else {
          console.log(`No change needed for text ${index}: "${originalText.substring(0, 30)}..."`);
        }
      });
      
      console.log('Batch transliteration completed successfully');
    } else {
      console.warn('No valid batch result received:', response);
    }
  });
}

function revertTransliteration() {
  console.log('Reverting transliteration...');
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  let revertedCount = 0;
  while ((node = walker.nextNode())) {
    if (originalTextMap.has(node)) {
      node.nodeValue = originalTextMap.get(node);
      revertedCount++;
    }
  }
  console.log(`Reverted ${revertedCount} text nodes`);
}

// Function to replace selected text
function replaceSelectedText(originalText, transliteratedText) {
  console.log('replaceSelectedText called with:', originalText, '→', transliteratedText);
  
  const selection = window.getSelection();
  console.log('Selection range count:', selection.rangeCount);
  
  // Check if there's still a valid selection
  if (selection.rangeCount > 0 && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    
    // Handle multi-node selections
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
      // Single text node selection
      const textNode = range.startContainer;
      const text = textNode.textContent;
      const start = range.startOffset;
      const end = range.endOffset;
      
      console.log('Single text node selection');
      console.log('Text content:', text);
      console.log('Selection range:', start, 'to', end);
      
      const selectedText = text.substring(start, end);
      console.log('Currently selected text:', selectedText);
      
      if (selectedText.trim().length > 0) {
        const newText = text.substring(0, start) + transliteratedText + text.substring(end);
        textNode.textContent = newText;
        
        // Update the selection
        const newRange = document.createRange();
        newRange.setStart(textNode, start);
        newRange.setEnd(textNode, start + transliteratedText.length);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        console.log('✅ Single node text replaced successfully');
        console.log('Replaced:', selectedText, '→', transliteratedText);
      }
    } else {
      // Multi-node selection - preserve HTML structure
      console.log('Multi-node selection detected');
      
      // Get the selected content as HTML
      const selectedContent = range.cloneContents();
      console.log('Selected content:', selectedContent);
      
      // Create a temporary container to work with the selection
      const tempContainer = document.createElement('div');
      tempContainer.appendChild(selectedContent.cloneNode(true));
      
      // Extract all text nodes from the selected content and transliterate them
      const textNodes = [];
      const walker = document.createTreeWalker(
        tempContainer,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.trim()) {
          textNodes.push(node);
        }
      }
      
      console.log(`Found ${textNodes.length} text nodes in selection`);
      
      // Get target language from storage
      chrome.storage.sync.get(['targetLang'], (data) => {
        const targetLang = data.targetLang || 'hin';
        
        // Transliterate each text node while preserving structure
        textNodes.forEach((textNode, index) => {
          const originalText = textNode.textContent;
          // Use the same transliteration logic as full page
          const sourceLang = detectSourceLanguage(originalText);
          const transliteratedText = transliterateTextClient(originalText, sourceLang, targetLang);
          
          if (transliteratedText !== originalText) {
            textNode.textContent = transliteratedText;
            console.log(`Transliterated text node ${index}:`, originalText, '→', transliteratedText);
          }
        });
        
        // Clean up empty text nodes and elements before inserting
        cleanupEmptyNodes(tempContainer);
        
        // Replace the selection with the transliterated content
        range.deleteContents();
        
        // Insert the children of tempContainer directly, not the container itself
        while (tempContainer.firstChild) {
          range.insertNode(tempContainer.firstChild);
        }
        
        console.log('✅ Multi-node selection replaced with preserved structure');
      });
    }
  } else {
    console.log('⚠️ No valid selection found');
  }
}

// Helper function to detect source language (same as in background.js)
function detectSourceLanguage(text) {
  if (!text || text.length === 0) return 'hin';
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    
    if (charCode >= 2433 && charCode <= 2553) return 'ben';
    else if (charCode >= 3200 && charCode <= 3327) return 'kan';
    else if (charCode >= 3072 && charCode <= 3199) return 'tel';
    else if (charCode >= 2944 && charCode <= 3070) return 'tam';
    else if (charCode >= 3328 && charCode <= 3455) return 'mal';
    else if (charCode >= 2688 && charCode <= 2815) return 'guj';
    else if (charCode >= 2816 && charCode <= 2944) return 'ori';
    else if (charCode >= 2560 && charCode <= 2687) return 'pan';
    else if (charCode >= 2304 && charCode <= 2428) return 'hin';
  }
  
  return 'eng';
}

// Helper function for client-side transliteration (same as in background.js)
function transliterateTextClient(text, sourceLang, targetLang) {
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
    return text;
  }
  
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
      if (devnum === 2544) { number = 2480; addnum = 0; }
      if (devnum === 2545) { number = 2485; addnum = 0; }
      if (devnum === 2527) { number = 2479; addnum = 0; }
    } else if (fromScript === 'Malayalam') {
      if (number > 3328 && number < 3455) devnum = number - 1024;
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

// Function to transliterate the current selection
function transliterateSelection(targetLang) {
  console.log('Transliterating current selection with target language:', targetLang);
  
  const selection = window.getSelection();
  console.log('Selection range count:', selection.rangeCount);
  
  if (selection.rangeCount === 0 || selection.isCollapsed) {
    console.log('No valid selection found');
    return;
  }
  
  const range = selection.getRangeAt(0);
  
  // Handle single text node selection
  if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
    console.log('Single text node selection');
    const textNode = range.startContainer;
    const text = textNode.textContent;
    const start = range.startOffset;
    const end = range.endOffset;
    
    const selectedText = text.substring(start, end);
    if (selectedText.trim().length > 0) {
      const sourceLang = detectSourceLanguage(selectedText);
      const transliteratedText = transliterateTextClient(selectedText, sourceLang, targetLang);
      
      const newText = text.substring(0, start) + transliteratedText + text.substring(end);
      textNode.textContent = newText;
      
      // Update selection
      const newRange = document.createRange();
      newRange.setStart(textNode, start);
      newRange.setEnd(textNode, start + transliteratedText.length);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      console.log('✅ Single node selection transliterated');
    }
  } else {
    // Multi-node selection - handle each text node individually
    console.log('Multi-node selection detected');
    
    // Get all text nodes in the selection
    const textNodes = [];
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while ((node = walker.nextNode())) {
      if (range.intersectsNode(node) && node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    
    console.log(`Found ${textNodes.length} text nodes in selection`);
    
    // Transliterate each text node
    textNodes.forEach((textNode, index) => {
      const originalText = textNode.textContent;
      const sourceLang = detectSourceLanguage(originalText);
      const transliteratedText = transliterateTextClient(originalText, sourceLang, targetLang);
      
      if (transliteratedText !== originalText) {
        textNode.textContent = transliteratedText;
        console.log(`Transliterated text node ${index}:`, originalText.substring(0, 30), '→', transliteratedText.substring(0, 30));
      }
    });
    
    console.log('✅ Multi-node selection transliterated');
  }
}

// Helper function to clean up empty nodes
function cleanupEmptyNodes(element) {
  // Remove empty text nodes
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const nodesToRemove = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim()) {
      nodesToRemove.push(node);
    }
  }
  
  // Remove empty text nodes
  nodesToRemove.forEach(node => {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });
  
  // Remove empty elements (except for structural elements like <br>, <hr>)
  const elementsToCheck = element.querySelectorAll('*');
  elementsToCheck.forEach(el => {
    if (el.children.length === 0 && !el.textContent.trim() && 
        !['BR', 'HR', 'IMG', 'INPUT'].includes(el.tagName)) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
  });
}

// Test transliteration function on load
console.log('🧪 Testing transliteration function...');
const testText = 'ಕನ್ನಡ';
const testResult = transliterateTextClient(testText, 'kan', 'hin');
console.log('🧪 Test transliteration:', testText, '→', testResult);

// Test background script communication
chrome.runtime.sendMessage({ action: 'testTransliteration' }, (response) => {
  console.log('🧪 Background script transliteration test response:', response);
});

// Initial execution if enabled
chrome.storage.sync.get('enabled', data => {
  console.log('Initial enabled state:', data.enabled);
  if (data.enabled) transliteratePage();
});