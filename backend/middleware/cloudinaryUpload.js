const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    
    // For images, we can let Cloudinary handle format conversions or store as is.
    // For PDFs, DOCs, PPTs, ZIPs, etc., resource_type must be 'raw' or 'auto'.
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    
    return {
      folder: 'prpcem-notebridge',
      resource_type: isImage ? 'image' : 'raw', // 'raw' is required for pdf/docx/pptx/zip to preserve exact binary data
      public_id: `note-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      // For raw files, Cloudinary requires the extension in the public_id or format param, but for raw resource_type,
      // it is usually uploaded without format change, so we keep the extension in the name.
      // E.g., note-12345.pdf
      // Let's attach extension to public_id for raw files so that their download URLs have the correct extension.
      public_id: isImage 
        ? `note-${Date.now()}-${Math.round(Math.random() * 1e6)}` 
        : `note-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`,
    };
  },
});

const uploadCloudinary = multer({
  storage: storage,
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 },
});

module.exports = { uploadCloudinary, cloudinary };
