# 📊 Chart Attachments Feature

## Overview

The Chart Attachments feature allows users to attach "before" and "after" chart images to individual trades, providing visual documentation of trade setups and outcomes without impacting existing performance analytics or database efficiency.

## ✨ Features

### **Trade-Specific Chart Attachments**
- **Before Entry Chart**: Attach chart images showing the setup before entering the trade
- **After Exit Chart**: Attach chart images showing the outcome after exiting the trade
- **Individual Trade Documentation**: Each trade can have its own unique chart attachments

### **Efficient Storage Strategy**
- **Smart Storage Selection**: 
  - Small images (<50KB): Stored inline as Base64 for fast access
  - Large images (≥50KB): Stored as separate blobs for optimal performance
- **Automatic Compression**: Images are compressed while maintaining quality
- **Format Support**: PNG, JPG, WebP formats supported
- **Size Limits**: Maximum 10MB per image with warnings for large files

### **UI Integration**
- **Trade Modal Integration**: New "Charts" tab in the trade modal for uploading/managing attachments
- **Table View Indicators**: Chart attachment indicators in the trade journal table
- **Image Viewer**: Full-featured image viewer with zoom, pan, and download capabilities
- **Drag & Drop Upload**: Intuitive drag-and-drop interface for image uploads

### **Performance Preservation**
- **Zero Impact on Analytics**: Chart attachments don't affect existing performance calculations
- **Optimized Database Queries**: Separate storage prevents bloating of main trade queries
- **Lazy Loading**: Images are loaded only when needed
- **Memory Management**: Automatic cleanup of blob URLs to prevent memory leaks

## 🏗️ Technical Architecture

### **Data Structure**

```typescript
interface TradeChartAttachments {
  beforeEntry?: ChartImage;
  afterExit?: ChartImage;
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    totalSize: number;
  };
}

interface ChartImage {
  id: string;
  filename: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  size: number;
  uploadedAt: Date;
  storage: 'inline' | 'blob';
  data?: string; // Base64 for inline storage
  blobId?: string; // Reference for blob storage
  dimensions?: { width: number; height: number };
  compressed?: boolean;
  originalSize?: number;
}
```

### **Storage Strategy**

#### **Inline Storage (< 50KB)**
- Images stored as Base64 strings within the trade record
- Fastest access time
- Suitable for small screenshots and simple charts

#### **Blob Storage (≥ 50KB)**
- Images stored in separate IndexedDB table (`chartImageBlobs`)
- Prevents main trade table bloat
- Optimized for larger, detailed chart images

### **Database Schema**

```typescript
// Extended Trade interface
interface Trade {
  // ... existing fields
  chartAttachments?: TradeChartAttachments;
}

// New blob storage table
interface ChartImageBlob {
  id: string;
  tradeId: string;
  imageType: 'beforeEntry' | 'afterExit';
  filename: string;
  mimeType: string;
  size: number;
  data: Blob;
  uploadedAt: Date;
  compressed: boolean;
  originalSize?: number;
}
```

## 🎯 Usage Guide

### **Uploading Chart Images**

1. **Open Trade Modal**: Click edit on any trade or create a new trade
2. **Navigate to Charts Tab**: Click the "Charts" tab in the modal
3. **Upload Images**:
   - **Drag & Drop**: Drag image files directly onto the upload areas
   - **Click to Upload**: Click the upload area to open file browser
   - **Before Entry**: Upload chart showing setup before trade entry
   - **After Exit**: Upload chart showing outcome after trade exit

### **Viewing Chart Images**

#### **From Trade Table**
- Look for chart indicators in the "Charts" column
- Blue icon (📈): Before entry chart available
- Green icon (📉): After exit chart available
- Number indicator: Shows total number of attachments
- Click icons to view images in full-screen viewer

#### **From Trade Modal**
- Navigate to "Charts" tab
- View thumbnail previews
- Click "Replace" to update existing images
- Click delete (🗑️) to remove images

### **Image Viewer Features**
- **Zoom Controls**: Zoom in/out with mouse wheel or buttons
- **Pan & Drag**: Click and drag to pan around zoomed images
- **Download**: Download original image files
- **Full Screen**: View images in full-screen modal
- **Keyboard Shortcuts**: 
  - `Scroll`: Zoom in/out
  - `Click + Drag`: Pan image
  - `Escape`: Close viewer

## ⚙️ Configuration

