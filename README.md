# Indic Transliterator

A powerful Chrome extension that enables real-time transliteration between various Indic scripts. Built with modern web technologies and designed for seamless user experience.

## 🌟 Features

- **Multi-Script Support**: Transliterate between 9 major Indic scripts
  - हिंदी (Devanagari)
  - বাংলা (Bengali)
  - ಕನ್ನಡ (Kannada)
  - తెలుగు (Telugu)
  - தமிழ் (Tamil)
  - മലയാളം (Malayalam)
  - ગુજરાતી (Gujarati)
  - ଓଡ଼ିଆ (Oriya)
  - ਗੁਰਮੁਖੀ (Gurmukhi)

- **Real-time Transliteration**: Convert text on any webpage instantly
- **Context Menu Integration**: Right-click selected text for quick transliteration
- **Batch Processing**: Efficiently handle large amounts of text
- **Client-side Processing**: No external API dependencies - works entirely offline
- **Modern UI**: Beautiful, responsive popup interface

## 🚀 Installation

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/WrittikGithub/indic-transliterator.git
   cd indic-transliterator
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select the `indic-transliterator` folder

5. The extension will be installed and ready to use!

## 📖 Usage

### Basic Usage
1. Click the extension icon in your Chrome toolbar
2. Select your target script from the dropdown
3. Click "Enable" to start transliterating the current page
4. Click "Disable" to revert changes

### Context Menu
1. Select any text on a webpage
2. Right-click and choose "Transliterate to..."
3. Select your desired target script
4. The selected text will be instantly transliterated

### Supported Scripts
- **Hindi (Devanagari)**: हिंदी
- **Bengali**: বাংলা
- **Kannada**: ಕನ್ನಡ
- **Telugu**: తెలుగు
- **Tamil**: தமிழ்
- **Malayalam**: മലയാളം
- **Gujarati**: ગુજરાતી
- **Oriya**: ଓଡ଼ିଆ
- **Gurmukhi**: ਗੁਰਮੁਖੀ

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Background script for handling transliteration requests
- **Content Script**: Injects into web pages for DOM manipulation
- **Popup Interface**: User-friendly settings and controls

### Transliteration Engine
- **Unicode-based**: Uses Unicode character ranges for script detection
- **Client-side Processing**: Works entirely offline with no external dependencies
- **Batch Optimization**: Processes multiple text nodes efficiently
- **Language Detection**: Automatically detects source script

### Key Components
- `background.js`: Service worker handling transliteration logic
- `content.js`: Content script for page interaction
- `popup/`: User interface components
- `manifest.json`: Extension configuration

## 🔧 Development

### Project Structure
```
indic-transliterator/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js            # Content script
├── popup/                # Popup interface
│   ├── popup.html       # Popup markup
│   ├── popup.js         # Popup logic
│   └── styles.css       # Popup styling
├── _locales/            # Internationalization
│   └── en/
│       └── messages.json
└── icons/               # Extension icons
    └── icon_48.png
```

### Building and Testing
1. Make your changes to the source code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes on any webpage

### Debugging
- Open Chrome DevTools
- Check the Console tab for extension logs
- Use the "Test Transliteration" button in the popup for debugging

## 🤝 Contributing

We welcome contributions! Please feel free to:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chrome Extensions Team**: For the excellent extension platform
- **Unicode Consortium**: For the comprehensive Unicode standards that make script conversion possible

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/WrittikGithub/indic-transliterator/issues) page
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce

## 🔄 Version History

- **v1.0**: Initial release with core transliteration functionality
  - Multi-script support
  - Context menu integration
  - Modern UI design
  - Client-side processing

---

**Made with ❤️ by Writtik Bhattacharya** 