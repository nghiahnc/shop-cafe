// OpenNext traces package directories with symlinks. Windows directory
// junctions provide the same layout without administrator/Developer Mode.
const fs = require('node:fs');
const path = require('node:path');
const { syncBuiltinESMExports } = require('node:module');
if (process.platform === 'win32') {
  const original = fs.symlinkSync;
  fs.symlinkSync = function(target, destination, type) {
    try { return original.call(fs, target, destination, type); }
    catch (error) {
      const absolute = path.resolve(path.dirname(destination), target);
      if (error.code !== 'EPERM' || !fs.statSync(absolute).isDirectory()) throw error;
      return original.call(fs, absolute, destination, 'junction');
    }
  };
  syncBuiltinESMExports();
}