### **File Size Limits**
```typescript
const CHART_IMAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  INLINE_THRESHOLD: 50 * 1024, // 50KB
  COMPRESSION_QUALITY: 0.8, // 80% quality
  MAX_DIMENSION: 2048, // Max width/height
  ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.webp']
};
```

### **Compression Settings**
- **Quality**: 80% JPEG quality for optimal size/quality balance
- **Dimensions**: Images larger than 2048px are resized
- **Format Preservation**: PNG images maintain transparency
- **Smart Compression**: Only applied when beneficial

## 🔧 API Reference

### **ChartImageService**

```typescript
// Attach chart image to trade
ChartImageService.attachChartImage(
  tradeId: string,
  imageType: 'beforeEntry' | 'afterExit',
  file: File,
  shouldCompress: boolean = true
): Promise<{ success: boolean; chartImage?: ChartImage; error?: string }>

// Get image data URL for display
ChartImageService.getChartImageDataUrl(
  chartImage: ChartImage
): Promise<string | null>

// Delete chart image
ChartImageService.deleteChartImage(
  tradeId: string,
  imageType: 'beforeEntry' | 'afterExit',
  chartImage: ChartImage
): Promise<boolean>

// Get storage statistics
ChartImageService.getStorageStats(): Promise<{
  totalImages: number;
  totalSize: number;
  blobImages: number;
  blobSize: number;
}>
```

### **Database Operations**

```typescript
// Save/retrieve chart image blobs
DatabaseService.saveChartImageBlob(imageBlob: ChartImageBlob): Promise<boolean>
DatabaseService.getChartImageBlob(id: string): Promise<ChartImageBlob | null>
DatabaseService.getTradeChartImageBlobs(tradeId: string): Promise<ChartImageBlob[]>
DatabaseService.deleteChartImageBlob(id: string): Promise<boolean>
DatabaseService.deleteTradeChartImageBlobs(tradeId: string): Promise<boolean>
```

## 🛡️ Data Management

### **Backup & Restore**
- Chart attachments are included in trade data exports
- Blob storage is backed up separately for efficiency
- Restore process automatically rebuilds blob references

### **Cleanup Operations**
- **Orphaned Blob Cleanup**: Automatically removes blobs for deleted trades
- **Memory Management**: Blob URLs are properly cleaned up
- **Storage Optimization**: Periodic cleanup of unused storage

### **Data Migration**
- Backward compatible with existing trades
- New chart attachment fields are optional
- Existing trades continue to work without modification

## 🚀 Performance Considerations

### **Optimizations**
- **Lazy Loading**: Images loaded only when viewed
- **Efficient Queries**: Chart data doesn't impact main trade queries
- **Memory Management**: Automatic cleanup prevents memory leaks
- **Compression**: Smart compression reduces storage requirements

### **Best Practices**
- Use appropriate image formats (WebP for best compression)
- Compress large images before upload when possible
- Regular cleanup of unused attachments
- Monitor storage usage in browser DevTools

## 🔍 Troubleshooting

### **Common Issues**

#### **Upload Failures**
- **File too large**: Reduce image size or compress before upload
- **Unsupported format**: Use PNG, JPG, or WebP formats
- **Browser storage full**: Clear browser data or use smaller images

#### **Display Issues**
- **Image not loading**: Check browser console for blob URL errors
- **Slow loading**: Large images may take time to load
- **Missing images**: Check if blob storage is intact

#### **Performance Issues**
- **Slow table loading**: Too many large inline images
- **Memory usage**: Clear browser cache and restart
- **Storage warnings**: Run cleanup operations

### **Debug Information**
- Check browser DevTools Console for detailed error messages
- Monitor IndexedDB storage usage in Application tab
- Use Performance tab to identify bottlenecks

## 📈 Future Enhancements

### **Planned Features**
- **Cloud Storage Integration**: Optional cloud backup for images
- **Batch Upload**: Upload multiple images at once
- **Image Annotations**: Add notes and drawings to charts
- **Template Charts**: Save and reuse common chart setups
- **Advanced Compression**: AI-powered image optimization

### **Integration Opportunities**
- **Trading Platform Integration**: Direct chart capture from brokers
- **Screenshot Tools**: Browser extension for easy chart capture
- **Mobile App**: Chart attachment from mobile devices
- **Social Sharing**: Share chart setups with trading community

---

*This feature enhances trade documentation while maintaining the robust performance and data integrity of the existing trading journal system.*
