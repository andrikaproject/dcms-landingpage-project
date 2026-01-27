# Chakra Petch Font - Usage Guide

## ✅ Font Successfully Added!

Font **Chakra Petch** dari Google Fonts sudah ditambahkan ke project dan siap digunakan di seluruh aplikasi.

## 📦 Configuration

### 1. Layout Configuration
File: `app/layout.tsx`

```tsx
import { Chakra_Petch } from "next/font/google";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});
```

**Available Weights:**
- 300 (Light)
- 400 (Regular)
- 500 (Medium)
- 600 (Semi-Bold)
- 700 (Bold)

### 2. Tailwind Configuration
File: `tailwind.config.js`

```javascript
fontFamily: {
  chakra: "var(--font-chakra-petch)",
}
```

## 🎨 How to Use

### Method 1: Tailwind Class (Recommended)
```tsx
<p className="font-chakra">
  Text dengan Chakra Petch font
</p>

<h1 className="font-chakra font-bold">
  Bold heading dengan Chakra Petch
</h1>

<span className="font-chakra font-light">
  Light text
</span>
```

### Method 2: Inline Style
```tsx
<p style={{ fontFamily: 'var(--font-chakra-petch)' }}>
  Text dengan Chakra Petch
</p>
```

### Method 3: CSS Variable
```css
.my-class {
  font-family: var(--font-chakra-petch);
}
```

## 📝 Examples

### Basic Text
```tsx
<p className="font-chakra text-base">
  Ini adalah contoh text dengan Chakra Petch
</p>
```

### Heading with Different Weights
```tsx
<h1 className="font-chakra font-bold text-4xl">
  Bold Heading
</h1>

<h2 className="font-chakra font-semibold text-3xl">
  Semi-Bold Heading
</h2>

<h3 className="font-chakra font-medium text-2xl">
  Medium Heading
</h3>
```

### Combined with Other Utilities
```tsx
<div className="font-chakra text-white bg-gray-900 p-4 rounded-lg">
  <h3 className="font-bold text-xl mb-2">Title</h3>
  <p className="font-normal text-sm text-gray-400">
    Description text
  </p>
</div>
```

### In Components
```tsx
export function MyComponent() {
  return (
    <div className="font-chakra">
      <h2 className="font-bold text-2xl">Chakra Petch Title</h2>
      <p className="font-normal">Regular text content</p>
      <span className="font-light text-sm">Light caption</span>
    </div>
  );
}
```

## 🎯 Use Cases

### Perfect For:
- ✅ Headings and titles
- ✅ Body text
- ✅ UI labels
- ✅ Buttons
- ✅ Navigation menus
- ✅ Modern, tech-focused designs

### Font Characteristics:
- **Style**: Modern, geometric, tech-inspired
- **Readability**: Excellent for both display and body text
- **Mood**: Professional, clean, contemporary

## 🔄 Existing Fonts in Project

1. **Geist Sans** - `font-sans` (default)
2. **Geist Mono** - `font-mono` (monospace)
3. **Nebulica** - `font-nebulica` (custom serif)
4. **Chakra Petch** - `font-chakra` (NEW!)

## 💡 Tips

### Combining Fonts
```tsx
<div>
  <h1 className="font-nebulica text-5xl">
    Main Title (Nebulica)
  </h1>
  <h2 className="font-chakra font-bold text-3xl mt-4">
    Subtitle (Chakra Petch)
  </h2>
  <p className="font-sans text-base mt-2">
    Body text (Geist Sans)
  </p>
</div>
```

### Responsive Font Weights
```tsx
<h1 className="font-chakra font-normal md:font-bold text-2xl md:text-4xl">
  Responsive heading
</h1>
```

### With Tailwind Variants
```tsx
<button className="font-chakra font-semibold hover:font-bold transition-all">
  Hover me
</button>
```

## 🚀 Quick Start

Just add the class `font-chakra` to any element:

```tsx
<div className="font-chakra">
  All text inside will use Chakra Petch!
</div>
```

## 📚 Google Fonts Link

[Chakra Petch on Google Fonts](https://fonts.google.com/specimen/Chakra+Petch)

## ✅ Verification

Font is loaded and ready to use! No additional installation needed.

Test it in your browser DevTools:
```javascript
getComputedStyle(document.querySelector('.font-chakra')).fontFamily
// Should return: "var(--font-chakra-petch)"
```
