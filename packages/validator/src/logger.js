function warn(message) {
  return { level: 'warning', message };
}

function error(message) {
  return { level: 'error', message };
}

module.exports = { warn, error };
