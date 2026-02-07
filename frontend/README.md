# Frontend - Satellite Monitoring System

This folder contains the **React + Vite** frontend for the Satellite Monitoring System.

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── InteractiveMap.jsx       # Leaflet map visualization
│   │   ├── AnalysisControls.jsx     # Region selector & analyze button
│   │   ├── AnalysisResultCard.jsx   # Results visualization
│   │   ├── AnalysisHistory.jsx      # Historical data table
│   │   └── Dashboard.jsx            # Main page layout (optional)
│   ├── hooks/
│   │   └── useAnalysis.js           # Custom analysis hook
│   ├── services/
│   │   └── api.js                   # Axios HTTP client
│   ├── store/
│   │   └── analysisStore.js         # Zustand state management
│   ├── App.jsx                      # Root component
│   ├── main.jsx                     # React entry point
│   ├── index.css                    # Global styles
│   └── App.css                      # Component styles
├── index.html                       # HTML entry point
├── vite.config.js                   # Vite build config
├── tailwind.config.js               # Tailwind CSS config
├── postcss.config.js                # PostCSS config
├── package.json                     # Dependencies
├── .env.example                     # Environment template
└── README.md                        # This file
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

```bash
cp .env.example .env.local
```

**Edit `.env.local` if needed:**

```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Satellite Change Detection System
```

### Development

```bash
npm run dev
```

Open `http://localhost:3000` in your browser

### Production Build

```bash
npm run build
npm run preview
```

## 🎨 Component Architecture

### InteractiveMap.jsx
- Displays Leaflet map with satellite regions
- Shows region markers with risk-based colors
- Handles region selection
- Zoom and pan controls

**Props:**
```javascript
{
  regions: Array,           // List of regions with coordinates
  onRegionSelect: Function, // Called when region clicked
  selectedRegion: Object    // Currently selected region
}
```

### AnalysisControls.jsx
- Region dropdown selector
- Custom coordinate input
- Analyze button with loading state
- Error display

**Props:**
```javascript
{
  onAnalyze: Function,  // Called with (latitude, longitude, name)
  regions: Array,       // Available regions
  loading: Boolean      // Show loading state
}
```

### AnalysisResultCard.jsx
- NDVI statistics display
- Change detection results
- Risk classification badge
- Historical comparison

**Props:**
```javascript
{
  analysis: Object  // Analysis result with NDVI data
}
```

### AnalysisHistory.jsx
- Table of historical analyses
- Sortable columns
- Date range filtering
- Export to CSV (optional)

**Props:**
```javascript
{
  analyses: Array,   // Historical analysis data
  loading: Boolean   // Show loading state
}
```

## 🪝 Custom Hooks

### useAnalysis()

Provides all analysis operations:

```javascript
const {
  analyses,           // Array of all analyses
  currentAnalysis,    // Currently selected analysis
  selectedRegion,     // Currently selected region
  stats,              // System statistics
  error,              // Error message
  loading,            // Loading state
  analyzeRegion,      // Function: run analysis
  getHistory,         // Function: get region history
  getLatestAnalyses,  // Function: get latest analyses
  getStats,           // Function: get statistics
  checkHealth,        // Function: check API health
  clearError          // Function: clear error
} = useAnalysis();
```

## 🔧 State Management

### Zustand Store (analysisStore.js)

```javascript
// State
store.analyses              // All analyses
store.currentAnalysis       // Selected analysis
store.selectedRegion        // Selected region
store.stats                 // Statistics
store.error                 // Error message

// Actions
store.addAnalysis(analysis)
store.setCurrentAnalysis(analysis)
store.setSelectedRegion(region)
store.setStats(stats)
store.setError(error)
store.clearError()
```

## 🌐 API Client

### api.js (Axios)

```javascript
// Methods
analysisAPI.analyzeRegion(latitude, longitude, sizeKm, name)
analysisAPI.getHistory(regionId)
analysisAPI.getLatestAnalyses()
analysisAPI.getStats()

// Features
- Automatic request/response interceptors
- Error handling
- Base URL configuration
- JSON serialization
```

**Configuration:**

Edit `.env.local` to change API endpoint:
```
VITE_API_URL=http://localhost:5000/api
```

## 🎯 Usage Example

```javascript
import { useAnalysis } from './hooks/useAnalysis';

function MyComponent() {
  const analysis = useAnalysis();

  const handleAnalyze = async () => {
    try {
      const result = await analysis.analyzeRegion(2.253, 32.003, 50, 'Test');
      console.log('NDVI:', result.ndviValue);
      console.log('Risk:', result.riskClassification.riskLevel);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  return (
    <button onClick={handleAnalyze} disabled={analysis.loading}>
      {analysis.loading ? 'Analyzing...' : 'Run Analysis'}
    </button>
  );
}
```

## 🎨 Styling

### Tailwind CSS
- Pre-configured in `tailwind.config.js`
- Custom color palette included
- Responsive breakpoints
- Extended utilities

### Custom Styles
- `index.css` - Global styles
- `App.css` - Component styles
- BEM naming convention

### Color Palette
```css
Primary:      #2563eb (Blue)
Secondary:    #1e40af (Dark Blue)
Success:      #10b981 (Green)
Warning:      #f59e0b (Amber)
Danger:       #ef4444 (Red)
```

## 🚀 Build & Deploy

### Development Server
```bash
npm run dev
```
- HMR enabled
- Source maps included
- Proxy to backend

### Production Build
```bash
npm run build
```
- Optimized bundle
- Minified CSS/JS
- Tree-shaking applied

### Preview
```bash
npm run preview
```
- Test production build locally

## 📦 Dependencies

### Core
- **react** - UI library
- **react-dom** - React rendering
- **vite** - Build tool

### State & Data
- **zustand** - State management
- **axios** - HTTP client

### UI & Mapping
- **leaflet** - Map library
- **react-leaflet** - React wrapper
- **tailwindcss** - CSS framework

### Dev Tools
- **@vitejs/plugin-react** - React plugin
- **eslint** - Code linting
- **autoprefixer** - CSS vendor prefixes

## 🔐 Environment Variables

```
VITE_API_URL           # Backend API URL
VITE_APP_NAME          # Application name
```

**Note:** Vite prefixes are required (VITE_)

## 🧪 Development Tips

### Debug API Calls
```javascript
// In browser console
import { analysisAPI } from './services/api';
analysisAPI.analyzeRegion(2.253, 32.003, 50, 'Test').then(console.log);
```

### View Store State
```javascript
// In browser console
import { analysisStore } from './store/analysisStore';
console.log(analysisStore.getState());
```

### Check Network Requests
- Open DevTools (F12)
- Go to Network tab
- Check API requests/responses

## 🐛 Common Issues

### Map not displaying
- Check `InteractiveMap.jsx` renders
- Verify Leaflet CSS imported
- Check browser console for errors

### API requests failing
- Verify backend running on port 5000
- Check `VITE_API_URL` in `.env`
- Check CORS errors in console

### Styles not applying
- Hard refresh (Ctrl+Shift+R)
- Clear `node_modules` and reinstall
- Check Tailwind config

## 📚 Useful Links

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Zustand](https://github.com/pmndrs/zustand)
- [Leaflet Docs](https://leafletjs.com)
- [Tailwind CSS](https://tailwindcss.com)

---

**For backend documentation, see [../backend/README.md](../backend/README.md)**
