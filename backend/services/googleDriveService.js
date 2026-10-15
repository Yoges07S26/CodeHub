const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/app');

class GoogleDriveService {
  constructor() {
    this.storageBasePath = config.googleDrive.storagePath;
    if (!fs.existsSync(this.storageBasePath)) {
      fs.mkdirSync(this.storageBasePath, { recursive: true });
    }
  }

  createRepositoryFolder(repoName, userId) {
    const folderId = 'gdrive_folder_' + crypto.randomBytes(10).toString('hex');
    const folderPath = path.join(this.storageBasePath, folderId);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return folderId;
  }

  uploadFile(folderId, filename, content) {
    const fileId = 'gdrive_file_' + crypto.randomBytes(12).toString('hex');
    const folderPath = path.join(this.storageBasePath, folderId);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const destPath = path.join(folderPath, fileId);
    const contentStr = typeof content === 'string' ? content : (content ? content.toString() : '');
    fs.writeFileSync(destPath, contentStr, 'utf8');
    const size = Buffer.byteLength(contentStr, 'utf8');

    return {
      file_id: fileId,
      name: filename,
      size: size,
      status: 'uploaded'
    };
  }

  getFileContent(folderId, fileId) {
    const destPath = path.join(this.storageBasePath, folderId, fileId);
    if (fs.existsSync(destPath)) {
      return fs.readFileSync(destPath, 'utf8');
    }
    return null;
  }

  deleteRepositoryFolder(folderId) {
    const folderPath = path.join(this.storageBasePath, folderId);
    if (fs.existsSync(folderPath)) {
      try {
        fs.rmSync(folderPath, { recursive: true, force: true });
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }
}

module.exports = GoogleDriveService;
