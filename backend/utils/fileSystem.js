// utils/fileSystem.js
const fs = require('fs');
const path = require('path');

const ensureDirectories = async () => {
  const dirs = [
    path.join(__dirname, '../recordings'),
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../uploads')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
};

module.exports = { ensureDirectories };
