document.getElementById('toggle-btn').addEventListener('click', toggleTransliteration);
document.getElementById('target-lang').addEventListener('change', saveSettings);

// Initialize UI
chrome.storage.sync.get(['enabled', 'targetLang'], (data) => {
  updateButtonState(data.enabled || false);
  document.getElementById('target-lang').value = data.targetLang || 'hin';
});

function updateButtonState(enabled) {
  const button = document.getElementById('toggle-btn');
  const buttonText = button.querySelector('.button-text');
  const buttonIcon = button.querySelector('.button-icon');
  
  if (enabled) {
    button.classList.add('enabled');
    button.classList.remove('disabled');
    buttonText.textContent = 'Disable';
    buttonIcon.textContent = '⏹️';
  } else {
    button.classList.add('disabled');
    button.classList.remove('enabled');
    buttonText.textContent = 'Enable';
    buttonIcon.textContent = '🚀';
  }
}

function toggleTransliteration() {
  chrome.storage.sync.get('enabled', (data) => {
    const newState = !data.enabled;
    chrome.storage.sync.set({ enabled: newState }, () => {
      updateButtonState(newState);
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const activeTab = tabs[0];
          
          // Check if the tab is accessible (not a chrome:// or chrome-extension:// page)
          if (activeTab.url && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('chrome-extension://')) {
            chrome.tabs.sendMessage(activeTab.id, { 
              action: 'toggle', 
              state: newState 
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log('Content script not ready yet:', chrome.runtime.lastError.message);
                // The content script will pick up the state change when it loads
              }
            });
          } else {
            console.log('Cannot send message to this type of page:', activeTab.url);
          }
        } else {
          console.log('No active tab found');
        }
      });
    });
  });
}

function saveSettings() {
  chrome.storage.sync.set({
    targetLang: document.getElementById('target-lang').value
  });
}

// Test function to verify transliteration is working
function testTransliteration() {
  console.log('🧪 Testing transliteration from popup...');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, { 
        action: 'testTransliteration'
      }, (response) => {
        console.log('🧪 Popup test response:', response);
      });
    }
  });
}

// Add test button event listener
document.addEventListener('DOMContentLoaded', () => {
  const testBtn = document.createElement('button');
  testBtn.textContent = 'Test Transliteration';
  testBtn.style.cssText = 'margin-top: 10px; padding: 5px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;';
  testBtn.addEventListener('click', testTransliteration);
  
  const testFullPageBtn = document.createElement('button');
  testFullPageBtn.textContent = 'Test Full Page';
  testFullPageBtn.style.cssText = 'margin-top: 10px; margin-left: 10px; padding: 5px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;';
  testFullPageBtn.addEventListener('click', () => {
    console.log('🧪 Testing full page transliteration...');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, { 
          action: 'toggle', 
          state: true 
        }, (response) => {
          console.log('🧪 Full page test response:', response);
        });
      }
    });
  });
  
  document.querySelector('.footer').appendChild(testBtn);
  document.querySelector('.footer').appendChild(testFullPageBtn);
});